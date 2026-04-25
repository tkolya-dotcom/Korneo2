import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/src/providers/AuthProvider';
import { sitesApi } from '@/src/lib/supabase';

const C = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  text: '#E0E0E0',
  sub: '#8892A0',
  border: 'rgba(0, 217, 255, 0.15)',
  green: '#00D9FF',
  red: '#EF4444',
  warning: '#F59E0B',
};

const RU = {
  title: '\u041f\u043b\u043e\u0449\u0430\u0434\u043a\u0438',
  all: '\u0412\u0441\u0435',
  active: '\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0435',
  inactive: '\u041d\u0435\u0430\u043a\u0442\u0438\u0432\u043d\u044b\u0435',
  search:
    '\u041f\u043e\u0438\u0441\u043a \u043f\u043e \u0430\u0434\u0440\u0435\u0441\u0443, \u043a\u043e\u0434\u0443, \u0440\u0430\u0439\u043e\u043d\u0443',
  notFound: '\u041f\u043b\u043e\u0449\u0430\u0434\u043a\u0438 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b',
  noAddress: '\u041f\u043b\u043e\u0449\u0430\u0434\u043a\u0430',
  emptyDash: '\u2014',
  sync: '\u21bb \u0421\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u043e\u0432\u0430\u0442\u044c',
  syncing: '\u23f3 \u0421\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u0430\u0446\u0438\u044f...',
  syncDone: '\u0421\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u0430\u0446\u0438\u044f',
  syncedOk: '\u0421\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u0438\u0440\u043e\u0432\u0430\u043d\u043e',
  syncedErrors: '\u041e\u0448\u0438\u0431\u043e\u043a',
  loadError: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043f\u043b\u043e\u0449\u0430\u0434\u043a\u0438',
  lastSync: '\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u044f\u044f \u0441\u0438\u043d\u0445\u0440\u043e\u043d\u0438\u0437\u0430\u0446\u0438\u044f',
};

const toMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

const formatSyncMoment = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const isActiveStatus = (status: string) => {
  const normalizedStatus = String(status || '').toLowerCase();
  return (
    normalizedStatus.includes('\u0430\u043a\u0442\u0438\u0432') ||
    normalizedStatus.includes('active') ||
    normalizedStatus.includes('online') ||
    normalizedStatus.includes('\u0440\u0430\u0431\u043e\u0442')
  );
};

export default function SitesScreen() {
  const router = useRouter();
  const { isManagerOrHigher, canViewSites } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!canViewSites) {
      setItems([]);
      setErrorMessage(null);
      return;
    }

    try {
      setErrorMessage(null);
      const data = await sitesApi.getAll();
      setItems(data || []);
    } catch (error) {
      console.error('Failed to load sites:', error);
      setItems([]);
      setErrorMessage(toMessage(error, RU.loadError));
    }
  }, [canViewSites]);

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

  const onSyncNow = async () => {
    if (!isManagerOrHigher || syncing) {
      return;
    }

    try {
      setSyncing(true);
      const syncResult = await sitesApi.syncNow();
      const details = Array.isArray(syncResult.results) ? syncResult.results : [];
      const errors = details.filter((item) => item?.status === 'error');
      Alert.alert(
        RU.syncDone,
        `${RU.syncedOk}: ${syncResult.synced ?? 0}\n${RU.syncedErrors}: ${errors.length}`
      );
      await load();
    } catch (error) {
      Alert.alert('\u041e\u0448\u0438\u0431\u043a\u0430', toMessage(error, RU.loadError));
    } finally {
      setSyncing(false);
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((site) => {
      const haystack = [
        site.address,
        site.name,
        site.emts_code,
        site.emts_id,
        site.district,
        site.type,
        site.segment,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [items, search]);

  const filteredByStatus = useMemo(() => {
    return filtered.filter((site) => {
      if (statusFilter === 'all') return true;
      const active = isActiveStatus(site.status);
      return statusFilter === 'active' ? active : !active;
    });
  }, [filtered, statusFilter]);

  const totalActive = useMemo(
    () => filteredByStatus.filter((site) => isActiveStatus(site.status)).length,
    [filteredByStatus]
  );

  const lastSyncedAt = useMemo(() => {
    const values = items
      .map((site) => site.synced_at)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return formatSyncMoment(values[0]);
  }, [items]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (!canViewSites) {
    return (
      <View style={s.center}>
        <Text style={s.empty}>Недостаточно прав для просмотра площадок</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{RU.title}</Text>
        <Text style={s.count}>{filteredByStatus.length}</Text>
      </View>

      <View style={s.metaRow}>
        <Text style={s.metaStat}>
          {RU.active}: {totalActive}
        </Text>
        <Text style={s.metaStat}>
          {RU.inactive}: {Math.max(0, filteredByStatus.length - totalActive)}
        </Text>
      </View>

      {lastSyncedAt ? <Text style={s.lastSync}>{RU.lastSync}: {lastSyncedAt}</Text> : null}

      {isManagerOrHigher ? (
        <TouchableOpacity
          style={[s.syncBtn, syncing && s.syncBtnDisabled]}
          onPress={() => {
            void onSyncNow();
          }}
          disabled={syncing}
        >
          <Text style={s.syncBtnText}>{syncing ? RU.syncing : RU.sync}</Text>
        </TouchableOpacity>
      ) : null}

      <TextInput
        style={s.search}
        value={search}
        onChangeText={setSearch}
        placeholder={RU.search}
        placeholderTextColor={C.sub}
      />

      <View style={s.filterRow}>
        <TouchableOpacity
          style={[s.filterChip, statusFilter === 'all' && s.filterChipActive]}
          onPress={() => setStatusFilter('all')}
        >
          <Text style={[s.filterText, statusFilter === 'all' && s.filterTextActive]}>{RU.all}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.filterChip, statusFilter === 'active' && s.filterChipActive]}
          onPress={() => setStatusFilter('active')}
        >
          <Text style={[s.filterText, statusFilter === 'active' && s.filterTextActive]}>
            {RU.active}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.filterChip, statusFilter === 'inactive' && s.filterChipActive]}
          onPress={() => setStatusFilter('inactive')}
        >
          <Text style={[s.filterText, statusFilter === 'inactive' && s.filterTextActive]}>
            {RU.inactive}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredByStatus}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
        }
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Text style={s.empty}>{RU.notFound}</Text>
            {errorMessage ? <Text style={s.error}>{errorMessage}</Text> : null}
          </View>
        }
        renderItem={({ item }) => {
          const status = item.status || RU.emptyDash;
          const active = isActiveStatus(status);

          return (
            <TouchableOpacity
              style={s.card}
              onPress={() =>
                router.push({
                  pathname: '/(app)/site/[id]',
                  params: { id: item.id },
                } as any)
              }
            >
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle} numberOfLines={2}>
                    {item.address || item.name || RU.noAddress}
                  </Text>
                  <Text style={s.sub}>
                    {item.emts_code ? `[${item.emts_code}] ` : ''}
                    {item.type || RU.emptyDash} {'\u2022'} {item.segment || RU.emptyDash} {'\u2022'}{' '}
                    {item.district || RU.emptyDash}
                  </Text>
                </View>
                <Text style={[s.status, { color: active ? C.green : C.red }]}>{status}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
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
  metaRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: -4, marginBottom: 6 },
  metaStat: { color: C.sub, fontSize: 11 },
  lastSync: { color: C.sub, fontSize: 11, paddingHorizontal: 20, marginBottom: 8 },
  syncBtn: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: 'rgba(0,217,255,0.15)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  syncBtnDisabled: { opacity: 0.7 },
  syncBtnText: { color: C.accent, fontSize: 13, fontWeight: '700' },
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
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 4 },
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
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { color: C.text, fontSize: 14, fontWeight: '600' },
  sub: { color: C.sub, fontSize: 11, marginTop: 5 },
  status: { fontSize: 11, fontWeight: '700', marginLeft: 8, maxWidth: 92, textAlign: 'right' },
  emptyWrap: { marginTop: 30, alignItems: 'center' },
  empty: { color: C.sub, textAlign: 'center', marginTop: 30, fontSize: 16 },
  error: { color: C.warning, textAlign: 'center', marginTop: 8, fontSize: 12, paddingHorizontal: 16 },
});
