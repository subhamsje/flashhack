import React, { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { Database, Menu, X, User, LogOut, LogIn } from 'lucide-react';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { useAuth } from '../hooks/useAuth';
import { AuthModal } from '../components/AuthModal';

export const AppLayout: React.FC = () => {
  const { connectionState, onlineDevices, lastSyncTime, currentVersion } = useRealtimeSync();
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

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

          {/* Right Controls: Minimalist Multi-Device Cloud Status & Mobile Menu Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className={`flex items-center gap-2 px-2.5 py-1 text-xs font-mono rounded border shadow-sm transition ${status.bg}`}
              title={`Warehouse: Main Distribution\nState Version: v${currentVersion}\nLast Synced: ${lastSyncTime}\nOnline Devices: ${onlineDevices}`}
            >
              <span className={`w-2 h-2 rounded-full ${status.dot}`} />
              <span className="font-bold">{status.label}</span>
              <span className="text-[10px] opacity-75 hidden sm:inline">v{currentVersion}</span>
              <span className="text-[10px] opacity-60 hidden md:inline">({onlineDevices} online)</span>
            </div>

            {/* Auth / Account Button */}
            {user ? (
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono bg-background border border-border px-2 py-1 rounded">
                <span className="text-[11px] text-text font-semibold truncate max-w-[120px]">
                  {user.email?.split('@')[0] || 'Operator'}
                </span>
                <button
                  onClick={() => signOut()}
                  className="text-muted hover:text-text p-0.5 rounded transition"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium rounded bg-primary hover:bg-primary-dark text-white transition shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In
              </button>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-text hover:bg-background rounded border border-border"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-surface px-6 py-4 space-y-3 font-mono text-xs shadow-lg animate-in fade-in duration-150">
            {[
              { to: '/', label: 'Overview', exact: true },
              { to: '/app', label: 'Live Arrival Index' },
              { to: '/range-analysis', label: 'Missing Intelligence' },
              { to: '/activity-log', label: 'Activity & History' },
              { to: '/debugger', label: 'Algorithm Debugger' },
              { to: '/algorithm', label: 'About Algorithm' }
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block py-1.5 px-2 rounded transition ${
                    isActive ? 'bg-primary/10 text-primary font-bold' : 'text-muted hover:text-text hover:bg-background'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}

            <div className="pt-2 border-t border-border flex items-center justify-between">
              {user ? (
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] text-muted truncate">{user.email}</span>
                  <button
                    onClick={() => { signOut(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-1 text-xs text-rose-600 font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setAuthModalOpen(true); setMobileMenuOpen(false); }}
                  className="w-full py-1.5 text-center bg-primary text-white rounded font-bold"
                >
                  Sign In / Register
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Auth Modal */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      {/* Main Outlet */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};
