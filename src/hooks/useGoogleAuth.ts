/**
 * useGoogleAuth — wraps expo-auth-session's Google provider and feeds the
 * resulting ID token into AuthContext's loginWithGoogle().
 *
 * Usage in a screen:
 *   const { promptAsync, isReady, isSigningIn } = useGoogleAuth({
 *     onError: setError,
 *   });
 *   <Button disabled={!isReady || isSigningIn} onPress={() => promptAsync()} />
 */
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from '../context/AuthContext';

interface UseGoogleAuthOptions {
  /** Called with a user-facing message if the Google or Firebase step fails. */
  onError?: (message: string) => void;
}

// A syntactically-valid but unusable placeholder. expo-auth-session throws
// an invariant error at render time if the client id for the *current*
// platform is missing (it doesn't fall back to webClientId on native, only
// on web) — so when a platform's real id isn't configured yet, we feed it
// this instead. isReady stays false, so the Google button stays disabled
// and this placeholder is never actually used to start a sign-in.
const PLACEHOLDER_CLIENT_ID = 'not-configured.apps.googleusercontent.com';

export function useGoogleAuth({ onError }: UseGoogleAuthOptions = {}) {
  const { loginWithGoogle } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined;

  // Only the client id matching the platform we're actually running on is
  // required — Google's own rule, not ours.
  const requiredClientId =
    Platform.OS === 'android' ? androidClientId : Platform.OS === 'ios' ? iosClientId : webClientId;
  const isConfigured = !!requiredClientId;

  const [request, response, googlePromptAsync] = Google.useAuthRequest({
    webClientId: webClientId ?? (Platform.OS === 'web' ? PLACEHOLDER_CLIENT_ID : undefined),
    iosClientId: iosClientId ?? (Platform.OS === 'ios' ? PLACEHOLDER_CLIENT_ID : undefined),
    androidClientId: androidClientId ?? (Platform.OS === 'android' ? PLACEHOLDER_CLIENT_ID : undefined),
  });

  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const idToken =
        (response.authentication as any)?.idToken ?? (response.params as any)?.id_token;

      if (!idToken) {
        onError?.('Google sign-in did not return an ID token.');
        return;
      }

      setIsSigningIn(true);
      loginWithGoogle(idToken)
        .then((result) => {
          if (!result.success) {
            onError?.(result.error ?? 'Google sign-in failed.');
          }
        })
        .finally(() => setIsSigningIn(false));
    } else if (response.type === 'error') {
      onError?.('Google sign-in failed. Please try again.');
    }
    // 'cancel' / 'dismiss' need no message — the user closed the picker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const promptAsync = () => {
    if (!isConfigured) {
      onError?.('Google sign-in is not set up for this platform yet.');
      return;
    }
    return googlePromptAsync();
  };

  return {
    /** False until Google config/env vars are ready for this platform — disable the button until then. */
    isReady: !!request && isConfigured,
    isSigningIn,
    promptAsync,
  };
}
