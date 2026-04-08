import { Pressable, Text, View } from 'react-native';
import { useAuth } from '../../src/providers/AuthProvider';

export default function DashboardScreen() {
  const { signOut } = useAuth();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0F', padding: 20 }}>
      <Text style={{ color: '#00FF88', fontSize: 24 }}>Korneo Dashboard</Text>
      <Text style={{ color: '#E0E0E0', marginTop: 8 }}>Этап 2: Auth + Session Restore готов</Text>
      <Pressable onPress={signOut} style={{ marginTop: 16, backgroundColor: '#00D9FF', padding: 12, borderRadius: 8 }}>
        <Text style={{ color: '#0A0A0F', fontWeight: '700' }}>Выйти</Text>
      </Pressable>
    </View>
  );
}
