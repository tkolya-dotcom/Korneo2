import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from '@/src/providers/AuthProvider';
import { ensureDeviceRuntimeReady } from '@/src/lib/deviceRuntime';
import LoadingVideo from '@/src/components/LoadingVideo';

const THEME = {
  bg: '#0A0A0F',
  accent: '#00D9FF',
};

const RootNavigator = () => {
  const { loading, session, user } = useAuth();
  const hasActiveSession = Boolean(session?.access_token || user?.id);

  useEffect(() => {
    if (!hasActiveSession) {
      return;
    }
    void ensureDeviceRuntimeReady();
  }, [hasActiveSession, user?.id]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={styles.logo}>{'\u041a\u043e\u0440\u043d\u0435\u043e'}</Text>
        <LoadingVideo style={{ marginTop: 10 }} size={220} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {hasActiveSession ? <Stack.Screen name="(app)" /> : <Stack.Screen name="auth" />}
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
