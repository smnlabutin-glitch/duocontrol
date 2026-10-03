import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Copy, Check, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { LogEntry } from '../../types';

interface DiagnosticLogsProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const DiagnosticLogs: React.FC<DiagnosticLogsProps> = ({ logs, onClearLogs }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isExpanded]);

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.time}] [${l.type.toUpperCase()}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getBadgeStyle = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-white font-bold bg-white/10 border-white/30';
      case 'error':
        return 'text-red-400 font-bold bg-red-950/40 border-red-500/40';
      case 'warn':
        return 'text-amber-300 font-semibold bg-amber-950/30 border-amber-500/30';
      case 'network':
        return 'text-zinc-200 bg-white/5 border-white/20';
      default:
        return 'text-zinc-400 bg-zinc-900 border-zinc-700';
    }
  };

  return (
    <div className="mono-card rounded-xl border border-white/10 w-full overflow-hidden transition-all">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/80 border-b border-white/10 select-none">
        <div
          className="flex items-center gap-2 cursor-pointer text-xs font-mono text-zinc-300 hover:text-white transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Terminal className="w-3.5 h-3.5 text-white" />
          <span className="font-semibold tracking-wider uppercase">Журнал событий и диагностика</span>
          <span className="text-[10px] text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
            {logs.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLogs}
            className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-zinc-300 transition-colors cursor-pointer"
            title="Скопировать все логи"
          >
            {copied ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Скопировано' : 'Копировать'}</span>
          </button>

          <button
            type="button"
            onClick={onClearLogs}
            className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Очистить логи"
          >
            <Trash2 className="w-3 h-3" />
            <span>Очистить</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Logs body */}
      {isExpanded && (
        <div className="bg-black/95 p-3 font-mono text-xs max-h-48 overflow-y-auto space-y-1.5 scrollbar-thin select-text">
          {logs.length === 0 ? (
            <div className="text-zinc-600 text-[11px] italic py-2 text-center">
              Журнал пуст. Запустите лобби или подключитесь к хосту.
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-zinc-500 text-[10px] shrink-0 pt-0.5 select-none">{log.time}</span>
                <span
                  className={`text-[9px] uppercase px-1.5 py-0.2 rounded border shrink-0 tracking-wider ${getBadgeStyle(
                    log.type
                  )}`}
                >
                  {log.type}
                </span>
                <span
                  className={`break-all ${
                    log.type === 'error'
                      ? 'text-red-300 font-semibold'
                      : log.type === 'warn'
                      ? 'text-amber-200'
                      : log.type === 'success'
                      ? 'text-white font-medium'
                      : 'text-zinc-300'
                  }`}
                >
                  {log.message}
                </span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
};
