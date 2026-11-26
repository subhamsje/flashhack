# System Architecture Specification — Live Arrival Index

## 1. Executive Summary & Problem Domain
The **Live Arrival Index** is an advanced warehouse package indexing, analytics, and visualization engine engineered in C. In high-throughput logistics terminals, incoming package IDs arrive out of order, in fragmented batches, and across vast integer ranges up to $10^9$. 

Traditional dense allocation approaches (such as bitsets or direct index arrays) fail catastrophically in this problem domain, demanding gigabytes of memory for sparse deliveries ($O(\text{MAX\_ID})$ space). Conversely, maintaining unsorted arrival logs forces $O(N)$ lookup and $O(N \log N)$ sorting bottlenecks.

The Live Arrival Index solves this by modelling all received package IDs as an **AVL Interval Tree** of sorted, non-overlapping, non-adjacent intervals $[start\_id, end\_id]$. 

---

## 2. Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                            INTERACTIVE WEB DASHBOARD                              |
|   10 Workspaces: Overview, Live Arrival, Intervals, Gaps, AVL Tree, Search,       |
|                  Analytics, Persistence, Performance Lab, Testing Lab             |
|   Visualizers: Virtualized Number-Line Canvas, Interactive SVG AVL Tree, Charts   |
+-----------------------------------------+-----------------------------------------+
                                          |
                                HTTP REST / JSON API (Port 8080)
                                          |
+-----------------------------------------v-----------------------------------------+
|                         C EMBEDDED HTTP ENGINE (src/api)                          |
|   - Multi-client Winsock2 / POSIX TCP Socket Server                               |
|   - Fast HTTP/1.1 Request Parser with Content-Length Buffering                    |
|   - Static Asset Dispatcher (HTML5, CSS3, ES6 JS, SVG)                            |
|   - REST API Route Dispatcher & JSON Serializer                                   |
+--------------------+--------------------+--------------------+--------------------+
                     |                    |                    |
+--------------------v----+  +------------v-------+  +---------v----------+
|  STANDALONE C CLI MAIN  |  | STORAGE & HISTORY  |  | BENCHMARK ENGINE   |
|  - Interactive Shell    |  | - CSV Import/Export|  | - High-Res Timing  |
|  - ASCII Tree Renderer  |  | - Binary Versioned |  | - 7 Workload Models|
|  - Batch & Query Mode   |  |   Save / Restore   |  | - Baseline Compare |
+--------------------+----+  +------------+-------+  +---------+----------+
                     |                    |                    |
+--------------------v--------------------v--------------------v--------------------+
|                       AUTHORITATIVE C AVL INTERVAL ENGINE                         |
|                                                                                   |
|  +-----------------------+  +-----------------------+  +-----------------------+  |
|  |      avl_tree.c       |  |      insertion.c      |  |       search.c        |  |
|  | - AVL Rotations       |  | - Duplicate Detection |  | - Bounded Overlaps    |  |
|  |   (LL, RR, LR, RL)    |  | - Left/Right Extension|  | - Proximity & Closest |  |
|  | - Invariant Checks    |  | - Atomic Bridge Merge |  | - Extremum Intervals  |  |
|  +-----------------------+  +-----------------------+  +-----------------------+  |
|                                                                                   |
|  +-----------------------+  +-----------------------+  +-----------------------+  |
|  |    gap_analysis.c     |  |      analytics.c      |  |      interval.c       |  |
|  | - Missing Range Intel |  | - Real-time KPI Stats |  | - Interval Geometry   |  |
|  | - Coverage Calculation|  | - Rotation Counters   |  | - Boundary Math       |  |
|  +-----------------------+  +-----------------------+  +-----------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 3. Data Structures & Invariants

### 3.1 Node Representation
Each node in the AVL tree represents an inclusive consecutive package interval:

```c
typedef struct AVLNode {
    int64_t start_id;          // Starting package ID (inclusive) - BST Key
    int64_t end_id;            // Ending package ID (inclusive)
    int height;                // 1 + max(height(left), height(right))
    int64_t subtree_count;     // Total unique packages in this subtree
    int subtree_nodes;         // Total interval nodes in this subtree
    int64_t max_id;            // Maximum package ID reachable in subtree
    struct AVLNode *left;      // Left child (strictly smaller keys)
    struct AVLNode *right;     // Right child (strictly larger keys)
} AVLNode;
```

### 3.2 Formal Tree Invariants
1. **Sorted Ordering**: For every node $N$, $\forall L \in \text{Subtree}(N.left), L.start\_id < N.start\_id$ and $\forall R \in \text{Subtree}(N.right), R.start\_id > N.start\_id$.
2. **Disjointness**: For any two distinct nodes $A$ and $B$, $A \cap B = \emptyset$. Specifically, if $A.start\_id < B.start\_id$, then $A.end\_id < B.start\_id$.
3. **Non-Adjacency**: No two intervals are unmerged if adjacent: $A.end\_id + 1 < B.start\_id$.
4. **Strict AVL Balance**: For every node $N$, the balance factor $\text{bf}(N) = h(N.left) - h(N.right)$ satisfies $\text{bf}(N) \in \{-1, 0, +1\}$.
5. **Memory Independence**: Memory consumption is strictly $O(K)$ where $K$ is the number of contiguous intervals, completely independent of the maximum package ID ($10^9+$).

---

## 4. Module Boundaries & Responsibilities

| Module | Files | Responsibility |
|---|---|---|
| **Core Tree** | `avl_tree.h`, `avl_tree.c` | Node allocation, rotations (LL, RR, LR, RL), balancing, height calculation, subtree metadata maintenance, invariant verification, JSON tree serialization. |
| **Interval Logic** | `interval.h`, `interval.c` | Geometric interval functions (contains, adjacent_left, adjacent_right, overlaps, compare). |
| **Arrival Engine** | `insertion.h`, `insertion.c` | Incremental package ingestion, duplicate detection, boundary extension, bridge merge coordination, detailed step-by-step inspector trace generation. |
| **Search Engine** | `search.h`, `search.c` | Package lookup, proximity searching, nearest predecessor/successor, bounded range clipping, extreme interval queries. |
| **Gap Intelligence** | `gap_analysis.h`, `gap_analysis.c` | Missing range calculation over arbitrary $[L, R]$, gap size sorting, threshold filtering, arrival coverage percentage, operational text reports. |
| **Warehouse Analytics**| `analytics.h`, `analytics.c` | Real-time KPI aggregation, rotation statistics, interval and gap distributions, JSON serialization. |
| **Arrival History** | `history.h`, `history.c` | Dynamic chronological log of arrival events, before-and-after states, query filters. |
| **Storage & Persistence**| `storage.h`, `csv_import.c`, `csv_export.c`, `persistence.c` | Robust CSV parsing, versioned binary file serialization with Fletcher checksum validation. |
| **Benchmarking** | `benchmark.h`, `benchmark.c` | Microsecond timing (QPC/clock_gettime), 7 arrival patterns, sorted-array baseline comparison. |
| **HTTP Server & API** | `http_server.h`, `http_server.c`, `api_handlers.h`, `api_handlers.c` | Socket listening, HTTP 1.1 request/response handling, REST endpoint dispatching, static asset delivery. |
| **Standalone CLI** | `main.c` | Interactive command prompt, ASCII tree visualization, batch query execution. |

---

## 5. Memory Management & Safety Policies
1. **Dynamic Pointer Discipline**: No raw unmanaged pointer arithmetic across module boundaries.
2. **Deterministic Cleanup**: All tree allocations are freed via `avl_destroy` and `avl_clear`.
3. **No Buffer Overflows**: All string and header operations utilize bounded formatting (`snprintf`, `sizeof`).
4. **Deserialization Validation**: Stored binary files verify a 4-byte magic signature (`LAIX`), schema version, payload checksum, and run full invariant validation before accepting state into memory.
