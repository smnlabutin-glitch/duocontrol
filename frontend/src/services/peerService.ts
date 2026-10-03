import Peer, { type DataConnection, type MediaConnection } from 'peerjs';

export interface PeerCallbacks {
  onStatusChange: (status: 'idle' | 'hosting' | 'connecting' | 'connected' | 'error', msg?: string) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onRemoteKey: (code: string, isDown: boolean) => void;
  onPingUpdate: (pingMs: number) => void;
}

export class P2PService {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private mediaCall: MediaConnection | null = null;
  private localStream: MediaStream | null = null;
  private callbacks: PeerCallbacks;
  private partnerPeerId: string | null = null;
  private pingInterval: number | null = null;

  constructor(callbacks: PeerCallbacks) {
    this.callbacks = callbacks;
  }

  private cleanId(code: string): string {
    return 'fable-duo-' + code.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // 1. HOST: Create room and listen for incoming connection & calls
  public startHost(roomCode: string, onReady?: (actualCode: string) => void) {
    this.destroy();
    const peerId = this.cleanId(roomCode);

    this.peer = new Peer(peerId, {
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ],
      },
    });

    this.peer.on('open', (id) => {
      console.log('Host peer opened:', id);
      this.callbacks.onStatusChange('hosting', 'Ожидание подключения второго игрока...');
      if (onReady) onReady(roomCode);
    });

    this.peer.on('connection', (conn) => {
      this.connection = conn;
      this.partnerPeerId = conn.peer;
      this.setupConnection(conn, true);
    });

    this.peer.on('error', (err) => {
      console.error('Peer error:', err);
      if (err.type === 'unavailable-id') {
        // If ID taken, generate random code
        const fallback = 'DUO-' + Math.floor(1000 + Math.random() * 9000);
        this.startHost(fallback, onReady);
      } else {
        this.callbacks.onStatusChange('error', err.message);
      }
    });
  }

  // 2. CLIENT: Connect to host room code
  public joinRoom(roomCode: string) {
    this.destroy();
    const targetHostId = this.cleanId(roomCode);
    const myId = 'fable-cli-' + Math.random().toString(36).substring(2, 9);

    this.callbacks.onStatusChange('connecting', 'Подключение к хосту...');

    this.peer = new Peer(myId, {
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ],
      },
    });

    this.peer.on('open', () => {
      if (!this.peer) return;
      const conn = this.peer.connect(targetHostId, { reliable: false }); // UDP style data channel
      this.connection = conn;
      this.partnerPeerId = targetHostId;
      this.setupConnection(conn, false);

      // Listen for incoming screen video from host
      this.peer.on('call', (call) => {
        this.mediaCall = call;
        call.answer(); // Answer without sending video back
        call.on('stream', (remoteStream) => {
          console.log('Client received remote game stream track!');
          this.callbacks.onRemoteStream(remoteStream);
        });
      });
    });

    this.peer.on('error', (err) => {
      console.error('Client peer error:', err);
      this.callbacks.onStatusChange('error', 'Хост не найден. Проверьте код комнаты.');
    });
  }

  private setupConnection(conn: DataConnection, isHost: boolean) {
    conn.on('open', () => {
      console.log('Data channel open with partner:', conn.peer);
      this.callbacks.onStatusChange('connected', 'Связь установлена (P2P прямой канал)');

      if (!isHost) {
        // Client requests video stream from host if host is already capturing
        conn.send({ type: 'request_stream' });

        // Start ping measurement loop
        this.pingInterval = window.setInterval(() => {
          if (this.connection && this.connection.open) {
            this.connection.send({ type: 'ping', t: performance.now() });
          }
        }, 300);
      } else {
        // If Host already has an active screen capture stream, call client immediately!
        if (this.localStream && this.partnerPeerId) {
          this.streamToPartner(this.localStream);
        }
      }
    });

    conn.on('data', (data: any) => {
      if (!data || typeof data !== 'object') return;

      if (data.type === 'key') {
        this.callbacks.onRemoteKey(data.code, data.isDown);
      } else if (data.type === 'request_stream') {
        if (this.localStream) {
          this.streamToPartner(this.localStream);
        }
      } else if (data.type === 'ping') {
        conn.send({ type: 'pong', t: data.t });
      } else if (data.type === 'pong') {
        const ping = performance.now() - data.t;
        this.callbacks.onPingUpdate(ping);
      }
    });

    conn.on('close', () => {
      this.callbacks.onStatusChange(isHost ? 'hosting' : 'idle', 'Партнер отключился');
      if (this.pingInterval) clearInterval(this.pingInterval);
    });
  }

  // Host broadcasts captured screen stream to client
  public setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    if (stream && this.partnerPeerId) {
      this.streamToPartner(stream);
    }
  }

  private streamToPartner(stream: MediaStream) {
    if (!this.peer || !this.partnerPeerId) return;
    console.log('Calling partner with screen stream...');
    try {
      const call = this.peer.call(this.partnerPeerId, stream);
      this.mediaCall = call;
    } catch (e) {
      console.error('Failed to stream to partner:', e);
    }
  }

  // Send key press from Client to Host
  public sendKey(code: string, isDown: boolean) {
    if (this.connection && this.connection.open) {
      this.connection.send({ type: 'key', code, isDown });
    }
  }

  public destroy() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.mediaCall) this.mediaCall.close();
    if (this.connection) this.connection.close();
    if (this.peer) this.peer.destroy();
    this.peer = null;
    this.connection = null;
    this.mediaCall = null;
  }
}
