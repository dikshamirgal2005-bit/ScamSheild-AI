/**
 * BottomTabNavigator — 4-tab navigation bar.
 * Tabs: Home | Scan | History | Settings
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import ScanScreen from '../screens/ScanScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { Colors } from '../theme';
import { FontSize } from '../theme/typography';
import { TABS } from '../constants/routes';

export type BottomTabParamList = {
  [TABS.HOME]: undefined;
  [TABS.SCAN]: undefined;
  [TABS.HISTORY]: undefined;
  [TABS.SETTINGS]: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

// Tab icon mapping using emojis — swap with vector icons in Phase 2
const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  [TABS.HOME]: { active: '🏠', inactive: '🏠' },
  [TABS.SCAN]: { active: '🔍', inactive: '🔍' },
  [TABS.HISTORY]: { active: '📋', inactive: '📋' },
  [TABS.SETTINGS]: { active: '⚙️', inactive: '⚙️' },
};

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName={TABS.HOME}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => {
          const icons = TAB_ICONS[route.name];
          return (
            <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>
              {focused ? icons.active : icons.inactive}
            </Text>
          );
        },
      })}
    >
      <Tab.Screen name={TABS.HOME} component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name={TABS.SCAN} component={ScanScreen} options={{ title: 'Scan' }} />
      <Tab.Screen name={TABS.HISTORY} component={HistoryScreen} options={{ title: 'History' }} />
      <Tab.Screen name={TABS.SETTINGS} component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.tabBackground,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    height: 62,
    paddingBottom: 8,
    paddingTop: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tabIcon: {
    fontSize: 22,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
});
