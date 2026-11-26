# FLASHHACK — Live Arrival Index & Warehouse Operations Platform

> **Advanced C Implementation & 10-Workspace System in `new/`**  
> The standalone C-based AVL Interval Tree system, embedded C HTTP server, 10-workspace web dashboard, automated test suite, benchmarks, and academic deliverables are located in the [**`new/`**](new/) directory. See [**`new/README.md`**](new/README.md) for details.

A complete, high-performance warehouse logistics intelligence platform designed to solve **Problem Statement 09: The Warehouse's Broken Number Ranges** (Problem Domain: Balanced Searching and Ordered Indexing).

FLASHHACK tracks package numbers arriving in arbitrary, out-of-order sequence and maintains them incrementally as compact, sorted, non-overlapping consecutive intervals `[start, end]`. Also queries received intervals and missing number ranges (gaps) within any bounded query window `[low, high]` with sub-microsecond latency.

---

## 🏗 Multi-Platform Architecture

```
                  ┌──────────────────────────────────────────────┐
                  │          React 19 + TypeScript + Vite         │
                  │   Tailwind CSS • Framer Motion • Lucide UI   │
                  └──────────────┬───────────────────────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              ▼                                     ▼
┌───────────────────────────┐         ┌───────────────────────────┐
│     Authoritative C11     │         │    Supabase PostgreSQL    │
│    AVL Interval Engine    │         │      RLS & Realtime       │
│  HTTP REST JSON Service   │         │ Multi-Tenant Persistence  │
└───────────────────────────┘         └───────────────────────────┘
```

1. **Authoritative In-Memory C Engine**: Self-balancing AVL tree where every node represents a disjoint interval `[start, end]`.
   - **Boundary Extensions**: Merges adjacent packages into existing intervals in $O(\log K)$ time.
   - **Bridge Merges**: Joins two separated intervals upon receiving the connecting missing package and immediately reclaims memory.
   - **Sparse Scale**: Supports IDs between $0$ and $10^9$ using strictly $O(K)$ space instead of naive 4GB tables.
2. **Supabase PostgreSQL & Security**:
   - Multi-tenant Row-Level Security (RLS) isolating warehouses, sessions, and packages.
   - Real-time event streaming across floor operators and supervisor dashboards.
3. **Web Application & Visualizations**:
   - Editorial logistics visual design (off-white, forest green, muted amber, charcoal).
   - Interactive algorithm demonstrations, live AVL tree explorers, and bounded gap range analyzers.
4. **Mobile App**:
   - React Native / Expo mobile app for floor operators with barcode scanner support.

---

## 🚀 Quick Start

### 1. Build & Run the C Engine HTTP Service

```bash
# Compile core engine, HTTP server, and CLI tools
make all

# Run automated C unit and integration tests
make test

# Start the C HTTP REST engine on port 8080
./server/warehouse_server 8080
```

### 2. Run the React Web Application

```bash
cd frontend
npm install
npm run dev
```

Open your browser at `http://localhost:3000` to access the interactive landing page and operator workspaces.

---

## 🧪 Verification & Benchmarks

The authoritative C engine was tested against 50,000 package IDs in random order with clustered bursts:

- **Ingestion Throughput**: > 7,370,000 operations per second.
- **Latency**: ~ 140 nanoseconds average per insertion.
- **Memory**: Proportional to disjoint ranges $O(K)$, saving 99.9% memory compared to flat arrays.
- **Bounded Window Queries**: $O(\log K + M)$ subtree-pruned gap searches.

---

## 📂 Repository Structure

- `core/`: Authoritative C AVL tree and interval index implementation.
- `server/`: High-performance multithreaded C HTTP JSON REST API server.
- `cli/`: Command-line inspection and demonstration tool.
- `frontend/`: React 19, TypeScript, Tailwind, and Framer Motion web platform.
- `mobile/`: React Native / Expo handheld scanner application.
- `supabase/`: PostgreSQL schema migrations, RLS policies, and seed data.
- `tests/`: Automated unit and API test suites.
