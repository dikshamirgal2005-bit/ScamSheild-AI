/**
 * AppNavigator — Root stack navigator.
 * Wraps the BottomTabNavigator and will house modal stacks in future phases.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabNavigator from './BottomTabNavigator';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import MessageScannerScreen from '../screens/MessageScannerScreen';
import MessageAnalysisResultScreen from '../screens/MessageAnalysisResultScreen';
import ScreenshotScannerScreen from '../screens/ScreenshotScannerScreen';
import UrlCheckerScreen from '../screens/UrlCheckerScreen';
import UrlAnalysisResultScreen from '../screens/UrlAnalysisResultScreen';
import EmailAnalyzerScreen from '../screens/EmailAnalyzerScreen';
import EmailAnalysisResultScreen from '../screens/EmailAnalysisResultScreen';
import SafetyEducationScreen from '../screens/SafetyEducationScreen';
import SafetyTopicDetailScreen from '../screens/SafetyTopicDetailScreen';
import AutoShieldScreen from '../screens/AutoShieldScreen';
import ScamNotificationBanner from '../components/common/ScamNotificationBanner';
import { AUTH, STACKS } from '../constants/routes';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../theme';

export type RootStackParamList = {
  [AUTH.LOGIN]: undefined;
  [AUTH.REGISTER]: undefined;
  [STACKS.MAIN]: undefined;
  [STACKS.MESSAGE_SCANNER]: undefined;
  [STACKS.MESSAGE_ANALYSIS_RESULT]: { result?: any } | undefined;
  [STACKS.SCREENSHOT_SCANNER]: undefined;
  [STACKS.URL_CHECKER]: undefined;
  [STACKS.URL_ANALYSIS_RESULT]: { result?: any } | undefined;
  [STACKS.EMAIL_ANALYZER]: undefined;
  [STACKS.EMAIL_ANALYSIS_RESULT]: { result?: any } | undefined;
  [STACKS.SAFETY_EDUCATION]: undefined;
  [STACKS.SAFETY_TOPIC_DETAIL]: { topicId: string } | undefined;
  [STACKS.AUTO_SHIELD]: undefined;
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name={STACKS.MAIN} component={BottomTabNavigator} />
            <Stack.Screen name={STACKS.MESSAGE_SCANNER} component={MessageScannerScreen} />
            <Stack.Screen name={STACKS.MESSAGE_ANALYSIS_RESULT} component={MessageAnalysisResultScreen} />
            <Stack.Screen name={STACKS.SCREENSHOT_SCANNER} component={ScreenshotScannerScreen} />
            <Stack.Screen name={STACKS.URL_CHECKER} component={UrlCheckerScreen} />
            <Stack.Screen name={STACKS.URL_ANALYSIS_RESULT} component={UrlAnalysisResultScreen} />
            <Stack.Screen name={STACKS.EMAIL_ANALYZER} component={EmailAnalyzerScreen} />
            <Stack.Screen name={STACKS.EMAIL_ANALYSIS_RESULT} component={EmailAnalysisResultScreen} />
            <Stack.Screen name={STACKS.SAFETY_EDUCATION} component={SafetyEducationScreen} />
            <Stack.Screen name={STACKS.SAFETY_TOPIC_DETAIL} component={SafetyTopicDetailScreen} />
            <Stack.Screen name={STACKS.AUTO_SHIELD} component={AutoShieldScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name={AUTH.LOGIN} component={LoginScreen} />
            <Stack.Screen name={AUTH.REGISTER} component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
      {/* Floating Scam Alert Banner — sits above all screens */}
      {isAuthenticated && (
        <ScamNotificationBanner
          onOpenAnalysis={(payload) => {
            if (navigationRef.isReady()) {
              navigationRef.navigate(STACKS.MESSAGE_ANALYSIS_RESULT, { result: payload });
            }
          }}
        />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
