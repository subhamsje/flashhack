import React, { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { Layers, ArrowRight, User, LogOut, X, Database, ShieldCheck, Check } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../services/supabase';

export const AppLayout: React.FC = () => {
  const { user, signOut, signIn, signUp, isConfigured } = useAuth();
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
            <div className="w-8 h-8 rounded bg-primary text-white flex items-center justify-center font-mono font-bold text-sm shadow-sm">
              FH
            </div>
            <div className="flex flex-col">
              <span className="font-mono font-bold text-sm tracking-tight text-text">FLASHHACK</span>
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
              Range Analysis
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

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Supabase status badge / connector */}
            <button
              onClick={() => setShowConfigModal(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded border transition ${
                isConfigured
                  ? 'bg-received/10 text-received border-received/30 hover:bg-received/20'
                  : 'bg-primary-light/40 text-primary border-primary/20 hover:bg-primary-light'
              }`}
              title="Supabase Database Configuration"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{isConfigured ? 'Supabase Connected' : 'Connect Supabase'}</span>
            </button>

            {user ? (
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-muted hidden lg:inline">{user.email}</span>
                <button
                  onClick={() => signOut()}
                  className="p-1.5 text-muted hover:text-text hover:bg-background rounded border border-border transition"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-3 py-1.5 text-xs font-mono bg-primary hover:bg-primary-dark text-white rounded transition shadow-sm"
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
