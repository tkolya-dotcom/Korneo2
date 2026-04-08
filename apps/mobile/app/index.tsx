import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../src/providers/AuthProvider';

export default function Entry() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0F' }}>
        <ActivityIndicator color="#00D9FF" />
      </View>
    );
  }

  return session ? <Redirect href="/(app)" /> : <Redirect href="/(auth)/login" />;
}
