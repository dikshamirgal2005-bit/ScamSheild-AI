/**
 * nativeNotificationListener.ts
 * -------------------------------
 * Bridges Android's Native NotificationListenerService to the ScamShield
 * Auto Message Scam Detection Engine.
 *
 * Capabilities:
 * 1. Opens Android System Settings directly to "Notification Access / Notification Listener"
 *    so the user can grant permission with a single tap.
 * 2. Listens for incoming notification events (SMS, WhatsApp, Telegram).
 * 3. Pipes text & URLs into `processIncomingMessage()` automatically.
 */
import {
  DeviceEventEmitter,
  NativeModules,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import {
  processIncomingMessage,
  IncomingMessage,
  MessageChannel,
  getAutoShieldConfig,
} from './autoMessageDetector';

/**
 * Packages of supported messaging channels on Android
 */
export const SUPPORTED_PACKAGE_MAP: Record<string, { channel: MessageChannel; name: string }> = {
  // WhatsApp
  'com.whatsapp': { channel: 'WhatsApp', name: 'WhatsApp' },
  'com.whatsapp.w4b': { channel: 'WhatsApp', name: 'WhatsApp Business' },
  // SMS apps
  'com.google.android.apps.messaging': { channel: 'SMS', name: 'Google Messages' },
  'com.samsung.android.messaging': { channel: 'SMS', name: 'Samsung Messages' },
  'com.android.mms': { channel: 'SMS', name: 'Default SMS' },
  // Telegram
  'org.telegram.messenger': { channel: 'Telegram', name: 'Telegram' },
  'org.thunderdog.challegram': { channel: 'Telegram', name: 'Telegram X' },
};

/**
 * Opens Android System Notification Access Settings screen.
 * On Android, this opens: Settings -> Special App Access -> Notification Access / Device & app notifications
 */
export async function openAndroidNotificationAccessSettings(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    Alert.alert('Info', 'Notification listener is an Android-native feature.');
    return false;
  }

  try {
    // Action: android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS
    await Linking.sendIntent('android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS');
    return true;
  } catch (err) {
    try {
      // Fallback to general application details settings
      await Linking.openSettings();
      return true;
    } catch (e) {
      console.warn('[NativeNotificationListener] Could not open settings:', e);
      return false;
    }
  }
}

/**
 * Initializes listeners for incoming notifications emitted by the native bridge.
 */
export function startNativeNotificationListener(): () => void {
  if (Platform.OS !== 'android') {
    return () => {};
  }

  const subscription = DeviceEventEmitter.addListener(
    'onScamShieldNotificationReceived',
    async (event: {
      packageName?: string;
      title?: string;
      text?: string;
      subText?: string;
      bigText?: string;
    }) => {
      try {
        const config = await getAutoShieldConfig();
        if (!config.enabled) return;

        const pkg = (event.packageName || '').toLowerCase();
        const matched = SUPPORTED_PACKAGE_MAP[pkg];

        // If from a supported messaging package or if contains text
        const channel: MessageChannel = matched ? matched.channel : 'SMS';
        const sender = event.title || matched?.name || 'Incoming Notification';
        const bodyText = event.bigText || event.text || event.subText || '';

        if (!bodyText.trim()) return;

        const incoming: IncomingMessage = {
          channel,
          sender,
          text: bodyText.trim(),
          timestamp: new Date().toISOString(),
        };

        // Run full AI/ML scam detection & URL analysis
        await processIncomingMessage(incoming);
      } catch (err) {
        console.warn('[NativeNotificationListener] Error processing notification:', err);
      }
    }
  );

  return () => {
    subscription.remove();
  };
}
