import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { supabase } from '../../src/lib/supabase';

export default function RecoveryScreen() {
  const [email, setEmail] = useState('');

  const onRecovery = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      Alert.alert('Ошибка', error.message);
      return;
    }
    Alert.alert('Готово', 'Инструкция отправлена на email.');
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#0A0A0F' }}>
      <Text style={{ color: '#00D9FF', fontSize: 28, marginBottom: 20 }}>Восстановление</Text>
      <TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" style={{ backgroundColor: '#1A1A2E', color: '#E0E0E0', marginBottom: 14, padding: 12, borderRadius: 8 }} />
      <Pressable onPress={onRecovery} style={{ backgroundColor: '#00D9FF', padding: 12, borderRadius: 8, alignItems: 'center' }}>
        <Text style={{ color: '#0A0A0F', fontWeight: '700' }}>Отправить</Text>
      </Pressable>
    </View>
  );
}
