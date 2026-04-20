import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { tasksApi, installationsApi } from '@/src/lib/supabase';

const C = { bg: '#0f172a', card: '#1e293b', accent: '#02d7ff', text: '#e8f1ff', sub: '#9ab0c5', border: '#1e2a35' };

export default function ArchiveScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [installations, setInstallations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'tasks' | 'installations'>('tasks');

  const load = async () => {
    try {
      const [t, i] = await Promise.all([
        tasksApi.getArchived().catch(() => []),
        installationsApi.getArchived().catch(() => []),
      ]);
      setTasks(t || []);
      setInstallations(i || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const data = tab === 'tasks' ? tasks : installations;

  if (loading) return <View style={s.center}><ActivityIndicator color={C.accent} size="large" /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Архив</Text>
      </View>
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'tasks' && s.activeTab]} onPress={() => setTab('tasks')}>
          <Text style={[s.tabText, tab === 'tasks' && s.activeTabText]}>Задачи ({tasks.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'installations' && s.activeTab]} onPress={() => setTab('installations')}>
          <Text style={[s.tabText, tab === 'installations' && s.activeTabText]}>Монтажи ({installations.length})</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={s.empty}>Архив пуст</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => router.push({
            pathname: tab === 'tasks' ? '/(app)/task/[id]' : '/(app)/installation/[id]',
            params: { id: item.id }
          } as any)}>
            <Text style={s.cardTitle} numberOfLines={2}>{item.title || item.address || 'Без названия'}</Text>
            {item.project?.name && <Text style={s.sub}>📋 {item.project.name}</Text>}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  header: { padding: 20, paddingTop: 48 },
  title: { color: C.text, fontSize: 26, fontWeight: '700' },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: C.card, borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  activeTab: { backgroundColor: C.accent },
  tabText: { color: C.sub, fontWeight: '600', fontSize: 13 },
  activeTabText: { color: '#fff' },
  card: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardTitle: { color: C.text, fontSize: 14, fontWeight: '600' },
  sub: { color: C.sub, fontSize: 12, marginTop: 4 },
  empty: { color: C.sub, textAlign: 'center', marginTop: 60, fontSize: 16 },
});