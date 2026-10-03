import React from 'react';
import { Mouse, Keyboard, Users2, Check } from 'lucide-react';
import type { PlayerRole } from '../../types';

interface RoleSelectorProps {
  currentRole: PlayerRole;
  onSelectRole: (role: PlayerRole) => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ currentRole, onSelectRole }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
      {/* ROLE 1: AIMER (MOUSE) */}
      <button
        type="button"
        onClick={() => onSelectRole('host_aimer')}
        className={`mono-card text-left p-4 rounded-xl border transition-all cursor-pointer ${
          currentRole === 'host_aimer'
            ? 'border-white bg-[#18181c]'
            : 'border-white/10 hover:border-white/20 bg-[#111114]'
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="p-2 rounded bg-white/10 text-white">
            <Mouse className="w-5 h-5" />
          </div>
          {currentRole === 'host_aimer' && (
            <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
          )}
        </div>
        <h4 className="font-semibold text-white text-sm">Игрок 1: Мышь (Аим / Камера)</h4>
        <p className="text-xs text-zinc-400 mt-1 leading-snug">
          Хост игры. Управляет прицелом и стрельбой. Транслирует экран второму игроку.
        </p>
      </button>

      {/* ROLE 2: PILOT (KEYBOARD) */}
      <button
        type="button"
        onClick={() => onSelectRole('client_pilot')}
        className={`mono-card text-left p-4 rounded-xl border transition-all cursor-pointer ${
          currentRole === 'client_pilot'
            ? 'border-white bg-[#18181c]'
            : 'border-white/10 hover:border-white/20 bg-[#111114]'
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="p-2 rounded bg-white/10 text-white">
            <Keyboard className="w-5 h-5" />
          </div>
          {currentRole === 'client_pilot' && (
            <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
          )}
        </div>
        <h4 className="font-semibold text-white text-sm">Игрок 2: Клавиатура (Движение)</h4>
        <p className="text-xs text-zinc-400 mt-1 leading-snug">
          Смотрит трансляцию в окне и жмет WASD, прыжок и способности без задержки.
        </p>
      </button>

      {/* ROLE 3: LOCAL COUCH CO-OP */}
      <button
        type="button"
        onClick={() => onSelectRole('local_couch')}
        className={`mono-card text-left p-4 rounded-xl border transition-all cursor-pointer ${
          currentRole === 'local_couch'
            ? 'border-white bg-[#18181c]'
            : 'border-white/10 hover:border-white/20 bg-[#111114]'
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="p-2 rounded bg-white/10 text-white">
            <Users2 className="w-5 h-5" />
          </div>
          {currentRole === 'local_couch' && (
            <div className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
          )}
        </div>
        <h4 className="font-semibold text-white text-sm">Локально (За одним ПК)</h4>
        <p className="text-xs text-zinc-400 mt-1 leading-snug">
          Два игрока сидят рядом за одним компьютером. Разделение подключенных устройств.
        </p>
      </button>
    </div>
  );
};
