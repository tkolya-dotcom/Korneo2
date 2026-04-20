import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { tasksApi } from '@/src/lib/supabase';

const C = { bg: '#0f172a', card: '#1e293b', accent: '#02d7ff', text: '#e8f1ff', sub: '#9ab0c5', border: '#1e2a35', green: '#22c55e', yellow: '#f59e0b', orange: '#f97316' };
const statusColor = (s: string) => ({ active: C.green, pending: C.yellow, in_progress: C.orange, completed: C.accent, cancelled: C.sub }[s] || C.sub);
const statusLabel = (s: string) => ({ active: 'Активна', pending: 'Ожидает', in_progress: 'В работе', completed: 'Готова', cancelled: 'Отменена' }[s] || s);

export default function TasksScreen() {
  const { user, isManagerOrHigher } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await tasksApi.getAll(isManagerOrHigher ? {} : { assignee_id: user?.id });
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