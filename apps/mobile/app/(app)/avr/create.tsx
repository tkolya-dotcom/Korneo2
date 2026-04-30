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
import { authApi, avrApi, jobsApi } from '@/src/lib/supabase';
import { searchAddressSuggestions } from '@/src/lib/addressSearch';
import AddressSuggestionCard, {
  buildAddressSummary,
  normalizeAddressForDisplay,
} from '@/src/components/AddressSuggestionCard';
import EngineersSelector from '@/src/components/EngineersSelector';

const C = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  text: '#E0E0E0',
  sub: '#8892a0',
  border: 'rgba(0, 217, 255, 0.15)',
  success: '#00FF88',
  danger: '#FF3366',
};

const TYPES = [
  { id: 'AVR', label: '\u0410\u0412\u0420' },
  { id: 'NRD', label: '\u041d\u0420\u0414' },
  { id: 'TECH_TASK', label: '\u0442\u0435\u0445. \u0437\u0430\u0434\u0430\u0447\u0430' },
] as const;

type AddressItem = Record<string, any>;
type EquipmentOption = {
  key: string;
  id: string;
  name: string;
  brand?: string;
  model?: string;
  serial?: string;
  inventory?: string;
};

const getUserName = (user: any): string => {
    return user?.name || user?.email || `User ${String(user?.id || '').slice(0, 8)}`;
  };

  const errorText = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const getAddressEquipmentOptions = (item: AddressItem | null): EquipmentOption[] => {
  if (!item) {
    return [];
  }

  const rows = Array.isArray(item.sk_items)
    ? item.sk_items
    : Array.isArray(item.equipment_items)
      ? item.equipment_items
      : [];

  const sourceRows = rows
    .map((entry: Record<string, unknown>, index: number) => {
      const id = String(entry.id || '').trim();
      const name = String(entry.name || '').trim();
      const key = String(entry.key || `${index + 1}|${id}|${name}`).trim();
      if (!id && !name) {
        return null;
      }
      return {
        key,
        id,
        name: name || `СК ${index + 1}`,
        brand: String(entry.brand || '').trim() || undefined,
        model: String(entry.model || '').trim() || undefined,
        serial: String(entry.serial || '').trim() || undefined,
        inventory: String(entry.inventory || '').trim() || undefined,
      } as EquipmentOption;
    })
    .filter(Boolean) as EquipmentOption[];

  if (sourceRows.length === 0) {
    const fallbackName = String(item.sk_name || '').trim();
    if (fallbackName) {
      sourceRows.push({
        key: `fallback|${fallbackName}`,
        id: '',
        name: fallbackName,
      });
    }
  }

  const seen = new Set<string>();
  return sourceRows
    .filter((entry) => {
      const dedupeKey = `${entry.id}|${entry.name}`.toLowerCase().trim();
      if (!dedupeKey || seen.has(dedupeKey)) {
        return false;
      }
      seen.add(dedupeKey);
      return true;
    })
    .slice(0, 7);
};

const formatEquipmentOptionMeta = (item: EquipmentOption) =>
  [item.brand, item.model, item.serial ? `S/N ${item.serial}` : null, item.inventory ? `INV ${item.inventory}` : null]
    .filter(Boolean)
    .join(' • ');

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
  const [selectedOldEquipmentKeys, setSelectedOldEquipmentKeys] = useState<string[]>([]);
  const [selectedNewEquipmentKeys, setSelectedNewEquipmentKeys] = useState<string[]>([]);
  const [manualOldEquipment, setManualOldEquipment] = useState<Array<{ id: string; name: string }>>([]);
  const [manualNewEquipment, setManualNewEquipment] = useState<Array<{ id: string; name: string }>>([]);
  const [replacementReason, setReplacementReason] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedEngineerIds, setSelectedEngineerIds] = useState<string[]>([]);
  const [selectedExecutorId, setSelectedExecutorId] = useState<string>('');
  const [plannedInstallationDate, setPlannedInstallationDate] = useState('');

  useEffect(() => {
    let active = true;
    const loadAddresses = async () => {
      try {
        setAddressesLoading(true);
        const rows = await Promise.all([
          jobsApi.getAddresses().catch(() => []),
          authApi.getUsers().catch(() => []),
        ]);
        if (active) {
          setAddresses(rows[0] || []);
          setUsers(rows[1] || []);
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

  const addressEquipmentOptions = useMemo(
    () => getAddressEquipmentOptions(selectedAddress),
    [selectedAddress]
  );

  useEffect(() => {
    if (!selectedAddress) {
      setSelectedOldEquipmentKeys([]);
      setSelectedNewEquipmentKeys([]);
      return;
    }
    setSelectedOldEquipmentKeys(addressEquipmentOptions.map((option) => option.key));
    setSelectedNewEquipmentKeys(addressEquipmentOptions.map((option) => option.key));
    setManualOldEquipment([]);
    setManualNewEquipment([]);
  }, [selectedAddress, addressEquipmentOptions]);

  const toggleOldEquipment = (key: string) => {
    setSelectedOldEquipmentKeys((prev) => {
      if (prev.includes(key)) {
        return prev.filter((item) => item !== key);
      }
      const currentTotal = prev.length + manualOldEquipment.length;
      if (currentTotal >= 7) {
        Alert.alert(
          '\u041e\u0448\u0438\u0431\u043a\u0430',
          '\u041c\u0430\u043a\u0441\u0438\u043c\u0443\u043c 7 \u0435\u0434\u0438\u043d\u0438\u0446 \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u044f'
        );
        return prev;
      }
      return [...prev, key];
    });
  };

  const toggleNewEquipment = (key: string) => {
    setSelectedNewEquipmentKeys((prev) => {
      if (prev.includes(key)) {
        return prev.filter((item) => item !== key);
      }
      const currentTotal = prev.length + manualNewEquipment.length;
      if (currentTotal >= 7) {
        Alert.alert(
          '\u041e\u0448\u0438\u0431\u043a\u0430',
          '\u041c\u0430\u043a\u0441\u0438\u043c\u0443\u043c 7 \u0435\u0434\u0438\u043d\u0438\u0446 \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u044f'
        );
        return prev;
      }
      return [...prev, key];
    });
  };

  const addManualOldEquipment = () => {
    const selectedFromAddress = selectedOldEquipmentKeys.length;
    if (selectedFromAddress + manualOldEquipment.length >= 7) {
      Alert.alert(
        '\u041e\u0448\u0438\u0431\u043a\u0430',
        '\u041c\u0430\u043a\u0441\u0438\u043c\u0443\u043c 7 \u0435\u0434\u0438\u043d\u0438\u0446 \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u044f'
      );
      return;
    }
    setManualOldEquipment((prev) => [...prev, { id: '', name: '' }]);
  };

  const addManualNewEquipment = () => {
    const selectedFromAddress = selectedNewEquipmentKeys.length;
    if (selectedFromAddress + manualNewEquipment.length >= 7) {
      Alert.alert(
        '\u041e\u0448\u0438\u0431\u043a\u0430',
        '\u041c\u0430\u043a\u0441\u0438\u043c\u0443\u043c 7 \u0435\u0434\u0438\u043d\u0438\u0446 \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u044f'
      );
      return;
    }
    setManualNewEquipment((prev) => [...prev, { id: '', name: '' }]);
  };

  const updateManualOldEquipment = (index: number, field: 'id' | 'name', value: string) => {
    setManualOldEquipment((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const updateManualNewEquipment = (index: number, field: 'id' | 'name', value: string) => {
    setManualNewEquipment((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeManualOldEquipment = (index: number) => {
    setManualOldEquipment((prev) => prev.filter((_, i) => i !== index));
  };

  const removeManualNewEquipment = (index: number) => {
    setManualNewEquipment((prev) => prev.filter((_, i) => i !== index));
  };

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

      // Prepare old equipment
      const selectedOldFromAddress = addressEquipmentOptions
        .filter((option) => selectedOldEquipmentKeys.includes(option.key))
        .map((option) => ({
          id: option.id.trim(),
          name: option.name.trim(),
          brand: option.brand,
          model: option.model,
          serial: option.serial,
          inventory: option.inventory,
        }));
      const selectedManualOld = manualOldEquipment
        .map((item) => ({
          id: item.id.trim(),
          name: item.name.trim(),
          brand: undefined,
          model: undefined,
          serial: undefined,
          inventory: undefined,
        }))
        .filter((item) => item.id || item.name);

      // Prepare new equipment
      const selectedNewFromAddress = addressEquipmentOptions
        .filter((option) => selectedNewEquipmentKeys.includes(option.key))
        .map((option) => ({
          id: option.id.trim(),
          name: option.name.trim(),
          brand: option.brand,
          model: option.model,
          serial: option.serial,
          inventory: option.inventory,
        }));
      const selectedManualNew = manualNewEquipment
        .map((item) => ({
          id: item.id.trim(),
          name: item.name.trim(),
          brand: undefined,
          model: undefined,
          serial: undefined,
          inventory: undefined,
        }))
        .filter((item) => item.id || item.name);

      // Dedupe old equipment
      const dedupeOld = new Set<string>();
      const oldEquipment = [...selectedOldFromAddress, ...selectedManualOld]
        .filter((item) => item.id || item.name)
        .filter((item) => {
          const key = `${item.id}|${item.name}`.toLowerCase().trim();
          if (!key || dedupeOld.has(key)) {
            return false;
          }
          dedupeOld.add(key);
          return true;
        })
        .slice(0, 7);

      // Dedupe new equipment
      const dedupeNew = new Set<string>();
      const newEquipment = [...selectedNewFromAddress, ...selectedManualNew]
        .filter((item) => item.id || item.name)
        .filter((item) => {
          const key = `${item.id}|${item.name}`.toLowerCase().trim();
          if (!key || dedupeNew.has(key)) {
            return false;
          }
          dedupeNew.add(key);
          return true;
        })
        .slice(0, 7);

      const payload: Parameters<typeof avrApi.create>[0] = {
        title: normalizedTitle,
        type,
        description: description.trim() || null,
        address_text: normalizeAddressForDisplay(addressQuery) || null,
        date_from: dateFrom.trim() || null,
        date_to: dateTo.trim() || null,
        replacement_reason: replacementReason.trim() || null,
        engineers: selectedEngineerIds.length > 0 ? selectedEngineerIds : null,
        executor_id: selectedExecutorId || null,
        planned_installation_date: plannedInstallationDate.trim() || null,
      };

      // Add old equipment fields
      oldEquipment.forEach((eq, i) => {
        const prefix = i === 0 ? 'old_' : `old_${i + 1}_`;
        if (eq.id) payload[`${prefix}id_sk`] = eq.id;
        if (eq.name) payload[`${prefix}naimenovanie_sk`] = eq.name;
        if (eq.brand) payload[`${prefix}marka_sk`] = eq.brand;
        if (eq.model) payload[`${prefix}model_sk`] = eq.model;
        if (eq.serial) payload[`${prefix}seriynyy_nomer`] = eq.serial;
        if (eq.inventory) payload[`${prefix}inventarnyy_nomer`] = eq.inventory;
      });

      // Add new equipment fields
      newEquipment.forEach((eq, i) => {
        const prefix = i === 0 ? 'new_' : `new_${i + 1}_`;
        if (eq.id) payload[`${prefix}id_sk`] = eq.id;
        if (eq.name) payload[`${prefix}naimenovanie_sk`] = eq.name;
        if (eq.brand) payload[`${prefix}marka_sk`] = eq.brand;
        if (eq.model) payload[`${prefix}model_sk`] = eq.model;
        if (eq.serial) payload[`${prefix}seriynyy_nomer`] = eq.serial;
        if (eq.inventory) payload[`${prefix}inventarnyy_nomer`] = eq.inventory;
      });

      const created = await avrApi.create(payload);

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

      <EngineersSelector
        users={users}
        selectedIds={selectedEngineerIds}
        onChange={setSelectedEngineerIds}
        maxEngineers={6}
      />

      {/* EXECUTOR SELECTION */}
      <View style={s.sectionHeader}>
        <Text style={s.label}>{'Ответственный исполнитель'}</Text>
        <TouchableOpacity
          onPress={() => {
            const availableUsers = users.filter((u) => !selectedExecutorId || String(u.id) !== selectedExecutorId);
            if (availableUsers.length === 0) {
              Alert.alert('Ошибка', 'Нет доступных пользователей');
              return;
            }
            Alert.alert(
              selectedExecutorId ? 'Изменить исполнителя' : 'Выбрать исполнителя',
              '',
              [
                ...users.map((user) => ({
                  text: getUserName(user),
                  onPress: () => setSelectedExecutorId(String(user.id)),
                })),
                ...(selectedExecutorId ? [{ text: 'Убрать исполнителя', onPress: () => setSelectedExecutorId(''), style: 'destructive' as const }] : []),
                { text: 'Отмена', style: 'cancel' as const },
              ]
            );
          }}
        >
          <Text style={s.addBtn}>{selectedExecutorId ? '✎ Изменить' : '+ Выбрать'}</Text>
        </TouchableOpacity>
      </View>

      {selectedExecutorId ? (
        <View style={s.selectedExecutorCard}>
          {(() => {
            const executor = users.find((u) => String(u.id) === String(selectedExecutorId));
            return (
              <View style={s.executorRow}>
                <View style={s.executorAvatar}>
                  <Text style={s.executorAvatarText}>{executor ? executor.name?.slice(0, 2).toUpperCase() || '?' : '?'}</Text>
                </View>
                <View style={s.executorInfo}>
                  <Text style={s.executorName}>{executor?.name || 'Пользователь'}</Text>
                  {executor?.email && <Text style={s.executorEmail}>{executor.email}</Text>}
                </View>
                <TouchableOpacity onPress={() => setSelectedExecutorId('')}>
                  <Text style={s.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            );
          })()}
        </View>
      ) : (
        <Text style={s.hint}>{'Исполнитель не выбран'}</Text>
      )}

      {/* PLANNED INSTALLATION DATE */}
      <Text style={s.label}>{'Планируемая дата монтажа'}</Text>
      <TextInput
        value={plannedInstallationDate}
        onChangeText={setPlannedInstallationDate}
        style={s.input}
        placeholder={'YYYY-MM-DD или YYYY-MM-DDTHH:mm'}
        placeholderTextColor={C.sub}
      />

      {/* OLD EQUIPMENT SECTION */}
      <View style={s.sectionHeader}>
        <Text style={s.label}>{'\u0414\u0435\u043c\u043e\u043d\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u043e\u0435 \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435 (\u0421\u0442\u0430\u0440\u043e\u0435 \u0421\u041a)'}</Text>
        <TouchableOpacity onPress={addManualOldEquipment}>
          <Text style={s.addBtn}>{`+ \u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c (${selectedOldEquipmentKeys.length + manualOldEquipment.length}/7)`}</Text>
        </TouchableOpacity>
      </View>

      {addressEquipmentOptions.length > 0 ? (
        <View style={s.equipmentSourceCard}>
          <Text style={s.equipmentSourceTitle}>
            {'\u041e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435 \u0438\u0437 \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u043e\u0433\u043e \u0430\u0434\u0440\u0435\u0441\u0430'}
          </Text>
          {addressEquipmentOptions.map((option) => {
            const checked = selectedOldEquipmentKeys.includes(option.key);
            const optionMeta = formatEquipmentOptionMeta(option);
            return (
              <TouchableOpacity
                key={option.key}
                style={s.checkboxRow}
                onPress={() => toggleOldEquipment(option.key)}
              >
                <View style={[s.checkbox, checked && s.checkboxChecked]}>
                  <Text style={s.checkboxMark}>{checked ? '\u2713' : ''}</Text>
                </View>
                <View style={s.checkboxTextWrap}>
                  <Text style={s.checkboxTitle} numberOfLines={2}>
                    {option.name}
                    {option.id ? ` (ID ${option.id})` : ''}
                  </Text>
                  {optionMeta ? (
                    <Text style={s.checkboxMeta} numberOfLines={2}>
                      {optionMeta}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <Text style={s.noEquipmentHint}>
          {'\u041f\u043e \u0430\u0434\u0440\u0435\u0441\u0443 \u0441\u043f\u0438\u0441\u043e\u043a \u0421\u041a \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d. \u041c\u043e\u0436\u043d\u043e \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0432\u0440\u0443\u0447\u043d\u0443\u044e.'}
        </Text>
      )}

      {manualOldEquipment.map((eq, index) => (
        <View key={`old-${index}-${eq.id}-${eq.name}`} style={s.equipmentRow}>
          <TextInput
            style={[s.input, { flex: 1, marginBottom: 0 }]}
            placeholder={`ID \u0421\u041a ${index + 1}`}
            placeholderTextColor={C.sub}
            value={eq.id}
            onChangeText={(v) => updateManualOldEquipment(index, 'id', v)}
          />
          <TextInput
            style={[s.input, { flex: 2, marginBottom: 0 }]}
            placeholder={'\u041d\u0430\u0438\u043c\u0435\u043d\u043e\u0432\u0430\u043d\u0438\u0435'}
            placeholderTextColor={C.sub}
            value={eq.name}
            onChangeText={(v) => updateManualOldEquipment(index, 'name', v)}
          />
          <TouchableOpacity onPress={() => removeManualOldEquipment(index)} style={s.removeBtn}>
            <Text style={s.removeBtnText}>{'\u2715'}</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* NEW EQUIPMENT SECTION */}
      <View style={s.sectionHeader}>
        <Text style={s.label}>{'\u0423\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u043d\u043e\u0435 \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435 (\u041d\u043e\u0432\u043e\u0435 \u0421\u041a)'}</Text>
        <TouchableOpacity onPress={addManualNewEquipment}>
          <Text style={s.addBtn}>{`+ \u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c (${selectedNewEquipmentKeys.length + manualNewEquipment.length}/7)`}</Text>
        </TouchableOpacity>
      </View>

      {addressEquipmentOptions.length > 0 ? (
        <View style={s.equipmentSourceCard}>
          <Text style={s.equipmentSourceTitle}>
            {'\u041e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435 \u0438\u0437 \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u043e\u0433\u043e \u0430\u0434\u0440\u0435\u0441\u0430'}
          </Text>
          {addressEquipmentOptions.map((option) => {
            const checked = selectedNewEquipmentKeys.includes(option.key);
            const optionMeta = formatEquipmentOptionMeta(option);
            return (
              <TouchableOpacity
                key={option.key}
                style={s.checkboxRow}
                onPress={() => toggleNewEquipment(option.key)}
              >
                <View style={[s.checkbox, checked && s.checkboxChecked]}>
                  <Text style={s.checkboxMark}>{checked ? '\u2713' : ''}</Text>
                </View>
                <View style={s.checkboxTextWrap}>
                  <Text style={s.checkboxTitle} numberOfLines={2}>
                    {option.name}
                    {option.id ? ` (ID ${option.id})` : ''}
                  </Text>
                  {optionMeta ? (
                    <Text style={s.checkboxMeta} numberOfLines={2}>
                      {optionMeta}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <Text style={s.noEquipmentHint}>
          {'\u041f\u043e \u0430\u0434\u0440\u0435\u0441\u0443 \u0441\u043f\u0438\u0441\u043e\u043a \u0421\u041a \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d. \u041c\u043e\u0436\u043d\u043e \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0432\u0440\u0443\u0447\u043d\u0443\u044e.'}
        </Text>
      )}

      {manualNewEquipment.map((eq, index) => (
        <View key={`new-${index}-${eq.id}-${eq.name}`} style={s.equipmentRow}>
          <TextInput
            style={[s.input, { flex: 1, marginBottom: 0 }]}
            placeholder={`ID \u0421\u041a ${index + 1}`}
            placeholderTextColor={C.sub}
            value={eq.id}
            onChangeText={(v) => updateManualNewEquipment(index, 'id', v)}
          />
          <TextInput
            style={[s.input, { flex: 2, marginBottom: 0 }]}
            placeholder={'\u041d\u0430\u0438\u043c\u0435\u043d\u043e\u0432\u0430\u043d\u0438\u0435'}
            placeholderTextColor={C.sub}
            value={eq.name}
            onChangeText={(v) => updateManualNewEquipment(index, 'name', v)}
          />
          <TouchableOpacity onPress={() => removeManualNewEquipment(index)} style={s.removeBtn}>
            <Text style={s.removeBtnText}>{'\u2715'}</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* REPLACEMENT REASON */}
      <Text style={s.label}>{'\u041f\u0440\u0438\u0447\u0438\u043d\u0430 \u0437\u0430\u043c\u0435\u043d\u044b'}</Text>
      <TextInput
        value={replacementReason}
        onChangeText={setReplacementReason}
        style={[s.input, s.multiline]}
        placeholder={'\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u043f\u0440\u0438\u0447\u0438\u043d\u0443 \u0437\u0430\u043c\u0435\u043d\u044b \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u044f'}
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
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  addBtn: { color: C.success, fontSize: 13, fontWeight: '600' },
  hint: { color: C.sub, fontSize: 13, marginBottom: 8 },
  selectedExecutorCard: {
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginBottom: 12,
  },
  executorRow: { flexDirection: 'row', alignItems: 'center' },
  executorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  executorAvatarText: { color: C.bg, fontSize: 14, fontWeight: '700' },
  executorInfo: { flex: 1 },
  executorName: { color: C.text, fontSize: 14, fontWeight: '600' },
  executorEmail: { color: C.sub, fontSize: 12, marginTop: 2 },
  removeBtnText: { color: C.danger, fontSize: 16, padding: 8 },
  equipmentSourceCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    marginBottom: 12,
    paddingVertical: 6,
  },
  equipmentSourceTitle: {
    color: C.sub,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    borderColor: C.accent,
    backgroundColor: 'rgba(0,217,255,0.18)',
  },
  checkboxMark: {
    color: C.accent,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  checkboxTextWrap: { flex: 1 },
  checkboxTitle: { color: C.text, fontSize: 13, fontWeight: '600' },
  checkboxMeta: { color: C.sub, fontSize: 11, marginTop: 3 },
  noEquipmentHint: {
    color: C.sub,
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 18,
  },
  equipmentRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  removeBtn: { padding: 10 },
  removeBtnText: { color: C.danger, fontSize: 16 },
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