import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/src/lib/supabase';

const COLORS = { bg: '#0f172a', card: '#1e293b', accent: '#02d7ff', text: '#e8f1ff', sub: '#9ab0c5', border: '#1e2a35' };

type Comment = {
  id: string;
  content: string;
  sender_id: string;
  sender?: { name: string; email: string };
  created_at: string;
};

export default function TaskCommentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadComments();
    const subscription = supabase
      .channel(`task-comments-${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_comments',
        filter: `task_id=eq.${id}`
      }, () => loadComments())
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, [id]);

  const loadComments = async () => {
    try {
      const { data } = await supabase
        .from('task_comments')
        .select('*, sender:sender_id(name, email)')
        .eq('task_id', id)
        .order('created_at', { ascending: true });
      setComments(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const sendComment = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('task_comments').insert({
        task_id: id,
        sender_id: user?.id,
        content: newComment.trim()
      });
      setNewComment('');
      loadComments();
    } catch (e: any) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('ru') + ' ' + d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>← Назад</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Комментарии</Text>

      <FlatList
        data={comments}
        keyExtractor={item => item.id}
        style={styles.list}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={styles.empty}>Комментариев пока нет</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.commentCard}>
            <View style={styles.commentHeader}>
              <Text style={styles.commentAuthor}>{item.sender?.name || item.sender?.email || 'Неизвестный'}</Text>
              <Text style={styles.commentDate}>{formatDate(item.created_at)}</Text>
            </View>
            <Text style={styles.commentContent}>{item.content}</Text>
          </View>
        )}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Написать комментарий..."
          placeholderTextColor={COLORS.sub}
          value={newComment}
          onChangeText={setNewComment}
          multiline
        />
        <TouchableOpacity style={[styles.sendBtn, sending && styles.sendBtnDisabled]} onPress={sendComment} disabled={sending}>
          <Text style={styles.sendText}>→</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  backBtn: { padding: 16, paddingTop: 48 },
  backText: { color: COLORS.accent, fontSize: 16 },
  title: { color: COLORS.text, fontSize: 24, fontWeight: '700', paddingHorizontal: 16 },
  list: { flex: 1 },
  empty: { color: COLORS.sub, textAlign: 'center', marginTop: 40, fontSize: 14 },
  commentCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  commentAuthor: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
  commentDate: { color: COLORS.sub, fontSize: 11 },
  commentContent: { color: COLORS.text, fontSize: 14, lineHeight: 20 },
  inputContainer: { flexDirection: 'row', padding: 16, backgroundColor: COLORS.card, gap: 10 },
  input: { flex: 1, backgroundColor: COLORS.bg, color: COLORS.text, borderRadius: 10, padding: 12, fontSize: 14, maxHeight: 100 },
  sendBtn: { backgroundColor: COLORS.accent, width: 48, height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.6 },
  sendText: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
