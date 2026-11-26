import React, { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { Layers, ArrowRight, User, LogOut, X, Database, ShieldCheck, Check, Wifi, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { isSupabaseConfigured } from '../services/supabase';

export const AppLayout: React.FC = () => {
  const { user, signOut, signIn, signUp, enterAsOperator, isConfigured } = useAuth();
  const { connectionState, onlineDevices, lastSyncTime, currentVersion } = useRealtimeSync();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  /* Quick Supabase key input in browser */
  const [sbUrlInput, setSbUrlInput] = useState(localStorage.getItem('VITE_SUPABASE_URL') || '');
  const [sbKeyInput, setSbKeyInput] = useState(localStorage.getItem('VITE_SUPABASE_ANON_KEY') || '');
  const [savedConfigMsg, setSavedConfigMsg] = useState(false);

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

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const fn = isSignUp ? signUp : signIn;
    const { error } = await fn(email, password);
    if (error) {
      setAuthError(error.message);
    } else {
      setShowAuthModal(false);
      setEmail('');
      setPassword('');
    }
  };

  const handleSaveSupabaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (sbUrlInput.trim()) localStorage.setItem('VITE_SUPABASE_URL', sbUrlInput.trim());
    if (sbKeyInput.trim()) localStorage.setItem('VITE_SUPABASE_ANON_KEY', sbKeyInput.trim());
    setSavedConfigMsg(true);
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

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
              title={`Warehouse: Main Distribution\nAccount: ${user?.email || 'operator@warehouse.io'}\nState Version: v${currentVersion}\nLast Synced: ${lastSyncTime}\nOnline Devices: ${onlineDevices}`}
            >
              <span className={`w-2 h-2 rounded-full ${status.dot}`} />
              <span className="font-bold">{status.label}</span>
              <span className="text-[10px] opacity-75 hidden sm:inline">v{currentVersion}</span>
              <span className="text-[10px] opacity-60 hidden md:inline">({onlineDevices} online)</span>
            </div>

            {user ? (
              <div className="flex items-center gap-1.5 text-xs font-mono text-muted">
                <span className="hidden lg:inline text-[11px] font-semibold text-text truncate max-w-[140px]">
                  {user.email || 'operator@warehouse.io'}
                </span>
                <button
                  onClick={() => signOut()}
                  className="p-1.5 rounded hover:bg-background border border-transparent hover:border-border text-muted hover:text-text transition"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-2.5 py-1 text-xs font-mono font-medium rounded bg-primary text-white hover:bg-primary-dark transition shadow-sm"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Outlet */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Supabase Connection Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                <h3 className="font-serif text-lg font-bold text-text">Supabase Connection</h3>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="text-muted hover:text-text">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted leading-relaxed font-mono">
              From your Supabase project settings (<strong>Project Settings &rarr; API</strong>), copy your <strong>Project URL</strong> and <strong>anon public key</strong>:
            </p>

            <form onSubmit={handleSaveSupabaseConfig} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-muted mb-1 font-semibold">Project URL</label>
                <input
                  type="text"
                  required
                  value={sbUrlInput}
                  onChange={(e) => setSbUrlInput(e.target.value)}
                  placeholder="https://your-project.supabase.co"
                  className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-muted mb-1 font-semibold">Anon Public Key</label>
                <textarea
                  rows={3}
                  required
                  value={sbKeyInput}
                  onChange={(e) => setSbKeyInput(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {savedConfigMsg && (
                <div className="text-received font-semibold flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Configuration saved! Reloading client...
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('VITE_SUPABASE_URL');
                    localStorage.removeItem('VITE_SUPABASE_ANON_KEY');
                    window.location.reload();
                  }}
                  className="text-muted hover:text-danger text-[11px]"
                >
                  Reset to Demo
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded font-medium transition"
                >
                  Connect & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif text-lg font-bold text-text">
                {isSignUp ? 'Create Operator Account' : 'Supabase Sign In'}
              </h3>
              <button onClick={() => setShowAuthModal(false)} className="text-muted hover:text-text">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-muted mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="operator@flashhack.io"
                />
              </div>

              <div>
                <label className="block text-muted mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="••••••••"
                />
              </div>

              {authError && <div className="text-missing text-[11px]">{authError}</div>}

              <button
                type="submit"
                className="w-full py-2 bg-primary hover:bg-primary-dark text-white rounded font-medium transition"
              >
                {isSignUp ? 'Register Account' : 'Sign In'}
              </button>

              <button
                type="button"
                onClick={() => {
                  enterAsOperator();
                  setShowAuthModal(false);
                }}
                className="w-full py-2 bg-background border border-border hover:bg-surface text-text rounded font-medium transition flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-primary" /> Continue as Verified Operator
              </button>
            </form>

            <div className="text-center pt-2 border-t border-border text-[11px] font-mono text-muted">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary font-bold hover:underline"
              >
                {isSignUp ? 'Sign in' : 'Create one'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
