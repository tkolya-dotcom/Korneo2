import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { installationsApi, projectsApi, authApi } from '@/src/lib/supabase';

<<<<<<< HEAD
const C = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  text: '#E0E0E0',
  sub: '#8892a0',
  border: 'rgba(0, 217, 255, 0.15)',
  danger: '#FF3366',
  green: '#00FF88',
};

type AddressItem = Record<string, any>;
type EquipmentOption = {
  key: string;
  id: string;
  name: string;
  brand?: string;
  model?: string;
  serial?: string;
  inventory?: string;
};

const getAddressEquipmentOptions = (item: AddressItem | null): EquipmentOption[] => {
  if (!item) {
    return [];
  }

  const rows = Array.isArray(item.sk_items)
    ? item.sk_items
    : Array.isArray(item.equipment_items)
      ? item.equipment_items
      : [];

  const sourceRows = rows
    .map((entry: Record<string, unknown>, index: number) => {
      const id = String(entry.id || '').trim();
      const name = String(entry.name || '').trim();
      const key = String(entry.key || `${index + 1}|${id}|${name}`).trim();
      if (!id && !name) {
        return null;
      }
      return {
        key,
        id,
        name: name || `СК ${index + 1}`,
        brand: String(entry.brand || '').trim() || undefined,
        model: String(entry.model || '').trim() || undefined,
        serial: String(entry.serial || '').trim() || undefined,
        inventory: String(entry.inventory || '').trim() || undefined,
      } as EquipmentOption;
    })
    .filter(Boolean) as EquipmentOption[];

  if (sourceRows.length === 0) {
    const fallbackName = String(item.sk_name || '').trim();
    if (fallbackName) {
      sourceRows.push({
        key: `fallback|${fallbackName}`,
        id: '',
        name: fallbackName,
      });
    }
  }

  const seen = new Set<string>();
  return sourceRows
    .filter((entry) => {
      const dedupeKey = `${entry.id}|${entry.name}`.toLowerCase().trim();
      if (!dedupeKey || seen.has(dedupeKey)) {
        return false;
      }
      seen.add(dedupeKey);
      return true;
    })
    .slice(0, 7);
};

const formatEquipmentOptionMeta = (item: EquipmentOption) =>
  [item.brand, item.model, item.serial ? `S/N ${item.serial}` : null, item.inventory ? `INV ${item.inventory}` : null]
    .filter(Boolean)
    .join(' • ');
=======
// Cyberpunk theme
const C = { bg: '#0A0A0F', card: '#1A1A2E', accent: '#00D9FF', text: '#E0E0E0', sub: '#8892a0', border: 'rgba(0, 217, 255, 0.15)', danger: '#FF3366', green: '#00FF88' };
>>>>>>> 8e64d59caf785307e6286010bb536392348ff67e

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
<<<<<<< HEAD
  const [selectedAddress, setSelectedAddress] = useState<AddressItem | null>(null);
  const [selectedEquipmentKeys, setSelectedEquipmentKeys] = useState<string[]>([]);
  const [manualEquipment, setManualEquipment] = useState<Array<{ id: string; name: string }>>([]);
=======
  // Оборудование СК (до 7 единиц)
  const [equipment, setEquipment] = useState<Array<{id: string, name: string}>>([]);
>>>>>>> 8e64d59caf785307e6286010bb536392348ff67e

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

<<<<<<< HEAD
  const filteredAddresses = useMemo(() => {
    return searchAddressSuggestions(addresses, address, 20);
  }, [address, addresses]);
  const addressEquipmentOptions = useMemo(
    () => getAddressEquipmentOptions(selectedAddress),
    [selectedAddress]
  );

  useEffect(() => {
    if (!selectedAddress) {
      setSelectedEquipmentKeys([]);
      return;
    }
    setSelectedEquipmentKeys(addressEquipmentOptions.map((option) => option.key));
    setManualEquipment([]);
  }, [selectedAddress, addressEquipmentOptions]);

  const toggleAddressEquipment = (key: string) => {
    setSelectedEquipmentKeys((prev) => {
      if (prev.includes(key)) {
        return prev.filter((item) => item !== key);
      }
      const currentTotal = prev.length + manualEquipment.length;
      if (currentTotal >= 7) {
        Alert.alert(
          '\u041e\u0448\u0438\u0431\u043a\u0430',
          '\u041c\u0430\u043a\u0441\u0438\u043c\u0443\u043c 7 \u0435\u0434\u0438\u043d\u0438\u0446 \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u044f'
        );
        return prev;
      }
      return [...prev, key];
    });
  };

  const addManualEquipment = () => {
    const selectedFromAddress = selectedEquipmentKeys.length;
    if (selectedFromAddress + manualEquipment.length >= 7) {
      Alert.alert(
        '\u041e\u0448\u0438\u0431\u043a\u0430',
        '\u041c\u0430\u043a\u0441\u0438\u043c\u0443\u043c 7 \u0435\u0434\u0438\u043d\u0438\u0446 \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u044f'
      );
      return;
    }
    setManualEquipment((prev) => [...prev, { id: '', name: '' }]);
  };

  const updateManualEquipment = (index: number, field: 'id' | 'name', value: string) => {
    setManualEquipment((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeManualEquipment = (index: number) => {
    setManualEquipment((prev) => prev.filter((_, i) => i !== index));
=======
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
>>>>>>> 8e64d59caf785307e6286010bb536392348ff67e
  };

  const handleSubmit = async () => {
    if (!address.trim()) {
      Alert.alert('Ошибка', 'Введите адрес');
      return;
    }

    setLoading(true);
    try {
<<<<<<< HEAD
      const selectedFromAddress = addressEquipmentOptions
        .filter((option) => selectedEquipmentKeys.includes(option.key))
        .map((option) => ({
          id: option.id.trim(),
          name: option.name.trim(),
          brand: option.brand,
          model: option.model,
          serial: option.serial,
          inventory: option.inventory,
        }));
      const selectedManual = manualEquipment
        .map((item) => ({
          id: item.id.trim(),
          name: item.name.trim(),
          brand: undefined,
          model: undefined,
          serial: undefined,
          inventory: undefined,
        }))
        .filter((item) => item.id || item.name);

      const dedupe = new Set<string>();
      const equipment = [...selectedFromAddress, ...selectedManual]
        .filter((item) => item.id || item.name)
        .filter((item) => {
          const key = `${item.id}|${item.name}`.toLowerCase().trim();
          if (!key || dedupe.has(key)) {
            return false;
          }
          dedupe.add(key);
          return true;
        })
        .slice(0, 7);

      const payload: Record<string, unknown> = {
        address: normalizedAddress,
=======
      const inst: any = {
        address: address.trim(),
>>>>>>> 8e64d59caf785307e6286010bb536392348ff67e
        project_id: projectId || null,
        assignee_id: assigneeId || null,
        planned_date: plannedDate || null,
        description: description.trim(),
        status: 'new',
      };

      // Добавляем оборудование СК (до 7)
      equipment.forEach((eq, i) => {
<<<<<<< HEAD
        const suffix = i === 0 ? '' : String(i + 1);
        if (eq.id) payload[`id_sk${suffix}`] = eq.id;
        if (eq.name) payload[`naimenovanie_sk${suffix}`] = eq.name;
        if (eq.brand) payload[`marka_sk${suffix}`] = eq.brand;
        if (eq.model) payload[`model_sk${suffix}`] = eq.model;
        if (eq.serial) payload[`seriynyy_nomer${suffix}`] = eq.serial;
        if (eq.inventory) payload[`inventarnyy_nomer${suffix}`] = eq.inventory;
=======
        if (eq.id) inst[`id_sk${i === 0 ? '' : i}`] = eq.id;
        if (eq.name) inst[`naimenovanie_sk${i === 0 ? '' : i}`] = eq.name;
>>>>>>> 8e64d59caf785307e6286010bb536392348ff67e
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
<<<<<<< HEAD
          <Text style={s.label}>{'\u041e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435 (\u0421\u041a)'}</Text>
          <TouchableOpacity onPress={addManualEquipment}>
            <Text style={s.addBtn}>{`+ \u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0435\u0449\u0435 (${selectedEquipmentKeys.length + manualEquipment.length}/7)`}</Text>
          </TouchableOpacity>
        </View>

        {addressEquipmentOptions.length > 0 ? (
          <View style={s.equipmentSourceCard}>
            <Text style={s.equipmentSourceTitle}>
              {'\u041e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435 \u0438\u0437 \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u043e\u0433\u043e \u0430\u0434\u0440\u0435\u0441\u0430'}
            </Text>
            {addressEquipmentOptions.map((option) => {
              const checked = selectedEquipmentKeys.includes(option.key);
              const optionMeta = formatEquipmentOptionMeta(option);
              return (
                <TouchableOpacity
                  key={option.key}
                  style={s.checkboxRow}
                  onPress={() => toggleAddressEquipment(option.key)}
                >
                  <View style={[s.checkbox, checked && s.checkboxChecked]}>
                    <Text style={s.checkboxMark}>{checked ? '✓' : ''}</Text>
                  </View>
                  <View style={s.checkboxTextWrap}>
                    <Text style={s.checkboxTitle} numberOfLines={2}>
                      {option.name}
                      {option.id ? ` (ID ${option.id})` : ''}
                    </Text>
                    {optionMeta ? (
                      <Text style={s.checkboxMeta} numberOfLines={2}>
                        {optionMeta}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Text style={s.noEquipmentHint}>
            {'\u041f\u043e \u0430\u0434\u0440\u0435\u0441\u0443 \u0441\u043f\u0438\u0441\u043e\u043a \u0421\u041a \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d. \u041c\u043e\u0436\u043d\u043e \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0432\u0440\u0443\u0447\u043d\u0443\u044e.'}
          </Text>
        )}

        {manualEquipment.map((eq, index) => (
          <View key={`${index}-${eq.id}-${eq.name}`} style={s.equipmentRow}>
            <TextInput
              style={[s.input, { flex: 1, marginBottom: 0 }]}
              placeholder={`ID \u0421\u041a ${index + 1}`}
              placeholderTextColor={C.sub}
              value={eq.id}
              onChangeText={(v) => updateManualEquipment(index, 'id', v)}
            />
            <TextInput
              style={[s.input, { flex: 2, marginBottom: 0 }]}
              placeholder={'\u041d\u0430\u0438\u043c\u0435\u043d\u043e\u0432\u0430\u043d\u0438\u0435'}
              placeholderTextColor={C.sub}
              value={eq.name}
              onChangeText={(v) => updateManualEquipment(index, 'name', v)}
            />
            <TouchableOpacity onPress={() => removeManualEquipment(index)} style={s.removeBtn}>
              <Text style={s.removeBtnText}>{'\u2715'}</Text>
=======
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
>>>>>>> 8e64d59caf785307e6286010bb536392348ff67e
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
  equipmentSourceCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    marginBottom: 12,
    paddingVertical: 6,
  },
  equipmentSourceTitle: {
    color: C.sub,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    borderColor: C.accent,
    backgroundColor: 'rgba(0,217,255,0.18)',
  },
  checkboxMark: {
    color: C.accent,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  checkboxTextWrap: { flex: 1 },
  checkboxTitle: { color: C.text, fontSize: 13, fontWeight: '600' },
  checkboxMeta: { color: C.sub, fontSize: 11, marginTop: 3 },
  noEquipmentHint: {
    color: C.sub,
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 18,
  },
  equipmentRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  removeBtn: { padding: 10 },
  removeBtnText: { color: C.danger, fontSize: 16 },
  btn: { backgroundColor: C.accent, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: C.bg, fontSize: 16, fontWeight: '700', letterSpacing: 1 },
});