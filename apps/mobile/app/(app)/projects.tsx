import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { installationsApi, projectsApi, tasksApi } from '@/src/lib/supabase';

const C = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  text: '#E0E0E0',
  sub: '#8892a0',
  border: 'rgba(0, 217, 255, 0.15)',
  green: '#00FF88',
  yellow: '#F59E0B',
  orange: '#FF6B00',
};

const statusColor = (status: string) =>
  ({
    active: C.green,
    pending: C.yellow,
    completed: C.accent,
    cancelled: C.sub,
    archived: C.sub,
  }[status] || C.sub);

const statusLabel = (status: string) =>
  ({
    active: 'Активный',
    pending: 'Ожидает',
    completed: 'Завершён',
    cancelled: 'Отменён',
    archived: 'В архиве',
  }[status] || status);

export default function ProjectsScreen() {
  const { user, isElevatedUser, canCreateProjects } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const allProjects = await projectsApi.getAll();
      if (isElevatedUser || !user?.id) {
        setProjects(allProjects || []);
        return;
      }

      const [userTasks, userInstallations] = await Promise.all([
        tasksApi.getAll({ assignee_id: user.id }).catch(() => []),
        installationsApi.getAll({ assignee_id: user.id }).catch(() => []),
      ]);

      const visibleProjectIds = new Set<string>();
      for (const task of userTasks || []) {
        if (task.project_id) {
          visibleProjectIds.add(String(task.project_id));
        }
      }
      for (const installation of userInstallations || []) {
        if (installation.project_id) {
          visibleProjectIds.add(String(installation.project_id));
        }
      }

      const scoped = (allProjects || []).filter((project) => {
        if (!project?.id) return false;
        if (visibleProjectIds.has(String(project.id))) return true;
        return project.created_by && String(project.created_by) === String(user.id);
      });
      setProjects(scoped);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setProjects([]);
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [isElevatedUser, user?.id]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return projects;
    }

    return projects.filter((project) =>
      [project.name, project.description, project.manager?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [projects, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Проекты</Text>
          <Text style={s.count}>{filtered.length}</Text>
        </View>
        {canCreateProjects ? (
          <TouchableOpacity style={s.createBtn} onPress={() => router.push('/(app)/project/create' as any)}>
            <Text style={s.createBtnText}>+ Создать</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <TextInput
        style={s.search}
        placeholder="Поиск..."
        placeholderTextColor={C.sub}
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={s.empty}>Проектов нет</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() =>
              router.push({
                pathname: '/(app)/project/[id]',
                params: { id: item.id },
              } as any)
            }
          >
            <View style={s.row}>
              <Text style={s.cardTitle} numberOfLines={2}>
                {item.name}
              </Text>
              <View style={[s.badge, { backgroundColor: statusColor(item.status) }]}>
                <Text style={s.badgeText}>{statusLabel(item.status)}</Text>
              </View>
            </View>
            {item.description ? <Text style={s.sub} numberOfLines={2}>{item.description}</Text> : null}
            {item.manager?.name ? <Text style={s.sub}>Руководитель: {item.manager.name}</Text> : null}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 48,
  },
  title: { color: C.text, fontSize: 26, fontWeight: '700' },
  count: { color: C.sub, fontSize: 14, marginTop: 2 },
  createBtn: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,217,255,0.12)',
  },
  createBtnText: { color: C.accent, fontSize: 12, fontWeight: '700' },
  search: {
    backgroundColor: C.card,
    color: C.text,
    borderRadius: 12,
    margin: 16,
    marginTop: 0,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { color: C.text, fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  sub: { color: C.sub, fontSize: 12, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  empty: { color: C.sub, textAlign: 'center', marginTop: 60, fontSize: 16 },
});

