import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

const statuses = ['new', 'planned', 'in_progress', 'waiting_materials', 'in_order', 'ready_for_receipt', 'received', 'done', 'postponed'];

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

export default function InstallationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isManager } = useAuth();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    installationsApi.getById(id).then(setItem).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (status: string) => {
    setSaving(true);
    try {
      const updated = await installationsApi.update(id, { status });
      setItem((current: any) => ({ ...current, ...updated }));
    } catch (error: any) {
      Alert.alert('Ошибка', error.message || 'Не удалось обновить монтаж');
    } finally {
      setSaving(false);
    }
  };

  const openStatusMenu = () => {
    Alert.alert(
      'Сменить статус',
      'Выберите новое состояние монтажа',
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
        <Text style={s.sub}>Монтаж не найден</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.container}>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backText}>← Назад</Text>
      </TouchableOpacity>

      <View style={s.card}>
        <Text style={s.title}>{item.title || item.address || 'Монтаж'}</Text>
        {item.address && <Text style={s.description}>Адрес: {item.address}</Text>}
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>Информация</Text>
        <View style={s.row}><Text style={s.label}>Статус</Text><Text style={s.value}>{statusLabel(item.status)}</Text></View>
        <View style={s.row}><Text style={s.label}>Проект</Text><Text style={s.value}>{item.project?.name || '-'}</Text></View>
        <View style={s.row}><Text style={s.label}>Исполнитель</Text><Text style={s.value}>{item.assignee?.name || '-'}</Text></View>
        <View style={s.row}><Text style={s.label}>Дата</Text><Text style={s.value}>{item.scheduled_at ? new Date(item.scheduled_at).toLocaleDateString('ru-RU') : '-'}</Text></View>
      </View>

      <View style={s.card}>
        <View style={s.actionRow}>
          <TouchableOpacity
            style={s.secondaryBtn}
            onPress={() => router.push({ pathname: '/(app)/installation/[id]/comments', params: { id } } as any)}
          >
            <Text style={s.secondaryBtnText}>Комментарии</Text>
          </TouchableOpacity>
        </View>
      </View>

      {item.purchase_requests?.length > 0 && (
        <View style={s.card}>
          <Text style={s.sectionTitle}>Связанные заявки</Text>
          {item.purchase_requests.map((request: any) => (
            <TouchableOpacity
              key={request.id}
              style={s.linkItem}
              onPress={() =>
                router.push({
                  pathname: '/(app)/purchase-request/[id]',
                  params: { id: request.id },
                } as any)
              }
            >
              <Text style={s.linkTitle}>{request.comment || `Заявка #${request.id.slice(0, 8)}`}</Text>
              <Text style={s.linkSub}>{statusLabel(request.status)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isManager && (
        <View style={s.card}>
          <Text style={s.sectionTitle}>Сменить статус</Text>
          <TouchableOpacity style={s.statusSelectBtn} onPress={openStatusMenu} disabled={saving}>
            <Text style={s.statusSelectText}>
              {saving ? 'Сохраняем...' : `${statusLabel(item.status)} ▾`}
            </Text>
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
  description: { color: C.sub, fontSize: 14, lineHeight: 20, marginTop: 8 },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: '600', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 },
  label: { color: C.sub, fontSize: 13 },
  value: { color: C.text, fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right' },
  sub: { color: C.sub, fontSize: 14 },
  actionRow: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: C.accent, fontWeight: '600' },
  linkItem: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 12,
    marginTop: 12,
  },
  linkTitle: { color: C.text, fontSize: 14, fontWeight: '600' },
  linkSub: { color: C.sub, fontSize: 12, marginTop: 4 },
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

