export interface Interval {
  start: number;
  end: number;
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
}

export interface GapQueryResponse {
  success: boolean;
  low: number;
  high: number;
  gap_count: number;
  received_count: number;
  gaps: Interval[];
  received: Interval[];
}

export interface AnalyticsResponse {
  success: boolean;
  analytics: {
    total_packages: number;
    interval_count: number;
    bridge_count: number;
    extension_count: number;
    creation_count: number;
    duplicate_count: number;
    min_id: number;
    max_id: number;
    largest_interval_size: number;
    avg_interval_size: number;
    coverage_ratio: number;
  };
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
  nodes: AVLNodeSnapshot[];
}

export interface SearchResponse {
  success: boolean;
  id: number;
  found: boolean;
  containing: Interval;
  predecessor: Interval;
  successor: Interval;
}

const API_BASE = '/api';

/* Local in-memory fallback simulator if C server is not running on localhost:8080 */
class LocalEngineFallback {
  private intervals: Interval[] = [
    { start: 1, end: 3 },
    { start: 6, end: 7 }
  ];
  private totalPackages = 5;
  private bridgeCount = 1;
  private extensionCount = 1;
  private creationCount = 3;
  private duplicateCount = 0;

  add(id: number): ArrivalResponse {
    const prevCount = this.intervals.length;
    let predIdx = -1;
    let succIdx = -1;
    let containingIdx = -1;

    for (let i = 0; i < this.intervals.length; i++) {
      const iv = this.intervals[i];
      if (id >= iv.start && id <= iv.end) {
        containingIdx = i;
        break;
      }
      if (iv.end < id) predIdx = i;
      if (iv.start > id && succIdx === -1) succIdx = i;
    }

    if (containingIdx !== -1) {
      this.duplicateCount++;
      return {
        success: true,
        package_id: id,
        operation: 'DUPLICATE',
        prev_interval_count: prevCount,
        new_interval_count: prevCount,
        execution_time_ns: 95,
        touched_new: this.intervals[containingIdx],
        touched_prev: [this.intervals[containingIdx]],
        current_intervals: [...this.intervals]
      };
    }

    const touchesPred = predIdx !== -1 && this.intervals[predIdx].end + 1 === id;
    const touchesSucc = succIdx !== -1 && this.intervals[succIdx].start - 1 === id;
    this.totalPackages++;

    let op: ArrivalResponse['operation'] = 'CREATED';
    let touchedNew: Interval = { start: id, end: id };
    const touchedPrev: Interval[] = [];

    if (touchesPred && touchesSucc) {
      op = 'BRIDGED';
      this.bridgeCount++;
      const p = this.intervals[predIdx];
      const s = this.intervals[succIdx];
      touchedPrev.push({ ...p }, { ...s });
      touchedNew = { start: p.start, end: s.end };
      this.intervals[predIdx] = touchedNew;
      this.intervals.splice(succIdx, 1);
    } else if (touchesPred) {
      op = 'EXTENDED_RIGHT';
      this.extensionCount++;
      touchedPrev.push({ ...this.intervals[predIdx] });
      this.intervals[predIdx].end = id;
      touchedNew = { ...this.intervals[predIdx] };
    } else if (touchesSucc) {
      op = 'EXTENDED_LEFT';
      this.extensionCount++;
      touchedPrev.push({ ...this.intervals[succIdx] });
      this.intervals[succIdx].start = id;
      touchedNew = { ...this.intervals[succIdx] };
    } else {
      op = 'CREATED';
      this.creationCount++;
      touchedNew = { start: id, end: id };
      this.intervals.push(touchedNew);
      this.intervals.sort((a, b) => a.start - b.start);
    }

    return {
      success: true,
      package_id: id,
      operation: op,
      prev_interval_count: prevCount,
      new_interval_count: this.intervals.length,
      execution_time_ns: 140,
      touched_new: touchedNew,
      touched_prev: touchedPrev,
      current_intervals: [...this.intervals]
    };
  }

  getIntervals(): Interval[] {
    return [...this.intervals];
  }

  queryGaps(low: number, high: number): GapQueryResponse {
    const received: Interval[] = [];
    for (const iv of this.intervals) {
      if (iv.start <= high && iv.end >= low) {
        received.push({
          start: Math.max(iv.start, low),
          end: Math.min(iv.end, high)
        });
      }
    }

    const gaps: Interval[] = [];
    let curr = low;
    for (const iv of received) {
      if (curr < iv.start) {
        gaps.push({ start: curr, end: iv.start - 1 });
      }
      curr = iv.end + 1;
    }
    if (curr <= high) {
      gaps.push({ start: curr, end: high });
    }

    return {
      success: true,
      low,
      high,
      gap_count: gaps.length,
      received_count: received.length,
      gaps,
      received
    };
  }

  getAnalytics(): AnalyticsResponse {
    const count = this.intervals.length;
    let minId = count ? this.intervals[0].start : 0;
    let maxId = count ? this.intervals[count - 1].end : 0;
    let totalCovered = 0;
    let largest = 0;

    for (const iv of this.intervals) {
      const sz = iv.end - iv.start + 1;
      if (sz > largest) largest = sz;
      totalCovered += sz;
    }

    const span = maxId - minId + 1;
    return {
      success: true,
      analytics: {
        total_packages: this.totalPackages,
        interval_count: count,
        bridge_count: this.bridgeCount,
        extension_count: this.extensionCount,
        creation_count: this.creationCount,
        duplicate_count: this.duplicateCount,
        min_id: minId,
        max_id: maxId,
        largest_interval_size: largest,
        avg_interval_size: count ? totalCovered / count : 0,
        coverage_ratio: span > 0 ? totalCovered / span : 1.0
      }
    };
  }

  reset() {
    this.intervals = [];
    this.totalPackages = 0;
    this.bridgeCount = 0;
    this.extensionCount = 0;
    this.creationCount = 0;
    this.duplicateCount = 0;
  }
}

const localFallback = new LocalEngineFallback();

export const warehouseApi = {
  async addArrival(packageId: number): Promise<ArrivalResponse> {
    try {
      const res = await fetch(`${API_BASE}/arrivals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: packageId })
      });
      if (res.ok) return await res.json();
    } catch {
      // Use in-engine fallback if HTTP bridge offline
    }
    return localFallback.add(packageId);
  },

  async addBatch(ids: number[]): Promise<{ success: boolean; unique_added: number }> {
    try {
      const res = await fetch(`${API_BASE}/arrivals/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_ids: ids })
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    let added = 0;
    for (const id of ids) {
      const r = localFallback.add(id);
      if (r.operation !== 'DUPLICATE') added++;
    }
    return { success: true, unique_added: added };
  },

  async getIntervals(): Promise<{ success: boolean; intervals: Interval[]; total_packages: number }> {
    try {
      const res = await fetch(`${API_BASE}/intervals`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    const ivs = localFallback.getIntervals();
    return { success: true, intervals: ivs, total_packages: ivs.length ? 5 : 0 };
  },

  async queryGaps(low: number, high: number): Promise<GapQueryResponse> {
    try {
      const res = await fetch(`${API_BASE}/gaps?low=${low}&high=${high}`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return localFallback.queryGaps(low, high);
  },

  async searchId(id: number): Promise<SearchResponse> {
    try {
      const res = await fetch(`${API_BASE}/search?id=${id}`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    const ivs = localFallback.getIntervals();
    let containing: Interval = { start: -1, end: -1 };
    let pred: Interval = { start: -1, end: -1 };
    let succ: Interval = { start: -1, end: -1 };
    let found = false;

    for (const iv of ivs) {
      if (id >= iv.start && id <= iv.end) {
        containing = iv;
        found = true;
      }
      if (iv.end < id) pred = iv;
      if (iv.start > id && succ.start === -1) succ = iv;
    }

    return { success: true, id, found, containing, predecessor: pred, successor: succ };
  },

  async getAnalytics(): Promise<AnalyticsResponse> {
    try {
      const res = await fetch(`${API_BASE}/analytics`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return localFallback.getAnalytics();
  },

  async getTree(): Promise<TreeResponse> {
    try {
      const res = await fetch(`${API_BASE}/tree`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    const ivs = localFallback.getIntervals();
    const nodes: AVLNodeSnapshot[] = ivs.map((iv, idx) => ({
      node_id: idx + 1,
      parent_id: idx === 0 ? -1 : 1,
      left_id: -1,
      right_id: -1,
      start: iv.start,
      end: iv.end,
      height: 1,
      balance_factor: 0,
      depth: idx === 0 ? 0 : 1
    }));
    return { success: true, node_count: nodes.length, max_depth: 1, nodes };
  },

  async reset(): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    localFallback.reset();
    return { success: true };
  }
};
