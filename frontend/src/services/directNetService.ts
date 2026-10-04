import type { LogEntry } from '../types';

export interface DirectNetCallbacks {
  onStatusChange: (status: 'idle' | 'hosting' | 'connecting' | 'connected' | 'error', msg?: string) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onRemoteKey: (code: string, isDown: boolean) => void;
  onPingUpdate: (pingMs: number) => void;
  onLog: (message: string, type?: LogEntry['type']) => void;
  onRoomReady?: (roomCode: string) => void;
}

const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

export class DirectNetService {
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private eventSource: EventSource | null = null;
  private localStream: MediaStream | null = null;
  private callbacks: DirectNetCallbacks;
  private pingInterval: number | null = null;
  private isHost: boolean = false;
  private roomCode: string = '';
  private clientId: string = '';
  private processedMsgIds = new Set<string>();

  constructor(callbacks: DirectNetCallbacks) {
    this.callbacks = callbacks;
    this.clientId = 'peer_' + Math.random().toString(36).substring(2, 9);
  }

  private log(message: string, type: LogEntry['type'] = 'info') {
    this.callbacks.onLog(message, type);
  }

  // 1. HOST: Start hosting with room code + local native WebSocket
  public startHost(customRoomCode?: string) {
    this.destroy();
    this.isHost = true;

    // Generate readable 6-character room code if not provided
    this.roomCode = customRoomCode || this.generateRoomCode();
    this.callbacks.onRoomReady?.(this.roomCode);

    this.log(`Инициализация лобби. Код сети: ${this.roomCode}`, 'network');
    this.callbacks.onStatusChange('hosting', `Лобби открыто [${this.roomCode}]. Ожидание пилота...`);

    // Connect to internal native Rust WS on 127.0.0.1:44555
    this.connectLocalWs();

    // Subscribe to cloud signaling channel for zero-VPN P2P connection
    this.subscribeSignaling(this.roomCode);
  }

  // 2. CLIENT: Join host by Room Code or Direct IP
  public joinHost(target: string) {
    this.destroy();
    this.isHost = false;

    const trimmed = target.trim();
    if (!trimmed) {
      this.callbacks.onStatusChange('error', 'Введите Код комнаты или IP адрес.');
      this.log('Ошибка: пустой адрес или код комнаты', 'error');
      return;
    }

    this.callbacks.onStatusChange('connecting', `Подключение к ${trimmed}...`);

    // Check if input looks like an IP address
    const isIp = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(trimmed);

    if (isIp) {
      this.log(`Попытка прямого соединения с IP: ${trimmed}...`, 'network');
      this.connectDirectIp(trimmed);
    } else {
      // It's a Room Code (Zero-VPN built-in P2P tunnel)
      this.roomCode = trimmed.toUpperCase();
      this.log(`Подключение к P2P-комнате: ${this.roomCode} (без VPN)...`, 'network');
      this.joinP2PRoom(this.roomCode);
    }
  }

  // Generate random readable 4-digit code e.g. DUO-4829
  private generateRoomCode(): string {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `DUO-${num}`;
  }

  // Connect client via Direct IP / Port 44555
  private connectDirectIp(address: string) {
    let addr = address;
    if (!addr.includes(':')) {
      addr = `${addr}:44555`;
    }

    const url = `ws://${addr}`;
    this.log(`Открытие WebSocket: ${url}`, 'network');

    let connectionTimeout: number | null = window.setTimeout(() => {
      if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
        this.log(`Таймаут соединения с ${addr}. Порт 44555 закрыт провайдером или брандмауэром.`, 'warn');
        this.log('Подсказка: используйте Код комнаты (DUO-...) для подключения без открытия портов.', 'info');
        this.ws.close();
        this.callbacks.onStatusChange('error', `Не удалось подключиться к ${addr} (порт закрыт). Попробуйте Код сети.`);
      }
    }, 4500);

    try {
      this.ws = new WebSocket(url);
    } catch (e: any) {
      this.log(`Ошибка создания сокета: ${e.message}`, 'error');
      this.callbacks.onStatusChange('error', `Ошибка сокета к ${addr}`);
      return;
    }

    this.ws.onopen = () => {
      if (connectionTimeout) clearTimeout(connectionTimeout);
      this.log(`Прямое соединение с ${addr} успешно установлено!`, 'success');
      this.callbacks.onStatusChange('connected', 'Связь с хостом активна (Radmin VPN / LAN)');
      this.initWebRTC(false);
      this.startPingLoop();

      // Notify host that guest connected over Direct IP / Radmin
      this.ws?.send(
        JSON.stringify({
          type: 'client_joined',
          sender: this.clientId,
          time: Date.now(),
        })
      );
    };

    this.ws.onmessage = async (event) => {
      this.handleWsMessage(event.data);
    };

    this.ws.onerror = (_e) => {
      this.log(`Ошибка прямого подключения к ${addr}. Проверьте доступность порта 44555.`, 'warn');
    };

    this.ws.onclose = () => {
      if (connectionTimeout) clearTimeout(connectionTimeout);
      if (this.pingInterval) clearInterval(this.pingInterval);
    };
  }

  // Join via P2P Room Code (Zero-VPN built-in tunnel)
  private joinP2PRoom(code: string) {
    this.subscribeSignaling(code);

    // Notify Host that Guest joined
    this.sendSignalingMessage({
      type: 'client_joined',
      sender: this.clientId,
      time: Date.now(),
    });
    this.log(`Запрос на подключение отправлен в комнату ${code}. Ожидание ответа хоста...`, 'info');
  }

  // Subscribe to ntfy.sh public signaling topic for WebRTC negotiation
  private subscribeSignaling(code: string) {
    const topic = `duocontrol_${code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const sseUrl = `https://ntfy.sh/${topic}/sse?since=now`;

    this.log(`Подключение к каналу сигнализации: ${topic}`, 'network');

    try {
      this.eventSource = new EventSource(sseUrl);
    } catch (e: any) {
      this.log(`Ошибка подключения к каналу: ${e.message}`, 'error');
      return;
    }

    this.eventSource.onopen = () => {
      this.log(`Канал связи готов к обмену данными.`, 'info');
    };

    this.eventSource.onmessage = async (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.event !== 'message') return;

        let jsonStr = parsed.message;
        // If ntfy converted payload to an attachment file (occurs when SDP > 4096 bytes)
        if (parsed.attachment && parsed.attachment.url) {
          try {
            const resp = await fetch(parsed.attachment.url);
            jsonStr = await resp.text();
          } catch (e) {
            console.error('Signaling attachment download error:', e);
            return;
          }
        }

        if (!jsonStr || jsonStr.startsWith('You received a file:')) return;

        const data = JSON.parse(jsonStr);

        // Ignore messages sent by self
        if (data.sender === this.clientId) return;

        // Deduplicate messages
        if (data.msgId && this.processedMsgIds.has(data.msgId)) return;
        if (data.msgId) this.processedMsgIds.add(data.msgId);

        await this.handleSignalingMessage(data);
      } catch (err) {
        console.error('Signaling parse error:', err);
      }
    };

    this.eventSource.onerror = () => {
      // EventSource automatically retries
    };
  }

  // Post message to signaling topic and direct WS
  private async sendSignalingMessage(payload: any) {
    payload.sender = this.clientId;
    payload.msgId = Math.random().toString(36).substring(2, 11);

    // 1. Direct native WebSocket if connected (Radmin VPN / LAN)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(payload));
      } catch (err) {
        console.error('Direct WS signaling error:', err);
      }
    }

    // 2. Cloud signaling topic (ntfy)
    if (!this.roomCode) return;
    const topic = `duocontrol_${this.roomCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const url = `https://ntfy.sh/${topic}`;

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      this.log(`Ошибка отправки сигнала: ${err.message}`, 'error');
    }
  }

  // Handle incoming signaling messages
  private async handleSignalingMessage(data: any) {
    if (data.type === 'client_joined') {
      if (this.isHost) {
        this.log(`Пилот подключился к лобби! Создание прямого P2P WebRTC канала...`, 'success');
        this.callbacks.onStatusChange('connected', 'Пилот подключен. Установка P2P соединения...');
        this.initWebRTC(true);
        this.startWebRtcOffer();
      }
    } else if (data.type === 'offer') {
      if (!this.isHost) {
        this.log(`Получено P2P-предложение от хоста. Принятие...`, 'info');
        if (!this.pc || this.pc.signalingState === 'closed') {
          this.initWebRTC(false);
        }
        if (this.pc) {
          try {
            await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.sdp }));
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);

            if (this.dataChannel && this.dataChannel.readyState === 'open') {
              this.dataChannel.send(JSON.stringify({ type: 'answer', sdp: answer.sdp }));
            }
            await this.sendSignalingMessage({ type: 'answer', sdp: answer.sdp });
            this.log(`P2P-ответ отправлен хосту.`, 'info');
          } catch (err: any) {
            console.error('Error handling offer:', err);
          }
        }
      }
    } else if (data.type === 'answer') {
      if (this.isHost && this.pc) {
        try {
          if (this.pc.signalingState === 'have-local-offer') {
            this.log(`P2P-ответ получен! Видеотуннель согласован.`, 'info');
            await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }));
          }
        } catch (err) {
          console.error('Error setting remote answer:', err);
        }
      }
    } else if (data.type === 'ice') {
      if (this.pc && data.candidate) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    } else if (data.type === 'key') {
      // Fallback key reception via signaling
      if (this.isHost) {
        this.callbacks.onRemoteKey(data.code, data.is_down);
      }
    }
  }

  // Host: Connect to internal native Rust WS on 127.0.0.1:44555
  private connectLocalWs() {
    try {
      this.ws = new WebSocket('ws://127.0.0.1:44555');
      this.ws.onopen = () => {
        this.log(`Локальный Win32-инжектор подключен (порт 44555)`, 'info');
      };
      this.ws.onmessage = (event) => {
        this.handleWsMessage(event.data);
      };
    } catch (e: any) {
      console.error('Failed to connect to local WS:', e);
    }
  }

  // WebRTC P2P setup
  private initWebRTC(isHost: boolean) {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    this.pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Send via direct DataChannel if available
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
          this.dataChannel.send(JSON.stringify({ type: 'ice', candidate: event.candidate }));
        }
        // Send via signaling
        this.sendSignalingMessage({ type: 'ice', candidate: event.candidate });
        // Also send via direct WS if open
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'ice', candidate: event.candidate }));
        }
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc?.iceConnectionState;
      this.log(`Статус P2P ICE: ${state}`, 'network');
      if (state === 'connected' || state === 'completed') {
        this.log(`Прямое P2P соединение активно!`, 'success');
        this.callbacks.onStatusChange('connected', 'P2P-туннель активен (прямое соединение)');
      } else if (state === 'failed') {
        this.log(`P2P ICE не удалось установить прямой маршрут. Пробуем резервный канал.`, 'warn');
      }
    };

    if (isHost) {
      // Host creates DataChannel for ultra-low latency inputs (<1ms)
      this.dataChannel = this.pc.createDataChannel('duo-keys', {
        ordered: false,
        maxRetransmits: 0,
      });

      this.dataChannel.onopen = () => {
        this.log(`P2P DataChannel для клавиатуры открыт! Задержка ввода <1 мс.`, 'success');
      };

      this.dataChannel.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'key') {
            this.callbacks.onRemoteKey(data.code, data.is_down);
          } else if (data.type === 'ping') {
            this.dataChannel?.send(JSON.stringify({ type: 'pong', target: data.sender, time: data.time }));
          } else if (data.type === 'pong') {
            if (data.target === this.clientId) {
              const ping = Math.max(0.5, performance.now() - data.time);
              this.callbacks.onPingUpdate(ping);
            }
          } else if (data.type === 'answer') {
            this.log(`Пилот принял видеопоток через DataChannel!`, 'success');
            if (this.pc && this.pc.signalingState === 'have-local-offer') {
              await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }));
            }
          } else if (data.type === 'ice') {
            if (this.pc && data.candidate) {
              await this.pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(console.error);
            }
          }
        } catch (e) {
          console.error('DataChannel parse error:', e);
        }
      };
    } else {
      // Guest listens for DataChannel
      this.pc.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.log(`P2P DataChannel подключен к хосту!`, 'success');

        this.dataChannel.onopen = () => {
          this.callbacks.onStatusChange('connected', 'Связь активна (P2P без VPN)');
          this.startPingLoop();
        };

        this.dataChannel.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'pong') {
              if (data.target === this.clientId) {
                const ping = Math.max(0.5, performance.now() - data.time);
                this.callbacks.onPingUpdate(ping);
              }
            } else if (data.type === 'ping') {
              this.dataChannel?.send(JSON.stringify({ type: 'pong', target: data.sender, time: data.time }));
            } else if (data.type === 'offer') {
              this.log(`Получен P2P видеопоток через DataChannel! Принятие...`, 'info');
              if (this.pc) {
                await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.sdp }));
                const answer = await this.pc.createAnswer();
                await this.pc.setLocalDescription(answer);
                this.dataChannel?.send(JSON.stringify({ type: 'answer', sdp: answer.sdp }));
                this.log(`P2P подтверждение видеопотока отправлено хосту!`, 'success');
              }
            } else if (data.type === 'ice') {
              if (this.pc && data.candidate) {
                await this.pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(console.error);
              }
            }
          } catch (e) {
            console.error('DataChannel msg error:', e);
          }
        };
      };

      // Guest listens for video stream track
      this.pc.ontrack = (event) => {
        this.log(`Видеопоток экрана 60 FPS успешно принят!`, 'success');
        if (event.streams && event.streams[0]) {
          this.callbacks.onRemoteStream(event.streams[0]);
        } else if (event.track) {
          const inboundStream = new MediaStream([event.track]);
          this.callbacks.onRemoteStream(inboundStream);
        }
      };
    }
  }

  // Host starts video stream offer
  public setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    if (this.isHost && stream) {
      this.log(`Трансляция экрана захвачена. Отправка видеопотока пилоту...`, 'info');
      this.startWebRtcOffer();
    }
  }

  public async startWebRtcOffer() {
    if (!this.pc || this.pc.signalingState === 'closed') {
      this.initWebRTC(true);
    }
    if (!this.pc) return;

    try {
      // Add or update local stream tracks if available
      if (this.localStream) {
        const senders = this.pc.getSenders();
        const videoTrack = this.localStream.getVideoTracks()[0];

        if (videoTrack) {
          const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
          if (videoSender) {
            await videoSender.replaceTrack(videoTrack);
            this.log('Видеодорожка экрана обновлена', 'info');
          } else {
            this.pc.addTrack(videoTrack, this.localStream);
            this.log('Видеодорожка экрана добавлена в P2P туннель', 'info');
          }
        }
      }

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // 1. Direct via DataChannel if already open (instant <1ms renegotiation)
      if (this.dataChannel && this.dataChannel.readyState === 'open') {
        this.dataChannel.send(JSON.stringify({ type: 'offer', sdp: offer.sdp }));
        this.log('Видеопоток отправлен напрямую через открытый P2P канал', 'info');
      }

      // 2. Send offer via signaling topic as well
      await this.sendSignalingMessage({ type: 'offer', sdp: offer.sdp });

      // 3. Also send via direct WS if available
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'offer', sdp: offer.sdp }));
      }
    } catch (err: any) {
      this.log(`Ошибка создания P2P предложения: ${err.message}`, 'error');
    }
  }

  private async handleWsMessage(raw: string) {
    try {
      const data = JSON.parse(raw);
      if (data.sender === this.clientId) return;

      if (data.type === 'key') {
        if (this.isHost) {
          this.callbacks.onRemoteKey(data.code, data.is_down);
        }
      } else if (data.type === 'ping') {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'pong', target: data.sender, time: data.time }));
        }
      } else if (data.type === 'pong') {
        if (data.target === this.clientId) {
          const ping = Math.max(0.5, performance.now() - data.time);
          this.callbacks.onPingUpdate(ping);
        }
      } else if (['client_joined', 'offer', 'answer', 'ice'].includes(data.type)) {
        await this.handleSignalingMessage(data);
      }
    } catch (e) {
      console.error('WS message error:', e);
    }
  }

  private startPingLoop() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = window.setInterval(() => {
      const now = performance.now();
      const payload = JSON.stringify({ type: 'ping', sender: this.clientId, time: now });
      if (this.dataChannel && this.dataChannel.readyState === 'open') {
        this.dataChannel.send(payload);
      } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(payload);
      }
    }, 500);
  }

  // Send key press from Client to Host
  public sendKey(code: string, vk: number, isDown: boolean) {
    const payload = JSON.stringify({
      type: 'key',
      code,
      vk,
      is_down: isDown,
    });

    // 1. Prioritize direct WebRTC DataChannel (UDP, sub-millisecond)
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(payload);
      return;
    }

    // 2. Direct native WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
      return;
    }

    // 3. Fallback via signaling channel
    this.sendSignalingMessage({
      type: 'key',
      code,
      vk,
      is_down: isDown,
    });
  }

  public destroy() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
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
