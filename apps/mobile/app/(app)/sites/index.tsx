import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { sitesApi } from '@/src/lib/supabase';

// Cyberpunk theme
const C = { bg: '#0A0A0F', card: '#1A1A2E', accent: '#00D9FF', text: '#E0E0E0', sub: '#8892a0', border: 'rgba(0, 217, 255, 0.15)', green: '#00FF88' };

export default function SitesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    try {
      const data = await sitesApi.getAll();
      setSites(data || []);
    } catch (e) {
      console.error('Ошибка загрузки:', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = sites.filter(s => 
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.address?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={C.accent} size="large" /></View>;
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Площадки</Text>
      </View>

      <TextInput style={s.search} placeholder="Поиск площадки..." placeholderTextColor={C.sub}
        value={search} onChangeText={setSearch} />

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={s.empty}>Площадок нет</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.siteCard} onPress={() => {
            // Показываем информацию о площадке
          }}>
            <View style={s.siteIcon}>
              <Text style={s.siteIconText}>📍</Text>
            </View>
            <View style={s.siteInfo}>
              <Text style={s.siteName}>{item.name}</Text>
              {item.address && <Text style={s.siteAddress}>{item.address}</Text>}
              {item.description && <Text style={s.siteDesc}>{item.description}</Text>}
            </View>
            {item.latitude && item.longitude && (
              <View style={s.coords}>
                <Text style={s.coordsText}>{item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      {/* Информация о Mapbox */}
      <View style={s.mapInfo}>
        <Text style={s.mapInfoText}>🗺️ Карта использует Mapbox</Text>
        <Text style={s.mapInfoSub}>Интерактивные карты с маршрутами</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50 },
  title: { color: C.accent, fontSize: 26, fontWeight: '700' },
  search: { backgroundColor: C.card, color: C.text, borderRadius: 10, margin: 16, marginTop: 0, padding: 12, fontSize: 14 },
  siteCard: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10, alignItems: 'center' },
  siteIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0, 217, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  siteIconText: { fontSize: 24 },
  siteInfo: { flex: 1, marginLeft: 12 },
  siteName: { color: C.text, fontSize: 15, fontWeight: '600' },
  siteAddress: { color: C.accent, fontSize: 12, marginTop: 2 },
  siteDesc: { color: C.sub, fontSize: 12, marginTop: 2 },
  coords: { backgroundColor: C.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  coordsText: { color: C.sub, fontSize: 10, fontFamily: 'monospace' },
  empty: { color: C.sub, textAlign: 'center', marginTop: 60, fontSize: 16 },
  mapInfo: { padding: 16, backgroundColor: C.card, margin: 16, borderRadius: 12, alignItems: 'center' },
  mapInfoText: { color: C.accent, fontSize: 16, fontWeight: '600' },
  mapInfoSub: { color: C.sub, fontSize: 12, marginTop: 4 },
});