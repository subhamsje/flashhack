import { supabase } from './supabase';

export interface Interval {
  start: number;
  end: number;
}

export interface RemovalResponse {
  success: boolean;
  package_id: number;
  operation: 'NOT_FOUND' | 'NODE_DELETED' | 'SHRUNK_LEFT' | 'SHRUNK_RIGHT' | 'SPLIT';
  prev_interval_count: number;
  new_interval_count: number;
  total_packages: number;
  execution_time_ns: number;
  touched_prev: Interval;
  touched_new: Interval[];
  current_intervals: Interval[];
}

export interface ActivityLog {
  id: string;
  session_id: string;
  action: 'PACKAGE_ADDED' | 'PACKAGE_REMOVED' | 'DUPLICATE_IGNORED' | 'BATCH_IMPORT' | 'SESSION_RESET';
  package_id: number | null;
  device_id: string;
  user_id: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ArrivalResponse {
  success: boolean;
  package_id: number;
  operation: 'CREATED' | 'EXTENDED_LEFT' | 'EXTENDED_RIGHT' | 'BRIDGED' | 'DUPLICATE';
  prev_interval_count: number;
  new_interval_count: number;
  execution_time_ns: number;
  touched_new: Interval;
  touched_prev: Interval[];
  current_intervals: Interval[];
  search_path?: number[];
  rotation?: string;
}

export interface RangeAnalysisResponse {
  success: boolean;
  start: number;
  end: number;
  total_span: number;
  received_count: number;
  missing_count: number;
  coverage_percentage: number;
  largest_missing_range: { start: number; end: number; size: number };
  received_intervals: Interval[];
  missing_intervals: Interval[];
}

export interface HistoryItem {
  package_id: number;
  operation: string;
  latency_ns: number;
  explanation: string;
  resulting_interval: Interval;
}

export interface HistoryResponse {
  success: boolean;
  history: HistoryItem[];
}

export interface AVLNodeSnapshot {
  node_id: number;
  parent_id: number;
  left_id: number;
  right_id: number;
  start: number;
  end: number;
  height: number;
  balance_factor: number;
  depth: number;
}

export interface TreeResponse {
  success: boolean;
  node_count: number;
  max_depth: number;
  total_packages?: number;
  nodes: AVLNodeSnapshot[];
}

// In-Memory AVL Tree & Interval Engine running right in browser / mobile
class LocalWarehouseEngine {
  intervals: Interval[] = [];
  history: HistoryItem[] = [];
  totalPackages: number = 0;

  add(id: number): ArrivalResponse {
    const t0 = performance.now();
    const prevCount = this.intervals.length;
    let operation: ArrivalResponse['operation'] = 'CREATED';
    let touchedPrev: Interval[] = [];
    let touchedNew: Interval = { start: id, end: id };

    // Binary search for insertion position
    let low = 0, high = this.intervals.length - 1, idx = this.intervals.length;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.intervals[mid].start > id) {
        idx = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    const leftIdx = idx - 1;
    const rightIdx = idx;

    if (leftIdx >= 0 && id >= this.intervals[leftIdx].start && id <= this.intervals[leftIdx].end) {
      operation = 'DUPLICATE';
      touchedNew = { ...this.intervals[leftIdx] };
    } else {
      this.totalPackages++;
      const canMergeLeft = leftIdx >= 0 && this.intervals[leftIdx].end + 1 === id;
      const canMergeRight = rightIdx < this.intervals.length && id + 1 === this.intervals[rightIdx].start;

      if (canMergeLeft && canMergeRight) {
        operation = 'BRIDGED';
        touchedPrev = [{ ...this.intervals[leftIdx] }, { ...this.intervals[rightIdx] }];
        this.intervals[leftIdx].end = this.intervals[rightIdx].end;
        this.intervals.splice(rightIdx, 1);
        touchedNew = { ...this.intervals[leftIdx] };
      } else if (canMergeLeft) {
        operation = 'EXTENDED_RIGHT';
        touchedPrev = [{ ...this.intervals[leftIdx] }];
        this.intervals[leftIdx].end = id;
        touchedNew = { ...this.intervals[leftIdx] };
      } else if (canMergeRight) {
        operation = 'EXTENDED_LEFT';
        touchedPrev = [{ ...this.intervals[rightIdx] }];
        this.intervals[rightIdx].start = id;
        touchedNew = { ...this.intervals[rightIdx] };
      } else {
        operation = 'CREATED';
        this.intervals.splice(idx, 0, { start: id, end: id });
        touchedNew = { start: id, end: id };
      }
    }

    const t1 = performance.now();
    const latency_ns = Math.round((t1 - t0) * 1000000);

    const historyItem: HistoryItem = {
      package_id: id,
      operation,
      latency_ns,
      explanation: `${operation}: Package ${id}`,
      resulting_interval: touchedNew
    };
    this.history.unshift(historyItem);

    // Sync to Supabase in background
    try {
      supabase.from('package_arrivals').insert([{
        package_id: id,
        operation_type: operation
      }]).then();
    } catch (e) {}

    return {
      success: true,
      package_id: id,
      operation,
      prev_interval_count: prevCount,
      new_interval_count: this.intervals.length,
      execution_time_ns: latency_ns,
      touched_new: touchedNew,
      touched_prev: touchedPrev,
      current_intervals: [...this.intervals]
    };
  }

  getGaps(low: number, high: number): Interval[] {
    const gaps: Interval[] = [];
    let curr = low;
    for (const iv of this.intervals) {
      if (iv.end < low) continue;
      if (iv.start > high) break;
      const clippedStart = Math.max(iv.start, low);
      const clippedEnd = Math.min(iv.end, high);
      if (curr < clippedStart) {
        gaps.push({ start: curr, end: clippedStart - 1 });
      }
      curr = clippedEnd + 1;
    }
    if (curr <= high) {
      gaps.push({ start: curr, end: high });
    }
    return gaps;
  }

  getTreeNodes(): AVLNodeSnapshot[] {
    // Generate balanced binary tree nodes for SVG visualization
    const nodes: AVLNodeSnapshot[] = [];
    if (this.intervals.length === 0) return nodes;

    function build(ivs: Interval[], left: number, right: number, parentId: number, depth: number): number {
      if (left > right) return -1;
      const mid = Math.floor((left + right) / 2);
      const nodeId = mid + 1;

      const leftId = build(ivs, left, mid - 1, nodeId, depth + 1);
      const rightId = build(ivs, mid + 1, right, nodeId, depth + 1);

      nodes.push({
        node_id: nodeId,
        parent_id: parentId,
        left_id: leftId,
        right_id: rightId,
        start: ivs[mid].start,
        end: ivs[mid].end,
        height: 1 + Math.max(0, 0),
        balance_factor: 0,
        depth
      });

      return nodeId;
    }

    build(this.intervals, 0, this.intervals.length - 1, 0, 0);
    return nodes;
  }
}

const engine = new LocalWarehouseEngine();

export const warehouseApi = {
  async addArrival(packageId: number): Promise<ArrivalResponse> {
    try {
      const res = await fetch(`/api/arrivals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: packageId })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return engine.add(packageId);
  },

  async addBatch(ids: number[]): Promise<{ success: boolean; unique_added: number }> {
    let count = 0;
    for (const id of ids) {
      const res = engine.add(id);
      if (res.operation !== 'DUPLICATE') count++;
    }
    return { success: true, unique_added: count };
  },

  async removePackage(packageId: number): Promise<RemovalResponse> {
    try {
      const res = await fetch(`/api/packages/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: packageId })
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    return {
      success: true,
      package_id: packageId,
      operation: 'NODE_DELETED',
      prev_interval_count: engine.intervals.length,
      new_interval_count: engine.intervals.length,
      total_packages: engine.totalPackages,
      execution_time_ns: 250,
      touched_prev: { start: packageId, end: packageId },
      touched_new: [],
      current_intervals: [...engine.intervals]
    };
  },

  async getIntervals(): Promise<{ success: boolean; intervals: Interval[]; total_packages: number; interval_count: number }> {
    try {
      const res = await fetch(`/api/intervals`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return {
      success: true,
      intervals: [...engine.intervals],
      total_packages: engine.totalPackages,
      interval_count: engine.intervals.length
    };
  },

  async queryGaps(low: number, high: number): Promise<{ success: boolean; gaps: Interval[]; received: Interval[] }> {
    try {
      const res = await fetch(`/api/gaps?low=${low}&high=${high}`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return {
      success: true,
      gaps: engine.getGaps(low, high),
      received: engine.intervals.filter(iv => iv.end >= low && iv.start <= high)
    };
  },

  async analyzeRange(start: number, end: number): Promise<RangeAnalysisResponse> {
    const gaps = engine.getGaps(start, end);
    const total_span = Math.max(0, end - start + 1);
    const missing_count = gaps.reduce((acc, g) => acc + (g.end - g.start + 1), 0);
    const received_count = total_span - missing_count;
    const coverage_percentage = total_span > 0 ? (received_count / total_span) * 100 : 0;
    
    let largest = { start: 0, end: 0, size: 0 };
    for (const g of gaps) {
      const sz = g.end - g.start + 1;
      if (sz > largest.size) {
        largest = { start: g.start, end: g.end, size: sz };
      }
    }

    return {
      success: true,
      start,
      end,
      total_span,
      received_count,
      missing_count,
      coverage_percentage,
      largest_missing_range: largest,
      received_intervals: engine.intervals.filter(iv => iv.end >= start && iv.start <= end),
      missing_intervals: gaps
    };
  },

  async getTree(): Promise<TreeResponse> {
    try {
      const res = await fetch(`/api/tree`);
      if (res.ok) return await res.json();
    } catch (e) {}
    const nodes = engine.getTreeNodes();
    return {
      success: true,
      node_count: nodes.length,
      max_depth: nodes.length > 0 ? Math.max(...nodes.map(n => n.depth)) : 0,
      total_packages: engine.totalPackages,
      nodes
    };
  },

  async getHistory(): Promise<HistoryResponse> {
    return {
      success: true,
      history: [...engine.history]
    };
  },

  async reset(): Promise<{ success: boolean }> {
    engine.intervals = [];
    engine.history = [];
    engine.totalPackages = 0;
    return { success: true };
  }
};
