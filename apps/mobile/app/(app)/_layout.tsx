import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { bootstrapDatabaseOnFirstLaunch, syncDatabaseInBackground } from '@/src/lib/offlineData';

const THEME = {
  card: '#1A1A2E',
  accent: '#00D9FF',
  sub: '#8892A0',
  border: 'rgba(0, 217, 255, 0.15)',
};

const icon = (emoji: string) => ({ color }: { color: string }) => (
  <Text style={{ color, fontSize: 20 }}>{emoji}</Text>
);

export default function AppTabsLayout() {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const init = async () => {
      await bootstrapDatabaseOnFirstLaunch();
      await syncDatabaseInBackground(true);
      timer = setInterval(() => {
        void syncDatabaseInBackground();
      }, 120000);
    };

    void init();
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: THEME.card },
        headerTintColor: THEME.accent,
        headerTitleStyle: { fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: THEME.card,
          borderTopColor: THEME.border,
          borderTopWidth: 1,
          height: 62,
          paddingTop: 4,
        },
        tabBarActiveTintColor: THEME.accent,
        tabBarInactiveTintColor: THEME.sub,
        tabBarLabelStyle: { fontSize: 11, marginBottom: 4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Главная',
          tabBarLabel: 'Главная',
          tabBarIcon: icon('⌂'),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Чаты',
          tabBarLabel: 'Чаты',
          tabBarIcon: icon('💬'),
        }}
      />
      <Tabs.Screen
        name="mileage"
        options={{
          title: 'Пробег',
          tabBarLabel: 'Пробег',
          tabBarIcon: icon('🛣️'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
          tabBarLabel: 'Профиль',
          tabBarIcon: icon('👤'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Настройки',
          tabBarLabel: 'Настройки',
          tabBarIcon: icon('⚙'),
        }}
      />

      <Tabs.Screen name="archive" options={{ href: null }} />
      <Tabs.Screen name="installations" options={{ href: null }} />
      <Tabs.Screen name="projects" options={{ href: null }} />
      <Tabs.Screen name="purchase-requests" options={{ href: null }} />
      <Tabs.Screen name="tasks" options={{ href: null }} />
      <Tabs.Screen name="users" options={{ href: null }} />
      <Tabs.Screen name="warehouse" options={{ href: null }} />
      <Tabs.Screen name="sites" options={{ href: null }} />
      <Tabs.Screen name="avr" options={{ href: null }} />
      <Tabs.Screen name="installation" options={{ href: null }} />
      <Tabs.Screen name="project" options={{ href: null }} />
      <Tabs.Screen name="purchase-request" options={{ href: null }} />
      <Tabs.Screen name="task" options={{ href: null }} />
    </Tabs>
  );
}
