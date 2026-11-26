import React, { useState, useEffect } from 'react';
import { Compass, CheckCircle2, ArrowRight, BarChart2, PieChart } from 'lucide-react';
import { warehouseApi, type RangeAnalysisResponse } from '../services/warehouseApi';

export const RangeAnalysisPage: React.FC = () => {
  const [startInput, setStartInput] = useState('1');
  const [endInput, setEndInput] = useState('10');
  const [data, setData] = useState<RangeAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const s = parseInt(startInput);
    const end = parseInt(endInput);
    if (isNaN(s) || isNaN(end) || s > end || s < 0) return;

    setLoading(true);
    const res = await warehouseApi.analyzeRange(s, end);
    setData(res);
    setLoading(false);
  };

  useEffect(() => {
    handleAnalyze();
  }, []);

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-8 px-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <span className="text-xs font-mono uppercase tracking-widest text-primary font-semibold">Ordered Analysis</span>
        <h1 className="font-serif text-3xl font-bold text-text mt-1">Range & Gap Evaluation</h1>
        <p className="text-sm text-muted mt-1">
          Evaluate received packages and missing number gaps inside any bounded interval [Start ID, End ID]. All metrics calculated dynamically by the C AVL core.
        </p>
      </div>

      {/* Input Controls */}
      <div className="p-6 bg-surface border border-border rounded-xl shadow-sm">
        <form onSubmit={handleAnalyze} className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-sm">
            <span className="text-muted">Start ID:</span>
            <input
              type="number"
              min="0"
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
              className="w-24 px-3 py-1.5 bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-muted">End ID:</span>
            <input
              type="number"
              min="0"
              value={endInput}
              onChange={(e) => setEndInput(e.target.value)}
              className="w-28 px-3 py-1.5 bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded text-sm font-medium transition flex items-center gap-1.5"
          >
            Analyze Range <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Evaluation Results Card */}
      {data && (
        <div className="space-y-6">
          {/* Summary Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-surface border border-border rounded-lg shadow-sm">
              <span className="text-xs font-mono text-muted uppercase block">Total Span</span>
              <span className="text-2xl font-serif font-bold text-text">{data.total_span.toLocaleString()} IDs</span>
            </div>
            <div className="p-4 bg-surface border border-border rounded-lg shadow-sm">
              <span className="text-xs font-mono text-received uppercase block">Received Count</span>
              <span className="text-2xl font-serif font-bold text-received">{data.received_count.toLocaleString()}</span>
            </div>
            <div className="p-4 bg-surface border border-border rounded-lg shadow-sm">
              <span className="text-xs font-mono text-missing uppercase block">Missing Count</span>
              <span className="text-2xl font-serif font-bold text-missing">{data.missing_count.toLocaleString()}</span>
            </div>
            <div className="p-4 bg-surface border border-border rounded-lg shadow-sm">
              <span className="text-xs font-mono text-primary uppercase block">Coverage</span>
              <span className="text-2xl font-serif font-bold text-primary">{data.coverage_percentage.toFixed(1)}%</span>
            </div>
          </div>

          {/* Animated Coverage Bar */}
          <div className="p-6 bg-surface border border-border rounded-xl space-y-3 shadow-sm">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-text flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-primary" /> Visual Interval Coverage
              </span>
              <span className="text-muted">
                Received: {data.coverage_percentage.toFixed(1)}% | Missing: {(100 - data.coverage_percentage).toFixed(1)}%
              </span>
            </div>

            {/* Split Progress Track */}
            <div className="h-6 w-full bg-missing/20 rounded-lg overflow-hidden flex border border-border">
              <div
                style={{ width: `${data.coverage_percentage}%` }}
                className="h-full bg-received transition-all duration-700 ease-out flex items-center justify-center text-[10px] font-mono font-bold text-white shadow-xs"
              >
                {data.coverage_percentage > 12 && `${data.coverage_percentage.toFixed(0)}%`}
              </div>
              <div
                style={{ width: `${100 - data.coverage_percentage}%` }}
                className="h-full bg-missing/40 transition-all duration-700 ease-out flex items-center justify-center text-[10px] font-mono font-bold text-missing"
              >
                {100 - data.coverage_percentage > 12 && `${(100 - data.coverage_percentage).toFixed(0)}%`}
              </div>
            </div>

            <div className="flex justify-between text-[11px] font-mono text-muted pt-1">
              <span>Boundary Start: {data.start.toLocaleString()}</span>
              <span>Boundary End: {data.end.toLocaleString()}</span>
            </div>
          </div>

          {/* Details Lists */}
          <div className="grid md:grid-cols-2 gap-6 font-mono text-xs">
            {/* Received Ranges */}
            <div className="p-6 bg-surface border border-border rounded-xl space-y-3 shadow-sm">
              <h3 className="font-serif text-base font-semibold text-received">
                Received Intervals ({data.received_intervals.length})
              </h3>
              <div className="p-3 bg-background border border-border rounded-lg flex flex-wrap gap-2 min-h-16 items-center">
                {data.received_intervals.length === 0 ? (
                  <span className="text-muted">No intervals present in window.</span>
                ) : (
                  data.received_intervals.map((iv, i) => (
                    <span key={i} className="px-2.5 py-1 bg-surface border border-received/30 text-received font-bold rounded shadow-xs">
                      [{iv.start}, {iv.end}]
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Missing Ranges */}
            <div className="p-6 bg-surface border border-border rounded-xl space-y-3 shadow-sm">
              <h3 className="font-serif text-base font-semibold text-missing">
                Missing Intervals ({data.missing_intervals.length})
              </h3>
              <div className="p-3 bg-missing/5 border border-dashed border-missing/30 rounded-lg flex flex-wrap gap-2 min-h-16 items-center">
                {data.missing_intervals.length === 0 ? (
                  <span className="text-received font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> 100% complete — zero missing packages in this range!
                  </span>
                ) : (
                  data.missing_intervals.map((g, i) => (
                    <span key={i} className="px-2.5 py-1 bg-missing/10 border border-missing/40 text-missing font-medium rounded">
                      [{g.start}, {g.end}]
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Largest Missing Range Insight */}
          {data.largest_missing_range.start !== -1 && (
            <div className="p-4 bg-surface border border-border rounded-lg text-xs font-mono flex items-center justify-between text-muted shadow-xs">
              <span>Largest Missing Interval in Range:</span>
              <span className="font-bold text-missing">
                [{data.largest_missing_range.start}, {data.largest_missing_range.end}] ({data.largest_missing_range.size.toLocaleString()} IDs)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
