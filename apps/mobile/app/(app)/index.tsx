import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { installationsApi, projectsApi, purchaseRequestsApi, tasksApi } from '@/src/lib/supabase';
import LoadingVideo from '@/src/components/LoadingVideo';

const C = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  text: '#E0E0E0',
  sub: '#8892a0',
  border: 'rgba(0, 217, 255, 0.15)',
  success: '#00FF88',
  warning: '#F59E0B',
};

const roleTitleMap: Record<string, string> = {
  manager: '\u0420\u0443\u043a\u043e\u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044c',
  deputy_head: '\u0417\u0430\u043c. \u0440\u0443\u043a\u043e\u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044f',
  support: '\u0422\u0435\u0445\u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430',
  admin: '\u0410\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440',
  engineer: '\u0418\u043d\u0436\u0435\u043d\u0435\u0440',
  worker: '\u0418\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c',
};

const StatCard = ({
  label,
  value,
  color,
  onPress,
}: {
  label: string;
  value: number;
  color: string;
  onPress: () => void;
}) => (
  <TouchableOpacity style={[s.statCard, { borderLeftColor: color }]} onPress={onPress}>
    <Text style={[s.statValue, { color }]}>{value}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </TouchableOpacity>
);

export default function DashboardScreen() {
  const {
    user,
    isElevatedUser,
    canCreateProjects,
    canCreatePurchaseRequests,
    canCreateTasks,
    canCreateInstallations,
    canViewWarehouse,
    canViewSites,
    canViewArchive,
    canViewUsers,
    canViewAtss,
    logout,
  } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    projects: 0,
    tasks: 0,
    installations: 0,
    pendingRequests: 0,
  });

  const roleName = roleTitleMap[user?.role || ''] || '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c';

  const navItems = useMemo(() => {
    const items: Array<{
      key: string;
      label: string;
      icon: keyof typeof Ionicons.glyphMap;
      route: string;
      visible?: boolean;
    }> = [
      {
        key: 'projects',
        label: '\u041f\u0440\u043e\u0435\u043a\u0442\u044b',
        icon: 'folder-open-outline',
        route: '/(app)/projects',
      },
      { key: 'tasks', label: '\u0417\u0430\u0434\u0430\u0447\u0438', icon: 'checkbox-outline', route: '/(app)/tasks' },
      {
        key: 'installations',
        label: '\u041c\u043e\u043d\u0442\u0430\u0436\u0438',
        icon: 'construct-outline',
        route: '/(app)/installations',
      },
      {
        key: 'requests',
        label: '\u0417\u0430\u044f\u0432\u043a\u0438',
        icon: 'cart-outline',
        route: '/(app)/purchase-requests',
      },
      { key: 'chats', label: '\u0427\u0430\u0442\u044b', icon: 'chatbubbles-outline', route: '/(app)/messenger' },
      {
        key: 'warehouse',
        label: '\u0421\u043a\u043b\u0430\u0434',
        icon: 'cube-outline',
        route: '/(app)/warehouse',
        visible: canViewWarehouse,
      },
      { key: 'avr', label: '\u0410\u0412\u0420', icon: 'warning-outline', route: '/(app)/avr' },
      {
        key: 'calendar',
        label: '\u041a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044c',
        icon: 'calendar-outline',
        route: '/(app)/calendar',
      },
      {
        key: 'sites',
        label: '\u041f\u043b\u043e\u0449\u0430\u0434\u043a\u0438',
        icon: 'location-outline',
        route: '/(app)/sites',
        visible: canViewSites,
      },
      {
        key: 'archive',
        label: '\u0410\u0440\u0445\u0438\u0432',
        icon: 'archive-outline',
        route: '/(app)/archive',
        visible: canViewArchive,
      },
      {
        key: 'users',
        label: '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0438',
        icon: 'people-outline',
        route: '/(app)/users',
        visible: canViewUsers,
      },
      {
        key: 'atss',
        label: '\u0410\u0422\u0421\u0421',
        icon: 'cloud-upload-outline',
        route: '/(app)/atss',
        visible: canViewAtss,
      },
      {
        key: 'profile',
        label: '\u041f\u0440\u043e\u0444\u0438\u043b\u044c',
        icon: 'person-outline',
        route: '/(app)/profile',
      },
    ];
    return items.filter((item) => item.visible !== false);
  }, [canViewArchive, canViewAtss, canViewSites, canViewUsers, canViewWarehouse]);

  const load = async () => {
    try {
      const projectPromise = projectsApi.getAll().catch(() => []);
      const taskPromise = tasksApi.getAll(isElevatedUser || !user?.id ? {} : { assignee_id: user.id }).catch(() => []);
      const installationPromise = installationsApi
        .getAll(isElevatedUser || !user?.id ? {} : { assignee_id: user.id })
        .catch(() => []);
      const requestsPromise = purchaseRequestsApi
        .getAll(isElevatedUser || !user?.id ? {} : { created_by: user.id })
        .catch(() => []);

      const [projects, tasks, installations, requests] = await Promise.all([
        projectPromise,
        taskPromise,
        installationPromise,
        requestsPromise,
      ]);

      const normalizedTasks = Array.isArray(tasks) ? tasks : [];
      const normalizedInstallations = Array.isArray(installations) ? installations : [];
      const normalizedRequests = Array.isArray(requests) ? requests : [];

      const projectList = Array.isArray(projects) ? projects : [];
      const visibleProjects =
        isElevatedUser || !user?.id
          ? projectList
          : projectList.filter((project) => {
              if (project.created_by && String(project.created_by) === String(user.id)) {
                return true;
              }
              return (
                normalizedTasks.some((task) => String(task.project_id || '') === String(project.id)) ||
                normalizedInstallations.some(
                  (installation) => String(installation.project_id || '') === String(project.id)
                )
              );
            });

      setStats({
        projects: visibleProjects.length,
        tasks: normalizedTasks.length,
        installations: normalizedInstallations.length,
        pendingRequests: normalizedRequests.filter((item) => item.status === 'pending').length,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [isElevatedUser, user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={s.center}>
        <Text style={s.loadingLogo}>{'\u041a\u043e\u0440\u043d\u0435\u043e'}</Text>
        <LoadingVideo style={{ marginTop: 10 }} size={200} />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
    >
      <View style={s.header}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={s.greeting}>{'\u0414\u043e\u0431\u0440\u043e \u043f\u043e\u0436\u0430\u043b\u043e\u0432\u0430\u0442\u044c,'}</Text>
          <Text style={s.name}>
            {user?.name || user?.email?.split('@')[0] || '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c'}
          </Text>
          <Text style={s.role}>{roleName}</Text>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={logout}>
          <Text style={s.logoutText}>{'\u0412\u044b\u0439\u0442\u0438'}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.statsGrid}>
        <StatCard
          label={'\u041f\u0440\u043e\u0435\u043a\u0442\u044b'}
          value={stats.projects}
          color={C.accent}
          onPress={() => router.push('/(app)/projects' as any)}
        />
        <StatCard
          label={'\u0417\u0430\u0434\u0430\u0447\u0438'}
          value={stats.tasks}
          color={C.success}
          onPress={() => router.push('/(app)/tasks' as any)}
        />
        <StatCard
          label={'\u041c\u043e\u043d\u0442\u0430\u0436\u0438'}
          value={stats.installations}
          color={C.warning}
          onPress={() => router.push('/(app)/installations' as any)}
        />
        <StatCard
          label={'\u0417\u0430\u044f\u0432\u043a\u0438'}
          value={stats.pendingRequests}
          color={C.accent}
          onPress={() => router.push('/(app)/purchase-requests' as any)}
        />
      </View>

      <View style={s.quickCreateRow}>
        {canCreateProjects ? (
          <TouchableOpacity style={s.quickCreateBtn} onPress={() => router.push('/(app)/project/create' as any)}>
            <Text style={s.quickCreateText}>{'+ \u041f\u0440\u043e\u0435\u043a\u0442'}</Text>
          </TouchableOpacity>
        ) : null}
        {canCreateTasks ? (
          <TouchableOpacity style={s.quickCreateBtn} onPress={() => router.push('/(app)/task/create' as any)}>
            <Text style={s.quickCreateText}>{'+ \u0417\u0430\u0434\u0430\u0447\u0430'}</Text>
          </TouchableOpacity>
        ) : null}
        {canCreateInstallations ? (
          <TouchableOpacity style={s.quickCreateBtn} onPress={() => router.push('/(app)/installation/create' as any)}>
            <Text style={s.quickCreateText}>{'+ \u041c\u043e\u043d\u0442\u0430\u0436'}</Text>
          </TouchableOpacity>
        ) : null}
        {canCreatePurchaseRequests ? (
          <TouchableOpacity style={s.quickCreateBtn} onPress={() => router.push('/(app)/purchase-request/create' as any)}>
            <Text style={s.quickCreateText}>{'+ \u0417\u0430\u044f\u0432\u043a\u0430'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>{'\u041d\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044f'}</Text>
        <View style={s.tilesWrap}>
          {navItems.map((item) => (
            <TouchableOpacity key={item.key} style={s.tile} onPress={() => router.push(item.route as any)}>
              <View style={s.tileIconWrap}>
                <Ionicons name={item.icon} size={18} color={C.accent} />
              </View>
              <Text style={s.tileText} numberOfLines={2}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  loadingLogo: { color: C.accent, fontSize: 30, fontWeight: '800', letterSpacing: 3 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 48,
  },
  greeting: { color: C.sub, fontSize: 14 },
  name: { color: C.text, fontSize: 24, fontWeight: '700', marginTop: 4 },
  role: { color: C.accent, fontSize: 13, marginTop: 8, fontWeight: '600' },
  logoutBtn: {
    backgroundColor: 'rgba(0, 217, 255, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  logoutText: { color: C.accent, fontSize: 13, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  statCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    flex: 1,
    minWidth: '42%',
    borderLeftWidth: 3,
  },
  statValue: { fontSize: 30, fontWeight: '800' },
  statLabel: { color: C.sub, marginTop: 4, fontSize: 12 },
  quickCreateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 10 },
  quickCreateBtn: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    backgroundColor: 'rgba(0,217,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  quickCreateText: { color: C.accent, fontSize: 12, fontWeight: '700' },
  section: { marginTop: 22, paddingHorizontal: 16 },
  sectionTitle: { color: C.text, fontSize: 18, fontWeight: '700' },
  tilesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 24 },
  tile: {
    width: '31%',
    minHeight: 86,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  tileIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    backgroundColor: 'rgba(0,217,255,0.1)',
  },
  tileText: {
    color: C.text,
    fontSize: 11,
    lineHeight: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
});
