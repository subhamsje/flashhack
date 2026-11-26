// Live Interval Index tracking algorithm in JavaScript/TypeScript
export class LiveArrivalIndex {
  constructor() {
    this.intervals = []; // Array of [start, end]
  }

  // Add package ID incrementally
  add(packageId) {
    const id = Number(packageId);
    if (isNaN(id) || id < 0) return { success: false, reason: 'Invalid ID' };

    const n = this.intervals.length;
    if (n === 0) {
      this.intervals.push([id, id]);
      return { success: true, action: 'CREATED', interval: [id, id] };
    }

    // Binary search for insertion position based on interval start
    let low = 0, high = n - 1, idx = n;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.intervals[mid][0] > id) {
        idx = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    const leftIdx = idx - 1;
    const rightIdx = idx;

    // Check duplicate in left
    if (leftIdx >= 0 && id >= this.intervals[leftIdx][0] && id <= this.intervals[leftIdx][1]) {
      return { success: false, action: 'DUPLICATE' };
    }

    const canMergeLeft = leftIdx >= 0 && this.intervals[leftIdx][1] + 1 === id;
    const canMergeRight = rightIdx < n && id + 1 === this.intervals[rightIdx][0];

    if (canMergeLeft && canMergeRight) {
      // Bridge merge
      this.intervals[leftIdx][1] = this.intervals[rightIdx][1];
      this.intervals.splice(rightIdx, 1);
      return { success: true, action: 'BRIDGED', interval: this.intervals[leftIdx] };
    } else if (canMergeLeft) {
      this.intervals[leftIdx][1] = id;
      return { success: true, action: 'EXTENDED_RIGHT', interval: this.intervals[leftIdx] };
    } else if (canMergeRight) {
      this.intervals[rightIdx][0] = id;
      return { success: true, action: 'EXTENDED_LEFT', interval: this.intervals[rightIdx] };
    } else {
      this.intervals.splice(idx, 0, [id, id]);
      return { success: true, action: 'CREATED', interval: [id, id] };
    }
  }

  getIntervals() {
    return [...this.intervals];
  }

  getMissingRanges(queryMin, queryMax) {
    const min = Number(queryMin);
    const max = Number(queryMax);
    if (isNaN(min) || isNaN(max) || min > max) return [];

    const gaps = [];
    let curr = min;

    for (const [s, e] of this.intervals) {
      if (e < min) continue;
      if (s > max) break;

      const clippedStart = Math.max(s, min);
      const clippedEnd = Math.min(e, max);

      if (curr < clippedStart) {
        gaps.push([curr, clippedStart - 1]);
      }
      curr = clippedEnd + 1;
    }

    if (curr <= max) {
      gaps.push([curr, max]);
    }
    return gaps;
  }
}
