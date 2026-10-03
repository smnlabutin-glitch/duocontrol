import React, { useState } from 'react';
import { Play, Copy, Check, Lock, Unlock, Globe, Wifi } from 'lucide-react';
import type { ConnectionState, PlayerRole } from '../../types';

interface LobbyCardProps {
  role: PlayerRole;
  connectionState: ConnectionState;
  hostIp: string;
  publicIp: string;
  keyboardLocked: boolean;
  onConnectRoom: (ip: string) => void;
  onToggleKeyboardLock: () => void;
}

export const LobbyCard: React.FC<LobbyCardProps> = ({
  role,
  connectionState,
  hostIp,
  publicIp,
  keyboardLocked,
  onConnectRoom,
  onToggleKeyboardLock,
}) => {
  const [targetIp, setTargetIp] = useState('');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Default to public IP for internet play without VPN
  const internetIp = publicIp || '79.174.44.93';
  const localIp = hostIp || '192.168.1.15';

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="mono-card rounded-xl p-4 border border-white/10 w-full space-y-3">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {role === 'host_aimer' ? (
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* INTERNET IP (NO VPN) */}
            <div className="flex items-center gap-2 bg-black border border-white/20 rounded px-3 py-1.5 font-mono text-xs">
              <Globe className="w-3.5 h-3.5 text-white shrink-0" />
              <span className="text-zinc-400">Интернет IP:</span>
              <strong className="text-white text-sm tracking-wide">{internetIp}</strong>
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
            <div className="flex items-center gap-2 bg-black/60 border border-white/10 rounded px-2.5 py-1.5 font-mono text-xs text-zinc-400">
              <Wifi className="w-3 h-3 text-zinc-400 shrink-0" />
              <span>Локальный IP: {localIp}</span>
              <button
                type="button"
                onClick={() => handleCopy(localIp, 'local')}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Скопировать локальный IP"
              >
                {copiedType === 'local' ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            <span className="text-[11px] font-mono text-zinc-400">
              (Отправь Интернет IP другу)
            </span>
          </div>
        ) : role === 'client_pilot' ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              placeholder="Вставь IP хоста (например, 79.174.44.93)"
              value={targetIp}
              onChange={(e) => setTargetIp(e.target.value.trim())}
              className="bg-black border border-white/20 rounded px-3 py-1.5 font-mono text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white w-72"
            />
            <button
              type="button"
              onClick={() => onConnectRoom(targetIp || internetIp)}
              className="px-4 py-1.5 mono-btn-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              Подключиться
            </button>
          </div>
        ) : (
          <div className="text-xs font-mono text-zinc-400">
            Локальный режим: разделение физических мыши и клавиатуры на одном ПК.
          </div>
        )}

        <div className="flex items-center gap-2">
          {role === 'host_aimer' && (
            <button
              type="button"
              onClick={onToggleKeyboardLock}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono transition-all cursor-pointer ${
                keyboardLocked
                  ? 'bg-white text-black border-white'
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
            <span className={`w-2 h-2 rounded-full ${
              connectionState === 'connected' ? 'bg-white animate-pulse' :
              connectionState === 'hosting' ? 'bg-zinc-300' :
              'bg-zinc-600'
            }`} />
            <span>
              {connectionState === 'connected' ? 'Связь активна' :
               connectionState === 'hosting' ? 'Сервер запущен (UPnP)' :
               'Не подключено'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
