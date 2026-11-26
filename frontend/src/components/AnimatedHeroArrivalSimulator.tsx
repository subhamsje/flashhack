import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, ArrowRight, Zap, RefreshCw } from 'lucide-react';

interface IntervalState {
  start: number;
  end: number;
}

const SEQUENCE = [1, 3, 7, 2, 6, 4, 5];

export const AnimatedHeroArrivalSimulator: React.FC = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // States after each arrival step in SEQUENCE:
  // Step 0: Initial empty []
  // Step 1 (ID 1): [[1, 1]]
  // Step 2 (ID 3): [[1, 1], [3, 3]]
  // Step 3 (ID 7): [[1, 1], [3, 3], [7, 7]]
  // Step 4 (ID 2): [[1, 3], [7, 7]] (Bridge 2)
  // Step 5 (ID 6): [[1, 3], [6, 7]] (Extend 6)
  // Step 6 (ID 4): [[1, 4], [6, 7]] (Extend 4)
  // Step 7 (ID 5): [[1, 7]] (Bridge 5 -> complete continuous interval!)
  const states: { intervals: IntervalState[]; gaps: IntervalState[]; op: string; incomingId: number | null }[] = [
    { intervals: [], gaps: [{ start: 1, end: 7 }], op: 'READY', incomingId: null },
    { intervals: [{ start: 1, end: 1 }], gaps: [{ start: 2, end: 7 }], op: 'NEW INTERVAL [1,1]', incomingId: 1 },
    { intervals: [{ start: 1, end: 1 }, { start: 3, end: 3 }], gaps: [{ start: 2, end: 2 }, { start: 4, end: 7 }], op: 'NEW INTERVAL [3,3]', incomingId: 3 },
    { intervals: [{ start: 1, end: 1 }, { start: 3, end: 3 }, { start: 7, end: 7 }], gaps: [{ start: 2, end: 2 }, { start: 4, end: 6 }], op: 'NEW INTERVAL [7,7]', incomingId: 7 },
    { intervals: [{ start: 1, end: 3 }, { start: 7, end: 7 }], gaps: [{ start: 4, end: 6 }], op: 'BRIDGE MERGE → [1,3]', incomingId: 2 },
    { intervals: [{ start: 1, end: 3 }, { start: 6, end: 7 }], gaps: [{ start: 4, end: 5 }], op: 'LEFT EXTENSION → [6,7]', incomingId: 6 },
    { intervals: [{ start: 1, end: 4 }, { start: 6, end: 7 }], gaps: [{ start: 5, end: 5 }], op: 'RIGHT EXTENSION → [1,4]', incomingId: 4 },
    { intervals: [{ start: 1, end: 7 }], gaps: [], op: 'FINAL BRIDGE MERGE → [1,7]', incomingId: 5 },
  ];

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % states.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [isPlaying, states.length]);

  const current = states[stepIndex];

  return (
    <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-5">
      {/* Simulation Header with Controls */}
      <div className="flex flex-wrap items-center justify-between border-b border-border pb-3 gap-3">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-muted font-semibold">Live Algorithm Animation</span>
          <h4 className="font-serif text-lg font-bold text-text">Sequential Arrival & Continuous Interval Formation</h4>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-background hover:bg-border/50 border border-border text-text transition"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button
            onClick={() => setStepIndex((prev) => (prev + 1) % states.length)}
            className="px-2.5 py-1 rounded bg-background hover:bg-border/50 border border-border text-text transition"
          >
            Step
          </button>
          <button
            onClick={() => { setStepIndex(0); setIsPlaying(true); }}
            className="p-1 rounded bg-background hover:bg-border/50 border border-border text-muted hover:text-text transition"
            title="Reset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Arrival Sequence Stream Pill */}
      <div>
        <div className="text-[11px] font-mono text-muted mb-1.5 flex items-center justify-between">
          <span>Arrival Stream: 1 → 3 → 7 → 2 → 6 → 4 → 5</span>
          <span className="text-primary font-bold">Step {stepIndex} / {states.length - 1}</span>
        </div>
        <div className="flex items-center gap-2 p-2.5 bg-background border border-border rounded-lg overflow-x-auto">
          {SEQUENCE.map((num, idx) => {
            const hasArrived = stepIndex > idx;
            const isCurrentlyArriving = stepIndex === idx + 1;
            return (
              <motion.div
                key={num}
                animate={{
                  scale: isCurrentlyArriving ? 1.15 : 1,
                  backgroundColor: isCurrentlyArriving ? '#246B5A' : hasArrived ? '#38866C' : '#FFFFFF',
                  color: isCurrentlyArriving || hasArrived ? '#FFFFFF' : '#26332F'
                }}
                className={`w-8 h-8 rounded flex items-center justify-center font-mono text-xs font-bold border transition ${
                  hasArrived ? 'border-received shadow-xs' : 'border-border text-muted'
                }`}
              >
                {num}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Received Intervals Visualization */}
      <div className="space-y-3">
        <div>
          <div className="text-[11px] font-mono text-received uppercase font-bold tracking-wider mb-1.5 flex items-center justify-between">
            <span>RECEIVED CONSECUTIVE RANGES</span>
            <span className="font-mono text-muted text-[10px]">{current.intervals.length} Disjoint Intervals</span>
          </div>

          <div className="p-3.5 bg-background border border-border rounded-lg min-h-16 flex items-center gap-2.5 flex-wrap">
            <AnimatePresence mode="popLayout">
              {current.intervals.length === 0 ? (
                <span className="text-xs font-mono text-muted">Awaiting first parcel arrival...</span>
              ) : (
                current.intervals.map((iv) => (
                  <motion.div
                    key={`${iv.start}-${iv.end}`}
                    layout
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    className="px-3 py-1.5 bg-surface border border-received/40 rounded font-mono text-xs font-bold text-received shadow-sm flex items-center gap-2"
                  >
                    <span>[{iv.start} ━━━ {iv.end}]</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-received/10 rounded-full font-sans font-medium">
                      {iv.end - iv.start + 1}
                    </span>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Missing Gaps */}
        <div>
          <div className="text-[11px] font-mono text-missing uppercase font-bold tracking-wider mb-1.5 flex items-center justify-between">
            <span>MISSING BROKEN RANGES</span>
            <span className="font-mono text-muted text-[10px]">{current.gaps.length} Gaps Remaining</span>
          </div>

          <div className="p-3 bg-missing/5 border border-dashed border-missing/30 rounded-lg min-h-12 flex items-center gap-2 flex-wrap">
            {current.gaps.length === 0 ? (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs font-mono text-received font-bold flex items-center gap-1.5"
              >
                ✓ All numbers [1—7] fully reconciled into a single unbroken continuous interval!
              </motion.span>
            ) : (
              current.gaps.map((g) => (
                <div
                  key={`gap-${g.start}-${g.end}`}
                  className="px-2.5 py-1 bg-missing/10 border border-missing/40 rounded font-mono text-xs font-medium text-missing flex items-center gap-1.5"
                >
                  <span>[{g.start} ━ {g.end}]</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Operation Status Card */}
      <div className="p-3 bg-primary-light/40 border border-primary/20 rounded-lg font-mono text-xs text-primary-dark flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent" />
          <span>Active State: <strong>{current.op}</strong></span>
        </div>
        {current.incomingId && (
          <span className="px-2 py-0.5 rounded bg-primary text-white font-bold text-[10px]">
            + Package #{current.incomingId}
          </span>
        )}
      </div>
    </div>
  );
};
