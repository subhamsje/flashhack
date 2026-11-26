import React, { useState } from 'react';
import { Bug, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Zap, ArrowRight, ShieldCheck, Activity } from 'lucide-react';
import { warehouseApi, type AVLNodeSnapshot } from '../services/warehouseApi';
import { AvlTreeSvg } from '../components/AvlTreeSvg';

interface TraceStep {
  seq: number;
  type: string;
  desc: string;
  start: number;
  end: number;
  height: number;
  bf: number;
}

export const AlgorithmDebuggerPage: React.FC = () => {
  const [targetIdInput, setTargetIdInput] = useState('24');
  const [isRunning, setIsRunning] = useState(false);
  const [traceSteps, setTraceSteps] = useState<TraceStep[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [treeNodes, setTreeNodes] = useState<AVLNodeSnapshot[]>([]);
  const [metrics, setMetrics] = useState<{
    nodesVisited: number;
    comparisons: number;
    heightBefore: number;
    heightAfter: number;
    latencyNs: number;
  } | null>(null);

  const handleExecuteTrace = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const id = parseInt(targetIdInput);
    if (isNaN(id) || id < 0) return;

    setIsRunning(true);
    const res = await warehouseApi.addArrivalTraced(id);
    const tRes = await warehouseApi.getTree();

    if (res.success) {
      setTraceSteps(res.steps || []);
      setCurrentStepIdx(0);
      setMetrics({
        nodesVisited: res.nodes_visited,
        comparisons: res.node_comparisons,
        heightBefore: res.height_before,
        heightAfter: res.height_after,
        latencyNs: res.latency_ns
      });
    }

    if (tRes.success) {
      setTreeNodes(tRes.nodes);
    }
    setIsRunning(false);
  };

  const currStep = traceSteps[currentStepIdx] || null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-8 px-6 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-border pb-4 gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-primary font-semibold">Algorithm Lab</span>
          <h1 className="font-serif text-3xl font-bold text-text mt-1">C AVL Step Debugger</h1>
          <p className="text-sm text-muted mt-1">
            Examine the exact execution of the C AVL interval engine with step-by-step node comparisons and balance factor updates.
          </p>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleExecuteTrace} className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max="1000000000"
            value={targetIdInput}
            onChange={(e) => setTargetIdInput(e.target.value)}
            placeholder="Package ID to Trace"
            className="w-36 px-3 py-2 bg-background border border-border rounded text-text focus:outline-none focus:ring-1 focus:ring-primary font-bold"
          />
          <button
            type="submit"
            disabled={isRunning || !targetIdInput}
            className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white rounded font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Bug className="w-3.5 h-3.5" /> Start Trace
          </button>
        </form>
      </div>

      {/* Metrics Banner */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 bg-surface border border-border rounded-lg text-center">
            <span className="text-[10px] text-muted block">NODES VISITED</span>
            <span className="text-base font-bold text-text">{metrics.nodesVisited}</span>
          </div>
          <div className="p-3 bg-surface border border-border rounded-lg text-center">
            <span className="text-[10px] text-muted block">COMPARISONS</span>
            <span className="text-base font-bold text-primary">{metrics.comparisons}</span>
          </div>
          <div className="p-3 bg-surface border border-border rounded-lg text-center">
            <span className="text-[10px] text-muted block">HEIGHT BEFORE</span>
            <span className="text-base font-bold text-text">{metrics.heightBefore}</span>
          </div>
          <div className="p-3 bg-surface border border-border rounded-lg text-center">
            <span className="text-[10px] text-muted block">HEIGHT AFTER</span>
            <span className="text-base font-bold text-received">{metrics.heightAfter}</span>
          </div>
          <div className="p-3 bg-surface border border-border rounded-lg text-center">
            <span className="text-[10px] text-muted block">ENGINE LATENCY</span>
            <span className="text-base font-bold text-text">{(metrics.latencyNs / 1000).toFixed(1)} µs</span>
          </div>
        </div>
      )}

      {/* Main Split Panel Debugger */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left: AVL Tree Layout */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-text flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-primary" /> Active Tree State
            </span>
            <span className="text-muted text-[11px]">{treeNodes.length} Nodes</span>
          </div>
          <AvlTreeSvg nodes={treeNodes} />
        </div>

        {/* Right: Step Inspector Panel */}
        <div className="lg:col-span-5 p-5 bg-surface border border-border rounded-xl space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-serif font-bold text-text text-sm">Execution Step Inspector</span>
              {currStep && (
                <span className="px-2 py-0.5 rounded bg-primary-light text-primary font-bold text-[10px]">
                  Step {currentStepIdx + 1}/{traceSteps.length}
                </span>
              )}
            </div>

            {currStep ? (
              <div className="space-y-3">
                <div className="p-3 bg-background border border-border rounded-lg space-y-1">
                  <span className="text-[10px] text-muted block">EVENT TYPE</span>
                  <span className="font-bold text-primary text-sm">{currStep.type}</span>
                </div>

                <div className="p-3 bg-background border border-border rounded-lg space-y-1">
                  <span className="text-[10px] text-muted block">ALGORITHM EXPLANATION</span>
                  <p className="text-text leading-relaxed text-xs">{currStep.desc}</p>
                </div>

                {currStep.start > 0 && (
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className="p-2 bg-background border border-border rounded">
                      <span className="text-[9px] text-muted block">INTERVAL</span>
                      <span className="font-bold text-text">[{currStep.start}, {currStep.end}]</span>
                    </div>
                    <div className="p-2 bg-background border border-border rounded">
                      <span className="text-[9px] text-muted block">HEIGHT</span>
                      <span className="font-bold text-text">{currStep.height}</span>
                    </div>
                    <div className="p-2 bg-background border border-border rounded">
                      <span className="text-[9px] text-muted block">BF</span>
                      <span className="font-bold text-text">{currStep.bf}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-muted italic">
                Enter an ID above and click "Start Trace" to inspect C engine traversal steps.
              </div>
            )}
          </div>

          {/* Stepper Controls */}
          {traceSteps.length > 0 && (
            <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentStepIdx((p) => Math.max(0, p - 1))}
                  disabled={currentStepIdx === 0}
                  className="p-1.5 rounded bg-background border border-border text-text disabled:opacity-40"
                  title="Previous Step"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentStepIdx((p) => Math.min(traceSteps.length - 1, p + 1))}
                  disabled={currentStepIdx >= traceSteps.length - 1}
                  className="p-1.5 rounded bg-background border border-border text-text disabled:opacity-40"
                  title="Next Step"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentStepIdx(0)}
                  className="p-1.5 rounded bg-background border border-border text-text hover:bg-surface"
                  title="Replay from start"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              <span className="text-muted text-[10px]">
                {currentStepIdx + 1} of {traceSteps.length} steps
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
