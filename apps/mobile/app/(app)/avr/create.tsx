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
import { avrApi, jobsApi } from '@/src/lib/supabase';
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
  success: '#00FF88',
};

const TYPES = [
  { id: 'AVR', label: '\u0410\u0412\u0420' },
  { id: 'NRD', label: '\u041d\u0420\u0414' },
  { id: 'TECH_TASK', label: '\u0422\u0435\u0445. \u0437\u0430\u0434\u0430\u0447\u0430' },
] as const;

type AddressItem = Record<string, any>;

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export default function AvrCreateScreen() {
  const router = useRouter();
  const { isManagerOrHigher } = useAuth();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<(typeof TYPES)[number]['id']>('AVR');
  const [description, setDescription] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<AddressItem | null>(null);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const loadAddresses = async () => {
      try {
        setAddressesLoading(true);
        const rows = await jobsApi.getAddresses().catch(() => []);
        if (active) {
          setAddresses(rows || []);
        }
      } finally {
        if (active) {
          setAddressesLoading(false);
        }
      }
    };
    void loadAddresses();
    return () => {
      active = false;
    };
  }, []);

  const filteredAddresses = useMemo(() => {
    return searchAddressSuggestions(addresses, addressQuery, 20);
  }, [addressQuery, addresses]);

  const create = async () => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      Alert.alert(
        '\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0434\u0430\u043d\u043d\u044b\u0435',
        '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u0437\u0430\u044f\u0432\u043a\u0438'
      );
      return;
    }

    try {
      setSaving(true);
      const created = await avrApi.create({
        title: normalizedTitle,
        type,
        description: description.trim() || null,
        address_text: normalizeAddressForDisplay(addressQuery) || null,
        date_from: dateFrom.trim() || null,
        date_to: dateTo.trim() || null,
      });

      Alert.alert('\u0413\u043e\u0442\u043e\u0432\u043e', '\u0417\u0430\u044f\u0432\u043a\u0430 \u0441\u043e\u0437\u0434\u0430\u043d\u0430');
      router.replace({
        pathname: '/(app)/avr/[id]',
        params: { id: String((created as any).id) },
      } as any);
    } catch (error) {
      Alert.alert(
        '\u041e\u0448\u0438\u0431\u043a\u0430',
        errorText(error, '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u0437\u0430\u044f\u0432\u043a\u0443')
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isManagerOrHigher) {
    return (
      <View style={s.center}>
        <Text style={s.denied}>
          {'\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u043f\u0440\u0430\u0432 \u0434\u043b\u044f \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u044f \u0410\u0412\u0420'}
        </Text>
      </View>
    );
  }

  const selectedSummary = buildAddressSummary(selectedAddress);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>{'\u041d\u043e\u0432\u0430\u044f \u0437\u0430\u044f\u0432\u043a\u0430 \u0410\u0412\u0420 / \u041d\u0420\u0414'}</Text>

      <Text style={s.label}>{'\u0422\u0438\u043f \u0437\u0430\u044f\u0432\u043a\u0438'}</Text>
      <View style={s.typeRow}>
        {TYPES.map((item) => {
          const active = type === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[s.typeChip, active && s.typeChipActive]}
              onPress={() => setType(item.id)}
            >
              <Text style={[s.typeText, active && s.typeTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={s.label}>{'\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 *'}</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        style={s.input}
        placeholder={'\u041d\u0430\u043f\u0440\u0438\u043c\u0435\u0440: \u041c\u043e\u043d\u0442\u0430\u0436 \u0443\u0437\u043b\u0430 \u0441\u0432\u044f\u0437\u0438'}
        placeholderTextColor={C.sub}
      />

      <Text style={s.label}>{'\u0410\u0434\u0440\u0435\u0441 / \u043f\u043b\u043e\u0449\u0430\u0434\u043a\u0430'}</Text>
      <TextInput
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
        style={s.input}
        placeholder={
          '\u041f\u043e\u0438\u0441\u043a \u0430\u0434\u0440\u0435\u0441\u0430 \u0438\u0437 \u0431\u0430\u0437\u044b \u0410\u0422\u0421\u0421/\u041a\u0410\u0421\u0418\u041f'
        }
        placeholderTextColor={C.sub}
      />
      {addressesLoading ? (
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

      {selectedAddress ? (
        <View style={s.selectedHint}>
          <Text style={s.selectedHintText}>{`\u0412\u044b\u0431\u0440\u0430\u043d\u043e: ${
            selectedSummary.address || '\u0430\u0434\u0440\u0435\u0441 \u0438\u0437 \u0431\u0430\u0437\u044b'
          }`}</Text>
          {selectedSummary.meta ? <Text style={s.selectedHintSub}>{selectedSummary.meta}</Text> : null}
        </View>
      ) : null}

      <Text style={s.label}>{'\u0414\u0430\u0442\u0430 \u043d\u0430\u0447\u0430\u043b\u0430'}</Text>
      <TextInput
        value={dateFrom}
        onChangeText={setDateFrom}
        style={s.input}
        placeholder={'YYYY-MM-DDTHH:mm'}
        placeholderTextColor={C.sub}
      />

      <Text style={s.label}>{'\u0414\u0430\u0442\u0430 \u043e\u043a\u043e\u043d\u0447\u0430\u043d\u0438\u044f'}</Text>
      <TextInput
        value={dateTo}
        onChangeText={setDateTo}
        style={s.input}
        placeholder={'YYYY-MM-DDTHH:mm'}
        placeholderTextColor={C.sub}
      />

      <Text style={s.label}>{'\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435'}</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        style={[s.input, s.multiline]}
        placeholder={'\u041f\u043e\u0434\u0440\u043e\u0431\u043d\u043e\u0441\u0442\u0438 \u0437\u0430\u044f\u0432\u043a\u0438'}
        placeholderTextColor={C.sub}
        multiline
      />

      <TouchableOpacity style={[s.submitBtn, saving && s.submitDisabled]} onPress={() => void create()} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#04120d" />
        ) : (
          <Text style={s.submitText}>{'\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0437\u0430\u044f\u0432\u043a\u0443'}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingTop: 22, paddingBottom: 30 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, padding: 24 },
  denied: { color: C.sub, fontSize: 15, textAlign: 'center' },
  title: { color: C.text, fontSize: 22, fontWeight: '700', marginBottom: 14 },
  label: { color: C.sub, fontSize: 12, textTransform: 'uppercase', marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    color: C.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  typeChip: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    backgroundColor: C.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typeChipActive: { borderColor: C.accent, backgroundColor: 'rgba(0,217,255,0.15)' },
  typeText: { color: C.sub, fontSize: 12, fontWeight: '600' },
  typeTextActive: { color: C.accent },
  addressLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    minHeight: 36,
  },
  addressList: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: C.card,
  },
  selectedHint: {
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: 'rgba(0,217,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  selectedHintText: { color: C.accent, fontSize: 12, fontWeight: '600' },
  selectedHintSub: { color: C.sub, fontSize: 11, marginTop: 4 },
  submitBtn: {
    marginTop: 18,
    backgroundColor: C.success,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    minHeight: 46,
  },
  submitDisabled: { opacity: 0.55 },
  submitText: { color: '#04120d', fontSize: 14, fontWeight: '700' },
});
