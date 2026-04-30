import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/providers/AuthProvider';
import { authApi, avrApi, warehouseApi, equipmentChangesApi, purchaseRequestApi } from '@/src/lib/supabase';
import EngineersSelector from '@/src/components/EngineersSelector';

const C = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  text: '#E0E0E0',
  sub: '#8892a0',
  border: 'rgba(0, 217, 255, 0.15)',
};

const statuses = ['new', 'planned', 'in_progress', 'completed', 'cancelled'] as const;

const statusLabel = (status: string) =>
  ({
    new: '\u041d\u043e\u0432\u0430\u044f',
    planned: '\u0417\u0430\u043f\u043b\u0430\u043d\u0438\u0440\u043e\u0432\u0430\u043d\u0430',
    in_progress: '\u0412 \u0440\u0430\u0431\u043e\u0442\u0435',
    completed: '\u0412\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0430',
    cancelled: '\u041e\u0442\u043c\u0435\u043d\u0435\u043d\u0430',
  }[status] || status);

const typeLabel = (type: string) =>
  ({
    AVR: '\u0410\u0412\u0420',
    NRD: '\u041d\u0420\u0414',
    TECH_TASK: '\u0422\u0435\u0445. \u0437\u0430\u0434\u0430\u0447\u0430',
  }[type] || type || '\u0417\u0430\u044f\u0432\u043a\u0430');

const formatDate = (value?: string) => {
  if (!value) return '\u2014';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU');
};

interface Engineer {
  id: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  [key: string]: any;
}

export default function AvrDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isManagerOrHigher } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [item, setItem] = useState<any | null>(null);
  const [users, setUsers] = useState<Engineer[]>([]);
  const [editingEngineers, setEditingEngineers] = useState(false);
  const [selectedEngineerIds, setSelectedEngineerIds] = useState<string[]>([]);
  const [showPlannedDateModal, setShowPlannedDateModal] = useState(false);
  const [plannedDate, setPlannedDate] = useState('');
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  // Complete Task Modal state
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [usedMaterials, setUsedMaterials] = useState<Array<{ material_id: string; quantity: number; name?: string }>>([]);
  const [equipmentChanged, setEquipmentChanged] = useState(false);
  const [oldEquipment, setOldEquipment] = useState<Array<{ brand: string; model: string; serial: string; inventory: string }>>([]);
  const [newEquipment, setNewEquipment] = useState<Array<{ brand: string; model: string; serial: string; inventory: string }>>([]);
  const [completionComment, setCompletionComment] = useState('');

  // Materials Request Modal state
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [materialItems, setMaterialItems] = useState<Array<{ material_id: string; quantity: number; name?: string }>>([]);
  const [materialsAvailable, setMaterialsAvailable] = useState<Array<{ id: string; name: string; stock: number }>>([]);
  const [requestPurpose, setRequestPurpose] = useState('');

  // Loading state for modals
  const [completingAvr, setCompletingAvr] = useState(false);
  const [creatingMaterialsRequest, setCreatingMaterialsRequest] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [data, usersData] = await Promise.all([
        avrApi.getById(id),
        authApi.getUsers().catch(() => []),
      ]);
      setItem(data);
      setUsers(usersData || []);
    } catch (error) {
      console.error('Failed to load avr detail:', error);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    load().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [load]);

  useEffect(() => {
    if (item) {
      const engineerIds = (item.engineers || [])
        .map((eng: any) => (typeof eng === 'string' ? eng : eng?.id))
        .filter(Boolean);
      setSelectedEngineerIds(engineerIds);
    }
  }, [item]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const canEditStatus = useMemo(() => {
    if (!item || !user?.id) return false;
    return isManagerOrHigher || item.executor_id === user.id || item.assignee_id === user.id;
  }, [isManagerOrHigher, item, user?.id]);

  const canEditEngineers = useMemo(() => {
    if (!item || !user?.id) return false;
    return isManagerOrHigher || item.executor_id === user.id || item.assignee_id === user.id;
  }, [isManagerOrHigher, item, user?.id]);

  const updateStatus = async (status: string) => {
    if (!id || updating) return;
    setUpdating(status);
    try {
      await avrApi.updateStatus(id, status);
      await load();
    } catch (error) {
      console.error('Failed to update AVR status:', error);
    } finally {
      setUpdating(null);
    }
  };

  const openStatusMenu = () => {
    if (!item) return;
    Alert.alert(
      '\u0421\u043c\u0435\u043d\u0438\u0442\u044c \u0441\u0442\u0430\u0442\u0443\u0441',
      '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043d\u043e\u0432\u043e\u0435 \u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435 \u0437\u0430\u044f\u0432\u043a\u0438',
      [
        ...statuses.map((status) => ({
          text: statusLabel(status),
          onPress: () => {
            if (item.status !== status) {
              if (status === 'planned') {
                setPendingStatus(status);
                setPlannedDate(item.planned_installation_date || '');
                setShowPlannedDateModal(true);
              } else if (status === 'completed') {
                // Open complete modal instead of direct status change
                void openCompleteModal();
              } else {
                void updateStatus(status);
              }
            }
          },
        })),
        { text: '\u041e\u0442\u043c\u0435\u043d\u0430', style: 'cancel' as const },
      ]
    );
  };

  const confirmPlannedDate = async () => {
    if (!id || !pendingStatus) return;
    setUpdating('planned');
    try {
      await avrApi.update(id, { planned_installation_date: plannedDate.trim() || null });
      await avrApi.updateStatus(id, pendingStatus);
      setShowPlannedDateModal(false);
      setPendingStatus(null);
      setPlannedDate('');
      await load();
    } catch (error) {
      console.error('Failed to update AVR planned date:', error);
    } finally {
      setUpdating(null);
    }
  };

  const cancelPlannedDateModal = () => {
    setShowPlannedDateModal(false);
    setPendingStatus(null);
    setPlannedDate('');
  };

  // Complete AVR functions
  const openCompleteModal = async () => {
    if (!item) return;
    
    // Load warehouse data for materials
    try {
      const warehouseData = await warehouseApi.getIssueMeta().catch(() => null);
      if (warehouseData?.materials) {
        setMaterialsAvailable(warehouseData.materials);
      }
    } catch (e) {
      console.warn('Failed to load warehouse:', e);
    }
    
    // Initialize with equipment from AVR if available
    const initialOldEquipment = item.old_equipment_name || item.old_id_sk1 ? [{
      brand: item.old_marka_sk || item.old_marka || '',
      model: item.old_model_sk || item.old_model || '',
      serial: item.old_seriynyy_nomer || item.old_serial_number || '',
      inventory: item.old_inventarnyy_nomer || item.old_inventory_number || '',
    }] : [];
    
    const initialNewEquipment = item.new_equipment_name || item.new_id_sk1 ? [{
      brand: item.new_marka_sk || item.new_marka || '',
      model: item.new_model_sk || item.new_model || '',
      serial: item.new_seriynyy_nomer || item.new_serial_number || '',
      inventory: item.new_inventarnyy_nomer || item.new_inventory_number || '',
    }] : [];
    
    setOldEquipment(initialOldEquipment);
    setNewEquipment(initialNewEquipment);
    setEquipmentChanged(initialOldEquipment.length > 0 || initialNewEquipment.length > 0);
    setUsedMaterials([]);
    setCompletionComment('');
    setShowCompleteModal(true);
  };

  const addMaterialRow = () => {
    setUsedMaterials([...usedMaterials, { material_id: '', quantity: 1 }]);
  };

  const removeMaterialRow = (index: number) => {
    setUsedMaterials(usedMaterials.filter((_, i) => i !== index));
  };

  const updateMaterialRow = (index: number, field: 'material_id' | 'quantity', value: string | number) => {
    setUsedMaterials(usedMaterials.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const addOldEquipmentRow = () => {
    setOldEquipment([...oldEquipment, { brand: '', model: '', serial: '', inventory: '' }]);
  };

  const removeOldEquipmentRow = (index: number) => {
    setOldEquipment(oldEquipment.filter((_, i) => i !== index));
  };

  const updateOldEquipmentRow = (index: number, field: string, value: string) => {
    setOldEquipment(oldEquipment.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const addNewEquipmentRow = () => {
    setNewEquipment([...newEquipment, { brand: '', model: '', serial: '', inventory: '' }]);
  };

  const removeNewEquipmentRow = (index: number) => {
    setNewEquipment(newEquipment.filter((_, i) => i !== index));
  };

  const updateNewEquipmentRow = (index: number, field: string, value: string) => {
    setNewEquipment(newEquipment.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const confirmCompleteAvr = async () => {
    if (!id) return;
    setCompletingAvr(true);
    
    try {
      // Save equipment changes if any
      if (equipmentChanged && (oldEquipment.length > 0 || newEquipment.length > 0)) {
        await equipmentChangesApi.create(
          id,
          oldEquipment.map(e => ({ name: 'Old Equipment', ...e })),
          newEquipment.map(e => ({ name: 'New Equipment', ...e }))
        ).catch(e => console.warn('Equipment changes save failed:', e));
      }
      
      // Finalize AVR with completion data
      await avrApi.finalizeAVR(id, {
        used_materials: usedMaterials.filter(m => m.material_id && m.quantity > 0),
        equipment_changed: equipmentChanged,
        old_equipment: oldEquipment,
        new_equipment: newEquipment,
        comment: completionComment || undefined,
      });
      
      setShowCompleteModal(false);
      await load();
      Alert.alert('Готово', 'АВР успешно завершена');
    } catch (error) {
      console.error('Failed to complete AVR:', error);
      Alert.alert('Ошибка', 'Не удалось завершить АВР');
    } finally {
      setCompletingAvr(false);
    }
  };

  // Materials Request functions
  const openMaterialsModal = async () => {
    try {
      const warehouseData = await warehouseApi.getIssueMeta().catch(() => null);
      if (warehouseData?.materials) {
        setMaterialsAvailable(warehouseData.materials);
      }
    } catch (e) {
      console.warn('Failed to load warehouse:', e);
    }
    
    setMaterialItems([{ material_id: '', quantity: 1 }]);
    setRequestPurpose('');
    setShowMaterialsModal(true);
  };

  const addMaterialRequestRow = () => {
    setMaterialItems([...materialItems, { material_id: '', quantity: 1 }]);
  };

  const removeMaterialRequestRow = (index: number) => {
    setMaterialItems(materialItems.filter((_, i) => i !== index));
  };

  const updateMaterialRequestRow = (index: number, field: 'material_id' | 'quantity', value: string | number) => {
    setMaterialItems(materialItems.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const confirmCreateMaterialsRequest = async () => {
    if (!id) return;
    
    const validItems = materialItems.filter(m => m.material_id && m.quantity > 0);
    if (validItems.length === 0) {
      Alert.alert('Ошибка', 'Выберите хотя бы один материал');
      return;
    }
    
    setCreatingMaterialsRequest(true);
    
    try {
      await purchaseRequestApi.createFromAvr(id, validItems, { purpose: requestPurpose || 'Материалы для АВР' });
      setShowMaterialsModal(false);
      await load();
      Alert.alert('Готово', 'Заявка на материалы создана');
    } catch (error) {
      console.error('Failed to create materials request:', error);
      Alert.alert('Ошибка', 'Не удалось создать заявку');
    } finally {
      setCreatingMaterialsRequest(false);
    }
  };

  // Materials Request functions

  const saveEngineers = async () => {
    if (!id) return;
    setUpdating('engineers');
    try {
      await avrApi.update(id, { engineers: selectedEngineerIds });
      await load();
      setEditingEngineers(false);
      Alert.alert('\u0423\u0441\u043f\u0435\u0445', '\u0418\u043d\u0436\u0435\u043d\u0435\u0440\u044b \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u044b');
    } catch (error) {
      console.error('Failed to update engineers:', error);
    } finally {
      setUpdating(null);
    }
  };

  const getEngineerNames = () => {
    if (!item?.engineers || !Array.isArray(item.engineers) || item.engineers.length === 0) {
      return '\u041d\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u044b';
    }
    return item.engineers
      .map((eng: any) => {
        if (typeof eng === 'string') {
          const user = users.find((u) => String(u.id) === eng);
          return user?.name || user?.email || eng.slice(0, 8);
        }
        return eng.name || eng.email || `ID ${eng.id?.slice(0, 8) || '?'}`;
      })
      .join(', ');
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={s.center}>
        <Text style={s.empty}>\u0417\u0430\u044f\u0432\u043a\u0430 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
      contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 26 }}
    >
      <View style={s.card}>
        <Text style={s.title}>
          {item.short_id ? `#${String(item.short_id).padStart(4, '0')} ` : ''}
          {item.title}
        </Text>
        <Text style={s.meta}>{typeLabel(item.type)}</Text>
        <Text style={s.meta}>\u0421\u0442\u0430\u0442\u0443\u0441: {statusLabel(item.status)}</Text>
        {item.address_text ? <Text style={s.meta}>\u0410\u0434\u0440\u0435\u0441: {item.address_text}</Text> : null}
        {item.executor?.name ? <Text style={s.meta}>\u0418\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c: {item.executor.name}</Text> : null}
        {item.project?.name ? <Text style={s.meta}>\u041f\u0440\u043e\u0435\u043a\u0442: {item.project.name}</Text> : null}
        {item.date_from || item.date_to ? (
          <Text style={s.meta}>
            \u0414\u0430\u0442\u044b: {formatDate(item.date_from)} \u2014 {formatDate(item.date_to)}
          </Text>
        ) : null}
      </View>

      {/* ENGINEERS SECTION */}
      <View style={s.card}>
        <View style={s.engineersHeader}>
          <Text style={s.sectionTitle}>\u0418\u043d\u0436\u0435\u043d\u0435\u0440\u044b ({selectedEngineerIds.length}/4)</Text>
          {canEditEngineers && !editingEngineers && (
            <TouchableOpacity onPress={() => setEditingEngineers(true)}>
              <Text style={s.editBtn}>{'\u270E \u0418\u0437\u043c\u0435\u043d\u0438\u0442\u044c'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {editingEngineers ? (
          <View style={s.engineersEditSection}>
            <EngineersSelector
              users={users}
              selectedIds={selectedEngineerIds}
              onChange={setSelectedEngineerIds}
            />
            <View style={s.editButtons}>
              <TouchableOpacity
                style={[s.saveBtn, updating === 'engineers' && s.btnDisabled]}
                onPress={saveEngineers}
                disabled={updating === 'engineers'}
              >
                {updating === 'engineers' ? (
                  <ActivityIndicator color={C.bg} size="small" />
                ) : (
                  <Text style={s.saveBtnText}>{'\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c'}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => {
                  setEditingEngineers(false);
                  const currentIds = item?.engineers
                    ? item.engineers.map((eng: any) => (typeof eng === 'string' ? eng : eng?.id)).filter(Boolean)
                    : [];
                  setSelectedEngineerIds(currentIds);
                }}
              >
                <Text style={s.cancelBtnText}>{'\u041e\u0442\u043c\u0435\u043d\u0430'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={s.engineersDisplay}>
            {selectedEngineerIds.length === 0 ? (
              <Text style={s.noEngineers}>\u041d\u0435 \u043d\u0430\u0437\u043d\u0430\u0447\u0435\u043d\u044b</Text>
            ) : (
              <View style={s.engineersList}>
                {selectedEngineerIds.map((engId) => {
                  const user = users.find((u) => String(u.id) === String(engId));
                  const name = user?.name || user?.email || `ID: ${String(engId).slice(0, 8)}`;
                  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((n: string) => n[0]).join('').toUpperCase() || '??';
                  return (
                    <View key={engId} style={s.engineerChip}>
                      <View style={s.engineerAvatar}>
                        <Text style={s.engineerAvatarText}>{initials}</Text>
                      </View>
                      <Text style={s.engineerName}>{name}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </View>

      {item.description ? (
        <View style={s.card}>
          <Text style={s.sectionTitle}>\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435</Text>
          <Text style={s.description}>{item.description}</Text>
        </View>
      ) : null}

      {canEditStatus ? (
        <View style={s.card}>
          <Text style={s.sectionTitle}>\u0421\u043c\u0435\u043d\u0430 \u0441\u0442\u0430\u0442\u0443\u0441\u0430</Text>
          <TouchableOpacity style={s.statusSelectBtn} onPress={openStatusMenu} disabled={Boolean(updating)}>
            <Text style={s.statusSelectText}>
              {updating && updating !== 'engineers' ? '\u0421\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u043c...' : `${statusLabel(item.status)} \u25be`}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={s.card}>
        <Text style={s.sectionTitle}>\u0417\u0430\u044f\u0432\u043a\u0438 \u043d\u0430 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b</Text>
        {(item.purchase_requests || []).length === 0 ? (
          <Text style={s.meta}>\u041d\u0435\u0442 \u0437\u0430\u044f\u0432\u043e\u043a</Text>
        ) : (
          item.purchase_requests.map((request: any) => (
            <View key={request.id} style={s.prRow}>
              <Text style={s.prText}>
                {(request.short_id || String(request.id).slice(0, 8))} \u2022 {request.status}
              </Text>
              <Text style={s.prSub}>
                {request.creator?.name || request.creator?.email || '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c'}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* PLANNED DATE MODAL */}
      <PlannedDateModal
        visible={showPlannedDateModal}
        date={plannedDate}
        onChange={setPlannedDate}
        onConfirm={confirmPlannedDate}
        onCancel={cancelPlannedDateModal}
        loading={updating === 'planned'}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  empty: { color: C.sub, fontSize: 16 },
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
  },
  title: { color: C.text, fontSize: 18, fontWeight: '700' },
  meta: { color: C.sub, fontSize: 12, marginTop: 6 },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  description: { color: C.text, fontSize: 14, lineHeight: 20 },
  statusSelectBtn: {
    borderWidth: 1,
    borderColor: C.accent,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,217,255,0.14)',
    alignItems: 'center',
  },
  statusSelectText: { color: C.accent, fontSize: 13, fontWeight: '700' },
  prRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 8,
    marginTop: 8,
  },
  prText: { color: C.text, fontSize: 13, fontWeight: '600' },
  prSub: { color: C.sub, fontSize: 11, marginTop: 3 },
  engineersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editBtn: { color: C.accent, fontSize: 13, fontWeight: '600' },
  engineersEditSection: { marginTop: 4 },
  editButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: C.bg, fontWeight: '700', fontSize: 14 },
  cancelBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelBtnText: { color: C.sub, fontWeight: '600', fontSize: 14 },
  btnDisabled: { opacity: 0.6 },
  engineersDisplay: { marginTop: 4 },
  noEngineers: { color: C.sub, fontSize: 13 },
  engineersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  engineerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    borderRadius: 20,
    paddingLeft: 8,
    paddingRight: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  engineerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  engineerAvatarText: {
    color: C.bg,
    fontSize: 10,
    fontWeight: '700',
  },
  engineerName: {
    color: C.text,
    fontSize: 12,
    fontWeight: '600',
  },
});

// ПЛANNED DATE MODAL
const PlannedDateModal = ({
  visible,
  date,
  onChange,
  onConfirm,
  onCancel,
  loading,
}: {
  visible: boolean;
  date: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={modalStyles.overlay}>
      <View style={modalStyles.container}>
        <Text style={modalStyles.title}>Планируемая дата монтажа</Text>
        <Text style={modalStyles.subtitle}>Укажите дату, когда планируется выполнение работ</Text>
        <TextInput
          style={modalStyles.input}
          value={date}
          onChangeText={onChange}
          placeholder="YYYY-MM-DD или YYYY-MM-DDTHH:mm"
          placeholderTextColor={C.sub}
        />
        <View style={modalStyles.buttons}>
          <TouchableOpacity
            style={[modalStyles.btn, modalStyles.cancelBtn]}
            onPress={onCancel}
            disabled={loading}
          >
            <Text style={modalStyles.cancelText}>Отмена</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[modalStyles.btn, modalStyles.confirmBtn, loading && modalStyles.btnDisabled]}
            onPress={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={C.bg} size="small" />
            ) : (
              <Text style={modalStyles.confirmText}>Подтвердить</Text>
)}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// Styles for Modal
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: C.border,
  },
  title: {
    color: C.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: C.sub,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    color: C.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: C.border,
  },
  confirmBtn: {
    backgroundColor: C.accent,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  cancelText: { color: C.sub, fontSize: 14, fontWeight: '600' },
  confirmText: { color: C.bg, fontSize: 14, fontWeight: '700' },
});