import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { purchaseRequestsApi } from '@/src/lib/supabase';

const C = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  text: '#E0E0E0',
  sub: '#8892a0',
  border: 'rgba(0, 217, 255, 0.15)',
  green: '#00FF88',
  red: '#FF3366',
};

const statusLabel = (status: string) =>
  ({
    draft: 'Черновик',
    pending: 'Ожидает',
    approved: 'Подтверждена',
    rejected: 'Отклонена',
    in_order: 'В заказе',
    ready_for_receipt: 'Готов к получению',
    received: 'Получено',
    done: 'Завершена',
    postponed: 'Отложена',
  }[status] || status);

const statusOptions = [
  'pending',
  'approved',
  'rejected',
  'in_order',
  'ready_for_receipt',
  'received',
  'done',
  'postponed',
] as const;

export default function PurchaseRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isManagerOrHigher } = useAuth();
  const router = useRouter();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await purchaseRequestsApi.getById(id);
      setRequest(data);
    } catch (error) {
      console.error('Failed to load purchase request:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const updateStatus = async (status: string) => {
    try {
      await purchaseRequestsApi.updateStatus(id, status);
      await load();
    } catch (error: any) {
      Alert.alert('Ошибка', error.message || 'Не удалось обновить заявку');
    }
  };

  const openStatusMenu = () => {
    Alert.alert(
      'Сменить статус',
      'Выберите новое состояние заявки',
      [
        ...statusOptions.map((status) => ({
          text: statusLabel(status),
          onPress: () => {
            if (request.status !== status) {
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

  if (!request) {
    return (
      <View style={s.center}>
        <Text style={s.sub}>Заявка не найдена</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.container}>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backText}>← Назад</Text>
      </TouchableOpacity>

      <View style={s.card}>
        <Text style={s.title}>{request.comment || `Заявка #${request.id.slice(0, 8)}`}</Text>
        <Text style={s.status}>{statusLabel(request.status)}</Text>
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>Информация</Text>
        <View style={s.row}><Text style={s.label}>Создатель</Text><Text style={s.value}>{request.creator?.name || request.creator?.email || '-'}</Text></View>
        <View style={s.row}><Text style={s.label}>Задача</Text><Text style={s.value}>{request.task?.title || '-'}</Text></View>
        <View style={s.row}><Text style={s.label}>Монтаж</Text><Text style={s.value}>{request.installation?.title || request.installation?.address || '-'}</Text></View>
        <View style={s.row}><Text style={s.label}>Создана</Text><Text style={s.value}>{new Date(request.created_at).toLocaleString('ru-RU')}</Text></View>
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>Позиции</Text>
        {request.items?.length ? (
          request.items.map((item: any, index: number) => (
            <View key={item.id || index} style={s.itemRow}>
              <Text style={s.itemName}>
                {index + 1}. {item.name || item.material?.name || item.material_name || '\u041f\u043e\u0437\u0438\u0446\u0438\u044f'}
              </Text>
              <Text style={s.itemQty}>
                {item.quantity ?? item.qty ?? 0} {item.unit || item.material?.default_unit || '\u0448\u0442'}
              </Text>
            </View>
          ))
        ) : (
          <Text style={s.sub}>Позиции не добавлены</Text>
        )}
      </View>

      {isManagerOrHigher && (
        <View style={s.card}>
          <Text style={s.sectionTitle}>Смена статуса</Text>
          <TouchableOpacity style={s.statusSelectBtn} onPress={openStatusMenu}>
            <Text style={s.statusSelectText}>{statusLabel(request.status)} ▾</Text>
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
  status: { color: C.accent, fontSize: 13, fontWeight: '600', marginTop: 8 },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: '600', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 },
  label: { color: C.sub, fontSize: 13 },
  value: { color: C.text, fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right' },
  sub: { color: C.sub, fontSize: 14 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border },
  itemName: { color: C.text, fontSize: 14, flex: 1, marginRight: 12 },
  itemQty: { color: C.sub, fontSize: 13 },
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

