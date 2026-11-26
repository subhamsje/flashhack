import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  PackagePlus,
  Search,
  GitBranch,
  BarChart3,
  Gauge,
  Warehouse,
  LogOut,
  ChevronRight,
  ExternalLink,
  Layers,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const DashboardLayout: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { to: '/app/arrivals', label: 'Live Arrivals Gate', icon: PackagePlus },
    { to: '/app/search', label: 'Search & Gaps', icon: Search },
    { to: '/app/avl-tree', label: 'AVL Tree Explorer', icon: GitBranch },
    { to: '/app/analytics', label: 'Metrics & Telemetry', icon: BarChart3 },
    { to: '/app/benchmarks', label: 'Benchmark Lab', icon: Gauge },
  ];

  return (
    <div className="min-h-screen bg-background flex text-ink">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-surface border-r border-border flex flex-col fixed inset-y-0 z-30">
        {/* Brand */}
        <div className="h-16 px-6 border-b border-border flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-primary text-white flex items-center justify-center font-mono font-bold text-xs shadow-sm">
              FH
            </div>
            <div className="flex flex-col">
              <span className="font-mono font-bold tracking-tight text-xs text-ink">FLASHHACK</span>
              <span className="text-[9px] font-mono text-ink-muted uppercase tracking-widest">Operations Hub</span>
            </div>
          </NavLink>
        </div>

        {/* Warehouse Selector Pill */}
        <div className="px-4 py-3 border-b border-border bg-surface-muted/40">
          <div className="flex items-center gap-2 text-xs font-mono text-ink-muted">
            <Warehouse className="w-3.5 h-3.5 text-primary" />
            <span className="truncate font-medium text-ink">Bay 4 — Hub Alpha</span>
          </div>
          <div className="text-[10px] font-mono text-primary flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Active Shift #409
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-mono transition ${
                  isActive
                    ? 'bg-primary text-white font-semibold shadow-sm'
                    : 'text-ink-muted hover:text-ink hover:bg-surface-muted'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </NavLink>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-border bg-surface-muted/30">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="truncate mr-2">
              <span className="text-[10px] text-ink-muted block uppercase">Logged in as</span>
              <span className="font-semibold text-ink truncate block">{user?.email || 'operator@flashhack.io'}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 text-ink-muted hover:text-danger hover:bg-surface rounded transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="h-16 bg-surface/80 backdrop-blur border-b border-border sticky top-0 z-20 px-8 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs font-mono text-ink-muted">
            <NavLink to="/" className="hover:text-primary flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Landing Page
            </NavLink>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="px-2.5 py-1 rounded bg-surface-muted border border-border text-ink-muted">
              C11 Engine: <strong className="text-primary font-semibold">Active</strong>
            </span>
          </div>
        </header>

        {/* Workspace Body */}
        <div className="flex-1 p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
