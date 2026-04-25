import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  phone?: string | null;
  username?: string | null;
  birthday?: string | null;
  created_at?: string | null;
  last_seen?: string | null;
  last_seen_at?: string | null;
  avatar_url?: string | null;
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
  isSupport: boolean;
  isElevatedUser: boolean;
  isManagerOrHigher: boolean;
  canCreateTasks: boolean;
  canCreateInstallations: boolean;
  canCreateProjects: boolean;
  canCreatePurchaseRequests: boolean;
  canDeleteTasks: boolean;
  canManageUsers: boolean;
  canApproveRequests: boolean;
  canViewWarehouse: boolean;
  canViewSites: boolean;
  canViewAtss: boolean;
  canViewArchive: boolean;
  canViewUsers: boolean;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const validRoles: UserRole[] = ['worker', 'engineer', 'manager', 'deputy_head', 'admin', 'support'];
const AUTH_BOOTSTRAP_VERSION = '3';
const AUTH_BOOTSTRAP_KEY = '@korneo/auth_bootstrap_version';
const AUTH_USER_CACHE_KEY = '@korneo/auth_user_cache_v1';

type AuthMetadataUser = {
  id?: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

const normalizeRoleSafe = (value: unknown): UserRole => {
  if (typeof value !== 'string') {
    return 'worker';
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/-/g, '_')
    .replace(/\u0451/g, '\u0435');

  if (!normalized) {
    return 'worker';
  }

  if (validRoles.includes(normalized as UserRole)) {
    return normalized as UserRole;
  }

  if (
    normalized.includes('deputy') ||
    normalized.includes('\u0437\u0430\u043c\u0435\u0441\u0442') ||
    normalized.includes('\u0437\u0430\u043c ')
  ) {
    return 'deputy_head';
  }
  if (
    normalized.includes('manager') ||
    normalized.includes('\u0440\u0443\u043a\u043e\u0432\u043e\u0434') ||
    normalized.includes('\u043d\u0430\u0447\u0430\u043b\u044c') ||
    normalized.includes('\u0440\u0443\u043a-\u043b\u044c')
  ) {
    return 'manager';
  }
  if (normalized.includes('engineer') || normalized.includes('\u0438\u043d\u0436\u0435\u043d')) {
    return 'engineer';
  }
  if (normalized.includes('admin') || normalized.includes('\u0430\u0434\u043c\u0438\u043d')) {
    return 'admin';
  }
  if (
    normalized.includes('support') ||
    normalized.includes('\u043f\u043e\u0434\u0434\u0435\u0440\u0436') ||
    normalized.includes('\u0442\u0435\u0445\u043f\u043e\u0434\u0434\u0435\u0440\u0436')
  ) {
    return 'support';
  }
  if (
    normalized.includes('worker') ||
    normalized.includes('\u0438\u0441\u043f\u043e\u043b\u043d') ||
    normalized.includes('\u043c\u043e\u043d\u0442\u0430\u0436')
  ) {
    return 'worker';
  }

  return 'worker';
};

const resolveRoleFromAuth = (authUser: AuthMetadataUser): UserRole => {
  const roleCandidate = authUser.user_metadata?.role ?? authUser.app_metadata?.role;
  return normalizeRoleSafe(roleCandidate);
};

const resolveNameFromAuth = (authUser: AuthMetadataUser): string => {
  const metadataName =
    authUser.user_metadata?.name ??
    authUser.user_metadata?.full_name ??
    authUser.app_metadata?.name;

  if (typeof metadataName === 'string' && metadataName.trim()) {
    return metadataName.trim();
  }

  return authUser.email?.split('@')[0] || '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c';
};

const buildAuthFallbackUser = (authUser: AuthMetadataUser & { id: string }): User => ({
  id: authUser.id,
  auth_user_id: authUser.id,
  email: authUser.email || '',
  name: resolveNameFromAuth(authUser),
  role: resolveRoleFromAuth(authUser),
  is_online: false,
});

const normalizeUserProfile = (
  rawUser: Partial<User> | null | undefined,
  authUser?: AuthMetadataUser
): User => {
  const authId = authUser?.id || rawUser?.auth_user_id || rawUser?.id || '';
  const id = rawUser?.id || authId;
  const email = rawUser?.email || authUser?.email || '';

  const resolvedName =
    typeof rawUser?.name === 'string' && rawUser.name.trim()
      ? rawUser.name.trim()
      : resolveNameFromAuth({
          id: authId,
          email,
          user_metadata: authUser?.user_metadata,
          app_metadata: authUser?.app_metadata,
        });

  return {
    id,
    auth_user_id: rawUser?.auth_user_id || authId || id,
    email,
    name: resolvedName,
    role: normalizeRoleSafe(rawUser?.role ?? authUser?.user_metadata?.role ?? authUser?.app_metadata?.role),
    is_online: rawUser?.is_online,
    fcm_token: rawUser?.fcm_token,
    phone: (rawUser as any)?.phone ?? null,
    username: (rawUser as any)?.username ?? null,
    birthday: (rawUser as any)?.birthday ?? null,
    created_at: (rawUser as any)?.created_at ?? null,
    last_seen: (rawUser as any)?.last_seen ?? null,
    last_seen_at: (rawUser as any)?.last_seen_at ?? null,
    avatar_url: (rawUser as any)?.avatar_url ?? null,
  };
};

const loadCachedUsers = async (): Promise<Record<string, User>> => {
  try {
    const serialized = await AsyncStorage.getItem(AUTH_USER_CACHE_KEY);
    if (!serialized) {
      return {};
    }
    const parsed = JSON.parse(serialized) as Record<string, User> | null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn('Failed to parse auth user cache:', error);
    return {};
  }
};

const saveCachedUser = async (authUserId: string, profile: User) => {
  if (!authUserId) {
    return;
  }

  const cached = await loadCachedUsers();
  cached[authUserId] = profile;
  try {
    await AsyncStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(cached));
  } catch (error) {
    console.warn('Failed to persist auth user cache:', error);
  }
};

const getCachedUser = async (authUser: AuthMetadataUser & { id: string }): Promise<User | null> => {
  const cached = await loadCachedUsers();
  const direct = cached[authUser.id];
  if (direct) {
    return normalizeUserProfile(direct, authUser);
  }

  const email = authUser.email?.toLowerCase().trim();
  if (!email) {
    return null;
  }

  const fallback = Object.values(cached).find(
    (item) =>
      item?.auth_user_id === authUser.id ||
      (item?.email ? item.email.toLowerCase().trim() === email : false)
  );

  return fallback ? normalizeUserProfile(fallback, authUser) : null;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const isAuthSessionError = (error: unknown) => {
  if (!error) return false;
  const typedError = error as { message?: string; name?: string; status?: number; code?: string };
  const message = (typedError.message || '').toLowerCase();
  const name = (typedError.name || '').toLowerCase();

  return (
    typedError.status === 401 ||
    typedError.code === '401' ||
    typedError.code === 'PGRST301' ||
    typedError.code === 'invalid_jwt' ||
    name.includes('auth') ||
    message.includes('not authenticated') ||
    message.includes('auth session missing') ||
    message.includes('invalid login credentials') ||
    message.includes('invalid jwt') ||
    message.includes('jwt expired') ||
    message.includes('refresh token') ||
    message.includes('session expired')
  );
};

const signOutLocalFirst = async () => {
  try {
    await withTimeout(supabase.auth.signOut({ scope: 'local' }), 'local sign out', 2500);
    return;
  } catch (localError) {
    console.warn('Local signOut failed, trying short remote signOut:', localError);
  }

  try {
    await withTimeout(supabase.auth.signOut(), 'remote sign out', 3500);
  } catch (remoteError) {
    console.warn('Remote signOut skipped:', remoteError);
  }
};

const ensureBootstrapVersion = async () => {
  const version = await AsyncStorage.getItem(AUTH_BOOTSTRAP_KEY);
  if (version === AUTH_BOOTSTRAP_VERSION) {
    return;
  }
  await AsyncStorage.setItem(AUTH_BOOTSTRAP_KEY, AUTH_BOOTSTRAP_VERSION);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async (authUser: AuthMetadataUser & { id: string }) => {
      try {
        const data = await authApi.getMe();
        if (!mounted) return true;
        const normalizedUser = normalizeUserProfile(data.user as User, authUser);
        setUser(normalizedUser);
        await saveCachedUser(authUser.id, normalizedUser);
        usersApi.heartbeat();
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
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      usersApi.markOffline();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
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
    return data;
  };

  const register = async (email: string, password: string, name: string, role: string) => {
    if (['manager', 'deputy_head', 'admin', 'support'].includes(role)) {
      throw new Error('\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044f \u043d\u0430 \u044d\u0442\u0443 \u0440\u043e\u043b\u044c \u043d\u0435\u0432\u043e\u0437\u043c\u043e\u0436\u043d\u0430');
    }
    const data = await authApi.register(email, password, name, role);
    const normalizedUser = normalizeUserProfile(data.user as User, {
      id: (data.user as User)?.auth_user_id || (data.user as User)?.id,
      email,
    });
    setUser(normalizedUser);
    await saveCachedUser(normalizedUser.auth_user_id || normalizedUser.id, normalizedUser);
    return data;
  };

  const logout = async () => {
    try {
      await usersApi.markOffline();
    } catch {}

    try {
      await signOutLocalFirst();
    } catch (error) {
      console.warn('Sign out error:', error);
    } finally {
      setUser(null);
      setSession(null);
    }
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    return Array.isArray(roles) ? roles.includes(user.role) : user.role === roles;
  };

  const isSupport = hasRole(ROLES.SUPPORT);
  const isElevatedUser = hasRole([ROLES.MANAGER, ROLES.DEPUTY_HEAD, ROLES.ADMIN, ROLES.SUPPORT]);
  const isManagerOrHigher = hasRole([ROLES.MANAGER, ROLES.DEPUTY_HEAD, ROLES.ADMIN]);
  const canCreateTasks = hasRole([
    ROLES.MANAGER,
    ROLES.DEPUTY_HEAD,
    ROLES.ADMIN,
    ROLES.SUPPORT,
  ]);
  const canCreateInstallations = canCreateTasks;
  const canCreateProjects = isElevatedUser;
  const canCreatePurchaseRequests = hasRole([
    ROLES.WORKER,
    ROLES.ENGINEER,
    ROLES.MANAGER,
    ROLES.DEPUTY_HEAD,
    ROLES.ADMIN,
    ROLES.SUPPORT,
  ]);
  const canDeleteTasks = hasRole([ROLES.MANAGER, ROLES.DEPUTY_HEAD, ROLES.ADMIN]);
  const canManageUsers = hasRole([ROLES.MANAGER, ROLES.DEPUTY_HEAD, ROLES.ADMIN]);
  const canApproveRequests = isElevatedUser;
  const canViewWarehouse = isElevatedUser;
  const canViewSites = isElevatedUser;
  const canViewAtss = isElevatedUser;
  const canViewArchive = isElevatedUser;
  const canViewUsers = canManageUsers;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        session,
        signIn: async (email, password) => {
          await login(email, password);
        },
        signOut: logout,
        login,
        register,
        logout,
        isWorker: hasRole(ROLES.WORKER),
        isEngineer: hasRole(ROLES.ENGINEER),
        isManager: hasRole(ROLES.MANAGER),
        isDeputyHead: hasRole(ROLES.DEPUTY_HEAD),
        isAdmin: hasRole(ROLES.ADMIN),
        isSupport,
        isElevatedUser,
        isManagerOrHigher,
        canCreateTasks,
        canCreateInstallations,
        canCreateProjects,
        canCreatePurchaseRequests,
        canDeleteTasks,
        canManageUsers,
        canApproveRequests,
        canViewWarehouse,
        canViewSites,
        canViewAtss,
        canViewArchive,
        canViewUsers,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
