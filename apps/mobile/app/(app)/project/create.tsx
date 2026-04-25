import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { projectsApi } from '@/src/lib/supabase';

const C = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  text: '#E0E0E0',
  sub: '#8892a0',
  border: 'rgba(0, 217, 255, 0.15)',
};

export default function ProjectCreateScreen() {
  const { canCreateProjects } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const create = async () => {
    const title = name.trim();
    if (!title) {
      Alert.alert('Проверьте данные', 'Введите название проекта');
      return;
    }

    try {
      setSaving(true);
      const created = await projectsApi.create({
        name: title,
        description: description.trim() || null,
        status: 'active',
      });
      Alert.alert('Готово', 'Проект создан');
      router.replace({
        pathname: '/(app)/project/[id]',
        params: { id: String((created as any).id) },
      } as any);
    } catch (error) {
      Alert.alert('Ошибка', error instanceof Error ? error.message : 'Не удалось создать проект');
    } finally {
      setSaving(false);
    }
  };

  if (!canCreateProjects) {
    return (
      <View style={s.center}>
        <Text style={s.denied}>Недостаточно прав для создания проекта</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Создать проект</Text>

        <Text style={s.label}>Название</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="Например: СПб Север / Q2"
          placeholderTextColor={C.sub}
        />

        <Text style={s.label}>Описание</Text>
        <TextInput
          style={[s.input, s.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Описание проекта"
          placeholderTextColor={C.sub}
          multiline
        />

        <TouchableOpacity style={[s.submitBtn, saving && s.submitDisabled]} onPress={() => void create()} disabled={saving}>
          {saving ? <ActivityIndicator color="#04120d" /> : <Text style={s.submitText}>Создать проект</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  denied: { color: C.sub, fontSize: 15 },
  content: { padding: 18, paddingTop: 26, gap: 10 },
  title: { color: C.text, fontSize: 24, fontWeight: '700', marginBottom: 6 },
  label: { color: C.sub, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.card,
    color: C.text,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  textArea: { minHeight: 110, textAlignVertical: 'top' },
  submitBtn: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: 'rgba(0,217,255,0.2)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: C.accent, fontWeight: '700', fontSize: 14 },
});

