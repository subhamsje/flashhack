import React, { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { Layers, ArrowRight, User, LogOut, X, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const AppLayout: React.FC = () => {
  const { user, signOut, signIn, signUp, isConfigured } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-background text-text flex flex-col font-sans">
      {/* Clean Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-primary text-white flex items-center justify-center font-mono font-bold text-xs shadow-sm">
              FH
            </div>
            <div className="flex flex-col">
              <span className="font-mono font-bold text-sm tracking-tight text-text">FLASHHACK</span>
              <span className="text-[9px] font-mono text-muted uppercase tracking-widest">Live Arrival Index</span>
            </div>
          </Link>

          {/* 4 Main Page Links */}
          <nav className="flex items-center gap-6 text-xs font-mono font-medium">
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

          {/* User Auth Action */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-muted hidden sm:inline">{user.email}</span>
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
                className="px-3 py-1.5 text-xs font-mono bg-surface hover:bg-background text-text border border-border rounded transition"
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

      {/* Simple Auth Modal */}
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
