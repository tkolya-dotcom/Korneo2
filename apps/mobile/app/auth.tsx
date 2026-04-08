import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme/colors';

export default function AuthScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    try {
      setSubmitting(true);
      await signIn(email.trim(), password);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown login error';
      Alert.alert('Ошибка входа', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 20, justifyContent: 'center', gap: 12 }}>
      <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '700' }}>Korneo</Text>
      <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Вход в мобильное приложение</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor={colors.textSecondary}
        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.textPrimary }}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Пароль"
        placeholderTextColor={colors.textSecondary}
        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.textPrimary }}
      />
      <Pressable
        onPress={onSubmit}
        disabled={submitting}
        style={{ backgroundColor: colors.accent, borderRadius: 10, padding: 14, alignItems: 'center', opacity: submitting ? 0.6 : 1 }}
      >
        <Text style={{ color: '#00131b', fontWeight: '700' }}>{submitting ? 'Входим...' : 'Войти'}</Text>
      </Pressable>
    </View>
  );
}
