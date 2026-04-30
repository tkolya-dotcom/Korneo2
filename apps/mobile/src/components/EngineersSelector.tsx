import React from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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

export interface Engineer {
  id: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  [key: string]: any;
}

interface EngineersSelectorProps {
  users: Engineer[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
  maxEngineers?: number;
}

export default function EngineersSelector({
  users,
  selectedIds,
  onChange,
  loading = false,
  maxEngineers = 4,
}: EngineersSelectorProps) {
  const selectedCount = selectedIds.length;

  const toggleEngineer = (userId: string) => {
    const isSelected = selectedIds.includes(userId);
    if (isSelected) {
      onChange(selectedIds.filter((id) => id !== userId));
    } else {
      if (selectedCount >= maxEngineers) {
        Alert.alert(
          '\u041e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d\u0438\u0435',
          `\u041c\u0430\u043a\u0441\u0438\u043c\u0443\u043c ${maxEngineers} \u0438\u043d\u0436\u0435\u043d\u0435\u0440\u043e\u0432`
        );
        return;
      }
      onChange([...selectedIds, userId]);
    }
  };

  const getUserName = (user: Engineer): string => {
    return user.name || user.email || `User ${user.id.slice(0, 8)}`;
  };

  const getUserInitials = (user: Engineer): string => {
    const name = getUserName(user);
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{'\u0418\u043d\u0436\u0435\u043d\u0435\u0440\u044b'}</Text>
        <Text style={styles.counter}>
          {selectedCount}/{maxEngineers}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={C.accent} />
        </View>
      ) : selectedCount > 0 ? (
        <View style={styles.selectedChips}>
          {selectedIds.map((id) => {
            const user = users.find((u) => String(u.id) === String(id));
            const name = user ? getUserName(user) : `ID: ${id}`;
            return (
              <View key={id} style={styles.chip}>
                <View style={styles.chipAvatar}>
                  <Text style={styles.chipAvatarText}>{user ? getUserInitials(user) : '?'}</Text>
                </View>
                <Text style={styles.chipText} numberOfLines={1}>
                  {name}
                </Text>
                <TouchableOpacity
                  onPress={() => toggleEngineer(id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.chipRemove}>{'\u2715'}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.hint}>{'\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u043d\u0436\u0435\u043d\u0435\u0440\u043e\u0432 \u0438\u0437 \u0441\u043f\u0438\u0441\u043a\u0430 \u043d\u0438\u0436\u0435'}</Text>
      )}

      <TouchableOpacity
        style={styles.selectBtn}
        onPress={() => {
          const availableUsers = users.filter((u) => !selectedIds.includes(String(u.id)));
          if (availableUsers.length === 0) {
            Alert.alert('\u041e\u0448\u0438\u0431\u043a\u0430', '\u041d\u0435\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0445 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435\u0439');
            return;
          }
          Alert.alert(
            selectedCount >= maxEngineers
              ? `\u0412\u044b\u0431\u0440\u0430\u043d\u043e \u043c\u0430\u043a\u0441\u0438\u043c\u0443\u043c (${maxEngineers}) \u0438\u043d\u0436\u0435\u043d\u0435\u0440\u043e\u0432`
              : '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u043d\u0436\u0435\u043d\u0435\u0440\u0430',
            '',
            [
              ...users.map((user) => ({
                text: getUserName(user),
                onPress: () => toggleEngineer(String(user.id)),
              })),
              { text: '\u041e\u0442\u043c\u0435\u043d\u0430', style: 'cancel' as const },
            ]
          );
        }}
      >
        <Text style={styles.selectBtnText}>
          {selectedCount > 0 ? '+ \u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0435\u0449\u0451' : '+ \u0412\u044b\u0431\u0440\u0430\u0442\u044c \u0438\u043d\u0436\u0435\u043d\u0435\u0440\u0430'}
        </Text>
      </TouchableOpacity>

      {selectedCount > 0 && (
        <View style={styles.listSection}>
          <Text style={styles.listLabel}>{'\u0412\u044b\u0431\u0440\u0430\u043d\u043d\u044b\u0435:'}</Text>
          {selectedIds.map((id) => {
            const user = users.find((u) => String(u.id) === String(id));
            if (!user) return null;
            return (
              <View key={id} style={styles.listItem}>
                <View style={styles.listAvatar}>
                  <Text style={styles.listAvatarText}>{getUserInitials(user)}</Text>
                </View>
                <View style={styles.listInfo}>
                  <Text style={styles.listName}>{getUserName(user)}</Text>
                  {user.email && <Text style={styles.listEmail}>{user.email}</Text>}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: C.accent,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  counter: {
    color: C.sub,
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  hint: {
    color: C.sub,
    fontSize: 13,
    marginBottom: 8,
  },
  selectedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    borderRadius: 20,
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.border,
    maxWidth: 180,
  },
  chipAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  chipAvatarText: {
    color: C.bg,
    fontSize: 10,
    fontWeight: '700',
  },
  chipText: {
    color: C.text,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
    flexShrink: 1,
  },
  chipRemove: {
    color: C.danger,
    fontSize: 14,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  selectBtn: {
    backgroundColor: C.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  selectBtnText: {
    color: C.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  listSection: {
    marginTop: 12,
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
  },
  listLabel: {
    color: C.sub,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  listAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  listAvatarText: {
    color: C.bg,
    fontSize: 12,
    fontWeight: '700',
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    color: C.text,
    fontSize: 13,
    fontWeight: '600',
  },
  listEmail: {
    color: C.sub,
    fontSize: 11,
    marginTop: 2,
  },
});