import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/providers/AuthProvider';
import { chatApi, jobsApi } from '@/src/lib/supabase';
import { searchAddressSuggestions } from '@/src/lib/addressSearch';
import AddressSuggestionCard from '@/src/components/AddressSuggestionCard';

const C = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  text: '#E0E0E0',
  sub: '#8892A0',
  border: 'rgba(0, 217, 255, 0.15)',
  own: 'rgba(0, 217, 255, 0.20)',
  other: 'rgba(255, 255, 255, 0.06)',
  green: '#10B981',
  yellow: '#F59E0B',
  red: '#EF4444',
};

const DEFAULT_MESSAGE_WINDOW = 250;
const QUICK_REACTIONS = ['👍', '🔥', '✅', '❤️', '😂'];

const formatTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '\u2014';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '\u2014';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getReadState = (message: any, membersCount: number) => {
  const receipts = Array.isArray(message.read_receipts) ? message.read_receipts : [];
  const senderId = message.author_id || message.user_id || message.sender_id;
  const otherReceipts = receipts.filter((receipt: any) => {
    const receiptUserId = receipt.user_id || receipt.reader_id || '';
    return receiptUserId && receiptUserId !== senderId;
  });
  const required = Math.max(membersCount - 1, 1);
  return {
    ticks: otherReceipts.length >= required ? '✓✓' : '✓',
    isRead: otherReceipts.length >= required,
  };
};

const calcHoursDiff = (from?: string | null, to?: string | null) => {
  if (!from) return 0;
  const start = new Date(from);
  if (Number.isNaN(start.getTime())) return 0;
  const endDate = to ? new Date(to) : new Date();
  if (Number.isNaN(endDate.getTime())) return 0;
  return (endDate.getTime() - start.getTime()) / 3_600_000;
};

const jobStatusLabel = (status?: string | null) => {
  if (status === 'done') return '\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u043e';
  if (status === 'active') return '\u0412 \u0440\u0430\u0431\u043e\u0442\u0435';
  if (status === 'pending') return '\u041d\u0435 \u043d\u0430\u0447\u0430\u0442\u043e';
  return status || '\u2014';
};

const jobStatusColor = (status?: string | null) => {
  if (status === 'done') return C.green;
  if (status === 'active') return C.yellow;
  return C.red;
};

const parseAddressFromMessage = (message: any) => {
  const text = typeof message?.text === 'string' ? message.text : '';
  const marker = '\u041d\u0430\u0447\u0430\u043b \u0440\u0430\u0431\u043e\u0442\u0443 \u043f\u043e \u0430\u0434\u0440\u0435\u0441\u0443:';
  const index = text.indexOf(marker);
  if (index >= 0) {
    return text.slice(index + marker.length).trim();
  }
  return text.trim();
};

export default function ChatDetailScreen() {
  const { id, name, members_count } = useLocalSearchParams<{
    id: string;
    name?: string;
    members_count?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  const [text, setText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);

  const [startJobVisible, setStartJobVisible] = useState(false);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [addressQuery, setAddressQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [plannedHours, setPlannedHours] = useState('4');
  const [startingAddressKey, setStartingAddressKey] = useState('');
  const [reactingMessageId, setReactingMessageId] = useState('');

  const scrollRef = useRef<ScrollView>(null);

  const membersCount = useMemo(() => {
    const parsed = Number(members_count || 2);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
  }, [members_count]);

  const closeStartJobModalAndBack = useCallback(() => {
    setStartJobVisible(false);
    requestAnimationFrame(() => {
      router.back();
    });
  }, [router]);

  const loadMessagesAndJobs = useCallback(async () => {
    if (!id) return;
    const [messagesResult, jobsResult] = await Promise.allSettled([
      chatApi.getMessages(id),
      jobsApi.getAll({ chat_id: id }),
    ]);

    if (messagesResult.status === 'fulfilled') {
      const rawMessages = messagesResult.value || [];
      const messagesToShow = rawMessages.slice(-DEFAULT_MESSAGE_WINDOW);
      setMessages(messagesToShow);

      await chatApi.markChatAsRead(id).catch((error) => {
        console.warn('Failed to mark chat as read:', error);
      });

      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } else {
      console.error('Failed to load chat messages:', messagesResult.reason);
    }

    if (jobsResult.status === 'fulfilled') {
      setJobs(jobsResult.value || []);
    } else {
      console.warn('Failed to load chat jobs:', jobsResult.reason);
      setJobs([]);
    }
  }, [id]);

  const loadAddresses = useCallback(async () => {
    try {
      setAddressesLoading(true);
      const rows = await jobsApi.getAddresses();
      setAddresses(rows || []);
    } catch (error) {
      console.error('Failed to load addresses:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить адреса для работ');
    } finally {
      setAddressesLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    loadMessagesAndJobs().finally(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [loadMessagesAndJobs]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return undefined;
      void chatApi.markChatAsRead(id);
      return undefined;
    }, [id])
  );

  useEffect(() => {
    if (!id) return undefined;
    const channel = chatApi.subscribe(id, () => {
      void loadMessagesAndJobs();
    });
    return () => {
      channel.unsubscribe();
    };
  }, [id, loadMessagesAndJobs]);

  useEffect(() => {
    if (!id) return undefined;
    const jobsChannel = jobsApi.subscribeChat(id, () => {
      void loadMessagesAndJobs();
    });
    return () => {
      jobsChannel.unsubscribe();
    };
  }, [id, loadMessagesAndJobs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMessagesAndJobs();
    setRefreshing(false);
  };

  const openUserProfile = useCallback(
    (targetUserId?: string | null) => {
      const normalized = String(targetUserId || '').trim();
      if (!normalized) {
        return;
      }

      if (user?.id && normalized === String(user.id)) {
        router.push('/(app)/profile' as any);
        return;
      }

      router.push({
        pathname: '/(app)/user/[id]',
        params: { id: normalized },
      } as any);
    },
    [router, user?.id]
  );

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !id) return;

    setSending(true);
    try {
      await chatApi.sendMessage(id, trimmed);
      setText('');
      await loadMessagesAndJobs();
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const toggleReactionForMessage = async (messageId: string, reaction: string) => {
    if (!messageId) return;
    setReactingMessageId(messageId);
    try {
      await chatApi.toggleReaction(messageId, reaction);
      await loadMessagesAndJobs();
    } catch (error) {
      Alert.alert('Ошибка', error instanceof Error ? error.message : 'Не удалось обновить реакцию');
    } finally {
      setReactingMessageId('');
    }
  };

  const openReactionMenu = (message: any) => {
    Alert.alert(
      'Добавить реакцию',
      'Выберите эмодзи',
      [
        ...QUICK_REACTIONS.map((emoji) => ({
          text: emoji,
          onPress: () => {
            void toggleReactionForMessage(String(message.id), emoji);
          },
        })),
        { text: 'Отмена', style: 'cancel' as const },
      ]
    );
  };

  const deleteForMe = async (messageId: string) => {
    if (!id) return;
    try {
      await chatApi.hideMessageForMe(id, messageId);
      setMessages((prev) => prev.filter((message) => String(message.id) !== messageId));
    } catch (error) {
      Alert.alert('Ошибка', error instanceof Error ? error.message : 'Не удалось скрыть сообщение');
    }
  };

  const deleteForAll = async (messageId: string) => {
    if (!id) return;
    try {
      await chatApi.deleteMessageForAll(id, messageId);
      await loadMessagesAndJobs();
    } catch (error) {
      Alert.alert('Ошибка', error instanceof Error ? error.message : 'Не удалось удалить сообщение');
    }
  };

  const openMessageActions = (message: any) => {
    const messageId = String(message.id || '');
    if (!messageId) return;
    const isOwn = Boolean(user?.id) && message.author_id === user?.id;

    Alert.alert(
      'Действия с сообщением',
      'Выберите действие',
      [
        {
          text: 'Добавить реакцию',
          onPress: () => openReactionMenu(message),
        },
        {
          text: 'Удалить у себя',
          onPress: () => {
            void deleteForMe(messageId);
          },
        },
        ...(isOwn
          ? [
              {
                text: 'Удалить у всех',
                style: 'destructive' as const,
                onPress: () => {
                  void deleteForAll(messageId);
                },
              },
            ]
          : []),
        { text: 'Отмена', style: 'cancel' as const },
      ]
    );
  };

  const openStartJobModal = () => {
    setAddressQuery('');
    setDistrictFilter('');
    setPlannedHours('4');
    setStartJobVisible(true);
    if (!addresses.length) {
      void loadAddresses();
    }
  };

  const openDistrictPicker = () => {
    Alert.alert(
      'Выбор района',
      'Фильтр адресов',
      [
        {
          text: 'Все районы',
          onPress: () => setDistrictFilter(''),
        },
        ...districts.map((district) => ({
          text: district,
          onPress: () => setDistrictFilter(district),
        })),
        { text: 'Отмена', style: 'cancel' as const },
      ]
    );
  };

  const startJob = async (addressItem: any) => {
    if (!id || !addressItem) return;
    const hours = Number(plannedHours);
    if (!Number.isFinite(hours) || hours <= 0) {
      Alert.alert('Неверное время', 'Укажите плановую длительность в часах.');
      return;
    }

    try {
      const key = `${addressItem.source}:${addressItem.source_id}`;
      setStartingAddressKey(key);
      await jobsApi.startInChat({
        chat_id: id,
        address: addressItem.address,
        district: addressItem.district || undefined,
        sk_name: addressItem.sk_name || undefined,
        sk_count: typeof addressItem.sk_count === 'number' ? addressItem.sk_count : undefined,
        servisnyy_id: addressItem.servisnyy_id || undefined,
        lat: typeof addressItem.lat === 'number' ? addressItem.lat : null,
        lng: typeof addressItem.lng === 'number' ? addressItem.lng : null,
        planned_duration_hours: hours,
      });
      setStartJobVisible(false);
      await loadMessagesAndJobs();
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    } catch (error) {
      Alert.alert('Ошибка', error instanceof Error ? error.message : 'Не удалось начать работу');
    } finally {
      setStartingAddressKey('');
    }
  };

  const confirmJob = async (jobId: string) => {
    try {
      await jobsApi.confirm(jobId);
      await loadMessagesAndJobs();
    } catch (error) {
      Alert.alert('Ошибка', error instanceof Error ? error.message : 'Не удалось подтвердить планирование');
    }
  };

  const finishJob = async (jobId: string) => {
    try {
      await jobsApi.finish(jobId);
      await loadMessagesAndJobs();
    } catch (error) {
      Alert.alert('Ошибка', error instanceof Error ? error.message : 'Не удалось завершить работу');
    }
  };

  const deleteJob = async (jobId: string) => {
    Alert.alert('Удалить работу?', 'Это действие нельзя отменить.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await jobsApi.remove(jobId);
              await loadMessagesAndJobs();
            } catch (error) {
              Alert.alert('Ошибка', error instanceof Error ? error.message : 'Не удалось удалить работу');
            }
          })();
        },
      },
    ]);
  };

  const activeJobs = useMemo(() => jobs.filter((job) => job.status === 'active'), [jobs]);

  const overdueActiveJobs = useMemo(
    () =>
      activeJobs.filter((job) => {
        if (typeof job.planned_duration_hours !== 'number') return false;
        return calcHoursDiff(job.started_at) > job.planned_duration_hours;
      }),
    [activeJobs]
  );

  const districts = useMemo(
    () =>
      Array.from(
        new Set(
          addresses
            .map((item) => (item.district || '').trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, 'ru')),
    [addresses]
  );

  const filteredAddresses = useMemo(() => {
    const districtScoped = districtFilter
      ? addresses.filter((item) => String(item.district || '') === districtFilter)
      : addresses;
    return searchAddressSuggestions(districtScoped, addressQuery, 200);
  }, [addresses, addressQuery, districtFilter]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>
          {name || 'Чат'}
        </Text>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.jobBtn} onPress={openStartJobModal}>
            <Text style={s.jobBtnText}>Работа по адресу</Text>
          </TouchableOpacity>
          <Text style={s.count}>{messages.length}</Text>
        </View>
      </View>

      {activeJobs.length > 0 ? (
        <View style={s.jobsBanner}>
          <Text style={s.jobsBannerText}>
            Активных работ: {activeJobs.length}
            {overdueActiveJobs.length > 0 ? ` • Просрочено: ${overdueActiveJobs.length}` : ''}
          </Text>
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={s.messagesWrap}
        contentContainerStyle={s.messagesContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
        }
      >
        {messages.length === 0 ? (
          <Text style={s.empty}>Сообщений пока нет</Text>
        ) : messages.map((message) => {
            // Нормализуем author_id: приводим к строке для корректного сравнения
            // ID может приходить как число из БД, а user?.id может быть строкой
            const messageAuthorId = String(message.author_id ?? message.user_id ?? message.sender_id ?? message.created_by ?? '').trim();
            const userIdStr = String(user?.id ?? '').trim();
            const isOwn = Boolean(user?.id) && messageAuthorId === userIdStr;
            const readState = getReadState(message, membersCount);
            const isJobMessage = message.type === 'job' || Boolean(message.job_id);
            const job = message.job || null;
            const fallbackAddress = parseAddressFromMessage(message);

            return (
              <View key={message.id} style={[s.bubbleRow, isOwn ? s.bubbleRowOwn : s.bubbleRowOther]}>
                <TouchableOpacity
                  style={[s.bubble, isOwn ? s.bubbleOwn : s.bubbleOther]}
                  onLongPress={() => openMessageActions(message)}
                  delayLongPress={180}
                  activeOpacity={0.92}
                >
                  {!isOwn ? (
                    <Text style={s.senderName} onPress={() => openUserProfile(message.author_id)}>
                      {message.sender?.name || 'Пользователь'}
                    </Text>
                  ) : null}

                  {isJobMessage ? (
                    <View style={s.jobMessageWrap}>
                      <View style={s.jobTopRow}>
                        <Text style={s.jobTitle}>Работа по адресу</Text>
                        <View style={[s.jobStatusBadge, { borderColor: jobStatusColor(job?.status) }]}>
                          <Text style={[s.jobStatusText, { color: jobStatusColor(job?.status) }]}>
                            {jobStatusLabel(job?.status)}
                          </Text>
                        </View>
                      </View>

                      <Text style={s.jobAddress}>{job?.address || fallbackAddress || 'Адрес не указан'}</Text>

                      <Text style={s.jobInfo}>
                        {(job?.district || 'Район не указан') +
                          (job?.sk_name ? ` • ${job.sk_name}` : '') +
                          (job?.sk_count ? ` • ${job.sk_count} СК` : '')}
                      </Text>
                      <Text style={s.jobInfo}>
                        Начало: {formatDateTime(job?.started_at || message.created_at)}
                        {job?.planned_duration_hours ? ` • План: ${job.planned_duration_hours} ч` : ''}
                      </Text>

                      {job?.status === 'active' ? (
                        <View style={s.jobButtonsRow}>
                          {!job?.confirmed_by ? (
                            <TouchableOpacity
                              style={[s.inlineJobButton, s.inlineJobButtonBlue]}
                              onPress={() => void confirmJob(String(job.id))}
                            >
                              <Text style={s.inlineJobButtonText}>Планирование заведено</Text>
                            </TouchableOpacity>
                          ) : null}

                          <TouchableOpacity
                            style={[s.inlineJobButton, s.inlineJobButtonGreen]}
                            onPress={() => void finishJob(String(job.id))}
                          >
                            <Text style={s.inlineJobButtonText}>Завершить</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}

                      {job?.id && isOwn ? (
                        <View style={s.jobButtonsRow}>
                          <TouchableOpacity
                            style={[s.inlineJobButton, s.inlineJobButtonRed]}
                            onPress={() => void deleteJob(String(job.id))}
                          >
                            <Text style={s.inlineJobButtonText}>Удалить</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <Text style={s.bubbleText}>{message.text || ' '}</Text>
                  )}

                  <View style={s.metaRow}>
                    <Text style={s.bubbleTime}>{formatTime(message.created_at)}</Text>
                    {isOwn ? (
                      <Text style={[s.ticks, readState.isRead && s.ticksRead]}>{readState.ticks}</Text>
                    ) : null}
                  </View>
                  {Array.isArray(message.reactions) && message.reactions.length > 0 ? (
                    <View style={s.reactionsRow}>
                      {message.reactions.map((reaction: any) => (
                        <TouchableOpacity
                          key={`${message.id}-${reaction.emoji}`}
                          style={[s.reactionChip, reaction.mine && s.reactionChipMine]}
                          disabled={reactingMessageId === String(message.id)}
                          onPress={() => {
                            void toggleReactionForMessage(String(message.id), String(reaction.emoji));
                          }}
                        >
                          <Text style={[s.reactionText, reaction.mine && s.reactionTextMine]}>
                            {reaction.emoji} {reaction.count}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </TouchableOpacity>
              </View>
            );
          })}
      </ScrollView>

      <View style={s.inputWrap}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Сообщение..."
          placeholderTextColor={C.sub}
          style={s.input}
          multiline
        />
        <TouchableOpacity style={[s.sendBtn, sending && { opacity: 0.6 }]} onPress={send} disabled={sending}>
          <Text style={s.sendText}>{sending ? '...' : '→'}</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={startJobVisible}
        transparent
        animationType="slide"
        onRequestClose={closeStartJobModalAndBack}
      >
        <View style={s.modalBackdrop}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalKeyboard}>
            <View style={[s.modalSheet, { paddingBottom: Math.max(insets.bottom, 10) }]}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Выбор адреса для работы</Text>
                <TouchableOpacity onPress={closeStartJobModalAndBack}>
                  <Text style={s.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={s.modalBody}>
                <TextInput
                  value={addressQuery}
                  onChangeText={setAddressQuery}
                  style={s.modalSearch}
                  placeholder="Поиск по адресу"
                  placeholderTextColor={C.sub}
                />

                <View style={s.durationRow}>
                  <Text style={s.durationLabel}>Плановое время (часы)</Text>
                  <TextInput
                    value={plannedHours}
                    onChangeText={setPlannedHours}
                    keyboardType="numeric"
                    style={s.durationInput}
                  />
                </View>

                <TouchableOpacity style={s.selectDistrictBtn} onPress={openDistrictPicker}>
                  <Text style={s.selectDistrictText}>
                    {districtFilter ? `Район: ${districtFilter}` : 'Район: Все районы'} ▾
                  </Text>
                </TouchableOpacity>

                {addressesLoading ? (
                  <View style={s.modalLoading}>
                    <ActivityIndicator color={C.accent} />
                  </View>
                ) : (
                  <FlatList
                    data={filteredAddresses.slice(0, 120)}
                    keyExtractor={(item) => `${item.source}:${item.source_id}`}
                    contentContainerStyle={[s.addressList, { paddingBottom: insets.bottom + 18 }]}
                    ListEmptyComponent={<Text style={s.emptySmall}>Адреса не найдены</Text>}
                    renderItem={({ item }) => {
                      const key = `${item.source}:${item.source_id}`;
                      const busy = startingAddressKey === key;
                      return (
                        <AddressSuggestionCard
                          item={item}
                          disabled={busy}
                          actionLabel={'Старт'}
                          onPress={() => {
                            void startJob(item);
                          }}
                        />
                      );
                    }}
                  />
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.card,
  },
  backBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  backBtnText: { color: C.accent, fontSize: 16, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: C.text, fontSize: 18, fontWeight: '700', flex: 1, marginRight: 10 },
  count: { color: C.sub, fontSize: 12 },
  jobBtn: {
    backgroundColor: 'rgba(0,217,255,0.15)',
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  jobBtnText: { color: C.accent, fontSize: 11, fontWeight: '700' },
  jobsBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.35)',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  jobsBannerText: { color: C.yellow, fontSize: 12, fontWeight: '600' },
  messagesWrap: { flex: 1 },
  messagesContent: { padding: 12, paddingBottom: 18 },
  bubbleRow: { marginBottom: 10, flexDirection: 'row' },
  bubbleRowOwn: { justifyContent: 'flex-end' },
  bubbleRowOther: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '90%',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  bubbleOwn: { backgroundColor: C.own, borderColor: C.border },
  bubbleOther: { backgroundColor: C.other, borderColor: 'rgba(255,255,255,0.08)' },
  senderName: {
    color: C.accent,
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  bubbleText: { color: C.text, fontSize: 14, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', marginTop: 6 },
  bubbleTime: { color: C.sub, fontSize: 10 },
  ticks: { color: C.sub, fontSize: 11, fontWeight: '700' },
  ticksRead: { color: C.accent },
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  reactionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reactionChipMine: { borderColor: C.accent, backgroundColor: 'rgba(0,217,255,0.16)' },
  reactionText: { color: C.sub, fontSize: 11, fontWeight: '600' },
  reactionTextMine: { color: C.accent },
  empty: { color: C.sub, textAlign: 'center', marginTop: 40, fontSize: 14 },
  jobMessageWrap: { gap: 6 },
  jobTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  jobTitle: { color: C.text, fontSize: 13, fontWeight: '700' },
  jobStatusBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  jobStatusText: { fontSize: 10, fontWeight: '700' },
  jobAddress: { color: C.text, fontSize: 13, fontWeight: '600' },
  jobInfo: { color: C.sub, fontSize: 11 },
  jobButtonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 4 },
  inlineJobButton: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
  },
  inlineJobButtonBlue: { backgroundColor: 'rgba(0,217,255,0.16)', borderColor: C.border },
  inlineJobButtonGreen: { backgroundColor: 'rgba(16,185,129,0.16)', borderColor: 'rgba(16,185,129,0.45)' },
  inlineJobButtonRed: { backgroundColor: 'rgba(239,68,68,0.16)', borderColor: 'rgba(239,68,68,0.45)' },
  inlineJobButtonText: { color: C.text, fontSize: 11, fontWeight: '700' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.card,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    color: C.text,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: '#041018', fontSize: 18, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.68)',
    justifyContent: 'flex-end',
  },
  modalKeyboard: { width: '100%' },
  modalSheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    maxHeight: '92%',
    minHeight: '56%',
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
  modalBody: { padding: 14, flex: 1 },
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
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  durationLabel: { color: C.sub, fontSize: 12, fontWeight: '600' },
  durationInput: {
    width: 68,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: C.text,
    textAlign: 'center',
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '700',
  },
  selectDistrictBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  selectDistrictText: { color: C.text, fontSize: 12, fontWeight: '600' },
  modalLoading: { paddingVertical: 20, alignItems: 'center' },
  addressList: { paddingBottom: 30 },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  addressTitle: { color: C.text, fontSize: 13, fontWeight: '600' },
  addressMeta: { color: C.sub, fontSize: 11, marginTop: 3 },
  addressAction: { color: C.accent, fontSize: 12, fontWeight: '700' },
  emptySmall: { color: C.sub, textAlign: 'center', marginTop: 25, fontSize: 13 },
});
