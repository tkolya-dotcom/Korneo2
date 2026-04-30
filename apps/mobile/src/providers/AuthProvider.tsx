import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, supabase, usersApi } from '@/src/lib/supabase';
import { initializePushNotifications, unregisterDeviceFromPush } from '@/src/lib/pushNotifications';

export type UserRole = 'worker' | 'engineer' | 'manager' | 'deputy_head' | 'admin' | 'support';

export const ROLES = {
  MANAGER: 'manager',
  WORKER: 'worker',
  ADMIN: 'admin',
  DEPUTY_HEAD: 'deputy_head',
  ENGINEER: 'engineer',
} as const;

type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_online?: boolean;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  session: any;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ user: User; token: string | null }>;
  register: (email: string, password: string, name: string, role: string) => Promise<{ user: User; token: string | null }>;
  logout: () => Promise<void>;
  isManager: boolean;
  isWorker: boolean;
  isManagerOrHigher: boolean;
  isEngineer: boolean;
  canCreateTasks: boolean;
  canApproveRequests: boolean;
  isElevatedUser: boolean;
  canCreatePurchaseRequests: boolean;
  canViewWarehouse: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const normalizeRole = (value: unknown): UserRole => {
  const role = String(value || 'worker').trim().toLowerCase();
  if (role === 'manager' || role === 'admin' || role === 'worker' || role === 'engineer' || role === 'deputy_head' || role === 'support') {
    return role;
  }
  return 'worker';
};

const normalizeUser = (raw: any): User => ({
  id: String(raw?.id || ''),
  email: String(raw?.email || ''),
  name: String(raw?.name || raw?.email?.split('@')?.[0] || 'Пользователь'),
  role: normalizeRole(raw?.role),
  is_online: Boolean(raw?.is_online),
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) {
          return;
        }
        const currentSession = data?.session ?? null;
        setSession(currentSession);

        if (!currentSession?.access_token) {
          setUser(null);
          return;
        }

        const me = await authApi.getMe();
        if (!mounted) {
          return;
        }
        const normalized = normalizeUser(me?.user);
        setUser(normalized);
        await initializePushNotifications(normalized.id);
      } catch {
        if (mounted) {
          setUser(null);
          setSession(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void hydrate();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession ?? null);
      if (!nextSession?.access_token) {
        setUser(null);
        return;
      }

      try {
        const me = await authApi.getMe();
        const normalized = normalizeUser(me?.user);
        setUser(normalized);
        await initializePushNotifications(normalized.id);
      } catch {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    const normalized = normalizeUser(data.user);
    setUser(normalized);
    const refreshed = await supabase.auth.getSession();
    setSession(refreshed?.data?.session ?? null);
    await initializePushNotifications(normalized.id);
    return { token: data.token || null, user: normalized };
  };

  const register = async (email: string, password: string, name: string, role: string) => {
    const data = await authApi.register(email, password, name, role);
    const normalized = normalizeUser(data.user);
    setUser(normalized);
    const refreshed = await supabase.auth.getSession();
    setSession(refreshed?.data?.session ?? null);
    return { token: data.token || null, user: normalized };
  };

  const logout = async () => {
    try {
      await usersApi.markOffline();
    } catch {}
    if (user?.id) {
      await unregisterDeviceFromPush(user.id);
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    session,
    signIn: async (email: string, password: string) => {
      await login(email, password);
    },
    signOut: logout,
    login,
    register,
    logout,
    isManager: user?.role === 'manager' || user?.role === 'admin',
    isWorker: user?.role === 'worker',
    isManagerOrHigher: ['manager', 'admin', 'deputy_head'].includes(user?.role || ''),
    isEngineer: user?.role === 'engineer',
    canCreateTasks: ['manager', 'admin', 'deputy_head'].includes(user?.role || ''),
    canApproveRequests: ['manager', 'admin'].includes(user?.role || ''),
    isElevatedUser: ['manager', 'admin', 'deputy_head'].includes(user?.role || ''),
    canCreatePurchaseRequests: ['manager', 'admin', 'deputy_head', 'engineer'].includes(user?.role || ''),
    canViewWarehouse: ['manager', 'admin', 'deputy_head', 'engineer'].includes(user?.role || ''),
  }), [user, loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
