import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, ArrowRight, Zap, Check, GitMerge } from 'lucide-react';

export const BridgeMergeDemo: React.FC = () => {
  const [step, setStep] = useState<0 | 1>(0);

  // Before: [1,3], [5,6], [8,10]
  // Incoming: 7 bridges [5,6] and [8,10] into [5,10]
  const intervalsStep0 = [
    { start: 1, end: 3, id: '1-3' },
    { start: 5, end: 6, id: '5-6' },
    { start: 8, end: 10, id: '8-10' }
  ];

  const intervalsStep1 = [
    { start: 1, end: 3, id: '1-3' },
    { start: 5, end: 10, id: '5-10' }
  ];

  return (
    <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between border-b border-border pb-3 gap-3">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-primary font-semibold flex items-center gap-1.5">
            <GitMerge className="w-3.5 h-3.5" /> Interactive Demonstration
          </span>
          <h4 className="font-serif text-lg font-semibold text-text">Live Bridge-Merge Execution</h4>
        </div>
        <button
          onClick={() => setStep(step === 0 ? 1 : 0)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary-dark text-white rounded text-xs font-mono font-medium transition shadow-xs"
        >
          {step === 0 ? (
            <>
              Ingest Connecting ID 7 <ArrowRight className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <RotateCcw className="w-3.5 h-3.5" /> Replay Bridge Merge
            </>
          )}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-xs font-mono text-muted mb-2 flex items-center justify-between">
            <span>
              Status: {step === 0 ? 'Before: Missing Gap [7]' : 'After: ID 7 Fuses [5,6] & [8,10]'}
            </span>
            <span className="text-primary font-bold">
              {step === 0 ? '3 Disjoint Ranges' : '2 Disjoint Ranges (1 Node Reclaimed)'}
            </span>
          </div>

          <div className="p-5 bg-background border border-border rounded-xl min-h-20 flex items-center gap-3 flex-wrap relative overflow-hidden">
            {/* Incoming ID 7 Particle Animation */}
            {step === 1 && (
              <motion.div
                initial={{ y: -30, opacity: 0, scale: 0.5 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, type: 'spring' }}
                className="absolute top-2 right-4 px-2 py-0.5 rounded bg-accent/20 border border-accent text-accent font-mono text-[10px] font-bold"
              >
                + Ingested Connecting ID 7
              </motion.div>
            )}

            <AnimatePresence mode="popLayout">
              {(step === 0 ? intervalsStep0 : intervalsStep1).map((iv) => (
                <motion.div
                  key={iv.id}
                  layout
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.85, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  className={`px-3.5 py-2 rounded-lg font-mono text-xs font-bold flex items-center gap-2 border shadow-xs ${
                    step === 1 && iv.start === 5
                      ? 'bg-received text-white border-primary ring-2 ring-primary/20'
                      : 'bg-surface text-text border-border'
                  }`}
                >
                  <span>[{iv.start} ━━━ {iv.end}]</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-sans font-medium ${
                      step === 1 && iv.start === 5 ? 'bg-white/20 text-white' : 'bg-border/60 text-muted'
                    }`}
                  >
                    {iv.end - iv.start + 1}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Algorithmic Step-by-Step Walkthrough */}
        <div className="p-4 bg-surface-muted/40 border border-border rounded-lg text-xs font-mono space-y-1.5">
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold">1. Predecessor Lookup:</span>
            <span className="text-muted">Detected predecessor [5, 6] where end + 1 == 7.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold">2. Successor Lookup:</span>
            <span className="text-muted">Detected successor [8, 10] where start - 1 == 7.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-received font-bold">3. Atomic Fusion:</span>
            <span className="text-text">
              Merged predecessor to encompass [5, 10]; deleted successor node [8, 10] in O(log k) time.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
