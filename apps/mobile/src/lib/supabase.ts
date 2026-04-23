import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

const supabaseUrl =
  extra.supabaseUrl ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  '';

const supabaseAnonKey =
  extra.supabaseAnonKey ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration for mobile app.');
}

const REQUEST_TIMEOUT_MS = 12000;
const LIST_LIMIT = 50;
const READ_RETRY_ATTEMPTS = 3;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const withTimeout = async <T>(
  promise: PromiseLike<T>,
  label = 'request',
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const isTransientError = (error: unknown): boolean => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  const normalized = message.toLowerCase();
  return (
    normalized.includes('timed out') ||
    normalized.includes('timeout') ||
    normalized.includes('network') ||
    normalized.includes('socket') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('err_')
  );
};

const withReadRetry = async <T>(
  requestFactory: () => PromiseLike<T>,
  label: string,
  attempts = READ_RETRY_ATTEMPTS
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await withTimeout(requestFactory(), label);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isTransientError(error)) {
        throw error;
      }
      await wait(300 * attempt);
    }
  }

  throw lastError ?? new Error(`${label} failed`);
};

const handle = <T>(data: T | null, error: { message: string } | null): T => {
  if (error) {
    throw new Error(error.message);
  }
  return data as T;
};

const safeSingle = async <T>(
  requestFactory: () => PromiseLike<any>,
  label = 'load record'
) => {
  const { data, error } = await withReadRetry<any>(requestFactory, label);
  if (error?.code === 'PGRST116') {
    return null;
  }
  if (error) {
    throw error;
  }
  return data;
};

const getFallbackUser = (authUser: { id: string; email?: string | null }) => ({
  id: authUser.id,
  auth_user_id: authUser.id,
  email: authUser.email || '',
  name: authUser.email?.split('@')[0] || 'Пользователь',
  role: 'worker',
  is_online: false,
});

const buildFallbackUser = (authUser: { id: string; email?: string | null }) => ({
  id: authUser.id,
  auth_user_id: authUser.id,
  email: authUser.email || '',
  name: authUser.email?.split('@')[0] || '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c',
  role: 'worker',
  is_online: false,
});

type AuthUserLike = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

const FALLBACK_NAME = '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c';
const VALID_USER_ROLES = ['worker', 'engineer', 'manager', 'deputy_head', 'admin', 'support'] as const;
type UserRole = (typeof VALID_USER_ROLES)[number];

const resolveAuthRole = (authUser: AuthUserLike): UserRole => {
  const candidate = authUser.user_metadata?.role ?? authUser.app_metadata?.role;
  if (typeof candidate !== 'string') {
    return 'worker';
  }
  return (VALID_USER_ROLES as readonly string[]).includes(candidate)
    ? (candidate as UserRole)
    : 'worker';
};

const resolveAuthName = (authUser: AuthUserLike): string => {
  const metadataName =
    authUser.user_metadata?.name ??
    authUser.user_metadata?.full_name ??
    authUser.app_metadata?.name;

  if (typeof metadataName === 'string' && metadataName.trim()) {
    return metadataName.trim();
  }

  const emailName = authUser.email?.split('@')[0]?.trim();
  return emailName || FALLBACK_NAME;
};

const buildAuthFallbackUser = (authUser: AuthUserLike) => ({
  id: authUser.id,
  auth_user_id: authUser.id,
  email: authUser.email || '',
  name: resolveAuthName(authUser),
  role: resolveAuthRole(authUser),
  is_online: false,
});

const getProfileByAuthUserId = async (authUserId: string) =>
  safeSingle(
    () =>
      supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single(),
    'load user profile'
  );

const getProfileByUserId = async (userId: string) =>
  safeSingle(
    () =>
      supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single(),
    'load user profile by id'
  );

const resolveUserProfile = async (authUser: AuthUserLike) => {
  try {
    const profile =
      (await getProfileByAuthUserId(authUser.id)) ||
      (await getProfileByUserId(authUser.id));
    return (profile || buildAuthFallbackUser(authUser)) as any;
  } catch (error) {
    console.warn('Using fallback profile because users query failed:', error);
    return buildAuthFallbackUser(authUser) as any;
  }
};

const getCurrentProfile = async () => {
  const {
    data: { user: authUser },
    error,
  } = await withTimeout(supabase.auth.getUser(), 'load auth user');

  if (error || !authUser) {
    throw new Error('Not authenticated');
  }

  return {
    authUser,
    user: await resolveUserProfile(authUser as AuthUserLike),
  };
};

export const authApi = {
  login: async (email: string, password: string) => {
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      'sign in',
      12000
    );
    if (error) {
      throw error;
    }

    const profile = await resolveUserProfile(data.user as AuthUserLike);

    return { token: data.session?.access_token || null, user: profile as any };
  },

  register: async (email: string, password: string, name: string, role: string) => {
    const { data, error } = await withTimeout(
      supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role },
        },
      }),
      'register',
      12000
    );

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('Registration failed');
    }

    const profile = await resolveUserProfile(data.user as AuthUserLike);

    return { token: data.session?.access_token || null, user: { ...(profile as any), name, role } };
  },

  getMe: async () => {
    const { user } = await getCurrentProfile();
    return { user };
  },

  getUsers: async (role?: string) => {
    const { data, error } = await withReadRetry(() => {
      let query = supabase.from('users').select('*').order('name').limit(LIST_LIMIT);
      if (role) {
        query = query.eq('role', role);
      }
      return query;
    }, 'load users');
    return handle(data, error);
  },
};

export const usersApi = {
  heartbeat: async () => {
    const { authUser, user } = (await getCurrentProfile()) as any;
    await supabase
      .from('users')
      .update({ is_online: true, last_seen_at: new Date().toISOString() })
      .eq('id', user.id || authUser.id);
  },

  markOffline: async () => {
    try {
      const { authUser, user } = await getCurrentProfile();
      await supabase
        .from('users')
        .update({ is_online: false, last_seen_at: new Date().toISOString() })
        .eq('id', user.id || authUser.id);
    } catch {
      // Ignore sign-out cleanup errors.
    }
  },
};

export const projectsApi = {
  getAll: async (status?: string) => {
    const { data, error } = await withReadRetry(() => {
      let query = supabase
        .from('projects')
        .select('*, manager:manager_id(*)')
        .order('created_at', { ascending: false })
        .limit(LIST_LIMIT);

      if (status) {
        query = query.eq('status', status);
      }

      return query;
    }, 'load projects');
    return handle(data, error);
  },

  getById: async (id: string) => {
    const { data, error } = await withReadRetry(
      () =>
        supabase
          .from('projects')
          .select('*, manager:manager_id(*)')
          .eq('id', id)
          .single(),
      'load project'
    );

    return handle(data, error);
  },

  create: async (project: Record<string, unknown>) => {
    const { data, error } = await supabase
      .from('projects')
      .insert([project])
      .select()
      .single();

    return handle(data, error);
  },

  update: async (id: string, project: Record<string, unknown>) => {
    const { data, error } = await supabase
      .from('projects')
      .update(project)
      .eq('id', id)
      .select()
      .single();

    return handle(data, error);
  },

  delete: async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      throw error;
    }
  },
};

export const tasksApi = {
  getAll: async (filters: Record<string, string> = {}) => {
    const { data, error } = await withReadRetry(() => {
      let query = supabase
        .from('tasks')
        .select('*, project:project_id(*), assignee:assignee_id(*)')
        .order('created_at', { ascending: false })
        .limit(LIST_LIMIT);

      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id);
      }
      if (filters.assignee_id) {
        query = query.eq('assignee_id', filters.assignee_id);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      return query;
    }, 'load tasks');
    return handle(data, error);
  },

  getById: async (id: string) => {
    const { data, error } = await withReadRetry(
      () =>
        supabase
          .from('tasks')
          .select('*, project:project_id(*), assignee:assignee_id(*)')
          .eq('id', id)
          .single(),
      'load task'
    );

    return handle(data, error);
  },

  create: async (task: Record<string, unknown>) => {
    const { user } = (await getCurrentProfile()) as any;
    const payload = { ...task, created_by: user.id };

    const { data, error } = await supabase
      .from('tasks')
      .insert([payload])
      .select()
      .single();

    return handle(data, error);
  },

  update: async (id: string, task: Record<string, unknown>) => {
    const { data, error } = await supabase
      .from('tasks')
      .update(task)
      .eq('id', id)
      .select()
      .single();

    return handle(data, error);
  },

  delete: async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      throw error;
    }
  },

  getArchived: async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, project:project_id(*), assignee:assignee_id(*)')
      .eq('is_archived', true)
      .order('updated_at', { ascending: false });

    return handle(data, error);
  },
};

export const installationsApi = {
  getAll: async (filters: Record<string, string> = {}) => {
    const { data, error } = await withReadRetry(() => {
      let query = supabase
        .from('installations')
        .select('*, project:project_id(*), assignee:assignee_id(*)')
        .order('created_at', { ascending: false })
        .limit(LIST_LIMIT);

      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id);
      }
      if (filters.assignee_id) {
        query = query.eq('assignee_id', filters.assignee_id);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      return query;
    }, 'load installations');
    return handle(data, error);
  },

  getById: async (id: string) => {
    const { data, error } = await withReadRetry(
      () =>
        supabase
          .from('installations')
          .select('*, project:project_id(*), assignee:assignee_id(*)')
          .eq('id', id)
          .single(),
      'load installation'
    );

    const installation = handle(data, error);

    const { data: purchaseRequests, error: purchaseError } = await withReadRetry(
      () =>
        supabase
          .from('purchase_requests')
          .select('*, items:purchase_request_items(*), creator:created_by(id, name, email), approved_by_user:approved_by(id, name)')
          .eq('installation_id', id)
          .order('created_at', { ascending: false }),
      'load installation purchase requests'
    );

    if (purchaseError) {
      throw purchaseError;
    }

    return { ...installation, purchase_requests: purchaseRequests || [] };
  },

  create: async (installation: Record<string, unknown>) => {
    const { user } = (await getCurrentProfile()) as any;
    const payload = { ...installation, created_by: user.id };

    const { data, error } = await supabase
      .from('installations')
      .insert([payload])
      .select()
      .single();

    return handle(data, error);
  },

  update: async (id: string, installation: Record<string, unknown>) => {
    const { data, error } = await supabase
      .from('installations')
      .update(installation)
      .eq('id', id)
      .select()
      .single();

    return handle(data, error);
  },

  delete: async (id: string) => {
    const { error } = await supabase.from('installations').delete().eq('id', id);
    if (error) {
      throw error;
    }
  },

  getArchived: async () => {
    const { data, error } = await supabase
      .from('installations')
      .select('*, project:project_id(*), assignee:assignee_id(*)')
      .eq('is_archived', true)
      .order('updated_at', { ascending: false });

    return handle(data, error);
  },
};

export const purchaseRequestsApi = {
  getAll: async (filters: Record<string, string> = {}) => {
    const { data, error } = await withReadRetry(() => {
      let query = supabase
        .from('purchase_requests')
        .select('*, items:purchase_request_items(*), installation:installation_id(id, title, address), creator:created_by(id, name, email), approved_by_user:approved_by(id, name)')
        .order('created_at', { ascending: false })
        .limit(LIST_LIMIT);

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.created_by) {
        query = query.eq('created_by', filters.created_by);
      }

      return query;
    }, 'load purchase requests');
    return handle(data, error);
  },

  getById: async (id: string) => {
    const { data, error } = await withReadRetry(
      () =>
        supabase
          .from('purchase_requests')
          .select('*, items:purchase_request_items(*), installation:installation_id(id, title, address), task:task_id(id, title), creator:created_by(id, name, email), approved_by_user:approved_by(id, name)')
          .eq('id', id)
          .single(),
      'load purchase request'
    );

    return handle(data, error);
  },

  create: async (request: Record<string, any>) => {
    const { items = [], ...rest } = request;
    const { user } = (await getCurrentProfile()) as any;

    const { data: createdRequest, error: requestError } = await supabase
      .from('purchase_requests')
      .insert([{ ...rest, created_by: user.id }])
      .select()
      .single();

    if (requestError) {
      throw requestError;
    }

    if (items.length > 0) {
      const preparedItems = items.map((item: Record<string, unknown>) => ({
        ...item,
        purchase_request_id: createdRequest.id,
      }));

      const { error: itemsError } = await supabase
        .from('purchase_request_items')
        .insert(preparedItems);

      if (itemsError) {
        throw itemsError;
      }
    }

    return createdRequest;
  },

  updateStatus: async (id: string, status: string, comment?: string) => {
    const { user } = await getCurrentProfile();
    const payload: Record<string, unknown> = {
      status,
      comment,
      updated_at: new Date().toISOString(),
    };

    if (status === 'approved' || status === 'rejected' || status === 'completed') {
      payload.approved_by = user.id;
    }

    const { data, error } = await supabase
      .from('purchase_requests')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    return handle(data, error);
  },
};

export const materialsApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .order('name');

    return handle(data, error);
  },

  search: async (searchTerm: string) => {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .ilike('name', `%${searchTerm}%`)
      .order('name');

    return handle(data, error);
  },
};

export const warehouseApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('warehouse')
      .select('*, material:material_id(*)')
      .order('updated_at', { ascending: false });

    return handle(data, error).map((row: any) => ({
      ...row,
      quantity_available: row.quantity ?? 0,
    }));
  },
};

type CommentEntityType = 'task' | 'installation';

export const commentsApi = {
  getByEntity: async (entityId: string, entityType: CommentEntityType) => {
    const { data, error } = await supabase
      .from('comments')
      .select('*, author:users!comments_user_id_fkey(id, name, email)')
      .eq('entity_id', entityId)
      .eq('entity_type', entityType)
      .order('created_at', { ascending: true });

    return handle(data, error);
  },

  create: async (entityId: string, content: string, entityType: CommentEntityType) => {
    const { user } = await getCurrentProfile();
    const { data, error } = await supabase
      .from('comments')
      .insert([
        {
          entity_id: entityId,
          entity_type: entityType,
          user_id: user.id,
          content,
        },
      ])
      .select()
      .single();

    return handle(data, error);
  },

  subscribe: (entityId: string, entityType: CommentEntityType, onChange: () => void) =>
    supabase
      .channel(`comments-${entityType}-${entityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `entity_id=eq.${entityId}`,
        },
        (payload) => {
          if (payload.new && (payload.new as Record<string, unknown>).entity_type !== entityType) {
            return;
          }
          onChange();
        }
      )
      .subscribe(),
};
