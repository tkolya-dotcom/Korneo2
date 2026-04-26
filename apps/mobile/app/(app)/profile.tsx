import { Alert, Pressable, Text, View } from 'react-native';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme/colors';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();

  const onLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось выйти');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, gap: 10 }}>
      <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '700' }}>Профиль</Text>
      <Text style={{ color: colors.textSecondary }}>Пользователь: {session?.user.email}</Text>
      <Pressable onPress={onLogout} style={{ backgroundColor: colors.danger, borderRadius: 10, padding: 12, alignSelf: 'flex-start' }}>
        <Text style={{ color: 'white', fontWeight: '700' }}>Выйти</Text>
      </Pressable>
    </View>
  );
}
