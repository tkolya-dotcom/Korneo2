import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { supabase } from '../../src/lib/supabase';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onRegister = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      Alert.alert('Ошибка регистрации', error.message);
      return;
    }
    Alert.alert('Успешно', 'Проверьте email для подтверждения аккаунта.');
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#0A0A0F' }}>
      <Text style={{ color: '#00D9FF', fontSize: 28, marginBottom: 20 }}>Регистрация</Text>
      <TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" style={{ backgroundColor: '#1A1A2E', color: '#E0E0E0', marginBottom: 10, padding: 12, borderRadius: 8 }} />
      <TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry style={{ backgroundColor: '#1A1A2E', color: '#E0E0E0', marginBottom: 14, padding: 12, borderRadius: 8 }} />
      <Pressable onPress={onRegister} style={{ backgroundColor: '#00D9FF', padding: 12, borderRadius: 8, alignItems: 'center' }}>
        <Text style={{ color: '#0A0A0F', fontWeight: '700' }}>Создать аккаунт</Text>
      </Pressable>
    </View>
  );
}
