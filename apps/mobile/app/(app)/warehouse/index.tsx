import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { warehouseApi } from '@/src/lib/supabase';

// Cyberpunk theme
const C = { bg: '#0A0A0F', card: '#1A1A2E', accent: '#00D9FF', text: '#E0E0E0', sub: '#8892a0', border: 'rgba(0, 217, 255, 0.15)', green: '#00FF88', danger: '#FF3366' };

export default function WarehouseScreen() {
  const { isManagerOrHigher } = useAuth();
  const router = useRouter();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isManagerOrHigher) {
      router.replace('/(app)');
      return;
    }
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    try {
      // Загружаем складские остатки через warehouse API с quantity_available
      const data = await warehouseApi.getAll();
      // Группируем по материалам и суммируем quantity_available
      const materialMap: any = {};
      (data || []).forEach((w: any) => {
        if (w.material_id) {
          if (!materialMap[w.material_id]) {
            materialMap[w.material_id] = {
              id: w.material_id,
              name: w.material?.name || 'Материал',
              category: w.material?.category,
              unit: w.material?.default_unit || w.material?.unit,
              quantity: 0
            };
          }
          materialMap[w.material_id].quantity += Number(w.quantity_available || 0);
        }
      });
      setMaterials(Object.values(materialMap));
    } catch (e) {
      console.error('Ошибка загрузки:', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMaterials();
    setRefreshing(false);
  };

  const filtered = materials.filter(m => 
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.category?.toLowerCase().includes(search.toLowerCase())
  );

  const getStockColor = (qty: number) => {
    if (qty <= 0) return C.danger;
    if (qty < 10) return '#FFA500';
    return C.green;
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={C.accent} size="large" /></View>;
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Склад</Text>
        <TouchableOpacity onPress={() => router.push('/(app)/warehouse/issue')}>
          <Text style={s.issueBtn}>📤 Выдать</Text>
        </TouchableOpacity>
      </View>

      <TextInput style={s.search} placeholder="Поиск..." placeholderTextColor={C.sub}
        value={search} onChangeText={setSearch} />

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={s.empty}>Материалов нет</Text>}
        renderItem={({ item }) => (
          <View style={s.materialCard}>
            <View style={s.materialInfo}>
              <Text style={s.materialName}>{item.name}</Text>
              {item.category && <Text style={s.materialCategory}>{item.category}</Text>}
              {item.unit && <Text style={s.materialUnit}>ед: {item.unit}</Text>}
            </View>
            <View style={s.stockSection}>
              <Text style={[s.stockQty, { color: getStockColor(item.quantity) }]}>{item.quantity}</Text>
              <Text style={s.stockLabel}>остаток</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50 },
  title: { color: C.accent, fontSize: 26, fontWeight: '700' },
  issueBtn: { color: C.green, fontSize: 14, fontWeight: '600' },
  search: { backgroundColor: C.card, color: C.text, borderRadius: 10, margin: 16, marginTop: 0, padding:12, fontSize: 14 },
  materialCard: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 12, padding: 16, marginBottom: 10 },
  materialInfo: { flex: 1 },
  materialName: { color: C.text, fontSize: 15, fontWeight: '600' },
  materialCategory: { color: C.sub, fontSize: 12, marginTop: 4 },
  materialUnit: { color: C.sub, fontSize: 11, marginTop: 2 },
  stockSection: { alignItems: 'center', justifyContent: 'center' },
  stockQty: { fontSize: 24, fontWeight: '700' },
  stockLabel: { color: C.sub, fontSize: 10 },
  empty: { color: C.sub, textAlign: 'center', marginTop: 60, fontSize: 16 },
});
