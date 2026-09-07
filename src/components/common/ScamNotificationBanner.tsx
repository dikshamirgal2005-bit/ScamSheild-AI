/**
 * ScamNotificationBanner.tsx
 * --------------------------
 * Floating notification banner component for ScamShield AI.
 * Displays immediate alerts when an incoming SMS or WhatsApp message
 * is flagged as suspicious or potentially a scam:
 * - 🚨 Suspicious Message Detected (with channel tag)
 * - Risk level / score badge
 * - Short reason why it was flagged
 * - Option to open ScamShield for detailed analysis
 */
import React from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAutoMessage } from '../../context/AutoMessageContext';
import { BorderRadius, Colors, Spacing } from '../../theme';
import { FontSize, FontWeight } from '../../theme/typography';

interface ScamNotificationBannerProps {
  onOpenAnalysis: (payload: any) => void;
}

export default function ScamNotificationBanner({ onOpenAnalysis }: ScamNotificationBannerProps) {
  const { activeAlert, dismissAlert } = useAutoMessage();

  if (!activeAlert) return null;

  const isDanger = activeAlert.status === 'danger';
  const accentColor = isDanger ? Colors.danger : Colors.warning;
  const accentBg = isDanger ? '#FEE2E2' : '#FEF3C7';
  const badgeTextColor = isDanger ? '#B91C1C' : '#B45309';

  const handleOpen = () => {
    const payload = activeAlert.resultPayload;
    dismissAlert();
    onOpenAnalysis(payload);
  };

  return (
    <View style={styles.outerContainer} pointerEvents="box-none">
      <View style={[styles.bannerCard, { borderColor: accentColor }]}>
        {/* Top Header Row */}
        <View style={styles.topRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.alertIcon}>🚨</Text>
            <View>
              <Text style={styles.bannerTitle}>Suspicious Message Detected</Text>
              <Text style={styles.channelSubtitle}>
                via {activeAlert.channel} • {activeAlert.createdAt}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={dismissAlert}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Sender & Risk Badge Row */}
        <View style={styles.metaRow}>
          <View style={styles.senderPill}>
            <Text style={styles.senderLabel}>From:</Text>
            <Text style={styles.senderValue} numberOfLines={1}>
              {activeAlert.sender}
            </Text>
          </View>

          <View style={[styles.riskBadge, { backgroundColor: accentBg, borderColor: accentColor }]}>
            <Text style={[styles.riskBadgeText, { color: badgeTextColor }]}>
              {activeAlert.riskLevel} • {activeAlert.riskScore}/100
            </Text>
          </View>
        </View>

        {/* Short Reason */}
        <View style={styles.reasonBox}>
          <Text style={styles.reasonText} numberOfLines={2}>
            {activeAlert.reason}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.openBtn, { backgroundColor: accentColor }]}
            onPress={handleOpen}
            activeOpacity={0.85}
          >
            <Text style={styles.openBtnText}>🔍  Open Detailed Analysis</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={dismissAlert}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissBtnText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 12,
    right: 12,
    zIndex: 99999,
    alignItems: 'center',
  },
  bannerCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    padding: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  alertIcon: {
    fontSize: 22,
  },
  bannerTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  channelSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
    marginLeft: Spacing.sm,
  },
  closeBtnText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    fontWeight: FontWeight.bold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  senderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  senderLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  senderValue: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    maxWidth: 180,
  },
  riskBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  riskBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  reasonBox: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.base,
  },
  reasonText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  openBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
    letterSpacing: 0.2,
  },
  dismissBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSecondary,
  },
  dismissBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
});
