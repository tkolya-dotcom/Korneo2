import { Stack } from 'expo-router';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from '@/src/providers/AuthProvider';
import { COLORS } from '@/src/theme/colors';

// Тема Cyberpunk
const THEME = {
  bg: '#0A0A0F',
  accent: '#00D9FF',
};

const RootNavigator = () => {
  const { loading, session, user } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={styles.logo}>КОРНЕО</Text>
        <ActivityIndicator color={THEME.accent} size="large" style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {session && user ? (
        <Stack.Screen name="(app)" />
      ) : (
        <Stack.Screen name="auth" />
      )}
    </Stack>
  );
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: THEME.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    color: THEME.accent,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 3,
  },
});