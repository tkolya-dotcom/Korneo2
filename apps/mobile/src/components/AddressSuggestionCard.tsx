import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type AddressSuggestion = {
  address?: string | null;
  district?: string | null;
  sk_name?: string | null;
  sk_count?: number | null;
  servisnyy_id?: string | null;
  source_label?: string | null;
  lat?: number | null;
  lng?: number | null;
};

type AddressSuggestionCardProps = {
  item: AddressSuggestion;
  onPress: () => void;
  actionLabel?: string;
  disabled?: boolean;
};

const C = {
  card: '#1A1A2E',
  text: '#E0E0E0',
  sub: '#8892a0',
  border: 'rgba(0, 217, 255, 0.15)',
  accent: '#00D9FF',
};

const formatCoord = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value.toFixed(6);
};

const normalizeSourceLabel = (raw: unknown) => {
  const value = String(raw || '').trim();
  if (!value) return '';

  const normalized = value
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim();

  if (
    normalized.includes('atss') ||
    normalized.includes('\u0430\u0442\u0441\u0441') ||
    normalized.includes('atss_q1_2026')
  ) {
    return '\u0410\u0422\u0421\u0421';
  }

  if (
    normalized.includes('kasip') ||
    normalized.includes('kasip_azm_q1_2026') ||
    normalized.includes('\u043a\u0430\u0441\u0438\u043f')
  ) {
    return '\u041a\u0410\u0421\u0418\u041f';
  }

  return value;
};

const getFriendlySourceLabel = (item: AddressSuggestion) => {
  const source = (item as AddressSuggestion & { source?: string | null }).source;
  return normalizeSourceLabel(item.source_label || source);
};

export const normalizeAddressForDisplay = (value?: string | null) => {
  const source = String(value || '').replace(/\r/g, '\n').trim();
  if (!source) {
    return '';
  }

  const parts = source
    .split(/\n+/)
    .flatMap((line) => line.split(/\s{2,}|;\s*/))
    .map((line) => line.trim())
    .filter(Boolean);

  if (!parts.length) {
    return source.replace(/\s+/g, ' ').trim();
  }

  const seen = new Set<string>();
  const uniqueParts = parts.filter((part) => {
    const key = part
      .toLowerCase()
      .replace(/\u0451/g, '\u0435')
      .replace(/[.,;:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return uniqueParts.join(', ');
};

export const buildAddressSummary = (item?: AddressSuggestion | null) => {
  if (!item) {
    return {
      address: '',
      meta: '',
    };
  }

  const address = normalizeAddressForDisplay(item.address);
  const sourceLabel = getFriendlySourceLabel(item);
  const lat = formatCoord(item.lat);
  const lng = formatCoord(item.lng);
  const coords = lat && lng ? `${lat}, ${lng}` : '';

  const meta = [
    sourceLabel ? `\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a ${sourceLabel}` : null,
    item.district ? `\u0420\u0430\u0439\u043e\u043d ${item.district}` : null,
    item.sk_name || null,
    typeof item.sk_count === 'number' && item.sk_count > 0 ? `${item.sk_count} \u0421\u041a` : null,
    item.servisnyy_id ? `ID ${item.servisnyy_id}` : null,
    coords ? `\u041a\u043e\u043e\u0440\u0434. ${coords}` : null,
  ]
    .filter(Boolean)
    .join(' \u2022 ');

  return { address, meta };
};

export default function AddressSuggestionCard({
  item,
  onPress,
  actionLabel = '\u0412\u044b\u0431\u0440\u0430\u0442\u044c',
  disabled,
}: AddressSuggestionCardProps) {
  const displayAddress = normalizeAddressForDisplay(item.address);
  const sourceLabel = getFriendlySourceLabel(item);
  const meta1 = [item.district, sourceLabel].filter(Boolean).join(' \u2022 ');
  const meta2 = [
    item.sk_name,
    typeof item.sk_count === 'number' && item.sk_count > 0 ? `${item.sk_count} \u0421\u041a` : null,
    item.servisnyy_id ? `ID: ${item.servisnyy_id}` : null,
  ]
    .filter(Boolean)
    .join(' \u2022 ');

  const lat = formatCoord(item.lat);
  const lng = formatCoord(item.lng);
  const coords = lat && lng ? `${lat}, ${lng}` : '';

  return (
    <TouchableOpacity style={s.row} onPress={onPress} disabled={disabled}>
      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={2}>
          {displayAddress || '\u0411\u0435\u0437 \u0430\u0434\u0440\u0435\u0441\u0430'}
        </Text>
        {meta1 ? (
          <Text style={s.meta} numberOfLines={1}>
            {meta1}
          </Text>
        ) : null}
        {meta2 ? (
          <Text style={s.meta} numberOfLines={2}>
            {meta2}
          </Text>
        ) : null}
        {coords ? (
          <Text style={s.coords} numberOfLines={1}>
            {'\u041a\u043e\u043e\u0440\u0434\u0438\u043d\u0430\u0442\u044b:'} {coords}
          </Text>
        ) : null}
      </View>
      <Text style={s.action}>{disabled ? '\u2026' : actionLabel}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: C.card,
  },
  title: { color: C.text, fontSize: 13, fontWeight: '600' },
  meta: { color: C.sub, fontSize: 11, marginTop: 2 },
  coords: { color: C.sub, fontSize: 10, marginTop: 2, opacity: 0.9 },
  action: {
    color: C.accent,
    fontSize: 12,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
    minWidth: 60,
    textAlign: 'center',
  },
});
