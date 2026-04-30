import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type AddressItem = Record<string, any>;

export const normalizeAddressForDisplay = (value: string) =>
  String(value || '').replace(/\s+/g, ' ').trim();

export const buildAddressSummary = (item: AddressItem | null) => {
  if (!item) {
    return { address: '', meta: '' };
  }
  const address = normalizeAddressForDisplay(String(item.address || item.full_address || ''));
  const metaParts = [
    item.district ? `Район: ${String(item.district)}` : null,
    item.emts ? `EMTS: ${String(item.emts)}` : null,
    item.servisnyy_id ? `ID: ${String(item.servisnyy_id)}` : null,
    item.sk_name ? `СК: ${String(item.sk_name)}` : null,
    item.source_label ? String(item.source_label) : null,
  ].filter(Boolean);
  return {
    address,
    meta: metaParts.join(' • '),
  };
};

type Props = {
  item: AddressItem;
  onPress: () => void;
  disabled?: boolean;
  actionLabel?: string;
};

export default function AddressSuggestionCard({
  item,
  onPress,
  disabled = false,
  actionLabel = '',
}: Props) {
  const summary = buildAddressSummary(item);

  return (
    <TouchableOpacity
      style={[s.card, disabled && s.cardDisabled]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
    >
      <View style={s.textBlock}>
        <Text style={s.address} numberOfLines={2}>
          {summary.address || 'Адрес'}
        </Text>
        {summary.meta ? (
          <Text style={s.meta} numberOfLines={2}>
            {summary.meta}
          </Text>
        ) : null}
      </View>
      {actionLabel ? <Text style={s.action}>{actionLabel}</Text> : null}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0,217,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardDisabled: { opacity: 0.6 },
  textBlock: { flex: 1 },
  address: { color: '#E0E0E0', fontSize: 14, fontWeight: '600' },
  meta: { color: '#8892A0', fontSize: 12, marginTop: 4 },
  action: { color: '#00D9FF', fontSize: 13, fontWeight: '700' },
});
