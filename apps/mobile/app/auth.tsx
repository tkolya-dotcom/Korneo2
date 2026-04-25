import React, { useEffect, useState } from 'react';
import {
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
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';

const COLORS = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  text: '#E0E0E0',
  sub: '#8892a0',
  border: 'rgba(0, 217, 255, 0.15)',
};

const text = {
  error: '\u041e\u0448\u0438\u0431\u043a\u0430',
  fillCredentials: '\u0417\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 email \u0438 \u043f\u0430\u0440\u043e\u043b\u044c',
  enterName: '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0438\u043c\u044f',
  unknownError: '\u041d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u0430\u044f \u043e\u0448\u0438\u0431\u043a\u0430',
  logo: '\u041a\u043e\u0440\u043d\u0435\u043e',
  loginTab: '\u0412\u0445\u043e\u0434',
  registerTab: '\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044f',
  password: '\u041f\u0430\u0440\u043e\u043b\u044c',
  name: '\u0418\u043c\u044f',
  role: '\u0420\u043e\u043b\u044c:',
  worker: '\u041c\u043e\u043d\u0442\u0430\u0436\u043d\u0438\u043a',
  engineer: '\u0418\u043d\u0436\u0435\u043d\u0435\u0440',
  loading: '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...',
  signIn: '\u0412\u043e\u0439\u0442\u0438',
  signUp: '\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c\u0441\u044f',
};

export default function AuthScreen() {
  const { signIn, register, user, session } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'worker' | 'engineer'>('worker');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hasActiveSession = Boolean(session?.access_token || user?.id);
    if (hasActiveSession) {
      router.replace('/(app)');
    }
  }, [router, session?.access_token, user?.id]);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(text.error, text.fillCredentials);
      return;
    }

    if (mode === 'register' && !name.trim()) {
      Alert.alert(text.error, text.enterName);
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        await register(email.trim(), password, name.trim(), role);
      }
    } catch (e: any) {
      const rawMessage = String(e?.message || text.unknownError);
      const normalized = rawMessage.toLowerCase();
      if (normalized.includes('timed out') || normalized.includes('timeout')) {
        Alert.alert(
          text.error,
          '\u0412\u0440\u0435\u043c\u044f \u043e\u0436\u0438\u0434\u0430\u043d\u0438\u044f \u0438\u0441\u0442\u0435\u043a\u043b\u043e. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0441\u0435\u0442\u044c \u0438 \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.'
        );
      } else {
        Alert.alert(text.error, rawMessage || text.unknownError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.logoBox}>
          <Text style={styles.logo}>{text.logo}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.tabs}>
            <TouchableOpacity style={[styles.tab, mode === 'login' && styles.activeTab]} onPress={() => setMode('login')}>
              <Text style={[styles.tabText, mode === 'login' && styles.activeTabText]}>{text.loginTab}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, mode === 'register' && styles.activeTab]} onPress={() => setMode('register')}>
              <Text style={[styles.tabText, mode === 'register' && styles.activeTabText]}>{text.registerTab}</Text>
            </TouchableOpacity>
          </View>

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
            placeholder={text.password}
            placeholderTextColor={COLORS.sub}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {mode === 'register' && (
            <TextInput
              style={styles.input}
              placeholder={text.name}
              placeholderTextColor={COLORS.sub}
              value={name}
              onChangeText={setName}
            />
          )}

          {mode === 'register' && (
            <View style={styles.roleRow}>
              <Text style={styles.roleLabel}>{text.role}</Text>
              <TouchableOpacity style={[styles.roleBtn, role === 'worker' && styles.activeRole]} onPress={() => setRole('worker')}>
                <Text style={[styles.roleBtnText, role === 'worker' && styles.activeRoleTxt]}>{text.worker}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.roleBtn, role === 'engineer' && styles.activeRole]} onPress={() => setRole('engineer')}>
                <Text style={[styles.roleBtnText, role === 'engineer' && styles.activeRoleTxt]}>{text.engineer}</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.btnText}>{loading ? text.loading : mode === 'login' ? text.signIn : text.signUp}</Text>
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
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 24 },
  tabs: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#0A0A0F', borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  activeTab: { backgroundColor: COLORS.accent },
  tabText: { color: COLORS.sub, fontWeight: '600', fontSize: 14 },
  activeTabText: { color: '#fff' },
  input: {
    backgroundColor: '#0A0A0F',
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    fontSize: 15,
  },
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
