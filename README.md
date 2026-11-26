# Live Arrival Index — The Warehouse's Broken Number Ranges

High-performance C implementation for **Problem Statement: The Warehouse's Broken Number Ranges** (Problem Domain: Balanced Searching and Ordered Indexing).

Tracks package numbers arriving in arbitrary, out-of-order sequence and maintains them incrementally as compact, sorted, non-overlapping consecutive intervals `[start, end]`. Also queries received intervals and missing number ranges (gaps) within any bounded query window `[low, high]`.

---

## Functional Capabilities

- **Arbitrary Arrival Order**: Accepts non-negative package IDs ($0$ to $10^9$) arriving in random order.
- **Incremental Interval Maintenance**: Inserts and updates ranges in $O(\log K)$ time (where $K$ is the number of active disjoint intervals) without re-sorting.
- **Bridge Merging**: Seamlessly fuses two disjoint intervals when a missing connecting ID arrives (e.g., $[1, 3]$ and $[5, 7]$ fuse into $[1, 7]$ upon arrival of $4$).
- **Boundary Extension**: Extends an interval to the left or right when an adjacent ID arrives.
- **Duplicate Resilience**: Gracefully detects and ignores duplicate package arrivals without altering existing intervals.
- **Bounded Range & Gap Queries**: Returns both received segments and missing gaps restricted to any bounded window `[low, high]`.
- **Sparse ID Memory Efficiency**: Employs a self-balancing AVL tree. Handles IDs up to $10^9$ with $O(K)$ space complexity (uses tens of kilobytes instead of allocating gigabytes for flat arrays or bitsets).

---

## Architecture & Algorithmic Design

Instead of allocating a dense bitset or array up to $10^9$ (which would waste gigabytes of RAM) or re-sorting an array after every arrival ($O(N \log N)$), this solution uses a **Self-Balancing AVL Tree**:

Each node stores an active interval:
```c
typedef struct Node {
    package_id_t start;
    package_id_t end;
    int height;
    struct Node *left;
    struct Node *right;
} Node;
```

When an ID $x$ arrives:
1. **Duplicate Check**: If $x \in [\text{start}, \text{end}]$, return `ARRIVAL_DUPLICATE`.
2. **Bridge Merge**: If $x$ bridges the predecessor's end (`pred->end + 1 == x`) and successor's start (`x + 1 == succ->start`), the intervals fuse and the redundant node is removed and rebalanced in $O(\log K)$.
3. **Extend Left / Right**: If $x == \text{succ}->\text{start} - 1$ or $x == \text{pred}->\text{end} + 1$, the boundary is expanded.
4. **New Interval**: If isolated, a new node `[x, x]` is inserted and tree balance is restored via standard AVL rotations.

---

## File Structure

- `warehouse.h`: Public C interface, data types (`package_id_t`, `Interval`, `ArrivalResult`), and function declarations.
- `warehouse.c`: Self-balancing AVL tree core engine implementing dynamic interval tracking, rotations, bridge merges, and gap queries.
- `main.c`: Automated demonstration (illustrative sequence `[1, 3, 7, 2, 6]`, bridge merge, sparse IDs up to $10^9$) and interactive CLI mode.
- `test.c`: Comprehensive test suite verifying bridge merges, extensions, duplicates, and bounded queries.
- `Makefile`: Build configuration for compilation, testing, and cleaning.

---

## Build & Run

### Prerequisites
- GCC or Clang with C11 support (`-std=c11`)
- GNU Make

### 1. Compile the Project
```bash
make
```

### 2. Run the Demonstration
Executes the illustrative example, bridge merge showcase, and large sparse ID report:
```bash
./warehouse
```

**Sample Output:**
```text
=== 1. Illustrative Example [1, 3, 7, 2, 6] ===
Arrival  1 -> CREATED        | Intervals: [[1, 1]]
Arrival  3 -> CREATED        | Intervals: [[1, 1], [3, 3]]
Arrival  7 -> CREATED        | Intervals: [[1, 1], [3, 3], [7, 7]]
Arrival  2 -> BRIDGED        | Intervals: [[1, 3], [7, 7]]
Arrival  6 -> EXTENDED_LEFT  | Intervals: [[1, 3], [6, 7]]

Window [1, 7]:
  Received : [[1, 3], [6, 7]]
  Missing  : [[4, 5]]

=== 2. Bridge Merge Demo ===
Before 106 arrives: [[100, 105], [107, 115]]
After 106 arrives  (BRIDGED): [[100, 115]]
-> Intervals [100, 105] and [107, 115] fused into single interval [100, 115].

=== 3. Sparse Large IDs (0 to 10^9) ===
Sparse intervals: [[0, 0], [42, 42], [1000000, 1000000], [500000000, 500000000], [999999999, 1000000000]]
Memory: uses 5 nodes (200 bytes) instead of gigabytes.
```

### 3. Run Automated Tests
```bash
make test
```

### 4. Interactive Mode
Run live input queries in terminal:
```bash
./warehouse interactive
```

**Commands in Interactive Mode:**
- `add <id>`: Add a package ID (e.g. `add 42`)
- `intervals`: Print all current consecutive intervals
- `report <low> <high>`: Report received intervals and missing gaps in `[low, high]`
- `contains <id>`: Check if an ID has been received
- `clear`: Reset all intervals
- `quit`: Exit
