import React, { useState, useEffect } from 'react';
import { PackagePlus, RotateCcw, Zap, Layers, Info, History, ArrowRight } from 'lucide-react';
import { warehouseApi, type ArrivalResponse, type Interval, type TreeResponse, type HistoryResponse } from '../services/warehouseApi';
import { AvlTreeSvg } from '../components/AvlTreeSvg';
import { AdaptiveNumberLine } from '../components/AdaptiveNumberLine';

export const LiveArrivalPage: React.FC = () => {
  const [packageIdInput, setPackageIdInput] = useState('');
  const [batchInput, setBatchInput] = useState('');
  const [intervals, setIntervals] = useState<Interval[]>([]);
  const [gaps, setGaps] = useState<Interval[]>([]);
  const [treeData, setTreeData] = useState<TreeResponse | null>(null);
  const [lastEvent, setLastEvent] = useState<ArrivalResponse | null>(null);
  const [recentOperations, setRecentOperations] = useState<ArrivalResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [stepExplanation, setStepExplanation] = useState<string[]>([
    'Waiting for package arrivals. Enter an ID above to trigger C engine AVL tree insertion.'
  ]);

  const refreshAll = async () => {
    const ivRes = await warehouseApi.getIntervals();
    if (ivRes.success) {
      setIntervals(ivRes.intervals);
      if (ivRes.intervals.length > 0) {
        const minVal = ivRes.intervals[0].start;
        const maxVal = ivRes.intervals[ivRes.intervals.length - 1].end;
        const gapRes = await warehouseApi.queryGaps(minVal, maxVal);
        if (gapRes.success) setGaps(gapRes.gaps);
      } else {
        setGaps([]);
      }
    }
    const tRes = await warehouseApi.getTree();
    if (tRes.success) setTreeData(tRes);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(packageIdInput);
    if (isNaN(id) || id < 0) return;

    setLoading(true);
    const res = await warehouseApi.addArrival(id);
    setLastEvent(res);
    setRecentOperations((prev) => [res, ...prev.slice(0, 4)]);

    // Formulate 5-step faculty explanation
    const steps: string[] = [];
    steps.push(`Package ID received: ${id}`);

    if (res.operation === 'DUPLICATE') {
      steps.push(`1. Queried AVL tree root in O(log k) search.`);
      steps.push(`2. Found that ID ${id} already falls inside range [${res.touched_new.start}, ${res.touched_new.end}].`);
      steps.push(`3. Duplicate detected: Operation ignored without modifying intervals.`);
      steps.push(`Result: No-op. Tree balance factor maintained.`);
    } else if (res.operation === 'BRIDGED') {
      steps.push(`1. Located predecessor interval [${res.touched_prev[0].start}, ${res.touched_prev[0].end}].`);
      steps.push(`2. Located successor interval [${res.touched_prev[1].start}, ${res.touched_prev[1].end}].`);
      steps.push(`3. Detected that ID ${id} directly connects both boundaries.`);
      steps.push(`4. Merged both into single range [${res.touched_new.start}, ${res.touched_new.end}].`);
      steps.push(`5. Reclaimed successor node from AVL tree and executed height rebalance.`);
    } else if (res.operation === 'EXTENDED_RIGHT') {
      steps.push(`1. Located predecessor interval [${res.touched_prev[0].start}, ${res.touched_prev[0].end}].`);
      steps.push(`2. Detected that ${id} is adjacent (end + 1).`);
      steps.push(`3. Expanded right boundary to [${res.touched_new.start}, ${res.touched_new.end}].`);
    } else if (res.operation === 'EXTENDED_LEFT') {
      steps.push(`1. Located successor interval [${res.touched_prev[0].start}, ${res.touched_prev[0].end}].`);
      steps.push(`2. Detected that ${id} is adjacent (start - 1).`);
      steps.push(`3. Expanded left boundary to [${res.touched_new.start}, ${res.touched_new.end}].`);
    } else {
      steps.push(`1. Searched AVL tree: No adjacent predecessor or successor found.`);
      steps.push(`2. Allocated new AVL node for isolated interval [${id}, ${id}].`);
      steps.push(`3. Inserted node and executed AVL rotations where required.`);
    }

    setStepExplanation(steps);
    setPackageIdInput('');
    await refreshAll();
    setLoading(false);
  };

  const handleBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const ids = batchInput
      .split(/[\s,]+/)
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n) && n >= 0);

    if (ids.length === 0) return;
    setLoading(true);
    await warehouseApi.addBatch(ids);
    setBatchInput('');
    setStepExplanation([
      `Batch ingestion executed: ${ids.length} package IDs processed through C engine.`
    ]);
    await refreshAll();
    setLoading(false);
  };

  const handleReset = async () => {
    if (!confirm('Clear all intervals in the live session?')) return;
    await warehouseApi.reset();
    setLastEvent(null);
    setRecentOperations([]);
    setStepExplanation(['Index reset to empty state.']);
    await refreshAll();
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-8 px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-border pb-4 gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-primary font-semibold">Core Demonstration</span>
          <h1 className="font-serif text-3xl font-bold text-text mt-1">Live Arrival Index</h1>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-muted hover:text-text border border-border rounded transition bg-surface"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Clear Session
        </button>
      </div>

      {/* SECTION A: Package Arrival Input */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 bg-surface border border-border rounded-xl space-y-4 shadow-sm">
          <h3 className="font-serif text-lg font-semibold text-text flex items-center gap-2">
            <PackagePlus className="w-4 h-4 text-primary" /> Single Package Input
          </h3>
          <form onSubmit={handleAddPackage} className="flex gap-2">
            <input
              type="number"
              min="0"
              max="1000000000"
              value={packageIdInput}
              onChange={(e) => setPackageIdInput(e.target.value)}
              placeholder="Package ID (0 — 10⁹)"
              className="flex-1 px-3.5 py-2 bg-background border border-border rounded font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={loading || !packageIdInput}
              className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white rounded text-sm font-medium transition flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4 fill-white" /> Add
            </button>
          </form>

          {/* Preset Buttons for Faculty Demonstration */}
          <div className="pt-2 border-t border-border">
            <span className="text-[11px] font-mono text-muted block mb-1.5">Preset Demo Inputs:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Sample [1,3,7,2,6]', ids: [1, 3, 7, 2, 6] },
                { label: 'Bridge 4', ids: [4] },
                { label: 'Bridge 5', ids: [5] },
                { label: 'Sparse 500M', ids: [500000000] }
              ].map((p, idx) => (
                <button
                  key={idx}
                  onClick={async () => {
                    setLoading(true);
                    await warehouseApi.addBatch(p.ids);
                    await refreshAll();
                    setLoading(false);
                  }}
                  className="px-2 py-1 text-xs font-mono bg-background hover:bg-border/60 text-text rounded border border-border transition"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Batch Input */}
        <div className="p-6 bg-surface border border-border rounded-xl space-y-4 shadow-sm">
          <h3 className="font-serif text-lg font-semibold text-text flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent" /> Batch Package Sequence
          </h3>
          <form onSubmit={handleBatch} className="space-y-3">
            <input
              type="text"
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              placeholder="e.g. 10, 11, 12, 14, 15, 13"
              className="w-full px-3.5 py-2 bg-background border border-border rounded font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={loading || !batchInput}
              className="px-4 py-2 bg-text hover:bg-black disabled:opacity-50 text-white rounded text-sm font-medium transition"
            >
              Process Batch Sequence
            </button>
          </form>
        </div>
      </div>

      {/* SECTION B: Adaptive Number Line Visualization */}
      <div className="p-6 bg-surface border border-border rounded-xl space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="font-serif text-lg font-semibold text-text">Adaptive Number-Line View</h3>
            <p className="text-xs text-muted">Automatically switches between discrete unit cells and sparse continuous bars.</p>
          </div>
          <span className="text-xs font-mono text-muted">{intervals.length} Disjoint Ranges</span>
        </div>

        <AdaptiveNumberLine
          intervals={intervals}
          gaps={gaps}
          lastArrivalId={lastEvent?.package_id}
        />
      </div>

      {/* SECTION C: Consecutive Intervals and Missing Gaps */}
      <div className="p-6 bg-surface border border-border rounded-xl space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="font-serif text-lg font-semibold text-text">Stored Interval Blocks</h3>
          <span className="text-xs font-mono text-muted">Total Elements: {treeData?.total_packages || 0}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] font-mono text-received uppercase font-bold tracking-wider mb-2">
              RECEIVED RANGES (GREEN)
            </div>
            <div className="flex flex-wrap gap-2.5 p-3.5 bg-background border border-border rounded-lg min-h-16 items-center">
              {intervals.length === 0 ? (
                <span className="text-xs font-mono text-muted">No intervals in index.</span>
              ) : (
                intervals.map((iv, i) => (
                  <div
                    key={i}
                    className="px-3 py-1.5 bg-surface border border-received/40 rounded font-mono text-xs font-bold text-received shadow-sm flex items-center gap-2"
                  >
                    <span>[{iv.start} ━━━ {iv.end}]</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-received/10 rounded-full font-sans font-medium">
                      {iv.end - iv.start + 1}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-mono text-missing uppercase font-bold tracking-wider mb-2">
              MISSING RANGES (AMBER)
            </div>
            <div className="flex flex-wrap gap-2.5 p-3.5 bg-missing/5 border border-dashed border-missing/30 rounded-lg min-h-16 items-center">
              {gaps.length === 0 ? (
                <span className="text-xs font-mono text-muted">No gaps in bounded bounds.</span>
              ) : (
                gaps.map((g, i) => (
                  <div
                    key={i}
                    className="px-3 py-1.5 bg-missing/10 border border-missing/40 rounded font-mono text-xs font-medium text-missing flex items-center gap-2"
                  >
                    <span>[{g.start} ━ {g.end}]</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-missing/20 rounded font-sans">
                      -{g.end - g.start + 1}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION D: Real C Engine AVL Tree SVG */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-text">Authoritative AVL Tree Layout</h3>
          <span className="text-xs font-mono text-muted">Nodes: {treeData?.node_count || 0} | Height: {treeData?.max_depth !== undefined ? treeData.max_depth + 1 : 0}</span>
        </div>
        <AvlTreeSvg
          nodes={treeData?.nodes || []}
          highlightId={lastEvent?.package_id}
          searchPath={lastEvent?.search_path}
          rotationType={lastEvent?.rotation}
        />
      </div>

      {/* SECTION E: Operation Event Timeline & Algorithmic Explanation */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Algorithmic Step-by-Step */}
        <div className="p-6 bg-surface border border-border rounded-xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="font-serif text-base font-semibold text-text flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" /> Step-by-Step Algorithmic Explanation
            </h3>
            {lastEvent && (
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary-light text-primary">
                {lastEvent.operation}
              </span>
            )}
          </div>

          <div className="space-y-1.5 font-mono text-xs">
            {stepExplanation.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2 text-text">
                <span className="text-primary font-bold">›</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Operation Timeline */}
        <div className="p-6 bg-surface border border-border rounded-xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="font-serif text-base font-semibold text-text flex items-center gap-2">
              <History className="w-4 h-4 text-accent" /> Recent Operation Timeline
            </h3>
            <span className="text-[11px] font-mono text-muted">Last 5 actions</span>
          </div>

          {recentOperations.length === 0 ? (
            <p className="text-xs font-mono text-muted italic pt-4 text-center">
              No operations logged yet in this session.
            </p>
          ) : (
            <div className="space-y-2">
              {recentOperations.map((op, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded bg-background border border-border text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary">ID #{op.package_id}</span>
                    <ArrowRight className="w-3 h-3 text-muted" />
                    <span className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px]">
                      {op.operation}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted">
                    Rot: {op.rotation || 'NONE'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
