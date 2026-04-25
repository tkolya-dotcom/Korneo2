import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { tasksApi } from '@/src/lib/supabase';

const C = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  text: '#E0E0E0',
  sub: '#8892a0',
  border: 'rgba(0, 217, 255, 0.15)',
};

const statuses = ['new', 'planned', 'in_progress', 'waiting_materials', 'done', 'postponed'];

const statusLabel = (status: string) =>
  ({
    new: 'Новая',
    planned: 'Запланирована',
    in_progress: 'В работе',
    waiting_materials: 'Ждет материалы',
    done: 'Выполнена',
    postponed: 'Отложена',
  }[status] || status);

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isManager } = useAuth();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    tasksApi.getById(id).then(setTask).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (status: string) => {
    setSaving(true);
    try {
      const updated = await tasksApi.update(id, { status });
      setTask(updated);
    } catch (error: any) {
      Alert.alert('Ошибка', error.message || 'Не удалось обновить задачу');
    } finally {
      setSaving(false);
    }
  };

  const openStatusMenu = () => {
    Alert.alert(
      'Сменить статус',
      'Выберите новое состояние задачи',
      [
        ...statuses.map((status) => ({
          text: statusLabel(status),
          onPress: () => {
            if (task.status !== status) {
              void updateStatus(status);
            }
          },
        })),
        { text: 'Отмена', style: 'cancel' as const },
      ]
    );
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={s.center}>
        <Text style={s.sub}>Задача не найдена</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.container}>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backText}>← Назад</Text>
      </TouchableOpacity>

      <View style={s.card}>
        <Text style={s.title}>{task.title}</Text>
        {task.description && <Text style={s.description}>{task.description}</Text>}
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>Информация</Text>
        <View style={s.row}><Text style={s.label}>Статус</Text><Text style={s.value}>{statusLabel(task.status)}</Text></View>
        <View style={s.row}><Text style={s.label}>Проект</Text><Text style={s.value}>{task.project?.name || '-'}</Text></View>
        <View style={s.row}><Text style={s.label}>Исполнитель</Text><Text style={s.value}>{task.assignee?.name || '-'}</Text></View>
        <View style={s.row}><Text style={s.label}>Срок</Text><Text style={s.value}>{task.due_date ? new Date(task.due_date).toLocaleDateString('ru-RU') : '-'}</Text></View>
      </View>

      <View style={s.card}>
        <TouchableOpacity
          style={s.secondaryBtn}
          onPress={() => router.push({ pathname: '/(app)/task/[id]/comments', params: { id } } as any)}
        >
          <Text style={s.secondaryBtnText}>Комментарии</Text>
        </TouchableOpacity>
      </View>

      {isManager && (
        <View style={s.card}>
          <Text style={s.sectionTitle}>Сменить статус</Text>
          <TouchableOpacity style={s.statusSelectBtn} onPress={openStatusMenu} disabled={saving}>
            <Text style={s.statusSelectText}>
              {saving ? 'Сохраняем...' : `${statusLabel(task.status)} ▾`}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  backBtn: { padding: 16, paddingTop: 48 },
  backText: { color: C.accent, fontSize: 16 },
  card: {
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  title: { color: C.text, fontSize: 22, fontWeight: '700' },
  description: { color: C.sub, fontSize: 14, lineHeight: 20, marginTop: 8 },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: '600', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 },
  label: { color: C.sub, fontSize: 13 },
  value: { color: C.text, fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right' },
  sub: { color: C.sub, fontSize: 14 },
  secondaryBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: C.accent, fontWeight: '600' },
  statusSelectBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.accent,
    backgroundColor: 'rgba(0, 217, 255, 0.12)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  statusSelectText: { color: C.accent, fontSize: 13, fontWeight: '700' },
});

