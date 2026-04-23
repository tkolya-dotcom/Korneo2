import React, { useState } from 'react';
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
import { useAuth } from '@/src/providers/AuthProvider';

const COLORS = {
  bg: '#0f172a',
  card: '#1e293b',
  accent: '#02d7ff',
  text: '#e8f1ff',
  sub: '#9ab0c5',
  border: '#1e2a35',
};

const text = {
  error: '\u041e\u0448\u0438\u0431\u043a\u0430',
  fillCredentials: '\u0417\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 email \u0438 \u043f\u0430\u0440\u043e\u043b\u044c',
  enterName: '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0438\u043c\u044f',
  unknownError: '\u041d\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043d\u0430\u044f \u043e\u0448\u0438\u0431\u043a\u0430',
  logo: '\u041a\u043e\u0440\u043d\u0435\u043e',
  tagline: '\u0421\u0438\u0441\u0442\u0435\u043c\u0430 \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u044f \u0441\u0442\u0440\u043e\u0439\u043a\u043e\u0439',
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
  const { signIn, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'worker' | 'engineer'>('worker');
  const [loading, setLoading] = useState(false);

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
      Alert.alert(text.error, e?.message || text.unknownError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.logoBox}>
          <Text style={styles.logo}>{text.logo}</Text>
          <Text style={styles.tagline}>{text.tagline}</Text>
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
  tagline: { color: COLORS.sub, fontSize: 14, marginTop: 6 },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 24 },
  tabs: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#0f172a', borderRadius: 10, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  activeTab: { backgroundColor: COLORS.accent },
  tabText: { color: COLORS.sub, fontWeight: '600', fontSize: 14 },
  activeTabText: { color: '#fff' },
  input: {
    backgroundColor: '#0f172a',
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
