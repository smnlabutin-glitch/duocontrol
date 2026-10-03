import React, { useEffect, useRef } from 'react';
import { Activity, Zap, Radio, Clock } from 'lucide-react';
import type { LatencyStats } from '../../types';

interface LatencyMonitorProps {
  stats: LatencyStats;
}

export const LatencyMonitor: React.FC<LatencyMonitorProps> = ({ stats }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef<number[]>([]);

  useEffect(() => {
    // Keep last 40 data points
    historyRef.current.push(stats.pingMs);
    if (historyRef.current.length > 40) {
      historyRef.current.shift();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let y = 10; y < height; y += 15) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw latency line chart
    const points = historyRef.current;
    if (points.length < 2) return;

    ctx.beginPath();
    const maxVal = Math.max(...points, 20);
    const stepX = width / (points.length - 1);

    points.forEach((val, i) => {
      const x = i * stepX;
      const y = height - (val / maxVal) * (height - 10) - 5;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Gradient fill under line
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
    grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = grad;
    ctx.fill();
  }, [stats.pingMs]);

  return (
    <div className="glass-panel rounded-2xl p-5 border border-white/5 w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold text-sm tracking-wide text-white uppercase">Real-Time Input Pipeline</h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          Sub-Millisecond Synced
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {/* PING */}
        <div className="glass-card rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Input Latency</span>
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300">
            {stats.pingMs.toFixed(1)} <span className="text-xs text-slate-400">ms</span>
          </div>
        </div>

        {/* POLLING RATE */}
        <div className="glass-card rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
            <Zap className="w-3.5 h-3.5 text-violet-400" />
            <span>Tick Rate</span>
          </div>
          <div className="text-xl font-bold font-mono text-violet-300">
            {stats.packetRateHz} <span className="text-xs text-slate-400">Hz</span>
          </div>
        </div>

        {/* JITTER */}
        <div className="glass-card rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>Jitter</span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-300">
            ±{stats.jitterMs.toFixed(2)} <span className="text-xs text-slate-400">ms</span>
          </div>
        </div>

        {/* PACKET LOSS */}
        <div className="glass-card rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Packet Loss</span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-300">
            {stats.lossPercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Latency Waveform Canvas */}
      <div className="w-full bg-slate-950/70 rounded-xl p-2 border border-slate-800/80">
        <canvas ref={canvasRef} width={600} height={70} className="w-full h-16 block" />
      </div>
    </div>
  );
};
