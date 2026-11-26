import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, ArrowRight, Zap, Check } from 'lucide-react';

export const BridgeMergeDemo: React.FC = () => {
  const [step, setStep] = useState<0 | 1>(0);

  // Step 0: [1,3], [5,6], [8,10]
  // Step 1: Incoming 7 -> [1,3], [5,10]
  const intervalsStep0 = [
    { start: 1, end: 3 },
    { start: 5, end: 6 },
    { start: 8, end: 10 }
  ];

  const intervalsStep1 = [
    { start: 1, end: 3 },
    { start: 5, end: 10 }
  ];

  return (
    <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-muted">Interactive Demonstration</span>
          <h4 className="font-serif text-lg font-semibold text-text">Live Bridge-Merge Execution</h4>
        </div>
        <button
          onClick={() => setStep(step === 0 ? 1 : 0)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded text-xs font-mono font-medium transition"
        >
          {step === 0 ? (
            <>Insert ID 7 <ArrowRight className="w-3.5 h-3.5" /></>
          ) : (
            <><RotateCcw className="w-3.5 h-3.5" /> Reset to Initial</>
          )}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-xs font-mono text-muted mb-1.5 flex items-center justify-between">
            <span>State: {step === 0 ? 'Before Arrival of ID 7' : 'After Bridge Merge'}</span>
            <span className="text-primary font-semibold">{step === 0 ? '3 Disjoint Ranges' : '2 Disjoint Ranges'}</span>
          </div>

          <div className="p-4 bg-background border border-border rounded-lg min-h-16 flex items-center gap-3 flex-wrap">
            <AnimatePresence mode="popLayout">
              {(step === 0 ? intervalsStep0 : intervalsStep1).map((iv) => (
                <motion.div
                  key={`${iv.start}-${iv.end}`}
                  layout
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className={`px-3 py-1.5 rounded font-mono text-xs font-semibold flex items-center gap-1.5 border shadow-sm ${
                    step === 1 && iv.start === 5 && iv.end === 10
                      ? 'bg-received text-white border-received'
                      : 'bg-surface text-text border-border'
                  }`}
                >
                  <span>[{iv.start} ━━━ {iv.end}]</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-black/10 rounded-full font-sans">
                    {iv.end - iv.start + 1}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Step Explanation */}
        <div className="p-3 bg-primary-light/40 border border-primary/20 rounded-lg text-xs font-mono text-primary-dark space-y-1">
          {step === 0 ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
              <span>Initial intervals: <strong>[1,3]</strong>, <strong>[5,6]</strong>, and <strong>[8,10]</strong>. Click button above to arrive ID 7.</span>
            </div>
          ) : (
            <div>
              <div className="font-semibold text-primary">✓ BRIDGE OPERATION EXECUTED:</div>
              <div className="text-muted mt-0.5">
                ID 7 touched predecessor [5,6] (end + 1 = 7) and successor [8,10] (start - 1 = 7).
                Both intervals were joined into <strong>[5,10]</strong> and the successor node was reclaimed from the AVL tree.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
