import { Text, View } from 'react-native';
import { colors } from '@/src/theme/colors';

export default function DashboardScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, gap: 8 }}>
      <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '700' }}>Dashboard</Text>
      <Text style={{ color: colors.textSecondary }}>
        MVP-экран. Следующий шаг: реальная аналитика задач/АВР из Supabase.
      </Text>
    </View>
  );
}
