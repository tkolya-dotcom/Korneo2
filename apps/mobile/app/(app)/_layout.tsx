import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, useWindowDimensions } from 'react-native';
import { COLORS } from '@/src/theme/colors';
import { useAuth } from '@/src/providers/AuthProvider';
import LoadingVideo from '@/src/components/LoadingVideo';

type TabIconName = keyof typeof Ionicons.glyphMap;

const labels = {
  home: '\u0413\u043b\u0430\u0432\u043d\u0430\u044f',
  projects: '\u041f\u0440\u043e\u0435\u043a\u0442\u044b',
  tasks: '\u0417\u0430\u0434\u0430\u0447\u0438',
  installations: '\u041c\u043e\u043d\u0442\u0430\u0436\u0438',
  requests: '\u0417\u0430\u044f\u0432\u043a\u0438',
  chats: '\u0427\u0430\u0442\u044b',
};

const tabIcon =
  (name: TabIconName) =>
  ({ color, size }: { color: string; size: number }) =>
    <Ionicons name={name} color={color} size={size} />;

export default function AppTabsLayout() {
  const { loading, session, user } = useAuth();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const hasActiveSession = Boolean(session?.access_token || user?.id);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg }}>
        <LoadingVideo size={210} />
      </View>
    );
  }

  if (!hasActiveSession) {
    return <Redirect href="/auth" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: COLORS.accent,
        headerTitleStyle: { fontWeight: '700', color: COLORS.text },
        headerShadowVisible: false,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: !isLandscape,
        tabBarLabelPosition: 'below-icon',
        tabBarAllowFontScaling: false,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: isLandscape ? (Platform.OS === 'ios' ? 58 : 52) : Platform.OS === 'ios' ? 80 : 62,
          paddingTop: isLandscape ? 2 : 4,
          paddingBottom: isLandscape ? 2 : Platform.OS === 'ios' ? 14 : 6,
        },
        tabBarItemStyle: { paddingVertical: isLandscape ? 0 : 2, minWidth: 0, justifyContent: 'center' },
        tabBarIconStyle: { marginTop: 0 },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.sub,
        tabBarLabelStyle: { fontSize: 10, lineHeight: 12, fontWeight: '700', marginBottom: 1 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: labels.home,
          tabBarLabel: labels.home,
          tabBarIcon: tabIcon('home-outline'),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: labels.projects,
          tabBarLabel: labels.projects,
          tabBarIcon: tabIcon('folder-open-outline'),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: labels.tasks,
          tabBarLabel: labels.tasks,
          tabBarIcon: tabIcon('checkbox-outline'),
        }}
      />
      <Tabs.Screen
        name="installations"
        options={{
          title: labels.installations,
          tabBarLabel: labels.installations,
          tabBarIcon: tabIcon('construct-outline'),
        }}
      />
      <Tabs.Screen
        name="purchase-requests"
        options={{
          title: labels.requests,
          tabBarLabel: labels.requests,
          tabBarIcon: tabIcon('cart-outline'),
        }}
      />
      <Tabs.Screen
        name="messenger"
        options={{
          title: labels.chats,
          tabBarLabel: labels.chats,
          tabBarIcon: tabIcon('chatbubbles-outline'),
        }}
      />

      <Tabs.Screen name="archive" options={{ href: null }} />
      <Tabs.Screen name="project" options={{ href: null }} />
      <Tabs.Screen name="project/[id]" options={{ href: null }} />
      <Tabs.Screen name="project/create" options={{ href: null }} />
      <Tabs.Screen name="task" options={{ href: null }} />
      <Tabs.Screen name="task/[id]" options={{ href: null }} />
      <Tabs.Screen name="task/create/index" options={{ href: null }} />
      <Tabs.Screen name="task/[id]/comments/index" options={{ href: null }} />
      <Tabs.Screen name="installation" options={{ href: null }} />
      <Tabs.Screen name="installation/[id]" options={{ href: null }} />
      <Tabs.Screen name="installation/create/index" options={{ href: null }} />
      <Tabs.Screen name="installation/[id]/comments/index" options={{ href: null }} />
      <Tabs.Screen name="purchase-request" options={{ href: null }} />
      <Tabs.Screen name="purchase-request/[id]" options={{ href: null }} />
      <Tabs.Screen name="purchase-request/create" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="user/[id]" options={{ href: null }} />
      <Tabs.Screen name="chat/[id]" options={{ href: null }} />
      <Tabs.Screen name="warehouse" options={{ href: null }} />
      <Tabs.Screen name="avr" options={{ href: null }} />
      <Tabs.Screen name="avr/create" options={{ href: null }} />
      <Tabs.Screen name="avr/[id]" options={{ href: null }} />
      <Tabs.Screen name="calendar" options={{ href: null }} />
      <Tabs.Screen name="sites" options={{ href: null }} />
      <Tabs.Screen name="site/[id]" options={{ href: null }} />
      <Tabs.Screen name="users" options={{ href: null }} />
      <Tabs.Screen name="atss" options={{ href: null }} />
    </Tabs>
  );
}
