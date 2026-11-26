import React, { useState, useEffect } from 'react';
import type { AVLNodeSnapshot } from '../services/warehouseApi';
import { X, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface AvlTreeSvgProps {
  nodes: AVLNodeSnapshot[];
  highlightId?: number;
  searchPath?: number[];
  rotationType?: string;
}

export const AvlTreeSvg: React.FC<AvlTreeSvgProps> = ({
  nodes,
  highlightId,
  searchPath = [],
  rotationType
}) => {
  const [selectedNode, setSelectedNode] = useState<AVLNodeSnapshot | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(searchPath.length > 0 ? searchPath.length - 1 : 0);
  const [speed, setSpeed] = useState<number>(1000); // ms per step
  const [scale, setScale] = useState(1);

  // Auto-play stepper through traversal search path
  useEffect(() => {
    if (!isPlaying || searchPath.length === 0) return;
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= searchPath.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [isPlaying, searchPath, speed]);

  if (!nodes || nodes.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center font-mono text-xs text-muted border border-dashed border-border rounded-lg bg-surface">
        AVL tree is empty. Add package IDs to generate tree nodes.
      </div>
    );
  }

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
      assignPositions(n.left_id, x - spread, y + 70, spread * 0.52);
    }
    if (n.right_id !== -1) {
      assignPositions(n.right_id, x + spread, y + 70, spread * 0.52);
    }
  };

  const initialSpread = Math.min(240, Math.max(120, nodes.length * 35));
  assignPositions(root.node_id, 340, 48, initialSpread);

  // Visible step subset of the search path
  const activePathStep = searchPath.slice(0, currentStep + 1);

  // Render edges
  const lines: React.ReactNode[] = [];
  nodes.forEach((n) => {
    const parentPos = coords.get(n.node_id);
    if (!parentPos) return;

    if (n.left_id !== -1 && coords.has(n.left_id)) {
      const childPos = coords.get(n.left_id)!;
      const isPathEdge =
        activePathStep.includes(n.node_id) && activePathStep.includes(n.left_id);
      lines.push(
        <line
          key={`edge-${n.node_id}-${n.left_id}`}
          x1={parentPos.x}
          y1={parentPos.y}
          x2={childPos.x}
          y2={childPos.y}
          stroke={isPathEdge ? '#246B5A' : '#D1D7CE'}
          strokeWidth={isPathEdge ? '3' : '2'}
          strokeDasharray={isPathEdge ? '4 2' : undefined}
          className="transition-all duration-300"
        />
      );
    }

    if (n.right_id !== -1 && coords.has(n.right_id)) {
      const childPos = coords.get(n.right_id)!;
      const isPathEdge =
        activePathStep.includes(n.node_id) && activePathStep.includes(n.right_id);
      lines.push(
        <line
          key={`edge-${n.node_id}-${n.right_id}`}
          x1={parentPos.x}
          y1={parentPos.y}
          x2={childPos.x}
          y2={childPos.y}
          stroke={isPathEdge ? '#246B5A' : '#D1D7CE'}
          strokeWidth={isPathEdge ? '3' : '2'}
          strokeDasharray={isPathEdge ? '4 2' : undefined}
          className="transition-all duration-300"
        />
      );
    }
  });

  return (
    <div className="relative bg-surface border border-border rounded-xl p-4 shadow-sm space-y-3">
      {/* Interactive Animation Control Bar */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-border/80 text-xs font-mono gap-3">
        {/* Playback Controls */}
        <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg p-1">
          <button
            onClick={() => {
              if (currentStep >= searchPath.length - 1) setCurrentStep(0);
              setIsPlaying(!isPlaying);
            }}
            disabled={searchPath.length <= 1}
            className="p-1.5 rounded hover:bg-surface text-text disabled:opacity-40 transition"
            title={isPlaying ? 'Pause Traversal' : 'Play Traversal'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep((p) => Math.max(0, p - 1));
            }}
            disabled={currentStep === 0}
            className="p-1.5 rounded hover:bg-surface text-text disabled:opacity-40 transition"
            title="Step Backward"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep((p) => Math.min(searchPath.length - 1, p + 1));
            }}
            disabled={currentStep >= searchPath.length - 1}
            className="p-1.5 rounded hover:bg-surface text-text disabled:opacity-40 transition"
            title="Step Forward"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep(0);
            }}
            className="p-1.5 rounded hover:bg-surface text-text transition"
            title="Replay Traversal"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <span className="text-[10px] text-muted px-1.5 border-l border-border">
            Step {searchPath.length > 0 ? currentStep + 1 : 1}/{Math.max(1, searchPath.length)}
          </span>
        </div>

        {/* Speed Selector & Zoom */}
        <div className="flex items-center gap-2">
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="bg-background border border-border px-2 py-1 rounded text-[11px] text-muted focus:outline-none"
          >
            <option value={1500}>0.7x Speed</option>
            <option value={1000}>1.0x Speed</option>
            <option value={500}>2.0x Speed</option>
          </select>

          <div className="flex items-center gap-1 bg-background border border-border rounded p-0.5">
            <button
              onClick={() => setScale((s) => Math.min(1.5, s + 0.1))}
              className="p-1 rounded hover:bg-surface text-muted hover:text-text"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setScale((s) => Math.max(0.7, s - 0.1))}
              className="p-1 rounded hover:bg-surface text-muted hover:text-text"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setScale(1)}
              className="p-1 rounded hover:bg-surface text-muted hover:text-text"
              title="Reset View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {rotationType && rotationType !== 'NONE' && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-accent/20 border border-accent/40 rounded text-accent font-bold animate-pulse">
            <span>Rebalanced:</span>
            <span>{rotationType} Rotation</span>
          </div>
        )}
      </div>

      {/* Traversal Step Indicator */}
      <div className="flex items-center gap-2 text-xs font-mono text-muted overflow-x-auto pb-1">
        <span>Active Search Path:</span>
        {searchPath && searchPath.length > 0 ? (
          <div className="flex items-center gap-1">
            {searchPath.map((nid, i) => (
              <React.Fragment key={i}>
                <span
                  className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                    i <= currentStep
                      ? 'bg-primary text-white scale-105 shadow-xs'
                      : 'bg-border/60 text-muted'
                  }`}
                >
                  N{nid}
                </span>
                {i < searchPath.length - 1 && <span>→</span>}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <span className="italic">Balanced root on idle</span>
        )}
      </div>

      {/* SVG Canvas with Pan/Scale */}
      <div className="w-full overflow-x-auto overflow-y-hidden py-2">
        <svg
          width={680 * scale}
          height={270 * scale}
          viewBox="0 0 680 270"
          className="mx-auto block transition-all duration-300"
        >
          {lines}
          {nodes.map((n) => {
            const pos = coords.get(n.node_id) || { x: 340, y: 135 };
            const isHighlighted =
              highlightId !== undefined && highlightId >= n.start && highlightId <= n.end;
            const isInActiveStep = activePathStep.includes(n.node_id);
            const isSelected = selectedNode?.node_id === n.node_id;

            return (
              <g
                key={n.node_id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => setSelectedNode(n)}
                className="cursor-pointer group"
              >
                {/* Outer boundary */}
                <rect
                  x="-48"
                  y="-22"
                  width="96"
                  height="44"
                  rx="6"
                  className={`transition-all duration-300 ${
                    isSelected
                      ? 'fill-surface stroke-primary stroke-[3px] shadow-lg'
                      : isHighlighted
                      ? 'fill-received stroke-primary stroke-2'
                      : isInActiveStep
                      ? 'fill-primary-light/50 stroke-primary stroke-2'
                      : 'fill-background stroke-border hover:stroke-muted stroke-1'
                  }`}
                />

                {/* Node interval text */}
                <text
                  textAnchor="middle"
                  y="-2"
                  className={`text-[11px] font-mono font-bold select-none transition-colors ${
                    isHighlighted ? 'fill-white' : 'fill-text'
                  }`}
                >
                  [{n.start}━{n.end}]
                </text>

                {/* Height & BF subscript */}
                <text
                  textAnchor="middle"
                  y="13"
                  className={`text-[9px] font-mono select-none ${
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

      {/* Interactive Node Inspector Drawer */}
      {selectedNode && (
        <div className="p-4 bg-background border border-primary/30 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200 font-mono text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-text text-sm">Node #{selectedNode.node_id} Inspector</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-received/15 text-received font-semibold">
                Range: [{selectedNode.start} ... {selectedNode.end}]
              </span>
            </div>
            <p className="text-muted text-[11px]">
              Capacity: {selectedNode.end - selectedNode.start + 1} IDs | Subtree Height: {selectedNode.height} | Balance Factor: {selectedNode.balance_factor}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <span className="text-muted block text-[10px]">PARENT</span>
              <span className="font-bold text-text">{selectedNode.parent_id === -1 ? 'None (Root)' : `Node #${selectedNode.parent_id}`}</span>
            </div>
            <div>
              <span className="text-muted block text-[10px]">LEFT</span>
              <span className="font-bold text-text">{selectedNode.left_id === -1 ? 'None' : `Node #${selectedNode.left_id}`}</span>
            </div>
            <div>
              <span className="text-muted block text-[10px]">RIGHT</span>
              <span className="font-bold text-text">{selectedNode.right_id === -1 ? 'None' : `Node #${selectedNode.right_id}`}</span>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 hover:bg-border rounded text-muted hover:text-text transition ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
