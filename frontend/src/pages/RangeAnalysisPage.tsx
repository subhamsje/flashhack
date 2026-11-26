import React, { useState, useEffect } from 'react';
import { Compass, CheckCircle2, ArrowRight, BarChart2, PieChart, ArrowDown, ArrowUp, AlertTriangle } from 'lucide-react';
import { warehouseApi, type RangeAnalysisResponse, type Interval } from '../services/warehouseApi';

export const RangeAnalysisPage: React.FC = () => {
  const [startInput, setStartInput] = useState('1');
  const [endInput, setEndInput] = useState('100');
  const [data, setData] = useState<RangeAnalysisResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gapSort, setGapSort] = useState<'LARGEST' | 'SMALLEST' | 'LOWEST_START'>('LARGEST');

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    const s = parseInt(startInput);
    const end = parseInt(endInput);
    if (isNaN(s) || isNaN(end) || s < 0) {
      setErrorMsg('Please enter valid non-negative integer boundaries.');
      return;
    }
    if (s > end) {
      setErrorMsg(`Invalid range: Start ID (${s}) cannot be greater than End ID (${end}).`);
      return;
    }

    setLoading(true);
    const res = await warehouseApi.analyzeRange(s, end);
    setData(res);
    setLoading(false);
  };

  useEffect(() => {
    handleAnalyze();
  }, []);

  // Compute Missing Package Intelligence Metrics
  const sortedGaps = data
    ? [...data.missing_intervals].sort((a, b) => {
        const szA = a.end - a.start + 1;
        const szB = b.end - b.start + 1;
        if (gapSort === 'LARGEST') return szB - szA;
        if (gapSort === 'SMALLEST') return szA - szB;
        return a.start - b.start;
      })
    : [];

  const avgGapSize =
    data && data.missing_intervals.length > 0
      ? (data.missing_count / data.missing_intervals.length).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-8 px-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <span className="text-xs font-mono uppercase tracking-widest text-primary font-semibold">Warehouse Intelligence</span>
        <h1 className="font-serif text-3xl font-bold text-text mt-1">Missing Package Intelligence</h1>
        <p className="text-sm text-muted mt-1">
          Deep bounded gap ranking, interval density distributions, and coverage analysis computed directly from the C AVL interval core.
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
              className="w-28 px-3 py-1.5 bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-muted">End ID:</span>
            <input
              type="number"
              min="0"
              value={endInput}
              onChange={(e) => setEndInput(e.target.value)}
              className="w-32 px-3 py-1.5 bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded text-sm font-medium transition flex items-center gap-1.5"
          >
            Compute Intelligence <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {errorMsg && (
          <div className="mt-4 p-3 bg-missing/15 border border-missing/40 rounded-lg text-xs font-mono text-missing flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Evaluation Results Card */}
      {data && (
        <div className="space-y-6">
          {/* Summary Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
            <div className="p-4 bg-surface border border-border rounded-xl shadow-sm">
              <span className="text-[11px] text-muted uppercase block">Total Span</span>
              <span className="text-xl font-serif font-bold text-text">{data.total_span.toLocaleString()} IDs</span>
            </div>
            <div className="p-4 bg-surface border border-border rounded-xl shadow-sm">
              <span className="text-[11px] text-received uppercase block">Received Count</span>
              <span className="text-xl font-serif font-bold text-received">{data.received_count.toLocaleString()}</span>
            </div>
            <div className="p-4 bg-surface border border-border rounded-xl shadow-sm">
              <span className="text-[11px] text-missing uppercase block">Missing Count</span>
              <span className="text-xl font-serif font-bold text-missing">{data.missing_count.toLocaleString()}</span>
            </div>
            <div className="p-4 bg-surface border border-border rounded-xl shadow-sm">
              <span className="text-[11px] text-muted uppercase block">Separate Gaps</span>
              <span className="text-xl font-serif font-bold text-text">{data.missing_intervals.length}</span>
            </div>
            <div className="p-4 bg-surface border border-border rounded-xl shadow-sm">
              <span className="text-[11px] text-primary uppercase block">Avg Gap Size</span>
              <span className="text-xl font-serif font-bold text-primary">{avgGapSize} IDs</span>
            </div>
          </div>

          {/* Animated Coverage Bar */}
          <div className="p-6 bg-surface border border-border rounded-xl space-y-3 shadow-sm font-mono">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-text flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-primary" /> Visual Density Distribution
              </span>
              <span className="text-muted">
                Coverage: {data.coverage_percentage.toFixed(1)}% | Missing: {(100 - data.coverage_percentage).toFixed(1)}%
              </span>
            </div>

            {/* Split Progress Track */}
            <div className="h-6 w-full bg-missing/20 rounded-lg overflow-hidden flex border border-border">
              <div
                style={{ width: `${data.coverage_percentage}%` }}
                className="h-full bg-received transition-all duration-700 ease-out flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
              >
                {data.coverage_percentage > 12 && `${data.coverage_percentage.toFixed(0)}%`}
              </div>
              <div
                style={{ width: `${100 - data.coverage_percentage}%` }}
                className="h-full bg-missing/40 transition-all duration-700 ease-out flex items-center justify-center text-[10px] font-bold text-missing"
              >
                {100 - data.coverage_percentage > 12 && `${(100 - data.coverage_percentage).toFixed(0)}%`}
              </div>
            </div>

            <div className="flex justify-between text-[11px] text-muted pt-1">
              <span>Boundary Start: {data.start.toLocaleString()}</span>
              <span>Boundary End: {data.end.toLocaleString()}</span>
            </div>
          </div>

          {/* Missing Gap Ranking Table */}
          <div className="p-6 bg-surface border border-border rounded-xl space-y-4 shadow-sm font-mono text-xs">
            <div className="flex flex-wrap items-center justify-between border-b border-border pb-3 gap-3">
              <div>
                <h3 className="font-serif text-base font-bold text-text flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-missing" /> Missing Gap Ranking & Prioritization
                </h3>
                <p className="text-[11px] text-muted">Ranked intervals of unreceived packages for warehouse follow-up.</p>
              </div>

              {/* Sorting Filter */}
              <div className="flex items-center gap-2">
                <span className="text-muted text-[11px]">Sort By:</span>
                <select
                  value={gapSort}
                  onChange={(e) => setGapSort(e.target.value as any)}
                  className="bg-background border border-border px-2.5 py-1 rounded text-text focus:outline-none"
                >
                  <option value="LARGEST">Largest Gap First</option>
                  <option value="SMALLEST">Smallest Gap First</option>
                  <option value="LOWEST_START">Lowest Start ID</option>
                </select>
              </div>
            </div>

            {sortedGaps.length === 0 ? (
              <div className="p-8 text-center text-received font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> 100% Sequence Complete! Zero missing packages in this bounded range.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {sortedGaps.slice(0, 15).map((gap, rank) => {
                  const size = gap.end - gap.start + 1;
                  return (
                    <div key={rank} className="py-2.5 flex items-center justify-between hover:bg-background/40 px-2 rounded">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded bg-missing/15 text-missing font-bold flex items-center justify-center text-[10px]">
                          #{rank + 1}
                        </span>
                        <div>
                          <span className="font-bold text-text">
                            [{gap.start.toLocaleString()} ━━━ {gap.end.toLocaleString()}]
                          </span>
                          <span className="text-[10px] text-muted ml-2">
                            Boundary Span: {gap.start} to {gap.end}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-missing block">{size.toLocaleString()} IDs</span>
                        <span className="text-[10px] text-muted">
                          {((size / data.total_span) * 100).toFixed(1)}% of window
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
