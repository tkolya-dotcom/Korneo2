'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { mileageApi, mileagePeriods, parseMileagePeriod, MileagePeriod, MileageReport, MileageSummaryCards, MileageSegment } from '@/src/lib/mileage';
import { usersApi } from '@/src/lib/supabase';
import AddressSuggestionCard from '@/src/components/AddressSuggestionCard';

const C = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  text: '#E0E0E0',
  sub: '#8892a0',
  border: 'rgba(0, 217, 255, 0.15)',
  success: '#00FF88',
  warning: '#F59E0B',
};

type UserOption = {
  id: string;
  name: string;
};

const formatKm = (km: number) => km.toFixed(1);
const formatRub = (rub: number) => rub.toFixed(2);
const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const PeriodBadge = ({ period, selected, onPress }: { period: MileagePeriod; selected: boolean; onPress: () => void }) => {
  const labels: Record<MileagePeriod, string> = { day: 'День', month: 'Месяц', year: 'Год' };
  return (
    <TouchableOpacity
      style={[s.badge, selected && s.badgeActive]}
      onPress={onPress}
    >
      <Text style={[s.badgeText, selected && s.badgeTextActive]}>{labels[period]}</Text>
    </TouchableOpacity>
  );
};

const SummaryCard = ({
  label,
  km,
  compensation,
  jobs,
  color,
}: {
  label: string;
  km: number;
  compensation: number;
  jobs: number;
  color: string;
}) => (
  <View style={[s.summaryCard, { borderLeftColor: color }]}>
    <Text style={s.summaryLabel}>{label}</Text>
    <View style={s.summaryRow}>
      <View style={s.summaryItem}>
        <Text style={[s.summaryValue, { color }]}>{formatKm(km)}</Text>
        <Text style={s.summaryUnit}>км</Text>
      </View>
      <View style={s.summaryItem}>
        <Text style={s.summaryValue}>{formatRub(compensation)}</Text>
        <Text style={s.summaryUnit}>руб</Text>
      </View>
      <View style={s.summaryItem}>
        <Text style={s.summaryValue}>{jobs}</Text>
        <Text style={s.summaryUnit}>работ</Text>
      </View>
    </View>
  </View>
);

const SegmentRow = ({ segment, onPress }: { segment: MileageSegment; onPress: () => void }) => (
  <Pressable style={s.segmentRow} onPress={onPress}>
    <View style={s.segmentIndex}>
      <Text style={s.segmentIndexText}>{segment.index}</Text>
    </View>
    <View style={s.segmentContent}>
      <View style={s.addressRow}>
        <Ionicons name="location-outline" size={12} color={C.warning} />
        <Text style={s.addressText} numberOfLines={1}>{segment.from_address}</Text>
      </View>
      <View style={s.arrowRow}>
        <Ionicons name="arrow-down" size={12} color={C.sub} />
        <Text style={s.distanceText}>{formatKm(segment.distance_km)} км</Text>
        <Text style={s.compensationSubText}>{formatRub(segment.compensation_rub)} руб</Text>
      </View>
      <View style={s.addressRow}>
        <Ionicons name="location" size={12} color={C.accent} />
        <Text style={s.addressText} numberOfLines={1}>{segment.to_address}</Text>
      </View>
      <Text style={s.timeText}>{formatDate(segment.started_at)}</Text>
    </View>
  </Pressable>
);

const UserPickerModal = ({
  visible,
  users,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  users: UserOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={s.modalOverlay} onPress={onClose}>
      <View style={s.modalContent}>
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>Выбор инженера</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={C.text} />
          </TouchableOpacity>
        </View>
        <ScrollView style={s.modalList}>
          <TouchableOpacity
            style={[s.userRow, selectedId === null && s.userRowSelected]}
            onPress={() => { onSelect(null); onClose(); }}
          >
            <Text style={[s.userName, selectedId === null && s.userNameSelected]}>Все пользователи</Text>
          </TouchableOpacity>
          {users.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={[s.userRow, selectedId === user.id && s.userRowSelected]}
              onPress={() => { onSelect(user.id); onClose(); }}
            >
              <Text style={[s.userName, selectedId === user.id && s.userNameSelected]}>{user.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Pressable>
  </Modal>
);

const ExportModal = ({
  visible,
  onExport,
  onClose,
  loading,
}: {
  visible: boolean;
  onExport: (format: 'xlsx' | 'pdf') => void;
  onClose: () => void;
  loading: boolean;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={s.modalOverlay} onPress={onClose}>
      <View style={s.modalContent}>
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>Экспорт отчета</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={C.text} />
          </TouchableOpacity>
        </View>
        <View style={s.exportButtons}>
          <TouchableOpacity
            style={s.exportBtn}
            onPress={() => onExport('xlsx')}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={C.accent} />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={22} color={C.accent} />
                <Text style={s.exportBtnText}>Excel (XLSX)</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={s.exportBtn}
            onPress={() => onExport('pdf')}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={C.accent} />
            ) : (
              <>
                <Ionicons name="document-outline" size={22} color={C.accent} />
                <Text style={s.exportBtnText}>PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  </Modal>
);

export default function MileageScreen() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState<MileagePeriod>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [report, setReport] = useState<MileageReport | null>(null);
  const [summary, setSummary] = useState<MileageSummaryCards | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const allUsers = await usersApi.getAll();
      const normalized = (Array.isArray(allUsers) ? allUsers : []) as Array<{ id?: string; name?: string; email?: string }>;
      setUsers(
        normalized.map((u) => ({
          id: String(u.id || ''),
          name: String(u.name || u.email || 'Пользователь'),
        }))
      );
    } catch {
      setUsers([]);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [reportResult, summaryResult] = await Promise.all([
        mileageApi.buildReport({ period: selectedPeriod, anchorDate: selectedDate, userId: selectedUserId }),
        mileageApi.buildSummaryCards({ anchorDate: selectedDate, userId: selectedUserId }),
      ]);
      setReport(reportResult);
      setSummary(summaryResult);
    } catch (error) {
      console.error('Failed to load mileage data:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить данные о пробеге');
    }
  }, [selectedPeriod, selectedDate, selectedUserId]);

  useEffect(() => {
    loadUsers().then(() => setLoading(false));
  }, [loadUsers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handlePeriodChange = (period: MileagePeriod) => {
    setSelectedPeriod(period);
  };

  const handleDateChange = (direction: 'prev' | 'next') => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      if (selectedPeriod === 'day') {
        next.setDate(next.getDate() + (direction === 'next' ? 1 : -1));
      } else if (selectedPeriod === 'month') {
        next.setMonth(next.getMonth() + (direction === 'next' ? 1 : -1));
      } else {
        next.setFullYear(next.getFullYear() + (direction === 'next' ? 1 : -1));
      }
      return next;
    });
  };

  const getDateLabel = () => {
    if (selectedPeriod === 'day') {
      return selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    } else if (selectedPeriod === 'month') {
      return selectedDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    }
    return selectedDate.getFullYear().toString();
  };

  const getSelectedUserName = () => {
    if (!selectedUserId) return 'Все пользователи';
    const user = users.find((u) => u.id === selectedUserId);
    return user?.name || 'Пользователь';
  };

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    if (!report || !summary) {
      Alert.alert('Ошибка', 'Нет данных для экспорта');
      return;
    }
    setExporting(true);
    try {
      const uri = await mileageApi.exportReport({ report, summary, format });
      Alert.alert('Успешно', `Файл сохранен:\n${uri}`);
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Ошибка', 'Не удалось экспортировать отчет');
    } finally {
      setExporting(false);
      setExportModalVisible(false);
    }
  };

  const renderSegment = ({ item }: { item: MileageSegment }) => (
    <SegmentRow segment={item} onPress={() => {}} />
  );

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={s.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.title}>Учет пробега</Text>
        <TouchableOpacity style={s.exportHeaderBtn} onPress={() => setExportModalVisible(true)}>
          <Ionicons name="download-outline" size={22} color={C.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
      >
        {/* Period Selector */}
        <View style={s.periodRow}>
          {mileagePeriods.map((p) => (
            <PeriodBadge key={p} period={p} selected={selectedPeriod === p} onPress={() => handlePeriodChange(p)} />
          ))}
        </View>

        {/* Date Navigation */}
        <View style={s.dateNav}>
          <TouchableOpacity style={s.dateNavBtn} onPress={() => handleDateChange('prev')}>
            <Ionicons name="chevron-back" size={20} color={C.accent} />
          </TouchableOpacity>
          <Text style={s.dateLabel}>{getDateLabel()}</Text>
          <TouchableOpacity style={s.dateNavBtn} onPress={() => handleDateChange('next')}>
            <Ionicons name="chevron-forward" size={20} color={C.accent} />
          </TouchableOpacity>
        </View>

        {/* User Selector */}
        <TouchableOpacity style={s.userSelector} onPress={() => setUserModalVisible(true)}>
          <Ionicons name="person-outline" size={18} color={C.accent} />
          <Text style={s.userSelectorText}>{getSelectedUserName()}</Text>
          <Ionicons name="chevron-down" size={16} color={C.sub} />
        </TouchableOpacity>

        {/* Summary Cards */}
        {summary && (
          <View style={s.summaryContainer}>
            <SummaryCard
              label="Сутки"
              km={summary.day.total_km}
              compensation={summary.day.compensation_rub}
              jobs={summary.day.jobs_count}
              color={C.accent}
            />
            <SummaryCard
              label="Месяц"
              km={summary.month.total_km}
              compensation={summary.month.compensation_rub}
              jobs={summary.month.jobs_count}
              color={C.success}
            />
            <SummaryCard
              label="Год"
              km={summary.year.total_km}
              compensation={summary.year.compensation_rub}
              jobs={summary.year.jobs_count}
              color={C.warning}
            />
          </View>
        )}

        {/* Route Preview */}
        {report?.route_preview_url && (
          <View style={s.mapPreviewContainer}>
            <Image
              source={{ uri: report.route_preview_url }}
              style={s.mapPreview}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Segments Header */}
        <View style={s.segmentsHeader}>
          <Text style={s.segmentsTitle}>Сегменты пробега</Text>
          <Text style={s.segmentsCount}>{report?.segments.length || 0} записей</Text>
        </View>

        {/* Segments List */}
        {report && report.segments.length > 0 ? (
          <FlatList
            data={report.segments}
            renderItem={renderSegment}
            keyExtractor={(item) => `segment-${item.index}`}
            scrollEnabled={false}
            contentContainerStyle={s.segmentsList}
          />
        ) : (
          <View style={s.emptySegments}>
            <Ionicons name="car-outline" size={48} color={C.sub} />
            <Text style={s.emptyText}>Нет данных о пробеге за этот период</Text>
          </View>
        )}

        {/* Counters */}
        {report && (
          <View style={s.countersContainer}>
            <Text style={s.countersTitle}>Счетчики работ</Text>
            <View style={s.countersGrid}>
              <View style={s.counterItem}>
                <Text style={s.counterValue}>{report.counters.completed_tasks}</Text>
                <Text style={s.counterLabel}>Задачи</Text>
              </View>
              <View style={s.counterItem}>
                <Text style={s.counterValue}>{report.counters.completed_installations}</Text>
                <Text style={s.counterLabel}>Монтажи</Text>
              </View>
              <View style={s.counterItem}>
                <Text style={s.counterValue}>{report.counters.completed_requests}</Text>
                <Text style={s.counterLabel}>Заявки</Text>
              </View>
              <View style={s.counterItem}>
                <Text style={s.counterValue}>{report.counters.completed_address_works}</Text>
                <Text style={s.counterLabel}>Адреса</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <UserPickerModal
        visible={userModalVisible}
        users={users}
        selectedId={selectedUserId}
        onSelect={setSelectedUserId}
        onClose={() => setUserModalVisible(false)}
      />
      <ExportModal
        visible={exportModalVisible}
        onExport={handleExport}
        onClose={() => setExportModalVisible(false)}
        loading={exporting}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  loadingText: { color: C.sub, marginTop: 12, fontSize: 14 },
  scrollView: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: C.text, fontSize: 18, fontWeight: '700' },
  exportHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  badgeActive: {
    borderColor: C.accent,
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
  },
  badgeText: { color: C.sub, fontSize: 13, fontWeight: '600' },
  badgeTextActive: { color: C.accent },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 16,
  },
  dateNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLabel: { color: C.text, fontSize: 16, fontWeight: '600' },
  userSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  userSelectorText: { flex: 1, color: C.text, fontSize: 14 },
  summaryContainer: { paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  summaryCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 3,
  },
  summaryLabel: { color: C.sub, fontSize: 12, marginBottom: 8 },
  summaryRow: { flexDirection: 'row', gap: 16 },
  summaryItem: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  summaryValue: { color: C.text, fontSize: 18, fontWeight: '700' },
  summaryUnit: { color: C.sub, fontSize: 11 },
  mapPreviewContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: C.card,
  },
  mapPreview: { width: '100%', height: 180 },
  segmentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  segmentsTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  segmentsCount: { color: C.sub, fontSize: 12 },
  segmentsList: { paddingHorizontal: 16, gap: 10, paddingBottom: 16 },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  segmentIndex: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentIndexText: { color: C.accent, fontSize: 12, fontWeight: '700' },
  segmentContent: { flex: 1, gap: 4 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addressText: { color: C.text, fontSize: 13, flex: 1 },
  arrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  distanceText: { color: C.accent, fontSize: 12, fontWeight: '600' },
  compensationSubText: { color: C.sub, fontSize: 11 },
  timeText: { color: C.sub, fontSize: 11, marginTop: 2 },
  emptySegments: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    marginHorizontal: 16,
    backgroundColor: C.card,
    borderRadius: 14,
  },
  emptyText: { color: C.sub, fontSize: 14, marginTop: 12 },
  countersContainer: {
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 14,
    padding: 16,
  },
  countersTitle: { color: C.text, fontSize: 14, fontWeight: '600', marginBottom: 12 },
  countersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  counterItem: { width: '45%', alignItems: 'center', paddingVertical: 8 },
  counterValue: { color: C.accent, fontSize: 22, fontWeight: '800' },
  counterLabel: { color: C.sub, fontSize: 12, marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  modalList: { paddingHorizontal: 16 },
  userRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  userRowSelected: { backgroundColor: 'rgba(0, 217, 255, 0.1)', borderRadius: 8 },
  userName: { color: C.text, fontSize: 14 },
  userNameSelected: { color: C.accent, fontWeight: '600' },
  exportButtons: { padding: 16, gap: 12 },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    borderRadius: 12,
    gap: 10,
  },
  exportBtnText: { color: C.accent, fontSize: 16, fontWeight: '600' },
});