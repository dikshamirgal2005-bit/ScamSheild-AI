/**
 * StatusBadge — Displays a scan status (Safe / Suspicious / Danger).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors } from '../../theme';
import { FontSize, FontWeight } from '../../theme/typography';

type BadgeVariant = 'safe' | 'warning' | 'danger' | 'neutral';

interface StatusBadgeProps {
  variant: BadgeVariant;
  label: string;
}

const variantConfig: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  safe: { bg: Colors.safeLight, text: Colors.safe, dot: Colors.safe },
  warning: { bg: Colors.warningLight, text: Colors.warning, dot: Colors.warning },
  danger: { bg: Colors.dangerLight, text: Colors.danger, dot: Colors.danger },
  neutral: { bg: Colors.surfaceSecondary, text: Colors.textSecondary, dot: Colors.textTertiary },
};

export default function StatusBadge({ variant, label }: StatusBadgeProps) {
  const config = variantConfig[variant];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <Text style={[styles.label, { color: config.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.3,
  },
});
