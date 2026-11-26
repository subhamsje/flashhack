import React from 'react';
import { BookOpen, GitBranch, Cpu, Check, Layers } from 'lucide-react';

export const AlgorithmPage: React.FC = () => {
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

      {/* 1. Why AVL Tree */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold text-text">1. Why an AVL Tree?</h2>
        <p className="text-sm text-muted leading-relaxed">
          The problem domain is <strong>Balanced Searching and Ordered Indexing</strong>. An AVL (Adelson-Velsky and Landis) tree is a strictly height-balanced binary search tree where the heights of the two child subtrees of any node differ by at most one:
        </p>
        <div className="p-3 bg-surface border border-border rounded font-mono text-xs text-text text-center">
          |height(left) - height(right)| &le; 1
        </div>
        <p className="text-sm text-muted leading-relaxed">
          This strict invariant guarantees that tree height is bounded by approximately 1.44 &times; log2(k). Therefore, finding containing intervals or immediate predecessors and successors executes in guaranteed O(log k) worst-case time without risk of linear degradation.
        </p>
      </section>

      {/* 2. Why Intervals Instead of Individual IDs? */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold text-text">2. Why Store Intervals Instead of Individual IDs?</h2>
        <p className="text-sm text-muted leading-relaxed">
          Package IDs are non-negative and can range from 0 up to 10^9. Allocating a direct array or hash map for 10^9 values is extremely inefficient:
        </p>
        <div className="grid sm:grid-cols-2 gap-4 font-mono text-xs">
          <div className="p-4 bg-surface border border-border rounded-lg">
            <span className="text-missing font-bold block mb-1">Flat Array Approach:</span>
            <span>10^9 &times; 4 bytes &approx; <strong>4.0 GB</strong> of memory.</span>
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

      {/* 3. Four Interval Insertion Cases */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-semibold text-text">3. The Four Insertion Cases</h2>
        <div className="space-y-3 font-mono text-xs">
          <div className="p-4 bg-surface border border-border rounded-lg space-y-1">
            <div className="font-bold text-text">Case 1: Isolated ID (Creation)</div>
            <div className="text-muted">No adjacent predecessor or successor exists. A new node [x, x] is inserted into the AVL tree.</div>
          </div>
          <div className="p-4 bg-surface border border-border rounded-lg space-y-1">
            <div className="font-bold text-text">Case 2: Extend Predecessor (Right Extension)</div>
            <div className="text-muted">Incoming ID x satisfies pred.end + 1 == x. Updates pred.end = x. Tree structure remains unchanged.</div>
          </div>
          <div className="p-4 bg-surface border border-border rounded-lg space-y-1">
            <div className="font-bold text-text">Case 3: Extend Successor (Left Extension)</div>
            <div className="text-muted">Incoming ID x satisfies succ.start - 1 == x. Re-inserts interval as [x, succ.end] maintaining BST ordering.</div>
          </div>
          <div className="p-4 bg-surface border border-border rounded-lg space-y-1">
            <div className="font-bold text-primary">Case 4: Bridge Merge (Fusion)</div>
            <div className="text-muted">ID x satisfies pred.end + 1 == x AND succ.start - 1 == x. Extends predecessor to succ.end, removes successor node from tree, and executes AVL rebalancing. Memory is reclaimed immediately.</div>
          </div>
        </div>
      </section>

      {/* 4. Complexity Table */}
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
