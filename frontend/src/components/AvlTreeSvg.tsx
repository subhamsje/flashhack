import React from 'react';
import type { AVLNodeSnapshot } from '../services/warehouseApi';

interface AvlTreeSvgProps {
  nodes: AVLNodeSnapshot[];
  highlightId?: number;
}

export const AvlTreeSvg: React.FC<AvlTreeSvgProps> = ({ nodes, highlightId }) => {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center font-mono text-xs text-muted border border-dashed border-border rounded-lg">
        AVL tree is empty. Add package IDs to generate tree nodes.
      </div>
    );
  }

  // Calculate layout coordinates for binary tree nodes
  const nodeMap = new Map<number, AVLNodeSnapshot>();
  nodes.forEach((n) => nodeMap.set(n.node_id, n));

  const root = nodes.find((n) => n.parent_id === -1) || nodes[0];

  interface Coords {
    x: number;
    y: number;
  }
  const coords = new Map<number, Coords>();

  const assignPositions = (nodeId: number, x: number, y: number, spread: number) => {
    if (nodeId === -1 || !nodeMap.has(nodeId)) return;
    coords.set(nodeId, { x, y });

    const n = nodeMap.get(nodeId)!;
    if (n.left_id !== -1) {
      assignPositions(n.left_id, x - spread, y + 70, spread * 0.55);
    }
    if (n.right_id !== -1) {
      assignPositions(n.right_id, x + spread, y + 70, spread * 0.55);
    }
  };

  const initialSpread = Math.min(220, nodes.length * 35 + 80);
  assignPositions(root.node_id, 320, 45, initialSpread);

  // Render edges
  const lines: React.ReactNode[] = [];
  nodes.forEach((n) => {
    const parentPos = coords.get(n.node_id);
    if (!parentPos) return;

    if (n.left_id !== -1 && coords.has(n.left_id)) {
      const childPos = coords.get(n.left_id)!;
      lines.push(
        <line
          key={`edge-${n.node_id}-${n.left_id}`}
          x1={parentPos.x}
          y1={parentPos.y}
          x2={childPos.x}
          y2={childPos.y}
          stroke="#E2E5DF"
          strokeWidth="2"
        />
      );
    }

    if (n.right_id !== -1 && coords.has(n.right_id)) {
      const childPos = coords.get(n.right_id)!;
      lines.push(
        <line
          key={`edge-${n.node_id}-${n.right_id}`}
          x1={parentPos.x}
          y1={parentPos.y}
          x2={childPos.x}
          y2={childPos.y}
          stroke="#E2E5DF"
          strokeWidth="2"
        />
      );
    }
  });

  return (
    <div className="w-full overflow-x-auto bg-surface border border-border rounded-xl p-4 shadow-sm">
      <svg width="640" height="260" viewBox="0 0 640 260" className="mx-auto block">
        {lines}
        {nodes.map((n) => {
          const pos = coords.get(n.node_id) || { x: 320, y: 130 };
          const isHighlighted = highlightId !== undefined && (highlightId >= n.start && highlightId <= n.end);

          return (
            <g key={n.node_id} transform={`translate(${pos.x}, ${pos.y})`}>
              {/* Outer boundary */}
              <rect
                x="-45"
                y="-20"
                width="90"
                height="40"
                rx="6"
                className={`transition-colors duration-300 ${
                  isHighlighted
                    ? 'fill-received stroke-primary stroke-2'
                    : 'fill-background stroke-border stroke-1'
                }`}
              />

              {/* Node interval text */}
              <text
                textAnchor="middle"
                y="-2"
                className={`text-[11px] font-mono font-bold ${
                  isHighlighted ? 'fill-white' : 'fill-text'
                }`}
              >
                [{n.start}━{n.end}]
              </text>

              {/* Height & BF subscript */}
              <text
                textAnchor="middle"
                y="12"
                className={`text-[9px] font-mono ${
                  isHighlighted ? 'fill-white/80' : 'fill-muted'
                }`}
              >
                h:{n.height} bf:{n.balance_factor}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
