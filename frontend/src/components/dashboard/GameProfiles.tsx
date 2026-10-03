import React from 'react';
import { Gamepad2, Crosshair, Navigation } from 'lucide-react';
import type { GameProfile } from '../../types';

interface GameProfilesProps {
  selectedProfile: string;
  onSelectProfile: (id: string) => void;
}

export const GAME_PROFILES: GameProfile[] = [
  {
    id: 'cs2',
    name: 'Counter-Strike 2',
    genre: 'Tactical FPS',
    bannerColor: 'from-amber-600/30 to-slate-900',
    aimControls: ['Aim Camera', 'Fire (LMB)', 'Scope (RMB)', 'Weapon Wheel'],
    pilotControls: ['WASD Movement', 'Space Jump', 'Shift Walk', 'Ctrl Crouch', 'R Reload', 'E Defuse'],
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk 2077',
    genre: 'Action RPG',
    bannerColor: 'from-yellow-500/30 to-cyan-950/40',
    aimControls: ['Camera / Aim', 'Shoot / Quick Attack', 'Block / ADS', 'Scan (Middle Click)'],
    pilotControls: ['WASD Drive / Run', 'Dash (Ctrl)', 'Sandevistan (E)', 'Heal (V)', 'Jump (Space)'],
  },
  {
    id: 'minecraft',
    name: 'Minecraft',
    genre: 'Sandbox Survival',
    bannerColor: 'from-emerald-600/30 to-slate-900',
    aimControls: ['Look Direction', 'Mine / Attack (LMB)', 'Place Block / Eat (RMB)', 'Hotbar Scroll'],
    pilotControls: ['WASD Walk', 'Space Jump / Swim', 'Shift Sneak', 'E Inventory', 'Q Drop Item'],
  },
  {
    id: 'eldenring',
    name: 'Elden Ring',
    genre: 'Action Souls-like',
    bannerColor: 'from-orange-600/30 to-stone-900',
    aimControls: ['Free Camera Look', 'Light Attack', 'Heavy Attack', 'Lock-On Target'],
    pilotControls: ['WASD Movement', 'Space Roll / Dodge', 'F Jump', 'E Interact', 'R Use Flask'],
  },
];

export const GameProfiles: React.FC<GameProfilesProps> = ({ selectedProfile, onSelectProfile }) => {
  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/10 w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-indigo-400" />
          <h3 className="font-bold text-sm tracking-wide text-white uppercase">Optimized Game Profiles</h3>
        </div>
        <span className="text-xs text-slate-400">Steam & Epic Games Compatible</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {GAME_PROFILES.map((profile) => {
          const isSelected = selectedProfile === profile.id;
          return (
            <button
              key={profile.id}
              type="button"
              onClick={() => onSelectProfile(profile.id)}
              className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                isSelected
                  ? 'border-indigo-400 bg-gradient-to-br from-indigo-950/50 to-slate-900 shadow-[0_0_20px_rgba(99,102,241,0.25)]'
                  : 'border-white/5 bg-slate-900/60 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm text-white">{profile.name}</span>
              </div>
              <span className="text-[11px] font-mono text-indigo-300 block mb-3">{profile.genre}</span>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <Crosshair className="w-3 h-3 shrink-0" />
                  <span className="truncate text-slate-300">Aimer: {profile.aimControls[0]}, {profile.aimControls[1]}</span>
                </div>
                <div className="flex items-center gap-1.5 text-violet-400">
                  <Navigation className="w-3 h-3 shrink-0" />
                  <span className="truncate text-slate-300">Pilot: {profile.pilotControls[0]}, {profile.pilotControls[1]}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
