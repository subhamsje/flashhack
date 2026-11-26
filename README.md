# Live Arrival Index — Warehouse's Broken Number Ranges

A high-performance incremental interval index that tracks warehouse package deliveries arriving out of order.

## Problem Domain
Balanced Searching and Ordered Indexing.
Trucks deliver packages with arbitrary IDs out of sequence. Instead of maintaining a raw list of individual numbers or allocating memory up to $10^9$, this system represents received IDs as compact, sorted, non-overlapping intervals (`[start, end]`) and computes missing number gaps on demand.

## Features
- **Incremental Interval Maintenance**: Dynamically inserts arrivals in $O(\log K)$ search time.
- **Bridge Merging**: Merges two disjoint intervals when a connecting ID arrives (e.g. $[1, 3]$ and $[5, 7]$ merged into $[1, 7]$ upon arrival of $4$).
- **Extension & Duplicates**: Extends boundaries when adjacent; gracefully ignores duplicate arrivals.
- **Sparse Representation**: Supports widely-spaced IDs up to $10^9$ with zero memory overhead for gaps.
- **Bounded Range & Gap Queries**: Returns received segments and missing IDs restricted to any `[query_min, query_max]` range.

## File Overview
- `live_arrival_index.py`: Core `LiveArrivalIndex` class implementation.
- `interactive_tracker.py`: Interactive command-line console to test live package arrivals.
- `demo_live_arrival_index.py`: Step-by-step walkthrough showing bridge merges and sparsity.
- `test_live_arrival_index.py`: Full unit test suite covering duplicate handling, extensions, bridge merges, gaps, and large IDs.

## Usage

### 1. Interactive Console
```bash
python interactive_tracker.py
```
Type package IDs (e.g., `1, 3, 7, 2, 6`), query gaps (`gaps 1 7`), or view status (`show`).

### 2. Run Tests
```bash
python test_live_arrival_index.py
```

### 3. Programmatic Usage
```python
from live_arrival_index import LiveArrivalIndex

index = LiveArrivalIndex()
for pkg in [1, 3, 7, 2, 6]:
    index.add(pkg)

print("Received ranges:", index.get_intervals())
# Output: [(1, 3), (6, 7)]

print("Missing gaps in [1, 7]:", index.get_missing_ranges(1, 7))
# Output: [(4, 5)]
```
