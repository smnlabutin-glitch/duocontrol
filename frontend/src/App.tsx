import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { Header } from './components/layout/Header';
import { RoleSelector } from './components/dashboard/RoleSelector';
import { LobbyCard } from './components/dashboard/LobbyCard';
import { GameStreamView } from './components/streaming/GameStreamView';
import { DiagnosticLogs } from './components/dashboard/DiagnosticLogs';
import { inputService } from './services/inputService';
import { DirectNetService } from './services/directNetService';
import type { PlayerRole, ConnectionState, LogEntry } from './types';

const KEY_MAP: Record<string, number> = {
  // Letters A-Z
  KeyA: 0x41, KeyB: 0x42, KeyC: 0x43, KeyD: 0x44, KeyE: 0x45, KeyF: 0x46, KeyG: 0x47, KeyH: 0x48,
  KeyI: 0x49, KeyJ: 0x4A, KeyK: 0x4B, KeyL: 0x4C, KeyM: 0x4D, KeyN: 0x4E, KeyO: 0x4F, KeyP: 0x50,
  KeyQ: 0x51, KeyR: 0x52, KeyS: 0x53, KeyT: 0x54, KeyU: 0x55, KeyV: 0x56, KeyW: 0x57, KeyX: 0x58,
  KeyY: 0x59, KeyZ: 0x5A,
  // Digits 0-9
  Digit0: 0x30, Digit1: 0x31, Digit2: 0x32, Digit3: 0x33, Digit4: 0x34,
  Digit5: 0x35, Digit6: 0x36, Digit7: 0x37, Digit8: 0x38, Digit9: 0x39,
  // Essential Controls & Modifiers
  Space: 0x20, Tab: 0x09, Escape: 0x1B, Enter: 0x0D, Backspace: 0x08,
  ShiftLeft: 0x10, ShiftRight: 0x10, ControlLeft: 0x11, ControlRight: 0x11,
  AltLeft: 0x12, AltRight: 0x12, CapsLock: 0x14,
  // Arrows & Navigation
  ArrowUp: 0x26, ArrowDown: 0x28, ArrowLeft: 0x25, ArrowRight: 0x27,
  Insert: 0x2D, Delete: 0x2E, Home: 0x24, End: 0x23, PageUp: 0x21, PageDown: 0x22,
  // Function Keys F1-F12
  F1: 0x70, F2: 0x71, F3: 0x72, F4: 0x73, F5: 0x74, F6: 0x75,
  F7: 0x76, F8: 0x77, F9: 0x78, F10: 0x79, F11: 0x7A, F12: 0x7B,
  // Punctuation & Symbols
  Minus: 0xBD, Equal: 0xBB, BracketLeft: 0xDB, BracketRight: 0xDD,
  Backslash: 0xDC, Semicolon: 0xBA, Quote: 0xDE, Backquote: 0xC0,
  Comma: 0xBC, Period: 0xBE, Slash: 0xBF,
  // Numpad Keys
  Numpad0: 0x60, Numpad1: 0x61, Numpad2: 0x62, Numpad3: 0x63, Numpad4: 0x64,
  Numpad5: 0x65, Numpad6: 0x66, Numpad7: 0x67, Numpad8: 0x68, Numpad9: 0x69,
  NumpadAdd: 0x6B, NumpadSubtract: 0x6D, NumpadMultiply: 0x6A, NumpadDivide: 0x6F,
  NumpadDecimal: 0x6E, NumpadEnter: 0x0D,
};

export const App: React.FC = () => {
  const [role, setRole] = useState<PlayerRole>('host_aimer');
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [hostIp, setHostIp] = useState<string>('127.0.0.1');
  const [publicIp, setPublicIp] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('DUO-7788');
  const [keyboardLocked, setKeyboardLocked] = useState(false);
  const [panicTriggered, setPanicTriggered] = useState(false);
  const [pingMs, setPingMs] = useState(0.8);
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const netRef = useRef<DirectNetService | null>(null);

  // Helper to add timestamped logs
  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const now = new Date();
    const time = now.toTimeString().split(' ')[0];
    setLogs((prev) => [
      ...prev.slice(-150),
      {
        id: Math.random().toString(36).substring(2, 9),
        time,
        type,
        message,
      },
    ]);
  }, []);

  // Native Windows SendInput invoker (for Host injecting keys into games)
  const triggerNativeKey = useCallback(async (code: string, isDown: boolean, remoteVk?: number) => {
    const vk = remoteVk || KEY_MAP[code] || 0;
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
          if (ip) {
            setPublicIp(ip.trim());
            addLog(`Внешний интернет IP определен: ${ip.trim()}`, 'network');
          }
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
            const chosen = nonLoopback || ips[0];
            setHostIp(chosen);
            addLog(`Локальный сетевой IP: ${chosen}`, 'network');
          }
        } catch (e) {
          console.error('Failed to fetch local IPs:', e);
        }
      }
    };
    fetchIps();
  }, [addLog]);

  // Initialize Network Service
  useEffect(() => {
    netRef.current = new DirectNetService({
      onStatusChange: (status, msg) => {
        setConnectionState(status);
        if (msg) {
          if (status === 'error') {
            setErrorMessage(msg);
            addLog(msg, 'error');
          } else if (status === 'connected') {
            setErrorMessage('');
            addLog(msg, 'success');
          } else {
            addLog(msg, 'info');
          }
        }
      },
      onRemoteStream: (stream) => {
        addLog('Видеопоток игры 60 FPS успешно принят!', 'success');
        setRemoteStream(stream);
      },
      onRemoteKey: (code, isDown, remoteVk, alreadyInjected) => {
        setActiveKeys((prev) => {
          const next = new Set(prev);
          if (isDown) next.add(code);
          else next.delete(code);
          return next;
        });

        // If Host receives a remote key press, inject into Windows only if not already injected by native Rust backend!
        if (role === 'host_aimer' && !alreadyInjected) {
          triggerNativeKey(code, isDown, remoteVk);
        }
      },
      onPingUpdate: (ping) => {
        setPingMs(Math.max(0.2, ping));
      },
      onLog: (msg, type) => {
        addLog(msg, type);
      },
      onRoomReady: (code) => {
        setRoomCode(code);
      },
    });

    if (role === 'host_aimer') {
      netRef.current.startHost();
    } else {
      addLog('Режим Пилота: введите Код комнаты или IP хоста и нажмите «Подключиться».', 'info');
    }

    return () => {
      netRef.current?.destroy();
    };
  }, [role, addLog, triggerNativeKey]);

  // Handle Role Change
  const handleSelectRole = (newRole: PlayerRole) => {
    setRole(newRole);
    setRemoteStream(null);
    setErrorMessage('');
    if (newRole === 'host_aimer') {
      netRef.current?.startHost();
    } else {
      netRef.current?.destroy();
      setConnectionState('idle');
      addLog(`Роль изменена на: ${newRole === 'client_pilot' ? 'Гость (Пилот)' : 'Локальный ПК'}`, 'info');
    }
  };

  // Handle Client Connect to IP or Room Code
  const handleConnectRoom = (target: string) => {
    setRemoteStream(null);
    setErrorMessage('');
    addLog(`Запуск подключения к: ${target}...`, 'network');
    netRef.current?.joinHost(target);
  };

  // Handle local screen capture stream change on Host
  const handleLocalStreamChange = (stream: MediaStream | null) => {
    netRef.current?.setLocalStream(stream);
  };

  // Handle local keyboard presses
  const handleSendKey = useCallback(
    (code: string, isDown: boolean, keyCode?: number) => {
      setActiveKeys((prev) => {
        const next = new Set(prev);
        if (isDown) next.add(code);
        else next.delete(code);
        return next;
      });

      const vk = KEY_MAP[code] || keyCode || 0;
      if (role === 'client_pilot') {
        netRef.current?.sendKey(code, vk, isDown);
      } else if (role === 'local_couch') {
        triggerNativeKey(code, isDown, vk);
      }
    },
    [role, triggerNativeKey]
  );

  // Panic hotkey (Ctrl + Shift + F12)
  useEffect(() => {
    const unsubPanic = inputService.onPanic(async () => {
      setPanicTriggered(true);
      setKeyboardLocked(false);
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('panic_reset');
        } catch (err) {
          console.error('Tauri panic reset error:', err);
        }
      }
      addLog('ВНИМАНИЕ: Сработал аварийный сброс (Panic Reset)!', 'warn');
      setTimeout(() => setPanicTriggered(false), 4000);
    });

    return () => {
      unsubPanic();
    };
  }, [addLog]);

  // Toggle Physical Keyboard Lock on Host
  const handleToggleKeyboardLock = async () => {
    const next = !keyboardLocked;
    setKeyboardLocked(next);
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('toggle_keyboard_mute', { mute: next });
        addLog(
          next
            ? 'Физическая клавиатура хоста (WASD/прыжок) заблокирована для пилота'
            : 'Физическая клавиатура хоста разблокирована',
          'info'
        );
      } catch (err) {
        console.error('Tauri toggle mute error:', err);
      }
    }
  };

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

        {/* LOBBY / IP / ROOM CODE BAR */}
        <LobbyCard
          role={role}
          connectionState={connectionState}
          hostIp={hostIp}
          publicIp={publicIp}
          roomCode={roomCode}
          keyboardLocked={keyboardLocked}
          errorMessage={errorMessage}
          onConnectRoom={handleConnectRoom}
          onToggleKeyboardLock={handleToggleKeyboardLock}
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

        {/* NETWORK DIAGNOSTICS CONSOLE LOGS */}
        <DiagnosticLogs logs={logs} onClearLogs={() => setLogs([])} />

        {/* STATUS FOOTER BAR */}
        <div className="mono-card rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-zinc-400 gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionState === 'connected'
                  ? 'bg-white animate-pulse'
                  : connectionState === 'connecting'
                  ? 'bg-amber-400 animate-ping'
                  : connectionState === 'error'
                  ? 'bg-red-500'
                  : 'bg-zinc-600'
              }`}
            />
            <span>
              {connectionState === 'connected'
                ? 'Прямой P2P туннель активен (Видео 60 FPS + Клавиатура <1 мс без VPN)'
                : connectionState === 'hosting'
                ? `Лобби открыто [${roomCode}]. Передайте Код комнаты другу для игры через интернет.`
                : connectionState === 'connecting'
                ? 'Подключение к хосту и согласование P2P маршрута...'
                : connectionState === 'error'
                ? 'Ошибка соединения. Проверьте журнал диагностики ниже.'
                : 'Готов к подключению'}
            </span>
          </div>
          <div className="text-zinc-500">
            {role === 'host_aimer'
              ? 'Хост: нажмите «Захватить игру / экран» в плеере выше'
              : 'Для управления: кликните по экрану и жмите WASD'}
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 py-3 px-4 text-center text-xs text-zinc-500 font-mono">
        DuoControl Portable • Встроенный P2P-туннель (Zero-VPN) с прямой инъекцией SendInput
      </footer>
    </div>
  );
};

export default App;
