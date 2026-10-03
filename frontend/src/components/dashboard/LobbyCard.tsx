import React, { useState } from 'react';
import { Play, Copy, Check, Lock, Unlock, Wifi } from 'lucide-react';
import type { ConnectionState, PlayerRole } from '../../types';

interface LobbyCardProps {
  role: PlayerRole;
  connectionState: ConnectionState;
  hostIp: string;
  availableIps: string[];
  keyboardLocked: boolean;
  onConnectRoom: (ip: string) => void;
  onToggleKeyboardLock: () => void;
}

export const LobbyCard: React.FC<LobbyCardProps> = ({
  role,
  connectionState,
  hostIp,
  availableIps,
  keyboardLocked,
  onConnectRoom,
  onToggleKeyboardLock,
}) => {
  const [targetIp, setTargetIp] = useState('');
  const [copied, setCopied] = useState(false);

  const displayIp = hostIp || (availableIps.length > 0 ? availableIps[availableIps.length - 1] : '127.0.0.1');

  const handleCopy = () => {
    navigator.clipboard.writeText(displayIp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mono-card rounded-xl p-4 border border-white/10 w-full">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {role === 'host_aimer' ? (
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <span className="text-xs font-mono text-zinc-400">Ваш IP для друга:</span>
            <div className="bg-black border border-white/20 rounded px-3 py-1.5 font-mono text-sm text-white font-bold flex items-center gap-2">
              <span>{displayIp}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Скопировать IP"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            {availableIps.length > 1 && (
              <span className="text-[11px] font-mono text-zinc-500">
                (Другие IP: {availableIps.filter(ip => ip !== displayIp && ip !== '127.0.0.1').join(', ') || 'локальная сеть'})
              </span>
            )}
            <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
              <Wifi className="w-3 h-3 text-white" /> Порт: 44555
            </div>
          </div>
        ) : role === 'client_pilot' ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              placeholder="IP хоста (например, 192.168.1.5 или Radmin IP)"
              value={targetIp}
              onChange={(e) => setTargetIp(e.target.value.trim())}
              className="bg-black border border-white/20 rounded px-3 py-1.5 font-mono text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white w-72"
            />
            <button
              type="button"
              onClick={() => onConnectRoom(targetIp || '127.0.0.1')}
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
               connectionState === 'hosting' ? 'Лобби слушает сеть' :
               'Не подключено'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
