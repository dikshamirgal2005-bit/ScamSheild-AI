/**
 * QuickActionCard — A card for quick-action buttons on the Home screen.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { BorderRadius, Colors, Spacing } from '../../theme';
import { FontSize, FontWeight } from '../../theme/typography';

interface QuickActionCardProps {
  icon: string;
  label: string;
  description: string;
  backgroundColor?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export default function QuickActionCard({
  icon,
  label,
  description,
  backgroundColor = Colors.primaryLight,
  onPress,
  style,
}: QuickActionCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor }, style]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.description}>{description}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    minHeight: 120,
  },
  iconContainer: {
    marginBottom: Spacing.sm,
  },
  icon: {
    fontSize: 30,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});
