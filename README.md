# Flashhack — Warehouse Live Arrival Index & Gap Monit

An end-to-end, high-performance solution for **Problem Statement 09: The Warehouse's Broken Number Ranges** (Problem Domain: *Balanced Searching and Ordered Indexing*).

Tracks package deliveries arriving in arbitrary, out-of-order sequence and maintains them incrementally as compact, sorted, non-overlapping consecutive intervals (`[start, end]`). Also evaluates received intervals and missing number gaps within any bounded query window `[low, high]`.

Includes a **C11 high-performance AVL Engine**, an **Interactive React & Tailwind Web Dashboard**, a **Live Supabase Cloud Sync Engine**, and an **Android Mobile APK Companion**.

---

## 🚀 Live Demo & Mobile Access
- **Web Dashboard (Live)**: [https://subhamsje.github.io/flashhack/](https://subhamsje.github.io/flashhack/)
- **Mobile APK**: Standalone Android APK available in the repo root / downloads (`Warehouse.apk`).

---

## 🌟 Key Features

### 1. High-Performance Incremental Maintenance
- **Arbitrary Arrival Order**: Accepts non-negative package IDs ($0$ to $10^9$) arriving in random sequence.
- **Logarithmic Complexity**: Inserts and updates ranges in $O(\log K)$ time (where $K$ is the number of active disjoint intervals) without re-sorting the whole dataset.
- **Bridge Merging**: Dynamically fuses two disjoint intervals when a missing connecting ID arrives (e.g., $[1, 3]$ and $[6, 7]$ fuse into $[1, 7]$ upon arrival of $4$ and $5$).
- **Boundary Extension**: Expands interval boundaries to the left or right when adjacent IDs arrive.
- **Duplicate Resilience**: Gracefully ignores duplicate deliveries in $O(\log K)$ without mutating existing intervals.
- **Sparse ID Memory Efficiency**: Employs an AVL tree and coordinate tracking. Handles IDs up to $10^9$ with $O(K)$ space complexity (uses kilobytes instead of gigabytes for flat arrays or bitsets).

### 2. Multi-Platform Ecosystem
- **C Core Engine**: Native C11 self-balancing AVL Tree engine with tree rotations, bridge merges, and bounded gap evaluators.
- **Modern Web Dashboard**: Multi-page React, Vite, TypeScript, and Tailwind CSS app featuring:
  - *Page 1: Landing Page* with interactive bridge-merge simulator.
  - *Page 2: Live Arrival Index* with interactive SVG AVL tree visualization.
  - *Page 3: Range Analysis* with interval density charts and bounded gap reporting.
  - *Page 4: About the Algorithm* with formal complexity proofs.
- **Supabase Cloud Sync**: Real-time WebSocket synchronization across mobile devices and central web dashboards.
- **Mobile App**: Responsive PWA / Android APK for warehouse workers to log package arrivals directly from the floor.

---

## 🏗️ Algorithmic Design & Architecture

### Self-Balancing AVL Tree Engine (C Core)
Instead of allocating a flat 4GB bitset up to $10^9$ or re-sorting an array after every arrival ($O(N \log N)$), each node in our AVL tree stores an active disjoint interval:

```c
typedef struct Node {
    package_id_t start;
    package_id_t end;
    int height;
    struct Node *left;
    struct Node *right;
} Node;
```

When package ID $x$ arrives:
1. **Duplicate Check**: If $x \in [\text{start}, \text{end}]$, return `ARRIVAL_DUPLICATE`.
2. **Bridge Merge**: If $x$ bridges the predecessor's end (`pred->end + 1 == x`) and successor's start (`x + 1 == succ->start`), the intervals fuse and the redundant node is removed and rebalanced in $O(\log K)$.
3. **Extend Left / Right**: If $x == \text{succ}->\text{start} - 1$ or $x == \text{pred}->\text{end} + 1$, the boundary is expanded.
4. **New Interval**: If isolated, a new node `[x, x]` is inserted and tree balance is restored via standard AVL rotations.

---

## 📁 Repository Structure

```
flashhack/
├── core/ & warehouse.c / .h     # Native C11 AVL Tree interval engine
├── main.c & test.c              # C demo & unit test suite
├── Makefile                     # Build scripts for C engine
├── frontend/                    # React + Vite + Tailwind + Lucide web app
│   ├── src/pages/               # Landing, Live Arrival, Range Analysis, Algorithm
│   ├── src/services/            # Warehouse API & Supabase integration
│   └── dist/                    # Compiled production assets
├── mobile-app/                  # React Native / Expo mobile project
├── apk-app/                     # Native Android project with Capacitor
├── supabase/                    # PostgreSQL schemas, migrations, and RLS policies
├── index.html & assets/         # Deployed web app bundle (GitHub Pages root)
├── Warehouse.apk                # Standalone Android APK for mobile devices
└── README.md                    # Project documentation
```

---

## 🛠️ Build & Execution Guide

### 1. Run the C Core Engine
Compile and run the native C benchmark and demonstration:

```bash
# Compile
make

# Run Demo (illustrative example [1, 3, 7, 2, 6], bridge merges, sparse IDs)
./warehouse

# Run Unit Tests
make test

# Interactive Terminal REPL
./warehouse interactive
```

### 2. Run the Web Dashboard Locally
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

### 3. Run the Mobile App
```bash
cd mobile-app
npm install
npx expo start
```
Scan the QR code with **Expo Go** on Android or iOS.

---

## 📊 Illustrative Walkthrough

### Example Sequence: `[1, 3, 7, 2, 6]`
```text
Arrival  1 -> CREATED        | Intervals: [[1, 1]]
Arrival  3 -> CREATED        | Intervals: [[1, 1], [3, 3]]
Arrival  7 -> CREATED        | Intervals: [[1, 1], [3, 3], [7, 7]]
Arrival  2 -> BRIDGED        | Intervals: [[1, 3], [7, 7]]
Arrival  6 -> EXTENDED_LEFT  | Intervals: [[1, 3], [6, 7]]

Query Window [1, 7]:
  Received : [[1, 3], [6, 7]]
  Missing  : [[4, 5]]
```

### Bridge Merge Demonstration:
```text
Before 106 arrives : [[100, 105], [107, 115]]
After 106 arrives  : [[100, 115]]  (BRIDGED)
-> Two disjoint intervals fused into one contiguous block in O(log K) time!
```
