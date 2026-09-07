/**
 * ScamShield AI — App Entry Point
 */
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { AutoMessageProvider } from './src/context/AutoMessageContext';

// Required so the Google sign-in browser popup closes itself and hands
// control back to the app once the redirect completes.
WebBrowser.maybeCompleteAuthSession();

export default function App() {
  return (
    <AuthProvider>
      <AutoMessageProvider>
        <StatusBar style="dark" />
        <AppNavigator />
      </AutoMessageProvider>
    </AuthProvider>
  );
}
