/**
 * Push Notification Service
 * Handles push notifications when app is closed/backgrounded using Firebase Cloud Messaging
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Configure notification handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  icon?: string;
  color?: string;
}

/**
 * Request permission for push notifications
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  
  if (existingStatus === 'granted') {
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Get Expo push token for the device
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    // For Android, we need to set up Firebase first
    if (Platform.OS === 'android') {
      // Ensure notifications are configured for Firebase
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00D9FF',
        sound: 'default',
      });
    }

    const expoExtra = (Constants.expoConfig?.extra || {}) as Record<string, unknown>;
    const easExtra = (expoExtra.eas || {}) as Record<string, unknown>;
    const easConfig = ((Constants as any).easConfig || {}) as Record<string, unknown>;
    const projectId =
      (easExtra.projectId as string | undefined) ||
      (easConfig.projectId as string | undefined) ||
      undefined;

    const { data: expoPushToken } = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    return expoPushToken || null;
  } catch (error) {
    console.error('Failed to get Expo push token:', error);
    return null;
  }
}

/**
 * Get FCM token for Android (requires google-services.json)
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    // For Android with Firebase, we use the native FCM token
    const tokenData = await Notifications.getDevicePushTokenAsync();
    
    if (tokenData && 'token' in tokenData) {
      return tokenData.token as string;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get FCM token:', error);
    return null;
  }
}

/**
 * Register device for push notifications with backend
 */
export async function registerDeviceForPush(
  userId: string,
  pushToken: string
): Promise<boolean> {
  try {
    // Save push token to user_devices table
    const { error } = await supabase
      .from('user_devices')
      .upsert({
        user_id: userId,
        push_token: pushToken,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,platform',
      });

    if (error) {
      console.error('Failed to register device:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to register device:', error);
    return false;
  }
}

/**
 * Unregister device from push notifications
 */
export async function unregisterDeviceFromPush(
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_devices')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to unregister device:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to unregister device:', error);
    return false;
  }
}

/**
 * Set up notification listeners for received notifications
 */
export function setupNotificationListeners(
  onReceived: (notification: Notifications.Notification) => void,
  onResponseReceived: (response: Notifications.NotificationResponse) => void
): () => void {
  // Handle notifications received while app is foregrounded
  const notificationListener = Notifications.addNotificationReceivedListener(onReceived);

  // Handle notification interaction (tap)
  const responseListener = Notifications.addNotificationResponseReceivedListener(onResponseReceived);

  // Return cleanup function
  return () => {
    notificationListener.remove();
    responseListener.remove();
  };
}

/**
 * Handle notification tap - navigate to specific screen
 */
export function handleNotificationTap(
  response: Notifications.NotificationResponse
): void {
  const data = response.notification.request.content.data;
  
  // Handle different notification types
  if (data) {
    switch (data.type) {
      case 'chat_message':
        // Navigate to chat
        // router.push(`/chat/${data.chatId}`);
        break;
      case 'purchase_request':
        // Navigate to purchase request
        // router.push(`/purchase-request/${data.requestId}`);
        break;
      case 'job_assigned':
        // Navigate to job
        // router.push(`/job/${data.jobId}`);
        break;
      default:
        // Default action
        break;
    }
  }
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  trigger?: Notifications.NotificationTriggerInput
): Promise<string | null> {
  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: trigger ?? null,
    });

    return identifier;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return null;
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelScheduledNotification(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.error('Failed to cancel notification:', error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Failed to cancel all notifications:', error);
  }
}

/**
 * Get all delivered notifications
 */
export async function getDeliveredNotifications(): Promise<Notifications.Notification[]> {
  try {
    const notifications = await Notifications.getPresentedNotificationsAsync();
    return notifications;
  } catch (error) {
    console.error('Failed to get delivered notifications:', error);
    return [];
  }
}

/**
 * Dismiss all delivered notifications
 */
export async function dismissAllNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch (error) {
    console.error('Failed to dismiss notifications:', error);
  }
}

/**
 * Initialize push notifications for the app
 */
export async function initializePushNotifications(userId?: string): Promise<boolean> {
  try {
    // Request permissions
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('Push notification permission denied');
      return false;
    }

    // Get push token
    const pushToken = await getExpoPushToken();
    
    if (!pushToken) {
      console.log('Failed to get push token');
      return false;
    }

    // Register with backend if user is logged in
    if (userId) {
      await registerDeviceForPush(userId, pushToken);
    }

    console.log('Push notifications initialized, token:', pushToken);
    return true;
  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
    return false;
  }
}

export default {
  requestNotificationPermissions,
  getExpoPushToken,
  getFCMToken,
  registerDeviceForPush,
  unregisterDeviceFromPush,
  setupNotificationListeners,
  handleNotificationTap,
  scheduleLocalNotification,
  cancelScheduledNotification,
  cancelAllNotifications,
  getDeliveredNotifications,
  dismissAllNotifications,
  initializePushNotifications,
};
