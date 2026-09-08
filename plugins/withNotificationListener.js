/**
 * withNotificationListener.js
 * ----------------------------
 * Expo Config Plugin for ScamShield AI.
 * Injects Android Notification Listener Service declarations & permissions
 * into AndroidManifest.xml during `expo prebuild` / `eas build`.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const withNotificationListener = (config) => {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;

    // 1. Add required permissions if not already present
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const permissionsToAdd = [
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.FOREGROUND_SERVICE',
    ];

    permissionsToAdd.forEach((permName) => {
      const exists = manifest['uses-permission'].some(
        (p) => p.$ && p.$['android:name'] === permName
      );
      if (!exists) {
        manifest['uses-permission'].push({
          $: { 'android:name': permName },
        });
      }
    });

    // 2. Ensure application element exists
    if (!manifest.application || manifest.application.length === 0) {
      manifest.application = [{}];
    }
    const app = manifest.application[0];

    // 3. Register NotificationListenerService
    if (!app.service) {
      app.service = [];
    }

    const serviceName = 'com.scamshield.ai.ScamNotificationListenerService';
    const serviceExists = app.service.some(
      (s) => s.$ && s.$['android:name'] === serviceName
    );

    if (!serviceExists) {
      app.service.push({
        $: {
          'android:name': serviceName,
          'android:label': 'ScamShield Notification Scanner',
          'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.service.notification.NotificationListenerService',
                },
              },
            ],
          },
        ],
      });
    }

    return config;
  });
};

module.exports = withNotificationListener;
