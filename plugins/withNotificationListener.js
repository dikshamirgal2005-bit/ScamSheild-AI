/**
 * withNotificationListener.js
 * ----------------------------
 * Expo Config Plugin for ScamShield AI.
 * 1. Injects Android Notification Listener Service declarations & permissions into AndroidManifest.xml.
 * 2. Injects the native Java class ScamNotificationListenerService.java into the Android build source.
 */
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withNotificationListenerService = (config) => {
  // 1. AndroidManifest modifications
  config = withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;

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

    if (!manifest.application || manifest.application.length === 0) {
      manifest.application = [{}];
    }
    const app = manifest.application[0];

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

  // 2. Inject native ScamNotificationListenerService.java
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const packagePath = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        'com',
        'scamshield',
        'ai'
      );

      // Create directories if not yet present
      fs.mkdirSync(packagePath, { recursive: true });

      const javaCode = `package com.scamshield.ai;

import android.content.Intent;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import com.facebook.react.ReactApplication;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class ScamNotificationListenerService extends NotificationListenerService {
    private static final String TAG = "ScamShieldNotify";

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return;

        String packageName = sbn.getPackageName();
        if (packageName == null) return;

        // Skip our own notifications to avoid infinite loops
        if (packageName.equals(getPackageName())) return;

        Bundle extras = sbn.getNotification().extras;
        if (extras == null) return;

        CharSequence titleCS = extras.getCharSequence("android.title");
        CharSequence textCS = extras.getCharSequence("android.text");
        CharSequence bigTextCS = extras.getCharSequence("android.bigText");
        CharSequence subTextCS = extras.getCharSequence("android.subText");

        String title = titleCS != null ? titleCS.toString() : "";
        String text = textCS != null ? textCS.toString() : "";
        String bigText = bigTextCS != null ? bigTextCS.toString() : "";
        String subText = subTextCS != null ? subTextCS.toString() : "";

        if (text.isEmpty() && bigText.isEmpty()) return;

        Log.d(TAG, "Captured notification from: " + packageName + " | Title: " + title);

        try {
            ReactNativeHost reactNativeHost = ((ReactApplication) getApplication()).getReactNativeHost();
            ReactContext reactContext = reactNativeHost.getReactInstanceManager().getCurrentReactContext();

            if (reactContext != null && reactContext.hasActiveReactInstance()) {
                WritableMap params = Arguments.createMap();
                params.putString("packageName", packageName);
                params.putString("title", title);
                params.putString("text", text);
                params.putString("bigText", bigText);
                params.putString("subText", subText);

                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit("onScamShieldNotificationReceived", params);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to send notification to React Native", e);
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        // No action needed on removal
    }
}
`;

      const targetFile = path.join(packagePath, 'ScamNotificationListenerService.java');
      fs.writeFileSync(targetFile, javaCode, 'utf8');

      return config;
    },
  ]);

  return config;
};

module.exports = withNotificationListenerService;
