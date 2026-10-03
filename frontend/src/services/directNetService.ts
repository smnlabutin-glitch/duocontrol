export interface DirectNetCallbacks {
  onStatusChange: (status: 'idle' | 'hosting' | 'connecting' | 'connected' | 'error', msg?: string) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onRemoteKey: (code: string, isDown: boolean) => void;
  onPingUpdate: (pingMs: number) => void;
}

export class DirectNetService {
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private callbacks: DirectNetCallbacks;
  private pingInterval: number | null = null;
  private isHost: boolean = false;

  constructor(callbacks: DirectNetCallbacks) {
    this.callbacks = callbacks;
  }

  // 1. HOST: Connect to local native server
  public startHost() {
    this.destroy();
    this.isHost = true;
    this.callbacks.onStatusChange('hosting', 'Ожидание подключения второго игрока...');

    // Host connects to internal native server on 127.0.0.1:44555
    this.connectWs('127.0.0.1:44555');
  }

  // 2. CLIENT: Connect to host IP (LAN / Radmin / Hamachi / Public IP)
  public joinHost(hostAddress: string) {
    this.destroy();
    this.isHost = false;
    this.callbacks.onStatusChange('connecting', 'Подключение к хосту...');

    let addr = hostAddress.trim();
    if (!addr.includes(':')) {
      addr = `${addr}:44555`;
    }
    this.connectWs(addr);
  }

  private connectWs(address: string) {
    const url = `ws://${address}`;
    console.log('Connecting to DuoControl native socket:', url);

    try {
      this.ws = new WebSocket(url);
    } catch (e: any) {
      this.callbacks.onStatusChange('error', `Ошибка подключения к ${address}`);
      return;
    }

    this.ws.onopen = () => {
      console.log('WebSocket open:', url);
      if (!this.isHost) {
        this.callbacks.onStatusChange('connected', 'Связь с хостом установлена!');
        this.initWebRTC(false);

        // Start ping loop
        this.pingInterval = window.setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping', time: performance.now() }));
          }
        }, 300);
      } else {
        this.callbacks.onStatusChange('hosting', 'Лобби ожидает игрока');
        this.initWebRTC(true);
      }
    };

    this.ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'key') {
          if (this.isHost) {
            this.callbacks.onRemoteKey(data.code, data.is_down);
          }
        } else if (data.type === 'ping') {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'pong', time: data.time }));
          }
        } else if (data.type === 'pong') {
          const ping = performance.now() - data.time;
          this.callbacks.onPingUpdate(ping);
        } else if (data.type === 'offer') {
          if (!this.isHost && this.pc) {
            await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.sdp }));
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            this.ws?.send(JSON.stringify({ type: 'answer', sdp: answer.sdp }));
          }
        } else if (data.type === 'answer') {
          if (this.isHost && this.pc) {
            await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }));
          }
        } else if (data.type === 'ice') {
          if (this.pc && data.candidate) {
            try {
              await this.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (err) {
              console.error('Error adding ICE candidate:', err);
            }
          }
        } else if (data.type === 'client_joined') {
          if (this.isHost) {
            this.callbacks.onStatusChange('connected', 'Игрок 2 подключился!');
            // If host already capturing stream, create WebRTC offer
            if (this.localStream) {
              this.startWebRtcOffer();
            }
          }
        }
      } catch (e) {
        console.error('WS message error:', e);
      }
    };

    this.ws.onerror = (_e) => {
      this.callbacks.onStatusChange('error', `Не удалось подключиться к ${address}. Проверьте IP и сеть.`);
    };

    this.ws.onclose = () => {
      this.callbacks.onStatusChange('idle', 'Соединение закрыто');
      if (this.pingInterval) clearInterval(this.pingInterval);
    };
  }

  // WebRTC P2P direct video streaming
  private initWebRTC(isHost: boolean) {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ice', candidate: event.candidate }));
      }
    };

    if (!isHost) {
      this.pc.ontrack = (event) => {
        console.log('Client ontrack: Received remote game video track!');
        if (event.streams && event.streams[0]) {
          this.callbacks.onRemoteStream(event.streams[0]);
        }
      };

      // Notify host that client joined
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'client_joined' }));
      }
    }
  }

  // Host starts video stream offer
  public setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    if (this.isHost && stream) {
      this.startWebRtcOffer();
    }
  }

  private async startWebRtcOffer() {
    if (!this.pc || !this.localStream) return;

    try {
      // Remove previous tracks if any
      const senders = this.pc.getSenders();
      senders.forEach((s) => this.pc?.removeTrack(s));

      // Add screen tracks
      this.localStream.getTracks().forEach((track) => {
        if (this.pc && this.localStream) {
          this.pc.addTrack(track, this.localStream);
        }
      });

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'offer', sdp: offer.sdp }));
      }
    } catch (err) {
      console.error('Failed to create WebRTC stream offer:', err);
    }
  }

  // Send key press from Client to Host
  public sendKey(code: string, vk: number, isDown: boolean) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'key',
        code,
        vk,
        is_down: isDown,
      }));
    }
  }

  public destroy() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
