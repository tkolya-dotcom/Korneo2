import React, { useEffect, useMemo, useState } from 'react';
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
import { installationsApi, jobsApi, purchaseRequestsApi, tasksApi } from '@/src/lib/supabase';
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
  danger: '#EF4444',
};

type LinkMode = 'none' | 'task' | 'installation';

type DraftItem = {
  key: string;
  name: string;
  quantity: string;
  unit: string;
};

type AddressItem = Record<string, any>;

const newDraftItem = (): DraftItem => ({
  key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  name: '',
  quantity: '1',
  unit: '\u0448\u0442',
});

export default function PurchaseRequestCreateScreen() {
  const { user, isElevatedUser, canCreatePurchaseRequests } = useAuth();
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linkMode, setLinkMode] = useState<LinkMode>('none');
  const [query, setQuery] = useState('');
  const [comment, setComment] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<AddressItem | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [installations, setInstallations] = useState<any[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedInstallationId, setSelectedInstallationId] = useState('');
  const [items, setItems] = useState<DraftItem[]>([newDraftItem()]);

  useEffect(() => {
    let active = true;
    const loadMeta = async () => {
      try {
        const filters: Record<string, string> | undefined =
          isElevatedUser || !user?.id ? undefined : { assignee_id: user.id };
        const [tasksData, installationsData, addressesData] = await Promise.all([
          tasksApi.getAll(filters).catch(() => []),
          installationsApi.getAll(filters).catch(() => []),
          jobsApi.getAddresses().catch(() => []),
        ]);
        if (!active) return;
        setTasks(tasksData || []);
        setInstallations(installationsData || []);
        setAddresses(addressesData || []);
      } finally {
        if (active) setLoadingMeta(false);
      }
    };

    void loadMeta();
    return () => {
      active = false;
    };
  }, [isElevatedUser, user?.id]);

  const taskOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks.slice(0, 30);
    return tasks
      .filter((task) => `${task.title || ''} ${task.project?.name || ''}`.toLowerCase().includes(q))
      .slice(0, 30);
  }, [query, tasks]);

  const installationOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return installations.slice(0, 30);
    return installations
      .filter((installation) =>
        `${installation.title || ''} ${installation.address || ''} ${installation.project?.name || ''}`
          .toLowerCase()
          .includes(q)
      )
      .slice(0, 30);
  }, [query, installations]);

  const filteredAddresses = useMemo(() => {
    return searchAddressSuggestions(addresses, addressQuery, 20);
  }, [addressQuery, addresses]);

  const updateDraftItem = (key: string, patch: Partial<DraftItem>) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const submit = async () => {
    if (saving) return;

    const normalizedItems = items
      .map((item) => ({
        name: item.name.trim(),
        quantity: Number(item.quantity.replace(',', '.')),
        unit: item.unit.trim() || '\u0448\u0442',
      }))
      .filter((item) => item.name && Number.isFinite(item.quantity) && item.quantity > 0);

    if (!comment.trim() && normalizedItems.length === 0) {
      Alert.alert(
        '\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0434\u0430\u043d\u043d\u044b\u0435',
        '\u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439 \u0438\u043b\u0438 \u0445\u043e\u0442\u044f \u0431\u044b \u043e\u0434\u043d\u0443 \u043f\u043e\u0437\u0438\u0446\u0438\u044e.'
      );
      return;
    }
    if (linkMode === 'task' && !selectedTaskId) {
      Alert.alert(
        '\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0434\u0430\u043d\u043d\u044b\u0435',
        '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0437\u0430\u0434\u0430\u0447\u0443.'
      );
      return;
    }
    if (linkMode === 'installation' && !selectedInstallationId) {
      Alert.alert(
        '\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0434\u0430\u043d\u043d\u044b\u0435',
        '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043c\u043e\u043d\u0442\u0430\u0436.'
      );
      return;
    }

    try {
      setSaving(true);
      const created = await purchaseRequestsApi.create({
        status: 'pending',
        comment: comment.trim() || null,
        receipt_address: normalizeAddressForDisplay(addressQuery) || null,
        task_id: linkMode === 'task' ? selectedTaskId : null,
        installation_id: linkMode === 'installation' ? selectedInstallationId : null,
        items: normalizedItems,
      });
      Alert.alert('\u0413\u043e\u0442\u043e\u0432\u043e', '\u0417\u0430\u044f\u0432\u043a\u0430 \u0441\u043e\u0437\u0434\u0430\u043d\u0430');
      router.replace({
        pathname: '/(app)/purchase-request/[id]',
        params: { id: String((created as any).id) },
      } as any);
    } catch (error) {
      Alert.alert(
        '\u041e\u0448\u0438\u0431\u043a\u0430',
        error instanceof Error ? error.message : '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0437\u0430\u044f\u0432\u043a\u0443'
      );
    } finally {
      setSaving(false);
    }
  };

  if (!canCreatePurchaseRequests) {
    return (
      <View style={s.center}>
        <Text style={s.denied}>
          {'\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u043f\u0440\u0430\u0432 \u0434\u043b\u044f \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u044f \u0437\u0430\u044f\u0432\u043a\u0438'}
        </Text>
      </View>
    );
  }

  if (loadingMeta) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  const selectedSummary = buildAddressSummary(selectedAddress);

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>{'\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0437\u0430\u044f\u0432\u043a\u0443'}</Text>

        <Text style={s.label}>{'\u041f\u0440\u0438\u0432\u044f\u0437\u043a\u0430'}</Text>
        <View style={s.switchRow}>
          {[
            { key: 'none', title: '\u0411\u0435\u0437 \u043f\u0440\u0438\u0432\u044f\u0437\u043a\u0438' },
            { key: 'task', title: '\u041a \u0437\u0430\u0434\u0430\u0447\u0435' },
            { key: 'installation', title: '\u041a \u043c\u043e\u043d\u0442\u0430\u0436\u0443' },
          ].map((mode) => {
            const active = linkMode === mode.key;
            return (
              <TouchableOpacity
                key={mode.key}
                style={[s.switchBtn, active && s.switchBtnActive]}
                onPress={() => setLinkMode(mode.key as LinkMode)}
              >
                <Text style={[s.switchText, active && s.switchTextActive]}>{mode.title}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {linkMode !== 'none' ? (
          <>
            <TextInput
              style={s.input}
              value={query}
              onChangeText={setQuery}
              placeholder={
                linkMode === 'task'
                  ? '\u041f\u043e\u0438\u0441\u043a \u0437\u0430\u0434\u0430\u0447\u0438'
                  : '\u041f\u043e\u0438\u0441\u043a \u043c\u043e\u043d\u0442\u0430\u0436\u0430'
              }
              placeholderTextColor={C.sub}
            />
            <View style={s.picker}>
              {(linkMode === 'task' ? taskOptions : installationOptions).map((option) => {
                const id = String(option.id);
                const selected = linkMode === 'task' ? selectedTaskId === id : selectedInstallationId === id;
                return (
                  <TouchableOpacity
                    key={id}
                    style={[s.option, selected && s.optionActive]}
                    onPress={() => {
                      if (linkMode === 'task') {
                        setSelectedTaskId(id);
                        setSelectedInstallationId('');
                      } else {
                        setSelectedInstallationId(id);
                        setSelectedTaskId('');
                      }
                    }}
                  >
                    <Text style={[s.optionTitle, selected && s.optionTitleActive]} numberOfLines={2}>
                      {linkMode === 'task'
                        ? option.title || '\u0417\u0430\u0434\u0430\u0447\u0430'
                        : option.title || option.address || '\u041c\u043e\u043d\u0442\u0430\u0436'}
                    </Text>
                    <Text style={s.optionSub} numberOfLines={1}>
                      {option.project?.name || option.address || '\u0411\u0435\u0437 \u043f\u0440\u043e\u0435\u043a\u0442\u0430'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}

        <Text style={s.label}>{'\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439'}</Text>
        <TextInput
          style={[s.input, s.textArea]}
          value={comment}
          onChangeText={setComment}
          placeholder={'\u0427\u0442\u043e \u043d\u0443\u0436\u043d\u043e \u0437\u0430\u043a\u0443\u043f\u0438\u0442\u044c'}
          placeholderTextColor={C.sub}
          multiline
        />

        <Text style={s.label}>{'\u0410\u0434\u0440\u0435\u0441 \u043f\u043e\u043b\u0443\u0447\u0435\u043d\u0438\u044f'}</Text>
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
          placeholder={
            '\u041f\u043e\u0438\u0441\u043a \u0430\u0434\u0440\u0435\u0441\u0430 \u0438\u0437 \u0431\u0430\u0437\u044b \u0410\u0422\u0421\u0421/\u041a\u0410\u0421\u0418\u041f'
          }
          placeholderTextColor={C.sub}
        />
        {filteredAddresses.length > 0 ? (
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
        {selectedAddress ? (
          <View style={s.selectedHint}>
            <Text style={s.selectedHintText}>{`\u0412\u044b\u0431\u0440\u0430\u043d\u043e: ${
              selectedSummary.address || '\u0430\u0434\u0440\u0435\u0441 \u0438\u0437 \u0431\u0430\u0437\u044b'
            }`}</Text>
            {selectedSummary.meta ? <Text style={s.selectedHintSub}>{selectedSummary.meta}</Text> : null}
          </View>
        ) : null}

        <Text style={s.label}>{'\u041f\u043e\u0437\u0438\u0446\u0438\u0438'}</Text>
        {items.map((item) => (
          <View key={item.key} style={s.itemCard}>
            <TextInput
              style={s.input}
              value={item.name}
              onChangeText={(value) => updateDraftItem(item.key, { name: value })}
              placeholder={'\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435'}
              placeholderTextColor={C.sub}
            />
            <View style={s.inlineRow}>
              <TextInput
                style={[s.input, s.inlineInput]}
                value={item.quantity}
                onChangeText={(value) => updateDraftItem(item.key, { quantity: value })}
                placeholder={'\u041a\u043e\u043b-\u0432\u043e'}
                placeholderTextColor={C.sub}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[s.input, s.inlineInput]}
                value={item.unit}
                onChangeText={(value) => updateDraftItem(item.key, { unit: value })}
                placeholder={'\u0415\u0434.'}
                placeholderTextColor={C.sub}
              />
              <TouchableOpacity
                style={s.removeBtn}
                onPress={() => setItems((current) => current.filter((row) => row.key !== item.key))}
                disabled={items.length === 1}
              >
                <Text style={[s.removeText, items.length === 1 && s.removeTextDisabled]}>
                  {'\u0423\u0434\u0430\u043b\u0438\u0442\u044c'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity style={s.addItemBtn} onPress={() => setItems((current) => [...current, newDraftItem()])}>
          <Text style={s.addItemText}>{'+ \u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043f\u043e\u0437\u0438\u0446\u0438\u044e'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.submitBtn, saving && s.submitDisabled]} onPress={() => void submit()} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#04120d" />
          ) : (
            <Text style={s.submitText}>{'\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  denied: { color: C.sub, fontSize: 15 },
  content: { padding: 16, paddingTop: 22, gap: 10, paddingBottom: 34 },
  title: { color: C.text, fontSize: 24, fontWeight: '700', marginBottom: 2 },
  label: { color: C.sub, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  switchRow: { flexDirection: 'row', gap: 8 },
  switchBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: C.card,
  },
  switchBtnActive: { borderColor: C.accent, backgroundColor: 'rgba(0,217,255,0.14)' },
  switchText: { color: C.sub, fontSize: 12, fontWeight: '600' },
  switchTextActive: { color: C.accent },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    backgroundColor: C.card,
    color: C.text,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  picker: { maxHeight: 220, borderRadius: 10, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  option: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: C.card,
  },
  optionActive: { backgroundColor: 'rgba(0,217,255,0.14)' },
  optionTitle: { color: C.text, fontSize: 13, fontWeight: '600' },
  optionTitleActive: { color: C.accent },
  optionSub: { color: C.sub, fontSize: 11, marginTop: 3 },
  addressList: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: C.card,
  },
  selectedHint: {
    marginTop: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: 'rgba(0,217,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  selectedHintText: { color: C.accent, fontSize: 12, fontWeight: '600' },
  selectedHintSub: { color: C.sub, fontSize: 11, marginTop: 4 },
  itemCard: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.card,
    padding: 10,
    gap: 8,
  },
  inlineRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  inlineInput: { flex: 1 },
  removeBtn: {
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  removeText: { color: C.danger, fontSize: 12, fontWeight: '600' },
  removeTextDisabled: { opacity: 0.45 },
  addItemBtn: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addItemText: { color: C.accent, fontSize: 12, fontWeight: '700' },
  submitBtn: {
    marginTop: 6,
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
