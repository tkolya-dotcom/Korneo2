import React, { useCallback, useEffect, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { chatsApi } from '@/src/lib/supabase';
import { getCachedTable, syncDatabaseInBackground } from '@/src/lib/offlineData';

const C = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  text: '#E0E0E0',
  sub: '#8892A0',
  border: 'rgba(0, 217, 255, 0.15)',
};

export default function ChatListScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatName, setNewChatName] = useState('');

  const loadChatsFromServer = useCallback(async () => {
    try {
      const data = await chatsApi.getAll();
      setChats(Array.isArray(data) ? data : []);
      void syncDatabaseInBackground(true);
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const cachedChats = await getCachedTable<any>('chats');
      if (cachedChats.length > 0) {
        setChats(cachedChats);
      }
      await loadChatsFromServer();
      setLoading(false);
    };

    void load();
  }, [loadChatsFromServer]);

  useFocusEffect(
    useCallback(() => {
      void loadChatsFromServer();
      return undefined;
    }, [loadChatsFromServer])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChatsFromServer();
    setRefreshing(false);
  };

  const createChat = async () => {
    if (!newChatName.trim()) {
      return;
    }
    try {
      const chat = await chatsApi.createChat(newChatName.trim(), 'group');
      setShowNewChat(false);
      setNewChatName('');
      router.push({ pathname: '/(app)/chat/[id]', params: { id: chat.id } } as any);
    } catch (error) {
      console.error('Ошибка создания чата:', error);
    }
  };

  const getInitials = (name: string) =>
    name?.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2) || '?';

  const formatTime = (date: string) => {
    const value = new Date(date);
    const diff = Date.now() - value.getTime();
    if (diff < 86400000) {
      return value.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    return value.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
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
        <Text style={s.title}>Чаты</Text>
        <TouchableOpacity onPress={() => setShowNewChat(true)}>
          <Text style={s.addIcon}>✏️</Text>
        </TouchableOpacity>
      </View>

      {showNewChat && (
        <View style={s.newChatBox}>
          <TextInput
            style={s.newChatInput}
            placeholder="Название чата"
            placeholderTextColor={C.sub}
            value={newChatName}
            onChangeText={setNewChatName}
            autoFocus
          />
          <TouchableOpacity style={s.createBtn} onPress={createChat}>
            <Text style={s.createBtnText}>Создать</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowNewChat(false)}>
            <Text style={s.cancelBtn}>Отмена</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={chats}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={s.empty}>Нет чатов</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.chatItem}
            onPress={() => router.push({ pathname: '/(app)/chat/[id]', params: { id: item.id } } as any)}
          >
            <View style={[s.avatar, item.type === 'group' && s.groupAvatar]}>
              <Text style={s.avatarText}>{getInitials(item.name)}</Text>
            </View>
            <View style={s.chatInfo}>
              <Text style={s.chatName} numberOfLines={1}>{item.name || 'Чат'}</Text>
              <Text style={s.chatType}>{item.type === 'group' ? 'Группа' : 'Личный'}</Text>
            </View>
            <Text style={s.chatTime}>{item.updated_at ? formatTime(item.updated_at) : ''}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50 },
  title: { color: C.accent, fontSize: 26, fontWeight: '700' },
  addIcon: { fontSize: 24 },
  newChatBox: { flexDirection: 'row', padding: 12, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  newChatInput: { flex: 1, backgroundColor: C.bg, color: C.text, borderRadius: 8, padding: 10, fontSize: 14 },
  createBtn: { backgroundColor: C.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginLeft: 8 },
  createBtnText: { color: C.bg, fontWeight: '600' },
  cancelBtn: { color: C.sub, paddingHorizontal: 12, paddingVertical: 10 },
  chatItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center' },
  groupAvatar: { backgroundColor: '#8B5CF6' },
  avatarText: { color: C.bg, fontSize: 16, fontWeight: '700' },
  chatInfo: { flex: 1, marginLeft: 12 },
  chatName: { color: C.text, fontSize: 15, fontWeight: '600' },
  chatType: { color: C.sub, fontSize: 12, marginTop: 2 },
  chatTime: { color: C.sub, fontSize: 11 },
  empty: { color: C.sub, textAlign: 'center', marginTop: 60, fontSize: 16 },
});
