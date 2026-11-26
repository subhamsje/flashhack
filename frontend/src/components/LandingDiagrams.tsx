import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, Check, Cpu } from 'lucide-react';

export const AlgorithmLifecycleFlow: React.FC = () => {
  const steps = [
    { title: 'Package Arrives', desc: 'Arbitrary ID received' },
    { title: 'Search AVL Tree', desc: 'Binary search O(log k)' },
    { title: 'Check Neighbors', desc: 'Predecessor & successor' },
    { title: 'Extend / Bridge Merge', desc: 'Boundaries updated' },
    { title: 'Rebalance Tree', desc: 'Rotations if |BF| > 1' },
    { title: 'Updated Index', desc: 'Active intervals ready' }
  ];

  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % steps.length);
    }, 1800);
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h4 className="font-serif text-lg font-semibold text-text">Algorithmic Lifecycle Flow</h4>
        <span className="text-xs font-mono text-primary font-bold">Step {activeIdx + 1} of {steps.length}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {steps.map((st, i) => {
          const isCurrent = activeIdx === i;
          const isPast = activeIdx > i;
          return (
            <motion.div
              key={i}
              animate={{
                scale: isCurrent ? 1.05 : 1,
                borderColor: isCurrent ? '#246B5A' : '#E2E5DF',
                backgroundColor: isCurrent ? '#DDEBE4' : '#FFFFFF'
              }}
              className="p-3 rounded-lg border font-mono text-xs text-center flex flex-col justify-between transition-all"
            >
              <div className="text-[10px] text-muted font-bold">0{i + 1}</div>
              <div className={`font-bold mt-1 text-[11px] ${isCurrent ? 'text-primary' : 'text-text'}`}>
                {st.title}
              </div>
              <div className="text-[10px] text-muted mt-1">{st.desc}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export const SparseMemoryComparison: React.FC = () => {
  return (
    <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4">
      <div className="border-b border-border pb-3">
        <span className="text-xs font-mono uppercase tracking-wider text-muted font-semibold">Memory Scaling</span>
        <h4 className="font-serif text-lg font-semibold text-text">Sparse 10⁹ ID Space vs AVL Interval Tree</h4>
      </div>

      <div className="grid md:grid-cols-2 gap-6 font-mono text-xs">
        {/* Direct Array representation */}
        <div className="p-4 bg-background border border-border rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-missing">Direct Flat Array / Bitset</span>
            <span className="text-[10px] text-muted">10⁹ Address Space</span>
          </div>
          <div className="h-6 w-full bg-border/40 rounded flex items-center px-2 text-[10px] text-muted overflow-hidden relative">
            <div className="absolute inset-y-0 left-0 w-2 bg-missing" />
            <div className="absolute inset-y-0 left-[25%] w-2 bg-missing" />
            <div className="absolute inset-y-0 left-[50%] w-2 bg-missing" />
            <div className="absolute inset-y-0 right-0 w-2 bg-missing" />
            <span className="relative z-10 mx-auto font-sans font-semibold text-text">
              99.999% Unallocated Empty Memory Slots (Requires 4.0 GB)
            </span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed">
            Allocates an entry for every potential tracking number between 0 and 1,000,000,000.
          </p>
        </div>

        {/* Interval Tree representation */}
        <div className="p-4 bg-primary-light/30 border border-primary/20 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-primary">AVL Interval Tree</span>
            <span className="text-[10px] text-primary font-bold">O(k) Active Nodes</span>
          </div>
          <div className="h-6 w-full bg-surface border border-primary/30 rounded flex items-center justify-around px-2 text-[10px] text-primary font-bold">
            <span className="px-1.5 py-0.5 bg-received/10 rounded">[0, 42]</span>
            <span className="px-1.5 py-0.5 bg-received/10 rounded">[10⁶, 10⁶+5]</span>
            <span className="px-1.5 py-0.5 bg-received/10 rounded">[5×10⁸, 5×10⁸]</span>
          </div>
          <p className="text-[11px] text-primary-dark leading-relaxed">
            Stores only compact contiguous ranges. Allocates memory exclusively for active disjoint intervals (~32 bytes per interval).
          </p>
        </div>
      </div>
    </div>
  );
};
