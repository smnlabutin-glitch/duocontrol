import React, { useRef, useEffect, useState } from 'react';
import { Maximize2, MonitorPlay, StopCircle, Wifi, Shield } from 'lucide-react';
import type { PlayerRole } from '../../types';

interface GameStreamViewProps {
  role: PlayerRole;
  pingMs: number;
  onSendKey: (key: string, isDown: boolean) => void;
  activeKeys: Set<string>;
  remoteStream: MediaStream | null;
  onLocalStreamChange: (stream: MediaStream | null) => void;
  isConnected: boolean;
}

export const GameStreamView: React.FC<GameStreamViewProps> = ({
  role,
  pingMs,
  onSendKey,
  activeKeys,
  remoteStream,
  onLocalStreamChange,
  isConnected,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  // If Client receives remote stream, bind it to video element
  useEffect(() => {
    if (role === 'client_pilot' && remoteStream && videoRef.current) {
      videoRef.current.srcObject = remoteStream;
      videoRef.current.play().catch(console.error);
    }
  }, [role, remoteStream]);

  // Host starts screen capture
  const startScreenCapture = async () => {
    try {
      setStreamError(null);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 60, max: 120 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }

      setLocalStream(stream);
      onLocalStreamChange(stream);

      stream.getVideoTracks()[0].onended = () => {
        stopScreenCapture();
      };
    } catch (err) {
      console.error('Screen capture error:', err);
      setStreamError('Разрешите доступ к окну игры или всему экрану.');
    }
  };

  const stopScreenCapture = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
      onLocalStreamChange(null);
    }
    if (videoRef.current && role === 'host_aimer') {
      videoRef.current.srcObject = null;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  // Keyboard capture while watching the stream
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code)) {
        e.preventDefault();
      }
      onSendKey(e.code, true);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      onSendKey(e.code, false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onSendKey]);

  const hasVideoActive = (role === 'host_aimer' && localStream !== null) ||
                         (role === 'client_pilot' && remoteStream !== null);

  return (
    <div
      ref={containerRef}
      className="mono-card rounded-xl overflow-hidden relative flex flex-col bg-black border border-white/10"
    >
      {/* Top Stream Bar */}
      <div className="px-4 py-2.5 bg-[#121215] border-b border-white/10 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${hasVideoActive ? 'bg-white animate-pulse' : 'bg-zinc-600'}`} />
          <span className="font-mono text-xs uppercase tracking-wider text-zinc-300">
            {role === 'host_aimer'
              ? (localStream ? 'Вы транслируете экран (60 FPS)' : 'Окно игры (Трансляция)')
              : (remoteStream ? 'Прямой P2P видеопоток от хоста' : 'Ожидание видеопотока')}
          </span>
          {isConnected && (
            <span className="text-[11px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
              P2P Задержка: {pingMs.toFixed(1)} мс
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {role === 'host_aimer' ? (
            localStream ? (
              <button
                type="button"
                onClick={stopScreenCapture}
                className="px-3 py-1 bg-red-600/20 text-red-300 hover:bg-red-600/30 border border-red-500/30 rounded text-xs font-mono flex items-center gap-1.5 cursor-pointer"
              >
                <StopCircle className="w-3.5 h-3.5" />
                Остановить захват
              </button>
            ) : (
              <button
                type="button"
                onClick={startScreenCapture}
                className="px-3 py-1 mono-btn-white rounded text-xs font-mono flex items-center gap-1.5 cursor-pointer"
              >
                <MonitorPlay className="w-3.5 h-3.5" />
                Захватить игру / экран
              </button>
            )
          ) : (
            <div className="text-xs font-mono text-zinc-400 flex items-center gap-1">
              <Wifi className={`w-3.5 h-3.5 ${isConnected ? 'text-white' : 'text-zinc-500'}`} />
              {remoteStream ? 'Поток принимается' : isConnected ? 'Ожидание захвата у хоста' : 'Не подключено'}
            </div>
          )}

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Во весь экран"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="relative w-full aspect-video min-h-[380px] bg-black flex items-center justify-center">
        {/* Video element for local or remote stream */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-contain ${hasVideoActive ? 'block' : 'hidden'}`}
        />

        {/* Empty Standby State */}
        {!hasVideoActive && (
          <div className="text-center p-8 max-w-md">
            <div className="w-12 h-12 rounded-lg border border-white/15 bg-white/5 mx-auto mb-4 flex items-center justify-center text-zinc-300">
              <MonitorPlay className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">
              {role === 'host_aimer'
                ? 'Трансляция не запущена'
                : isConnected
                ? 'Хост подключен! Ожидание видео'
                : 'Введите код хоста и нажмите «Подключиться»'}
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              {role === 'host_aimer'
                ? 'Нажмите кнопку «Захватить игру / экран» вверху, чтобы видео транслировалось второму игроку по прямому P2P каналу.'
                : isConnected
                ? 'Хост должен нажать кнопку «Захватить игру / экран» у себя. Видеопоток появится здесь сразу.'
                : 'Когда второй игрок подключится по вашему коду, видео и клавиши начнут передаваться напрямую.'}
            </p>
            {role === 'host_aimer' && (
              <button
                type="button"
                onClick={startScreenCapture}
                className="px-4 py-2 mono-btn-white rounded-md text-xs font-semibold cursor-pointer"
              >
                Выбрать окно игры
              </button>
            )}
            {streamError && (
              <p className="mt-3 text-xs text-red-400 font-mono">{streamError}</p>
            )}
          </div>
        )}

        {/* Live HUD overlay on video */}
        {hasVideoActive && (
          <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded border border-white/10 flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <Shield className="w-3 h-3 text-white" />
              P2P 60 FPS
            </span>
            <span className="text-zinc-500">|</span>
            <span className="text-zinc-300">{pingMs.toFixed(1)}ms</span>
          </div>
        )}

        {/* Active pressed keys overlay */}
        {activeKeys.size > 0 && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
            {Array.from(activeKeys).slice(0, 5).map((key) => (
              <span
                key={key}
                className="px-2.5 py-1 rounded bg-white text-black font-mono font-bold text-xs shadow-lg animate-pulse"
              >
                {key.replace('Key', '')}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
