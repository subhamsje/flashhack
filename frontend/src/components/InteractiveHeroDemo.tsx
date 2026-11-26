import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { warehouseApi, type ArrivalResponse, type Interval } from '../services/warehouseApi';

export const InteractiveHeroDemo: React.FC = () => {
  const [intervals, setIntervals] = useState<Interval[]>([
    { start: 1, end: 24 },
    { start: 31, end: 46 },
    { start: 52, end: 79 }
  ]);
  const [missingGaps, setMissingGaps] = useState<Interval[]>([
    { start: 25, end: 30 },
    { start: 47, end: 51 }
  ]);
  const [inputVal, setInputVal] = useState('25');
  const [lastEvent, setLastEvent] = useState<ArrivalResponse | null>(null);
  const [animatingId, setAnimatingId] = useState<number | null>(null);

  const handleSimulateArrival = async (idNum: number) => {
    setAnimatingId(idNum);
    const res = await warehouseApi.addArrival(idNum);
    setLastEvent(res);

    // Update gaps
    const gapRes = await warehouseApi.queryGaps(1, 80);
    setIntervals(gapRes.received);
    setMissingGaps(gapRes.gaps);

    setTimeout(() => setAnimatingId(null), 800);
  };

  const handleReset = () => {
    setIntervals([
      { start: 1, end: 24 },
      { start: 31, end: 46 },
      { start: 52, end: 79 }
    ]);
    setMissingGaps([
      { start: 25, end: 30 },
      { start: 47, end: 51 }
    ]);
    setLastEvent(null);
  };

  return (
    <div className="bg-surface border border-border rounded-xl shadow-lg p-6 lg:p-8 overflow-hidden relative">
      <div className="flex flex-wrap items-center justify-between border-b border-border pb-4 mb-6 gap-3">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-ink-muted">Authoritative C Engine Demo</span>
          <h3 className="font-serif text-xl font-semibold text-ink">Live Interval Fusion & Gap Tracking</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-ink-muted hover:text-ink hover:bg-surface-muted rounded-md transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium rounded-full bg-primary/10 text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            AVL Tree Synced
          </span>
        </div>
      </div>

      {/* Visual Number Line */}
      <div className="mb-6 space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-primary font-semibold uppercase tracking-wider">Received Package Ranges</span>
            <span className="text-ink-muted">{intervals.length} active intervals</span>
          </div>
          <div className="flex flex-wrap gap-2 min-h-12 p-3 bg-surface-muted/60 border border-border/80 rounded-lg items-center">
            <AnimatePresence>
              {intervals.map((iv) => (
                <motion.div
                  key={`${iv.start}-${iv.end}`}
                  layout
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className={`px-3 py-1.5 rounded font-mono text-xs font-semibold flex items-center gap-1.5 shadow-sm border ${
                    lastEvent && lastEvent.touched_new.start <= iv.start && lastEvent.touched_new.end >= iv.end
                      ? 'bg-primary text-white border-primary shadow-primary/20'
                      : 'bg-surface text-primary-dark border-primary/20'
                  }`}
                >
                  <span>[{String(iv.start).padStart(3, '0')}—{String(iv.end).padStart(3, '0')}]</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-black/10 rounded-full font-sans">
                    {iv.end - iv.start + 1}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-accent-secondary font-semibold uppercase tracking-wider">Missing Number Gaps</span>
            <span className="text-ink-muted">{missingGaps.length} broken gaps</span>
          </div>
          <div className="flex flex-wrap gap-2 min-h-12 p-3 bg-surface-muted/30 border border-dashed border-accent-secondary/30 rounded-lg items-center">
            {missingGaps.map((g) => (
              <div
                key={`gap-${g.start}-${g.end}`}
                className="px-3 py-1.5 rounded font-mono text-xs font-medium text-accent-secondary bg-accent-secondary/10 border border-accent-secondary/30 flex items-center gap-1.5"
              >
                <span>[{String(g.start).padStart(3, '0')}—{String(g.end).padStart(3, '0')}]</span>
                <span className="text-[10px] px-1 py-0.2 bg-accent-secondary/15 rounded font-sans">
                  -{g.end - g.start + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Controls */}
      <div className="bg-surface-muted p-4 rounded-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="w-24 px-3 py-2 bg-surface border border-border rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="ID"
          />
          <button
            onClick={() => handleSimulateArrival(parseInt(inputVal) || 0)}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded font-medium text-sm flex items-center gap-1.5 transition shadow"
          >
            <Play className="w-4 h-4 fill-white" /> Add Package
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-ink-muted mr-1">Try preset:</span>
          {[
            { label: 'Bridge 25', id: 25 },
            { label: 'Bridge 30', id: 30 },
            { label: 'Extend 47', id: 47 },
            { label: 'Extend 51', id: 51 }
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSimulateArrival(preset.id)}
              className="px-2.5 py-1 text-xs font-mono bg-surface hover:bg-white text-ink border border-border rounded transition"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Operation Log Status */}
      {lastEvent && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between text-xs font-mono text-primary-dark"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent" />
            <span>Package <strong>#{lastEvent.package_id}</strong> processed in <strong>{lastEvent.execution_time_ns} ns</strong></span>
          </div>
          <span className="px-2 py-0.5 rounded bg-primary/10 font-bold uppercase">
            {lastEvent.operation}
          </span>
        </motion.div>
      )}
    </div>
  );
};
