import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase URL - синхронизация с веб-приложением
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://jmxjbdnqnzkzxgsfywha.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpteGpiZG5xbnprenhnc2Z5d2hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNTQ0MzQsImV4cCI6MjA4NjczMDQzNH0.z6y6DGs9Z6kojQYeAdsgKA-m4pxuoeABdY4rAojPEE4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		storage: AsyncStorage,
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: false,
	},
});

// Helper для обработки ошибок
const handle = <T>(data: T | null, error: { message: string } | null): T => {
	if (error) throw new Error(error.message);
	return data as T;
};

// Auth API - как в веб-приложении
export const authApi = {
	login: async (email: string, password: string) => {
		const { data, error } = await supabase.auth.signInWithPassword({ email, password });
		if (error) throw error;

		const { data: user, error: userError } = await supabase
			.from('users')
			.select('*')
			.eq('id', data.user.id)
			.single();

		if (userError) {
			if (userError.code === 'PGRST116') {
				return { token: data.session?.access_token || null, user: { id: data.user.id, email: data.user.email, role: 'worker' } };
			}
			throw userError;
		}
		return { token: data.session?.access_token || null, user };
	},

	register: async (email: string, password: string, name: string, role: string) => {
		const { data, error } = await supabase.auth.signUp({ email, password });
		if (error) throw error;

		const { data: user, error: userError } = await supabase
			.from('users')
			.insert([{ id: data.user!.id, email, name, role }])
			.select()
			.single();

		if (userError) {
			console.error('Ошибка создания профиля:', userError);
			return { token: data.session?.access_token || null, user: { id: data.user!.id, email, name, role } };
		}
		return { token: data.session?.access_token || null, user };
	},

	getMe: async () => {
		const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
		if (authError || !authUser) throw new Error('Not authenticated');

		const { data: user, error: userError } = await supabase
			.from('users')
			.select('*')
			.eq('id', authUser.id)
			.single();

		if (userError) {
			if (userError.code === 'PGRST116') {
				return { user: { id: authUser.id, email: authUser.email, role: 'worker', name: authUser.email?.split('@')[0] } };
			}
			throw userError;
		}
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
		if (error) throw error;
		// Загружаем manager отдельно
		if (data && data.length > 0) {
			const managerIds = [...new Set(data.filter((p: any) => p.manager_id).map((p: any) => p.manager_id))];
			if (managerIds.length > 0) {
				const { data: managers } = await supabase.from('users').select('*').in('id', managerIds);
				const managerMap = (managers || []).reduce((acc: any, m: any) => { acc[m.id] = m; return acc; }, {});
				return data.map((p: any) => ({ ...p, manager: managerMap[p.manager_id] || null }));
			}
		}
		return data || [];
	},
	getById: async (id: string) => {
		const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
		if (error) throw error;
		if (data?.manager_id) {
			const { data: manager } = await supabase.from('users').select('*').eq('id', data.manager_id).maybeSingle();
			return { ...data, manager: manager || null };
		}
		return data;
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
		const { data: { user } } = await supabase.auth.getUser();
		const { data, error } = await supabase.from('tasks').insert([{ ...task, created_by: user?.id }]).select().single();
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
		const { data: { user } } = await supabase.auth.getUser();
		const { data, error }= await supabase.from('installations').insert([{ ...inst, created_by: user?.id }]).select().single();
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
	updateItemQuantityIssued: async (itemId: string, quantityIssued: number) => {
		const { data, error } = await supabase.from('purchase_request_items').update({ quantity_issued: quantityIssued }).eq('id', itemId).select().single();
		return handle(data, error);
	},
};

// Warehouse API (склад) - исправлено для quantity_available
export const warehouseApi = {
	getAll: async () => {
		const { data, error } = await supabase.from('warehouse').select('*, material:material_id(*)').order('created_at', { ascending: false });
		return handle(data, error);
	},
	getByMaterial: async (materialId: string) => {
		const { data, error } = await supabase.from('warehouse').select('*').eq('material_id', materialId).order('created_at', { ascending: false });
		return handle(data, error);
	},
	addStock: async (materialId: string, quantity: number, comment?: string) => {
		const { data, error } = await supabase.from('warehouse').insert([{ material_id: materialId, quantity_available: quantity, comment: comment || 'Приход' }]).select().single();
		return handle(data, error);
	},
	removeStock: async (materialId: string, quantity: number, comment?: string) => {
		// Отрицательное значение quantity_available для списания
		const { data, error } = await supabase.from('warehouse').insert([{ material_id: materialId, quantity_available: -quantity, comment: comment || 'Списание' }]).select().single();
		return handle(data, error);
	},
};

// Materials API (справочник материалов)
export const materialsApi = {
	getAll: async () => {
		const { data, error } = await supabase.from('materials').select('*').order('name');
		return handle(data, error);
	},
	search: async (searchTerm: string) => {
		const { data, error } = await supabase.from('materials').select('*').ilike('name', `%${searchTerm}%`);
		return handle(data, error);
	},
	updateStock: async (id: string, quantity: number) => {
		const { data, error } = await supabase.from('materials').update({ quantity }).eq('id', id).select().single();
		return handle(data, error);
	},
};

// Equipment Changes API (изменения оборудования)
export const equipmentChangesApi = {
	getByInstallation: async (installationId: string) => {
		const { data, error } = await supabase.from('equipment_changes').select('*').eq('installation_id', installationId).order('created_at', { ascending: false });
		return handle(data, error);
	},
	create: async (change: { installation_id: string; change_type: string; field_name: string; old_value: string; new_value: string }) => {
		const { data, error } = await supabase.from('equipment_changes').insert([change]).select().single();
		return handle(data, error);
	},
};

// Chat API - как в веб-приложении js/chat.js
export const chatsApi = {
	getAll: async () => {
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) throw new Error('Not authenticated');

		const { data, error } = await supabase
			.from('chat_members')
			.select('*, chat:chats(*)')
			.eq('user_id', user.id);

		if (error) throw error;
		return (data || []).map((m: any) => m.chat).filter(Boolean);
	},

	getMessages: async (chatId: string, limit = 50) => {
		const { data, error } = await supabase
			.from('messages')
			.select('*, sender:sender_id(*)')
			.eq('chat_id', chatId)
			.order('created_at', { ascending: false })
			.limit(limit);
		if (error) throw error;
		return (data || []).reverse();
	},

	sendMessage: async (chatId: string, content: string) => {
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) throw new Error('Not authenticated');

		const { data, error } = await supabase
			.from('messages')
			.insert([{ chat_id: chatId, sender_id: user.id, content, type: 'text' }])
			.select()
			.single();
		if (error) throw error;
		return data;
	},

	createChat: async (name: string, type: string = 'private', memberIds: string[] = []) => {
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) throw new Error('Not authenticated');

		const { data: chat, error: chatError } = await supabase
			.from('chats')
			.insert([{ name, type, created_by: user.id }])
			.select()
			.single();
		if (chatError) throw chatError;

		const members = [
			{ chat_id: chat.id, user_id: user.id },
			...memberIds.filter((id: string) => id !== user.id).map((id: string) => ({ chat_id: chat.id, user_id: id }))
		];
		await supabase.from('chat_members').insert(members);

		return chat;
	},

	subscribeToMessages: (chatId: string, callback: (msg: any) => void) => {
		return supabase
			.channel(`messages:${chatId}`)
			.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, (payload: any) => {
				callback(payload.new);
			})
			.subscribe();
	},
};

// Sites API (площадки)
export const sitesApi = {
	getAll: async () => {
		const { data, error } = await supabase.from('sites').select('*').order('name');
		return handle(data, error);
	},
	getById: async (id: string) => {
		const { data, error } = await supabase.from('sites').select('*').eq('id', id).single();
		return handle(data, error);
	},
};

// Tasks AVR API (Аварийно-Восстановительные Работы)
export const tasksAvrApi = {
	getAll: async (filters: any = {}) => {
		let query = supabase.from('tasks_avr').select('*, project:project_id(*), assignee:assignee_id(*)');
		if (filters.status) query = query.eq('status', filters.status);
		const { data, error } = await query;
		return handle(data, error);
	},
	create: async (task: any) => {
		const { data: { user } } = await supabase.auth.getUser();
		const { data, error } = await supabase.from('tasks_avr').insert([{ ...task, created_by: user?.id, status: 'new' }]).select().single();
		return handle(data, error);
	},
};

// Comments API (комментарии к задачам и монтажам)
export const commentsApi = {
	getByTask: async (taskId: string, taskType: 'task' | 'installation' = 'task') => {
		const table = taskType === 'task' ? 'task_comments' : 'installation_comments';
		const { data, error } = await supabase.from(table).select('*, author:author_id(*)').eq('task_id', taskId).order('created_at', { ascending: true });
		return handle(data, error);
	},
	create: async (taskId: string, content: string, taskType: 'task' | 'installation' = 'task') => {
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) throw new Error('Not authenticated');
		const table = taskType === 'task' ? 'task_comments' : 'installation_comments';
		const { data, error } = await supabase.from(table).insert([{ task_id: taskId, author_id: user.id, content }]).select().single();
		return handle(data, error);
	},
	subscribe: (taskId: string, taskType: 'task' | 'installation', callback: (comment: any) => void) => {
		const table = taskType === 'task' ? 'task_comments' : 'installation_comments';
		return supabase
			.channel(`comments:${taskType}:${taskId}`)
			.on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter: `task_id=eq.${taskId}` }, (payload: any) => {
				callback(payload.new);
			})
			.subscribe();
	},
};