import React from 'react';
import { Keyboard, Minus, X, ShieldAlert } from 'lucide-react';
import type { ConnectionState } from '../../types';

interface HeaderProps {
  connectionState: ConnectionState;
}

export const Header: React.FC<HeaderProps> = ({ connectionState }) => {
  return (
    <header className="bg-[#09090b] border-b border-white/10 px-5 py-3 flex items-center justify-between sticky top-0 z-50">
      {/* BRAND & TITLE */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded bg-white text-black flex items-center justify-center font-bold">
          <Keyboard className="w-4 h-4 text-black stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-sm tracking-wider text-white uppercase">DUOCONTROL</h1>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-zinc-300 font-semibold">
              PORTABLE v1.2
            </span>
          </div>
        </div>
      </div>

      {/* STATUS & PANIC */}
      <div className="flex items-center gap-3">
        {/* Panic Key Reminder */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded border border-white/15 bg-white/5 text-zinc-300 text-[11px] font-mono">
          <ShieldAlert className="w-3.5 h-3.5 text-white" />
          <span>Сброс: <strong>Ctrl + Shift + F12</strong></span>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1 rounded border border-white/10 bg-[#121215] text-xs font-mono">
          <span className={`w-2 h-2 rounded-full ${
            connectionState === 'connected' ? 'bg-white animate-pulse' :
            connectionState === 'hosting' ? 'bg-zinc-300' :
            'bg-zinc-600'
          }`} />
          <span className="text-zinc-300 uppercase text-[11px]">
            {connectionState === 'connected' ? 'Связь активна' :
             connectionState === 'hosting' ? 'Ожидание игрока' :
             'Готов'}
          </span>
        </div>

        {/* Window controls */}
        <div className="flex items-center gap-1 pl-2 border-l border-white/10">
          <button
            type="button"
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Свернуть"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
