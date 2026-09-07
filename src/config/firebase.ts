/**
 * Firebase app + Auth initialization.
 *
 * Config values come from environment variables (see .env.example).
 * Expo automatically inlines any var prefixed with EXPO_PUBLIC_ at build time,
 * so no extra app.json/babel config is needed.
 *
 * Setup:
 *  1. Create a project at https://console.firebase.google.com
 *  2. Add a "Web app" to it (</> icon) — you don't need iOS/Android apps for this.
 *  3. Copy the config values it gives you into a `.env` file (copy from .env.example).
 *  4. In the console: Authentication → Sign-in method → enable "Email/Password".
 *  5. Run: npx expo install @react-native-async-storage/async-storage
 *     Run: npm install firebase
 *  6. Restart the dev server (env vars are read at startup).
 */
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  // @ts-ignore getReactNativePersistence is available in react-native runtime
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (__DEV__ && !firebaseConfig.apiKey) {
  console.warn(
    '[firebase] Missing EXPO_PUBLIC_FIREBASE_* env vars. ' +
      'Copy .env.example to .env and fill in your Firebase project config, then restart the dev server.'
  );
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// initializeAuth() must only be called once. Fast Refresh / repeated module
// evaluation on native can re-run this file, so fall back to getAuth() if
// persistence has already been set up.
let auth: Auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    auth = getAuth(app);
  }
}

export { auth };
export default app;
