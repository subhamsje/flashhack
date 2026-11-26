import React from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { Database } from 'lucide-react';
import { useRealtimeSync } from '../hooks/useRealtimeSync';

export const AppLayout: React.FC = () => {
  const { connectionState, onlineDevices, lastSyncTime, currentVersion } = useRealtimeSync();

  const getStatusBadge = () => {
    switch (connectionState) {
      case 'CONNECTED':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700/60',
          dot: 'bg-emerald-600 dark:bg-emerald-400',
          label: 'CONNECTED'
        };
      case 'SYNCING':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700/60',
          dot: 'bg-blue-600 dark:bg-blue-400 animate-pulse',
          label: 'SYNCING'
        };
      case 'RECONNECTING':
      case 'OFFLINE':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/60',
          dot: 'bg-amber-600 dark:bg-amber-400',
          label: connectionState
        };
      default:
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700/60',
          dot: 'bg-rose-600 dark:bg-rose-400',
          label: 'ERROR'
        };
    }
  };

  const status = getStatusBadge();

  return (
    <div className="min-h-screen bg-background text-text flex flex-col font-sans">
      {/* Single Unified Header */}
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <img src="./logo.png" alt="Warehouse Logo" className="w-9 h-9 rounded-lg object-cover shadow-sm border border-border" />
            <div className="flex flex-col">
              <span className="font-mono font-bold text-sm tracking-tight text-text">WAREHOUSE</span>
              <span className="text-[9px] font-mono text-muted uppercase tracking-widest">Live Arrival Index</span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-mono font-medium">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `transition pb-1 border-b-2 ${
                  isActive ? 'border-primary text-primary font-bold' : 'border-transparent text-muted hover:text-text'
                }`
              }
            >
              Overview
            </NavLink>
            <NavLink
              to="/app"
              className={({ isActive }) =>
                `transition pb-1 border-b-2 ${
                  isActive ? 'border-primary text-primary font-bold' : 'border-transparent text-muted hover:text-text'
                }`
              }
            >
              Live Arrival Index
            </NavLink>
            <NavLink
              to="/range-analysis"
              className={({ isActive }) =>
                `transition pb-1 border-b-2 ${
                  isActive ? 'border-primary text-primary font-bold' : 'border-transparent text-muted hover:text-text'
                }`
              }
            >
              Missing Intelligence
            </NavLink>
            <NavLink
              to="/activity-log"
              className={({ isActive }) =>
                `transition pb-1 border-b-2 ${
                  isActive ? 'border-primary text-primary font-bold' : 'border-transparent text-muted hover:text-text'
                }`
              }
            >
              Activity & History
            </NavLink>
            <NavLink
              to="/debugger"
              className={({ isActive }) =>
                `transition pb-1 border-b-2 ${
                  isActive ? 'border-primary text-primary font-bold' : 'border-transparent text-muted hover:text-text'
                }`
              }
            >
              Algorithm Debugger
            </NavLink>
            <NavLink
              to="/algorithm"
              className={({ isActive }) =>
                `transition pb-1 border-b-2 ${
                  isActive ? 'border-primary text-primary font-bold' : 'border-transparent text-muted hover:text-text'
                }`
              }
            >
              About Algorithm
            </NavLink>
          </nav>

          {/* Right Controls: Minimalist Multi-Device Cloud Status */}
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-2.5 py-1 text-xs font-mono rounded border shadow-sm transition ${status.bg}`}
              title={`Warehouse: Main Distribution\nState Version: v${currentVersion}\nLast Synced: ${lastSyncTime}\nOnline Devices: ${onlineDevices}`}
            >
              <span className={`w-2 h-2 rounded-full ${status.dot}`} />
              <span className="font-bold">{status.label}</span>
              <span className="text-[10px] opacity-75 hidden sm:inline">v{currentVersion}</span>
              <span className="text-[10px] opacity-60 hidden md:inline">({onlineDevices} online)</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Outlet */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};
