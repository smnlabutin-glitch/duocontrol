import React from 'react';
import { Mouse as MouseIcon, Keyboard as KeyboardIcon, ShieldAlert } from 'lucide-react';
import type { PlayerRole } from '../../types';

interface InputVisualizerProps {
  role: PlayerRole;
  pressedKeys: Set<string>;
  mouseButtons: { left: boolean; right: boolean; middle: boolean };
  keyboardLocked: boolean;
}

export const InputVisualizer: React.FC<InputVisualizerProps> = ({
  role,
  pressedKeys,
  mouseButtons,
  keyboardLocked,
}) => {
  // Key matrix layout for common gaming keys
  const rows = [
    ['Escape', '1', '2', '3', '4', '5'],
    ['Tab', 'Q', 'W', 'E', 'R', 'T'],
    ['CapsLock', 'A', 'S', 'D', 'F', 'G'],
    ['Shift', 'Z', 'X', 'C', 'V', 'B'],
    ['Control', 'Alt', 'Space'],
  ];

  const isKeyActive = (key: string) => {
    if (key === 'Control') return pressedKeys.has('Control') || pressedKeys.has('ControlLeft');
    if (key === 'Shift') return pressedKeys.has('Shift') || pressedKeys.has('ShiftLeft');
    if (key === 'Alt') return pressedKeys.has('Alt') || pressedKeys.has('AltLeft');
    if (key === 'Space') return pressedKeys.has(' ') || pressedKeys.has('Space');
    return pressedKeys.has(key.toLowerCase()) || pressedKeys.has(key.toUpperCase());
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full">
      {/* MOUSE CARD (Player 1) */}
      <div className={`lg:col-span-4 glass-panel rounded-2xl p-5 border relative overflow-hidden transition-all duration-300 ${
        role === 'host_aimer' ? 'border-cyan-500/40 shadow-cyan-950/30' : 'border-white/5'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <MouseIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide text-white">PLAYER 1: AIMER</h3>
              <p className="text-[11px] text-cyan-400 font-medium">Mouse & Camera Direct</p>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            {role === 'host_aimer' ? 'Active Local' : 'Partner Device'}
          </span>
        </div>

        {/* Visual Gaming Mouse */}
        <div className="flex flex-col items-center justify-center py-4">
          <div className="relative w-36 h-56 bg-slate-900/90 rounded-[50px] border-2 border-slate-700/60 p-2 shadow-2xl flex flex-col items-center">
            {/* Top Buttons (Left / Right / Wheel) */}
            <div className="grid grid-cols-2 gap-1.5 w-full h-24 mb-2">
              <div
                className={`rounded-tl-[40px] rounded-bl-lg border transition-all duration-75 flex items-center justify-center font-mono text-[10px] font-bold ${
                  mouseButtons.left
                    ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.8)] scale-[0.98]'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700/50 hover:border-cyan-500/30'
                }`}
              >
                LMB (Fire)
              </div>
              <div
                className={`rounded-tr-[40px] rounded-br-lg border transition-all duration-75 flex items-center justify-center font-mono text-[10px] font-bold ${
                  mouseButtons.right
                    ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.8)] scale-[0.98]'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700/50 hover:border-cyan-500/30'
                }`}
              >
                RMB (Aim)
              </div>
            </div>

            {/* Scroll Wheel */}
            <div className="absolute top-10 w-4 h-9 rounded-full bg-slate-950 border border-slate-600 flex items-center justify-center">
              <div className={`w-2.5 h-4 rounded-full transition-all ${
                mouseButtons.middle ? 'bg-cyan-400 shadow-[0_0_10px_#06b6d4]' : 'bg-slate-700'
              }`} />
            </div>

            {/* Palm Rest with Glow Emblem */}
            <div className="mt-auto mb-4 w-12 h-12 rounded-full border border-cyan-500/20 bg-cyan-500/5 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#06b6d4]" />
            </div>
            <div className="text-[10px] font-mono text-slate-500">OPTICAL 1000Hz</div>
          </div>
        </div>

        <div className="mt-2 text-center text-xs text-slate-400">
          Exclusive camera rotation, target tracking & click actions.
        </div>
      </div>

      {/* KEYBOARD CARD (Player 2) */}
      <div className={`lg:col-span-8 glass-panel rounded-2xl p-5 border relative overflow-hidden transition-all duration-300 ${
        role === 'client_pilot' ? 'border-violet-500/40 shadow-violet-950/30' : 'border-white/5'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <KeyboardIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide text-white">PLAYER 2: PILOT</h3>
              <p className="text-[11px] text-violet-400 font-medium">Movement, Jump & Abilities</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {keyboardLocked && (
              <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                <ShieldAlert className="w-3 h-3" /> Host Keyboard Muted
              </span>
            )}
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
              {role === 'client_pilot' ? 'Active Local' : 'Remote Injected'}
            </span>
          </div>
        </div>

        {/* Visual Mechanical Keyboard Matrix */}
        <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 shadow-inner flex flex-col gap-2">
          {rows.map((row, rIdx) => (
            <div key={rIdx} className="flex gap-2 justify-center">
              {row.map((key) => {
                const active = isKeyActive(key);
                const isWASD = ['W', 'A', 'S', 'D'].includes(key);
                const isSpace = key === 'Space';

                return (
                  <div
                    key={key}
                    className={`h-11 rounded-lg border font-mono text-xs font-bold flex items-center justify-center transition-all duration-75 select-none ${
                      isSpace ? 'w-48' : key.length > 2 ? 'w-16 px-2' : 'w-11'
                    } ${
                      active
                        ? 'bg-violet-600 text-white border-violet-300 shadow-[0_0_16px_rgba(139,92,246,0.9)] scale-[0.95]'
                        : isWASD
                        ? 'bg-slate-800/90 text-violet-300 border-violet-500/30 hover:border-violet-400/50'
                        : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {key}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>WASD Movement, Space Jump, Shift Sprint, E Interact.</span>
          <span className="font-mono text-violet-400">Tick: 0.1ms Polling</span>
        </div>
      </div>
    </div>
  );
};
