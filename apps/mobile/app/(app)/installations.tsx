import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { installationsApi } from '@/src/lib/supabase';

const C = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  text: '#E0E0E0',
  sub: '#8892a0',
  border: 'rgba(0, 217, 255, 0.15)',
};

const statusLabel = (status: string) =>
  ({
    new: 'Новый',
    planned: 'Запланирован',
    in_progress: 'В работе',
    waiting_materials: 'Ждет материалы',
    in_order: 'В заказе',
    ready_for_receipt: 'Готов к получению',
    received: 'Получено',
    done: 'Завершен',
    postponed: 'Отложен',
  }[status] || status);

const statusColor = (status: string) =>
  ({
    new: '#3399ff',
    planned: '#00D9FF',
    in_progress: '#F59E0B',
    waiting_materials: '#FF6B00',
    in_order: '#B983FF',
    ready_for_receipt: '#FFD166',
    received: '#7BD389',
    done: '#00FF88',
    postponed: '#8892a0',
  }[status] || C.sub);

export default function InstallationsScreen() {
  const { user, isElevatedUser, canCreateInstallations } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const filters: Record<string, string> | undefined =
        isElevatedUser || !user?.id
          ? undefined
          : { assignee_id: user.id };
      const data = await installationsApi.getAll(filters);
      setItems(data || []);
    } catch (error) {
      console.error('Failed to load installations:', error);
      setItems([]);
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [isElevatedUser, user?.id]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return items;
    }

    return items.filter((item) => {
      const haystack = [item.title, item.address, item.project?.name, item.assignee?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [items, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
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
          <Text style={s.title}>Монтажи</Text>
          <Text style={s.count}>{filtered.length}</Text>
        </View>
        {canCreateInstallations ? (
          <TouchableOpacity style={s.createBtn} onPress={() => router.push('/(app)/installation/create' as any)}>
            <Text style={s.createBtnText}>+ Создать</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <TextInput
        style={s.search}
        placeholder="Поиск по монтажам"
        placeholderTextColor={C.sub}
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={s.empty}>Монтажей нет</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() =>
              router.push({
                pathname: '/(app)/installation/[id]',
                params: { id: item.id },
              } as any)
            }
          >
            <View style={s.row}>
              <Text style={s.cardTitle}>{item.title || item.address || 'Монтаж'}</Text>
              <View style={[s.badge, { backgroundColor: statusColor(item.status) }]}>
                <Text style={s.badgeText}>{statusLabel(item.status)}</Text>
              </View>
            </View>
            <Text style={s.sub}>{item.project?.name || 'Без проекта'}</Text>
            {item.address ? <Text style={s.sub}>Адрес: {item.address}</Text> : null}
            {item.assignee?.name ? <Text style={s.sub}>Исполнитель: {item.assignee.name}</Text> : null}
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  search: {
    backgroundColor: C.card,
    color: C.text,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { color: C.text, fontSize: 14, fontWeight: '600', flex: 1, marginRight: 10 },
  sub: { color: C.sub, fontSize: 12, marginTop: 5 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { color: '#081018', fontSize: 10, fontWeight: '700' },
  empty: { color: C.sub, textAlign: 'center', marginTop: 60, fontSize: 16 },
});
