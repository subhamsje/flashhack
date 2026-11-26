import React, { useState, useEffect } from 'react';
import { GitBranch, RefreshCw, Layers, ShieldCheck, Info } from 'lucide-react';
import { warehouseApi, type TreeResponse, type AVLNodeSnapshot } from '../../services/warehouseApi';

export const AvlTreeExplorerWorkspace: React.FC = () => {
  const [treeData, setTreeData] = useState<TreeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<AVLNodeSnapshot | null>(null);

  const fetchTree = async () => {
    setLoading(true);
    const res = await warehouseApi.getTree();
    setTreeData(res);
    if (res.nodes.length > 0) {
      setSelectedNode(res.nodes[0]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTree();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-primary font-semibold">Authoritative Data Structure</span>
          <h1 className="font-serif text-3xl font-bold text-ink mt-1">AVL Interval Tree Explorer</h1>
          <p className="text-sm text-ink-muted mt-1">
            Visual inspection of the in-memory C self-balancing binary search tree. Each node represents an inclusive range [start, end].
          </p>
        </div>
        <button
          onClick={fetchTree}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono text-ink bg-surface border border-border hover:bg-surface-muted rounded-lg transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Tree
        </button>
      </div>

      {/* Tree Visualizer & Hierarchy */}
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Node Tree View */}
        <div className="lg:col-span-8 bg-surface border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="font-serif text-lg font-semibold text-ink flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-primary" /> Active Nodes ({treeData?.node_count || 0})
            </h2>
            <div className="flex items-center gap-4 text-xs font-mono text-ink-muted">
              <span>Max Depth: <strong>{treeData?.max_depth || 0}</strong></span>
              <span>Balance Invariant: <strong className="text-primary font-semibold">|BF| ≤ 1</strong></span>
            </div>
          </div>

          {treeData?.nodes.length === 0 ? (
            <div className="text-center py-12 text-ink-muted font-mono text-sm border border-dashed border-border rounded-lg">
              AVL tree is currently empty. Add packages in the Live Arrivals workspace to populate nodes.
            </div>
          ) : (
            <div className="space-y-3">
              {treeData?.nodes.map((node) => (
                <div
                  key={node.node_id}
                  onClick={() => setSelectedNode(node)}
                  className={`p-4 rounded-lg border transition cursor-pointer flex items-center justify-between ${
                    selectedNode?.node_id === node.node_id
                      ? 'bg-primary/5 border-primary shadow-sm'
                      : 'bg-background border-border hover:border-primary/40'
                  }`}
                  style={{ marginLeft: `${node.depth * 24}px` }}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono text-xs font-bold">
                      {node.depth === 0 ? 'R' : node.depth}
                    </span>
                    <div>
                      <div className="font-mono text-sm font-bold text-ink">
                        [{node.start} — {node.end}]
                      </div>
                      <div className="text-[11px] font-mono text-ink-muted">
                        Height: {node.height} | Balance Factor: {node.balance_factor}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="px-2 py-0.5 rounded bg-surface border border-border text-ink-muted">
                      ID #{node.node_id}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Node Inspector */}
        <div className="lg:col-span-4 bg-surface border border-border rounded-xl p-6 shadow-sm space-y-6">
          <h2 className="font-serif text-lg font-semibold text-ink flex items-center gap-2">
            <Info className="w-5 h-5 text-accent" /> Node Inspector
          </h2>

          {selectedNode ? (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 bg-background border border-border rounded-lg space-y-2">
                <span className="text-xs uppercase font-bold text-primary block">Interval Bounds</span>
                <div className="text-xl font-bold text-ink">[{selectedNode.start} — {selectedNode.end}]</div>
                <div className="text-ink-muted">Span size: {selectedNode.end - selectedNode.start + 1} packages</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-background border border-border rounded-lg">
                  <span className="text-ink-muted block">Height</span>
                  <span className="text-base font-bold text-ink">{selectedNode.height}</span>
                </div>
                <div className="p-3 bg-background border border-border rounded-lg">
                  <span className="text-ink-muted block">Balance Factor</span>
                  <span className="text-base font-bold text-primary">{selectedNode.balance_factor}</span>
                </div>
                <div className="p-3 bg-background border border-border rounded-lg">
                  <span className="text-ink-muted block">Tree Depth</span>
                  <span className="text-base font-bold text-ink">{selectedNode.depth}</span>
                </div>
                <div className="p-3 bg-background border border-border rounded-lg">
                  <span className="text-ink-muted block">Parent Node ID</span>
                  <span className="text-base font-bold text-ink">
                    {selectedNode.parent_id === -1 ? 'None (Root)' : `#${selectedNode.parent_id}`}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-surface-muted rounded-lg text-ink-muted text-[11px] leading-relaxed">
                AVL rotations (Left, Right, Left-Right, Right-Left) execute dynamically to guarantee height balance and strictly logarithmic O(log K) bounds.
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-ink-muted font-mono text-xs">
              Select a node in the tree hierarchy to inspect its balancing metadata.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
