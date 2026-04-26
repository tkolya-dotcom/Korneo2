import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { commentsApi } from '@/src/lib/supabase';

// Cyberpunk theme
const C = { bg: '#0A0A0F', card: '#1A1A2E', accent: '#00D9FF', text: '#E0E0E0', sub: '#8892a0', border: 'rgba(0, 217, 255, 0.15)', green: '#00FF88' };

export default function TaskCommentsScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadComments();
    
    // Realtime subscription
    const channel = commentsApi.subscribe('task_comments', id as string, 'task', (newComment: any) => {
      // Load fresh data on new comment
      loadComments();
    });

    return () => {
      channel.unsubscribe();
    };
  }, [id]);

  const loadComments = async () => {
    try {
      const data = await commentsApi.getByTask(id as string, 'task');
      setComments(data || []);
    } catch (e) {
      console.error('Ошибка загрузки комментариев:', e);
    } finally {
      setLoading(false);
    }
  };

  const sendComment = async () => {
    if (!inputText.trim() || sending) return;
    
    setSending(true);
    try {
      await commentsApi.create(id as string, inputText.trim(), 'task');
      setInputText('');
      loadComments();
    } catch (e) {
      console.error('Ошибка отправки:', e);
    } finally {
      setSending(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('ru', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isOwn = (authorId: string) => authorId === user?.id;

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={C.accent} size="large" /></View>;
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Комментарии</Text>
        <Text style={s.count}>{comments.length}</Text>
      </View>

      <FlatList
        data={comments}
        keyExtractor={(item, index) => item.id || index.toString()}
        contentContainerStyle={s.list}
        ListEmptyComponent={<Text style={s.empty}>Комментариев нет</Text>}
        renderItem={({ item }) => (
          <View style={[s.comment, isOwn(item.author_id) && s.commentOwn]}>
            <View style={s.commentHeader}>
              <Text style={s.authorName}>{item.author?.name || item.author?.email?.split('@')[0] || 'Пользователь'}</Text>
              <Text style={s.commentDate}>{formatDate(item.created_at)}</Text>
            </View>
            <Text style={s.commentText}>{item.content}</Text>
          </View>
        )}
      />

      <View style={s.inputArea}>
        <TextInput
          style={s.input}
          placeholder="Написать комментарий..."
          placeholderTextColor={C.sub}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={[s.sendBtn, (!inputText.trim() || sending) && s.sendBtnDisabled]} 
          onPress={sendComment}
          disabled={!inputText.trim() || sending}
        >
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
  count: { color: C.sub, fontSize: 14 },
  list: { padding: 16, flexGrow: 1 },
  empty: { color: C.sub, textAlign: 'center', marginTop: 40 },
  comment: { backgroundColor: C.card, borderRadius: 12, padding: 12, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: C.accent },
  commentOwn: { borderLeftColor: C.green, backgroundColor: 'rgba(0, 255, 136, 0.1)' },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  authorName: { color: C.accent, fontSize: 12, fontWeight: '600' },
  commentDate: { color: C.sub, fontSize: 10 },
  commentText: { color: C.text, fontSize: 14, lineHeight: 20 },
  inputArea: { flexDirection: 'row', padding: 12, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: C.bg, color: C.text, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 80, borderWidth: 1, borderColor: C.border },
  sendBtn: { backgroundColor: C.accent, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendBtnDisabled: { backgroundColor: C.sub },
  sendBtnText: { color: C.bg, fontSize: 20, fontWeight: '700' },
});