import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { usersApi } from '@/src/lib/supabase';

const C = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  text: '#E0E0E0',
  sub: '#8892A0',
  border: 'rgba(0, 217, 255, 0.15)',
  danger: '#EF4444',
};

const roleLabelMap: Record<string, string> = {
  worker: 'Исполнитель',
  engineer: 'Инженер',
  manager: 'Руководитель',
  deputy_head: 'Зам. руководителя',
  admin: 'Администратор',
  support: 'Поддержка',
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
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
    <Text style={s.rowValue}>{value == null || value === '' ? '—' : String(value)}</Text>
  </View>
);

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, canViewUsers } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [draft, setDraft] = useState({
    name: '',
    phone: '',
    username: '',
    birthday: '',
  });

  const loadProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      return;
    }

    try {
      const byUserId = await usersApi.getById(String(user.id)).catch(() => null);
      if (byUserId) {
        setProfile(byUserId);
        return;
      }

      if (user.auth_user_id && user.auth_user_id !== user.id) {
        const byAuthUserId = await usersApi.getById(String(user.auth_user_id)).catch(() => null);
        if (byAuthUserId) {
          setProfile(byAuthUserId);
          return;
        }
      }

      setProfile(user as any);
    } catch (error) {
      console.error('Failed to load profile:', error);
      setProfile(user as any);
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    loadProfile().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [loadProfile]);

  useEffect(() => {
    const source = profile || (user as any) || null;
    setDraft({
      name: String(source?.name || ''),
      phone: String(source?.phone || ''),
      username: String(source?.username || ''),
      birthday: String(source?.birthday || ''),
    });
  }, [profile, user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const onSaveProfile = async () => {
    try {
      setSaving(true);
      const updated = await usersApi.updateProfile({
        name: draft.name,
        phone: draft.phone,
        username: draft.username,
        birthday: draft.birthday,
      });
      setProfile(updated as Record<string, any>);
      setEditing(false);
      Alert.alert('Готово', 'Профиль обновлен');
    } catch (error) {
      Alert.alert('Ошибка', error instanceof Error ? error.message : 'Не удалось сохранить профиль');
    } finally {
      setSaving(false);
    }
  };

  const onLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Ошибка', error instanceof Error ? error.message : 'Не удалось выйти');
    }
  };

  const roleLabel = useMemo(() => {
    const role = profile?.role || user?.role;
    return roleLabelMap[String(role || '')] || String(role || '—');
  }, [profile?.role, user?.role]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
      contentContainerStyle={s.content}
    >
      <Text style={s.title}>Профиль</Text>

      <View style={s.card}>
        <Text style={s.cardTitle}>Основная информация</Text>
        {editing ? (
          <View style={s.editField}>
            <Text style={s.rowLabel}>Имя</Text>
            <TextInput
              style={s.input}
              value={draft.name}
              onChangeText={(value) => setDraft((prev) => ({ ...prev, name: value }))}
              placeholder="Имя"
              placeholderTextColor={C.sub}
            />
          </View>
        ) : (
          <Row label="Имя" value={profile?.name || user?.name} />
        )}
        <Row label="Email" value={profile?.email || user?.email} />
        <Row label="Роль" value={roleLabel} />
        {editing ? (
          <View style={s.editField}>
            <Text style={s.rowLabel}>Телефон</Text>
            <TextInput
              style={s.input}
              value={draft.phone}
              onChangeText={(value) => setDraft((prev) => ({ ...prev, phone: value }))}
              placeholder="+7 ..."
              placeholderTextColor={C.sub}
            />
          </View>
        ) : (
          <Row label="Телефон" value={profile?.phone} />
        )}
        {editing ? (
          <View style={s.editField}>
            <Text style={s.rowLabel}>Логин</Text>
            <TextInput
              style={s.input}
              value={draft.username}
              onChangeText={(value) => setDraft((prev) => ({ ...prev, username: value }))}
              placeholder="username"
              placeholderTextColor={C.sub}
            />
          </View>
        ) : (
          <Row label="Логин" value={profile?.username} />
        )}
        {editing ? (
          <View style={s.editField}>
            <Text style={s.rowLabel}>Дата рождения</Text>
            <TextInput
              style={s.input}
              value={draft.birthday}
              onChangeText={(value) => setDraft((prev) => ({ ...prev, birthday: value }))}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={C.sub}
            />
          </View>
        ) : (
          <Row label="Дата рождения" value={profile?.birthday} />
        )}
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Системные данные</Text>
        <Row label="ID" value={profile?.id || user?.id} />
        <Row label="Auth ID" value={profile?.auth_user_id || user?.auth_user_id} />
        <Row label="Создан" value={formatDate(profile?.created_at || user?.created_at)} />
        <Row label="Последняя активность" value={formatDate(profile?.last_seen_at || user?.last_seen_at)} />
        <Row label="Статус" value={profile?.is_online ? 'Онлайн' : 'Оффлайн'} />
      </View>

      {editing ? (
        <View style={s.editActions}>
          <TouchableOpacity style={s.secondaryBtn} onPress={() => setEditing(false)} disabled={saving}>
            <Text style={s.secondaryBtnText}>Отменить</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.saveBtn, saving && s.saveBtnDisabled]}
            onPress={() => void onSaveProfile()}
            disabled={saving}
          >
            <Text style={s.saveBtnText}>{saving ? 'Сохраняем...' : 'Сохранить'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={s.secondaryBtn} onPress={() => setEditing(true)}>
          <Text style={s.secondaryBtnText}>Редактировать профиль</Text>
        </TouchableOpacity>
      )}

      {canViewUsers ? (
        <TouchableOpacity style={s.secondaryBtn} onPress={() => router.push('/(app)/users' as any)}>
          <Text style={s.secondaryBtnText}>Просмотр пользователей</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={s.logoutBtn} onPress={() => void onLogout()}>
        <Text style={s.logoutBtnText}>Выйти</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingTop: 24, paddingBottom: 30, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  title: { color: C.text, fontSize: 26, fontWeight: '700', marginBottom: 4 },
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
  editField: { gap: 6 },
  input: {
    backgroundColor: '#101421',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    color: C.text,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
  },
  editActions: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryBtnText: { color: C.accent, fontWeight: '700', fontSize: 13 },
  saveBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: 'rgba(0,217,255,0.18)',
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: C.accent, fontWeight: '700', fontSize: 13 },
  logoutBtn: {
    backgroundColor: 'rgba(239,68,68,0.16)',
    borderColor: 'rgba(239,68,68,0.45)',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  logoutBtnText: { color: C.danger, fontWeight: '700', fontSize: 13 },
});
