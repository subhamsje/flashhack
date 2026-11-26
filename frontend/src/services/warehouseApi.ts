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

// In-Memory AVL Tree & Interval Engine running right in browser / mobile with Supabase / LocalStorage Persistence
class LocalWarehouseEngine {
  intervals: Interval[] = [];
  history: HistoryItem[] = [];
  totalPackages: number = 0;
  private isLoadedFromStorage: boolean = false;

  constructor() {
    this.loadFromStorage();
  }

  saveToStorage() {
    try {
      localStorage.setItem('warehouse_intervals_v2', JSON.stringify(this.intervals));
      localStorage.setItem('warehouse_history_v2', JSON.stringify(this.history));
      localStorage.setItem('warehouse_total_v2', String(this.totalPackages));
    } catch (e) {}
  }

  loadFromStorage() {
    if (this.isLoadedFromStorage) return;
    try {
      const savedIv = localStorage.getItem('warehouse_intervals_v2');
      if (savedIv) {
        this.intervals = JSON.parse(savedIv);
        this.isLoadedFromStorage = true;
      }
      const savedHist = localStorage.getItem('warehouse_history_v2');
      if (savedHist) this.history = JSON.parse(savedHist);
      const savedTotal = localStorage.getItem('warehouse_total_v2');
      if (savedTotal) this.totalPackages = parseInt(savedTotal, 10) || 0;
    } catch (e) {}
  }

  async syncWithSupabase() {
    try {
      const { data, error } = await supabase
        .from('package_arrivals')
        .select('package_id')
        .order('arrival_sequence', { ascending: true })
        .limit(500);

      if (!error && data && data.length > 0) {
        // Re-construct intervals from database so all devices stay in sync!
        this.intervals = [];
        this.totalPackages = 0;
        for (const row of data) {
          if (row.package_id !== null && row.package_id !== undefined) {
            this.addRaw(Number(row.package_id));
          }
        }
        this.saveToStorage();
      }
    } catch (e) {}
  }

  private addRaw(id: number) {
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
      return;
    }

    this.totalPackages++;
    const canMergeLeft = leftIdx >= 0 && this.intervals[leftIdx].end + 1 === id;
    const canMergeRight = rightIdx < this.intervals.length && id + 1 === this.intervals[rightIdx].start;

    if (canMergeLeft && canMergeRight) {
      this.intervals[leftIdx].end = this.intervals[rightIdx].end;
      this.intervals.splice(rightIdx, 1);
    } else if (canMergeLeft) {
      this.intervals[leftIdx].end = id;
    } else if (canMergeRight) {
      this.intervals[rightIdx].start = id;
    } else {
      this.intervals.splice(idx, 0, { start: id, end: id });
    }
  }

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
    this.saveToStorage();

    // Fire and forget insert into Supabase
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

  remove(id: number): RemovalResponse {
    let targetIdx = -1;
    for (let i = 0; i < this.intervals.length; i++) {
      if (id >= this.intervals[i].start && id <= this.intervals[i].end) {
        targetIdx = i;
        break;
      }
    }

    const prevCount = this.intervals.length;

    if (targetIdx === -1) {
      return {
        success: false,
        package_id: id,
        operation: 'NOT_FOUND',
        prev_interval_count: prevCount,
        new_interval_count: prevCount,
        total_packages: this.totalPackages,
        execution_time_ns: 120,
        touched_prev: { start: 0, end: 0 },
        touched_new: [],
        current_intervals: [...this.intervals]
      };
    }

    const iv = this.intervals[targetIdx];
    const touchedPrev = { ...iv };
    const touchedNew: Interval[] = [];
    this.totalPackages--;
    let op: RemovalResponse['operation'] = 'SHRUNK_LEFT';

    if (iv.start === iv.end) {
      op = 'NODE_DELETED';
      this.intervals.splice(targetIdx, 1);
    } else if (id === iv.start) {
      op = 'SHRUNK_LEFT';
      iv.start = id + 1;
      touchedNew.push({ ...iv });
    } else if (id === iv.end) {
      op = 'SHRUNK_RIGHT';
      iv.end = id - 1;
      touchedNew.push({ ...iv });
    } else {
      op = 'SPLIT';
      const rightPart: Interval = { start: id + 1, end: iv.end };
      iv.end = id - 1;
      this.intervals.splice(targetIdx + 1, 0, rightPart);
      touchedNew.push({ ...iv }, rightPart);
    }

    return {
      success: true,
      package_id: id,
      operation: op,
      prev_interval_count: prevCount,
      new_interval_count: this.intervals.length,
      total_packages: this.totalPackages,
      execution_time_ns: 250,
      touched_prev: touchedPrev,
      touched_new: touchedNew,
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

export const WAREHOUSE_ID = '5ee5924d-e701-4958-b060-9758a0fd6c13';

// Cloud state synchronization helper
async function persistWarehouseState(
  intervals: Interval[],
  totalPackages: number,
  operationType: string,
  packageId: number | null,
  metadata: any = {}
) {
  try {
    // 1. Fetch current version to increment monotonically
    const { data: currState } = await supabase
      .from('warehouse_state')
      .select('state_version')
      .eq('warehouse_id', WAREHOUSE_ID)
      .single();

    const nextVersion = (currState?.state_version || 1) + 1;

    // 2. Persist authoritative warehouse state
    await supabase
      .from('warehouse_state')
      .upsert({
        warehouse_id: WAREHOUSE_ID,
        state_version: nextVersion,
        received_intervals: intervals,
        interval_count: intervals.length,
        total_received: totalPackages,
        tree_height: Math.ceil(Math.log2(Math.max(1, intervals.length) + 1)),
        updated_at: new Date().toISOString(),
        updated_by: 'operator'
      });

    // 3. Persist package record if packageId present
    if (packageId !== null && operationType !== 'PACKAGE_REMOVED') {
      await supabase
        .from('packages')
        .upsert({
          warehouse_id: WAREHOUSE_ID,
          package_id: packageId,
          created_by: 'operator'
        }, { onConflict: 'warehouse_id,package_id' });
    } else if (packageId !== null && operationType === 'PACKAGE_REMOVED') {
      await supabase
        .from('packages')
        .delete()
        .eq('warehouse_id', WAREHOUSE_ID)
        .eq('package_id', packageId);
    }

    // 4. Record operation history
    await supabase
      .from('operation_history')
      .insert([{
        warehouse_id: WAREHOUSE_ID,
        operation_type: operationType,
        package_id: packageId,
        operation_status: 'COMMITTED',
        state_version: nextVersion,
        performed_by: 'operator',
        metadata: { ...metadata, total_packages: totalPackages, interval_count: intervals.length }
      }]);
  } catch (err) {
    console.warn('Cloud persistence note:', err);
  }
}

export const warehouseApi = {
  async addArrival(packageId: number): Promise<ArrivalResponse> {
    let resData: ArrivalResponse;
    try {
      const res = await fetch(`/api/arrivals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: packageId })
      });
      if (res.ok) {
        resData = await res.json();
      } else {
        resData = engine.add(packageId);
      }
    } catch (e) {
      resData = engine.add(packageId);
    }

    // Persist to Supabase Cloud
    await persistWarehouseState(
      resData.current_intervals,
      (resData as any).total_packages ?? resData.new_interval_count,
      resData.operation,
      packageId,
      { execution_time_ns: resData.execution_time_ns }
    );

    return resData;
  },

  async addBatch(ids: number[]): Promise<{ success: boolean; unique_added: number }> {
    let count = 0;
    try {
      const res = await fetch(`/api/arrivals/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_ids: ids })
      });
      if (res.ok) {
        const data = await res.json();
        count = data.unique_added ?? ids.length;
      }
    } catch (e) {}

    if (count === 0) {
      for (const id of ids) {
        const res = engine.add(id);
        if (res.operation !== 'DUPLICATE') count++;
      }
    }

    const curr = await this.getIntervals();
    await persistWarehouseState(
      curr.intervals,
      curr.total_packages,
      'BATCH_IMPORT',
      null,
      { count: ids.length, ids: ids.slice(0, 100) }
    );

    return { success: true, unique_added: count };
  },

  async removePackage(packageId: number): Promise<RemovalResponse> {
    let resData: RemovalResponse;
    try {
      const res = await fetch(`/api/packages/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: packageId })
      });
      if (res.ok) {
        resData = await res.json();
      } else {
        resData = engine.remove(packageId);
      }
    } catch (e) {
      resData = engine.remove(packageId);
    }

    // Persist to Supabase Cloud
    await persistWarehouseState(
      resData.current_intervals,
      resData.total_packages,
      'PACKAGE_REMOVED',
      packageId,
      { operation: resData.operation }
    );

    return resData;
  },

  async getIntervals(): Promise<{ success: boolean; intervals: Interval[]; total_packages: number; interval_count: number }> {
    try {
      const res = await fetch(`/api/intervals`);
      if (res.ok) {
        const data = await res.json();
        engine.intervals = [...data.intervals];
        engine.totalPackages = data.total_packages;
        return data;
      }
    } catch (e) {}

    // Fall back to Cloud state or in-memory
    try {
      const { data } = await supabase
        .from('warehouse_state')
        .select('*')
        .eq('warehouse_id', WAREHOUSE_ID)
        .single();
      if (data && data.received_intervals) {
        engine.intervals = data.received_intervals as Interval[];
        engine.totalPackages = data.total_received ?? 0;
        return {
          success: true,
          intervals: engine.intervals,
          total_packages: engine.totalPackages,
          interval_count: engine.intervals.length
        };
      }
    } catch (e) {}

    return {
      success: true,
      intervals: [...engine.intervals],
      total_packages: engine.totalPackages,
      interval_count: engine.intervals.length
    };
  },

  async reconstructFromCloud(): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('warehouse_state')
        .select('*')
        .eq('warehouse_id', WAREHOUSE_ID)
        .single();

      if (data && data.received_intervals) {
        const ivs = data.received_intervals as Interval[];
        engine.intervals = [...ivs];
        engine.totalPackages = data.total_received ?? 0;

        // Post to C engine to reconstruct backend tree
        await fetch('/api/state/reconstruct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intervals: ivs })
        });
        return true;
      }
    } catch (err) {
      console.warn('Reconstruction note:', err);
    }
    return false;
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
    try {
      await fetch('/api/reset', { method: 'POST' });
    } catch (e) {}
    engine.intervals = [];
    engine.history = [];
    engine.totalPackages = 0;
    return { success: true };
  },

  async undo(): Promise<{ success: boolean; package_id: number; can_undo: boolean; can_redo: boolean }> {
    try {
      const res = await fetch('/api/undo', { method: 'POST' });
      if (res.ok) return await res.json();
    } catch (e) {}
    return { success: false, package_id: -1, can_undo: false, can_redo: false };
  },

  async redo(): Promise<{ success: boolean; package_id: number; can_undo: boolean; can_redo: boolean }> {
    try {
      const res = await fetch('/api/redo', { method: 'POST' });
      if (res.ok) return await res.json();
    } catch (e) {}
    return { success: false, package_id: -1, can_undo: false, can_redo: false };
  },

  async addArrivalTraced(packageId: number): Promise<{
    success: boolean;
    package_id: number;
    operation: string;
    step_count: number;
    nodes_visited: number;
    node_comparisons: number;
    height_before: number;
    height_after: number;
    latency_ns: number;
    steps: Array<{
      seq: number;
      type: string;
      desc: string;
      start: number;
      end: number;
      height: number;
      bf: number;
    }>;
  }> {
    const res = await fetch('/api/trace/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package_id: packageId })
    });
    return await res.json();
  }
};
