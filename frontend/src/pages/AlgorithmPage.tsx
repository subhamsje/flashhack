import React, { useState } from 'react';
import { GitBranch, ShieldCheck, Zap } from 'lucide-react';
import { AvlRotationDemo } from '../components/AvlRotationDemo';

export const AlgorithmPage: React.FC = () => {
  const [activeCase, setActiveCase] = useState<1 | 2 | 3 | 4>(4);

  return (
    <div className="space-y-12 max-w-4xl mx-auto py-8 px-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <span className="text-xs font-mono uppercase tracking-widest text-primary font-semibold">Technical Reference</span>
        <h1 className="font-serif text-3xl font-bold text-text mt-1">About the Algorithm</h1>
        <p className="text-sm text-muted mt-1">
          Theoretical foundation, memory efficiency analysis, and complexity proofs for the Live Arrival Index.
        </p>
      </div>

      {/* 1. Why AVL Tree: Unbalanced BST vs AVL */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-text">1. Why an AVL Tree?</h2>
          <span className="text-xs font-mono text-primary font-bold">Strict |height(L) - height(R)| &le; 1</span>
        </div>
        <p className="text-sm text-muted leading-relaxed">
          The problem domain is <strong>Balanced Searching and Ordered Indexing</strong>. An AVL (Adelson-Velsky and Landis) tree is a strictly height-balanced binary search tree. Contrast the degenerate linear degradation of a standard naive BST with the strictly bounded AVL tree:
        </p>

        <div className="grid md:grid-cols-2 gap-4 font-mono text-xs">
          {/* Degenerate BST */}
          <div className="p-4 bg-surface border border-missing/30 rounded-xl space-y-2">
            <span className="text-missing font-bold block flex items-center gap-1.5">
              Naive BST (Sequential Arrivals)
            </span>
            <p className="text-muted leading-relaxed text-[11px]">
              Sequential arrivals [1, 2, 3, 4] degenerate into a linked list with worst-case search time of:
            </p>
            <div className="p-2 bg-background border border-border rounded text-center font-bold text-missing">
              Worst-case Time: O(k)
            </div>
            <p className="text-[10px] text-muted">A warehouse under high volume experiences catastrophic latency spikes.</p>
          </div>

          {/* Balanced AVL */}
          <div className="p-4 bg-surface border border-primary/30 rounded-xl space-y-2">
            <span className="text-received font-bold block flex items-center gap-1.5">
              Balanced AVL Tree (Flashhack C Engine)
            </span>
            <p className="text-muted leading-relaxed text-[11px]">
              Every insertion and deletion executes O(1) rotations, maintaining maximum height:
            </p>
            <div className="p-2 bg-background border border-border rounded text-center font-bold text-received">
              Guaranteed Height: &le; 1.44 &times; log2(k) &rarr; O(log k)
            </div>
            <p className="text-[10px] text-muted">Predictable sub-millisecond search and merge regardless of arrival ordering.</p>
          </div>
        </div>
      </section>

      {/* 2. Interactive AVL Rotations */}
      <section className="space-y-4">
        <AvlRotationDemo />
      </section>

      {/* 3. Why Intervals Instead of Individual IDs? */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-semibold text-text">2. Why Store Intervals Instead of Individual IDs?</h2>
        <p className="text-sm text-muted leading-relaxed">
          Package IDs are non-negative and can range from 0 up to 10^9. Allocating a direct array or hash map for 10^9 values is extremely inefficient:
        </p>
        <div className="grid sm:grid-cols-2 gap-4 font-mono text-xs">
          <div className="p-4 bg-surface border border-border rounded-lg">
            <span className="text-missing font-bold block mb-1">Flat Array Approach:</span>
            <span>10^9 &times; 4 bytes &asymp; <strong>4.0 GB</strong> of memory.</span>
          </div>
          <div className="p-4 bg-surface border border-border rounded-lg">
            <span className="text-received font-bold block mb-1">AVL Interval Approach:</span>
            <span>Only k active disjoint intervals stored: <strong>O(k) memory</strong> (often just a few kilobytes).</span>
          </div>
        </div>
        <p className="text-sm text-muted leading-relaxed">
          When consecutive packages arrive, they merge into a single node. For example, 10,000 consecutive arrivals require exactly 1 node (40 bytes) instead of 40,000 bytes.
        </p>
      </section>

      {/* 4. Four Interval Insertion Cases Interactive Selector */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-text">3. The Four Insertion Cases</h2>
          <div className="flex gap-1">
            {([1, 2, 3, 4] as (1 | 2 | 3 | 4)[]).map((c) => (
              <button
                key={c}
                onClick={() => setActiveCase(c)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition ${
                  activeCase === c ? 'bg-primary text-white' : 'bg-surface border border-border text-muted hover:text-text'
                }`}
              >
                Case {c}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Case Card */}
        <div className="p-6 bg-surface border border-border rounded-xl space-y-3 font-mono text-xs">
          {activeCase === 1 && (
            <div className="space-y-2">
              <span className="font-bold text-text text-sm">Case 1: Isolated ID (Creation)</span>
              <p className="text-muted leading-relaxed">
                Neither pred nor succ is adjacent (pred.end + 1 &lt; x and x + 1 &lt; succ.start).
              </p>
              <div className="p-3 bg-background border border-border rounded text-center">
                Before: <span className="text-received font-bold">[1, 3]</span> &nbsp; ... &nbsp; <span className="text-received font-bold">[10, 15]</span> &nbsp; (Incoming: <span className="text-primary font-bold">6</span>) &rarr; After: <span className="text-received font-bold">[1, 3]</span>, <span className="text-accent font-bold">[6, 6]</span>, <span className="text-received font-bold">[10, 15]</span>
              </div>
            </div>
          )}

          {activeCase === 2 && (
            <div className="space-y-2">
              <span className="font-bold text-text text-sm">Case 2: Extend Predecessor (Right Extension)</span>
              <p className="text-muted leading-relaxed">
                Incoming ID x satisfies pred.end + 1 == x, while x + 1 &lt; succ.start.
              </p>
              <div className="p-3 bg-background border border-border rounded text-center">
                Before: <span className="text-received font-bold">[1, 3]</span> &nbsp; (Incoming: <span className="text-primary font-bold">4</span>) &rarr; After: <span className="text-received font-bold">[1, 4]</span>
              </div>
            </div>
          )}

          {activeCase === 3 && (
            <div className="space-y-2">
              <span className="font-bold text-text text-sm">Case 3: Extend Successor (Left Extension)</span>
              <p className="text-muted leading-relaxed">
                Incoming ID x satisfies succ.start - 1 == x, while pred.end + 1 &lt; x.
              </p>
              <div className="p-3 bg-background border border-border rounded text-center">
                Before: <span className="text-received font-bold">[6, 7]</span> &nbsp; (Incoming: <span className="text-primary font-bold">5</span>) &rarr; After: <span className="text-received font-bold">[5, 7]</span>
              </div>
            </div>
          )}

          {activeCase === 4 && (
            <div className="space-y-2">
              <span className="font-bold text-primary text-sm">Case 4: Bridge Merge (Fusion)</span>
              <p className="text-muted leading-relaxed">
                ID x satisfies pred.end + 1 == x AND succ.start - 1 == x. Extends predecessor to succ.end and removes successor node from tree in O(log k).
              </p>
              <div className="p-3 bg-background border border-border rounded text-center">
                Before: <span className="text-received font-bold">[1, 3]</span> and <span className="text-received font-bold">[5, 7]</span> &nbsp; (Incoming: <span className="text-primary font-bold">4</span>) &rarr; After: <span className="text-received font-bold">[1, 7]</span> (1 node reclaimed)
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5. Algorithmic Complexity Table */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-semibold text-text">4. Algorithmic Complexity</h2>
        <div className="overflow-x-auto bg-surface border border-border rounded-xl shadow-sm">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="py-3 px-4 font-semibold">Operation</th>
                <th className="py-3 px-4 font-semibold">Expected Complexity</th>
                <th className="py-3 px-4 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y border-border">
              <tr>
                <td className="py-3 px-4 font-bold text-text">Search interval</td>
                <td className="py-3 px-4 text-primary font-bold">O(log k)</td>
                <td className="py-3 px-4 text-muted">Binary search down balanced AVL tree</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-text">Insert and merge</td>
                <td className="py-3 px-4 text-primary font-bold">O(log k)</td>
                <td className="py-3 px-4 text-muted">Includes predecessor/successor lookup and boundary update</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-text">AVL balancing</td>
                <td className="py-3 px-4 text-primary font-bold">O(log k) worst case</td>
                <td className="py-3 px-4 text-muted">At most two rotations for insertion, up to log k for deletion</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-text">Range reporting</td>
                <td className="py-3 px-4 text-primary font-bold">O(log k + r)</td>
                <td className="py-3 px-4 text-muted">Subtree-pruned in-order traversal of r overlapping intervals</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-text">Memory Space</td>
                <td className="py-3 px-4 text-primary font-bold">O(k)</td>
                <td className="py-3 px-4 text-muted">One node per disjoint interval (k &le; 50,000)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
