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

const API_BASE = '/api';

export const warehouseApi = {
  async addArrival(packageId: number): Promise<ArrivalResponse> {
    const res = await fetch(`${API_BASE}/arrivals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package_id: packageId })
    });
    return await res.json();
  },

  async addBatch(ids: number[]): Promise<{ success: boolean; unique_added: number }> {
    const res = await fetch(`${API_BASE}/arrivals/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package_ids: ids })
    });
    return await res.json();
  },

  async getIntervals(): Promise<{ success: boolean; intervals: Interval[]; total_packages: number; interval_count: number }> {
    const res = await fetch(`${API_BASE}/intervals`);
    return await res.json();
  },

  async queryGaps(low: number, high: number): Promise<{ success: boolean; gaps: Interval[]; received: Interval[] }> {
    const res = await fetch(`${API_BASE}/gaps?low=${low}&high=${high}`);
    return await res.json();
  },

  async analyzeRange(start: number, end: number): Promise<RangeAnalysisResponse> {
    const res = await fetch(`${API_BASE}/analyze-range`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start, end })
    });
    return await res.json();
  },

  async getTree(): Promise<TreeResponse> {
    const res = await fetch(`${API_BASE}/tree`);
    return await res.json();
  },

  async getHistory(): Promise<{ success: boolean; count: number; history: HistoryItem[] }> {
    const res = await fetch(`${API_BASE}/history`);
    return await res.json();
  },

  async reset(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
    return await res.json();
  }
};
