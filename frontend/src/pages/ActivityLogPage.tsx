import React, { useState, useEffect } from 'react';
import { History, Search, Filter, Laptop, Smartphone, ArrowDown, ArrowUp, RefreshCw, Layers, Trash2, PlusCircle, AlertCircle, Play, Pause, SkipBack, SkipForward, Clock, ChevronRight } from 'lucide-react';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { supabase } from '../services/supabase';
import type { ActivityLog, Interval } from '../services/warehouseApi';

interface TreeSnapshot {
  id: string;
  operation_id: string;
  package_id: number | null;
  operation_type: string;
  received_intervals: Interval[];
  missing_intervals: Interval[];
  tree_height: number;
  node_count: number;
  metadata: any;
  created_at: string;
}

export const ActivityLogPage: React.FC = () => {
  const { activityLogs, onlineDevices, connectionState, lastSyncTime, refreshLogs } = useRealtimeSync();
  const [searchId, setSearchId] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [deviceFilter, setDeviceFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');

  // Time Travel states
  const [snapshots, setSnapshots] = useState<TreeSnapshot[]>([]);
  const [selectedSnapshotIndex, setSelectedSnapshotIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000); // ms per step

  const fetchSnapshots = async () => {
    try {
      const { data, error } = await supabase
        .from('tree_snapshots')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

      if (data && !error) {
        setSnapshots(data as TreeSnapshot[]);
        if (data.length > 0 && selectedSnapshotIndex === null) {
          setSelectedSnapshotIndex(data.length - 1); // latest by default
        }
      }
    } catch (err) {
      console.warn('Failed to load snapshots:', err);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, [activityLogs]);

  // Playback timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && snapshots.length > 0) {
      timer = setInterval(() => {
        setSelectedSnapshotIndex((prev) => {
          if (prev === null || prev >= snapshots.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, snapshots, playbackSpeed]);

  const currentSnapshot = selectedSnapshotIndex !== null && snapshots[selectedSnapshotIndex]
    ? snapshots[selectedSnapshotIndex]
    : null;

  // Filter logs
  const filteredLogs = activityLogs.filter((log) => {
    if (searchId && log.package_id !== null && !log.package_id.toString().includes(searchId)) {
      return false;
    }
    if (actionFilter !== 'ALL' && log.action !== actionFilter) {
      return false;
    }
    if (deviceFilter !== 'ALL' && !log.device_id?.toLowerCase().includes(deviceFilter.toLowerCase())) {
      return false;
    }
    return true;
  });

  const sortedLogs = [...filteredLogs].sort((a, b) => {
    const tA = new Date(a.created_at).getTime();
    const tB = new Date(b.created_at).getTime();
    return sortOrder === 'NEWEST' ? tB - tA : tA - tB;
  });

  const getActionBadge = (action: ActivityLog['action']) => {
    switch (action) {
      case 'PACKAGE_ADDED':
        return <span className="px-2 py-0.5 rounded bg-received/15 text-received font-bold text-[10px]">PACKAGE_ADDED</span>;
      case 'PACKAGE_REMOVED':
        return <span className="px-2 py-0.5 rounded bg-missing/15 text-missing font-bold text-[10px]">PACKAGE_REMOVED</span>;
      case 'DUPLICATE_IGNORED':
        return <span className="px-2 py-0.5 rounded bg-border text-muted font-bold text-[10px]">DUPLICATE</span>;
      case 'BATCH_IMPORT':
        return <span className="px-2 py-0.5 rounded bg-primary-light text-primary font-bold text-[10px]">BATCH_IMPORT</span>;
      case 'SESSION_RESET':
        return <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">RESET</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-border text-text font-bold text-[10px]">{action}</span>;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-8 px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-border pb-4 gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-primary font-semibold">Multi-Device Audit & Playback</span>
          <h1 className="font-serif text-3xl font-bold text-text mt-1">Activity Log & Time Travel Replay</h1>
          <p className="text-sm text-muted mt-1">
            Real-time audit log of every arrival, deletion, and interval mutation across all devices, with historical tree state replay.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-received animate-pulse" />
            <span className="text-text font-semibold">{onlineDevices} Devices Online</span>
            <span className="text-muted text-[10px]">({connectionState})</span>
          </div>

          <button
            onClick={() => { refreshLogs(); fetchSnapshots(); }}
            className="p-2 rounded bg-surface border border-border hover:bg-background text-muted hover:text-text transition"
            title="Refresh logs from Supabase"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* FEATURE: Time Travel Interactive Timeline */}
      {snapshots.length > 0 && (
        <div className="p-6 bg-surface border border-border rounded-xl space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <h2 className="font-serif text-lg font-bold text-text">Historical AVL Tree Playback</h2>
              <span className="text-xs font-mono text-muted bg-background px-2 py-0.5 rounded border border-border">
                Snapshot {selectedSnapshotIndex !== null ? selectedSnapshotIndex + 1 : 0} of {snapshots.length}
              </span>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-2 font-mono text-xs">
              <button
                onClick={() => setSelectedSnapshotIndex(0)}
                disabled={selectedSnapshotIndex === 0}
                className="p-1.5 rounded bg-background border border-border hover:bg-surface disabled:opacity-40 transition"
                title="Jump to Start"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSelectedSnapshotIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : 0))}
                disabled={selectedSnapshotIndex === 0}
                className="px-2 py-1.5 rounded bg-background border border-border hover:bg-surface disabled:opacity-40 transition"
              >
                Prev
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary text-white font-medium hover:bg-primary-dark transition shadow-sm"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                <span>{isPlaying ? 'Pause' : 'Play Replay'}</span>
              </button>
              <button
                onClick={() => setSelectedSnapshotIndex((prev) => (prev !== null && prev < snapshots.length - 1 ? prev + 1 : snapshots.length - 1))}
                disabled={selectedSnapshotIndex === snapshots.length - 1}
                className="px-2 py-1.5 rounded bg-background border border-border hover:bg-surface disabled:opacity-40 transition"
              >
                Next
              </button>
              <button
                onClick={() => setSelectedSnapshotIndex(snapshots.length - 1)}
                disabled={selectedSnapshotIndex === snapshots.length - 1}
                className="p-1.5 rounded bg-background border border-border hover:bg-surface disabled:opacity-40 transition"
                title="Jump to Latest"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="bg-background border border-border px-2 py-1.5 rounded text-xs text-text focus:outline-none"
              >
                <option value={2000}>0.5x Speed</option>
                <option value={1000}>1.0x Speed</option>
                <option value={500}>2.0x Speed</option>
              </select>
            </div>
          </div>

          {/* Timeline Slider */}
          <div className="space-y-1.5">
            <input
              type="range"
              min="0"
              max={snapshots.length - 1}
              value={selectedSnapshotIndex ?? 0}
              onChange={(e) => setSelectedSnapshotIndex(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-muted">
              <span>First Operation: {new Date(snapshots[0]?.created_at).toLocaleTimeString()}</span>
              <span>Latest Operation: {new Date(snapshots[snapshots.length - 1]?.created_at).toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Reconstructed State Display */}
          {currentSnapshot && (
            <div className="grid md:grid-cols-3 gap-4 pt-2 font-mono text-xs">
              <div className="p-3.5 rounded bg-background border border-border space-y-1.5">
                <span className="text-[11px] text-muted block uppercase tracking-wider font-semibold">Historical Operation</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-primary">
                    {currentSnapshot.package_id !== null ? `ID #${currentSnapshot.package_id}` : 'Batch / Reset'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-primary-light text-primary text-[10px] font-bold">
                    {currentSnapshot.operation_type}
                  </span>
                </div>
                <div className="text-[11px] text-muted">
                  Recorded at: {new Date(currentSnapshot.created_at).toLocaleTimeString()}
                </div>
              </div>

              <div className="p-3.5 rounded bg-background border border-border space-y-1.5">
                <span className="text-[11px] text-muted block uppercase tracking-wider font-semibold">Tree Metrics at Snapshot</span>
                <div className="grid grid-cols-2 gap-2 text-text">
                  <div>AVL Height: <span className="font-bold text-primary">{currentSnapshot.tree_height}</span></div>
                  <div>Node Count: <span className="font-bold text-primary">{currentSnapshot.node_count}</span></div>
                </div>
                <div className="text-[11px] text-muted">
                  Received Intervals: {currentSnapshot.received_intervals?.length || 0}
                </div>
              </div>

              <div className="p-3.5 rounded bg-background border border-border space-y-1.5">
                <span className="text-[11px] text-muted block uppercase tracking-wider font-semibold">Received Consecutive Ranges</span>
                <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                  {currentSnapshot.received_intervals?.map((iv, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-received/15 text-received text-[10px] font-bold border border-received/30">
                      [{iv.start}, {iv.end}]
                    </span>
                  )) || <span className="text-muted text-[11px]">Empty</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 bg-surface border border-border rounded-xl space-y-3 font-mono text-xs shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search by Package ID */}
          <div className="flex items-center gap-2 bg-background border border-border px-3 py-1.5 rounded flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-muted" />
            <input
              type="text"
              placeholder="Filter by Package ID..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="bg-transparent focus:outline-none w-full text-text"
            />
          </div>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-background border border-border px-3 py-1.5 rounded text-text focus:outline-none"
          >
            <option value="ALL">All Actions</option>
            <option value="PACKAGE_ADDED">Package Added</option>
            <option value="PACKAGE_REMOVED">Package Removed</option>
            <option value="DUPLICATE_IGNORED">Duplicate Ignored</option>
            <option value="BATCH_IMPORT">Batch Import</option>
            <option value="SESSION_RESET">Session Reset</option>
          </select>

          {/* Device Filter */}
          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            className="bg-background border border-border px-3 py-1.5 rounded text-text focus:outline-none"
          >
            <option value="ALL">All Devices</option>
            <option value="MacBook">MacBook / Desktop</option>
            <option value="Mobile">Mobile Phone / APK</option>
          </select>

          {/* Sort Button */}
          <button
            onClick={() => setSortOrder(sortOrder === 'NEWEST' ? 'OLDEST' : 'NEWEST')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-background border border-border text-muted hover:text-text transition"
          >
            {sortOrder === 'NEWEST' ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
            <span>{sortOrder === 'NEWEST' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>
      </div>

      {/* Log Feed Table */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between text-xs font-mono text-muted">
          <span>Displaying {sortedLogs.length} events</span>
          <span>Last sync: {lastSyncTime}</span>
        </div>

        {sortedLogs.length === 0 ? (
          <div className="p-12 text-center font-mono text-xs text-muted space-y-1">
            <History className="w-6 h-6 mx-auto text-muted/60 mb-2" />
            <p>No activity records match current filter criteria.</p>
            <p className="text-[11px]">Perform package arrivals or removals on any connected device to populate.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sortedLogs.map((log) => {
              const time = new Date(log.created_at).toLocaleTimeString();
              const date = new Date(log.created_at).toLocaleDateString();
              const isMobile = log.device_id?.toLowerCase().includes('mobile');

              return (
                <div
                  key={log.id}
                  className="p-4 hover:bg-background/50 transition flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono text-xs"
                >
                  <div className="flex items-start md:items-center gap-3">
                    <div className="w-7 h-7 rounded bg-surface-muted/60 border border-border flex items-center justify-center shrink-0">
                      {isMobile ? (
                        <Smartphone className="w-3.5 h-3.5 text-accent" />
                      ) : (
                        <Laptop className="w-3.5 h-3.5 text-primary" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text">
                          {log.package_id !== null ? `Package #${log.package_id}` : 'System Operation'}
                        </span>
                        {getActionBadge(log.action)}
                      </div>
                      <p className="text-[11px] text-muted">
                        Device: <span className="font-semibold text-text">{log.device_id || 'Browser'}</span> • User: {log.user_id}
                        {log.metadata?.operation && (
                          <span className="ml-2 px-1.5 py-0.2 bg-border/60 rounded text-[10px]">
                            Engine: {log.metadata.operation}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-bold text-text block">{time}</span>
                    <span className="text-[10px] text-muted">{date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
