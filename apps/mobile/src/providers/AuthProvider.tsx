import React, { createContext, useContext, useEffect, useState } from 'react';
<<<<<<< HEAD
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, usersApi, supabase, withTimeout } from '@/src/lib/supabase';
import { initializePushNotifications, unregisterDeviceFromPush } from '@/src/lib/pushNotifications';

export type UserRole = 'worker' | 'engineer' | 'manager' | 'deputy_head' | 'admin' | 'support';
=======
import { authApi, usersApi, supabase } from '@/src/lib/supabase';
>>>>>>> 8e64d59caf785307e6286010bb536392348ff67e

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
  role: 'manager' | 'worker' | 'admin';
  is_online?: boolean;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  session: any;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ user: User; token: string }>;
  register: (email: string, password: string, name: string, role: string) => Promise<{ user: User; token: string }>;
  logout: () => Promise<void>;
  isManager: boolean;
  isWorker: boolean;
  isManagerOrHigher: boolean;
  isEngineer: boolean;
  canCreateTasks: boolean;
  canApproveRequests: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);
      if (s?.access_token) {
        try {
          const data = await authApi.getMe();
          setUser(data.user);
        } catch { setUser(null); }
      }
      if (mounted) setLoading(false);
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (!s?.access_token) { setUser(null); return; }
      try {
        const data = await authApi.getMe();
<<<<<<< HEAD
        if (!mounted) return true;
        const normalizedUser = normalizeUserProfile(data.user as User, authUser);
        setUser(normalizedUser);
        await saveCachedUser(authUser.id, normalizedUser);
        usersApi.heartbeat();
        // Initialize push notifications
        await initializePushNotifications(normalizedUser.id);
        return true;
      } catch (error) {
        console.error('Error getting user profile:', error);
        const shouldClearSession = isAuthSessionError(error);
        if (shouldClearSession) {
          try {
            await signOutLocalFirst();
          } catch (signOutError) {
            console.warn('Failed to clear local session after auth error:', signOutError);
          }
          if (!mounted) return false;
          setUser(null);
          return false;
        }

        if (!mounted) return true;
        const cached = await getCachedUser(authUser);
        if (cached) {
          setUser(cached);
        } else {
          const fallback = normalizeUserProfile(buildAuthFallbackUser(authUser), authUser);
          setUser(fallback);
          await saveCachedUser(authUser.id, fallback);
        }
        usersApi.heartbeat();
        return true;
      }
    };

    const init = async () => {
      try {
        await ensureBootstrapVersion();
        let restoredSession: any = null;
        try {
          const sessionResponse = await withTimeout(supabase.auth.getSession(), 'restore session', 2200);
          restoredSession = sessionResponse?.data?.session ?? null;
        } catch (sessionError) {
          console.warn('Session restore failed, continue as logged out:', sessionError);
        }
        if (!mounted) return;

        setSession(restoredSession);
        if (restoredSession?.user) {
          const profileLoaded = await loadProfile(restoredSession.user);
          if (!profileLoaded && mounted) {
            setSession(null);
          }
        } else if (mounted) {
          setUser(null);
        }
      } catch (error) {
        console.error('Error restoring session:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession ?? null);
      if (!nextSession?.user) {
        setUser(null);
        return;
      }
      const profileLoaded = await loadProfile(nextSession.user);
      if (!profileLoaded && mounted) {
        setSession(null);
      }
=======
        setUser(data.user);
      } catch { setUser(null); }
>>>>>>> 8e64d59caf785307e6286010bb536392348ff67e
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
<<<<<<< HEAD
    const authUser =
      (data.session?.user as AuthMetadataUser | undefined) ||
      ({ id: (data.user as User | undefined)?.id, email } as AuthMetadataUser);
    const normalizedUser = normalizeUserProfile(data.user as User, authUser);
    if (data.session) {
      setSession(data.session);
    } else {
      try {
        const restored = await withTimeout(supabase.auth.getSession(), 'restore session after sign in', 5000);
        setSession(restored?.data?.session ?? null);
      } catch (error) {
        console.warn('Session restore after sign in failed:', error);
      }
    }
    setUser(normalizedUser);
    await saveCachedUser(normalizedUser.auth_user_id || normalizedUser.id, normalizedUser);
    usersApi.heartbeat();
    // Initialize push notifications after successful login
    await initializePushNotifications(normalizedUser.id);
=======
    setUser(data.user);
>>>>>>> 8e64d59caf785307e6286010bb536392348ff67e
    return data;
  };

  const register = async (email: string, password: string, name: string, role: string) => {
    const data = await authApi.register(email, password, name, role);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
<<<<<<< HEAD
    try {
      await usersApi.markOffline();
    } catch {}

    // Unregister from push notifications
    if (user?.id) {
      await unregisterDeviceFromPush(user.id);
    }

    try {
      await signOutLocalFirst();
    } catch (error) {
      console.warn('Sign out error:', error);
    } finally {
      setUser(null);
      setSession(null);
    }
=======
    try { await usersApi.markOffline(); } catch {}
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
>>>>>>> 8e64d59caf785307e6286010bb536392348ff67e
  };

  return (
    <AuthContext.Provider value={{
      user, loading, session,
      signIn: async (email: string, password: string) => { await login(email, password); },
      signOut: logout,
      login, register, logout,
      isManager: user?.role === 'manager' || user?.role === 'admin',
      isWorker: user?.role === 'worker',
      isManagerOrHigher: ['manager', 'admin', 'deputy_head'].includes(user?.role || ''),
      isEngineer: user?.role === 'engineer',
      canCreateTasks: ['manager', 'admin', 'deputy_head'].includes(user?.role || ''),
      canApproveRequests: ['manager', 'admin'].includes(user?.role || ''),
    }}>
      {children}
    </AuthContext.Provider>
  );
};
