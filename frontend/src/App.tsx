import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/layout/Header';
import { RoleSelector } from './components/dashboard/RoleSelector';
import { LobbyCard } from './components/dashboard/LobbyCard';
import { GameStreamView } from './components/streaming/GameStreamView';
import type { PlayerRole, ConnectionState } from './types';
import { inputService } from './services/inputService';
import { DirectNetService } from './services/directNetService';
import { AlertCircle } from 'lucide-react';

const KEY_MAP: Record<string, number> = {
  KeyW: 0x57, KeyA: 0x41, KeyS: 0x53, KeyD: 0x44,
  Space: 0x20, ShiftLeft: 0x10, ShiftRight: 0x10,
  ControlLeft: 0x11, ControlRight: 0x11,
  KeyE: 0x45, KeyR: 0x52, KeyQ: 0x51, KeyF: 0x46, KeyG: 0x47,
  Digit1: 0x31, Digit2: 0x32, Digit3: 0x33, Digit4: 0x34, Digit5: 0x35,
  Tab: 0x09, Escape: 0x1B,
};

export const App: React.FC = () => {
  const [role, setRole] = useState<PlayerRole>('host_aimer');
  const [connectionState, setConnectionState] = useState<ConnectionState>('hosting');
  const [hostIp, setHostIp] = useState('');
  const [publicIp, setPublicIp] = useState('79.174.44.93');
  const [keyboardLocked, setKeyboardLocked] = useState(false);
  const [panicTriggered, setPanicTriggered] = useState(false);
  const [pingMs, setPingMs] = useState(0.8);

  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const netRef = useRef<DirectNetService | null>(null);

  // Native Windows SendInput invoker (for local couch mode)
  const triggerNativeKey = useCallback(async (code: string, isDown: boolean) => {
    const vk = KEY_MAP[code] || 0;
    if (vk === 0) return;

    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('inject_key_event', { vkCode: vk, isDown });
      } catch (err) {
        console.error('Tauri inject key error:', err);
      }
    }
  }, []);

  // Fetch Host IP addresses from native Rust backend and Public IP
  useEffect(() => {
    const fetchIps = async () => {
      // 1. Fetch public IP directly
      try {
        const resp = await fetch('https://api.ipify.org');
        if (resp.ok) {
          const ip = await resp.text();
          if (ip) setPublicIp(ip.trim());
        }
      } catch (e) {
        console.log('Public IP fetch note:', e);
      }

      // 2. Fetch local interface IPs from Rust
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const ips = await invoke<string[]>('get_host_ips');
          if (ips && ips.length > 0) {
            const nonLoopback = ips.find((ip) => ip !== '127.0.0.1');
            setHostIp(nonLoopback || ips[0]);
          }
        } catch (e) {
          console.error('Failed to fetch local IPs:', e);
        }
      }
    };
    fetchIps();
  }, []);

  // Initialize Network Service
  useEffect(() => {
    netRef.current = new DirectNetService({
      onStatusChange: (status, _msg) => {
        setConnectionState(status);
      },
      onRemoteStream: (stream) => {
        console.log('App: Remote game stream received!');
        setRemoteStream(stream);
      },
      onRemoteKey: (code, isDown) => {
        setActiveKeys((prev) => {
          const next = new Set(prev);
          if (isDown) next.add(code);
          else next.delete(code);
          return next;
        });
      },
      onPingUpdate: (ping) => {
        setPingMs(Math.max(0.2, ping));
      },
    });

    if (role === 'host_aimer') {
      netRef.current.startHost();
    }

    return () => {
      netRef.current?.destroy();
    };
  }, [role]);

  // Handle Role Change
  const handleSelectRole = (newRole: PlayerRole) => {
    setRole(newRole);
    setRemoteStream(null);
    if (newRole === 'host_aimer') {
      netRef.current?.startHost();
    } else {
      netRef.current?.destroy();
      setConnectionState('idle');
    }
  };

  // Handle Client Connect to IP
  const handleConnectRoom = (ip: string) => {
    setRemoteStream(null);
    netRef.current?.joinHost(ip);
  };

  // Handle local screen capture stream change on Host
  const handleLocalStreamChange = (stream: MediaStream | null) => {
    netRef.current?.setLocalStream(stream);
  };

  // Handle local keyboard presses
  const handleSendKey = useCallback((code: string, isDown: boolean) => {
    setActiveKeys((prev) => {
      const next = new Set(prev);
      if (isDown) next.add(code);
      else next.delete(code);
      return next;
    });

    if (role === 'client_pilot') {
      const vk = KEY_MAP[code] || 0;
      netRef.current?.sendKey(code, vk, isDown);
    } else if (role === 'local_couch') {
      triggerNativeKey(code, isDown);
    }
  }, [role, triggerNativeKey]);

  // Panic hotkey (Ctrl + Shift + F12)
  useEffect(() => {
    const unsubPanic = inputService.onPanic(() => {
      setPanicTriggered(true);
      setKeyboardLocked(false);
      setTimeout(() => setPanicTriggered(false), 4000);
    });

    return () => {
      unsubPanic();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col font-sans">
      <Header connectionState={connectionState} />

      {/* PANIC ALERT */}
      {panicTriggered && (
        <div className="bg-white text-black px-4 py-2 font-mono text-xs font-bold flex items-center justify-between border-b border-black">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-black" />
            <span>АВАРИЙНЫЙ СБРОС (Ctrl+Shift+F12). Все перехваты сняты. Управление возвращено.</span>
          </div>
          <span>БЕЗОПАСНЫЙ РЕЖИМ</span>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 space-y-4">
        {/* ROLE SELECTION */}
        <RoleSelector currentRole={role} onSelectRole={handleSelectRole} />

        {/* LOBBY / IP BAR */}
        <LobbyCard
          role={role}
          connectionState={connectionState}
          hostIp={hostIp}
          publicIp={publicIp}
          keyboardLocked={keyboardLocked}
          onConnectRoom={handleConnectRoom}
          onToggleKeyboardLock={() => setKeyboardLocked(!keyboardLocked)}
        />

        {/* INTEGRATED LIVE GAME STREAM VIEWPORT */}
        <GameStreamView
          role={role}
          pingMs={pingMs}
          onSendKey={handleSendKey}
          activeKeys={activeKeys}
          remoteStream={remoteStream}
          onLocalStreamChange={handleLocalStreamChange}
          isConnected={connectionState === 'connected'}
        />

        {/* STATUS FOOTER BAR */}
        <div className="mono-card rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-zinc-400 gap-2">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connectionState === 'connected' ? 'bg-white animate-pulse' : 'bg-zinc-600'}`} />
            <span>
              {connectionState === 'connected'
                ? 'Прямой P2P канал активен (Видео 60 FPS + Клавиатура 1000 Гц)'
                : connectionState === 'hosting'
                ? 'Сервер хоста активен (UPnP порт открыт). Друг вводит ваш Интернет IP и жмет «Подключиться»'
                : connectionState === 'connecting'
                ? 'Устанавливаем прямое соединение с хостом...'
                : 'Готов к подключению'}
            </span>
          </div>
          <div className="text-zinc-500">
            {role === 'host_aimer' ? 'Хост: нажмите «Захватить игру / экран» в плеере выше' : 'Для игры: кликните по окну трансляции и жмите WASD'}
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 py-3 px-4 text-center text-xs text-zinc-500 font-mono">
        DuoControl Portable • Прямой интернет-сервер с автопробросом портов (UPnP)
      </footer>
    </div>
  );
};

export default App;
