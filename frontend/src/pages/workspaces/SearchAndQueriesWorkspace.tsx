import React, { useState, useEffect } from 'react';
import { Search, Compass, AlertCircle, ArrowRight, Layers, Hash } from 'lucide-react';
import { warehouseApi, type GapQueryResponse, type SearchResponse, type Interval } from '../../services/warehouseApi';

export const SearchAndQueriesWorkspace: React.FC = () => {
  /* Search single ID state */
  const [searchIdInput, setSearchIdInput] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);

  /* Bounded range & gap query state */
  const [rangeLow, setRangeLow] = useState('1');
  const [rangeHigh, setRangeHigh] = useState('50');
  const [queryResult, setQueryResult] = useState<GapQueryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleIdSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(searchIdInput);
    if (isNaN(id) || id < 0) return;

    setLoading(true);
    const res = await warehouseApi.searchId(id);
    setSearchResult(res);
    setLoading(false);
  };

  const handleRangeQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    const l = parseInt(rangeLow);
    const h = parseInt(rangeHigh);
    if (isNaN(l) || isNaN(h) || l > h) return;

    setLoading(true);
    const res = await warehouseApi.queryGaps(l, h);
    setQueryResult(res);
    setLoading(false);
  };

  useEffect(() => {
    // Initial query
    warehouseApi.queryGaps(1, 50).then(setQueryResult);
  }, []);

  return (
    <div className="space-y-8">
      {/* Workspace Header */}
      <div className="border-b border-border pb-6">
        <span className="text-xs font-mono uppercase tracking-widest text-primary font-semibold">Subtree-Pruned Queries</span>
        <h1 className="font-serif text-3xl font-bold text-ink mt-1">Search & Gap Window Intelligence</h1>
        <p className="text-sm text-ink-muted mt-1">
          Perform logarithmic neighbour lookups, verify interval containment, and query missing gaps across bounded ranges without allocating full array tables.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left: Individual ID Search & Predecessor/Successor */}
        <div className="lg:col-span-5 bg-surface border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="font-serif text-lg font-semibold text-ink flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" /> Package Lookup & Neighbors
            </h2>
            <p className="text-xs text-ink-muted mt-1">Find containing interval, immediate predecessor and successor in O(log K).</p>
          </div>

          <form onSubmit={handleIdSearch} className="flex gap-2">
            <input
              type="number"
              min="0"
              value={searchIdInput}
              onChange={(e) => setSearchIdInput(e.target.value)}
              placeholder="Package ID (e.g. 4)"
              className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="submit"
              disabled={loading || !searchIdInput}
              className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition shadow"
            >
              Search
            </button>
          </form>

          {/* Search Result Card */}
          {searchResult && (
            <div className="p-4 bg-background border border-border rounded-lg space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-ink font-bold">Query Package #{searchResult.id}</span>
                <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                  searchResult.found ? 'bg-primary/10 text-primary' : 'bg-accent-secondary/15 text-accent-secondary'
                }`}>
                  {searchResult.found ? 'PRESENT IN INVENTORY' : 'MISSING (GAP)'}
                </span>
              </div>

              {searchResult.found ? (
                <div className="text-primary font-semibold">
                  Contains in range: [{searchResult.containing.start} — {searchResult.containing.end}]
                </div>
              ) : (
                <div className="text-ink-muted">
                  Package has not arrived yet.
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                <div className="p-2 bg-surface rounded border border-border">
                  <span className="text-ink-muted block">Predecessor:</span>
                  <span className="font-semibold text-ink">
                    {searchResult.predecessor.start !== -1
                      ? `[${searchResult.predecessor.start}—${searchResult.predecessor.end}]`
                      : 'None'}
                  </span>
                </div>
                <div className="p-2 bg-surface rounded border border-border">
                  <span className="text-ink-muted block">Successor:</span>
                  <span className="font-semibold text-ink">
                    {searchResult.successor.start !== -1
                      ? `[${searchResult.successor.start}—${searchResult.successor.end}]`
                      : 'None'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Bounded Window Range & Gap Report */}
        <div className="lg:col-span-7 bg-surface border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="font-serif text-lg font-semibold text-ink flex items-center gap-2">
              <Compass className="w-5 h-5 text-accent" /> Bounded Range Gap Analyzer
            </h2>
            <p className="text-xs text-ink-muted mt-1">Specify window [low, high] to calculate received intervals and missing number gaps.</p>
          </div>

          <form onSubmit={handleRangeQuery} className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-ink-muted">Window:</span>
              <input
                type="number"
                min="0"
                value={rangeLow}
                onChange={(e) => setRangeLow(e.target.value)}
                className="w-24 px-3 py-2 bg-background border border-border rounded font-mono text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                placeholder="Low"
              />
              <span className="text-ink-muted">—</span>
              <input
                type="number"
                min="0"
                value={rangeHigh}
                onChange={(e) => setRangeHigh(e.target.value)}
                className="w-24 px-3 py-2 bg-background border border-border rounded font-mono text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
                placeholder="High"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-ink hover:bg-black text-white rounded font-medium text-sm transition shadow"
            >
              Analyze Window
            </button>
          </form>

          {/* Range Report Visualizer */}
          {queryResult && (
            <div className="space-y-4">
              {/* Received */}
              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-2">
                  <span className="font-semibold text-primary uppercase">Received in Window ({queryResult.received_count})</span>
                  <span className="text-ink-muted">[{queryResult.low} — {queryResult.high}]</span>
                </div>
                <div className="p-3 bg-surface-muted/60 border border-border rounded-lg flex flex-wrap gap-2">
                  {queryResult.received.length === 0 ? (
                    <span className="text-xs font-mono text-ink-muted">No packages received in this window.</span>
                  ) : (
                    queryResult.received.map((iv, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-surface border border-primary/20 text-primary-dark font-mono text-xs rounded font-semibold"
                      >
                        [{iv.start}—{iv.end}]
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Missing Gaps */}
              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-2">
                  <span className="font-semibold text-accent-secondary uppercase">Missing Gaps ({queryResult.gap_count})</span>
                  <span className="text-ink-muted">Broken ranges needing resolution</span>
                </div>
                <div className="p-3 bg-accent-secondary/5 border border-dashed border-accent-secondary/30 rounded-lg flex flex-wrap gap-2">
                  {queryResult.gaps.length === 0 ? (
                    <span className="text-xs font-mono text-primary font-semibold">100% complete — zero missing packages!</span>
                  ) : (
                    queryResult.gaps.map((g, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-accent-secondary/10 border border-accent-secondary/30 text-accent-secondary font-mono text-xs rounded font-semibold"
                      >
                        [{g.start}—{g.end}]
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
