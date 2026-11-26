import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, GitBranch, Layers, Search, Cpu } from 'lucide-react';
import { AnimatedHeroArrivalSimulator } from '../components/AnimatedHeroArrivalSimulator';
import { BridgeMergeDemo } from '../components/BridgeMergeDemo';
import { AlgorithmLifecycleFlow, SparseMemoryComparison } from '../components/LandingDiagrams';

export const LandingPage: React.FC = () => {
  return (
    <div className="bg-background text-text flex flex-col selection:bg-accent selection:text-text">
      {/* Hero Section */}
      <section className="py-16 px-6 max-w-6xl mx-auto border-b border-border space-y-10">
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border text-xs font-mono text-muted">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Problem Statement 09: Balanced Searching and Ordered Indexing
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight text-text leading-[1.15]">
              Every arrival has a place. <br />
              <span className="italic text-primary">Every missing number has a reason.</span>
            </h1>

            <p className="text-base text-muted leading-relaxed font-sans">
              A live package indexing system that organizes out-of-order arrivals into consecutive ranges using balanced AVL trees.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <Link
                to="/app"
                className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded text-sm font-medium transition shadow-sm flex items-center gap-2"
              >
                Try Live Demo <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#how-it-works"
                className="px-4 py-2.5 bg-surface hover:bg-border/40 text-text border border-border rounded text-sm font-medium transition"
              >
                Explore How It Works
              </a>
            </div>
          </div>

          <div className="lg:col-span-7">
            <AnimatedHeroArrivalSimulator />
          </div>
        </div>
      </section>

      {/* Illustrated Problem Section */}
      <section className="py-16 px-6 max-w-6xl mx-auto border-b border-border space-y-8">
        <div className="max-w-2xl">
          <span className="text-xs font-mono uppercase tracking-widest text-primary font-semibold">The Problem</span>
          <h2 className="font-serif text-3xl font-semibold text-text mt-1">Out-of-Order Delivery Ingestion</h2>
          <p className="text-muted text-sm mt-2">
            Deliveries arrive at warehouse bays in arbitrary sequence. Managers need a compact, ordered representation without listing individual IDs or sorting an array after every single arrival.
          </p>
        </div>

        <div className="p-6 bg-surface border border-border rounded-xl grid sm:grid-cols-3 gap-6 font-mono text-xs shadow-sm">
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

        {/* Sparse Memory Comparison Visual */}
        <SparseMemoryComparison />
      </section>

      {/* Illustrated Algorithm Lifecycle Flow */}
      <section id="how-it-works" className="py-16 px-6 max-w-6xl mx-auto border-b border-border space-y-8">
        <div className="max-w-2xl">
          <span className="text-xs font-mono uppercase tracking-widest text-primary font-semibold">Algorithmic Lifecycle</span>
          <h2 className="font-serif text-3xl font-semibold text-text mt-1">From Arrival to Balanced Interval Index</h2>
        </div>

        <AlgorithmLifecycleFlow />
      </section>

      {/* Algorithm Demonstration Section */}
      <section className="py-16 px-6 max-w-6xl mx-auto border-b border-border space-y-8">
        <div className="max-w-2xl">
          <span className="text-xs font-mono uppercase tracking-widest text-primary font-semibold">Live Algorithm Demonstration</span>
          <h2 className="font-serif text-3xl font-semibold text-text mt-1">Bridge Merge Fusion</h2>
          <p className="text-muted text-sm mt-2">
            Watch how two separated intervals fuse into one when the missing connecting package ID arrives.
          </p>
        </div>

        <BridgeMergeDemo />
      </section>

      {/* Minimal Footer */}
      <footer className="py-10 px-6 max-w-6xl mx-auto w-full flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-muted">
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
