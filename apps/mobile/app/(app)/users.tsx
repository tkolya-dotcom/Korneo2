import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { usersApi } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';

const C = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  text: '#E0E0E0',
  sub: '#8892a0',
  border: 'rgba(0, 217, 255, 0.15)',
  green: '#00FF88',
  red: '#EF4444',
};

type Filter = 'all' | 'online' | 'offline';

const roleLabelMap: Record<string, string> = {
  worker: '\u0418\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c',
  engineer: '\u0418\u043d\u0436\u0435\u043d\u0435\u0440',
  manager: '\u0420\u0443\u043a\u043e\u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044c',
  deputy_head: '\u0417\u0430\u043c. \u0440\u0443\u043a\u043e\u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044f',
  admin: '\u0410\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440',
  support: '\u041f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430',
};

const formatLastSeen = (value?: string | null) => {
  if (!value) return '\u043d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function UsersScreen() {
  const router = useRouter();
  const { canViewUsers } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [items, setItems] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const users = await usersApi.getAll();
      setItems(users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  useEffect(() => {
    let active = true;
    load().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return undefined;
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((user) => {
      if (filter === 'online' && !user.is_online) return false;
      if (filter === 'offline' && user.is_online) return false;
      if (!query) return true;
      const haystack = [user.name, user.email, user.role].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [filter, items, search]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (!canViewUsers) {
    return (
      <View style={s.center}>
        <Text style={s.empty}>
          {'\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u043f\u0440\u0430\u0432 \u0434\u043b\u044f \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440\u0430 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435\u0439'}
        </Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{'\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0438'}</Text>
        <Text style={s.count}>{filtered.length}</Text>
      </View>

      <TextInput
        style={s.search}
        value={search}
        onChangeText={setSearch}
        placeholder={'\u041f\u043e\u0438\u0441\u043a \u043f\u043e \u0438\u043c\u0435\u043d\u0438, email, \u0440\u043e\u043b\u0438'}
        placeholderTextColor={C.sub}
      />

      <View style={s.filterRow}>
        {[
          ['all', '\u0412\u0441\u0435'],
          ['online', '\u041e\u043d\u043b\u0430\u0439\u043d'],
          ['offline', '\u041e\u0444\u0444\u043b\u0430\u0439\u043d'],
        ].map(([id, label]) => {
          const active = filter === id;
          return (
            <TouchableOpacity
              key={id}
              style={[s.filterChip, active && s.filterChipActive]}
              onPress={() => setFilter(id as Filter)}
            >
              <Text style={[s.filterText, active && s.filterTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={s.empty}>{'\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0438 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b'}</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() =>
              router.push({
                pathname: '/(app)/user/[id]',
                params: { id: String(item.id) },
              } as any)
            }
          >
            <View style={s.row}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{(item.name || item.email || '?').slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.name || '\u0411\u0435\u0437 \u0438\u043c\u0435\u043d\u0438'}</Text>
                <Text style={s.meta}>{item.email || 'email \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d'}</Text>
                <Text style={s.meta}>
                  {'\u0420\u043e\u043b\u044c'}: {roleLabelMap[item.role] || item.role || '\u2014'}
                </Text>
                <Text style={s.meta}>
                  {'\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u044f\u044f \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c'}: {formatLastSeen(item.last_seen_at)}
                </Text>
              </View>
              <View style={s.statusWrap}>
                <View style={[s.dot, { backgroundColor: item.is_online ? C.green : C.red }]} />
                <Text style={s.statusText}>
                  {item.is_online ? '\u041e\u043d\u043b\u0430\u0439\u043d' : '\u041e\u0444\u0444\u043b\u0430\u0439\u043d'}
                </Text>
              </View>
            </View>
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
  count: { color: C.sub, fontSize: 16 },
  search: {
    backgroundColor: C.card,
    color: C.text,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 6 },
  filterChip: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipActive: { borderColor: C.accent, backgroundColor: 'rgba(0,217,255,0.15)' },
  filterText: { color: C.sub, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: C.accent },
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,217,255,0.14)',
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: C.accent, fontWeight: '700' },
  name: { color: C.text, fontSize: 14, fontWeight: '700' },
  meta: { color: C.sub, fontSize: 11, marginTop: 3 },
  statusWrap: { alignItems: 'center', gap: 4, minWidth: 56 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { color: C.sub, fontSize: 10, fontWeight: '600' },
  empty: { color: C.sub, textAlign: 'center', marginTop: 60, fontSize: 16 },
});
