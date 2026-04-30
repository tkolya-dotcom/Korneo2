import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi, usersApi, supabase } from '../lib/supabase';

type User = {
  id: string;
  email: string;
  name: string;
  role: 'manager' | 'worker';
  is_online?: boolean;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (email: string, password: string, name: string, role: string) => Promise<any>;
  logout: () => Promise<void>;
  isManager: boolean;
  isWorker: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const syncSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.access_token) { setUser(null); return; }
    try {
      const data = await authApi.getMe();
      setUser(data.user);
    } catch { setUser(null); }
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      await syncSession();
      if (mounted) setLoading(false);
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.access_token) { setUser(null); return; }
      try {
        const data = await authApi.getMe();
        setUser(data.user);
      } catch { setUser(null); }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setUser(data.user);
    return data;
  };

  const register = async (email: string, password: string, name: string, role: string) => {
    const data = await authApi.register(email, password, name, role);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try { await usersApi.markOffline(); } catch {}
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, logout,
      isManager: user?.role === 'manager',
      isWorker: user?.role === 'worker',
    }}>
      {children}
    </AuthContext.Provider>
  );
};