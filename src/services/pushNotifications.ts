import { Alert, PermissionsAndroid, Platform } from 'react-native';
import {
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  requestPermission,
  subscribeToTopic,
} from '@react-native-firebase/messaging';
import { registerPushToken, unregisterPushToken } from '../screens/api';
import { getToken as getAuthToken, subscribe as subscribeToSession } from './authSession';
import { navigationRef } from '../navigator/navigationRef';

// Push notifications through Firebase Cloud Messaging.
// - Every phone joins the "alerts" topic, so official and sensor alerts reach
//   everyone, logged in or not, even with the app closed.
// - A logged-in phone also registers its own token with the backend, so the
//   person who sent an SOS hears when the control room responds.
// Android shows the notification itself when the app is in the background;
// while the app is open we show it as a pop-up instead.

export const ALERTS_TOPIC = 'alerts';

let started = false;
let currentToken: string | null = null;

async function askPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // Android 13+ needs the runtime permission; older versions grant it.
    if (Platform.Version >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }
  const status = await requestPermission(getMessaging());
  // 1 = authorized, 2 = provisional
  return status === 1 || status === 2;
}

function openFor(data: Record<string, unknown> | undefined) {
  if (!data || !navigationRef.isReady()) return;
  if (data.type === 'sos') navigationRef.navigate('SOS');
  else if (data.type === 'alert') navigationRef.navigate('Alerts');
}

async function registerWithBackend() {
  if (!currentToken) return;
  await registerPushToken(currentToken, Platform.OS === 'ios' ? 'ios' : 'android').catch(() => {
    // Retried on the next login or token refresh; topic alerts still arrive.
  });
}

// Called once from the app root. Never throws: push is a bonus, not a gate.
export async function startPushNotifications(): Promise<void> {
  if (started) return;
  started = true;
  try {
    const messaging = getMessaging();

    onMessage(messaging, async message => {
      const title = message.notification?.title ?? 'DisasterX';
      const body = message.notification?.body ?? '';
      Alert.alert(title, body, [
        { text: 'Dismiss', style: 'cancel' },
        { text: 'Open', onPress: () => openFor(message.data) },
      ]);
    });
    onNotificationOpenedApp(messaging, message => openFor(message.data));
    getInitialNotification(messaging)
      .then(message => {
        // Wait for navigation to mount after a cold start from a notification.
        if (message) setTimeout(() => openFor(message.data), 1500);
      })
      .catch(() => {});

    if (!(await askPermission())) return;

    await subscribeToTopic(messaging, ALERTS_TOPIC);
    currentToken = await getToken(messaging);
    onTokenRefresh(messaging, token => {
      currentToken = token;
      registerWithBackend();
    });
    // Register now if logged in, and again after every login.
    subscribeToSession(authToken => {
      if (authToken) registerWithBackend();
    });
    if (await getAuthToken()) await registerWithBackend();
  } catch (err) {
    console.warn('Push notifications are unavailable:', err);
  }
}

// Called before logout so this phone stops getting the old account's SOS
// updates. Topic alerts keep coming.
export async function stopPersonalNotifications(): Promise<void> {
  if (!currentToken) return;
  await unregisterPushToken(currentToken).catch(() => {});
}
