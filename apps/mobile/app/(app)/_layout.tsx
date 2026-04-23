import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/src/theme/colors';

type TabIconName = keyof typeof Ionicons.glyphMap;

const labels = {
  home: '\u0413\u043b\u0430\u0432\u043d\u0430\u044f',
  projects: '\u041f\u0440\u043e\u0435\u043a\u0442\u044b',
  tasks: '\u0417\u0430\u0434\u0430\u0447\u0438',
  installations: '\u041c\u043e\u043d\u0442\u0430\u0436\u0438',
  profile: '\u041f\u0440\u043e\u0444\u0438\u043b\u044c',
};

const tabIcon = (name: TabIconName) =>
  ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );

export default function AppTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: COLORS.accent,
        headerTitleStyle: { fontWeight: '700', color: COLORS.text },
        headerShadowVisible: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 64,
          paddingTop: 4,
          paddingBottom: 8,
        },
        tabBarItemStyle: { paddingVertical: 2 },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.sub,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginBottom: 2 },
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
        name="profile"
        options={{
          title: labels.profile,
          tabBarLabel: labels.profile,
          tabBarIcon: tabIcon('person-circle-outline'),
        }}
      />

      <Tabs.Screen name="purchase-requests" options={{ href: null }} />
      <Tabs.Screen name="archive" options={{ href: null }} />
      <Tabs.Screen name="project/[id]" options={{ href: null }} />
      <Tabs.Screen name="task/[id]" options={{ href: null }} />
      <Tabs.Screen name="task/create/index" options={{ href: null }} />
      <Tabs.Screen name="task/[id]/comments/index" options={{ href: null }} />
      <Tabs.Screen name="installation/[id]" options={{ href: null }} />
      <Tabs.Screen name="installation/create/index" options={{ href: null }} />
      <Tabs.Screen name="installation/[id]/comments/index" options={{ href: null }} />
      <Tabs.Screen name="purchase-request/[id]" options={{ href: null }} />
    </Tabs>
  );
}
