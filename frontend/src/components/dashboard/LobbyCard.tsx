import React, { useState } from 'react';
import { Play, Copy, Check, Lock, Unlock } from 'lucide-react';
import type { ConnectionState, PlayerRole } from '../../types';

interface LobbyCardProps {
  role: PlayerRole;
  connectionState: ConnectionState;
  roomCode: string;
  keyboardLocked: boolean;
  onToggleHost: () => void;
  onConnectRoom: (code: string) => void;
  onToggleKeyboardLock: () => void;
}

export const LobbyCard: React.FC<LobbyCardProps> = ({
  role,
  connectionState,
  roomCode,
  keyboardLocked,
  onToggleHost,
  onConnectRoom,
  onToggleKeyboardLock,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mono-card rounded-xl p-4 border border-white/10 w-full">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {role === 'host_aimer' ? (
          <div className="flex items-center gap-3 flex-1">
            <span className="text-xs font-mono text-zinc-400">Код лобби:</span>
            <div className="bg-black border border-white/20 rounded px-3 py-1.5 font-mono text-sm tracking-widest text-white font-bold flex items-center gap-2">
              <span>{roomCode}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Скопировать"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              (скинь этот код другу)
            </span>
          </div>
        ) : role === 'client_pilot' ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              placeholder="Код лобби (например, DUO-7429)"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              className="bg-black border border-white/20 rounded px-3 py-1.5 font-mono text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white w-64"
            />
            <button
              type="button"
              onClick={() => onConnectRoom(inputCode || 'DUO-7429')}
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

          {role === 'host_aimer' && (
            <button
              type="button"
              onClick={onToggleHost}
              className={`px-4 py-1.5 rounded text-xs font-semibold cursor-pointer transition-all ${
                connectionState === 'hosting' || connectionState === 'connected'
                  ? 'bg-zinc-800 text-zinc-300 border border-white/20 hover:bg-zinc-700'
                  : 'mono-btn-white'
              }`}
            >
              {connectionState === 'hosting' || connectionState === 'connected'
                ? 'Закрыть лобби'
                : 'Открыть лобби'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
