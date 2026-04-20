import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { tasksApi } from '@/src/lib/supabase';

<<<<<<< HEAD
// Cyberpunk theme - cyan colors as in web app
const C = { bg: '#0A0A0F', card: '#1A1A2E', accent: '#00D9FF', text: '#E0E0E0', sub: '#8892a0', border: 'rgba(0, 217, 255, 0.15)', green: '#00FF88', orange: '#FFA500', purple: '#8B5CF6' };

const STATUS_COLORS: Record<string, string> = {
  new: '#3399ff',
  in_progress: '#00D9FF',
  on_hold: '#ff00cc',
  completed: '#00FF88',
  archived: '#8892a0',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  on_hold: 'На паузе',
  completed: 'Готова',
  archived: 'Архив',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#8892a0',
  normal: '#3399ff',
  high: '#FFA500',
  urgent: '#FF3366',
};

export default function TasksScreen() {
  const { user, canCreateTasks } = useAuth();
=======
const C = { bg: '#0f172a', card: '#1e293b', accent: '#02d7ff', text: '#e8f1ff', sub: '#9ab0c5', border: '#1e2a35', green: '#22c55e', yellow: '#f59e0b', orange: '#f97316' };
const statusColor = (s: string) => ({ active: C.green, pending: C.yellow, in_progress: C.orange, completed: C.accent, cancelled: C.sub }[s] || C.sub);
const statusLabel = (s: string) => ({ active: 'Активна', pending: 'Ожидает', in_progress: 'В работе', completed: 'Готова', cancelled: 'Отменена' }[s] || s);

export default function TasksScreen() {
  const { user, isManagerOrHigher } = useAuth();
>>>>>>> dd3744c539c31c2d34149066cd6bfad4332e3c60
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
<<<<<<< HEAD
      // Менеджеры видят все задачи, работники - только свои
      const filters = canCreateTasks ? {} : { assignee_id: user?.id };
      const data = await tasksApi.getAll(filters);
=======
      const data = await tasksApi.getAll(isManagerOrHigher ? {} : { assignee_id: user?.id });
>>>>>>> dd3744c539c31c2d34149066cd6bfad4332e3c60
      setTasks(data || []);
      setFiltered(data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(tasks.filter(t => t.title?.toLowerCase().includes(q) || t.project?.name?.toLowerCase().includes(q)));
  }, [search, tasks]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (loading) return <View style={s.center}><ActivityIndicator color={C.accent} size="large" /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Задачи</Text>
        <Text style={s.count}>{filtered.length}</Text>
      </View>

      <TextInput style={s.search} placeholder="Поиск..." placeholderTextColor={C.sub} value={search} onChangeText={setSearch} />

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={<Text style={s.empty}>Задач нет</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => router.push({ pathname: '/(app)/task/[id]', params: { id: item.id } } as any)}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
              <View style={[s.badge, { backgroundColor: STATUS_COLORS[item.status] || C.sub }]}>
                <Text style={s.badgeText}>{STATUS_LABELS[item.status] || item.status}</Text>
              </View>
            </View>
            
            {item.project?.name && <Text style={s.sub}>📋 {item.project.name}</Text>}
            {item.assignee?.name && <Text style={s.sub}>👤 {item.assignee.name}</Text>}
            
            <View style={s.cardFooter}>
              {item.priority && (
                <View style={[s.priorityDot, { backgroundColor: PRIORITY_COLORS[item.priority] }]} />
              )}
              {item.due_date && (
                <Text style={s.dueDate}>📅 {new Date(item.due_date).toLocaleDateString('ru')}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />

      {/* FAB - создать задачу */}
      {canCreateTasks && (
        <TouchableOpacity style={s.fab} onPress={() => router.push('/(app)/task/create')}>
          <Text style={s.fabIcon}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50 },
  title: { color: C.accent, fontSize: 26, fontWeight: '700' },
  count: { color: C.sub, fontSize: 16 },
  search: { backgroundColor: C.card, color: C.text, borderRadius: 10, margin: 16, marginTop: 0, padding: 12, fontSize: 14, borderWidth: 1, borderColor: C.border },
  card: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: C.accent },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { color: C.text, fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  sub: { color: C.sub, fontSize: 12, marginTop: 4 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  dueDate: { color: C.sub, fontSize: 11 },
  empty: { color: C.sub, textAlign: 'center', marginTop: 60, fontSize: 16 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  fabIcon: { color: C.bg, fontSize: 28, fontWeight: '600' },
});