import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { projectsApi, tasksApi, installationsApi } from '@/src/lib/supabase';

// Cyberpunk theme - cyan colors
const C = { bg: '#0A0A0F', card: '#1A1A2E', accent: '#00D9FF', text: '#E0E0E0', sub: '#8892a0', border: 'rgba(0, 217, 255, 0.15)', green: '#00FF88', yellow: '#f59e0b' };

const statusColor = (s: string) => ({ active: C.accent, pending: C.yellow, completed: C.green, cancelled: C.sub, in_progress: C.yellow }[s] || C.sub);
const statusLabel = (s: string) => ({ active: 'Активный', pending: 'Ожидает', completed: 'Завершён', cancelled: 'Отменён', in_progress: 'В работе' }[s] || s);

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [installations, setInstallations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      projectsApi.getById(id),
      tasksApi.getAll({ project_id: id }),
      installationsApi.getAll({ project_id: id }),
    ]).then(([p, t, i]) => {
      setProject(p); 
      setTasks(t || []); 
      setInstallations(i || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <View style={s.center}><ActivityIndicator color={C.accent} size="large" /></View>;
  if (!project) return <View style={s.center}><Text style={s.sub}>Проект не найден</Text></View>;

  return (
    <ScrollView style={s.container}>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backText}>← Назад</Text>
      </TouchableOpacity>

      {/* Main Card */}
      <View style={s.card}>
        <View style={[s.badge, { backgroundColor: statusColor(project.status), alignSelf: 'flex-start', marginBottom: 12 }]}>
          <Text style={s.badgeText}>{statusLabel(project.status)}</Text>
        </View>
        <Text style={s.title}>{project.name}</Text>
        {project.description && <Text style={s.desc}>{project.description}</Text>}
        {project.manager?.name && (
          <View style={s.managerRow}>
            <Text style={s.managerIcon}>👔</Text>
            <Text style={s.managerText}>{project.manager.name}</Text>
          </View>
        )}
      </View>

      {/* Stats Card */}
      <View style={s.statsRow}>
        <View style={[s.statBox, { borderLeftColor: C.accent }]}>
          <Text style={s.statValue}>{tasks.length}</Text>
          <Text style={s.statLabel}>Задач</Text>
        </View>
        <View style={[s.statBox, { borderLeftColor: C.green }]}>
          <Text style={s.statValue}>{installations.length}</Text>
          <Text style={s.statLabel}>Монтажей</Text>
        </View>
        <View style={[s.statBox, { borderLeftColor: C.yellow }]}>
          <Text style={s.statValue}>{tasks.filter((t: any) => t.status === 'in_progress').length}</Text>
          <Text style={s.statLabel}>В работе</Text>
        </View>
      </View>

      {/* Tasks Card */}
      {tasks.length > 0 && (
        <View style={s.card}>
          <Text style={s.sectionTitle}>📋 Задачи ({tasks.length})</Text>
          {tasks.map((t: any) => (
            <TouchableOpacity key={t.id} style={s.listItem} onPress={() => router.push({ pathname: '/(app)/task/[id]', params: { id: t.id } } as any)}>
              <View style={s.listItemContent}>
                <Text style={s.itemTitle} numberOfLines={1}>{t.title}</Text>
                {t.assignee?.name && <Text style={s.itemSub}>👤 {t.assignee.name}</Text>}
              </View>
              <View style={[s.badge, { backgroundColor: statusColor(t.status), paddingHorizontal: 8, paddingVertical: 3 }]}>
                <Text style={s.badgeTextSmall}>{statusLabel(t.status)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Installations Card */}
      {installations.length > 0 && (
        <View style={s.card}>
          <Text style={s.sectionTitle}>🔧 Монтажи ({installations.length})</Text>
          {installations.map((i: any) => (
            <TouchableOpacity key={i.id} style={s.listItem} onPress={() => router.push({ pathname: '/(app)/installation/[id]', params: { id: i.id } } as any)}>
              <View style={s.listItemContent}>
                <Text style={s.itemTitle} numberOfLines={1}>{i.address || 'Монтаж'}</Text>
                {i.assignee?.name && <Text style={s.itemSub}>👤 {i.assignee.name}</Text>}
              </View>
              <View style={[s.badge, { backgroundColor: statusColor(i.status), paddingHorizontal: 8, paddingVertical: 3 }]}>
                <Text style={s.badgeTextSmall}>{statusLabel(i.status)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Быстрые действия</Text>
        <TouchableOpacity style={s.actionBtn} onPress={() => router.push('/(app)/task/create')}>
          <Text style={s.actionIcon}>✅</Text>
          <Text style={s.actionText}>Создать задачу</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={() => router.push('/(app)/installation/create')}>
          <Text style={s.actionIcon}>🔧</Text>
          <Text style={s.actionText}>Создать монтаж</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  backBtn: { padding: 16, paddingTop: 48 },
  backText: { color: C.accent, fontSize: 16 },
  card: { backgroundColor: C.card, margin: 16, marginTop: 0, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  badge: { borderRadius: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  badgeTextSmall: { color: '#fff', fontSize: 10, fontWeight: '600' },
  title: { color: C.text, fontSize: 22, fontWeight: '700', lineHeight: 28 },
  desc: { color: C.sub, fontSize: 14, marginTop: 8, lineHeight: 20 },
  managerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: C.bg, padding: 10, borderRadius: 8 },
  managerIcon: { fontSize: 16, marginRight: 8 },
  managerText: { color: C.text, fontSize: 14, fontWeight: '500' },
  sectionTitle: { color: C.accent, fontSize: 14, fontWeight: '600', marginBottom: 12, letterSpacing: 0.5 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  listItemContent: { flex: 1, marginRight: 10 },
  itemTitle: { color: C.text, fontSize: 13, fontWeight: '500' },
  itemSub: { color: C.sub, fontSize: 11, marginTop: 2 },
  sub: { color: C.sub, fontSize: 14 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8 },
  statBox: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 14, borderLeftWidth: 3 },
  statValue: { color: C.text, fontSize: 24, fontWeight: '700' },
  statLabel: { color: C.sub, fontSize: 11, marginTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 217, 255, 0.1)', padding: 12, borderRadius: 10, marginBottom: 8 },
  actionIcon: { fontSize: 20, marginRight: 10 },
  actionText: { color: C.accent, fontSize: 14, fontWeight: '600' }
});
