import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '@/src/providers/AuthProvider';
import { COLORS as THEME_COLORS } from '@/src/theme/colors';

const COLORS = { bg: '#0f172a', card: '#1e293b', accent: '#02d7ff', text: '#e8f1ff', sub: '#9ab0c5', border: '#1e2a35', red: '#ef4444' };

export default function AuthScreen() {
  const { signIn, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'manager' | 'worker' | 'engineer'>('worker');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Ошибка', 'Заполните email и пароль');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        if (!name.trim()) { Alert.alert('Ошибка', 'Введите имя'); return; }
        await register(email.trim(), password, name.trim(), role);
      }
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message || 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.logoBox}>
          <Text style={styles.logo}>Корнео</Text>
          <Text style={styles.tagline}>Система управления стройкой</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, mode === 'login' && styles.activeTab]}
              onPress={() => setMode('login')}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.activeTabText]}>Вход</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'register' && styles.activeTab]}
              onPress={() => setMode('register')}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.activeTabText]}>Регистрация</Text>
            </TouchableOpacity>
          </View>

          {mode === 'register' && (
            <TextInput
              style={styles.input}
              placeholder="Имя"
              placeholderTextColor={COLORS.sub}
              value={name}
              onChangeText={setName}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={COLORS.sub}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Пароль"
            placeholderTextColor={COLORS.sub}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {mode === 'register' && (
            <View style={styles.roleRow}>
              <Text style={styles.roleLabel}>Роль:</Text>
              <TouchableOpacity
                style={[styles.roleBtn, role === 'worker' && styles.activeRole]}
                onPress={() => setRole('worker')}
              >
                <Text style={[styles.roleBtnText, role === 'worker' && styles.activeRoleTxt]}>Монтажник</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleBtn, role === 'engineer' && styles.activeRole]}
                onPress={() => setRole('engineer')}
              >
                <Text style={[styles.roleBtnText, role === 'engineer' && styles.activeRoleTxt]}>Инженер</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleBtn, role === 'manager' && styles.activeRole]}
                onPress={() => setRole('manager')}
              >
                <Text style={[styles.roleBtnText, role === 'manager' && styles.activeRoleTxt]}>Менеджер</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.btnText}>
              {loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoBox: { alignItems: 'center', marginBottom: 32 },
  logo: { color: COLORS.accent, fontSize: 40, fontWeight: '800', letterSpacing: 1 },
  tagline: { color: COLORS.sub, fontSize: 14, marginTop: 6 },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 24 },
  tabs: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#0f172a', borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  activeTab: { backgroundColor: COLORS.accent },
  tabText: { color: COLORS.sub, fontWeight: '600', fontSize: 14 },
  activeTabText: { color: '#fff' },
  input: { backgroundColor: '#0f172a', color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 15 },
  roleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  roleLabel: { color: COLORS.sub, fontSize: 14 },
  roleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  activeRole: { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '22' },
  roleBtnText: { color: COLORS.sub, fontSize: 13, fontWeight: '600' },
  activeRoleTxt: { color: COLORS.accent },
  btn: { backgroundColor: COLORS.accent, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
