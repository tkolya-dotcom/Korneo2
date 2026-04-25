import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
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
  yellow: '#F59E0B',
  red: '#FF3366',
};

const statusColor = (status: string) =>
  ({
    draft: C.sub,
    pending: C.yellow,
    approved: C.green,
    rejected: C.red,
    completed: C.accent,
    cancelled: C.sub,
  }[status] || C.sub);

const statusLabel = (status: string) =>
  ({
    draft: 'Черновик',
    pending: 'Ожидает',
    approved: 'Одобрена',
    rejected: 'Отклонена',
    completed: 'Готова',
    cancelled: 'Отменена',
  }[status] || status);

export default function PurchaseRequestsScreen() {
  const { user, isElevatedUser, canApproveRequests, canCreatePurchaseRequests } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await purchaseRequestsApi.getAll(
        isElevatedUser || !user?.id ? {} : { created_by: user.id }
      );
      setItems(data || []);
    } catch (error) {
      console.error('Failed to load purchase requests:', error);
      setItems([]);
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [isElevatedUser, user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await purchaseRequestsApi.updateStatus(id, status);
      await load();
    } catch (error: any) {
      Alert.alert('Ошибка', error?.message || 'Не удалось обновить заявку');
    }
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
          <Text style={s.title}>Заявки</Text>
          <Text style={s.count}>{items.length}</Text>
        </View>
        {canCreatePurchaseRequests ? (
          <TouchableOpacity style={s.createBtn} onPress={() => router.push('/(app)/purchase-request/create' as any)}>
            <Text style={s.createBtnText}>+ Создать</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={s.empty}>Заявок нет</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() =>
              router.push({
                pathname: '/(app)/purchase-request/[id]',
                params: { id: item.id },
              } as any)
            }
          >
            <View style={s.row}>
              <Text style={s.cardTitle} numberOfLines={2}>
                {item.comment || `Заявка #${String(item.id).slice(0, 8)}`}
              </Text>
              <View style={[s.badge, { backgroundColor: statusColor(item.status) }]}>
                <Text style={s.badgeText}>{statusLabel(item.status)}</Text>
              </View>
            </View>

            {item.installation?.title || item.installation?.address ? (
              <Text style={s.sub}>Монтаж: {item.installation.title || item.installation.address}</Text>
            ) : null}

            {item.creator?.name || item.creator?.email ? (
              <Text style={s.sub}>Создал: {item.creator?.name || item.creator?.email}</Text>
            ) : null}

            {canApproveRequests && item.status === 'pending' ? (
              <View style={s.actions}>
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: C.green }]}
                  onPress={() => updateStatus(item.id, 'approved')}
                >
                  <Text style={s.actionBtnText}>Одобрить</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: C.red }]}
                  onPress={() => updateStatus(item.id, 'rejected')}
                >
                  <Text style={s.actionBtnText}>Отклонить</Text>
                </TouchableOpacity>
              </View>
            ) : null}
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
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { color: C.text, fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  sub: { color: C.sub, fontSize: 12, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  empty: { color: C.sub, textAlign: 'center', marginTop: 60, fontSize: 16 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});

