import React, { useState } from 'react';
import { Play, Copy, Check, Lock, Unlock, Globe, Wifi, KeyRound, Loader2, AlertCircle } from 'lucide-react';
import type { ConnectionState, PlayerRole } from '../../types';

interface LobbyCardProps {
  role: PlayerRole;
  connectionState: ConnectionState;
  hostIp: string;
  publicIp: string;
  roomCode: string;
  keyboardLocked: boolean;
  errorMessage?: string;
  onConnectRoom: (target: string) => void;
  onToggleKeyboardLock: () => void;
}

export const LobbyCard: React.FC<LobbyCardProps> = ({
  role,
  connectionState,
  hostIp,
  publicIp,
  roomCode,
  keyboardLocked,
  errorMessage,
  onConnectRoom,
  onToggleKeyboardLock,
}) => {
  const [target, setTarget] = useState('');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const internetIp = publicIp || '79.174.44.93';
  const localIp = hostIp || '192.168.1.15';
  const activeRoomCode = roomCode || 'DUO-7788';

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const isConnecting = connectionState === 'connecting';

  return (
    <div className="mono-card rounded-xl p-4 border border-white/10 w-full space-y-3">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {role === 'host_aimer' ? (
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* ROOM CODE (ZERO VPN P2P TUNNEL) */}
            <div className="flex items-center gap-2 bg-white/10 border border-white/30 rounded px-3 py-1.5 font-mono text-xs">
              <KeyRound className="w-4 h-4 text-white shrink-0" />
              <span className="text-zinc-300">Код комнаты:</span>
              <strong className="text-white text-base tracking-widest font-black">{activeRoomCode}</strong>
              <button
                type="button"
                onClick={() => handleCopy(activeRoomCode, 'room')}
                className="ml-1 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Скопировать код комнаты (без VPN)"
              >
                {copiedType === 'room' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* INTERNET IP (FOR WHITE IP / PORT FORWARDING) */}
            <div className="flex items-center gap-2 bg-black border border-white/20 rounded px-2.5 py-1.5 font-mono text-xs">
              <Globe className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="text-zinc-400">Интернет IP:</span>
              <strong className="text-zinc-200 text-xs tracking-wide">{internetIp}</strong>
              <button
                type="button"
                onClick={() => handleCopy(internetIp, 'public')}
                className="ml-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Скопировать интернет IP"
              >
                {copiedType === 'public' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* LOCAL LAN IP */}
            <div className="flex items-center gap-2 bg-black/60 border border-white/10 rounded px-2 py-1.5 font-mono text-xs text-zinc-400">
              <Wifi className="w-3 h-3 text-zinc-500 shrink-0" />
              <span className="text-zinc-500">Локальный: {localIp}</span>
              <button
                type="button"
                onClick={() => handleCopy(localIp, 'local')}
                className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                title="Скопировать локальный IP"
              >
                {copiedType === 'local' ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            <span className="text-[11px] font-mono text-zinc-400">
              (Отправь другу <strong>Код комнаты</strong> для игры через интернет без VPN)
            </span>
          </div>
        ) : role === 'client_pilot' ? (
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Вставь Код комнаты (DUO-...) или IP"
                value={target}
                onChange={(e) => setTarget(e.target.value.trim())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isConnecting) {
                    onConnectRoom(target || activeRoomCode);
                  }
                }}
                className="bg-black border border-white/20 rounded px-3 py-1.5 font-mono text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white w-80 tracking-wider"
              />
              <button
                type="button"
                disabled={isConnecting}
                onClick={() => onConnectRoom(target || activeRoomCode)}
                className={`px-4 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                  isConnecting
                    ? 'bg-zinc-700 text-zinc-300 cursor-not-allowed'
                    : 'mono-btn-white'
                }`}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Подключение...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-black" />
                    Подключиться
                  </>
                )}
              </button>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">
              💡 Рекомендуется: ввести <strong>Код комнаты (DUO-...)</strong> хоста для игры без VPN и без открытия портов.
            </span>
            {errorMessage && (
              <div className="flex items-center gap-1.5 text-xs font-mono text-red-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs font-mono text-zinc-400">
            Локальный режим: разделение физических мыши и клавиатуры на одном ПК.
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {role === 'host_aimer' && (
            <button
              type="button"
              onClick={onToggleKeyboardLock}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono transition-all cursor-pointer ${
                keyboardLocked
                  ? 'bg-white text-black border-white font-semibold'
                  : 'mono-btn-outline text-zinc-300'
              }`}
            >
              {keyboardLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  Клавиатура хоста: заглушена
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-zinc-400" />
                  Заглушить свою клавиатуру
                </>
              )}
            </button>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/5 border border-white/10 text-xs font-mono text-zinc-300">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionState === 'connected'
                  ? 'bg-white animate-pulse'
                  : connectionState === 'connecting'
                  ? 'bg-amber-400 animate-ping'
                  : connectionState === 'error'
                  ? 'bg-red-500'
                  : connectionState === 'hosting'
                  ? 'bg-zinc-300'
                  : 'bg-zinc-600'
              }`}
            />
            <span>
              {connectionState === 'connected'
                ? 'Связь активна'
                : connectionState === 'connecting'
                ? 'Подключение...'
                : connectionState === 'error'
                ? 'Ошибка связи'
                : connectionState === 'hosting'
                ? 'Лобби готово'
                : 'Не подключено'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
