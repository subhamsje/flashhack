import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, GitBranch, Layers, Search, Cpu } from 'lucide-react';
import { BridgeMergeDemo } from '../components/BridgeMergeDemo';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-text flex flex-col selection:bg-accent selection:text-text">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white font-mono font-bold text-sm shadow-sm">
              FH
            </div>
            <span className="font-mono font-bold tracking-tight text-base text-text">FLASHHACK</span>
          </div>

          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-muted">
            <a href="#how-it-works" className="hover:text-primary transition">How It Works</a>
            <Link to="/app" className="hover:text-primary transition">Live Demo</Link>
            <Link to="/algorithm" className="hover:text-primary transition">Algorithm</Link>
            <Link to="/range-analysis" className="hover:text-primary transition">Range Analysis</Link>
          </nav>

          <Link
            to="/app"
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded text-sm font-medium transition shadow-sm flex items-center gap-1.5"
          >
            Launch Live Index <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6 max-w-6xl mx-auto border-b border-border">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border text-xs font-mono text-muted">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Problem Statement 09: Balanced Searching and Ordered Indexing
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight text-text leading-[1.15]">
            Every arrival has a place. <br />
            <span className="italic text-primary">Every missing number has a reason.</span>
          </h1>

          <p className="text-lg text-muted leading-relaxed font-sans">
            A live package indexing system that organizes out-of-order arrivals into consecutive ranges using balanced AVL trees.
          </p>

          <div className="flex items-center gap-4 pt-2">
            <Link
              to="/app"
              className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded text-base font-medium transition shadow-sm flex items-center gap-2"
            >
              Try Live Demo <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="px-5 py-3 bg-surface hover:bg-border/40 text-text border border-border rounded text-base font-medium transition"
            >
              Explore How It Works
            </a>
          </div>

          {/* Minimalist Range Visual */}
          <div className="pt-8">
            <div className="p-6 bg-surface border border-border rounded-xl font-mono text-xs space-y-4 shadow-sm">
              <div>
                <div className="text-[11px] font-semibold text-received uppercase tracking-wider mb-2">RECEIVED PACKAGE RANGES</div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 bg-received/10 border border-received/30 text-received font-bold rounded">
                    [1 ━━━ 3]
                  </span>
                  <span className="px-3 py-1.5 bg-received/10 border border-received/30 text-received font-bold rounded">
                    [6 ━━━ 7]
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-missing uppercase tracking-wider mb-2">MISSING BROKEN RANGE</div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 bg-missing/10 border border-dashed border-missing/40 text-missing font-bold rounded">
                    [4 ━ 5]
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Explanation Section */}
      <section className="py-16 px-6 max-w-6xl mx-auto border-b border-border">
        <div className="max-w-2xl mb-8">
          <span className="text-xs font-mono uppercase tracking-widest text-primary font-semibold">The Problem</span>
          <h2 className="font-serif text-3xl font-semibold text-text mt-1">Out-of-Order Delivery Ingestion</h2>
          <p className="text-muted text-sm mt-2">
            Deliveries arrive at warehouse bays in arbitrary sequence. Managers need a compact, ordered representation without listing individual IDs or sorting an array after every single arrival.
          </p>
        </div>

        <div className="p-6 bg-surface border border-border rounded-xl grid sm:grid-cols-3 gap-6 font-mono text-xs">
          <div>
            <span className="text-muted block mb-1">Incoming Packages:</span>
            <span className="font-bold text-text text-sm">1 → 3 → 7 → 2 → 6</span>
          </div>
          <div>
            <span className="text-muted block mb-1">Resulting Disjoint Ranges:</span>
            <span className="font-bold text-received text-sm">[1,3] [6,7]</span>
          </div>
          <div>
            <span className="text-muted block mb-1">Missing in [1, 7]:</span>
            <span className="font-bold text-missing text-sm">[4,5]</span>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 px-6 max-w-6xl mx-auto border-b border-border">
        <div className="max-w-2xl mb-12">
          <span className="text-xs font-mono uppercase tracking-widest text-primary font-semibold">Algorithmic Lifecycle</span>
          <h2 className="font-serif text-3xl font-semibold text-text mt-1">Three-Step Indexing Engine</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 bg-surface border border-border rounded-xl space-y-3">
            <div className="w-8 h-8 rounded bg-primary-light text-primary flex items-center justify-center font-mono font-bold text-sm">1</div>
            <h3 className="font-serif text-lg font-semibold text-text">Package Arrives</h3>
            <p className="text-sm text-muted leading-relaxed">
              Accepts arbitrary non-negative package IDs ($0$ to $10^9$) without preallocating flat tables.
            </p>
          </div>

          <div className="p-6 bg-surface border border-border rounded-xl space-y-3">
            <div className="w-8 h-8 rounded bg-primary-light text-primary flex items-center justify-center font-mono font-bold text-sm">2</div>
            <h3 className="font-serif text-lg font-semibold text-text">AVL Tree Updates</h3>
            <p className="text-sm text-muted leading-relaxed">
              Locates predecessor and successor in $O(\log k)$. Fuses bridge merges, extends boundaries, or inserts a new interval node.
            </p>
          </div>

          <div className="p-6 bg-surface border border-border rounded-xl space-y-3">
            <div className="w-8 h-8 rounded bg-primary-light text-primary flex items-center justify-center font-mono font-bold text-sm">3</div>
            <h3 className="font-serif text-lg font-semibold text-text">Ranges & Gaps Displayed</h3>
            <p className="text-sm text-muted leading-relaxed">
              Subtree-pruned queries calculate received intervals and missing gaps inside any bounded window.
            </p>
          </div>
        </div>
      </section>

      {/* Algorithm Demonstration Section */}
      <section className="py-16 px-6 max-w-6xl mx-auto border-b border-border">
        <div className="max-w-2xl mb-8">
          <span className="text-xs font-mono uppercase tracking-widest text-primary font-semibold">Live Algorithm Demonstration</span>
          <h2 className="font-serif text-3xl font-semibold text-text mt-1">Bridge Merge Fusion</h2>
          <p className="text-muted text-sm mt-2">
            Watch how two separated intervals fuse into one when the missing connecting package ID arrives.
          </p>
        </div>

        <BridgeMergeDemo />
      </section>

      {/* Minimal Footer */}
      <footer className="mt-auto py-10 px-6 max-w-6xl mx-auto w-full flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-muted">
        <div className="flex items-center gap-2">
          <span className="font-bold text-text">FLASHHACK</span>
          <span>— Academic Engineering Demonstration</span>
        </div>

        <div className="flex items-center gap-6">
          <a href="https://github.com/subhamsje/flashhack" target="_blank" rel="noreferrer" className="hover:text-text">GitHub Repository</a>
          <span>C11 • React • Vite • Supabase</span>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
};
