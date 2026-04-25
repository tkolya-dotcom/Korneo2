import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { notificationsApi, supabase, usersApi } from '@/src/lib/supabase';

const NOTIFICATION_QUEUE_POLL_MS = 15_000;
const SHOWN_NOTIFICATIONS_KEY = '@korneo/shown_notifications_v1';
const SHOWN_NOTIFICATIONS_LIMIT = 300;

let runtimeInitialized = false;
let notificationPollTimer: ReturnType<typeof setInterval> | null = null;
let notificationQueueChannel: ReturnType<typeof supabase.channel> | null = null;
let pollingInProgress = false;
let notificationHandlerConfigured = false;
let shownNotificationIds = new Set<string>();
let shownNotificationsLoaded = false;

const loadShownNotificationIds = async () => {
  if (shownNotificationsLoaded) {
    return;
  }

  shownNotificationsLoaded = true;
  try {
    const raw = await AsyncStorage.getItem(SHOWN_NOTIFICATIONS_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return;
    }
    shownNotificationIds = new Set(parsed.map((item) => String(item)));
  } catch (error) {
    console.warn('Failed to restore shown notifications cache:', error);
  }
};

const persistShownNotificationIds = async () => {
  try {
    const values = Array.from(shownNotificationIds).slice(-SHOWN_NOTIFICATIONS_LIMIT);
    shownNotificationIds = new Set(values);
    await AsyncStorage.setItem(SHOWN_NOTIFICATIONS_KEY, JSON.stringify(values));
  } catch (error) {
    console.warn('Failed to persist shown notifications cache:', error);
  }
};

const configureForegroundNotificationHandler = () => {
  if (notificationHandlerConfigured) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  notificationHandlerConfigured = true;
};

const pollNotificationQueue = async () => {
  if (pollingInProgress) {
    return;
  }

  pollingInProgress = true;
  try {
    await loadShownNotificationIds();
    const queueRows = await notificationsApi.pullPending(20);
    if (!queueRows.length) {
      return;
    }

    const idsToMarkRead: string[] = [];
    for (const notification of queueRows) {
      idsToMarkRead.push(notification.id);
      if (shownNotificationIds.has(notification.id)) {
        continue;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title || 'Корнео',
          body: notification.body || '',
          data: notification.data || {},
          sound: true,
        },
        trigger: null,
      });
      shownNotificationIds.add(notification.id);
    }

    await persistShownNotificationIds();
    if (idsToMarkRead.length) {
      await notificationsApi.markRead(idsToMarkRead).catch((error) => {
        console.warn('Failed to mark queued notifications as read:', error);
      });
    }
  } catch (error) {
    console.warn('Notification queue poll failed:', error);
  } finally {
    pollingInProgress = false;
  }
};

const startNotificationPolling = () => {
  if (notificationPollTimer) {
    return;
  }
  notificationPollTimer = setInterval(() => {
    void pollNotificationQueue();
  }, NOTIFICATION_QUEUE_POLL_MS);
  void pollNotificationQueue();
};

const startRealtimeNotificationQueueListener = () => {
  if (notificationQueueChannel) {
    return;
  }

  notificationQueueChannel = supabase
    .channel(`notification-queue-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notification_queue',
      },
      () => {
        void pollNotificationQueue();
      }
    )
    .subscribe();
};

const ensureAndroidLocationPermission = async () => {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    const hasFine = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    const hasCoarse = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
    if (hasFine || hasCoarse) {
      return;
    }

    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);
  } catch (error) {
    console.warn('Failed to request location permission:', error);
  }
};

const ensureNotificationChannel = async () => {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Основной',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00D9FF',
    });
  } catch (error) {
    console.warn('Failed to configure Android notification channel:', error);
  }
};

const resolveExpoProjectId = () => {
  const expoExtra = (Constants.expoConfig?.extra || {}) as Record<string, unknown>;
  const easExtra = (expoExtra.eas || {}) as Record<string, unknown>;
  const easConfig = ((Constants as any).easConfig || {}) as Record<string, unknown>;

  return (easExtra.projectId as string | undefined) || (easConfig.projectId as string | undefined) || undefined;
};

const registerPushToken = async () => {
  let token: string | null = null;

  try {
    const nativeToken = await Notifications.getDevicePushTokenAsync();
    token = nativeToken?.data ? String(nativeToken.data) : null;
  } catch (error) {
    console.warn('Failed to fetch native push token:', error);
  }

  if (!token) {
    try {
      const projectId = resolveExpoProjectId();
      const expoToken = projectId
        ? await Notifications.getExpoPushTokenAsync({ projectId })
        : await Notifications.getExpoPushTokenAsync();
      token = expoToken?.data || null;
    } catch (error) {
      console.warn('Failed to fetch Expo push token:', error);
    }
  }

  await usersApi.setPushToken(token);
  return token;
};

const ensureNotificationPermissionAndToken = async () => {
  try {
    configureForegroundNotificationHandler();
    await ensureNotificationChannel();

    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;

    if (!granted) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = requested.granted;
    }

    if (!granted) {
      await usersApi.setPushToken(null);
      return;
    }

    await registerPushToken();
    startNotificationPolling();
    startRealtimeNotificationQueueListener();
  } catch (error) {
    console.warn('Notification bootstrap failed:', error);
  }
};

export const ensureDeviceRuntimeReady = async () => {
  if (runtimeInitialized) {
    return;
  }
  runtimeInitialized = true;
  await Promise.all([ensureAndroidLocationPermission(), ensureNotificationPermissionAndToken()]);
};
