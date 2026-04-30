import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { ROLES } from '@/src/providers/AuthProvider';

const COLORS = { bg: '#0f172a', card: '#1e293b', accent: '#02d7ff', text: '#e8f1ff', sub: '#9ab0c5', border: '#1e2a35', green: '#22c55e', red: '#ef4444' };

const getRoleDisplay = (role: string) => {
  switch (role) {
    case ROLES.MANAGER: return { icon: '👔', name: 'Менеджер' };
    case ROLES.DEPUTY_HEAD: return { icon: '👨‍💼', name: 'Зам. начальника' };
    case ROLES.ADMIN: return { icon: '🔐', name: 'Администратор' };
    case ROLES.ENGINEER: return { icon: '📐', name: 'Инженер' };
    case ROLES.WORKER: return { icon: '🔧', name: 'Монтажник' };
    default: return { icon: '👤', name: role };
  }
};

export default function UsersScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data } = await supabase.from('users').select('*').order('name');
      setUsers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color={COLORS.accent} size="large" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Сотрудники</Text>
        <Text style={styles.count}>{users.length}</Text>
      </View>

      <FlatList
        data={users}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>Сотрудников нет</Text>}
        renderItem={({ item }) => {
          const roleDisplay = getRoleDisplay(item.role);
          return (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name || 'Без имени'}</Text>
                <Text style={styles.email}>{item.email}</Text>
                <View style={styles.roleRow}>
                  <Text style={styles.roleIcon}>{roleDisplay.icon}</Text>
                  <Text style={styles.roleText}>{roleDisplay.name}</Text>
                </View>
              </View>
              <View style={styles.statusContainer}>
                <View style={[styles.statusDot, item.is_online ? styles.online : styles.offline]} />
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 48 },
  title: { color: COLORS.text, fontSize: 26, fontWeight: '700' },
  count: { color: COLORS.sub, fontSize: 16 },
  empty: { color: COLORS.sub, textAlign: 'center', marginTop: 60, fontSize: 16 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.accent + '33', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: COLORS.accent, fontSize: 20, fontWeight: '700' },
  info: { flex: 1, marginLeft: 12 },
  name: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  email: { color: COLORS.sub, fontSize: 12, marginTop: 2 },
  roleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  roleIcon: { fontSize: 12 },
  roleText: { color: COLORS.sub, fontSize: 12, marginLeft: 4 },
  statusContainer: { marginLeft: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  online: { backgroundColor: COLORS.green },
  offline: { backgroundColor: COLORS.sub },
});
