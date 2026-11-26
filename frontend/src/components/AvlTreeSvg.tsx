import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { hierarchy, tree } from 'd3-hierarchy';
import type { AVLNodeSnapshot } from '../services/warehouseApi';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Info,
  GitBranch,
  ShieldAlert
} from 'lucide-react';

interface AvlTreeSvgProps {
  nodes: AVLNodeSnapshot[];
  highlightId?: number;
  searchPath?: number[];
  rotationType?: string;
  recentlyTouchedNodeIds?: number[];
}

interface HierarchyNodeData {
  snapshot: AVLNodeSnapshot;
  children?: HierarchyNodeData[];
}

export const AvlTreeSvg: React.FC<AvlTreeSvgProps> = ({
  nodes,
  highlightId,
  searchPath = [],
  rotationType = 'NONE',
  recentlyTouchedNodeIds = []
}) => {
  const [selectedNode, setSelectedNode] = useState<AVLNodeSnapshot | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(searchPath.length > 0 ? searchPath.length - 1 : 0);
  const [speed, setSpeed] = useState<number>(1000);
  const [zoomLevel, setZoomLevel] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync step with incoming search path
  useEffect(() => {
    if (searchPath.length > 0) {
      setCurrentStep(searchPath.length - 1);
    }
  }, [searchPath]);

  // Automatic playback stepper
  useEffect(() => {
    if (!isPlaying || searchPath.length <= 1) return;
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

  // Construct D3 Tree Layout
  const layout = useMemo(() => {
    if (!nodes || nodes.length === 0) return null;

    const nodeMap = new Map<number, AVLNodeSnapshot>();
    nodes.forEach((n) => nodeMap.set(n.node_id, n));

    const rootSnap = nodes.find((n) => n.parent_id === -1) || nodes[0];

    const buildHierarchy = (nodeId: number): HierarchyNodeData | null => {
      const snap = nodeMap.get(nodeId);
      if (!snap) return null;

      const children: HierarchyNodeData[] = [];
      if (snap.left_id !== -1) {
        const leftChild = buildHierarchy(snap.left_id);
        if (leftChild) children.push(leftChild);
      }
      if (snap.right_id !== -1) {
        const rightChild = buildHierarchy(snap.right_id);
        if (rightChild) children.push(rightChild);
      }

      return {
        snapshot: snap,
        children: children.length > 0 ? children : undefined
      };
    };

    const rootData = buildHierarchy(rootSnap.node_id);
    if (!rootData) return null;

    const rootH = hierarchy<HierarchyNodeData>(rootData);
    const svgWidth = Math.max(680, nodes.length * 120);
    const maxH = Math.max(...nodes.map(n => n.height));
    const svgHeight = Math.max(260, (maxH + 1) * 90);

    const treeGenerator = tree<HierarchyNodeData>()
      .size([svgWidth - 180, svgHeight - 80])
      .separation((a, b) => (a.parent === b.parent ? 1.4 : 2.0));

    const treeLayout = treeGenerator(rootH);
    return {
      treeLayout,
      width: svgWidth,
      height: svgHeight
    };
  }, [nodes]);

  if (!nodes || nodes.length === 0 || !layout) {
    return (
      <div className="h-56 flex flex-col items-center justify-center font-mono text-xs text-muted border border-dashed border-border rounded-xl bg-surface">
        <GitBranch className="w-6 h-6 text-muted/40 mb-2 stroke-[1.5]" />
        <span>AVL tree is currently empty.</span>
        <span className="text-[11px] text-muted/80">Add package IDs above to observe dynamic balanced tree creation.</span>
      </div>
    );
  }

  const { treeLayout, width, height } = layout;
  const descendantNodes = treeLayout.descendants();
  const treeLinks = treeLayout.links();

  const activePathStep = searchPath.slice(0, currentStep + 1);

  return (
    <div className="relative bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
      {/* 1. Header Toolbar with Animation Stepper */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-border/80 text-xs font-mono gap-3">
        {/* Playback Stepper Controls */}
        <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg p-1 shadow-2xs">
          <button
            onClick={() => {
              if (currentStep >= searchPath.length - 1) setCurrentStep(0);
              setIsPlaying(!isPlaying);
            }}
            disabled={searchPath.length <= 1}
            className="p-1.5 rounded hover:bg-surface text-text disabled:opacity-30 transition"
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
            className="p-1.5 rounded hover:bg-surface text-text disabled:opacity-30 transition"
            title="Previous Traversal Step"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep((p) => Math.min(searchPath.length - 1, p + 1));
            }}
            disabled={currentStep >= searchPath.length - 1}
            className="p-1.5 rounded hover:bg-surface text-text disabled:opacity-30 transition"
            title="Next Traversal Step"
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

          <span className="text-[10px] text-muted px-2 border-l border-border">
            Step {searchPath.length > 0 ? currentStep + 1 : 1}/{Math.max(1, searchPath.length)}
          </span>
        </div>

        {/* Speed & Zoom Controls */}
        <div className="flex items-center gap-2">
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="bg-background border border-border px-2 py-1 rounded text-[11px] text-text focus:outline-none"
          >
            <option value={1400}>0.7x Speed</option>
            <option value={900}>1.0x Speed</option>
            <option value={450}>2.0x Speed</option>
          </select>

          <div className="flex items-center gap-1 bg-background border border-border rounded p-0.5">
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.1))}
              className="p-1 rounded hover:bg-surface text-muted hover:text-text"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.1))}
              className="p-1 rounded hover:bg-surface text-muted hover:text-text"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 rounded hover:bg-surface text-muted hover:text-text"
              title="Reset View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Rotation Badge */}
        {rotationType && rotationType !== 'NONE' && (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-accent/20 border border-accent/40 rounded-full text-accent font-bold animate-pulse text-[11px]">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Rebalanced: {rotationType} Rotation</span>
          </div>
        )}
      </div>

      {/* 2. Traversal Search Breadcrumb Trail */}
      <div className="flex items-center gap-2 text-xs font-mono text-muted overflow-x-auto pb-1">
        <span className="shrink-0 font-medium">Traversal Path:</span>
        {searchPath && searchPath.length > 0 ? (
          <div className="flex items-center gap-1">
            {searchPath.map((nid, i) => (
              <React.Fragment key={i}>
                <span
                  className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                    i <= currentStep
                      ? 'bg-primary text-white scale-105 shadow-2xs'
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

      {/* 3. D3 Generated SVG Canvas with Fluid Springs */}
      <div
        ref={containerRef}
        className="w-full overflow-x-auto overflow-y-hidden border border-border/60 rounded-lg bg-background/50 p-2"
      >
        <svg
          width={width * zoomLevel}
          height={height * zoomLevel}
          viewBox={`0 0 ${width} ${height}`}
          className="mx-auto block select-none transition-all duration-300"
        >
          {/* Animated Connecting Edges */}
          {treeLinks.map((link, idx) => {
            const sourceSnap = link.source.data.snapshot;
            const targetSnap = link.target.data.snapshot;
            const isPathEdge =
              activePathStep.includes(sourceSnap.node_id) &&
              activePathStep.includes(targetSnap.node_id);

            const sx = link.source.x + 90;
            const sy = link.source.y + 40;
            const tx = link.target.x + 90;
            const ty = link.target.y + 40;

            return (
              <g key={`edge-${sourceSnap.node_id}-${targetSnap.node_id}-${idx}`}>
                <motion.line
                  x1={sx}
                  y1={sy}
                  x2={tx}
                  y2={ty}
                  stroke={isPathEdge ? '#246B5A' : '#D1D7CE'}
                  strokeWidth={isPathEdge ? 3 : 1.5}
                  strokeDasharray={isPathEdge ? '4 2' : undefined}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4 }}
                />
                {isPathEdge && (
                  <motion.circle
                    r="3"
                    fill="#246B5A"
                    animate={{
                      cx: [sx, tx],
                      cy: [sy, ty]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.2,
                      ease: 'easeInOut'
                    }}
                  />
                )}
              </g>
            );
          })}

          {/* Animated AVL Nodes */}
          {descendantNodes.map((d) => {
            const snap = d.data.snapshot;
            const x = d.x + 90;
            const y = d.y + 40;

            const isHighlighted =
              highlightId !== undefined && highlightId >= snap.start && highlightId <= snap.end;
            const isInSearchStep = activePathStep.includes(snap.node_id);
            const isSelected = selectedNode?.node_id === snap.node_id;
            const isRecentlyTouched = recentlyTouchedNodeIds.includes(snap.node_id);

            const formatVal = (v: number) => {
              if (v >= 1000000000) return `${(v / 1000000000).toFixed(1)}B`;
              if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
              if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
              return String(v);
            };
            const labelStr = snap.start === snap.end ? `[${formatVal(snap.start)}]` : `[${formatVal(snap.start)}━${formatVal(snap.end)}]`;
            const boxWidth = Math.max(92, Math.min(130, labelStr.length * 8 + 24));

            return (
              <g
                key={`node-${snap.node_id}`}
                transform={`translate(${x}, ${y})`}
                onClick={() => setSelectedNode(snap)}
                className="cursor-pointer group"
              >
                {/* Node Pill Background */}
                <motion.rect
                  x={-boxWidth / 2}
                  y="-22"
                  width={boxWidth}
                  height="44"
                  rx="8"
                  layout
                  className={`transition-colors duration-300 ${
                    isSelected
                      ? 'fill-surface stroke-primary stroke-[3px] shadow-md'
                      : isHighlighted
                      ? 'fill-received stroke-primary stroke-2 shadow-xs'
                      : isInSearchStep
                      ? 'fill-primary-light/50 stroke-primary stroke-2'
                      : isRecentlyTouched
                      ? 'fill-accent/15 stroke-accent stroke-2'
                      : 'fill-surface stroke-border hover:stroke-primary/60 stroke-1'
                  }`}
                />

                {/* Interval Label [Start ... End] */}
                <text
                  textAnchor="middle"
                  y="-2"
                  className={`text-[11px] font-mono font-bold select-none transition-colors ${
                    isHighlighted ? 'fill-white' : 'fill-text'
                  }`}
                >
                  {labelStr}
                </text>

                {/* Metadata: Height and Balance Factor */}
                <text
                  textAnchor="middle"
                  y="13"
                  className={`text-[9px] font-mono select-none ${
                    isHighlighted ? 'fill-white/80' : 'fill-muted'
                  }`}
                >
                  h:{snap.height} bf:{snap.balance_factor}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 4. Click-to-Inspect Node Details Drawer */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="p-4 bg-background border border-primary/30 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs shadow-sm"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-text text-sm">
                  Node #{selectedNode.node_id} Detailed Inspection
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-received/15 text-received font-semibold">
                  Interval [{selectedNode.start} ... {selectedNode.end}]
                </span>
              </div>
              <p className="text-muted text-[11px]">
                Capacity: {selectedNode.end - selectedNode.start + 1} IDs | Height: {selectedNode.height} | Balance Factor: {selectedNode.balance_factor}
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-muted block text-[10px]">PARENT</span>
                <span className="font-bold text-text">
                  {selectedNode.parent_id === -1 ? 'None (Root)' : `Node #${selectedNode.parent_id}`}
                </span>
              </div>
              <div>
                <span className="text-muted block text-[10px]">LEFT</span>
                <span className="font-bold text-text">
                  {selectedNode.left_id === -1 ? 'None' : `Node #${selectedNode.left_id}`}
                </span>
              </div>
              <div>
                <span className="text-muted block text-[10px]">RIGHT</span>
                <span className="font-bold text-text">
                  {selectedNode.right_id === -1 ? 'None' : `Node #${selectedNode.right_id}`}
                </span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 hover:bg-border rounded text-muted hover:text-text transition ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
