import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import { chatApi, jobsApi } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';

const C = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  text: '#E0E0E0',
  sub: '#8892A0',
  border: 'rgba(0, 217, 255, 0.15)',
  red: '#EF4444',
  yellow: '#F59E0B',
  green: '#10B981',
};

type ChatFilter = 'all' | 'private' | 'group';
type MessengerTab = 'chats' | 'map' | 'analytics';
type JobMapFilter = 'all' | 'active' | 'done';

const FILTER_LABEL: Record<ChatFilter, string> = {
  all: 'Все',
  private: 'Личные',
  group: 'Группы',
};

const TAB_LABEL: Record<MessengerTab, string> = {
  chats: 'Чаты',
  map: 'Карта работ',
  analytics: 'Статистика',
};

const MAP_FILTER_LABEL: Record<JobMapFilter, string> = {
  all: 'Все',
  active: 'В работе',
  done: 'Завершены',
};

const MAPBOX_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ||
  'pk.eyJ1IjoidGtvbHlhIiwiYSI6ImNtbXZ0eGI1ODJkbnIycXNkMTBteWNvd20ifQ.m0WVg1Ix7RuR3AJyHDHRtg';

const MAPBOX_STYLE_ID = 'mapbox/dark-v11';
const MAX_MAP_PREVIEW_MARKERS = 18;

const toCoord = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value.trim().replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toMapPinColor = (status?: string | null) => {
  if (status === 'done') return '10B981';
  if (status === 'active') return 'F59E0B';
  return '00D9FF';
};

const buildMapPreviewUrl = (
  points: Array<{ lat: number; lng: number; status?: string | null }>
) => {
  if (!MAPBOX_TOKEN || points.length === 0) {
    return '';
  }

  const limitedPoints = points.slice(0, MAX_MAP_PREVIEW_MARKERS);
  const center = limitedPoints.reduce(
    (acc, point) => ({
      lat: acc.lat + point.lat,
      lng: acc.lng + point.lng,
    }),
    { lat: 0, lng: 0 }
  );

  const centerLat = center.lat / limitedPoints.length;
  const centerLng = center.lng / limitedPoints.length;
  const overlay = limitedPoints
    .map((point) => `pin-s+${toMapPinColor(point.status)}(${point.lng},${point.lat})`)
    .join(',');

  return `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE_ID}/static/${overlay}/${centerLng},${centerLat},10.6,0/1200x700?access_token=${MAPBOX_TOKEN}&attribution=false&logo=false`;
};

const toMessageText = (message: any) => {
  if (!message) return '';
  if (typeof message.text === 'string') return message.text;
  if (typeof message.content === 'string') return message.content;
  if (message.content && typeof message.content === 'object') {
    return message.content.text || message.content.message || message.content.content || '';
  }
  return '';
};

const getMessageAuthorId = (message: any) => {
  if (!message) return '';
  return message.user_id || message.sender_id || message.author_id || '';
};

const formatTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const compactCount = (value: number) => (value > 99 ? '99+' : String(value));

const sortChats = (items: any[]) =>
  [...items].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) {
      return a.pinned ? -1 : 1;
    }

    const aTime = a.last_message?.created_at || '';
    const bTime = b.last_message?.created_at || '';
    if (aTime !== bTime) {
      return aTime > bTime ? -1 : 1;
    }

    return String(a.chat_name || '').localeCompare(String(b.chat_name || ''), 'ru');
  });

const applyIncomingMessage = (items: any[], message: Record<string, unknown>, currentUserId?: string) => {
  const chatId = typeof message.chat_id === 'string' ? message.chat_id : '';
  if (!chatId) return items;

  const index = items.findIndex((chat) => chat.chat_id === chatId);
  if (index < 0) return items;

  const authorId = getMessageAuthorId(message);
  const next = [...items];
  const target = { ...next[index] };
  const unreadCount = Number(target.unread_count || 0);

  if (authorId && currentUserId && authorId !== currentUserId) {
    target.unread_count = unreadCount + 1;
  }

  target.last_message = {
    ...message,
    text: toMessageText(message),
  };

  next[index] = target;
  return sortChats(next);
};

const jobStatusLabel = (status?: string | null) => {
  if (status === 'done') return 'Завершено';
  if (status === 'active') return 'В работе';
  if (status === 'pending') return 'Не начато';
  return status || '—';
};

const jobStatusColor = (status?: string | null) => {
  if (status === 'done') return C.green;
  if (status === 'active') return C.yellow;
  return C.red;
};

const getTodayStart = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

const calcHoursDiff = (from?: string | null, to?: string | null) => {
  if (!from) return 0;
  const start = new Date(from);
  if (Number.isNaN(start.getTime())) return 0;
  const endDate = to ? new Date(to) : new Date();
  if (Number.isNaN(endDate.getTime())) return 0;
  return (endDate.getTime() - start.getTime()) / 3_600_000;
};

export default function MessengerScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState<MessengerTab>('chats');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ChatFilter>('all');
  const [mapFilter, setMapFilter] = useState<JobMapFilter>('all');

  const [chats, setChats] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);

  const [newChatVisible, setNewChatVisible] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactQuery, setContactQuery] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [openingChatUserId, setOpeningChatUserId] = useState('');
  const swipeRefs = useRef<Record<string, Swipeable | null>>({});

  const loadChats = useCallback(async () => {
    try {
      const data = await chatApi.getChats();
      setChats(sortChats(data || []));
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const data = await jobsApi.getAll();
      setJobs(data || []);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadChats(), loadJobs()]);
  }, [loadChats, loadJobs]);

  useEffect(() => {
    let mounted = true;
    loadAll().finally(() => {
      if (mounted) {
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [loadAll]);

  useFocusEffect(
    useCallback(() => {
      void loadAll();
      return undefined;
    }, [loadAll])
  );

  useEffect(() => {
    if (!user?.id) return undefined;
    const channel = chatApi.subscribeAllChats((message) => {
      setChats((prev) => applyIncomingMessage(prev, message, user.id));
    });

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  useEffect(() => {
    const jobsChannel = jobsApi.subscribeAll(() => {
      void loadJobs();
    });
    return () => {
      jobsChannel.unsubscribe();
    };
  }, [loadJobs]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'chats') {
      await loadChats();
    } else {
      await loadJobs();
    }
    setRefreshing(false);
  };

  const loadContacts = async (query = '') => {
    try {
      setContactsLoading(true);
      const data = await chatApi.getContacts(query);
      setContacts(data || []);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить список сотрудников');
    } finally {
      setContactsLoading(false);
    }
  };

  const openNewChatModal = () => {
    setContactQuery('');
    setContacts([]);
    setNewChatVisible(true);
    void loadContacts('');
  };

  const startPrivateChat = async (targetUser: any) => {
    if (!targetUser?.id) return;
    try {
      setOpeningChatUserId(targetUser.id);
      const chatId = await chatApi.openPrivateChat(targetUser.id);
      setNewChatVisible(false);
      await loadChats();
      router.push({
        pathname: '/(app)/chat/[id]',
        params: {
          id: chatId,
          name: targetUser.name || 'Чат',
          members_count: '2',
        },
      } as any);
    } catch (error) {
      Alert.alert(
        'Ошибка',
        error instanceof Error ? error.message : 'Не удалось открыть личный чат'
      );
    } finally {
      setOpeningChatUserId('');
    }
  };

  const totalUnread = useMemo(
    () => chats.reduce((sum, chat) => sum + Number(chat.unread_count || 0), 0),
    [chats]
  );

  const filteredChats = useMemo(() => {
    const query = search.trim().toLowerCase();
    return chats.filter((chat) => {
      if (activeFilter === 'private' && chat.chat_type === 'group') return false;
      if (activeFilter === 'group' && chat.chat_type !== 'group') return false;
      if (!query) return true;

      const haystack = [chat.chat_name, chat.partner?.name, chat.last_message?.text]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [activeFilter, chats, search]);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return jobs.filter((job) => {
      if (mapFilter !== 'all' && job.status !== mapFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = [job.address, job.district, job.sk_name, job.engineer?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [jobs, mapFilter, search]);

  const mapPoints = useMemo(
    () =>
      filteredJobs
        .map((job) => {
          const lat = toCoord(job.lat ?? job.latitude);
          const lng = toCoord(job.lng ?? job.longitude);
          if (lat == null || lng == null) {
            return null;
          }
          return {
            id: String(job.id),
            lat,
            lng,
            status: job.status as string | null | undefined,
          };
        })
        .filter(Boolean) as Array<{ id: string; lat: number; lng: number; status?: string | null }>,
    [filteredJobs]
  );

  const mapPreviewUrl = useMemo(() => buildMapPreviewUrl(mapPoints), [mapPoints]);

  const analytics = useMemo(() => {
    const todayStart = getTodayStart();
    const todayJobs = jobs.filter((job) => {
      if (!job.started_at) return false;
      const date = new Date(job.started_at);
      return !Number.isNaN(date.getTime()) && date >= todayStart;
    });

    const doneTodayCount = todayJobs.filter((job) => job.status === 'done').length;
    const activeTodayCount = todayJobs.filter((job) => job.status === 'active').length;

    const byEngineer = jobs.reduce<Record<string, { total: number; done: number; totalHours: number; withTime: number }>>(
      (acc, job) => {
        const name = job.engineer?.name || 'Неизвестно';
        if (!acc[name]) {
          acc[name] = { total: 0, done: 0, totalHours: 0, withTime: 0 };
        }
        acc[name].total += 1;
        if (job.status === 'done') {
          acc[name].done += 1;
          const hours = calcHoursDiff(job.started_at, job.finished_at);
          if (hours > 0) {
            acc[name].totalHours += hours;
            acc[name].withTime += 1;
          }
        }
        return acc;
      },
      {}
    );

    const engineerRows = Object.entries(byEngineer)
      .map(([name, value]) => ({
        name,
        total: value.total,
        done: value.done,
        avgHours: value.withTime > 0 ? value.totalHours / value.withTime : 0,
      }))
      .sort((a, b) => b.done - a.done);

    return {
      doneTodayCount,
      activeTodayCount,
      engineerRows,
    };
  }, [jobs]);

  const updateChatLocal = (chatId: string, patch: Record<string, unknown>) => {
    setChats((prev) =>
      sortChats(
        prev.map((chat) => {
          if (chat.chat_id !== chatId) return chat;
          return { ...chat, ...patch };
        })
      )
    );
  };

  const togglePinned = async (chat: any) => {
    try {
      const next = await chatApi.setPinned(chat.chat_id, !chat.pinned);
      updateChatLocal(chat.chat_id, { pinned: next });
    } catch (error) {
      Alert.alert(
        'Не удалось изменить закрепление',
        error instanceof Error ? error.message : 'Ошибка изменения статуса закрепления'
      );
    }
  };

  const toggleMuted = async (chat: any) => {
    try {
      const next = await chatApi.setMuted(chat.chat_id, !chat.muted);
      updateChatLocal(chat.chat_id, { muted: next });
    } catch (error) {
      Alert.alert(
        'Не удалось изменить звук',
        error instanceof Error ? error.message : 'Ошибка изменения статуса звука'
      );
    }
  };

  const handleSwipeMute = async (chat: any) => {
    await toggleMuted(chat);
    swipeRefs.current[chat.chat_id]?.close();
  };

  const openChatFilterMenu = () => {
    Alert.alert(
      'Фильтр чатов',
      'Выберите тип',
      [
        ...(['all', 'private', 'group'] as ChatFilter[]).map((filter) => ({
          text: FILTER_LABEL[filter],
          onPress: () => setActiveFilter(filter),
        })),
        { text: 'Отмена', style: 'cancel' as const },
      ]
    );
  };

  const openMapFilterMenu = () => {
    Alert.alert(
      'Фильтр работ',
      'Выберите статус',
      [
        ...(['all', 'active', 'done'] as JobMapFilter[]).map((filter) => ({
          text: MAP_FILTER_LABEL[filter],
          onPress: () => setMapFilter(filter),
        })),
        { text: 'Отмена', style: 'cancel' as const },
      ]
    );
  };

  const openActions = (chat: any) => {
    Alert.alert(chat.chat_name || 'Чат', 'Действия', [
      {
        text: chat.pinned ? 'Открепить' : 'Закрепить',
        onPress: () => {
          void togglePinned(chat);
        },
      },
      {
        text: chat.muted ? 'Включить звук' : 'Без звука',
        onPress: () => {
          void toggleMuted(chat);
        },
      },
      { text: 'Отмена', style: 'cancel' },
    ]);
  };

  const openChat = (chat: any) => {
    updateChatLocal(chat.chat_id, { unread_count: 0 });
    void chatApi.markChatAsRead(chat.chat_id);

    router.push({
      pathname: '/(app)/chat/[id]',
      params: {
        id: chat.chat_id,
        name: chat.chat_name,
        members_count: String(chat.members_count || 2),
      },
    } as any);
  };

  const openJobChat = (job: any) => {
    if (!job.chat_id) {
      Alert.alert('Чат не найден', 'У этой работы нет связанного чата.');
      return;
    }

    const linkedChat = chats.find((chat) => chat.chat_id === job.chat_id);
    router.push({
      pathname: '/(app)/chat/[id]',
      params: {
        id: job.chat_id,
        name: linkedChat?.chat_name || 'Чат работы',
        members_count: String(linkedChat?.members_count || 2),
      },
    } as any);
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{TAB_LABEL[activeTab]}</Text>
        <View style={s.headerRight}>
          {activeTab === 'chats' ? (
            <TouchableOpacity style={s.addBtn} onPress={openNewChatModal}>
              <Text style={s.addBtnText}>+</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.addBtn} onPress={() => void onRefresh()}>
              <Text style={s.addBtnText}>↻</Text>
            </TouchableOpacity>
          )}
          <Text style={s.count}>{activeTab === 'chats' ? filteredChats.length : filteredJobs.length}</Text>
          {activeTab === 'chats' && totalUnread > 0 ? (
            <View style={s.totalBadge}>
              <Text style={s.totalBadgeText}>{compactCount(totalUnread)}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={s.tabsRow}>
        {(['chats', 'map', 'analytics'] as MessengerTab[]).map((tab) => {
          const active = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[s.tabChip, active && s.tabChipActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[s.tabText, active && s.tabTextActive]}>{TAB_LABEL[tab]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={activeTab === 'chats' ? 'Поиск чатов' : 'Поиск работ'}
        placeholderTextColor={C.sub}
        style={s.search}
      />

      {activeTab === 'chats' ? (
        <>
          <View style={s.filtersRow}>
            <TouchableOpacity style={s.selectFilterBtn} onPress={openChatFilterMenu}>
              <Text style={s.selectFilterText}>Тип чатов: {FILTER_LABEL[activeFilter]} ▾</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={filteredChats}
            keyExtractor={(item) => item.chat_id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
            }
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={<Text style={s.empty}>Чатов пока нет</Text>}
            renderItem={({ item }) => {
              const unreadCount = Number(item.unread_count || 0);
              const ownLast = Boolean(user?.id) && getMessageAuthorId(item.last_message) === user?.id;
              const ticks = ownLast ? (unreadCount === 0 ? '✓✓' : '✓') : '';

              return (
                <Swipeable
                  ref={(ref: Swipeable | null) => {
                    swipeRefs.current[item.chat_id] = ref;
                  }}
                  renderLeftActions={() => (
                    <View style={s.swipeActionLeft}>
                      <Text style={s.swipeActionText}>{item.muted ? 'Включить звук' : 'Без звука'}</Text>
                    </View>
                  )}
                  overshootLeft={false}
                  onSwipeableOpen={(direction: 'left' | 'right') => {
                    if (direction === 'right') {
                      void handleSwipeMute(item);
                    }
                  }}
                >
                  <TouchableOpacity
                    style={s.card}
                    onPress={() => openChat(item)}
                    onLongPress={() => openActions(item)}
                    delayLongPress={180}
                  >
                    <View style={s.row}>
                      <View style={s.avatar}>
                        <Text style={s.avatarText}>{(item.chat_name || '?').slice(0, 1).toUpperCase()}</Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={s.nameRow}>
                          <Text style={s.name} numberOfLines={1}>
                            {item.chat_name}
                          </Text>
                          <View style={s.timeRow}>
                            {ticks ? <Text style={[s.ticks, unreadCount === 0 && s.ticksRead]}>{ticks}</Text> : null}
                            <Text style={s.time}>{formatTime(item.last_message?.created_at)}</Text>
                          </View>
                        </View>

                        <Text style={s.preview} numberOfLines={1}>
                          {item.last_message?.text ||
                            (item.chat_type === 'group' ? 'Групповой чат' : 'Личный чат')}
                        </Text>

                        <Text style={s.meta}>
                          {item.chat_type === 'group' ? 'Группа' : 'Личный'} • {item.members_count} участ.
                        </Text>
                      </View>

                      {unreadCount > 0 ? (
                        <View style={[s.unreadBadge, item.muted && s.unreadBadgeMuted]}>
                          <Text style={s.unreadBadgeText}>{compactCount(unreadCount)}</Text>
                        </View>
                      ) : (
                        <View style={s.iconsCol}>
                          {item.pinned ? <Text style={s.pin}>📌</Text> : null}
                          {item.muted ? <Text style={s.muted}>🔕</Text> : null}
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </Swipeable>
              );
            }}
          />
        </>
      ) : null}

      {activeTab === 'map' ? (
        <>
          <View style={s.filtersRow}>
            <TouchableOpacity style={s.selectFilterBtn} onPress={openMapFilterMenu}>
              <Text style={s.selectFilterText}>Статус работ: {MAP_FILTER_LABEL[mapFilter]} ▾</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={filteredJobs}
            keyExtractor={(item) => String(item.id)}
            ListHeaderComponent={
              <View style={s.mapCard}>
                {mapPreviewUrl ? (
                  <>
                    <Image source={{ uri: mapPreviewUrl }} style={s.mapPreview} resizeMode="cover" />
                    <Text style={s.mapHint}>Mapbox • отображено точек: {mapPoints.length}</Text>
                  </>
                ) : (
                  <Text style={s.mapHint}>Нет координат для отображения карты</Text>
                )}
              </View>
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
            }
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={<Text style={s.empty}>Работы не найдены</Text>}
            renderItem={({ item }) => {
              const overdue =
                item.status === 'active' &&
                typeof item.planned_duration_hours === 'number' &&
                calcHoursDiff(item.started_at) > item.planned_duration_hours;

              return (
                <View style={s.jobCard}>
                  <View style={s.jobCardHeader}>
                    <Text style={s.jobAddress} numberOfLines={2}>
                      {item.address || 'Без адреса'}
                    </Text>
                    <View style={[s.statusBadge, { borderColor: jobStatusColor(item.status) }]}>
                      <Text style={[s.statusBadgeText, { color: jobStatusColor(item.status) }]}>
                        {jobStatusLabel(item.status)}
                      </Text>
                    </View>
                  </View>

                  <Text style={s.jobMeta}>
                    {item.district || 'Район не указан'}
                    {item.sk_name ? ` • ${item.sk_name}` : ''}
                    {item.sk_count ? ` • ${item.sk_count} СК` : ''}
                  </Text>
                  <Text style={s.jobMeta}>
                    Инженер: {item.engineer?.name || 'Неизвестно'} • Начало: {formatDateTime(item.started_at)}
                  </Text>
                  {overdue ? <Text style={s.jobOverdue}>Просрочено по плановому времени</Text> : null}

                  <View style={s.jobActionsRow}>
                    <TouchableOpacity
                      style={[s.jobActionBtn, !item.chat_id && s.jobActionBtnDisabled]}
                      onPress={() => openJobChat(item)}
                      disabled={!item.chat_id}
                    >
                      <Text style={s.jobActionText}>Открыть чат</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        </>
      ) : null}

      {activeTab === 'analytics' ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
          }
        >
          <View style={s.analyticsCard}>
            <Text style={s.analyticsTitle}>Сегодня</Text>
            <View style={s.analyticsRow}>
              <Text style={s.analyticsLabel}>Завершено</Text>
              <Text style={[s.analyticsValue, { color: C.green }]}>{analytics.doneTodayCount}</Text>
            </View>
            <View style={s.analyticsRow}>
              <Text style={s.analyticsLabel}>В работе</Text>
              <Text style={[s.analyticsValue, { color: C.yellow }]}>{analytics.activeTodayCount}</Text>
            </View>
          </View>

          <View style={s.analyticsCard}>
            <Text style={s.analyticsTitle}>По инженерам</Text>
            {analytics.engineerRows.length === 0 ? (
              <Text style={s.emptySmall}>Нет данных</Text>
            ) : (
              analytics.engineerRows.map((row) => (
                <View key={row.name} style={s.analyticsRow}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={s.analyticsEngineer}>{row.name}</Text>
                    <Text style={s.analyticsSub}>
                      Завершено: {row.done}
                      {row.avgHours > 0 ? ` • Ср. время: ${row.avgHours.toFixed(1)} ч` : ''}
                    </Text>
                  </View>
                  <Text style={s.analyticsValue}>{row.total}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      ) : null}

      <Modal
        visible={newChatVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNewChatVisible(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Новый личный чат</Text>
              <TouchableOpacity onPress={() => setNewChatVisible(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={s.modalBody}>
              <TextInput
                value={contactQuery}
                onChangeText={(value) => {
                  setContactQuery(value);
                  void loadContacts(value);
                }}
                style={s.modalSearch}
                placeholder="Поиск сотрудника"
                placeholderTextColor={C.sub}
              />

              {contactsLoading ? (
                <View style={s.modalLoading}>
                  <ActivityIndicator color={C.accent} />
                </View>
              ) : (
                <FlatList
                  data={contacts}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={s.contactsList}
                  ListEmptyComponent={<Text style={s.emptySmall}>Сотрудники не найдены</Text>}
                  renderItem={({ item }) => {
                    const busy = openingChatUserId === item.id;
                    return (
                      <TouchableOpacity
                        style={s.contactRow}
                        onPress={() => {
                          void startPrivateChat(item);
                        }}
                        disabled={busy}
                      >
                        <View style={s.contactAvatar}>
                          <Text style={s.contactAvatarText}>
                            {(item.name || '?').slice(0, 1).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.contactName}>{item.name || 'Сотрудник'}</Text>
                          {item.role ? <Text style={s.contactMeta}>{item.role}</Text> : null}
                        </View>
                        <Text style={s.contactAction}>{busy ? '...' : 'Открыть'}</Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 48,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: C.text, fontSize: 26, fontWeight: '700' },
  count: { color: C.sub, fontSize: 16 },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: C.accent, fontSize: 16, lineHeight: 18, fontWeight: '700' },
  totalBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    backgroundColor: C.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  tabsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  tabChipActive: { borderColor: C.accent, backgroundColor: 'rgba(0,217,255,0.16)' },
  tabText: { color: C.sub, fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: C.accent },
  search: {
    backgroundColor: C.card,
    color: C.text,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  filtersRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  selectFilterBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  selectFilterText: { color: C.text, fontSize: 12, fontWeight: '600' },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  filterChipActive: { borderColor: C.accent, backgroundColor: 'rgba(0,217,255,0.16)' },
  filterText: { color: C.sub, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: C.accent },
  swipeActionLeft: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 16,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 217, 255, 0.14)',
    borderWidth: 1,
    borderColor: C.border,
    minWidth: 150,
  },
  swipeActionText: { color: C.accent, fontSize: 12, fontWeight: '700' },
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 217, 255, 0.18)',
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: C.accent, fontWeight: '700' },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: C.text, fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  time: { color: C.sub, fontSize: 11 },
  ticks: { color: C.sub, fontSize: 11, fontWeight: '700' },
  ticksRead: { color: C.accent },
  preview: { color: C.sub, fontSize: 12, marginTop: 4 },
  meta: { color: C.sub, fontSize: 11, marginTop: 4, opacity: 0.85 },
  iconsCol: { minWidth: 26, alignItems: 'flex-end', justifyContent: 'center' },
  pin: { color: C.accent, fontSize: 13, marginBottom: 2 },
  muted: { color: C.red, fontSize: 13 },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: C.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeMuted: { backgroundColor: '#7A2530' },
  unreadBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  mapCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    marginBottom: 12,
  },
  mapPreview: {
    width: '100%',
    height: 220,
    backgroundColor: '#101523',
  },
  mapHint: {
    color: C.sub,
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  jobCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginBottom: 10,
  },
  jobCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  jobAddress: { color: C.text, fontSize: 15, fontWeight: '600', flex: 1 },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  jobMeta: { color: C.sub, fontSize: 12, marginTop: 6 },
  jobOverdue: { color: C.red, fontSize: 12, marginTop: 8, fontWeight: '600' },
  jobActionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  jobActionBtn: {
    backgroundColor: 'rgba(0,217,255,0.14)',
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  jobActionBtnDisabled: { opacity: 0.45 },
  jobActionText: { color: C.accent, fontSize: 12, fontWeight: '600' },
  analyticsCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 12,
  },
  analyticsTitle: { color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 10 },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  analyticsLabel: { color: C.sub, fontSize: 13 },
  analyticsValue: { color: C.text, fontSize: 16, fontWeight: '700' },
  analyticsEngineer: { color: C.text, fontSize: 13, fontWeight: '600' },
  analyticsSub: { color: C.sub, fontSize: 11, marginTop: 2 },
  empty: { color: C.sub, textAlign: 'center', marginTop: 60, fontSize: 16 },
  emptySmall: { color: C.sub, textAlign: 'center', marginTop: 30, fontSize: 13 },
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
    maxHeight: '78%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  modalClose: { color: C.sub, fontSize: 22 },
  modalBody: { padding: 14 },
  modalSearch: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: C.border,
    color: C.text,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  modalLoading: { paddingVertical: 20, alignItems: 'center' },
  contactsList: { paddingBottom: 16 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  contactAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: 'rgba(0,217,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarText: { color: C.accent, fontSize: 13, fontWeight: '700' },
  contactName: { color: C.text, fontSize: 14, fontWeight: '600' },
  contactMeta: { color: C.sub, fontSize: 11, marginTop: 2 },
  contactAction: { color: C.accent, fontSize: 12, fontWeight: '600' },
});
