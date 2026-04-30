import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { chatsApi } from '@/src/lib/supabase';

// Cyberpunk theme
const C = { bg: '#0A0A0F', card: '#1A1A2E', accent: '#00D9FF', text: '#E0E0E0', sub: '#8892a0', border: 'rgba(0, 217, 255, 0.15)', purple: '#8B5CF6' };

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatName, setChatName] = useState('');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadChat();
    // Realtime подписка
    const channel = chatsApi.subscribeToMessages(id as string, (msg: any) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [id]);

  const loadChat = async () => {
    try {
      const msgs = await chatsApi.getMessages(id as string);
      setMessages(msgs || []);
      if (msgs?.length > 0) {
        // Пытаемся получить название чата
        setChatName('Чат');
      }
    } catch (e) {
      console.error('Ошибка загрузки:', e);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || sending) return;
    
    setSending(true);
    try {
      const msg = await chatsApi.sendMessage(id as string, inputText.trim());
      setMessages(prev => [...prev, msg]);
      setInputText('');
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    } catch (e) {
      console.error('Ошибка отправки:', e);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  };

  const isOwn = (senderId: string) => senderId === user?.id;

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={C.accent} size="large" /></View>;
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{chatName || 'Чат'}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => item.id || index.toString()}
        contentContainerStyle={s.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListEmptyComponent={<Text style={s.empty}>Нет сообщений</Text>}
        renderItem={({ item }) => (
          <View style={[s.message, isOwn(item.sender_id) && s.messageOwn]}>
            {!isOwn(item.sender_id) && (
              <Text style={s.senderName}>{item.sender?.name || item.sender?.email?.split('@')[0] || 'Пользователь'}</Text>
            )}
            <Text style={[s.messageText, isOwn(item.sender_id) && s.messageTextOwn]}>{item.content}</Text>
            <Text style={[s.messageTime, isOwn(item.sender_id) && s.messageTimeOwn]}>{formatTime(item.created_at)}</Text>
          </View>
        )}
      />

      <View style={s.inputArea}>
        <TextInput
          style={s.input}
          placeholder="Сообщение..."
          placeholderTextColor={C.sub}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity style={[s.sendBtn, (!inputText.trim() || sending) && s.sendBtnDisabled]} onPress={sendMessage} disabled={!inputText.trim() || sending}>
          <Text style={s.sendBtnText}>→</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { color: C.accent, fontSize: 24, marginRight: 16 },
  headerTitle: { color: C.text, fontSize: 18, fontWeight: '600', flex: 1 },
  messagesList: { padding: 16, flexGrow: 1 },
  empty: { color: C.sub, textAlign: 'center', marginTop: 40 },
  message: { maxWidth: '75%', backgroundColor: C.card, borderRadius: 16, borderBottomLeftRadius: 4, padding: 12, marginBottom: 8, alignSelf: 'flex-start' },
  messageOwn: { backgroundColor: C.purple, borderBottomLeftRadius: 16, borderBottomRightRadius: 4, alignSelf: 'flex-end' },
  senderName: { color: C.accent, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  messageText: { color: C.text, fontSize: 15, lineHeight: 20 },
  messageTextOwn: { color: '#fff' },
  messageTime: { color: C.sub, fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  messageTimeOwn: { color: 'rgba(255,255,255,0.6)' },
  inputArea: { flexDirection: 'row', padding: 12, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: C.bg, color: C.text, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn: { backgroundColor: C.accent, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendBtnDisabled: { backgroundColor: C.sub },
  sendBtnText: { color: C.bg, fontSize: 20, fontWeight: '700' },
});