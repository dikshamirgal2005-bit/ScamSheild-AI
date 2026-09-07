/**
 * SafeScreen — Wraps content in a safe area with app background color.
 * Use this as the root wrapper in every screen.
 */
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme';

interface SafeScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Override background color */
  backgroundColor?: string;
}

export default function SafeScreen({
  children,
  style,
  backgroundColor = Colors.background,
}: SafeScreenProps) {
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      <View style={[styles.container, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});
