export type PlayerRole = 'host_aimer' | 'client_pilot' | 'local_couch';

export type ConnectionState = 'idle' | 'hosting' | 'connecting' | 'connected' | 'error';

export interface LogEntry {
  id: string;
  time: string;
  type: 'info' | 'network' | 'success' | 'warn' | 'error';
  message: string;
}

export interface LatencyStats {
  pingMs: number;
  jitterMs: number;
  packetRateHz: number;
  packetsSent: number;
  packetsReceived: number;
  lossPercent: number;
}

export interface InputTelemetry {
  pressedKeys: Set<string>;
  mouseButtons: { left: boolean; right: boolean; middle: boolean };
  mouseDelta: { x: number; y: number };
  wheelDelta: number;
  lastInputTime: number;
}

export interface GameProfile {
  id: string;
  name: string;
  genre: string;
  bannerColor: string;
  aimControls: string[];
  pilotControls: string[];
}
