import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi, usersApi, supabase, withTimeout } from '@/src/lib/supabase';

export type UserRole = 'worker' | 'engineer' | 'manager' | 'deputy_head' | 'admin' | 'support';

export const ROLES = {
  WORKER: 'worker',
  ENGINEER: 'engineer',
  MANAGER: 'manager',
  DEPUTY_HEAD: 'deputy_head',
  ADMIN: 'admin',
  SUPPORT: 'support',
} as const;

export type User = {
  id: string;
  auth_user_id?: string;
  email: string;
  name: string;
  role: UserRole;
  is_online?: boolean;
  fcm_token?: string;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  session: any;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  login: (email: string, password: string) => Promise<any>;
  register: (email: string, password: string, name: string, role: string) => Promise<any>;
  logout: () => Promise<void>;
  isWorker: boolean;
  isEngineer: boolean;
  isManager: boolean;
  isDeputyHead: boolean;
  isAdmin: boolean;
  isManagerOrHigher: boolean;
  canCreateTasks: boolean;
  canDeleteTasks: boolean;
  canManageUsers: boolean;
  canApproveRequests: boolean;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const fallbackName = '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c';
const validRoles: UserRole[] = ['worker', 'engineer', 'manager', 'deputy_head', 'admin', 'support'];

type AuthMetadataUser = {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

const resolveRoleFromAuth = (authUser: AuthMetadataUser): UserRole => {
  const roleCandidate = authUser.user_metadata?.role ?? authUser.app_metadata?.role;
  if (typeof roleCandidate === 'string' && validRoles.includes(roleCandidate as UserRole)) {
    return roleCandidate as UserRole;
  }
  return 'worker';
};

const resolveNameFromAuth = (authUser: AuthMetadataUser): string => {
  const metadataName =
    authUser.user_metadata?.name ??
    authUser.user_metadata?.full_name ??
    authUser.app_metadata?.name;

  if (typeof metadataName === 'string' && metadataName.trim()) {
    return metadataName.trim();
  }

  return authUser.email?.split('@')[0] || fallbackName;
};

const fallbackUser = (authUser: { id: string; email?: string | null }): User => ({
  id: authUser.id,
  auth_user_id: authUser.id,
  email: authUser.email || '',
  name: resolveNameFromAuth(authUser),
  role: resolveRoleFromAuth(authUser),
});

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

    const loadProfile = async (authUser: { id: string; email?: string | null }) => {
      try {
        const data = await authApi.getMe();
        if (!mounted) return;
        setUser(data.user as User);
        usersApi.heartbeat();
      } catch (error) {
        console.error('Error getting user profile:', error);
        if (!mounted) return;
        setUser(fallbackUser(authUser));
      }
    };

    const init = async () => {
      try {
        let sessionResponse;
        try {
          sessionResponse = await withTimeout(supabase.auth.getSession(), 'restore session', 6000);
        } catch (fastError) {
          console.warn('Fast session restore failed, retrying without timeout:', fastError);
          sessionResponse = await supabase.auth.getSession();
        }

        const { data } = sessionResponse;
        if (!mounted) return;

        setSession(data.session);
        if (data.session?.user) {
          await loadProfile(data.session.user);
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

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession?.user) {
        setUser(null);
        return;
      }
      await loadProfile(nextSession.user);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      usersApi.markOffline();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setUser(data.user as User);
    usersApi.heartbeat();
    return data;
  };

  const register = async (email: string, password: string, name: string, role: string) => {
    if (['manager', 'deputy_head', 'admin', 'support'].includes(role)) {
      throw new Error('\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044f \u043d\u0430 \u044d\u0442\u0443 \u0440\u043e\u043b\u044c \u043d\u0435\u0432\u043e\u0437\u043c\u043e\u0436\u043d\u0430');
    }
    const data = await authApi.register(email, password, name, role);
    setUser(data.user as User);
    return data;
  };

  const logout = async () => {
    try {
      await usersApi.markOffline();
    } catch {}
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    return Array.isArray(roles) ? roles.includes(user.role) : user.role === roles;
  };

  const isManagerOrHigher = hasRole([ROLES.MANAGER, ROLES.DEPUTY_HEAD, ROLES.ADMIN]);
  const canCreateTasks = hasRole([ROLES.ENGINEER, ROLES.MANAGER, ROLES.DEPUTY_HEAD, ROLES.ADMIN]);
  const canDeleteTasks = hasRole([ROLES.MANAGER, ROLES.DEPUTY_HEAD, ROLES.ADMIN]);
  const canManageUsers = hasRole([ROLES.MANAGER, ROLES.DEPUTY_HEAD, ROLES.ADMIN]);
  const canApproveRequests = hasRole([ROLES.MANAGER, ROLES.DEPUTY_HEAD, ROLES.ADMIN]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        session,
        signIn: async (email, password) => { await login(email, password); },
        signOut: logout,
        login,
        register,
        logout,
        isWorker: hasRole(ROLES.WORKER),
        isEngineer: hasRole(ROLES.ENGINEER),
        isManager: hasRole(ROLES.MANAGER),
        isDeputyHead: hasRole(ROLES.DEPUTY_HEAD),
        isAdmin: hasRole(ROLES.ADMIN),
        isManagerOrHigher,
        canCreateTasks,
        canDeleteTasks,
        canManageUsers,
        canApproveRequests,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
