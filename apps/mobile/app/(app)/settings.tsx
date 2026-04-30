import { useEffect, useState } from 'react';
import {
  Alert,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';
import { initializePushNotifications, unregisterDeviceFromPush } from '@/src/lib/pushNotifications';

const C = {
  bg: '#0A0A0F',
  card: '#1A1A2E',
  accent: '#00D9FF',
  text: '#E0E0E0',
  sub: '#8892A0',
  border: 'rgba(0, 217, 255, 0.15)',
  danger: '#FF3366',
};

const STORAGE_KEYS = {
  notificationsEnabled: 'settings.notifications.enabled',
  locationEnabled: 'settings.location.enabled',
  notificationSound: 'settings.notifications.sound',
};

const RINGTONE_OPTIONS = [
  { id: 'default', label: 'Стандартная' },
  { id: 'chime', label: 'Chime' },
  { id: 'alert', label: 'Alert' },
];

const parseBool = (value: string | null, fallback: boolean) => {
  if (value === null) {
    return fallback;
  }
  return value === '1';
};

export default function SettingsScreen() {
  const { user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [selectedSound, setSelectedSound] = useState('default');
  const [showSoundList, setShowSoundList] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const [savedNotifications, savedLocation, savedSound] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.notificationsEnabled),
        AsyncStorage.getItem(STORAGE_KEYS.locationEnabled),
        AsyncStorage.getItem(STORAGE_KEYS.notificationSound),
      ]);

      setNotificationsEnabled(parseBool(savedNotifications, true));
      setLocationEnabled(parseBool(savedLocation, false));
      setSelectedSound(savedSound || 'default');
    };

    void loadSettings();
  }, []);

  const handleNotificationToggle = async (value: boolean) => {
    setNotificationsEnabled(value);
    await AsyncStorage.setItem(STORAGE_KEYS.notificationsEnabled, value ? '1' : '0');

    if (!user?.id) {
      return;
    }

    if (value) {
      const ok = await initializePushNotifications(user.id);
      if (!ok) {
        Alert.alert('Уведомления', 'Не удалось включить уведомления. Проверьте разрешения.');
      }
    } else {
      await unregisterDeviceFromPush(user.id);
    }
  };

  const requestLocationPermission = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Доступ к геолокации',
        message: 'Приложению нужен доступ к геолокации для работы с адресами и маршрутом.',
        buttonPositive: 'Разрешить',
        buttonNegative: 'Запретить',
      }
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const handleLocationToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestLocationPermission();
      if (!granted) {
        Alert.alert('Геолокация', 'Разрешение не выдано');
        setLocationEnabled(false);
        await AsyncStorage.setItem(STORAGE_KEYS.locationEnabled, '0');
        return;
      }
    }

    setLocationEnabled(value);
    await AsyncStorage.setItem(STORAGE_KEYS.locationEnabled, value ? '1' : '0');
  };

  const handleSoundSelect = async (soundId: string) => {
    setSelectedSound(soundId);
    setShowSoundList(false);
    await AsyncStorage.setItem(STORAGE_KEYS.notificationSound, soundId);

    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00D9FF',
      sound: soundId === 'default' ? 'default' : `${soundId}.wav`,
    });
  };

  const handlePasswordChange = async () => {
    const nextPassword = newPassword.trim();
    if (nextPassword.length < 8) {
      Alert.alert('Смена пароля', 'Минимальная длина пароля: 8 символов.');
      return;
    }

    setPasswordSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: nextPassword });
      if (error) {
        throw error;
      }
      setNewPassword('');
      Alert.alert('Смена пароля', 'Пароль успешно обновлен.');
    } catch (error) {
      Alert.alert('Смена пароля', error instanceof Error ? error.message : 'Не удалось обновить пароль.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>Настройки</Text>

      <View style={s.card}>
        <Text style={s.cardTitle}>Уведомления</Text>
        <View style={s.row}>
          <Text style={s.label}>Включить уведомления</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={(value) => {
              void handleNotificationToggle(value);
            }}
            trackColor={{ false: '#444', true: 'rgba(0, 217, 255, 0.45)' }}
            thumbColor={notificationsEnabled ? C.accent : '#ccc'}
          />
        </View>
        <Pressable style={s.selectBtn} onPress={() => setShowSoundList((prev) => !prev)}>
          <Text style={s.selectBtnLabel}>
            Мелодия: {RINGTONE_OPTIONS.find((item) => item.id === selectedSound)?.label || 'Стандартная'}
          </Text>
        </Pressable>
        {showSoundList && (
          <View style={s.optionsWrap}>
            {RINGTONE_OPTIONS.map((option) => (
              <Pressable
                key={option.id}
                style={[s.optionRow, selectedSound === option.id && s.optionRowActive]}
                onPress={() => {
                  void handleSoundSelect(option.id);
                }}
              >
                <Text style={[s.optionText, selectedSound === option.id && s.optionTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Геолокация</Text>
        <View style={s.row}>
          <Text style={s.label}>Разрешить геолокацию</Text>
          <Switch
            value={locationEnabled}
            onValueChange={(value) => {
              void handleLocationToggle(value);
            }}
            trackColor={{ false: '#444', true: 'rgba(0, 217, 255, 0.45)' }}
            thumbColor={locationEnabled ? C.accent : '#ccc'}
          />
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Безопасность</Text>
        <Text style={s.subText}>Новый пароль учетной записи</Text>
        <TextInput
          style={s.input}
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Минимум 8 символов"
          placeholderTextColor={C.sub}
        />
        <Pressable
          style={[s.saveBtn, passwordSubmitting && s.saveBtnDisabled]}
          onPress={() => {
            void handlePasswordChange();
          }}
          disabled={passwordSubmitting}
        >
          <Text style={s.saveBtnText}>{passwordSubmitting ? 'Сохранение...' : 'Изменить пароль'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  title: { color: C.text, fontSize: 24, fontWeight: '700', marginBottom: 4 },
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 10,
  },
  cardTitle: { color: C.accent, fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: C.text, fontSize: 14 },
  selectBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectBtnLabel: { color: C.text, fontSize: 14 },
  optionsWrap: { borderRadius: 10, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  optionRow: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'transparent' },
  optionRowActive: { backgroundColor: 'rgba(0, 217, 255, 0.15)' },
  optionText: { color: C.text },
  optionTextActive: { color: C.accent, fontWeight: '700' },
  subText: { color: C.sub, fontSize: 12 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.text,
  },
  saveBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.accent,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#001018', fontWeight: '700' },
});
