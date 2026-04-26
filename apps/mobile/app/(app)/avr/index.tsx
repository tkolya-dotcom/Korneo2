import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { tasksAvrApi, authApi } from '@/src/lib/supabase';

// Cyberpunk theme
const C = { bg: '#0A0A0F', card: '#1A1A2E', accent: '#00D9FF', text: '#E0E0E0', sub: '#8892a0', border: 'rgba(0, 217, 255, 0.15)', danger: '#FF3366', green: '#00FF88', orange: '#FFA500' };

const STATUS_COLORS: Record<string, string> = {
  new: '#3399ff',
  in_progress: '#00D9FF',
  completed: '#00FF88',
  on_hold: '#ff00cc',
};

export default function AVRScreen() {
  const { canCreateTasks } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  
  // Форма создания
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [oldEquipment, setOldEquipment] = useState('');
  const [newEquipment, setNewEquipment] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    loadTasks();
    loadUsers();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await tasksAvrApi.getAll();
      setTasks(data || []);
    } catch (e) {
      console.error('Ошибка загрузки:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await authApi.getUsers();
      setUsers(data || []);
    } catch (e) {
      console.error('Ошибка загрузки пользователей:', e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!address.trim()) {
      Alert.alert('Ошибка', 'Введите адрес');
      return;
    }
    try {
      await tasksAvrApi.create({
        address: address.trim(),
        description: description.trim(),
        old_equipment: oldEquipment.trim(),
        new_equipment: newEquipment.trim(),
        reason: reason.trim(),
        status: 'new',
      });
      Alert.alert('Успех', 'Задача АВР создана');
      setShowCreate(false);
      setAddress(''); setDescription(''); setOldEquipment(''); setNewEquipment(''); setReason('');
      loadTasks();
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    }
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={C.accent} size="large" /></View>;
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>АВР</Text>
        {canCreateTasks && (
          <TouchableOpacity onPress={() => setShowCreate(!showCreate)}>
            <Text style={s.addBtn}>+ Создать</Text>
          </TouchableOpacity>
        )}
      </View>

      {showCreate && (
        <View style={s.createForm}>
          <Text style={s.formTitle}>Новая задача АВР</Text>
          <TextInput style={s.input} placeholder="Адрес *" placeholderTextColor={C.sub} value={address} onChangeText={setAddress} />
          <TextInput style={s.input} placeholder="Описание" placeholderTextColor={C.sub} value={description} onChangeText={setDescription} />
          <TextInput style={s.input} placeholder="Старое оборудование" placeholderTextColor={C.sub} value={oldEquipment} onChangeText={setOldEquipment} />
          <TextInput style={s.input} placeholder="Новое оборудование" placeholderTextColor={C.sub} value={newEquipment} onChangeText={setNewEquipment} />
          <TextInput style={s.input} placeholder="Причина замены" placeholderTextColor={C.sub} value={reason} onChangeText={setReason} />
          <View style={s.formBtns}>
            <TouchableOpacity style={s.submitBtn} onPress={handleCreate}>
              <Text style={s.submitBtnText}>Создать</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Text style={s.cancelBtn}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={tasks}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={s.empty}>Задач АВР нет</Text>}
        renderItem={({ item }) => (
          <View style={s.taskCard}>
            <View style={s.taskHeader}>
              <Text style={s.taskId}>{item.short_id || item.id?.slice(0, 8)}</Text>
              <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[item.status] || C.sub }]}>
                <Text style={s.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={s.taskAddress}>{item.address}</Text>
            {item.description && <Text style={s.taskDesc}>{item.description}</Text>}
            {item.old_equipment && <Text style={s.equip}>↓ {item.old_equipment}</Text>}
            {item.new_equipment && <Text style={s.equip}>↑ {item.new_equipment}</Text>}
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent:'space-between', alignItems: 'center', padding: 20, paddingTop: 50 },
  title: { color: C.accent, fontSize: 26, fontWeight: '700' },
  addBtn: { color: C.green, fontSize: 14, fontWeight: '600' },
  createForm: { backgroundColor: C.card, padding: 16, margin: 16, borderRadius: 12 },
  formTitle: { color: C.accent, fontSize: 16, fontWeight: '600', marginBottom: 12 },
  input: { backgroundColor: C.bg, color: C.text, borderRadius: 8, padding: 12, marginBottom: 8, fontSize: 14, borderWidth: 1, borderColor: C.border },
  formBtns: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  submitBtn: { backgroundColor: C.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  submitBtnText: { color: C.bg, fontWeight: '700' },
  cancelBtn: { color: C.sub, marginLeft: 16 },
  taskCard: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: C.orange },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  taskId: { color: C.orange, fontSize: 12, fontWeight: '600', fontFamily: 'monospace' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  taskAddress: { color: C.text, fontSize: 15, fontWeight: '600' },
  taskDesc: { color: C.sub, fontSize: 13, marginTop: 4 },
  equip: { color: C.sub, fontSize: 12, marginTop: 2, fontFamily: 'monospace' },
  empty: { color: C.sub, textAlign: 'center', marginTop: 60, fontSize: 16 },
});