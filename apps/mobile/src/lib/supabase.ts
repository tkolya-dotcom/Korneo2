import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper
const handle = <T>(data: T | null, error: { message: string } | null): T => {
  if (error) throw new Error(error.message);
  return data as T;
};

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const { data: user, error: userError } = await supabase.from('users').select('*').eq('id', data.user.id).single();
    if (userError) throw userError;
    return { token: data.session?.access_token || null, user };
  },
  register: async (email: string, password: string, name: string, role: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    const { data: user, error: userError } = await supabase.from('users').insert([{ id: data.user!.id, email, name, role }]).select().single();
    if (userError) throw userError;
    return { token: data.session?.access_token || null, user };
  },
  getMe: async () => {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) throw new Error('Not authenticated');
    const { data: user, error: userError } = await supabase.from('users').select('*').eq('id', authUser.id).single();
    if (userError) throw userError;
    return { user };
  },
  getUsers: async (role?: string) => {
    let query = supabase.from('users').select('*');
    if (role) query = query.eq('role', role);
    const { data, error } = await query;
    return handle(data, error);
  },
};

export const usersApi = {
  heartbeat: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('users').update({ is_online: true, last_seen_at: new Date().toISOString() }).eq('id', user.id);
  },
  markOffline: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('users').update({ is_online: false, last_seen_at: new Date().toISOString() }).eq('id', user.id);
  },
};

export const projectsApi = {
  getAll: async (status?: string) => {
    let query = supabase.from('projects').select('*');
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    return handle(data, error);
  },
  getById: async (id: string) => {
    const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
    return handle(data, error);
  },
  create: async (project: any) => {
    const { data, error } = await supabase.from('projects').insert([project]).select().single();
    return handle(data, error);
  },
  update: async (id: string, project: any) => {
    const { data, error } = await supabase.from('projects').update(project).eq('id', id).select().single();
    return handle(data, error);
  },
  delete: async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
  },
};

export const tasksApi = {
  getAll: async (filters: any = {}) => {
    let query = supabase.from('tasks').select('*, project:project_id(*), assignee:assignee_id(*)');
    if (filters.project_id) query = query.eq('project_id', filters.project_id);
    if (filters.assignee_id) query = query.eq('assignee_id', filters.assignee_id);
    if (filters.status) query = query.eq('status', filters.status);
    const { data, error } = await query;
    return handle(data, error);
  },
  getById: async (id: string) => {
    const { data, error } = await supabase.from('tasks').select('*, project:project_id(*), assignee:assignee_id(*)').eq('id', id).single();
    return handle(data, error);
  },
  create: async (task: any) => {
    const { data, error } = await supabase.from('tasks').insert([task]).select().single();
    return handle(data, error);
  },
  update: async (id: string, task: any) => {
    const { data, error } = await supabase.from('tasks').update(task).eq('id', id).select().single();
    return handle(data, error);
  },
  delete: async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
  },
  getArchived: async () => {
    const { data, error } = await supabase.from('tasks').select('*, project:project_id(*), assignee:assignee_id(*)').eq('is_archived', true);
    return handle(data, error);
  },
};

export const installationsApi = {
  getAll: async (filters: any = {}) => {
    let query = supabase.from('installations').select('*, project:project_id(*), assignee:assignee_id(*)');
    if (filters.project_id) query = query.eq('project_id', filters.project_id);
    if (filters.assignee_id) query = query.eq('assignee_id', filters.assignee_id);
    if (filters.status) query = query.eq('status', filters.status);
    const { data, error } = await query;
    return handle(data, error);
  },
  getById: async (id: string) => {
    const { data, error } = await supabase.from('installations').select('*, project:project_id(*), assignee:assignee_id(*), purchase_requests:purchase_requests(*)').eq('id', id).single();
    return handle(data, error);
  },
  create: async (inst: any) => {
    const { data, error } = await supabase.from('installations').insert([inst]).select().single();
    return handle(data, error);
  },
  update: async (id: string, inst: any) => {
    const { data, error } = await supabase.from('installations').update(inst).eq('id', id).select().single();
    return handle(data, error);
  },
  delete: async (id: string) => {
    const { error } = await supabase.from('installations').delete().eq('id', id);
    if (error) throw error;
  },
  getArchived: async () => {
    const { data, error } = await supabase.from('installations').select('*, project:project_id(*), assignee:assignee_id(*)').eq('is_archived', true);
    return handle(data, error);
  },
};

export const purchaseRequestsApi = {
  getAll: async (filters: any = {}) => {
    let query = supabase.from('purchase_requests').select('*, installation:installation_id(*), creator:creator_id(*), approved_by:approved_by_id(*)');
    if (filters.status) query = query.eq('status', filters.status);
    const { data, error } = await query;
    return handle(data, error);
  },
  getById: async (id: string) => {
    const { data, error } = await supabase.from('purchase_requests').select('*, items:purchase_request_items(*), installation:installation_id(*), creator:creator_id(*)').eq('id', id).single();
    return handle(data, error);
  },
  create: async (request: any) => {
    const { items, ...reqData } = request;
    const { data: pr, error: prError } = await supabase.from('purchase_requests').insert([reqData]).select().single();
    if (prError) throw prError;
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({ ...item, purchase_request_id: pr.id }));
      const { error: itemsError } = await supabase.from('purchase_request_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;
    }
    return pr;
  },
  updateStatus: async (id: string, status: string, comment?: string, receipt_address?: string, received_at?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const update: any = { status, comment, receipt_address, received_at };
    if (status === 'approved' || status === 'completed') update.approved_by_id = user?.id;
    const { data, error } = await supabase.from('purchase_requests').update(update).eq('id', id).select().single();
    return handle(data, error);
  },
};

export const materialsApi = {
  getAll: async () => {
    const { data, error } = await supabase.from('materials').select('*');
    return handle(data, error);
  },
  search: async (searchTerm: string) => {
    const { data, error } = await supabase.from('materials').select('*').ilike('name', `%${searchTerm}%`);
    return handle(data, error);
  },
};