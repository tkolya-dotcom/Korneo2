import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { authApi, jobsApi, projectsApi, tasksApi } from '@/src/lib/supabase';
import { searchAddressSuggestions } from '@/src/lib/addressSearch';
import AddressSuggestionCard, {
  buildAddressSummary,
  normalizeAddressForDisplay,
} from '@/src/components/AddressSuggestionCard';

const C = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  text: '#E0E0E0',
  sub: '#8892a0',
  border: 'rgba(0, 217, 255, 0.15)',
  green: '#00FF88',
};

const PRIORITY_OPTIONS = [
  { value: 'low', label: '\u041d\u0438\u0437\u043a\u0438\u0439' },
  { value: 'normal', label: '\u041e\u0431\u044b\u0447\u043d\u044b\u0439' },
  { value: 'high', label: '\u0412\u044b\u0441\u043e\u043a\u0438\u0439' },
  { value: 'urgent', label: '\u0421\u0440\u043e\u0447\u043d\u044b\u0439' },
];

type AddressItem = Record<string, any>;

export default function TaskCreateScreen() {
  const { canCreateTasks } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);

  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<AddressItem[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState('normal');
  const [dueDate, setDueDate] = useState('');

  const [addressQuery, setAddressQuery] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<AddressItem | null>(null);

  useEffect(() => {
    if (!canCreateTasks) {
      Alert.alert(
        '\u041e\u0448\u0438\u0431\u043a\u0430',
        '\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u043f\u0440\u0430\u0432 \u0434\u043b\u044f \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u044f \u0437\u0430\u0434\u0430\u0447'
      );
      router.back();
      return;
    }
    void loadData();
  }, [canCreateTasks, router]);

  const loadData = async () => {
    try {
      setMetaLoading(true);
      const [projData, usersData, addressData] = await Promise.all([
        projectsApi.getAll().catch(() => []),
        authApi.getUsers().catch(() => []),
        jobsApi.getAddresses().catch(() => []),
      ]);
      setProjects(projData || []);
      setUsers(usersData || []);
      setAddresses(addressData || []);
    } catch (error) {
      console.error('Failed to load create task data:', error);
    } finally {
      setMetaLoading(false);
    }
  };

  const filteredAddresses = useMemo(() => {
    return searchAddressSuggestions(addresses, addressQuery, 20);
  }, [addressQuery, addresses]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert(
        '\u041e\u0448\u0438\u0431\u043a\u0430',
        '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u0437\u0430\u0434\u0430\u0447\u0438'
      );
      return;
    }

    setLoading(true);
    try {
      await tasksApi.create({
        title: title.trim(),
        description: description.trim(),
        project_id: projectId || null,
        assignee_id: assigneeId || null,
        priority,
        address: addressQuery.trim(),
        due_date: dueDate || null,
        status: 'new',
      });
      Alert.alert(
        '\u0413\u043e\u0442\u043e\u0432\u043e',
        '\u0417\u0430\u0434\u0430\u0447\u0430 \u0441\u043e\u0437\u0434\u0430\u043d\u0430',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert(
        '\u041e\u0448\u0438\u0431\u043a\u0430',
        error?.message || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0437\u0430\u0434\u0430\u0447\u0443'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backBtn}>{'\u2190 \u041d\u0430\u0437\u0430\u0434'}</Text>
        </TouchableOpacity>
        <Text style={s.title}>{'\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0437\u0430\u0434\u0430\u0447\u0443'}</Text>
      </View>

      <View style={s.form}>
        <Text style={s.label}>{'\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 *'}</Text>
        <TextInput
          style={s.input}
          value={title}
          onChangeText={setTitle}
          placeholder={'\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435'}
          placeholderTextColor={C.sub}
        />

        <Text style={s.label}>{'\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435'}</Text>
        <TextInput
          style={[s.input, s.textarea]}
          value={description}
          onChangeText={setDescription}
          placeholder={'\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0437\u0430\u0434\u0430\u0447\u0438'}
          placeholderTextColor={C.sub}
          multiline
          numberOfLines={4}
        />

        <Text style={s.label}>{'\u041f\u0440\u043e\u0435\u043a\u0442'}</Text>
        <View style={s.selectWrap}>
          <TouchableOpacity
            style={s.select}
            onPress={() => {
              Alert.alert(
                '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u0440\u043e\u0435\u043a\u0442',
                '',
                [
                  ...projects.map((project) => ({
                    text: project.name,
                    onPress: () => setProjectId(String(project.id)),
                  })),
                  { text: '\u041e\u0442\u043c\u0435\u043d\u0430', style: 'cancel' as const },
                ]
              );
            }}
          >
            <Text style={s.selectText}>
              {projects.find((project) => String(project.id) === projectId)?.name ||
                '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u0440\u043e\u0435\u043a\u0442'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={s.label}>{'\u0418\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c'}</Text>
        <View style={s.selectWrap}>
          <TouchableOpacity
            style={s.select}
            onPress={() => {
              Alert.alert(
                '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044f',
                '',
                [
                  ...users.map((candidate) => ({
                    text: candidate.name || candidate.email,
                    onPress: () => setAssigneeId(String(candidate.id)),
                  })),
                  { text: '\u041e\u0442\u043c\u0435\u043d\u0430', style: 'cancel' as const },
                ]
              );
            }}
          >
            <Text style={s.selectText}>
              {users.find((candidate) => String(candidate.id) === assigneeId)?.name ||
                users.find((candidate) => String(candidate.id) === assigneeId)?.email ||
                '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044f'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={s.label}>{'\u041f\u0440\u0438\u043e\u0440\u0438\u0442\u0435\u0442'}</Text>
        <View style={s.optionsRow}>
          {PRIORITY_OPTIONS.map((option) => {
            const active = priority === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[s.option, active && s.optionActive]}
                onPress={() => setPriority(option.value)}
              >
                <Text style={[s.optionText, active && s.optionTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={s.label}>{'\u0410\u0434\u0440\u0435\u0441'}</Text>
        <TextInput
          style={s.input}
          value={addressQuery}
          onChangeText={(value) => {
            setAddressQuery(value);
            if (
              selectedAddress &&
              normalizeAddressForDisplay(value) !==
                normalizeAddressForDisplay(String(selectedAddress.address || ''))
            ) {
              setSelectedAddress(null);
            }
          }}
          placeholder={'\u041f\u043e\u0438\u0441\u043a \u0430\u0434\u0440\u0435\u0441\u0430 \u0438\u0437 \u0431\u0430\u0437\u044b \u0410\u0422\u0421\u0421/\u041a\u0410\u0421\u0418\u041f'}
          placeholderTextColor={C.sub}
        />

        {metaLoading ? (
          <View style={s.addressLoading}>
            <ActivityIndicator color={C.accent} />
          </View>
        ) : filteredAddresses.length > 0 ? (
          <View style={s.addressList}>
            {filteredAddresses.map((item) => (
              <AddressSuggestionCard
                key={`${item.source}:${item.source_id}`}
                item={item}
                onPress={() => {
                  const nextAddress = normalizeAddressForDisplay(String(item.address || ''));
                  setAddressQuery(nextAddress);
                  setSelectedAddress(item);
                }}
              />
            ))}
          </View>
        ) : null}

        {selectedAddress
          ? (() => {
              const summary = buildAddressSummary(selectedAddress);
              return (
                <View style={s.selectedHint}>
                  <Text style={s.selectedHintText}>{`\u0412\u044b\u0431\u0440\u0430\u043d\u043e: ${
                    summary.address || '\u0430\u0434\u0440\u0435\u0441 \u0438\u0437 \u0431\u0430\u0437\u044b'
                  }`}</Text>
                  {summary.meta ? <Text style={s.selectedHintSub}>{summary.meta}</Text> : null}
                </View>
              );
            })()
          : null}

        <Text style={s.label}>{'\u0414\u0435\u0434\u043b\u0430\u0439\u043d'}</Text>
        <TextInput
          style={s.input}
          value={dueDate}
          onChangeText={setDueDate}
          placeholder={'YYYY-MM-DD'}
          placeholderTextColor={C.sub}
        />

        <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={C.bg} />
          ) : (
            <Text style={s.btnText}>{'\u0421\u041e\u0417\u0414\u0410\u0422\u042c \u0417\u0410\u0414\u0410\u0427\u0423'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50 },
  backBtn: { color: C.accent, fontSize: 16 },
  title: { color: C.accent, fontSize: 22, fontWeight: '700', marginLeft: 20 },
  form: { padding: 20 },
  label: { color: C.accent, fontSize: 13, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 },
  input: {
    backgroundColor: C.card,
    color: C.text,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    fontSize: 15,
    borderWidth: 1,
    borderColor: C.border,
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  selectWrap: { marginBottom: 16 },
  select: { backgroundColor: C.card, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.border },
  selectText: { color: C.text, fontSize: 15 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  option: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  optionActive: { borderColor: C.accent, backgroundColor: 'rgba(0, 217, 255, 0.1)' },
  optionText: { color: C.sub, fontSize: 13 },
  optionTextActive: { color: C.accent },
  addressLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    minHeight: 36,
  },
  addressList: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: C.card,
  },
  selectedHint: {
    marginBottom: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: 'rgba(0,217,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  selectedHintText: { color: C.accent, fontSize: 12, fontWeight: '600' },
  selectedHintSub: { color: C.sub, fontSize: 11, marginTop: 4 },
  btn: { backgroundColor: C.accent, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: C.bg, fontSize: 16, fontWeight: '700', letterSpacing: 1 },
});
