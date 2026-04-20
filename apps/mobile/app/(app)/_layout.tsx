import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuth } from '@/src/providers/AuthProvider';

// Cyberpunk theme - как в веб-приложении
const THEME = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  text: '#E0E0E0',
  sub: '#8892a0',
  border: 'rgba(0, 217, 255, 0.15)',
  green: '#00FF88',
};

export default function AppTabsLayout() {
  const { canCreateTasks, isManagerOrHigher } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: THEME.card },
        headerTintColor: THEME.accent,
        headerTitleStyle: { fontWeight: '600', letterSpacing: 0.5 },
        tabBarStyle: {
          backgroundColor: THEME.card,
          borderTopColor: THEME.border,
          borderTopWidth: 1,
          paddingTop: 4,
          height: 60,
        },
        tabBarActiveTintColor: THEME.accent,
        tabBarInactiveTintColor: THEME.sub,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
      }}
    >
      {/* Главная */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Главная',
          tabBarLabel: 'Главная',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>🏠</Text>,
        }}
      />
      
      {/* Проекты */}
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Проекты',
          tabBarLabel: 'Проекты',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>📁</Text>,
        }}
      />
      
      {/* Задачи */}
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Задачи',
          tabBarLabel: 'Задачи',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>✅</Text>,
        }}
      />
      
      {/* Монтажи */}
      <Tabs.Screen
        name="installations"
        options={{
          title: 'Монтажи',
          tabBarLabel: 'Монтажи',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>🔧</Text>,
        }}
      />
      
      {/* АВР - только для инженеров и менеджеров */}
      {canCreateTasks && (
        <Tabs.Screen
          name="avr"
          options={{
            title: 'АВР',
            tabBarLabel: 'АВР',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>⚡</Text>,
          }}
        />
      )}
      
      {/* Чат - основной функционал */}
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Чат',
          tabBarLabel: 'Чат',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>💬</Text>,
        }}
      />
      
      {/* Склад - только для менеджеров */}
      {isManagerOrHigher && (
        <Tabs.Screen
          name="warehouse"
          options={{
            title: 'Склад',
            tabBarLabel: 'Склад',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>📦</Text>,
          }}
        />
      )}
      
      {/* Заявки */}
      <Tabs.Screen
        name="users"
        options={{
          title: 'Люди',
          tabBarLabel: 'Люди',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👥</Text>,
        }}
      />
      
      {/* Площадки */}
      <Tabs.Screen
        name="sites"
        options={{
          title: 'Площадки',
          tabBarLabel: 'Карта',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>🗺️</Text>,
        }}
      />
      
      {/* Профиль */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
tabBarLabel: 'Профиль',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>👤</Text>,
        }}
      />
      {/* Hidden screens (no tab bar) */}
      <Tabs.Screen name="project/[id]" options={{ href: null }} />
      <Tabs.Screen name="project/create" options={{ href: null }} />
      <Tabs.Screen name="task/[id]" options={{ href: null }} />
      <Tabs.Screen name="task/create" options={{ href: null }} />
      <Tabs.Screen name="task/[id]/comments" options={{ href: null }} />
      <Tabs.Screen name="installation/[id]" options={{ href: null }} />
      <Tabs.Screen name="installation/create" options={{ href: null }} />
      <Tabs.Screen name="installation/[id]/comments" options={{ href: null }} />
      <Tabs.Screen name="purchase-requests" options={{ href: null }} />
    </Tabs>
  );
}
