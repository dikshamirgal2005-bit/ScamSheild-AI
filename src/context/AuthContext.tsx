/**
 * AuthContext — Firebase Authentication (email/password).
 *
 * Wraps Firebase's onAuthStateChanged listener so the rest of the app just
 * reads `user` / `isAuthenticated` and calls `login` / `register` / `logout`.
 * See src/config/firebase.ts for setup instructions.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../config/firebase';

export interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True while Firebase is restoring a previous session on app start. */
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (name: string, email: string, password: string) => Promise<AuthResult>;
  /** Completes sign-in using the Google ID token from expo-auth-session. */
  loginWithGoogle: (idToken: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapFirebaseUser(fbUser: FirebaseUser): User {
  return {
    id: fbUser.uid,
    name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
    email: fbUser.email ?? '',
  };
}

/** Turns Firebase's auth/* error codes into copy we can show in the UI. */
function friendlyError(code: string | undefined): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/account-exists-with-different-credential':
      return 'This email is already registered with a different sign-in method.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setUser(fbUser ? mapFirebaseUser(fbUser) : null);
      setIsInitializing(false);
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      return { success: false, error: 'Please enter both email and password.' };
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, password);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: friendlyError(err?.code) };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<AuthResult> => {
      const trimmedName = name.trim();
      const trimmedEmail = email.trim();

      if (!trimmedName || !trimmedEmail || !password) {
        return { success: false, error: 'Please fill in all fields.' };
      }

      setIsLoading(true);
      try {
        const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        await updateProfile(credential.user, { displayName: trimmedName });
        // Firebase automatically signs the new user in on account creation.
        // We don't want that here — registration should land the user back
        // on the Login screen, not skip straight to the dashboard — so we
        // immediately sign them out again. onAuthStateChanged will fire
        // with null and AppNavigator will show the auth stack.
        await signOut(auth);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: friendlyError(err?.code) };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const loginWithGoogle = useCallback(async (idToken: string): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      // Signs in the user, or transparently creates the account on first use.
      await signInWithCredential(auth, credential);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: friendlyError(err?.code) };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isInitializing,
        login,
        register,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
