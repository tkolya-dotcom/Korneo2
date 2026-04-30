import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth, ROLES } from '@/src/providers/AuthProvider';
import { projectsApi, tasksApi, installationsApi, purchaseRequestsApi } from '@/src/lib/supabase';
import { getCachedTable, syncDatabaseInBackground } from '@/src/lib/offlineData';

// Cyberpunk тема - как в веб-приложении (cyan)
const COLORS = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  accent2: '#00FF88',
  text: '#E0E0E0',
  sub: '#8892a0',
  border: 'rgba(0, 217, 255, 0.15)',
  danger: '#FF3366',
  success: '#00FF88',
  warning: '#FF6B00',
  purple: '#8B5CF6',
};

const ROLE_LABELS: Record<string, string> = {
  worker: 'Руководитель группы',  engineer: 'РИнженер',
  manager: 'Руководитель',
  deputy_head: 'ЗАМ.РУКОВОДИТЕЛЯ ОТДЕЛА',
  admin: 'АДМИН',
};

const StatCard = ({ label, value, color, onPress }: { label: string; value: number; color: string; onPress?: () => void }) => (
  <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress} disabled={!onPress} activeOpacity={0.82}>
    <View pointerEvents="none" style={styles.glassShine} />
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </TouchableOpacity>
);

const QuickNavCard = ({ icon, label, onPress, color = COLORS.accent }: { icon: string; label: string; onPress: () => void; color?: string }) => (
  <TouchableOpacity style={styles.navCard} onPress={onPress} activeOpacity={0.82}>
    <View pointerEvents="none" style={styles.glassShine} />
    <Text style={[styles.navIcon, { color }]}>{icon}</Text>
    <Text style={[styles.navLabel, { color }]}>{label}</Text>
  </TouchableOpacity>
);

// Функция для получения иконки и названия роли
const getRoleDisplay = (role: string | undefined) => {
  switch (role) {
    case ROLES.MANAGER: return { icon: '👔', name: 'Руководитель' };
    case ROLES.DEPUTY_HEAD: return { icon: '👨‍💼', name: 'ЗАМ.РУКОВОДИТЕЛЯ ОТДЕЛА' };
    case ROLES.ADMIN: return { icon: '🔐', name: 'Администратор' };
    case ROLES.ENGINEER: return { icon: '📐', name: 'Руководитель группы' };
    case ROLES.WORKER: return { icon: '🔧', name: 'Инженер' };
    default: return { icon: '👤', name: 'Пользователь' };
  }
};

export default function DashboardScreen() {
  const { user, isWorker, isEngineer, isManagerOrHigher, canCreateTasks, canApproveRequests, logout } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState({ projects: 0, tasks: 0, installations: 0, purchaseRequests: 0 });
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const applyDashboardState = useCallback((
    projects: any[],
    tasks: any[],
    installations: any[],
    pendingPRs: any[]
  ) => {
    setStats({
      projects: Array.isArray(projects) ? projects.length : 0,
      tasks: Array.isArray(tasks) ? tasks.length : 0,
      installations: Array.isArray(installations) ? installations.length : 0,
      purchaseRequests: Array.isArray(pendingPRs) ? pendingPRs.length : 0,
    });
    setRecentTasks(Array.isArray(tasks) ? tasks.slice(0, 5) : []);
  }, []);

  const loadFromCache = useCallback(async () => {
    const [cachedProjects, cachedTasks, cachedInstallations, cachedPurchaseRequests] = await Promise.all([
      getCachedTable<any>('projects'),
      getCachedTable<any>('tasks'),
      getCachedTable<any>('installations'),
      getCachedTable<any>('purchase_requests'),
    ]);

    const pendingPRs = canApproveRequests
      ? cachedPurchaseRequests.filter((item) => item?.status === 'pending')
      : [];

    applyDashboardState(cachedProjects, cachedTasks, cachedInstallations, pendingPRs);
  }, [applyDashboardState, canApproveRequests]);

  const loadFromServer = useCallback(async () => {
    try {
      const filters = canCreateTasks ? {} : { assignee_id: user?.id };
      const [projects, tasks, installations] = await Promise.all([
        projectsApi.getAll().catch(() => []),
        tasksApi.getAll(filters).catch(() => []),
        installationsApi.getAll(filters).catch(() => []),
      ]);
      const pendingPRs = canApproveRequests ? await purchaseRequestsApi.getAll({ status: 'pending' }).catch(() => []) : [];
      applyDashboardState(
        Array.isArray(projects) ? projects : [],
        Array.isArray(tasks) ? tasks : [],
        Array.isArray(installations) ? installations : [],
        Array.isArray(pendingPRs) ? pendingPRs : []
      );
      void syncDatabaseInBackground(true);
    } catch (e) {
      console.error(e);
    }
  }, [applyDashboardState, canApproveRequests, canCreateTasks, user?.id]);

  const load = useCallback(async () => {
    await loadFromCache();
    await loadFromServer();
  }, [loadFromCache, loadFromServer]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void loadFromServer();
      return undefined;
    }, [loadFromServer])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const statusColor = (s: string) => ({
    'active': COLORS.success,
    'completed': COLORS.accent,
    'pending': COLORS.warning,
    'in_progress': COLORS.warning,
    'new': COLORS.accent,
  }[s] || COLORS.sub);

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
    <ScrollView 
      style={styles.container} 
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Добрый день,</Text>
          <Text style={styles.name}>{user?.name || user?.email?.split('@')[0] || 'Пользователь'}</Text>
          <View style={[styles.roleBadge, { backgroundColor: `${getRoleBadgeColor()}20`, borderColor: getRoleBadgeColor(), borderWidth: 1 }]}>
            <Text style={[styles.roleText, { color: getRoleBadgeColor() }]}>{ROLE_LABELS[user?.role || 'worker']}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>ВЫХОД</Text>
        </TouchableOpacity>
      </View>

      {/* Statistics */}
      <Text style={styles.sectionTitle}>СТАТИСТИКА</Text>
      <View style={styles.statsGrid}>
        <StatCard label="Проекты" value={stats.projects} color={COLORS.accent} onPress={() => router.push('/(app)/projects')} />
        <StatCard label="Задачи" value={stats.tasks} color={COLORS.success} onPress={() => router.push('/(app)/tasks')} />
        <StatCard label="Монтажи" value={stats.installations} color={COLORS.warning} onPress={() => router.push('/(app)/installations')} />
        {canCreateTasks && <StatCard label="АВР" value={0} color={COLORS.danger} onPress={() => router.push('/(app)/avr')} />}
        {canApproveRequests && stats.purchaseRequests > 0 && (
          <StatCard label="Заявки" value={stats.purchaseRequests} color={COLORS.purple} onPress={() => router.push('/(app)/purchase-requests')} />
        )}
      </View>

      {/* Quick Navigation */}
      <Text style={styles.sectionTitle}>НАВИГАЦИЯ</Text>
      <View style={styles.navGrid}>
        <QuickNavCard icon="📋" label="Проекты" onPress={() => router.push('/(app)/projects')} />
        <QuickNavCard icon="✅" label="Задачи" onPress={() => router.push('/(app)/tasks')} />
        <QuickNavCard icon="🔧" label="Монтажи" onPress={() => router.push('/(app)/installations')} />
        <QuickNavCard icon="💬" label="Чат" onPress={() => router.push('/(app)/chat')} />
        <QuickNavCard icon="🗺️" label="Площадки" onPress={() => router.push('/(app)/sites')} />
        <QuickNavCard icon="👥" label="Сотрудники" onPress={() => router.push('/(app)/users')} />
        
        {/* Manager-only sections */}
        {isManagerOrHigher && (
          <>
            <QuickNavCard icon="📦" label="Склад" onPress={() => router.push('/(app)/warehouse')} color={COLORS.success} />
            <QuickNavCard icon="🛍️" label="Заявки" onPress={() => router.push('/(app)/purchase-requests')} color={COLORS.warning} />
          </>
        )}
        
        {/* Engineer+ sections */}
        {canCreateTasks && (
          <>
            <QuickNavCard icon="⚡" label="АВР" onPress={() => router.push('/(app)/avr')} color={COLORS.danger} />
            <QuickNavCard icon="🗄️" label="Архив" onPress={() => router.push('/(app)/archive')} />
          </>
        )}
      </View>

      {/* Recent Tasks */}
      {recentTasks.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>ПОСЛЕДНИЕ ЗАДАЧИ</Text>
          {recentTasks.map(task => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskCard}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/(app)/task/[id]', params: { id: task.id } })}
            >
              <View pointerEvents="none" style={styles.glassShine} />
              <View style={styles.taskRow}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <View style={[styles.badge, { backgroundColor: statusColor(task.status) }]}>
                  <Text style={styles.badgeText}>{task.status}</Text>
                </View>
              </View>
              <Text style={styles.taskSub}>{task.project?.name || '—'}</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 48,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(203, 238, 255, 0.18)',
    backgroundColor: 'rgba(31, 40, 62, 0.55)',
    shadowColor: '#7DD3FC',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
  greeting: { color: COLORS.sub, fontSize: 14 },
  name: { color: COLORS.text, fontSize: 22, fontWeight: '700', marginTop: 4 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 6, alignSelf: 'flex-start' },
  roleText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  logoutBtn: {
    backgroundColor: 'rgba(255, 51, 102, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 170, 190, 0.55)',
  },
  logoutText: { color: COLORS.danger, fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  sectionTitle: { color: '#A5E9FF', fontSize: 13, fontWeight: '700', paddingHorizontal: 20, marginTop: 20, marginBottom: 12, letterSpacing: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  statCard: {
    backgroundColor: 'rgba(36, 47, 74, 0.58)',
    borderRadius: 16,
    padding: 16,
    flex: 1,
    minWidth: '40%',
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: 'rgba(195, 234, 255, 0.18)',
    overflow: 'hidden',
    shadowColor: '#7DD3FC',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: Platform.OS === 'android' ? 0.2 : 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  statValue: { fontSize: 28, fontWeight: '700' },
  statLabel: { color: COLORS.sub, fontSize: 12, marginTop: 4 },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  navCard: {
    backgroundColor: 'rgba(36, 47, 74, 0.52)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    minWidth: '28%',
    borderWidth: 1,
    borderColor: 'rgba(195, 234, 255, 0.16)',
    overflow: 'hidden',
    shadowColor: '#7DD3FC',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  navIcon: { fontSize: 24, marginBottom: 6 },
  navLabel: { color: COLORS.text, fontSize: 12, fontWeight: '500', textAlign: 'center' },
  taskCard: {
    backgroundColor: 'rgba(36, 47, 74, 0.5)',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(195, 234, 255, 0.14)',
    overflow: 'hidden',
  },
  taskRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskTitle: { color: COLORS.text, fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  taskSub: { color: COLORS.sub, fontSize: 12, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { color: '#0A0A0F', fontSize: 10, fontWeight: '600' },
  debugInfo: {
    backgroundColor: 'rgba(36, 47, 74, 0.5)',
    margin: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(195, 234, 255, 0.14)',
  },
  debugTitle: { color: COLORS.accent, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  debugText: { color: COLORS.sub, fontSize: 11, marginBottom: 4 },
  glassShine: {
    position: 'absolute',
    top: -26,
    left: -26,
    width: 150,
    height: 80,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.10)',
    transform: [{ rotate: '-18deg' }],
  },
});
