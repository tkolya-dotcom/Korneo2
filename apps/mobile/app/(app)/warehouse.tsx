import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { materialsApi, warehouseApi } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';

const C = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  text: '#E0E0E0',
  sub: '#8892a0',
  border: 'rgba(0, 217, 255, 0.15)',
  success: '#00FF88',
  warning: '#F59E0B',
  danger: '#EF4444',
};

type StockFilter = 'all' | 'instock' | 'outstock';

type MaterialRecord = {
  id: string;
  name: string;
  category?: string | null;
  default_unit?: string | null;
};

type WarehouseRowRecord = {
  id?: string;
  material_id?: string | null;
  quantity_available?: number | null;
  quantity?: number | null;
  location?: string | null;
  material?: MaterialRecord | null;
};

type WarehouseDisplayItem = {
  key: string;
  material_id: string;
  name: string;
  category: string;
  default_unit: string;
  qty: number;
  location?: string | null;
};

type IssueMetaMaterial = MaterialRecord & { stock: number };
type IssueMetaUser = { id: string; name?: string | null; role?: string | null };
type IssueMetaTask = {
  id: string;
  title?: string | null;
  type?: string | null;
  short_id?: string | number | null;
  status?: string | null;
};

type IssueMetaState = {
  materials: IssueMetaMaterial[];
  users: IssueMetaUser[];
  avrTasks: IssueMetaTask[];
};

type IssueDraftItem = {
  key: string;
  material_id: string;
  quantity: string;
};

type IssueHistoryItem = {
  id: string;
  issued_at?: string | null;
  purpose?: string | null;
  issued_to_user?: { id?: string; name?: string | null } | null;
  items?: Array<{
    material_id?: string;
    quantity?: number;
    material?: { name?: string | null; default_unit?: string | null } | null;
  }>;
};

const STOCK_FILTER_LABEL: Record<StockFilter, string> = {
  all: 'Все',
  instock: 'В наличии',
  outstock: 'Нет в наличии',
};

const UNIT_LABELS: Record<string, string> = {
  pcs: 'шт',
  m: 'м',
  m2: 'м²',
  m3: 'м³',
  l: 'л',
  kg: 'кг',
  set: 'компл.',
};

const issueItemFactory = (materialId = ''): IssueDraftItem => ({
  key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  material_id: materialId,
  quantity: '1',
});

const toQty = (row: WarehouseRowRecord) => {
  if (typeof row.quantity_available === 'number') return row.quantity_available;
  if (typeof row.quantity === 'number') return row.quantity;
  return 0;
};

const formatQty = (value: number) => {
  if (!Number.isFinite(value)) return '0';
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(3).replace(/\.?0+$/, '');
};

const unitLabel = (value?: string | null) => {
  if (!value) return 'шт';
  return UNIT_LABELS[value] || value;
};

const formatDateTimeLocal = (date = new Date()) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export default function WarehouseScreen() {
  const { canViewWarehouse } = useAuth();
  const canManageWarehouse = canViewWarehouse;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<WarehouseDisplayItem[]>([]);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [materialPickerVisible, setMaterialPickerVisible] = useState(false);

  const [savingStock, setSavingStock] = useState(false);
  const [creatingMaterial, setCreatingMaterial] = useState(false);
  const [savingIssue, setSavingIssue] = useState(false);
  const [loadingIssueMeta, setLoadingIssueMeta] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [stockMaterialSearch, setStockMaterialSearch] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [selectedMaterialLabel, setSelectedMaterialLabel] = useState('');
  const [stockQuantity, setStockQuantity] = useState('1');
  const [stockLocation, setStockLocation] = useState('');
  const [stockNotes, setStockNotes] = useState('');
  const [manualMaterialOpen, setManualMaterialOpen] = useState(false);
  const [manualMaterialName, setManualMaterialName] = useState('');
  const [manualMaterialCategory, setManualMaterialCategory] = useState('Расходники');
  const [manualMaterialUnit, setManualMaterialUnit] = useState('pcs');

  const [issueMeta, setIssueMeta] = useState<IssueMetaState>({ materials: [], users: [], avrTasks: [] });
  const [issueToUser, setIssueToUser] = useState('');
  const [issueDate, setIssueDate] = useState(formatDateTimeLocal());
  const [issuePurpose, setIssuePurpose] = useState('');
  const [issueTaskId, setIssueTaskId] = useState('');
  const [issueItems, setIssueItems] = useState<IssueDraftItem[]>([issueItemFactory()]);
  const [issueUserQuery, setIssueUserQuery] = useState('');
  const [issueTaskQuery, setIssueTaskQuery] = useState('');

  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerTargetKey, setPickerTargetKey] = useState('');

  const [history, setHistory] = useState<IssueHistoryItem[]>([]);

  const load = useCallback(async () => {
    const [materialsRaw, warehouseRaw] = await Promise.all([materialsApi.getAll(), warehouseApi.getAll()]);
    const materials = (Array.isArray(materialsRaw) ? materialsRaw : []) as MaterialRecord[];
    const warehouse = (Array.isArray(warehouseRaw) ? warehouseRaw : []) as WarehouseRowRecord[];

    const stockMap = new Map<string, { qty: number; location?: string | null }>();
    for (const row of warehouse) {
      const materialId = typeof row.material_id === 'string' ? row.material_id : '';
      if (!materialId) continue;
      const prev = stockMap.get(materialId);
      const qty = toQty(row);
      stockMap.set(materialId, {
        qty: (prev?.qty || 0) + qty,
        location: row.location ?? prev?.location ?? null,
      });
    }

    const result: WarehouseDisplayItem[] = [];
    const seen = new Set<string>();

    for (const material of materials) {
      const materialId = String(material.id);
      const stock = stockMap.get(materialId);
      result.push({
        key: `mat-${materialId}`,
        material_id: materialId,
        name: material.name || 'Материал',
        category: material.category || 'Без категории',
        default_unit: material.default_unit || 'pcs',
        qty: stock?.qty || 0,
        location: stock?.location || null,
      });
      seen.add(materialId);
    }

    for (const row of warehouse) {
      const materialId = typeof row.material_id === 'string' ? row.material_id : '';
      if (!materialId || seen.has(materialId)) continue;
      const stock = stockMap.get(materialId);
      const rowMaterial = row.material;
      result.push({
        key: `extra-${materialId}`,
        material_id: materialId,
        name: rowMaterial?.name || `Материал ${materialId.slice(0, 6)}`,
        category: rowMaterial?.category || 'Без категории',
        default_unit: rowMaterial?.default_unit || 'pcs',
        qty: stock?.qty || 0,
        location: stock?.location || row.location || null,
      });
      seen.add(materialId);
    }

    result.sort((a, b) => {
      const byCategory = a.category.localeCompare(b.category, 'ru');
      if (byCategory !== 0) return byCategory;
      return a.name.localeCompare(b.name, 'ru');
    });

    setItems(result);
  }, []);

  useEffect(() => {
    let active = true;
    load()
      .catch((error) => {
        console.error('Failed to load warehouse:', error);
        Alert.alert('Ошибка', errorMessage(error, 'Не удалось загрузить склад'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return undefined;
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) set.add(item.category || 'Без категории');
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'))];
  }, [items]);

  useEffect(() => {
    if (categoryFilter !== 'all' && !categories.includes(categoryFilter)) {
      setCategoryFilter('all');
    }
  }, [categories, categoryFilter]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (stockFilter === 'instock' && item.qty <= 0) return false;
      if (stockFilter === 'outstock' && item.qty > 0) return false;
      if (!query) return true;
      return `${item.name} ${item.category}`.toLowerCase().includes(query);
    });
  }, [categoryFilter, items, search, stockFilter]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, WarehouseDisplayItem[]>();
    for (const item of filteredItems) {
      if (!groups.has(item.category)) groups.set(item.category, []);
      groups.get(item.category)?.push(item);
    }
    return Array.from(groups.entries()).map(([category, rows]) => ({ category, rows }));
  }, [filteredItems]);

  const catalogSuggestions = useMemo(() => {
    const q = stockMaterialSearch.trim().toLowerCase();
    const source = q
      ? items.filter((item) => `${item.name} ${item.category}`.toLowerCase().includes(q))
      : items;
    return source.slice(0, 20);
  }, [items, stockMaterialSearch]);

  const issueMaterialsMap = useMemo(() => {
    const map = new Map<string, IssueMetaMaterial>();
    for (const material of issueMeta.materials) {
      map.set(material.id, material);
    }
    return map;
  }, [issueMeta.materials]);

  const filteredUsers = useMemo(() => {
    const q = issueUserQuery.trim().toLowerCase();
    const source = q
      ? issueMeta.users.filter((user) => (user.name || '').toLowerCase().includes(q))
      : issueMeta.users;
    return source.slice(0, 15);
  }, [issueMeta.users, issueUserQuery]);

  const filteredTasks = useMemo(() => {
    const q = issueTaskQuery.trim().toLowerCase();
    const source = q
      ? issueMeta.avrTasks.filter((task) =>
          `${task.short_id || ''} ${task.type || ''} ${task.title || ''}`.toLowerCase().includes(q)
        )
      : issueMeta.avrTasks;
    return source.slice(0, 20);
  }, [issueMeta.avrTasks, issueTaskQuery]);

  const pickerMaterials = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    const source = q
      ? issueMeta.materials.filter((material) =>
          `${material.name} ${material.category || ''}`.toLowerCase().includes(q)
        )
      : issueMeta.materials;
    return source.slice(0, 50);
  }, [issueMeta.materials, pickerSearch]);

  const resetAddStockForm = () => {
    setStockMaterialSearch('');
    setSelectedMaterialId('');
    setSelectedMaterialLabel('');
    setStockQuantity('1');
    setStockLocation('');
    setStockNotes('');
    setManualMaterialOpen(false);
    setManualMaterialName('');
    setManualMaterialCategory('Расходники');
    setManualMaterialUnit('pcs');
  };

  const openAddStock = () => {
    resetAddStockForm();
    setAddModalVisible(true);
  };

  const selectStockMaterial = (item: WarehouseDisplayItem) => {
    setSelectedMaterialId(item.material_id);
    setSelectedMaterialLabel(`${item.name} (${item.category})`);
    setStockMaterialSearch(`${item.name} (${item.category})`);
  };

  const createManualMaterial = async () => {
    const name = manualMaterialName.trim();
    if (!name) {
      Alert.alert('Проверьте данные', 'Введите название материала');
      return;
    }

    try {
      setCreatingMaterial(true);
      const created = (await materialsApi.create({
        name,
        category: manualMaterialCategory.trim() || 'Расходники',
        default_unit: manualMaterialUnit || 'pcs',
      })) as MaterialRecord;

      setSelectedMaterialId(created.id);
      setSelectedMaterialLabel(`${created.name} (${created.category || 'Без категории'})`);
      setStockMaterialSearch(`${created.name} (${created.category || 'Без категории'})`);
      setManualMaterialOpen(false);
      setManualMaterialName('');
      await load();
      Alert.alert('Готово', 'Материал создан');
    } catch (error) {
      Alert.alert('Ошибка', errorMessage(error, 'Не удалось создать материал'));
    } finally {
      setCreatingMaterial(false);
    }
  };

  const submitAddStock = async () => {
    const quantity = Number.parseFloat(stockQuantity.replace(',', '.'));
    if (!selectedMaterialId) {
      Alert.alert('Проверьте данные', 'Выберите материал');
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      Alert.alert('Проверьте данные', 'Количество должно быть больше 0');
      return;
    }

    try {
      setSavingStock(true);
      await warehouseApi.addStock({
        material_id: selectedMaterialId,
        quantity,
        location: stockLocation.trim() || null,
        notes: stockNotes.trim() || null,
      });
      setAddModalVisible(false);
      await load();
      Alert.alert('Готово', 'Материал добавлен на склад');
    } catch (error) {
      Alert.alert('Ошибка', errorMessage(error, 'Не удалось пополнить склад'));
    } finally {
      setSavingStock(false);
    }
  };

  const openIssueModal = async (prefillMaterialId?: string) => {
    setIssueModalVisible(true);
    setLoadingIssueMeta(true);
    setIssueToUser('');
    setIssueDate(formatDateTimeLocal());
    setIssuePurpose('');
    setIssueTaskId('');
    setIssueItems([issueItemFactory(prefillMaterialId || '')]);
    setIssueUserQuery('');
    setIssueTaskQuery('');

    try {
      const response = (await warehouseApi.getIssueMeta()) as Partial<IssueMetaState>;
      const nextMeta: IssueMetaState = {
        materials: Array.isArray(response.materials) ? response.materials : [],
        users: Array.isArray(response.users) ? response.users : [],
        avrTasks: Array.isArray(response.avrTasks) ? response.avrTasks : [],
      };
      setIssueMeta(nextMeta);
    } catch (error) {
      setIssueModalVisible(false);
      Alert.alert('Ошибка', errorMessage(error, 'Не удалось загрузить данные для выдачи'));
    } finally {
      setLoadingIssueMeta(false);
    }
  };

  const addIssueRow = () => {
    setIssueItems((prev) => [...prev, issueItemFactory()]);
  };

  const removeIssueRow = (key: string) => {
    setIssueItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.key !== key);
    });
  };

  const updateIssueQuantity = (key: string, quantity: string) => {
    setIssueItems((prev) => prev.map((item) => (item.key === key ? { ...item, quantity } : item)));
  };

  const openMaterialPicker = (targetKey: string) => {
    setPickerTargetKey(targetKey);
    setPickerSearch('');
    setMaterialPickerVisible(true);
  };

  const pickMaterialForIssueRow = (materialId: string) => {
    setIssueItems((prev) =>
      prev.map((item) => (item.key === pickerTargetKey ? { ...item, material_id: materialId } : item))
    );
    setMaterialPickerVisible(false);
  };

  const submitIssue = async () => {
    if (!issueToUser) {
      Alert.alert('Проверьте данные', 'Выберите сотрудника');
      return;
    }
    if (!issueDate.trim()) {
      Alert.alert('Проверьте данные', 'Укажите дату выдачи');
      return;
    }

    const normalizedItems = issueItems
      .map((item) => ({
        material_id: item.material_id,
        quantity: Number.parseFloat(item.quantity.replace(',', '.')),
      }))
      .filter((item) => item.material_id && Number.isFinite(item.quantity) && item.quantity > 0);

    if (normalizedItems.length === 0) {
      Alert.alert('Проверьте данные', 'Добавьте хотя бы одну позицию');
      return;
    }

    try {
      setSavingIssue(true);
      await warehouseApi.createIssue({
        issued_to: issueToUser,
        issued_at: issueDate,
        purpose: issuePurpose.trim() || null,
        task_avr_id: issueTaskId || null,
        items: normalizedItems,
      });
      setIssueModalVisible(false);
      await load();
      Alert.alert('Готово', `Выдано ${normalizedItems.length} поз.`);
    } catch (error) {
      Alert.alert('Ошибка', errorMessage(error, 'Не удалось оформить выдачу'));
    } finally {
      setSavingIssue(false);
    }
  };

  const openIssueHistory = async () => {
    setHistoryModalVisible(true);
    setLoadingHistory(true);
    try {
      const rows = (await warehouseApi.getIssueHistory(100)) as IssueHistoryItem[];
      setHistory(Array.isArray(rows) ? rows : []);
    } catch (error) {
      Alert.alert('Ошибка', errorMessage(error, 'Не удалось загрузить историю выдач'));
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  if (!canViewWarehouse) {
    return (
      <View style={s.center}>
        <Text style={s.empty}>{'\u041d\u0435\u0442 \u043f\u0440\u0430\u0432 \u0434\u043b\u044f \u043f\u0440\u043e\u0441\u043c\u043e\u0442\u0440\u0430 \u0441\u043a\u043b\u0430\u0434\u0430'}</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Склад</Text>
        <Text style={s.count}>{filteredItems.length}</Text>
      </View>

      <View style={s.actionsRow}>
        <TouchableOpacity style={s.actionBtn} onPress={openAddStock} disabled={!canManageWarehouse}>
          <Text style={s.actionBtnText}>➕ Пополнить</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, s.actionWarning]}
          onPress={() => void openIssueModal()}
          disabled={!canManageWarehouse}
        >
          <Text style={s.actionBtnText}>📤 Выдать</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, s.actionSecondary]}
          onPress={() => void openIssueHistory()}
          disabled={!canManageWarehouse}
        >
          <Text style={s.actionBtnText}>📋 История</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        style={s.search}
        placeholder="Поиск по складу"
        placeholderTextColor={C.sub}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtersScroll}>
        {categories.map((category) => {
          const active = categoryFilter === category;
          return (
            <TouchableOpacity
              key={category}
              style={[s.filterChip, active && s.filterChipActive]}
              onPress={() => setCategoryFilter(category)}
            >
              <Text style={[s.filterChipText, active && s.filterChipTextActive]}>
                {category === 'all' ? 'Все категории' : category}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={s.stockFiltersRow}>
        {(Object.keys(STOCK_FILTER_LABEL) as StockFilter[]).map((filter) => {
          const active = stockFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[s.stockFilterChip, active && s.stockFilterChipActive]}
              onPress={() => setStockFilter(filter)}
            >
              <Text style={[s.stockFilterChipText, active && s.stockFilterChipTextActive]}>
                {STOCK_FILTER_LABEL[filter]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={groupedItems}
        keyExtractor={(group) => group.category}
        contentContainerStyle={s.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        ListEmptyComponent={<Text style={s.empty}>Материалы не найдены</Text>}
        renderItem={({ item: group }) => (
          <View style={s.groupCard}>
            <Text style={s.groupTitle}>{group.category}</Text>
            {group.rows.map((row) => {
              const inStock = row.qty > 0;
              return (
                <View key={row.key} style={s.materialRow}>
                  <View style={s.materialMain}>
                    <Text style={s.materialName} numberOfLines={2}>
                      {row.name}
                    </Text>
                    <Text style={s.materialMeta}>{unitLabel(row.default_unit)}</Text>
                  </View>

                  <Text style={[s.materialQty, { color: inStock ? C.success : C.danger }]}>
                    {formatQty(row.qty)}
                  </Text>

                  {inStock && canManageWarehouse ? (
                    <TouchableOpacity
                      style={s.issueMiniBtn}
                      onPress={() => void openIssueModal(row.material_id)}
                    >
                      <Text style={s.issueMiniBtnText}>Выдать</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={s.issueMiniStub} />
                  )}
                </View>
              );
            })}
          </View>
        )}
      />

      <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Пополнение склада</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.modalBody}>
              <Text style={s.label}>Поиск материала</Text>
              <TextInput
                value={stockMaterialSearch}
                onChangeText={(value) => {
                  setStockMaterialSearch(value);
                  if (!value.trim()) {
                    setSelectedMaterialId('');
                    setSelectedMaterialLabel('');
                  }
                }}
                style={s.input}
                placeholder="Начните вводить название..."
                placeholderTextColor={C.sub}
              />

              <View style={s.suggestionsBox}>
                {catalogSuggestions.map((material) => (
                  <TouchableOpacity
                    key={material.key}
                    style={s.suggestionRow}
                    onPress={() => selectStockMaterial(material)}
                  >
                    <Text style={s.suggestionTitle}>{material.name}</Text>
                    <Text style={s.suggestionSub}>
                      {material.category} • {unitLabel(material.default_unit)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={s.ghostButton}
                onPress={() => setManualMaterialOpen((prev) => !prev)}
              >
                <Text style={s.ghostButtonText}>
                  {manualMaterialOpen ? 'Скрыть ручной ввод' : '➕ Создать материал вручную'}
                </Text>
              </TouchableOpacity>

              {manualMaterialOpen ? (
                <View style={s.manualBlock}>
                  <Text style={s.label}>Название нового материала</Text>
                  <TextInput
                    value={manualMaterialName}
                    onChangeText={setManualMaterialName}
                    style={s.input}
                    placeholder="Название"
                    placeholderTextColor={C.sub}
                  />

                  <Text style={s.label}>Категория</Text>
                  <TextInput
                    value={manualMaterialCategory}
                    onChangeText={setManualMaterialCategory}
                    style={s.input}
                    placeholder="Расходники"
                    placeholderTextColor={C.sub}
                  />

                  <Text style={s.label}>Ед. измерения</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.unitsRow}>
                    {['pcs', 'm', 'm2', 'm3', 'l', 'kg', 'set'].map((unit) => {
                      const active = manualMaterialUnit === unit;
                      return (
                        <TouchableOpacity
                          key={unit}
                          style={[s.unitChip, active && s.unitChipActive]}
                          onPress={() => setManualMaterialUnit(unit)}
                        >
                          <Text style={[s.unitChipText, active && s.unitChipTextActive]}>
                            {unitLabel(unit)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <TouchableOpacity
                    style={[s.submitBtn, creatingMaterial && s.btnDisabled]}
                    disabled={creatingMaterial}
                    onPress={() => void createManualMaterial()}
                  >
                    <Text style={s.submitBtnText}>{creatingMaterial ? 'Создаём...' : 'Создать материал'}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <Text style={s.selectedMaterialText}>
                {selectedMaterialLabel ? `Выбрано: ${selectedMaterialLabel}` : 'Материал не выбран'}
              </Text>

              <Text style={s.label}>Количество</Text>
              <TextInput
                value={stockQuantity}
                onChangeText={setStockQuantity}
                style={s.input}
                placeholder="1"
                placeholderTextColor={C.sub}
                keyboardType="decimal-pad"
              />

              <Text style={s.label}>Расположение</Text>
              <TextInput
                value={stockLocation}
                onChangeText={setStockLocation}
                style={s.input}
                placeholder="Например: Стеллаж А-3"
                placeholderTextColor={C.sub}
              />

              <Text style={s.label}>Комментарий</Text>
              <TextInput
                value={stockNotes}
                onChangeText={setStockNotes}
                style={[s.input, s.multiline]}
                placeholder="Примечание"
                placeholderTextColor={C.sub}
                multiline
              />

              <TouchableOpacity
                style={[s.submitBtn, (savingStock || !selectedMaterialId) && s.btnDisabled]}
                disabled={savingStock || !selectedMaterialId}
                onPress={() => void submitAddStock()}
              >
                <Text style={s.submitBtnText}>{savingStock ? 'Сохраняем...' : 'Добавить на склад'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={issueModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIssueModalVisible(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Выдача материалов</Text>
              <TouchableOpacity onPress={() => setIssueModalVisible(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingIssueMeta ? (
              <View style={s.loadingBlock}>
                <ActivityIndicator size="large" color={C.accent} />
              </View>
            ) : (
              <ScrollView contentContainerStyle={s.modalBody}>
                <Text style={s.label}>Кому выдано</Text>
                <TextInput
                  value={issueUserQuery}
                  onChangeText={setIssueUserQuery}
                  style={s.input}
                  placeholder="Поиск сотрудника"
                  placeholderTextColor={C.sub}
                />
                <View style={s.suggestionsBox}>
                  {filteredUsers.map((user) => {
                    const active = user.id === issueToUser;
                    return (
                      <TouchableOpacity
                        key={user.id}
                        style={[s.suggestionRow, active && s.suggestionRowActive]}
                        onPress={() => {
                          setIssueToUser(user.id);
                          setIssueUserQuery(user.name || '');
                        }}
                      >
                        <Text style={s.suggestionTitle}>{user.name || 'Сотрудник'}</Text>
                        {user.role ? <Text style={s.suggestionSub}>{user.role}</Text> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={s.label}>Дата выдачи</Text>
                <TextInput
                  value={issueDate}
                  onChangeText={setIssueDate}
                  style={s.input}
                  placeholder="YYYY-MM-DDTHH:mm"
                  placeholderTextColor={C.sub}
                />

                <Text style={s.label}>Задача АВР/НРД (опционально)</Text>
                <TextInput
                  value={issueTaskQuery}
                  onChangeText={setIssueTaskQuery}
                  style={s.input}
                  placeholder="Поиск задачи"
                  placeholderTextColor={C.sub}
                />
                <View style={s.suggestionsBox}>
                  {filteredTasks.map((task) => {
                    const active = task.id === issueTaskId;
                    return (
                      <TouchableOpacity
                        key={task.id}
                        style={[s.suggestionRow, active && s.suggestionRowActive]}
                        onPress={() => {
                          setIssueTaskId(task.id);
                          setIssueTaskQuery(
                            `${task.short_id ? `#${task.short_id} ` : ''}${task.type || ''} ${task.title || ''}`.trim()
                          );
                        }}
                      >
                        <Text style={s.suggestionTitle}>
                          {task.short_id ? `#${task.short_id} ` : ''}
                          {task.type ? `${task.type} ` : ''}
                          {task.title || 'Задача'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {issueTaskId ? (
                  <TouchableOpacity
                    style={s.ghostButton}
                    onPress={() => {
                      setIssueTaskId('');
                      setIssueTaskQuery('');
                    }}
                  >
                    <Text style={s.ghostButtonText}>Очистить выбранную задачу</Text>
                  </TouchableOpacity>
                ) : null}

                <Text style={s.label}>Примечание</Text>
                <TextInput
                  value={issuePurpose}
                  onChangeText={setIssuePurpose}
                  style={s.input}
                  placeholder="Например: монтаж на ул. Ленина"
                  placeholderTextColor={C.sub}
                />

                <View style={s.issueItemsHeader}>
                  <Text style={s.labelNoMargin}>Позиции выдачи</Text>
                  <TouchableOpacity style={s.addIssueItemBtn} onPress={addIssueRow}>
                    <Text style={s.addIssueItemText}>➕ Добавить</Text>
                  </TouchableOpacity>
                </View>

                {issueItems.map((item, index) => {
                  const selected = issueMaterialsMap.get(item.material_id);
                  const requestedQty = Number.parseFloat(item.quantity.replace(',', '.'));
                  const overStock =
                    Number.isFinite(requestedQty) &&
                    requestedQty > 0 &&
                    selected &&
                    requestedQty > selected.stock;

                  return (
                    <View key={item.key} style={s.issueItemCard}>
                      <View style={s.issueItemHeader}>
                        <Text style={s.issueItemTitle}>Позиция {index + 1}</Text>
                        {issueItems.length > 1 ? (
                          <TouchableOpacity onPress={() => removeIssueRow(item.key)}>
                            <Text style={s.removeIssueItemText}>Удалить</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      <TouchableOpacity style={s.selectBtn} onPress={() => openMaterialPicker(item.key)}>
                        <Text style={s.selectBtnText}>
                          {selected
                            ? `${selected.name} (${formatQty(selected.stock)} ${unitLabel(selected.default_unit)})`
                            : 'Выбрать материал'}
                        </Text>
                      </TouchableOpacity>

                      <TextInput
                        value={item.quantity}
                        onChangeText={(value) => updateIssueQuantity(item.key, value)}
                        style={s.input}
                        placeholder="Количество"
                        placeholderTextColor={C.sub}
                        keyboardType="decimal-pad"
                      />

                      {overStock ? (
                        <Text style={s.warningText}>
                          Превышен остаток: доступно {formatQty(selected.stock)} {unitLabel(selected.default_unit)}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}

                <TouchableOpacity
                  style={[s.submitBtn, savingIssue && s.btnDisabled]}
                  disabled={savingIssue}
                  onPress={() => void submitIssue()}
                >
                  <Text style={s.submitBtnText}>{savingIssue ? 'Оформляем...' : 'Оформить выдачу'}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={materialPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMaterialPickerVisible(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.pickerSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Выбор материала</Text>
              <TouchableOpacity onPress={() => setMaterialPickerVisible(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={s.modalBody}>
              <TextInput
                value={pickerSearch}
                onChangeText={setPickerSearch}
                style={s.input}
                placeholder="Поиск материала"
                placeholderTextColor={C.sub}
              />
              <ScrollView style={{ maxHeight: 360 }}>
                {pickerMaterials.map((material) => (
                  <TouchableOpacity
                    key={material.id}
                    style={s.suggestionRow}
                    onPress={() => pickMaterialForIssueRow(material.id)}
                  >
                    <Text style={s.suggestionTitle}>{material.name}</Text>
                    <Text style={s.suggestionSub}>
                      {material.category || 'Без категории'} • {formatQty(material.stock)}{' '}
                      {unitLabel(material.default_unit)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={historyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>История выдач</Text>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingHistory ? (
              <View style={s.loadingBlock}>
                <ActivityIndicator size="large" color={C.accent} />
              </View>
            ) : (
              <FlatList
                data={history}
                keyExtractor={(item) => item.id}
                contentContainerStyle={s.historyList}
                ListEmptyComponent={<Text style={s.empty}>Выдач пока не было</Text>}
                renderItem={({ item }) => (
                  <View style={s.historyCard}>
                    <View style={s.historyHeader}>
                      <Text style={s.historyUser}>{item.issued_to_user?.name || 'Сотрудник'}</Text>
                      <Text style={s.historyCount}>{item.items?.length || 0} поз.</Text>
                    </View>
                    <Text style={s.historyDate}>{formatDateTime(item.issued_at)}</Text>
                    {item.purpose ? <Text style={s.historyPurpose}>{item.purpose}</Text> : null}

                    <View style={s.historyItems}>
                      {(item.items || []).map((issueItem, index) => (
                        <Text key={`${item.id}-${index}`} style={s.historyItemText}>
                          • {issueItem.material?.name || 'Материал'} — {formatQty(issueItem.quantity || 0)}{' '}
                          {unitLabel(issueItem.material?.default_unit)}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 14,
  },
  title: { color: C.text, fontSize: 26, fontWeight: '700' },
  count: { color: C.sub, fontSize: 16 },

  actionsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  actionBtn: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionWarning: { borderColor: 'rgba(245, 158, 11, 0.45)' },
  actionSecondary: { borderColor: 'rgba(136, 146, 160, 0.4)' },
  actionBtnText: { color: C.text, fontSize: 12, fontWeight: '600' },

  search: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    color: C.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  filtersScroll: { gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  filterChip: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    borderColor: C.accent,
    backgroundColor: 'rgba(0, 217, 255, 0.18)',
  },
  filterChipText: { color: C.sub, fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: C.accent },

  stockFiltersRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  stockFilterChip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: 'center',
    paddingVertical: 8,
  },
  stockFilterChipActive: {
    borderColor: C.accent,
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
  },
  stockFilterChipText: { color: C.sub, fontSize: 12, fontWeight: '600' },
  stockFilterChipTextActive: { color: C.accent },

  listContent: { padding: 16, paddingBottom: 24 },
  groupCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginBottom: 10,
  },
  groupTitle: { color: C.accent, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 10,
    paddingBottom: 8,
  },
  materialMain: { flex: 1 },
  materialName: { color: C.text, fontSize: 14, fontWeight: '600' },
  materialMeta: { color: C.sub, fontSize: 11, marginTop: 2 },
  materialQty: { minWidth: 52, textAlign: 'right', fontWeight: '700', fontSize: 13 },
  issueMiniBtn: {
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.5)',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  issueMiniBtnText: { color: C.warning, fontSize: 11, fontWeight: '700' },
  issueMiniStub: { width: 54 },
  empty: { color: C.sub, textAlign: 'center', marginTop: 40, fontSize: 15 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.68)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    maxHeight: '92%',
  },
  pickerSheet: {
    marginHorizontal: 12,
    marginVertical: 40,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: { color: C.text, fontSize: 17, fontWeight: '700' },
  modalClose: { color: C.sub, fontSize: 22, fontWeight: '500' },
  modalBody: { padding: 16, paddingBottom: 24 },
  loadingBlock: { paddingVertical: 30, alignItems: 'center', justifyContent: 'center' },

  label: { color: C.sub, fontSize: 12, marginBottom: 6, textTransform: 'uppercase' },
  labelNoMargin: { color: C.sub, fontSize: 12, textTransform: 'uppercase' },
  input: {
    backgroundColor: 'rgba(10, 10, 15, 0.75)',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    color: C.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  multiline: { minHeight: 74, textAlignVertical: 'top' },

  suggestionsBox: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
    maxHeight: 190,
  },
  suggestionRow: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  suggestionRowActive: { backgroundColor: 'rgba(0,217,255,0.15)' },
  suggestionTitle: { color: C.text, fontSize: 13, fontWeight: '600' },
  suggestionSub: { color: C.sub, fontSize: 11, marginTop: 2 },

  ghostButton: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  ghostButtonText: { color: C.accent, fontSize: 12, fontWeight: '600' },

  manualBlock: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  unitsRow: { gap: 8, paddingBottom: 8 },
  unitChip: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  unitChipActive: { borderColor: C.accent, backgroundColor: 'rgba(0,217,255,0.16)' },
  unitChipText: { color: C.sub, fontSize: 12, fontWeight: '600' },
  unitChipTextActive: { color: C.accent },

  selectedMaterialText: {
    color: C.accent,
    fontSize: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(0,217,255,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  submitBtn: {
    backgroundColor: C.success,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  submitBtnText: { color: '#04120d', fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.45 },

  issueItemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
  addIssueItemBtn: {
    borderWidth: 1,
    borderColor: C.accent,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addIssueItemText: { color: C.accent, fontSize: 12, fontWeight: '600' },
  issueItemCard: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  issueItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  issueItemTitle: { color: C.text, fontSize: 13, fontWeight: '700' },
  removeIssueItemText: { color: C.danger, fontSize: 12, fontWeight: '600' },
  selectBtn: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: 'rgba(10,10,15,0.65)',
    marginBottom: 10,
  },
  selectBtnText: { color: C.text, fontSize: 13 },
  warningText: { color: C.warning, fontSize: 11, marginTop: -2, marginBottom: 6 },

  historyList: { padding: 16, paddingBottom: 26 },
  historyCard: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    marginBottom: 10,
  },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyUser: { color: C.text, fontSize: 14, fontWeight: '700' },
  historyCount: {
    color: C.accent,
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'rgba(0,217,255,0.14)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  historyDate: { color: C.sub, fontSize: 12, marginTop: 4 },
  historyPurpose: { color: C.text, fontSize: 12, marginTop: 6 },
  historyItems: { marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, paddingTop: 6 },
  historyItemText: { color: C.sub, fontSize: 12, marginTop: 3 },
});
