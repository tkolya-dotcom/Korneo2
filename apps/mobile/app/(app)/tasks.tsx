import { FlatList, Text, View } from 'react-native';
import { colors } from '@/src/theme/colors';

const mockTasks = [
  { id: '1', title: 'Проверка оборудования', status: 'in_progress' },
  { id: '2', title: 'Монтаж на объекте #42', status: 'new' },
];

export default function TasksScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}>
      <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 12 }}>Задачи</Text>
      <FlatList
        data={mockTasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{item.title}</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4 }}>Статус: {item.status}</Text>
          </View>
        )}
      />
    </View>
  );
}
