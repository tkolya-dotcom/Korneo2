import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { projectsApi, tasksApi, installationsApi, purchaseRequestsApi } from '@/src/lib/supabase';

const COLORS = { bg: '#0f172a', card: '#1e293b', accent: '#02d7ff', text: '#e8f1ff', sub: '#9ab0c5', green: '#22c55e', yellow: '#f59e0b', red: '#ef4444', orange: '#f97316' };

const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default function DashboardScreen() {
  const { user, isManager, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ projects: 0, tasks: 0, installations: 0, purchaseRequests: 0 });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [projects, tasks, installations, prs] = await Promise.all([
        projectsApi.getAll('active').catch(() => []),
        tasksApi.getAll(isManager ? {} : { assignee_id: user?.id }).catch(() => []),
        installationsApi.getAll(isManager ? {} : { assignee_id: user?.id }).catch(() => []),
        isManager ? purchaseRequestsApi.getAll({ status: 'pending' }).catch(() => []) : Promise.resolve([]),
      ]);
      setStats({ projects: projects?.length || 0, tasks: tasks?.length || 0, installations: installations?.length || 0, purchaseRequests: prs?.length || 0 });
      setRecentTasks((tasks || []).slice(0, 5));
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const STATUS_MAP: Record<string, { color: string, label: string }> = {
    'active': { color: COLORS.green, label: 'Активна' },
    'completed': { color: COLORS.accent, label: 'Завершена' },
    'pending': { color: COLORS.yellow, label: 'В ожидании' },
    'in_progress': { color: COLORS.orange, label: 'В работе' }
  };
  const getStatus = (s: string) => STATUS_MAP[s] || { color: COLORS.sub, label: s };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.accent} size="large" /></View>;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Добрый день,</Text>
          <Text style={styles.name}>{user?.name || user?.email}</Text>
          <Text style={styles.role}>{user?.role === 'manager' ? '👔 Менеджер' : user?.role === 'engineer' ? '📐 Инженер' : '🔧 Монтажник'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Выйти</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Статистика</Text>
      <View style={styles.statsGrid}>
        <StatCard label="Проекты" value={stats.projects} color={COLORS.accent} />
        <StatCard label="Задачи" value={stats.tasks} color={COLORS.green} />
        <StatCard label="Монтажи" value={stats.installations} color={COLORS.orange} />
        {isManager && <StatCard label="Заявки" value={stats.purchaseRequests} color={COLORS.red} />}
      </View>

      <Text style={styles.sectionTitle}>Быстрый доступ</Text>
      <View style={styles.navGrid}>
        {[['📋', 'Проекты', '/(app)/projects'], ['✅', 'Задачи', '/(app)/tasks'],
          ['🔧', 'Монтажи', '/(app)/installations'],
          ...(isManager ? [['🛒', 'Заявки', '/(app)/purchase-requests']] : []),
          ['📦', 'Архив', '/(app)/archive']
        ].map(([icon, label, path]) => (
          <TouchableOpacity key={path} style={styles.navCard} onPress={() => router.push(path as any)}>
            <Text style={styles.navIcon}>{icon}</Text>
            <Text style={styles.navLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {recentTasks.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Последние задачи</Text>
          {recentTasks.map(task => (
            <TouchableOpacity key={task.id} style={styles.taskCard} onPress={() => router.push({ pathname: '/(app)/task/[id]', params: { id: task.id } } as any)}>
              <View style={styles.taskRow}>
                <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                <View style={[styles.badge, { backgroundColor: getStatus(task.status).color }]}>
                  <Text style={styles.badgeText}>{getStatus(task.status).label}</Text>
                </View>
              </View>
              <Text style={styles.taskSub} numberOfLines={1}>{task.project?.name || '—'}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, paddingTop: 48 },
  greeting: { color: COLORS.sub, fontSize: 14 },
  name: { color: COLORS.text, fontSize: 22, fontWeight: '700', marginTop: 2 },
  role: { color: COLORS.sub, fontSize: 13, marginTop: 4 },
  logoutBtn: { backgroundColor: '#334155', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  logoutText: { color: COLORS.sub, fontSize: 13 },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '600', paddingHorizontal: 20, marginTop: 20, marginBottom: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  statCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, flex: 1, minWidth: '40%', borderLeftWidth: 4 },
  statValue: { fontSize: 28, fontWeight: '700' },
  statLabel: { color: COLORS.sub, fontSize: 12, marginTop: 4 },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  navCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, alignItems: 'center', flex: 1, minWidth: '28%' },
  navIcon: { fontSize: 24, marginBottom: 6 },
  navLabel: { color: COLORS.text, fontSize: 12, fontWeight: '500', textAlign: 'center' },
  taskCard: { backgroundColor: COLORS.card, marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14 },
  taskRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskTitle: { color: COLORS.text, fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  taskSub: { color: COLORS.sub, fontSize: 12, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
});