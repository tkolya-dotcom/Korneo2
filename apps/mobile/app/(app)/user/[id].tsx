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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { chatApi, usersApi } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';

const C = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  text: '#E0E0E0',
  sub: '#8892A0',
  border: 'rgba(0, 217, 255, 0.15)',
  green: '#00FF88',
};

const roleLabelMap: Record<string, string> = {
  worker: '\u0418\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c',
  engineer: '\u0418\u043d\u0436\u0435\u043d\u0435\u0440',
  manager: '\u0420\u0443\u043a\u043e\u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044c',
  deputy_head: '\u0417\u0430\u043c. \u0440\u0443\u043a\u043e\u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044f',
  admin: '\u0410\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440',
  support: '\u041f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430',
};

const formatDate = (value?: string | null) => {
  if (!value) return '\u2014';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const Row = ({ label, value }: { label: string; value?: string | number | null }) => (
  <View style={s.row}>
    <Text style={s.rowLabel}>{label}</Text>
    <Text style={s.rowValue}>{value == null || value === '' ? '\u2014' : String(value)}</Text>
  </View>
);

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyChat, setBusyChat] = useState(false);
  const [profile, setProfile] = useState<Record<string, any> | null>(null);

  const loadProfile = useCallback(async () => {
    const targetId = String(id || '').trim();
    if (!targetId) {
      setProfile(null);
      return;
    }

    try {
      const direct = await usersApi.getById(targetId).catch(() => null);
      if (direct) {
        setProfile(direct);
        return;
      }

      const users = await usersApi.getAll().catch(() => []);
      const fallback = (users || []).find((item: any) => String(item.id) === targetId) || null;
      setProfile(fallback);
    } catch (error) {
      console.error('Failed to load external profile:', error);
      setProfile(null);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    loadProfile().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [loadProfile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const openPrivateChat = async () => {
    const targetId = String(profile?.id || '').trim();
    if (!targetId) return;
    if (user?.id && String(user.id) === targetId) {
      router.replace('/(app)/profile' as any);
      return;
    }

    try {
      setBusyChat(true);
      const chatId = await chatApi.openPrivateChat(targetId);
      router.push({
        pathname: '/(app)/chat/[id]',
        params: {
          id: chatId,
          name: profile?.name || '\u0427\u0430\u0442',
          members_count: '2',
        },
      } as any);
    } catch (error) {
      Alert.alert(
        '\u041e\u0448\u0438\u0431\u043a\u0430',
        error instanceof Error ? error.message : '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u0447\u0430\u0442'
      );
    } finally {
      setBusyChat(false);
    }
  };

  const roleLabel = useMemo(() => {
    const role = profile?.role;
    return roleLabelMap[String(role || '')] || String(role || '\u2014');
  }, [profile?.role]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={s.center}>
        <Text style={s.empty}>{'\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d'}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
      contentContainerStyle={s.content}
    >
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>\u2190</Text>
        </TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>
          {'\u041f\u0440\u043e\u0444\u0438\u043b\u044c \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f'}
        </Text>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>{'\u041e\u0441\u043d\u043e\u0432\u043d\u0430\u044f \u0438\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0438\u044f'}</Text>
        <Row label={'\u0418\u043c\u044f'} value={profile?.name} />
        <Row label={'Email'} value={profile?.email} />
        <Row label={'\u0420\u043e\u043b\u044c'} value={roleLabel} />
        <Row label={'\u0422\u0435\u043b\u0435\u0444\u043e\u043d'} value={profile?.phone} />
        <Row label={'\u041b\u043e\u0433\u0438\u043d'} value={profile?.username} />
        <Row label={'\u0414\u0430\u0442\u0430 \u0440\u043e\u0436\u0434\u0435\u043d\u0438\u044f'} value={profile?.birthday} />
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>{'\u0421\u0438\u0441\u0442\u0435\u043c\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435'}</Text>
        <Row label={'ID'} value={profile?.id} />
        <Row label={'Auth ID'} value={profile?.auth_user_id} />
        <Row label={'\u0421\u043e\u0437\u0434\u0430\u043d'} value={formatDate(profile?.created_at)} />
        <Row label={'\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u044f\u044f \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0441\u0442\u044c'} value={formatDate(profile?.last_seen_at)} />
        <Row
          label={'\u0421\u0442\u0430\u0442\u0443\u0441'}
          value={profile?.is_online ? '\u041e\u043d\u043b\u0430\u0439\u043d' : '\u041e\u0444\u0444\u043b\u0430\u0439\u043d'}
        />
      </View>

      {user?.id && String(user.id) !== String(profile?.id) ? (
        <TouchableOpacity style={s.chatBtn} onPress={() => void openPrivateChat()} disabled={busyChat}>
          <Text style={s.chatBtnText}>
            {busyChat
              ? '\u041e\u0442\u043a\u0440\u044b\u0432\u0430\u0435\u043c...'
              : '\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043b\u0438\u0447\u043d\u044b\u0439 \u0447\u0430\u0442'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingTop: 18, paddingBottom: 30, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  empty: { color: C.sub, fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.card,
  },
  backBtnText: { color: C.accent, fontSize: 16, fontWeight: '700' },
  title: { color: C.text, fontSize: 20, fontWeight: '700', flex: 1 },
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    gap: 8,
  },
  cardTitle: { color: C.accent, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 8,
    gap: 2,
  },
  rowLabel: { color: C.sub, fontSize: 11, textTransform: 'uppercase' },
  rowValue: { color: C.text, fontSize: 14, fontWeight: '600' },
  chatBtn: {
    backgroundColor: 'rgba(0,217,255,0.2)',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  chatBtnText: { color: C.green, fontWeight: '700', fontSize: 13 },
});
