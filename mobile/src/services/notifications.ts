import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export async function registerForPush(): Promise<void> {
  if (!Device.isDevice) {
    return;
  }
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    throw new Error('Push notification permission not granted');
  }
  await Notifications.getExpoPushTokenAsync();
}

export async function scheduleReminder(body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Summit Intelligence', body },
    trigger: null
  });
}
