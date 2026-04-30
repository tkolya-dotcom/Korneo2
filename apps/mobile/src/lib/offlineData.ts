import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';

type TableName =
  | 'users'
  | 'projects'
  | 'tasks'
  | 'installations'
  | 'purchase_requests'
  | 'chats'
  | 'sites'
  | 'warehouse'
  | 'materials';

type TableConfig = {
  select: string;
  limit?: number;
};

const CACHE_PREFIX = 'db-cache:v1:';
const LAST_SYNC_KEY = 'db-cache:last-sync';
const BOOTSTRAP_DONE_KEY = 'db-cache:bootstrap-done';
const SYNC_THROTTLE_MS = 2 * 60 * 1000;

const TABLES: Record<TableName, TableConfig> = {
  users: { select: '*', limit: 3000 },
  projects: { select: '*', limit: 3000 },
  tasks: { select: '*', limit: 5000 },
  installations: { select: '*', limit: 5000 },
  purchase_requests: { select: '*', limit: 5000 },
  chats: { select: '*', limit: 3000 },
  sites: { select: '*', limit: 3000 },
  warehouse: { select: '*', limit: 5000 },
  materials: { select: '*', limit: 5000 },
};

let syncInFlight: Promise<void> | null = null;

const keyFor = (table: TableName) => `${CACHE_PREFIX}${table}`;

export const getCachedTable = async <T>(table: TableName): Promise<T[]> => {
  const raw = await AsyncStorage.getItem(keyFor(table));
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const setCachedTable = async (table: TableName, rows: unknown[]) => {
  await AsyncStorage.setItem(keyFor(table), JSON.stringify(rows));
};

const pullTable = async (table: TableName) => {
  const config = TABLES[table];
  let query = supabase.from(table).select(config.select);
  if (config.limit) {
    query = query.limit(config.limit) as typeof query;
  }
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  await setCachedTable(table, Array.isArray(data) ? data : []);
};

const pullAllTables = async () => {
  for (const table of Object.keys(TABLES) as TableName[]) {
    try {
      await pullTable(table);
    } catch (error) {
      console.warn(`[offlineData] failed to sync ${table}:`, error);
    }
  }
  await AsyncStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
};

export const bootstrapDatabaseOnFirstLaunch = async () => {
  const isBootstrapped = await AsyncStorage.getItem(BOOTSTRAP_DONE_KEY);
  if (isBootstrapped === '1') {
    return;
  }
  await pullAllTables();
  await AsyncStorage.setItem(BOOTSTRAP_DONE_KEY, '1');
};

export const syncDatabaseInBackground = async (force = false) => {
  if (!force) {
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
    const lastSyncMs = Number(lastSync || 0);
    if (Number.isFinite(lastSyncMs) && Date.now() - lastSyncMs < SYNC_THROTTLE_MS) {
      return;
    }
  }

  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = (async () => {
    try {
      await pullAllTables();
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
};

export const syncTablesNow = async (tables: TableName[]) => {
  for (const table of tables) {
    try {
      await pullTable(table);
    } catch (error) {
      console.warn(`[offlineData] failed to sync ${table}:`, error);
    }
  }
  await AsyncStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
};
