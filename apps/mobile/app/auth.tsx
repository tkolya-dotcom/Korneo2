import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';

<<<<<<< HEAD
// Cyberpunk theme - cyan as in web app
const C = { bg: '#0A0A0F', card: '#1A1A2E', accent: '#00D9FF', text: '#E0E0E0', sub: '#8892a0', border: 'rgba(0, 217, 255, 0.15)', danger: '#FF3366', green: '#00FF88' };

// Маппинг ошибок как в веб-приложении
const mapAuthError = (message: string) => {
  const errorMessages: Record<string, string> = {
    'Invalid login credentials': 'Неверный email или пароль',
    'Email not confirmed': 'Email не подтверждён',
    'User already registered': 'Пользователь уже существует',
    'Weak password': 'Слишком слабый пароль (мин. 6 символов)',
    'Over request rate limit': 'Слишком много запросов, попробуйте позже',
  };
  return errorMessages[message] || message;
};
=======
const COLORS = { bg: '#0f172a', card: '#1e293b', accent: '#02d7ff', text: '#e8f1ff', sub: '#9ab0c5', border: '#1e2a35', red: '#ef4444' };
>>>>>>> dd3744c539c31c2d34149066cd6bfad4332e3c60

export default function AuthScreen() {
  const { signIn, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'worker' | 'engineer'>('worker');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!email.trim()) { setError('Введите email'); return; }
    if (!password) { setError('Введите пароль'); return; }
    
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
        router.replace('/(app)');
      } else {
        if (!name.trim()) { setError('Введите имя'); setLoading(false); return; }
        await register(email.trim(), password, name.trim(), role);
        router.replace('/(app)');
      }
    } catch (e: any) {
      const errorMessage = mapAuthError(e?.message || 'Неизвестная ошибка');
      setError(errorMessage);
      Alert.alert('Ошибка', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.logoBox}>
          <Text style={styles.logo}>КОРНЕО</Text>
          <Text style={styles.tagline}>Система управления стройкой</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.tabs}>
            <TouchableOpacity style={[styles.tab, mode === 'login' && styles.activeTab]} onPress={() => { setMode('login'); setError(''); }}>
              <Text style={[styles.tabText, mode === 'login' && styles.activeTabText]}>Вход</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, mode === 'register' && styles.activeTab]} onPress={() => { setMode('register'); setError(''); }}>
              <Text style={[styles.tabText, mode === 'register' && styles.activeTabText]}>Регистрация</Text>
            </TouchableOpacity>
          </View>

          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

          {mode === 'register' && (
            <TextInput style={styles.input} placeholder="Имя" placeholderTextColor={C.sub} value={name} onChangeText={setName} />
          )}

          <TextInput style={styles.input} placeholder="Email" placeholderTextColor={C.sub} value={email}
            onChangeText={(text) => { setEmail(text); setError(''); }} autoCapitalize="none" keyboardType="email-address" />

          <TextInput style={styles.input} placeholder="Пароль" placeholderTextColor={C.sub} value={password}
            onChangeText={(text) => { setPassword(text); setError(''); }} secureTextEntry />

          {mode === 'register' && (
            <View style={styles.roleRow}>
              <Text style={styles.roleLabel}>Роль:</Text>
              <TouchableOpacity style={[styles.roleBtn, role === 'worker' && styles.activeRole]} onPress={() => setRole('worker')}>
                <Text style={[styles.roleBtnText, role === 'worker' && styles.activeRoleTxt]}>Монтажник</Text>
              </TouchableOpacity>
<<<<<<< HEAD
              <TouchableOpacity style={[styles.roleBtn, role === 'engineer' && styles.activeRole]} onPress={() => setRole('engineer')}>
=======
              <TouchableOpacity
                style={[styles.roleBtn, role === 'engineer' && styles.activeRole]}
                onPress={() => setRole('engineer')}
              >
>>>>>>> dd3744c539c31c2d34149066cd6bfad4332e3c60
                <Text style={[styles.roleBtnText, role === 'engineer' && styles.activeRoleTxt]}>Инженер</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#0A0A0F" size="small" /> : <Text style={styles.btnText}>{mode === 'login' ? 'ВОЙТИ' : 'ЗАРЕГИСТРИРОВАТЬСЯ'}</Text>}
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>Только монтажники и инженеры могут регистрироваться самостоятельно</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoBox: { alignItems: 'center', marginBottom: 40 },
  logo: { color: C.accent, fontSize: 42, fontWeight: '800', letterSpacing: 3, textShadowColor: C.accent, textShadowRadius: 20 },
  tagline: { color: C.sub, fontSize: 14, marginTop: 8 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: C.border },
  tabs: { flexDirection: 'row', marginBottom: 20, backgroundColor: C.bg, borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  activeTab: { backgroundColor: C.accent },
  tabText: { color: C.sub, fontWeight: '600', fontSize: 14 },
  activeTabText: { color: C.bg, fontWeight: '700' },
  errorBox: { backgroundColor: 'rgba(255, 51, 102, 0.1)', borderWidth: 1, borderColor: C.danger, borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText: { color: C.danger, fontSize: 13, textAlign: 'center' },
  input: { backgroundColor: C.bg, color: C.text, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 15 },
  roleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  roleLabel: { color: C.sub, fontSize: 14 },
  roleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  activeRole: { borderColor: C.accent, backgroundColor: 'rgba(0, 217, 255, 0.1)' },
  roleBtnText: { color: C.sub, fontSize: 13, fontWeight: '600' },
  activeRoleTxt: { color: C.accent },
  btn: { backgroundColor: C.accent, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: C.bg, fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  hint: { color: C.sub, fontSize: 11, textAlign: 'center', marginTop: 16 },
});