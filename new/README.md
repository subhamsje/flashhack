# Live Arrival Index — Advanced Warehouse Package Management & Analytics System

[![C11](https://img.shields.io/badge/Language-C11-00599C.svg?style=flat-square&logo=c)](https://en.wikipedia.org/wiki/C11_(C_standard_revision))
[![Data Structure](https://img.shields.io/badge/Data%20Structure-AVL%20Interval%20Tree-10b981.svg?style=flat-square)](docs/ALGORITHMS_AND_ANALYSIS.md)
[![Build](https://img.shields.io/badge/Build-Passing%20(GCC%2FMinGW)-brightgreen.svg?style=flat-square)](Makefile)
[![Tests](https://img.shields.io/badge/Tests-9%2F9%20Passing-brightgreen.svg?style=flat-square)](tests/)
[![Architecture](https://img.shields.io/badge/Architecture-Modular%20C%20Engine-6366f1.svg?style=flat-square)](docs/ARCHITECTURE.md)

> **Academic Problem Statement**: *The Warehouse's Broken Number Ranges*  
> **Problem Domain**: *Balanced Searching and Ordered Indexing*  
> **Primary Technology**: Standard C Engine + High-Performance Embedded HTTP Server + 10-Workspace Operations Dashboard.

---

## 1. Project Overview

In massive logistics hubs and automated distribution centers, courier trucks deliver millions of parcels with arbitrarily ordered IDs up to $10^9$. Storing arrivals in dense bitsets or arrays requires prohibitive memory ($O(\text{MAX\_ID})$), while flat unsorted arrival logs introduce unacceptable search penalties ($O(N)$).

The **Live Arrival Index** solves this fundamental algorithmic challenge by organizing received package IDs into an **AVL Interval Tree** of sorted, non-overlapping, non-adjacent closed intervals $[start\_id, end\_id]$. 

### Key Capabilities
- **True AVL Interval Tree in C**: Strictly balanced tree ($|bf| \le 1$) representing consecutive package runs with zero dense memory allocation.
- **Dynamic Incremental Insertion**: Ingests package IDs in $O(\log K)$ time, automatically distinguishing between new isolated intervals, left/right extensions, duplicates, and bridge merges.
- **Atomic Bridge Merging**: Seamlessly unifies adjacent disjoint intervals when a connecting package ID arrives (e.g., $[10, 12]$ and $[14, 20]$ merged into $[10, 20]$ upon arrival of $13$).
- **Missing-Range Intelligence**: Computes broken number ranges across arbitrary boundaries $[L, R]$, reporting largest/smallest gaps, size-sorted gap breakdowns, and arrival coverage percentages.
- **Real-Time Analytics Engine**: Aggregates dynamic metrics (global span coverage, average interval size, isolated package count, rotation distribution) calculated from live C data.
- **Integrated High-Performance C Web Server**: Built-in HTTP 1.1 socket server serving REST API endpoints and a professional 10-workspace logistics dashboard.
- **Standalone Command-Line Interface (CLI)**: Full interactive shell and scriptable CLI with ASCII tree rendering, CSV import/export, and binary persistence.
- **Microsecond Benchmarking Suite**: Measures insertion, search, and gap queries across 7 distribution patterns up to 50,000 package IDs, with comparative speedup over sorted-array baselines.

---

## 2. System Architecture

```
new/
├── include/
│   ├── avl_tree.h         # Core AVL tree definitions, node metadata, rotations
│   ├── interval.h         # Geometric interval math [start_id, end_id]
│   ├── insertion.h        # Incremental package arrival engine & step traces
│   ├── search.h           # Bounded range queries, nearest neighbours & proximity
│   ├── gap_analysis.h     # Missing-range intelligence & gap analysis reports
│   ├── analytics.h        # Warehouse KPI calculations & JSON formatters
│   ├── history.h          # Chronological arrival event log & filters
│   ├── storage.h          # CSV import/export & versioned binary persistence
│   ├── benchmark.h        # High-resolution benchmark suite & baseline comparison
│   ├── api_handlers.h     # REST API route dispatcher & JSON serialization
│   ├── http_server.h      # Embedded multi-client C HTTP/1.1 socket server
│   └── test_common.h      # Automated testing framework & assertion macros
├── src/
│   ├── core/              # Authoritative C engine implementations
│   ├── history/           # History event recording
│   ├── storage/           # CSV parsers and Fletcher-checksum persistence
│   ├── benchmark/         # Performance benchmarking implementation
│   ├── api/               # HTTP server & REST route handlers
│   └── cli/               # Standalone interactive CLI application
├── tests/                 # Automated test suite (Rotations, Merges, Sparse IDs, 50k Stress)
├── web/                   # Professional 10-Workspace Web Dashboard
│   ├── index.html         # Single-page warehouse operations dashboard
│   ├── css/style.css      # Custom dark theme & responsive layout
│   └── js/                # Visualizers (AVL Tree SVG, Number Line Canvas, Charts)
├── data/                  # Sample CSV datasets and persistence files
├── docs/                  # Academic documentation & viva questions
│   ├── ARCHITECTURE.md
│   ├── ALGORITHMS_AND_ANALYSIS.md
│   └── VIVA_QUESTIONS.md
├── Makefile               # Complete build orchestration
└── README.md
```

---

## 3. Core Data Structure & Complexity

Each node in the AVL tree maintains:

```c
typedef struct AVLNode {
    int64_t start_id;          // Starting package ID (inclusive) - BST Key
    int64_t end_id;            // Ending package ID (inclusive)
    int height;                // 1 + max(height(left), height(right))
    int64_t subtree_count;     // Total unique packages in this subtree
    int subtree_nodes;         // Total interval nodes in this subtree
    int64_t max_id;            // Maximum package ID reachable in subtree
    struct AVLNode *left;      // Left child
    struct AVLNode *right;     // Right child
} AVLNode;
```

### Algorithmic Invariants
1. **Sorted Ordering**: Keys are strictly ordered by `start_id`.
2. **Disjointness**: No intervals overlap ($e_i < s_{i+1}$).
3. **Non-Adjacency**: Adjacent intervals are always merged ($e_i + 1 < s_{i+1}$).
4. **Strict AVL Balance**: For every node $N$, balance factor $\in \{-1, 0, 1\}$.
5. **Memory Independence**: Memory consumption is strictly $\mathcal{O}(K)$ where $K$ is the number of intervals, completely independent of whether package IDs reach $10^9$.

| Operation | Time Complexity | Space Complexity |
|---|---|---|
| Single Package Ingestion | $\mathcal{O}(\log K)$ | $\mathcal{O}(1)$ |
| Duplicate Detection | $\mathcal{O}(\log K)$ | $\mathcal{O}(1)$ |
| Bridge Merge | $\mathcal{O}(\log K)$ | $\mathcal{O}(1)$ |
| Bounded Range Query $[L, R]$ | $\mathcal{O}(\log K + M)$ | $\mathcal{O}(M)$ |
| Missing-Range Gap Calculation | $\mathcal{O}(\log K + G)$ | $\mathcal{O}(G)$ |
| Nearest Package / Proximity | $\mathcal{O}(\log K)$ | $\mathcal{O}(1)$ |

---

## 4. Build and Execution Instructions

### Prerequisites
- GCC / MinGW-w64 (`gcc` 7.0+)
- `mingw32-make` or `make`

### 4.1 Compile All Targets
```bash
cd new
mingw32-make all
```

### 4.2 Run Automated Tests
```bash
cd new
mingw32-make test
# or directly:
./bin_test.exe
```

Test Output:
```
====================================================================
     LIVE ARRIVAL INDEX - AUTOMATED C ENGINE TEST SUITE             
====================================================================
Running test_avl_rotations_and_balancing... PASSED
Running test_avl_predecessor_successor... PASSED
Running test_interval_insertion_and_extension... PASSED
Running test_gap_analysis_and_coverage... PASSED
Running test_bridge_merge_basic... PASSED
Running test_bridge_merge_multi_alternating... PASSED
Running test_sparse_and_large_boundaries... PASSED
Running test_randomized_against_reference... PASSED
Running test_large_scale_50k_unique_ids... PASSED
====================================================================
TEST RESULTS: 9/9 PASSED (Failed: 0) in 63.00 ms
====================================================================
```

### 4.3 Run Standalone CLI
```bash
cd new
./live_arrival_cli.exe
```

Interactive CLI Commands:
- `add <id1> [id2 ...]`: Register package ID(s) and view step-by-step inspector trace.
- `show`: Display current sorted intervals and package counts.
- `tree`: Display the ASCII AVL interval tree with heights and balance factors.
- `search <id>`: Query package presence and closest neighbours.
- `range <min> <max>`: Query intervals clipped to boundary.
- `gaps <L> <R>`: Generate comprehensive missing-range gap analysis report.
- `stats`: Display warehouse KPIs, coverage, and AVL rotation statistics.
- `bench [pattern] [count]`: Run microsecond benchmark with baseline comparison.
- `import <filepath>`: Import packages from CSV file.
- `export <type> <filepath>`: Export data to CSV (`intervals`, `gaps`, `history`, `stats`).
- `save <file>` / `restore <file>`: Persist and load binary index state.

### 4.4 Start Embedded HTTP Server & Web Dashboard
```bash
cd new
./live_arrival_server.exe 8080
```
Open your web browser and navigate to:  
👉 **`http://localhost:8080/`**

---

## 5. Professional Web Dashboard (10 Workspaces)

The frontend features 10 fully operational workspaces:
1. **Overview Dashboard**: High-level KPIs, arrival coverage %, interval summary, and operations donut chart.
2. **Live Arrival Workspace**: Individual and batch package registration with real-time **Operation Inspector** showing step-by-step C execution traces.
3. **Interval Explorer**: **Virtualized interactive number line** with pan/zoom and sorted interval data table.
4. **Missing Range Intelligence**: Bounded gap analysis over $[L, R]$, largest missing range, and gap breakdown table.
5. **AVL Tree Explorer**: **Interactive SVG tree visualization** rendering authoritative C engine nodes, balance factors, heights, and subtree package counts.
6. **Search & Query Workspace**: Package lookup, containing interval detection, and proximity analysis.
7. **Warehouse Analytics**: Live charts detailing AVL rebalancing rotations (LL, RR, LR, RL) and operational distributions.
8. **Data Management**: Binary snapshot save/restore with Fletcher-32 checksums, CSV exports, and chronological arrival event history.
9. **Performance Laboratory**: In-browser benchmark runner with 7 arrival patterns, high-resolution timings, and sorted-array baseline comparison.
10. **Testing Laboratory**: Interactive execution of automated C test suites with live pass/fail status pills.

---

## 6. Performance Benchmarks

Measured on AMD / Intel x86_64 architecture using high-resolution hardware counters (`QueryPerformanceCounter`):

| Dataset Scale (N) | Arrival Distribution | Total Insertion Time | Avg Time / Package | Final Tree Height | Rotations | Resulting Intervals |
|---|---|---|---|---|---|---|
| **100** | Random Uniform | 244.80 $\mu s$ | 2.45 $\mu s$ | 7 | 38 | 84 |
| **1,000** | Random Uniform | 3.73 $ms$ | 3.73 $\mu s$ | 12 | 458 | 874 |
| **10,000** | Random Uniform | 25.02 $ms$ | 2.50 $\mu s$ | 16 | 4,461 | 8,640 |
| **50,000** | Random Uniform | **60.61 $ms$** | **1.21 $\mu s$** | **19** | **22,175** | **43,073** |

---

## 7. Academic Deliverables & Documentation

- [System Architecture Specification](docs/ARCHITECTURE.md)
- [Algorithmic & Complexity Analysis](docs/ALGORITHMS_AND_ANALYSIS.md)
- [Viva Voce Technical Interview Questions & Answers](docs/VIVA_QUESTIONS.md)
