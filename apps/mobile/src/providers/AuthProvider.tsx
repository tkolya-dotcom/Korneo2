import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi, usersApi, supabase } from '@/src/lib/supabase';

// Роли приложения (как в веб-версии)
export type UserRole = 'worker' | 'engineer' | 'manager' | 'deputy_head' | 'admin';

export const ROLES = {
  WORKER: 'worker',
  ENGINEER: 'engineer',
  MANAGER: 'manager',
  DEPUTY_HEAD: 'deputy_head',
  ADMIN: 'admin',
} as const;

export type User = {
  id: string;
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
  // Проверки ролей (как в веб-приложении)
  isWorker: boolean;
  isEngineer: boolean;
  isManager: boolean;
  isDeputyHead: boolean;
  isAdmin: boolean;
  isManagerOrHigher: boolean; // manager, deputy_head, admin
  // Проверки прав
  canCreateTasks: boolean;    // engineer, manager, deputy_head, admin
  canDeleteTasks: boolean;    // manager, deputy_head, admin
  canManageUsers: boolean;    // manager, deputy_head, admin
  canApproveRequests: boolean; // manager, deputy_head, admin
  hasRole: (roles: UserRole | UserRole[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Проверка роли как в веб-приложении
const checkRole = (userRole: UserRole | undefined, requiredRoles: UserRole[]): boolean => {
  if (!userRole) return false;
  return requiredRoles.includes(userRole);
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
          // Heartbeat для online статуса
          usersApi.heartbeat();
        } catch { setUser(null); }
      }
      if (mounted) setLoading(false);
    };
    init();

    // Подписка на изменения аутентификации
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (!s?.access_token) { setUser(null); return; }
      try {
        const data = await authApi.getMe();
        setUser(data.user);
        usersApi.heartbeat();
      } catch { setUser(null); }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      // Помечаем offline при выходе
      usersApi.markOffline();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setUser(data.user);
    usersApi.heartbeat();
    return data;
  };

  const register = async (email: string, password: string, name: string, role: string) => {
    // Проверка на запрещённые роли (как в веб-приложении)
    if (['manager', 'deputy_head', 'admin'].includes(role)) {
      throw new Error('Регистрация на эту роль невозможна');
    }
    const data = await authApi.register(email, password, name, role);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try { await usersApi.markOffline(); } catch {}
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  // Проверка роли
  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    if (Array.isArray(roles)) {
      return roles.includes(user.role as UserRole);
    }
    return user.role === roles;
  };

  // Права пользователя
  const isManagerOrHigher = hasRole([ROLES.MANAGER, ROLES.DEPUTY_HEAD, ROLES.ADMIN]);
  const canCreateTasks = hasRole([ROLES.ENGINEER, ROLES.MANAGER, ROLES.DEPUTY_HEAD, ROLES.ADMIN]);
  const canDeleteTasks = hasRole([ROLES.MANAGER, ROLES.DEPUTY_HEAD, ROLES.ADMIN]);
  const canManageUsers = hasRole([ROLES.MANAGER, ROLES.DEPUTY_HEAD, ROLES.ADMIN]);
  const canApproveRequests = hasRole([ROLES.MANAGER, ROLES.DEPUTY_HEAD, ROLES.ADMIN]);

  return (
    <AuthContext.Provider value={{
      user, loading, session,
      signIn: async (email, password) => { await login(email, password); },
      signOut: logout,
      login, register, logout,
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
    }}>
      {children}
    </AuthContext.Provider>
  );
};
