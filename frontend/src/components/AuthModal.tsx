import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User, LogIn, UserPlus, X, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn, signUp, enterAsOperator } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    if (isRegister) {
      const { error } = await signUp(email, password);
      if (error) {
        if (error.message.toLowerCase().includes('rate limit')) {
          setErrorMsg('Supabase email rate limit reached. Click below to continue in Operator Mode.');
        } else {
          setErrorMsg(error.message);
        }
      } else {
        setSuccessMsg('Account registered successfully! You are now logged in.');
        setTimeout(() => onClose(), 1200);
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg('Signed in successfully!');
        setTimeout(() => onClose(), 800);
      }
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-surface border border-border rounded-xl max-w-md w-full p-6 shadow-2xl relative font-sans">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-muted hover:text-text rounded-md hover:bg-background transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            {isRegister ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-text">
              {isRegister ? 'Register Account' : 'Account Sign In'}
            </h2>
            <p className="text-xs font-mono text-muted">
              {isRegister ? 'Create an account to synchronize across devices' : 'Access your authorized warehouse state'}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <div>
              <label className="block text-xs font-mono text-muted mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Warehouse Operator"
                className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-muted mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@warehouse.io"
              className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-muted mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white rounded font-mono text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
          >
            {loading ? 'Authenticating...' : (isRegister ? 'Create Account' : 'Sign In to Warehouse')}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs font-mono">
          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setErrorMsg(null); }}
            className="text-primary hover:underline"
          >
            {isRegister ? 'Already registered? Sign in' : "Don't have an account? Register"}
          </button>

          <button
            type="button"
            onClick={() => { enterAsOperator(); onClose(); }}
            className="text-muted hover:text-text flex items-center gap-1"
            title="Continue instantly as default warehouse operator"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Operator Mode
          </button>
        </div>
      </div>
    </div>
  );
};
