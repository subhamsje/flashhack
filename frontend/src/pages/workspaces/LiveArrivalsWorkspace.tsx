import React, { useState, useEffect } from 'react';
import {
  PackagePlus,
  Zap,
  RotateCcw,
  Upload,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { warehouseApi, type ArrivalResponse, type Interval } from '../../services/warehouseApi';

export const LiveArrivalsWorkspace: React.FC = () => {
  const [packageInput, setPackageInput] = useState('');
  const [batchInput, setBatchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [intervals, setIntervals] = useState<Interval[]>([]);
  const [history, setHistory] = useState<ArrivalResponse[]>([]);
  const [latestOp, setLatestOp] = useState<ArrivalResponse | null>(null);

  const refreshIntervals = async () => {
    const res = await warehouseApi.getIntervals();
    if (res.success) setIntervals(res.intervals);
  };

  useEffect(() => {
    refreshIntervals();
  }, []);

  const handleSingleArrival = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(packageInput);
    if (isNaN(id) || id < 0) return;

    setLoading(true);
    const res = await warehouseApi.addArrival(id);
    setLatestOp(res);
    setHistory((prev) => [res, ...prev.slice(0, 19)]);
    setPackageInput('');
    await refreshIntervals();
    setLoading(false);
  };

  const handleBatchArrival = async (e: React.FormEvent) => {
    e.preventDefault();
    const ids = batchInput
      .split(/[\s,]+/)
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n) && n >= 0);

    if (ids.length === 0) return;

    setLoading(true);
    await warehouseApi.addBatch(ids);
    setBatchInput('');
    await refreshIntervals();
    setLoading(false);
  };

  const handleReset = async () => {
    if (!confirm('Reset current warehouse index? All intervals will be cleared.')) return;
    await warehouseApi.reset();
    setHistory([]);
    setLatestOp(null);
    await refreshIntervals();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-primary font-semibold">Active Ingestion Pipeline</span>
          <h1 className="font-serif text-3xl font-bold text-ink mt-1">Live Package Arrival Gate</h1>
          <p className="text-sm text-ink-muted mt-1">Record incoming package IDs. The C AVL engine calculates extensions and bridge merges in real-time.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono text-danger bg-danger/10 hover:bg-danger/15 border border-danger/30 rounded-lg transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear Index
          </button>
        </div>
      </div>

      {/* Input Panels Grid */}
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Single Arrival Ingestion */}
        <div className="lg:col-span-5 bg-surface border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="font-serif text-lg font-semibold text-ink flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-primary" /> Single Package Ingestion
            </h2>
            <p className="text-xs text-ink-muted mt-1">Simulate scanning an individual parcel barcode.</p>
          </div>

          <form onSubmit={handleSingleArrival} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-ink-muted mb-1">Package ID (0 — 10⁹)</label>
              <input
                type="number"
                min="0"
                value={packageInput}
                onChange={(e) => setPackageInput(e.target.value)}
                placeholder="e.g. 106"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg font-mono text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !packageInput}
              className="w-full py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white rounded-lg font-medium text-sm transition shadow flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-white" /> Register Arrival
            </button>
          </form>

          {/* Quick Preset Buttons */}
          <div className="pt-2 border-t border-border">
            <span className="text-xs font-mono text-ink-muted block mb-2">Quick Presets:</span>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Sample Seq [1,3,7,2,6]', ids: [1, 3, 7, 2, 6] },
                { label: 'Bridge [100-105] & [107-115]', ids: [100, 101, 102, 103, 104, 105, 107, 108, 109, 110, 111, 112, 113, 114, 115] },
                { label: 'Bridge Key 106', ids: [106] },
                { label: 'Sparse 500,000,000', ids: [500000000] }
              ].map((p, idx) => (
                <button
                  key={idx}
                  onClick={async () => {
                    setLoading(true);
                    await warehouseApi.addBatch(p.ids);
                    await refreshIntervals();
                    setLoading(false);
                  }}
                  className="px-2.5 py-1 text-xs font-mono bg-surface-muted hover:bg-border/60 text-ink rounded border border-border/80 transition"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Batch Freight Import */}
        <div className="lg:col-span-7 bg-surface border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="font-serif text-lg font-semibold text-ink flex items-center gap-2">
              <Upload className="w-5 h-5 text-accent" /> Batch Dispatch Registration
            </h2>
            <p className="text-xs text-ink-muted mt-1">Paste a sequence of tracking numbers separated by commas or spaces.</p>
          </div>

          <form onSubmit={handleBatchArrival} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-ink-muted mb-1">ID Sequence</label>
              <textarea
                rows={4}
                value={batchInput}
                onChange={(e) => setBatchInput(e.target.value)}
                placeholder="e.g. 1, 3, 7, 2, 6, 25, 26, 27, 50, 52"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !batchInput}
              className="py-2.5 px-6 bg-ink hover:bg-black text-white rounded-lg font-medium text-sm transition shadow flex items-center justify-center gap-2"
            >
              Process Batch Stream
            </button>
          </form>

          {/* Latest Execution Card */}
          {latestOp && (
            <div className="p-4 rounded-lg bg-surface-muted border border-border font-mono text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">Last Ingestion Result:</span>
                <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                  latestOp.operation === 'BRIDGED' ? 'bg-accent/20 text-accent-secondary' :
                  latestOp.operation === 'DUPLICATE' ? 'bg-danger/10 text-danger' :
                  'bg-primary/20 text-primary-dark'
                }`}>
                  {latestOp.operation}
                </span>
              </div>
              <div className="text-ink-muted">
                Package ID #{latestOp.package_id} processed in {latestOp.execution_time_ns} ns.
                Resulting range: [{latestOp.touched_new.start}—{latestOp.touched_new.end}].
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Current Sorted Disjoint Intervals Display */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-ink flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" /> Active Sorted Disjoint Intervals ({intervals.length})
          </h2>
          <span className="text-xs font-mono text-ink-muted">Ordered by interval start</span>
        </div>

        {intervals.length === 0 ? (
          <div className="text-center py-12 text-ink-muted font-mono text-sm border border-dashed border-border rounded-lg">
            No package arrivals recorded yet. Register package IDs above to begin indexing.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5 p-4 bg-background border border-border rounded-lg">
            {intervals.map((iv, idx) => (
              <div
                key={idx}
                className="px-3.5 py-2 bg-surface border border-primary/30 rounded-lg font-mono text-xs font-semibold text-primary-dark shadow-sm flex items-center gap-2"
              >
                <span>[{String(iv.start).padStart(3, '0')} — {String(iv.end).padStart(3, '0')}]</span>
                <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-[10px] font-sans font-medium text-primary">
                  {iv.end - iv.start + 1} pkgs
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Timeline Audit Trail */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="font-serif text-lg font-semibold text-ink flex items-center gap-2">
          <Clock className="w-5 h-5 text-ink-muted" /> Real-Time Operation Audit Trail
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-border text-ink-muted">
                <th className="py-2.5 px-3">Package ID</th>
                <th className="py-2.5 px-3">Operation</th>
                <th className="py-2.5 px-3">Resulting Interval</th>
                <th className="py-2.5 px-3">Latency</th>
                <th className="py-2.5 px-3">Interval Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {history.map((ev, i) => (
                <tr key={i} className="hover:bg-surface-muted/40 transition">
                  <td className="py-2 px-3 font-bold text-ink">#{ev.package_id}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      ev.operation === 'BRIDGED' ? 'bg-accent/20 text-accent-secondary' :
                      ev.operation === 'DUPLICATE' ? 'bg-danger/10 text-danger' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {ev.operation}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-ink-muted">[{ev.touched_new.start}—{ev.touched_new.end}]</td>
                  <td className="py-2 px-3 text-ink-muted">{ev.execution_time_ns} ns</td>
                  <td className="py-2 px-3 text-ink">{ev.new_interval_count} ranges</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
