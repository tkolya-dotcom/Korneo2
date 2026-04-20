import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, ROLES } from '@/src/providers/AuthProvider';
import { tasksApi, projectsApi } from '@/src/lib/supabase';

const COLORS = { bg: '#0f172a', card: '#1e293b', accent: '#02d7ff', text: '#e8f1ff', sub: '#9ab0c5', border: '#1e2a35', green: '#22c55e', yellow: '#f59e0b', orange: '#f97316' };

export default function CreateTaskScreen() {
  const router = useRouter();
  const { canCreateTasks } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState('normal');
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [p, u] = await Promise.all([
        projectsApi.getAll().catch(() => []),
        fetchUsers().catch(() => [])
      ]);
      setProjects(p || []);
      setUsers(u || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    const { data } = await import('@/src/lib/supabase').then(m => 
      m.supabase.from('users').select('*')
    );
    return data || [];
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Ошибка', 'Введите название задачи');
      return;
    }
    
    if (!canCreateTasks) {
      Alert.alert('Ошибка', 'Недостаточно прав для создания задач');
      return;
    }

    setLoading(true);
    try {
      await tasksApi.create({
        title: title.trim(),
        description: description.trim(),
        project_id: projectId || null,
        assignee_id: assigneeId || null,
        priority,
        status: 'new',
        is_archived: false,
      });
      Alert.alert('Успех', 'Задача создана', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>← Назад</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Новая задача</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Название *</Text>
        <TextInput
          style={styles.input}
          placeholder="Введите название задачи"
          placeholderTextColor={COLORS.sub}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Описание</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Описание задачи"
          placeholderTextColor={COLORS.sub}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Проект</Text>
        <View style={styles.pickerContainer}>
          {projects.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[styles.pickerItem, projectId === p.id && styles.pickerItemActive]}
              onPress={() => setProjectId(projectId === p.id ? '' : p.id)}
            >
<Text style={[styles.pickerText, projectId === p.id && styles.pickerTextActive]}>
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
          {projects.length === 0 && (
            <Text style={styles.emptyText}>Нет проектов</Text>
          )}
        </View>

        <Text style={styles.label}>Приоритет</Text>
        <View style={styles.priorityRow}>
          {['low', 'normal', 'high', 'urgent'].map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.priorityBtn, priority === p && styles.priorityBtnActive]}
              onPress={() => setPriority(p)}
            >
              <Text style={[styles.priorityText, priority === p && styles.priorityTextActive]}>
                {p === 'low' ? 'Низкий' : p === 'normal' ? 'Обычный' : p === 'high' ? 'Высокий' : 'Срочный'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? 'Создание...' : 'Создать задачу'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  backBtn: { padding: 16, paddingTop: 48 },
  backText: { color: COLORS.accent, fontSize: 16 },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '700', paddingHorizontal: 16, marginBottom: 16 },
  card: { backgroundColor: COLORS.card, margin: 16, borderRadius: 16, padding: 16 },
  label: { color: COLORS.text, fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: COLORS.bg, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 14, fontSize: 15 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
pickerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerItem: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  pickerItemActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '22' },
  pickerText: { color: COLORS.sub, fontSize: 13 },
  pickerTextActive: { color: COLORS.accent },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  priorityBtnActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '22' },
  priorityText: { color: COLORS.sub, fontSize: 12, fontWeight: '600' },
  priorityTextActive: { color: COLORS.accent },
  btn: { backgroundColor: COLORS.accent, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptyText: { color: COLORS.sub, fontSize: 13 },
});
