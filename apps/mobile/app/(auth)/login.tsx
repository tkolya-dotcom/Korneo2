import { useState } from 'react';
import { Link, router } from 'expo-router';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { supabase } from '../../src/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.replace('/(app)');
    } catch (error) {
      Alert.alert('Ошибка входа', error instanceof Error ? error.message : 'Не удалось войти');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#0A0A0F' }}>
      <Text style={{ color: '#00D9FF', fontSize: 28, marginBottom: 20 }}>Korneo Login</Text>
      <TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" style={{ backgroundColor: '#1A1A2E', color: '#E0E0E0', marginBottom: 10, padding: 12, borderRadius: 8 }} />
      <TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry style={{ backgroundColor: '#1A1A2E', color: '#E0E0E0', marginBottom: 14, padding: 12, borderRadius: 8 }} />
      <Pressable onPress={onLogin} disabled={loading} style={{ backgroundColor: '#00D9FF', padding: 12, borderRadius: 8, alignItems: 'center' }}>
        <Text style={{ color: '#0A0A0F', fontWeight: '700' }}>{loading ? 'Вход...' : 'Войти'}</Text>
      </Pressable>
      <Link href="/(auth)/register" style={{ color: '#00FF88', marginTop: 12 }}>Регистрация</Link>
      <Link href="/(auth)/recovery" style={{ color: '#00FF88', marginTop: 8 }}>Восстановление пароля</Link>
    </View>
  );
}
