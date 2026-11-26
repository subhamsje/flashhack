"""
Live Arrival Index for Warehouse Package Management.

Problem Domain: Balanced Searching and Ordered Indexing
Functional Capabilities:
- Incremental interval updates: O(log N) search and O(N) or O(log N) dynamic maintenance.
- Merging adjacent intervals, extending intervals, and ignoring duplicates.
- Bounded range queries: received intervals and missing gaps within [query_min, query_max].
- Sparse representation: handles numbers up to 10^9 without dense memory allocation.
"""

from bisect import bisect_left, bisect_right
from typing import List, Tuple


class LiveArrivalIndex:
    """
    Incremental index tracking consecutive received integer IDs.
    Internally maintains sorted, disjoint, closed intervals [start, end].
    """

    def __init__(self):
        # List of intervals represented as [start, end]
        # Always maintained sorted by start (and disjoint)
        self.intervals: List[List[int]] = []

    def add(self, package_id: int) -> bool:
        """
        Adds a package ID incrementally.
        
        Returns:
            bool: True if package was new and updated the index, False if duplicate.
        """
        if package_id < 0:
            raise ValueError(f"Package ID must be non-negative, got {package_id}")

        n = len(self.intervals)
        if n == 0:
            self.intervals.append([package_id, package_id])
            return True

        # Binary search for the position where an interval starting with package_id would fit.
        # We search based on interval starts.
        starts = [iv[0] for iv in self.intervals]
        idx = bisect_right(starts, package_id)

        # Candidate intervals that could interact with package_id:
        # 1. Interval immediately before idx (idx - 1), if it exists.
        #    - package_id might be inside: iv[0] <= package_id <= iv[1] (duplicate)
        #    - package_id might extend it on the right: package_id == iv[1] + 1
        # 2. Interval at idx, if it exists.
        #    - package_id might extend it on the left: package_id == iv[0] - 1
        #    - If it connects both idx - 1 and idx: bridge merge!

        left_idx = idx - 1
        right_idx = idx

        # Check if already present in left interval
        if left_idx >= 0 and self.intervals[left_idx][0] <= package_id <= self.intervals[left_idx][1]:
            return False  # Duplicate arrival

        # Check if already present in right interval (can happen if bisect_right landed on an interval whose start == package_id,
        # but bisect_right gives index strictly greater than package_id, so right_idx start > package_id. Thus right_idx can't contain package_id unless start <= package_id, which is false).
        
        can_merge_left = (left_idx >= 0 and self.intervals[left_idx][1] + 1 == package_id)
        can_merge_right = (right_idx < n and package_id + 1 == self.intervals[right_idx][0])

        if can_merge_left and can_merge_right:
            # Case 1: Bridge Merge
            # The new ID bridges intervals[left_idx] and intervals[right_idx]
            self.intervals[left_idx][1] = self.intervals[right_idx][1]
            del self.intervals[right_idx]
            return True
        elif can_merge_left:
            # Case 2: Extend left interval to the right
            self.intervals[left_idx][1] = package_id
            return True
        elif can_merge_right:
            # Case 3: Extend right interval to the left
            self.intervals[right_idx][0] = package_id
            return True
        else:
            # Case 4: Standalone new interval
            self.intervals.insert(idx, [package_id, package_id])
            return True

    def get_intervals(self) -> List[Tuple[int, int]]:
        """Returns all current intervals as tuples of (start, end)."""
        return [(s, e) for s, e in self.intervals]

    def get_intervals_in_range(self, query_min: int, query_max: int) -> List[Tuple[int, int]]:
        """
        Returns received intervals clipped to [query_min, query_max].
        """
        if query_min > query_max:
            return []

        result: List[Tuple[int, int]] = []
        if not self.intervals:
            return result

        # Binary search for the first interval that could overlap [query_min, query_max]
        # An interval [s, e] overlaps if e >= query_min and s <= query_max.
        # Find first interval where e >= query_min using starts
        starts = [iv[0] for iv in self.intervals]
        idx = bisect_left(starts, query_min)
        # Check one interval before if it exists, since its end might be >= query_min
        if idx > 0 and self.intervals[idx - 1][1] >= query_min:
            idx -= 1

        for i in range(idx, len(self.intervals)):
            s, e = self.intervals[i]
            if s > query_max:
                break
            # Overlap exists
            clipped_start = max(s, query_min)
            clipped_end = min(e, query_max)
            if clipped_start <= clipped_end:
                result.append((clipped_start, clipped_end))

        return result

    def get_missing_ranges(self, query_min: int, query_max: int) -> List[Tuple[int, int]]:
        """
        Returns gaps/missing intervals within [query_min, query_max].
        """
        if query_min > query_max:
            return []

        clipped_received = self.get_intervals_in_range(query_min, query_max)
        if not clipped_received:
            return [(query_min, query_max)]

        gaps: List[Tuple[int, int]] = []
        curr = query_min

        for s, e in clipped_received:
            if curr < s:
                gaps.append((curr, s - 1))
            curr = e + 1

        if curr <= query_max:
            gaps.append((curr, query_max))

        return gaps
