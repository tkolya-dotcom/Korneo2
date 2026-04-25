import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { avrApi } from '@/src/lib/supabase';

const C = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  text: '#E0E0E0',
  sub: '#8892a0',
  border: 'rgba(0, 217, 255, 0.15)',
};

const statuses = ['new', 'planned', 'in_progress', 'completed', 'cancelled'] as const;

const statusLabel = (status: string) =>
  ({
    new: 'Новая',
    planned: 'Запланирована',
    in_progress: 'В работе',
    completed: 'Выполнена',
    cancelled: 'Отменена',
  }[status] || status);

const typeLabel = (type: string) =>
  ({
    AVR: 'АВР',
    NRD: 'НРД',
    TECH_TASK: 'Тех. задача',
  }[type] || type || 'Заявка');

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU');
};

export default function AvrDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isManagerOrHigher } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [item, setItem] = useState<any | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await avrApi.getById(id);
      setItem(data);
    } catch (error) {
      console.error('Failed to load avr detail:', error);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    load().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const canEditStatus = useMemo(() => {
    if (!item || !user?.id) return false;
    return isManagerOrHigher || item.executor_id === user.id || item.assignee_id === user.id;
  }, [isManagerOrHigher, item, user?.id]);

  const updateStatus = async (status: string) => {
    if (!id || updating) return;
    setUpdating(status);
    try {
      await avrApi.updateStatus(id, status);
      await load();
    } catch (error) {
      console.error('Failed to update AVR status:', error);
    } finally {
      setUpdating(null);
    }
  };

  const openStatusMenu = () => {
    if (!item) return;
    Alert.alert(
      'Сменить статус',
      'Выберите новое состояние заявки',
      [
        ...statuses.map((status) => ({
          text: statusLabel(status),
          onPress: () => {
            if (item.status !== status) {
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

  if (!item) {
    return (
      <View style={s.center}>
        <Text style={s.empty}>Заявка не найдена</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
      contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 26 }}
    >
      <View style={s.card}>
        <Text style={s.title}>
          {item.short_id ? `#${String(item.short_id).padStart(4, '0')} ` : ''}
          {item.title}
        </Text>
        <Text style={s.meta}>{typeLabel(item.type)}</Text>
        <Text style={s.meta}>Статус: {statusLabel(item.status)}</Text>
        {item.address_text ? <Text style={s.meta}>📍 {item.address_text}</Text> : null}
        {item.executor?.name ? <Text style={s.meta}>👷 {item.executor.name}</Text> : null}
        {item.project?.name ? <Text style={s.meta}>📁 {item.project.name}</Text> : null}
        {item.date_from || item.date_to ? (
          <Text style={s.meta}>
            📅 {formatDate(item.date_from)} — {formatDate(item.date_to)}
          </Text>
        ) : null}
      </View>

      {item.description ? (
        <View style={s.card}>
          <Text style={s.sectionTitle}>Описание</Text>
          <Text style={s.description}>{item.description}</Text>
        </View>
      ) : null}

      {canEditStatus ? (
        <View style={s.card}>
          <Text style={s.sectionTitle}>Смена статуса</Text>
          <TouchableOpacity style={s.statusSelectBtn} onPress={openStatusMenu} disabled={Boolean(updating)}>
            <Text style={s.statusSelectText}>
              {updating ? 'Сохраняем...' : `${statusLabel(item.status)} ▾`}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={s.card}>
        <Text style={s.sectionTitle}>Заявки на материалы</Text>
        {(item.purchase_requests || []).length === 0 ? (
          <Text style={s.meta}>Нет заявок</Text>
        ) : (
          item.purchase_requests.map((request: any) => (
            <View key={request.id} style={s.prRow}>
              <Text style={s.prText}>
                {(request.short_id || String(request.id).slice(0, 8))} • {request.status}
              </Text>
              <Text style={s.prSub}>
                {request.creator?.name || request.creator?.email || 'Пользователь'}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  empty: { color: C.sub, fontSize: 16 },
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
  },
  title: { color: C.text, fontSize: 18, fontWeight: '700' },
  meta: { color: C.sub, fontSize: 12, marginTop: 6 },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  description: { color: C.text, fontSize: 14, lineHeight: 20 },
  statusSelectBtn: {
    borderWidth: 1,
    borderColor: C.accent,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,217,255,0.14)',
    alignItems: 'center',
  },
  statusSelectText: { color: C.accent, fontSize: 13, fontWeight: '700' },
  prRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 8,
    marginTop: 8,
  },
  prText: { color: C.text, fontSize: 13, fontWeight: '600' },
  prSub: { color: C.sub, fontSize: 11, marginTop: 3 },
});

