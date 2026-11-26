import React, { useState } from 'react';
import { RotateCw, ArrowRight, Play, CheckCircle } from 'lucide-react';

type RotationMode = 'LL' | 'RR' | 'LR' | 'RL';

export const AvlRotationDemo: React.FC = () => {
  const [activeRotation, setActiveRotation] = useState<RotationMode>('LL');
  const [rotated, setRotated] = useState(false);

  const rotationData: Record<
    RotationMode,
    {
      title: string;
      condition: string;
      action: string;
      before: { nodes: { id: string; x: number; y: number }[]; edges: [string, string][] };
      after: { nodes: { id: string; x: number; y: number }[]; edges: [string, string][] };
    }
  > = {
    LL: {
      title: 'Left-Left (LL) Single Right Rotation',
      condition: 'Node Z is left-heavy (bf > +1) and new insertion occurs in left subtree of left child Y.',
      action: 'Execute right_rotate(Z). Child Y rises to root; Z becomes right child of Y.',
      before: {
        nodes: [
          { id: 'Z (bf=+2)', x: 180, y: 30 },
          { id: 'Y (bf=+1)', x: 110, y: 80 },
          { id: 'X (bf=0)', x: 50, y: 130 }
        ],
        edges: [['Z (bf=+2)', 'Y (bf=+1)'], ['Y (bf=+1)', 'X (bf=0)']]
      },
      after: {
        nodes: [
          { id: 'Y (bf=0)', x: 180, y: 30 },
          { id: 'X (bf=0)', x: 110, y: 85 },
          { id: 'Z (bf=0)', x: 250, y: 85 }
        ],
        edges: [['Y (bf=0)', 'X (bf=0)'], ['Y (bf=0)', 'Z (bf=0)']]
      }
    },
    RR: {
      title: 'Right-Right (RR) Single Left Rotation',
      condition: 'Node Z is right-heavy (bf < -1) and new insertion occurs in right subtree of right child Y.',
      action: 'Execute left_rotate(Z). Child Y rises to root; Z becomes left child of Y.',
      before: {
        nodes: [
          { id: 'Z (bf=-2)', x: 120, y: 30 },
          { id: 'Y (bf=-1)', x: 190, y: 80 },
          { id: 'X (bf=0)', x: 250, y: 130 }
        ],
        edges: [['Z (bf=-2)', 'Y (bf=-1)'], ['Y (bf=-1)', 'X (bf=0)']]
      },
      after: {
        nodes: [
          { id: 'Y (bf=0)', x: 180, y: 30 },
          { id: 'Z (bf=0)', x: 110, y: 85 },
          { id: 'X (bf=0)', x: 250, y: 85 }
        ],
        edges: [['Y (bf=0)', 'Z (bf=0)'], ['Y (bf=0)', 'X (bf=0)']]
      }
    },
    LR: {
      title: 'Left-Right (LR) Double Rotation',
      condition: 'Node Z is left-heavy (bf > +1) but child Y is right-heavy (bf = -1).',
      action: '1. left_rotate(Y) converts zigzag into straight chain. 2. right_rotate(Z) restores strict balance.',
      before: {
        nodes: [
          { id: 'Z (bf=+2)', x: 180, y: 30 },
          { id: 'Y (bf=-1)', x: 110, y: 80 },
          { id: 'X (bf=0)', x: 150, y: 130 }
        ],
        edges: [['Z (bf=+2)', 'Y (bf=-1)'], ['Y (bf=-1)', 'X (bf=0)']]
      },
      after: {
        nodes: [
          { id: 'X (bf=0)', x: 180, y: 30 },
          { id: 'Y (bf=0)', x: 110, y: 85 },
          { id: 'Z (bf=0)', x: 250, y: 85 }
        ],
        edges: [['X (bf=0)', 'Y (bf=0)'], ['X (bf=0)', 'Z (bf=0)']]
      }
    },
    RL: {
      title: 'Right-Left (RL) Double Rotation',
      condition: 'Node Z is right-heavy (bf < -1) but child Y is left-heavy (bf = +1).',
      action: '1. right_rotate(Y) converts zigzag into straight chain. 2. left_rotate(Z) restores strict balance.',
      before: {
        nodes: [
          { id: 'Z (bf=-2)', x: 120, y: 30 },
          { id: 'Y (bf=+1)', x: 190, y: 80 },
          { id: 'X (bf=0)', x: 150, y: 130 }
        ],
        edges: [['Z (bf=-2)', 'Y (bf=+1)'], ['Y (bf=+1)', 'X (bf=0)']]
      },
      after: {
        nodes: [
          { id: 'X (bf=0)', x: 180, y: 30 },
          { id: 'Z (bf=0)', x: 110, y: 85 },
          { id: 'Y (bf=0)', x: 250, y: 85 }
        ],
        edges: [['X (bf=0)', 'Z (bf=0)'], ['X (bf=0)', 'Y (bf=0)']]
      }
    }
  };

  const curr = rotationData[activeRotation];
  const activeTree = rotated ? curr.after : curr.before;

  const nodeMap = new Map(activeTree.nodes.map(n => [n.id, n]));

  return (
    <div className="bg-surface border border-border rounded-xl p-6 space-y-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h3 className="font-serif text-lg font-semibold text-text">Interactive AVL Rotations</h3>
          <p className="text-xs text-muted">Explore how self-balancing tree invariants are restored in O(1) time.</p>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-1.5 p-1 bg-background border border-border rounded-lg">
          {(['LL', 'RR', 'LR', 'RL'] as RotationMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setActiveRotation(mode);
                setRotated(false);
              }}
              className={`px-2.5 py-1 text-xs font-mono rounded font-semibold transition ${
                activeRotation === mode
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-muted hover:text-text'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Explanation Banner */}
      <div className="space-y-1.5 font-mono text-xs">
        <div className="font-bold text-text">{curr.title}</div>
        <p className="text-muted leading-relaxed">{curr.condition}</p>
        <p className="text-primary font-medium">{curr.action}</p>
      </div>

      {/* SVG Canvas and Rotation Trigger */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4 bg-background border border-border rounded-lg">
        <svg width="340" height="175" className="overflow-visible select-none">
          {/* Edges */}
          {activeTree.edges.map(([pId, cId], i) => {
            const p = nodeMap.get(pId);
            const c = nodeMap.get(cId);
            if (!p || !c) return null;
            return (
              <line
                key={i}
                x1={p.x}
                y1={p.y}
                x2={c.x}
                y2={c.y}
                stroke="#BFC6BA"
                strokeWidth="2"
                className="transition-all duration-500"
              />
            );
          })}

          {/* Nodes */}
          {activeTree.nodes.map((n) => (
            <g
              key={n.id}
              transform={`translate(${n.x}, ${n.y})`}
              className="transition-all duration-500"
            >
              <circle
                r="22"
                className={`transition-colors duration-500 ${
                  rotated
                    ? 'fill-received stroke-primary stroke-2'
                    : 'fill-surface stroke-missing stroke-2'
                }`}
              />
              <text
                textAnchor="middle"
                dy="4"
                className="text-[10px] font-mono font-bold fill-text"
              >
                {n.id.split(' ')[0]}
              </text>
            </g>
          ))}
        </svg>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => setRotated(!rotated)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded font-mono text-xs font-semibold shadow-xs transition"
          >
            <RotateCw className={`w-3.5 h-3.5 ${rotated ? 'rotate-180' : ''} transition-transform duration-300`} />
            {rotated ? 'Reset to Unbalanced' : 'Trigger Rebalance'}
          </button>
          <span className="text-[10px] font-mono text-muted text-center max-w-[140px]">
            {rotated ? 'Status: Balanced (|bf| <= 1)' : 'Status: Height violation (|bf| > 1)'}
          </span>
        </div>
      </div>
    </div>
  );
};
