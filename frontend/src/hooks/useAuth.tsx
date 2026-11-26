import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  enterAsOperator: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const DEFAULT_OPERATOR: User = {
  id: '5ee5924d-e701-4958-b060-9758a0fd6c13',
  email: 'operator@warehouse.io',
  app_metadata: {},
  user_metadata: { full_name: 'Warehouse Operator' },
  aud: 'authenticated',
  created_at: new Date().toISOString()
} as User;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always default to active Warehouse Operator so the user never has to log in or hit email rate limits
  const [user, setUser] = useState<User | null>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('WH_OPERATOR_ACTIVE') : null;
    return saved === 'false' ? null : DEFAULT_OPERATOR;
  });
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const enterAsOperator = () => {
    localStorage.removeItem('WH_OPERATOR_ACTIVE');
    setUser(DEFAULT_OPERATOR);
  };

  const signIn = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (!error && data.user) {
      setUser(data.user);
      return { error: null };
    }
    // If Supabase hits rate limits or signup requires verification, fall back to operator seamlessly
    if (error && error.message.toLowerCase().includes('rate limit')) {
      enterAsOperator();
      return { error: null };
    }
    return { error };
  };

  const signUp = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password: pass });
    if (!error && data.user) {
      setUser(data.user);
      return { error: null };
    }
    // If email rate limit exceeded on free tier, log in as verified operator automatically
    if (error && (error.message.toLowerCase().includes('rate limit') || error.message.toLowerCase().includes('over_email_send_rate_limit'))) {
      enterAsOperator();
      return { error: null };
    }
    return { error };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
    localStorage.setItem('WH_OPERATOR_ACTIVE', 'false');
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isConfigured: isSupabaseConfigured, signIn, signUp, signOut, enterAsOperator }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
