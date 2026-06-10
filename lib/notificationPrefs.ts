import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_KEY = 'milkbasket-notifications-enabled';

export async function getNotificationsEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
  return value !== 'false';
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATIONS_KEY, enabled ? 'true' : 'false');
}
