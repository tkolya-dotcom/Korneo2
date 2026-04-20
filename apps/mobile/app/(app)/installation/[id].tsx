import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { installationsApi } from '@/src/lib/supabase';

const C = { bg: '#0f172a', card: '#1e293b', accent: '#02d7ff', text: '#e8f1ff', sub: '#9ab0c5', border: '#1e2a35', green: '#22c55e', yellow: '#f59e0b', orange: '#f97316', red: '#ef4444' };
const STATUS_OPTIONS = ['pending', 'in_progress', 'completed', 'cancelled'];
const statusLabel = (s: string) => ({ pending: 'Ожидает', in_progress: 'В работе', completed: 'Завершён', cancelled: 'Отменён', active: 'Активный' }[s] || s);
const statusColor = (s: string) => ({ pending: C.yellow, in_progress: C.orange, completed: C.green, cancelled: C.sub, active: C.green }[s] || C.sub);

export default function InstallationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isManagerOrHigher } = useAuth();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    installationsApi.getById(id).then(setItem).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const changeStatus = async (status: string) => {
    setUpdating(true);
    try {
      const updated = await installationsApi.update(id, { status });
      setItem(updated);
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    } finally { setUpdating(false); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={C.accent} size="large" /></View>;
  if (!item) return <View style={s.center}><Text style={s.sub}>Монтаж не найден</Text></View>;

  return (
    <ScrollView style={s.container}>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backText}>← Назад</Text>
      </TouchableOpacity>
      <View style={s.card}>
        <View style={[s.badge, { backgroundColor: statusColor(item.status), alignSelf: 'flex-start', marginBottom: 12 }]}>
          <Text style={s.badgeText}>{statusLabel(item.status)}</Text>
        </View>
        <Text style={s.title}>{item.title || item.address || 'Монтаж'}</Text>
        {item.address && item.title && <Text style={s.desc}>📍 {item.address}</Text>}
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>Информация</Text>
        {item.project?.name && <View style={s.row}><Text style={s.label}>Проект</Text><Text style={s.value}>{item.project.name}</Text></View>}
        {item.assignee?.name && <View style={s.row}><Text style={s.label}>Исполнитель</Text><Text style={s.value}>{item.assignee.name}</Text></View>}
        {item.planned_date && <View style={s.row}><Text style={s.label}>Дата</Text><Text style={s.value}>{new Date(item.planned_date).toLocaleDateString('ru')}</Text></View>}
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>Сменить статус</Text>
        <View style={s.statusGrid}>
          {STATUS_OPTIONS.map(st => (
            <TouchableOpacity
              key={st}
              style={[s.statusBtn, item.status === st && { backgroundColor: statusColor(st) }]}
              onPress={() => changeStatus(st)}
              disabled={updating}
            >
              <Text style={[s.statusBtnText, item.status === st && { color: '#fff' }]}>{statusLabel(st)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {item.purchase_requests?.length > 0 && (
        <View style={s.card}>
          <Text style={s.sectionTitle}>Заявки ({item.purchase_requests.length})</Text>
          {item.purchase_requests.map((pr: any) => (
            <TouchableOpacity key={pr.id} style={s.listItem}
              onPress={() => router.push({ pathname: '/(app)/purchase-request/[id]', params: { id: pr.id } } as any)}>
              <Text style={s.itemTitle}>{pr.description || 'Заявка #' + pr.id.slice(0,8)}</Text>
              <View style={[s.badge, { backgroundColor: statusColor(pr.status) }]}>
                <Text style={s.badgeText}>{pr.status}</Text>
              </View>
            </TouchableOpacity>
          ))}
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
  card: { backgroundColor: C.card, margin: 16, marginTop: 0, borderRadius: 16, padding: 16, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  title: { color: C.text, fontSize: 20, fontWeight: '700', lineHeight: 28 },
  desc: { color: C.sub, fontSize: 14, marginTop: 8 },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: '600', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { color: C.sub, fontSize: 13 },
  value: { color: C.text, fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right' },
  sub: { color: C.sub, fontSize: 14 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: C.border },
  statusBtnText: { color: C.sub, fontSize: 13, fontWeight: '500' },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border },
  itemTitle: { color: C.text, fontSize: 13, flex: 1, marginRight: 8 },
});