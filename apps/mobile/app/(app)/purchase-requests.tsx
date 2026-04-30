import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { purchaseRequestsApi } from '@/src/lib/supabase';

const C = { bg: '#0f172a', card: '#1e293b', accent: '#02d7ff', text: '#e8f1ff', sub: '#9ab0c5', border: '#1e2a35', green: '#22c55e', yellow: '#f59e0b', orange: '#f97316', red: '#ef4444', purple: '#8b5cf6' };

const statusColor = (status: string) =>
  ({
    draft: C.sub,
    pending: C.yellow,
    approved: C.green,
    rejected: C.red,
    in_order: C.yellow,
    ready_for_receipt: C.accent,
    received: C.green,
    done: C.green,
    postponed: C.sub,
    completed: C.accent,
    cancelled: C.sub,
  }[status] || C.sub);

const statusLabel = (status: string) =>
  ({
    draft: 'Р§РµСЂРЅРѕРІРёРє',
    pending: 'РћР¶РёРґР°РµС‚',
    approved: 'РћРґРѕР±СЂРµРЅР°',
    rejected: 'РћС‚РєР»РѕРЅРµРЅР°',
    completed: 'Р“РѕС‚РѕРІР°',
    cancelled: 'РћС‚РјРµРЅРµРЅР°',
  }[status] || status);

export default function PurchaseRequestsScreen() {
  const { user, isManager } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await purchaseRequestsApi.getAll();
      setItems(data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const approve = async (id: string) => {
    try {
      await purchaseRequestsApi.updateStatus(id, 'approved');
      load();
    } catch (e: any) { Alert.alert('РћС€РёР±РєР°', e.message); }
  };

  const reject = async (id: string) => {
    try {
      await purchaseRequestsApi.updateStatus(id, 'rejected');
      load();
    } catch (e: any) { Alert.alert('РћС€РёР±РєР°', e.message); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={C.accent} size="large" /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Р—Р°СЏРІРєРё</Text>
        <Text style={s.count}>{items.length}</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={s.empty}>Р—Р°СЏРІРѕРє РЅРµС‚</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => router.push({ pathname: '/(app)/purchase-request/[id]', params: { id: item.id } } as any)}>
            <View style={s.row}>
              <Text style={s.cardTitle} numberOfLines={2}>{item.description || 'Р—Р°СЏРІРєР° #' + item.id.slice(0, 8)}</Text>
              <View style={[s.badge, { backgroundColor: statusColor(item.status) }]}>
                <Text style={s.badgeText}>{statusLabel(item.status)}</Text>
              </View>
            </View>
            {item.installation?.title && <Text style={s.sub}>рџ”§ {item.installation.title || item.installation.address}</Text>}
            {item.creator?.name && <Text style={s.sub}>рџ‘¤ {item.creator.name}</Text>}
            {isManager && item.status === 'pending' && (
              <View style={s.actions}>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.green }]} onPress={() => approve(item.id)}>
                  <Text style={s.actionBtnText}>РћРґРѕР±СЂРёС‚СЊ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: C.red }]} onPress={() => reject(item.id)}>
                  <Text style={s.actionBtnText}>РћС‚РєР»РѕРЅРёС‚СЊ</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 48 },
  title: { color: C.text, fontSize: 26, fontWeight: '700' },
  count: { color: C.sub, fontSize: 16 },
  card: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { color: C.text, fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  sub: { color: C.sub, fontSize: 12, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  empty: { color: C.sub, textAlign: 'center', marginTop: 60, fontSize: 16 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
});
