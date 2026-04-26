import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { installationsApi, projectsApi, authApi } from '@/src/lib/supabase';

// Cyberpunk theme
const C = { bg: '#0A0A0F', card: '#1A1A2E', accent: '#00D9FF', text: '#E0E0E0', sub: '#8892a0', border: 'rgba(0, 217, 255, 0.15)', danger: '#FF3366', green: '#00FF88' };

export default function InstallationCreateScreen() {
  const { user, canCreateTasks } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [address, setAddress] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [description, setDescription] = useState('');
  // Оборудование СК (до 7 единиц)
  const [equipment, setEquipment] = useState<Array<{id: string, name: string}>>([]);

  useEffect(() => {
    if (!canCreateTasks) {
      Alert.alert('Ошибка', 'Недостаточно прав для создания монтажа');
      router.back();
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [projData, usersData] = await Promise.all([
        projectsApi.getAll(),
        authApi.getUsers()
      ]);
      setProjects(projData || []);
      setUsers(usersData || []);
    } catch (e) {
      console.error('Ошибка загрузки:', e);
    }
  };

  const addEquipment = () => {
    if (equipment.length >= 7) {
      Alert.alert('Ошибка', 'Максимум 7 единиц оборудования');
      return;
    }
    setEquipment([...equipment, { id: '', name: '' }]);
  };

  const updateEquipment = (index: number, field: 'id' | 'name', value: string) => {
    const updated = [...equipment];
    updated[index] = { ...updated[index], [field]: value };
    setEquipment(updated);
  };

  const removeEquipment = (index: number) => {
    setEquipment(equipment.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!address.trim()) {
      Alert.alert('Ошибка', 'Введите адрес');
      return;
    }

    setLoading(true);
    try {
      const inst: any = {
        address: address.trim(),
        project_id: projectId || null,
        assignee_id: assigneeId || null,
        planned_date: plannedDate || null,
        description: description.trim(),
        status: 'new',
      };

      // Добавляем оборудование СК (до 7)
      equipment.forEach((eq, i) => {
        if (eq.id) inst[`id_sk${i === 0 ? '' : i}`] = eq.id;
        if (eq.name) inst[`naimenovanie_sk${i === 0 ? '' : i}`] = eq.name;
      });

      await installationsApi.create(inst);
      Alert.alert('Успех', 'Монтаж создан', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert('Ошибка', e.message || 'Не удалось создать монтаж');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backBtn}>← Назад</Text>
        </TouchableOpacity>
        <Text style={s.title}>Создать монтаж</Text>
      </View>

      <View style={s.form}>
        <Text style={s.label}>Адрес *</Text>
        <TextInput style={s.input} placeholder="Адрес монтажа" placeholderTextColor={C.sub}
          value={address} onChangeText={setAddress} />

        <Text style={s.label}>Описание</Text>
        <TextInput style={[s.input, s.textarea]} placeholder="Описание работ" placeholderTextColor={C.sub}
          value={description} onChangeText={setDescription} multiline numberOfLines={3} />

        <Text style={s.label}>Проект</Text>
        <View style={s.selectWrap}>
          <TouchableOpacity style={s.select} onPress={() => {
            Alert.alert('Выберите проект', '', [
              ...projects.map(p => ({ text: p.name, onPress: () => setProjectId(p.id) })),
              { text: 'Отмена', style: 'cancel' }
            ]);
          }}>
            <Text style={s.selectText}>{projects.find(p => p.id === projectId)?.name || 'Выберите проект'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.label}>Ответственный</Text>
        <View style={s.selectWrap}>
          <TouchableOpacity style={s.select} onPress={() => {
            Alert.alert('Выберите ответственного', '', [
              ...users.map(u => ({ text: u.name || u.email, onPress: () => setAssigneeId(u.id) })),
              { text: 'Отмена', style: 'cancel' }
            ]);
          }}>
            <Text style={s.selectText}>{users.find(u => u.id === assigneeId)?.name || 'Выберите ответственного'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.label}>Плановая дата</Text>
        <TextInput style={s.input} placeholder="ГГГГ-ММ-ДД" placeholderTextColor={C.sub}
          value={plannedDate} onChangeText={setPlannedDate} />

        {/* Оборудование СК */}
        <View style={s.sectionHeader}>
          <Text style={s.label}>Оборудование (СК)</Text>
          <TouchableOpacity onPress={addEquipment}>
            <Text style={s.addBtn}>+ Добавить ({equipment.length}/7)</Text>
          </TouchableOpacity>
        </View>

        {equipment.map((eq, index) => (
          <View key={index} style={s.equipmentRow}>
            <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} placeholder={`ID СК ${index + 1}`} 
              placeholderTextColor={C.sub} value={eq.id} onChangeText={(v) => updateEquipment(index, 'id', v)} />
            <TextInput style={[s.input, { flex: 2, marginBottom: 0 }]} placeholder="Наименование" 
              placeholderTextColor={C.sub} value={eq.name} onChangeText={(v) => updateEquipment(index, 'name', v)} />
            <TouchableOpacity onPress={() => removeEquipment(index)} style={s.removeBtn}>
              <Text style={s.removeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color={C.bg} /> : <Text style={s.btnText}>СОЗДАТЬ МОНТАЖ</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50 },
  backBtn: { color: C.accent, fontSize: 16 },
  title: { color: C.accent, fontSize: 22, fontWeight: '700', marginLeft: 20 },
  form: { padding: 20 },
  label: { color: C.accent, fontSize: 13, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 },
  input: { backgroundColor: C.card, color: C.text, borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 15, borderWidth: 1, borderColor: C.border },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  selectWrap: { marginBottom: 16 },
  select: { backgroundColor: C.card, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.border },
  selectText: { color: C.text, fontSize: 15 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  addBtn: { color: C.green, fontSize: 13, fontWeight: '600' },
  equipmentRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  removeBtn: { padding: 10 },
  removeBtnText: { color: C.danger, fontSize: 16 },
  btn: { backgroundColor: C.accent, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: C.bg, fontSize: 16, fontWeight: '700', letterSpacing: 1 },
});