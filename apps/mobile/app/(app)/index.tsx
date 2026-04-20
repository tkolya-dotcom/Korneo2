import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, ROLES } from '@/src/providers/AuthProvider';
import { projectsApi, tasksApi, installationsApi, purchaseRequestsApi } from '@/src/lib/supabase';

const COLORS = { bg: '#0f172a', card: '#1e293b', accent: '#02d7ff', text: '#e8f1ff', sub: '#9ab0c5', green: '#22c55e', yellow: '#f59e0b', red: '#ef4444', orange: '#f97316' };

const ROLE_LABELS: Record<string, string> = {
  worker: 'МОНТАЖНИК',
  engineer: 'ИНЖЕНЕР',
  manager: 'МЕНЕДЖЕР',
  deputy_head: 'ЗАМ.РУКОВОДИТЕЛЯ',
  admin: 'АДМИН',
};

const StatCard = ({ label, value, color, onPress }: { label: string; value: number; color: string; onPress?: () => void }) => (
  <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress} disabled={!onPress}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </TouchableOpacity>
);

const QuickNavCard = ({ icon, label, onPress, color = COLORS.accent }: { icon: string; label: string; onPress: () => void; color?: string }) => (
  <TouchableOpacity style={styles.navCard} onPress={onPress}>
    <Text style={styles.navIcon}>{icon}</Text>
    <Text style={[styles.navLabel, { color }]}>{label}</Text>
  </TouchableOpacity>
);

// Функция для получения иконки и названия роли
const getRoleDisplay = (role: string | undefined) => {
  switch (role) {
    case ROLES.MANAGER: return { icon: '👔', name: 'Менеджер' };
    case ROLES.DEPUTY_HEAD: return { icon: '👨‍💼', name: 'Зам. начальника' };
    case ROLES.ADMIN: return { icon: '🔐', name: 'Администратор' };
    case ROLES.ENGINEER: return { icon: '📐', name: 'Инженер' };
    case ROLES.WORKER: return { icon: '🔧', name: 'Монтажник' };
    default: return { icon: '👤', name: 'Пользователь' };
  }
};

export default function DashboardScreen() {
  const { user, isManager, isManagerOrHigher, isWorker, isEngineer, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ projects: 0, tasks: 0, installations: 0, purchaseRequests: 0 });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      // Фильтрация данных в зависимости от роли:
      // - worker и engineer видят только свои задачи
      // - manager, deputy_head, admin видят все задачи и заявки
      const isPrivileged = isManagerOrHigher;
      
      const [projects, tasks, installations, prs] = await Promise.all([
        projectsApi.getAll('active').catch(() => []),
        tasksApi.getAll(isPrivileged ? {} : { assignee_id: user?.id }).catch(() => []),
        installationsApi.getAll(isPrivileged ? {} : { assignee_id: user?.id }).catch(() => []),
        isPrivileged ? purchaseRequestsApi.getAll({ status: 'pending' }).catch(() => []) : Promise.resolve([]),
      ]);
      
      const pendingPRs = canApproveRequests ? await purchaseRequestsApi.getAll({ status: 'pending' }).catch(() => []) : [];
      
      setStats({ 
        projects: Array.isArray(projects) ? projects.length : 0, 
        tasks: Array.isArray(tasks) ? tasks.length : 0, 
        installations: Array.isArray(installations) ? installations.length : 0, 
        purchaseRequests: Array.isArray(pendingPRs) ? pendingPRs.length : 0 
      });
      setRecentTasks(Array.isArray(tasks) ? tasks.slice(0, 5) : []);
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

  const roleDisplay = getRoleDisplay(user?.role);

  const getRoleBadgeColor = () => {
    if (user?.role === 'admin') return COLORS.danger;
    if (user?.role === 'manager' || user?.role === 'deputy_head') return COLORS.accent;
    if (user?.role === 'engineer') return COLORS.purple;
    return COLORS.sub;
  };

  if (loading) return (
    <View style={styles.center}>
      <Text style={styles.loadingLogo}>КОРНЕО</Text>
      <ActivityIndicator color={COLORS.accent} size="large" style={{ marginTop: 20 }} />
    </View>
  );

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Добрый день,</Text>
          <Text style={styles.name}>{user?.name || user?.email}</Text>
          <Text style={styles.role}>{roleDisplay.icon} {roleDisplay.name}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>ВЫХОД</Text>
        </TouchableOpacity>
      </View>

      {/* Statistics */}
      <Text style={styles.sectionTitle}>СТАТИСТИКА</Text>
      <View style={styles.statsGrid}>
        <StatCard label="Проекты" value={stats.projects} color={COLORS.accent} />
        <StatCard label="Задачи" value={stats.tasks} color={COLORS.green} />
        <StatCard label="Монтажи" value={stats.installations} color={COLORS.orange} />
        {isManagerOrHigher && <StatCard label="Заявки" value={stats.purchaseRequests} color={COLORS.red} />}
      </View>

      {/* Quick Navigation */}
      <Text style={styles.sectionTitle}>НАВИГАЦИЯ</Text>
      <View style={styles.navGrid}>
        {[
          ['📋', 'Проекты', '/(app)/projects'],
          ['✅', 'Задачи', '/(app)/tasks'],
          ['🔧', 'Монтажи', '/(app)/installations'],
          // Заявки видят только manager и выше
          ...(isManagerOrHigher ? [['🛒', 'Заявки', '/(app)/purchase-requests']] : []),
          ['📦', 'Архив', '/(app)/archive']
        ].map(([icon, label, path]) => (
          <TouchableOpacity key={path} style={styles.navCard} onPress={() => router.push(path as any)}>
            <Text style={styles.navIcon}>{icon}</Text>
            <Text style={styles.navLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Tasks */}
      {recentTasks.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>ПОСЛЕДНИЕ ЗАДАЧИ</Text>
          {recentTasks.map(task => (
            <TouchableOpacity key={task.id} style={styles.taskCard} onPress={() => router.push({pathname: '/(app)/task/[id]', params: { id: task.id } } as any)}>
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

      {/* Permissions Info (for debugging) */}
      <View style={styles.debugInfo}>
        <Text style={styles.debugTitle}>Ваши возможности:</Text>
        <Text style={styles.debugText}>Создавать задачи: {canCreateTasks ? '✓' : '✗'}</Text>
        <Text style={styles.debugText}>Удалять задачи: {user?.role === 'manager' || user?.role === 'admin' ? '✓' : '✗'}</Text>
        <Text style={styles.debugText}>Одобрять заявки: {canApproveRequests ? '✓' : '✗'}</Text>
        <Text style={styles.debugText}>Управлять пользователями: {user?.role === 'manager' || user?.role === 'admin' ? '✓' : '✗'}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  loadingLogo: { color: COLORS.accent, fontSize: 32, fontWeight: '800', letterSpacing: 3 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, paddingTop: 48 },
  greeting: { color: COLORS.sub, fontSize: 14 },
  name: { color: COLORS.text, fontSize: 22, fontWeight: '700', marginTop: 4 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 6, alignSelf: 'flex-start' },
  roleText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  logoutBtn: { backgroundColor: 'rgba(255, 51, 102, 0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.danger },
  logoutText: { color: COLORS.danger, fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  sectionTitle: { color: COLORS.accent, fontSize: 13, fontWeight: '700', paddingHorizontal: 20, marginTop: 20, marginBottom: 12, letterSpacing: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  statCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, flex: 1, minWidth: '40%', borderLeftWidth: 3 },
  statValue: { fontSize: 28, fontWeight: '700' },
  statLabel: { color: COLORS.sub, fontSize: 12, marginTop: 4 },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  navCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, alignItems: 'center', flex: 1, minWidth: '28%', borderWidth: 1, borderColor: COLORS.border },
  navIcon: { fontSize: 24, marginBottom: 6 },
  navLabel: { color: COLORS.text, fontSize: 12, fontWeight: '500', textAlign: 'center' },
  taskCard: { backgroundColor: COLORS.card, marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  taskRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskTitle: { color: COLORS.text, fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  taskSub: { color: COLORS.sub, fontSize: 12, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
});
