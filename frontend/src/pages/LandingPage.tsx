import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  GitCommit,
  Activity,
  Maximize2,
  Box,
  Database,
  Terminal,
  Cpu,
  Search,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { InteractiveHeroDemo } from '../components/InteractiveHeroDemo';

export const LandingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'problem' | 'solution' | 'architecture'>('solution');

  return (
    <div className="min-h-screen bg-background text-ink selection:bg-accent selection:text-ink">
      {/* 1. Header / Navigation */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white font-mono font-bold text-sm shadow">
              FH
            </div>
            <div className="flex flex-col">
              <span className="font-mono font-bold tracking-tight text-sm text-ink">FLASHHACK</span>
              <span className="text-[10px] font-mono text-ink-muted uppercase tracking-widest">Live Arrival Index</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-muted">
            <a href="#problem" className="hover:text-primary transition">Problem Domain</a>
            <a href="#how-it-works" className="hover:text-primary transition">AVL Architecture</a>
            <a href="#capabilities" className="hover:text-primary transition">Capabilities</a>
            <a href="#benchmarks" className="hover:text-primary transition">Benchmarks</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/app"
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded font-medium text-sm transition shadow-sm flex items-center gap-1.5"
            >
              Launch Console <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="pt-16 pb-20 px-6 max-w-7xl mx-auto border-b border-border">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border text-xs font-mono text-ink-muted">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Problem Statement 09: Broken Number Ranges
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-ink leading-[1.12]">
              Every arrival accounted for. <br />
              <span className="italic text-primary">Every gap visible.</span>
            </h1>

            <p className="text-lg text-ink-muted leading-relaxed font-sans max-w-xl">
              Warehouse logistics platform powered by a self-balancing C AVL interval engine.
              Tracks out-of-order package arrivals as sorted, consecutive non-overlapping ranges with sub-microsecond latency.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/app"
                className="px-6 py-3.5 bg-primary hover:bg-primary-dark text-white rounded font-medium text-base transition shadow flex items-center gap-2"
              >
                Access Warehouse Console <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#demo"
                className="px-5 py-3.5 bg-surface hover:bg-surface-muted text-ink border border-border rounded font-medium text-base transition"
              >
                View Live Algorithm
              </a>
            </div>

            <div className="pt-4 flex items-center gap-6 text-xs font-mono text-ink-muted">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" /> O(log K) Operations
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" /> O(K) Space vs 4GB
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" /> IDs Up to 10⁹
              </div>
            </div>
          </div>

          <div id="demo" className="lg:col-span-6">
            <InteractiveHeroDemo />
          </div>
        </div>
      </section>

      {/* 3. Metrics Strip */}
      <section className="bg-surface border-b border-border py-8">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-ink-muted">Indexing Throughput</div>
            <div className="text-2xl font-serif font-bold text-ink mt-1">7,370,000+</div>
            <div className="text-xs text-primary font-mono mt-0.5">0.14 µs per package arrival</div>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-ink-muted">ID Space Capacity</div>
            <div className="text-2xl font-serif font-bold text-ink mt-1">0 to 1,000,000,000</div>
            <div className="text-xs text-ink-muted font-mono mt-0.5">Widely spaced sparse numbers</div>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-ink-muted">Memory Footprint</div>
            <div className="text-2xl font-serif font-bold text-ink mt-1">~1.6 MB</div>
            <div className="text-xs text-primary font-mono mt-0.5">vs 4.0 GB flat array (99.9% saved)</div>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-ink-muted">Data Engine</div>
            <div className="text-2xl font-serif font-bold text-ink mt-1">C11 + PostgreSQL</div>
            <div className="text-xs text-ink-muted font-mono mt-0.5">Authoritative AVL core + Supabase RLS</div>
          </div>
        </div>
      </section>

      {/* 4. Problem vs Solution Editorial Comparison */}
      <section id="problem" className="py-20 px-6 max-w-7xl mx-auto border-b border-border">
        <div className="max-w-2xl mb-12">
          <span className="text-xs font-mono uppercase tracking-widest text-accent-secondary font-semibold">The Logistics Bottleneck</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-ink mt-2">
            Out-of-Order Deliveries Fracture Consecutive Ranges
          </h2>
          <p className="text-ink-muted text-base mt-3">
            In modern parcel hubs, trucks arrive haphazardly. Recording individual package IDs produces bloated lists that waste gigabytes and hide whether consecutive purchase orders are fulfilled.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="p-8 rounded-xl bg-surface border border-border shadow-sm">
            <span className="text-xs font-mono uppercase tracking-wider text-danger font-semibold">Naive / Traditional Tracking</span>
            <h3 className="font-serif text-xl font-medium text-ink mt-2">Flat ID Lists or Full Re-Sorting</h3>
            <div className="mt-4 p-4 bg-surface-muted rounded-lg font-mono text-sm space-y-2">
              <div className="text-xs text-ink-muted">Arrival order:</div>
              <div className="text-ink font-semibold">[1, 3, 7, 2, 6]</div>
              <div className="text-xs text-ink-muted pt-2">Flat array memory for 10⁹ IDs:</div>
              <div className="text-danger font-bold">4.0 Gigabytes RAM</div>
            </div>
            <ul className="mt-6 space-y-2.5 text-sm text-ink-muted">
              <li className="flex items-center gap-2">✕ Re-sorting all IDs takes O(N log N) every arrival</li>
              <li className="flex items-center gap-2">✕ Bitsets for sparse IDs waste over 125 MB of memory</li>
              <li className="flex items-center gap-2">✕ Missing gaps require expensive linear table scans</li>
            </ul>
          </div>

          <div className="p-8 rounded-xl bg-primary/5 border border-primary/20 shadow-sm">
            <span className="text-xs font-mono uppercase tracking-wider text-primary font-semibold">FLASHHACK Live Arrival Index</span>
            <h3 className="font-serif text-xl font-medium text-ink mt-2">Self-Balancing Consecutive Intervals</h3>
            <div className="mt-4 p-4 bg-surface rounded-lg font-mono text-sm space-y-2 border border-primary/20">
              <div className="text-xs text-ink-muted">Maintained compact intervals:</div>
              <div className="text-primary font-bold">[[1, 3], [6, 7]]</div>
              <div className="text-xs text-ink-muted pt-2">Bounded missing range within [1, 7]:</div>
              <div className="text-accent-secondary font-bold">[[4, 5]]</div>
            </div>
            <ul className="mt-6 space-y-2.5 text-sm text-ink-muted">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Guaranteed O(log K) insertion & bridge merging</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Strictly O(K) nodes — memory freed upon merge</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Window gap queries pruned in O(log K + M) time</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5. Core Capabilities */}
      <section id="capabilities" className="py-20 px-6 max-w-7xl mx-auto border-b border-border">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-mono uppercase tracking-widest text-primary font-semibold">Engine Capabilities</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-ink mt-2">
            Built for High-Throughput Freight Operations
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Zap,
              title: 'Bridge Merge Automation',
              desc: 'When an unseen ID connects two disjoint ranges (e.g. 106 joining [100, 105] and [107, 115]), they fuse seamlessly into [100, 115] and redundant tree nodes are freed.'
            },
            {
              icon: Search,
              title: 'Missing Range Intelligence',
              desc: 'Inspect gaps inside any arbitrary window [low, high]. Subtree-pruned queries pinpoint exactly what purchase orders or batches remain missing.'
            },
            {
              icon: Cpu,
              title: 'Sub-Microsecond C11 Core',
              desc: 'Implemented in pure C11 with height-balanced AVL rotations. Insertion and lookups take less than 150 nanoseconds per package arrival.'
            },
            {
              icon: Database,
              title: 'Supabase PostgreSQL RLS',
              desc: 'Complete multi-tenant isolation, session audit timelines, snapshot history, and role-based permissions per warehouse terminal.'
            },
            {
              icon: Activity,
              title: 'Realtime Terminal Sync',
              desc: 'Arrivals entered on bay floor handhelds automatically trigger C index updates and publish instantaneous live changes across supervisor displays.'
            },
            {
              icon: Lock,
              title: 'Sparse 10⁹ ID Handling',
              desc: 'Easily accommodates massive sparse tracking numbers without allocating index arrays up to the largest ID.'
            }
          ].map((item, i) => (
            <div key={i} className="p-6 bg-surface border border-border rounded-xl hover:border-primary/40 transition">
              <div className="w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center text-primary mb-4">
                <item.icon className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-ink">{item.title}</h3>
              <p className="text-sm text-ink-muted mt-2 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="bg-surface py-12 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-primary text-white flex items-center justify-center font-mono font-bold text-xs">FH</div>
            <span className="font-mono text-sm font-semibold text-ink">FLASHHACK</span>
            <span className="text-xs text-ink-muted">© 2026 Logistics Intelligence Platform</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-ink-muted font-mono">
            <a href="https://github.com/subhamsje/flashhack" target="_blank" rel="noreferrer" className="hover:text-ink">GitHub Repository</a>
            <Link to="/app" className="hover:text-primary font-semibold">Launch Console</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
