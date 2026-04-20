<<<<<<< HEAD
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { tasksApi } from '@/src/lib/supabase';

// Cyberpunk theme - cyan colors as in web app
const C = { bg: '#0A0A0F', card: '#1A1A2E', accent: '#00D9FF', text: '#E0E0E0', sub: '#8892a0', border: 'rgba(0, 217, 255, 0.15)', green: '#00FF88', yellow: '#f59e0b', orange: '#f97316', danger: '#FF3366' };

const STATUS_OPTIONS = ['new', 'in_progress', 'on_hold', 'completed'];
const statusLabel = (s: string) => ({ new: 'Новая', in_progress: 'В работе', on_hold: 'На паузе', completed: 'Готова' }[s] || s);
const statusColor = (s: string) => ({ new: '#3399ff', in_progress: C.accent, on_hold: '#ff00cc', completed: C.green }[s] || C.sub);

const PRIORITY_COLORS: Record<string, string> = {
  low: '#8892a0',
  normal: '#3399ff',
  high: '#FFA500',
  urgent: '#FF3366',
};

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, isManagerOrHigher, canDeleteTasks } = useAuth();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    tasksApi.getById(id).then(setTask).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const changeStatus = async (status: string) => {
    setUpdating(true);
    try {
      const updated = await tasksApi.update(id, { status });
      setTask(updated);
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    } finally { setUpdating(false); }
  };

  const deleteTask = async () => {
    if (!canDeleteTasks) {
      Alert.alert('Ошибка', 'Недостаточно прав для удаления');
      return;
    }
    Alert.alert('Удалить задачу?', 'Это действие необратимо', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        try {
          await tasksApi.delete(id);
          router.back();
        } catch (e: any) {
          Alert.alert('Ошибка', e.message);
        }
      }}
    ]);
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={C.accent} size="large" /></View>;
  if (!task) return <View style={s.center}><Text style={s.sub}>Задача не найдена</Text></View>;

  return (
    <ScrollView style={s.container}>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backText}>← Назад</Text>
      </TouchableOpacity>

      {/* Main Card */}
      <View style={s.card}>
        <View style={s.headerRow}>
          <View style={[s.badge, { backgroundColor: statusColor(task.status) }]}>
            <Text style={s.badgeText}>{statusLabel(task.status)}</Text>
          </View>
          {task.priority && (
            <View style={[s.priorityBadge, { backgroundColor: PRIORITY_COLORS[task.priority] + '20', borderColor: PRIORITY_COLORS[task.priority] }]}>
              <Text style={[s.priorityText, { color: PRIORITY_COLORS[task.priority] }]}>
                {task.priority.toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <Text style={s.title}>{task.title}</Text>
        {task.description && <Text style={s.desc}>{task.description}</Text>}
      </View>

      {/* Info Card */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Информация</Text>
        {task.project?.name && (
          <View style={s.row}>
            <Text style={s.label}>📋 Проект</Text>
            <Text style={s.value}>{task.project.name}</Text>
          </View>
        )}
        {task.assignee?.name && (
          <View style={s.row}>
            <Text style={s.label}>👤 Исполнитель</Text>
            <Text style={s.value}>{task.assignee.name}</Text>
          </View>
        )}
        {task.due_date && (
          <View style={s.row}>
            <Text style={s.label}>📅 Дедлайн</Text>
            <Text style={s.value}>{new Date(task.due_date).toLocaleDateString('ru')}</Text>
          </View>
        )}
        {task.address && (
          <View style={s.row}>
            <Text style={s.label}>📍 Адрес</Text>
            <Text style={s.value}>{task.address}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Действия</Text>
        
        {/* Comments Button */}
        <TouchableOpacity style={s.actionBtn} onPress={() => router.push({ pathname: '/(app)/task/[id]/comments', params: { id } } as any)}>
          <Text style={s.actionIcon}>💬</Text>
          <Text style={s.actionText}>Комментарии</Text>
        </TouchableOpacity>

        {/* Status Change */}
        <Text style={s.statusLabel}>Сменить статус:</Text>
        <View style={s.statusGrid}>
          {STATUS_OPTIONS.map(st => (
            <TouchableOpacity
              key={st}
              style={[s.statusBtn, task.status === st && { backgroundColor: statusColor(st), borderColor: statusColor(st) }]}
              onPress={() => changeStatus(st)}
              disabled={updating}
            >
              <Text style={[s.statusBtnText, task.status === st && { color: '#fff' }]}>{statusLabel(st)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Delete Button */}
        {canDeleteTasks && (
          <TouchableOpacity style={s.deleteBtn} onPress={deleteTask}>
            <Text style={s.deleteBtnText}>🗑️ Удалить задачу</Text>
          </TouchableOpacity>
        )}
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
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  priorityText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  title: { color: C.text, fontSize: 20, fontWeight: '700', lineHeight: 28 },
  desc: { color: C.sub, fontSize: 14, marginTop: 8, lineHeight: 20 },
  sectionTitle: { color: C.accent, fontSize: 14, fontWeight: '600', marginBottom: 12, letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  label: { color: C.sub, fontSize: 13 },
  value: { color: C.text, fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right' },
  sub: { color: C.sub, fontSize: 14 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 217, 255, 0.1)', padding: 12, borderRadius: 10, marginBottom: 12 },
  actionIcon: { fontSize: 20, marginRight: 10 },
  actionText: { color: C.accent, fontSize: 14, fontWeight: '600' },
  statusLabel: { color: C.sub, fontSize: 12, marginBottom: 8 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  statusBtnText: { color: C.sub, fontSize: 13, fontWeight: '500' },
  deleteBtn: { backgroundColor: 'rgba(255, 51, 102, 0.1)', padding: 12, borderRadius: 10, marginTop: 16, borderWidth: 1, borderColor: C.danger },
  deleteBtnText: { color: C.danger, fontSize: 14, fontWeight: '600', textAlign: 'center' },
=======
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { tasksApi } from '@/src/lib/supabase';

const C = { bg: '#0f172a', card: '#1e293b', accent: '#02d7ff', text: '#e8f1ff', sub: '#9ab0c5', border: '#1e2a35', green: '#22c55e', yellow: '#f59e0b', orange: '#f97316', red: '#ef4444' };
const STATUS_OPTIONS = ['pending', 'in_progress', 'completed', 'cancelled'];
const statusLabel = (s: string) => ({ pending: 'Ожидает', in_progress: 'В работе', completed: 'Готова', cancelled: 'Отменена', active: 'Активна' }[s] || s);
const statusColor = (s: string) => ({ pending: C.yellow, in_progress: C.orange, completed: C.green, cancelled: C.sub, active: C.green }[s] || C.sub);

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isManagerOrHigher } = useAuth();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    tasksApi.getById(id).then(setTask).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const changeStatus = async (status: string) => {
    setUpdating(true);
    try {
      const updated = await tasksApi.update(id, { status });
      setTask(updated);
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    } finally { setUpdating(false); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={C.accent} size="large" /></View>;
  if (!task) return <View style={s.center}><Text style={s.sub}>Задача не найдена</Text></View>;

  return (
    <ScrollView style={s.container}>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backText}>← Назад</Text>
      </TouchableOpacity>
      <View style={s.card}>
        <View style={[s.badge, { backgroundColor: statusColor(task.status), alignSelf: 'flex-start', marginBottom: 12 }]}>
          <Text style={s.badgeText}>{statusLabel(task.status)}</Text>
        </View>
        <Text style={s.title}>{task.title}</Text>
        {task.description && <Text style={s.desc}>{task.description}</Text>}
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>Информация</Text>
        {task.project?.name && <View style={s.row}><Text style={s.label}>Проект</Text><Text style={s.value}>{task.project.name}</Text></View>}
        {task.assignee?.name && <View style={s.row}><Text style={s.label}>Исполнитель</Text><Text style={s.value}>{task.assignee.name}</Text></View>}
        {task.deadline && <View style={s.row}><Text style={s.label}>Дедлайн</Text><Text style={s.value}>{new Date(task.deadline).toLocaleDateString('ru')}</Text></View>}
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>Сменить статус</Text>
        <View style={s.statusGrid}>
          {STATUS_OPTIONS.map(st => (
            <TouchableOpacity
              key={st}
              style={[s.statusBtn, task.status === st && { backgroundColor: statusColor(st) }]}
              onPress={() => changeStatus(st)}
              disabled={updating}
            >
              <Text style={[s.statusBtnText, task.status === st && { color: '#fff' }]}>{statusLabel(st)}</Text>
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
  backBtn: { padding: 16, paddingTop: 48 },
  backText: { color: C.accent, fontSize: 16 },
  card: { backgroundColor: C.card, margin: 16, marginTop: 0, borderRadius: 16, padding: 16, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  title: { color: C.text, fontSize: 20, fontWeight: '700', lineHeight: 28 },
  desc: { color: C.sub, fontSize: 14, marginTop: 8, lineHeight: 20 },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: '600', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { color: C.sub, fontSize: 13 },
  value: { color: C.text, fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right' },
  sub: { color: C.sub, fontSize: 14 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: C.border },
  statusBtnText: { color: C.sub, fontSize: 13, fontWeight: '500' },
>>>>>>> dd3744c539c31c2d34149066cd6bfad4332e3c60
});