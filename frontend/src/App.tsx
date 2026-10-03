import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/layout/Header';
import { RoleSelector } from './components/dashboard/RoleSelector';
import { LobbyCard } from './components/dashboard/LobbyCard';
import { GameStreamView } from './components/streaming/GameStreamView';
import type { PlayerRole, ConnectionState } from './types';
import { inputService } from './services/inputService';
import { P2PService } from './services/peerService';
import { AlertCircle } from 'lucide-react';

// Common Windows Virtual Key codes
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
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [roomCode, setRoomCode] = useState(() => 'DUO-' + Math.floor(1000 + Math.random() * 9000));
  const [keyboardLocked, setKeyboardLocked] = useState(false);
  const [panicTriggered, setPanicTriggered] = useState(false);
  const [pingMs, setPingMs] = useState(1.0);

  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const p2pRef = useRef<P2PService | null>(null);

  // Native Windows SendInput invoker
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

  // Initialize P2P Service
  useEffect(() => {
    p2pRef.current = new P2PService({
      onStatusChange: (status, _msg) => {
        setConnectionState(status);
      },
      onRemoteStream: (stream) => {
        console.log('Received remote game stream!');
        setRemoteStream(stream);
      },
      onRemoteKey: (code, isDown) => {
        // Host receives key from remote client
        setActiveKeys((prev) => {
          const next = new Set(prev);
          if (isDown) next.add(code);
          else next.delete(code);
          return next;
        });

        // Inject hardware key event into the Windows game
        triggerNativeKey(code, isDown);
      },
      onPingUpdate: (ping) => {
        setPingMs(Math.max(0.5, ping));
      },
    });

    return () => {
      p2pRef.current?.destroy();
    };
  }, [triggerNativeKey]);

  // Handle Host Start/Stop
  const handleToggleHost = () => {
    if (connectionState === 'hosting' || connectionState === 'connected') {
      p2pRef.current?.destroy();
      setConnectionState('idle');
      setRemoteStream(null);
    } else {
      const newCode = 'DUO-' + Math.floor(1000 + Math.random() * 9000);
      setRoomCode(newCode);
      p2pRef.current?.startHost(newCode, (code) => {
        setRoomCode(code);
      });
    }
  };

  // Handle Client Connect
  const handleConnectRoom = (code: string) => {
    setRemoteStream(null);
    p2pRef.current?.joinRoom(code);
  };

  // Handle local screen capture stream change on Host
  const handleLocalStreamChange = (stream: MediaStream | null) => {
    p2pRef.current?.setLocalStream(stream);
  };

  // Handle local keyboard presses when Client
  const handleSendKey = useCallback((code: string, isDown: boolean) => {
    setActiveKeys((prev) => {
      const next = new Set(prev);
      if (isDown) next.add(code);
      else next.delete(code);
      return next;
    });

    if (role === 'client_pilot') {
      p2pRef.current?.sendKey(code, isDown);
    } else if (role === 'local_couch') {
      triggerNativeKey(code, isDown);
    }
  }, [role, triggerNativeKey]);

  // Listen for panic hotkey (Ctrl + Shift + F12)
  useEffect(() => {
    const unsubPanic = inputService.onPanic(() => {
      setPanicTriggered(true);
      setKeyboardLocked(false);
      setConnectionState('idle');
      p2pRef.current?.destroy();
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
        <RoleSelector currentRole={role} onSelectRole={setRole} />

        {/* LOBBY / ROOM BAR */}
        <LobbyCard
          role={role}
          connectionState={connectionState}
          roomCode={roomCode}
          keyboardLocked={keyboardLocked}
          onToggleHost={handleToggleHost}
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
                ? 'Прямой P2P WebRTC канал активен (Видео + Клавиатура 1000 Гц)'
                : connectionState === 'hosting'
                ? 'Лобби открыто. Ждем подключения второго игрока...'
                : connectionState === 'connecting'
                ? 'Устанавливаем прямое P2P соединение...'
                : 'Готов к началу игры'}
            </span>
          </div>
          <div className="text-zinc-500">
            Для трансляции: Хост жмет «Захватить игру / экран»
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 py-3 px-4 text-center text-xs text-zinc-500 font-mono">
        DuoControl Portable • Прямой P2P видеострим и ввод
      </footer>
    </div>
  );
};

export default App;
