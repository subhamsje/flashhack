import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, PieChart, Activity, RefreshCw } from 'lucide-react';
import { warehouseApi, type AnalyticsResponse } from '../../services/warehouseApi';

export const AnalyticsWorkspace: React.FC = () => {
  const [data, setData] = useState<AnalyticsResponse['analytics'] | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    const res = await warehouseApi.getAnalytics();
    if (res.success) setData(res.analytics);
    setLoading(false);
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-primary font-semibold">Warehouse Telemetry</span>
          <h1 className="font-serif text-3xl font-bold text-ink mt-1">Operational Analytics & Metrics</h1>
          <p className="text-sm text-ink-muted mt-1">Real-time statistics derived from the in-memory AVL index.</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono text-ink bg-surface border border-border hover:bg-surface-muted rounded-lg transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Metrics
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-surface border border-border rounded-xl shadow-sm">
          <span className="text-xs font-mono uppercase tracking-wider text-ink-muted">Total Packages</span>
          <div className="text-3xl font-serif font-bold text-ink mt-2">{data?.total_packages ?? 0}</div>
          <span className="text-xs font-mono text-primary mt-1 block">Registered parcels</span>
        </div>

        <div className="p-6 bg-surface border border-border rounded-xl shadow-sm">
          <span className="text-xs font-mono uppercase tracking-wider text-ink-muted">Active Disjoint Ranges</span>
          <div className="text-3xl font-serif font-bold text-primary mt-2">{data?.interval_count ?? 0}</div>
          <span className="text-xs font-mono text-ink-muted mt-1 block">AVL Tree nodes</span>
        </div>

        <div className="p-6 bg-surface border border-border rounded-xl shadow-sm">
          <span className="text-xs font-mono uppercase tracking-wider text-ink-muted">Bridge Merges Executed</span>
          <div className="text-3xl font-serif font-bold text-accent mt-2">{data?.bridge_count ?? 0}</div>
          <span className="text-xs font-mono text-ink-muted mt-1 block">Intervals fused together</span>
        </div>

        <div className="p-6 bg-surface border border-border rounded-xl shadow-sm">
          <span className="text-xs font-mono uppercase tracking-wider text-ink-muted">Coverage Ratio</span>
          <div className="text-3xl font-serif font-bold text-ink mt-2">
            {data ? (data.coverage_ratio * 100).toFixed(1) : 0}%
          </div>
          <span className="text-xs font-mono text-ink-muted mt-1 block">Within min-max bounds</span>
        </div>
      </div>

      {/* Breakdown Details */}
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="p-6 bg-surface border border-border rounded-xl shadow-sm space-y-4">
          <h2 className="font-serif text-lg font-semibold text-ink flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Operation Breakdown
          </h2>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
              <span className="text-ink-muted">Isolated Creations</span>
              <span className="font-bold text-ink">{data?.creation_count ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
              <span className="text-ink-muted">Boundary Extensions</span>
              <span className="font-bold text-ink">{data?.extension_count ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
              <span className="text-ink-muted">Bridge Merges</span>
              <span className="font-bold text-accent font-semibold">{data?.bridge_count ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
              <span className="text-ink-muted">Ignored Duplicates</span>
              <span className="font-bold text-danger">{data?.duplicate_count ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-surface border border-border rounded-xl shadow-sm space-y-4">
          <h2 className="font-serif text-lg font-semibold text-ink flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent" /> Range Distribution
          </h2>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
              <span className="text-ink-muted">Minimum Package ID</span>
              <span className="font-bold text-ink">#{data?.min_id ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
              <span className="text-ink-muted">Maximum Package ID</span>
              <span className="font-bold text-ink">#{data?.max_id ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
              <span className="text-ink-muted">Largest Single Interval</span>
              <span className="font-bold text-ink">{data?.largest_interval_size ?? 0} pkgs</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
              <span className="text-ink-muted">Average Interval Size</span>
              <span className="font-bold text-ink">{data?.avg_interval_size?.toFixed(2) ?? 0} pkgs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
