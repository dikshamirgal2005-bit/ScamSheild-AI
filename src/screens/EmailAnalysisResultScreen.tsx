/**
 * EmailAnalysisResultScreen — Placeholder result report for inspected emails.
 * Displays detailed SPF/DKIM verification, link analysis, attachment threats, and red flags.
 */
import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import SafeScreen from '../components/common/SafeScreen';
import { Colors, Spacing } from '../theme';
import { BorderRadius } from '../theme/spacing';
import { FontSize, FontWeight } from '../theme/typography';
import { RootStackParamList } from '../navigation/AppNavigator';

type EmailResultRouteProp = RouteProp<RootStackParamList, 'EmailAnalysisResult'>;

interface EmailResultData {
  sender: string;
  subject: string;
  bodySnippet: string;
  status: 'safe' | 'warning' | 'danger';
  statusLabel: string;
  riskScore: number;
  verdict: string;
  spfDkim: string;
  senderReputation: string;
  urlRisk: string;
  attachmentRisk: string;
  reason: string;
  redFlags: string[];
  recommendations: string[];
}

const DEFAULT_EMAIL_RESULT: EmailResultData = {
  sender: 'security@paypal-service-alert.xyz',
  subject: 'Action Required: Your Account Has Been Temporarily Limited',
  bodySnippet: 'Dear Customer, We detected an unauthorized login attempt from an unknown device. To protect your funds, click the link below to verify your identity...',
  status: 'danger',
  statusLabel: 'HIGH RISK PHISHING',
  riskScore: 92,
  verdict: 'Credential Harvesting & Spoofed Brand Email',
  spfDkim: 'FAILED (Domain Unaligned)',
  senderReputation: 'Unverified Third-Party Mail Relay',
  urlRisk: 'Malicious Destination (.xyz domain)',
  attachmentRisk: 'High Risk Executable Disguise (.pdf.exe)',
  reason: 'This email attempts to masquerade as an official service provider. The sender address originates from an unauthenticated lookalike domain (.xyz), and the body contains urgency coercion demanding identity verification.',
  redFlags: [
    'Sender address does not match official corporate domain',
    'Failed SPF/DKIM cryptographic email alignment checks',
    'High urgency language ("account limited", "within 24 hours")',
    'Attachment contains dangerous double extension (.pdf.exe)',
  ],
  recommendations: [
    'Do not click any link or download attachments from this email.',
    'Never enter login credentials or payment card details on this link.',
    'Report this message as Phishing in your email client and delete it.',
    'If you already entered passwords, change your credentials immediately.',
  ],
};

export default function EmailAnalysisResultScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<EmailResultRouteProp>();

  const result: EmailResultData = (route.params as any)?.result || DEFAULT_EMAIL_RESULT;

  const getStatusColor = () => {
    switch (result.status) {
      case 'danger':
        return Colors.danger;
      case 'warning':
        return Colors.warning;
      case 'safe':
      default:
        return Colors.secondary;
    }
  };

  const getStatusBgColor = () => {
    switch (result.status) {
      case 'danger':
        return Colors.dangerLight;
      case 'warning':
        return Colors.warningLight;
      case 'safe':
      default:
        return Colors.secondaryLight;
    }
  };

  const statusColor = getStatusColor();
  const statusBgColor = getStatusBgColor();

  return (
    <SafeScreen backgroundColor={Colors.background}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Email Safety Report</Text>
        <View style={styles.backSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Email Header Card */}
        <View style={styles.emailHeaderCard}>
          <View style={styles.emailFieldRow}>
            <Text style={styles.emailFieldLabel}>From:</Text>
            <Text style={styles.emailFieldValue} numberOfLines={1}>
              {result.sender}
            </Text>
          </View>
          <View style={styles.emailFieldDivider} />
          <View style={styles.emailFieldRow}>
            <Text style={styles.emailFieldLabel}>Subject:</Text>
            <Text style={[styles.emailFieldValue, styles.emailSubjectText]} numberOfLines={2}>
              {result.subject}
            </Text>
          </View>
        </View>

        {/* ── 1. Prominent Status / Score Ring ── */}
        <View style={styles.scoreContainer}>
          <View style={[styles.outerRing, { borderColor: statusColor }]}>
            <View style={[styles.innerRing, { backgroundColor: statusBgColor }]}>
              <Text style={[styles.scoreNumber, { color: statusColor }]}>
                {result.riskScore}
              </Text>
              <Text style={styles.scoreLabel}>Threat Index</Text>
            </View>
          </View>

          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>{result.statusLabel}</Text>
          </View>

          <Text style={[styles.verdictText, { color: statusColor }]}>
            {result.verdict}
          </Text>
        </View>

        {/* ── 2. Technical Email Security Inspection Table ── */}
        <Text style={styles.sectionTitle}>Email Security Inspection</Text>
        <View style={styles.metricsCard}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>SPF / DKIM Authentication</Text>
            <Text
              style={[
                styles.metricValue,
                { color: result.spfDkim.includes('FAILED') ? Colors.danger : Colors.textPrimary },
              ]}
            >
              {result.spfDkim}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Sender Mail Gateway</Text>
            <Text style={styles.metricValue}>{result.senderReputation}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Embedded Links Analysis</Text>
            <Text style={styles.metricValue}>{result.urlRisk}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Attachment Risk Status</Text>
            <Text style={styles.metricValue}>{result.attachmentRisk}</Text>
          </View>
        </View>

        {/* ── 3. Analysis Summary ── */}
        <Text style={styles.sectionTitle}>Why was this flagged?</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>{result.reason}</Text>
        </View>

        {/* ── 4. Detected Red Flags ── */}
        <Text style={styles.sectionTitle}>Detected Red Flags</Text>
        <View style={styles.flagsCard}>
          {result.redFlags.map((flag, index) => (
            <View key={index} style={styles.flagRow}>
              <Text style={[styles.flagBullet, { color: statusColor }]}>⚠</Text>
              <Text style={styles.flagText}>{flag}</Text>
            </View>
          ))}
        </View>

        {/* ── 5. Recommended Actions ── */}
        <Text style={styles.sectionTitle}>Recommended Actions</Text>
        <View style={styles.recommendationsCard}>
          {result.recommendations.map((rec, index) => (
            <View key={index} style={styles.recommendationRow}>
              <Text style={styles.recommendationBullet}>✓</Text>
              <Text style={styles.recommendationText}>{rec}</Text>
            </View>
          ))}
        </View>

        {/* ── 6. Bottom Actions ── */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.btnSecondary}
            activeOpacity={0.8}
            onPress={() => {
              Alert.alert('Report Saved', 'Email security evaluation details copied to clipboard.');
            }}
          >
            <Text style={styles.btnSecondaryText}>📤 Copy Safety Report</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnPrimary}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.btnPrimaryText}>Analyze Another Email</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing['4xl'],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  backSpacer: {
    width: 40,
  },

  // Email Header Card
  emailHeaderCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.base,
  },
  emailFieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  emailFieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textTertiary,
    width: 60,
  },
  emailFieldValue: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
    fontWeight: FontWeight.medium,
  },
  emailSubjectText: {
    fontWeight: FontWeight.bold,
  },
  emailFieldDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.xs,
  },

  // Score Container
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  outerRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  innerRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.extrabold,
  },
  scoreLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  statusBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  verdictText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },

  // Section Titles
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },

  // Metrics Card
  metricsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  metricLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    flex: 1,
  },
  metricValue: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    textAlign: 'right',
    flex: 1,
  },
  metricDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.sm,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
  },
  summaryText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Flags Card
  flagsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
  },
  flagRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  flagBullet: {
    fontSize: FontSize.md,
    marginRight: Spacing.sm,
    fontWeight: FontWeight.bold,
    marginTop: -2,
  },
  flagText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // Recommendations Card
  recommendationsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
  },
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  recommendationBullet: {
    color: Colors.secondary,
    fontSize: FontSize.sm,
    marginRight: Spacing.sm,
    fontWeight: FontWeight.bold,
  },
  recommendationText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'column',
    gap: Spacing.sm,
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
  },
  btnSecondary: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
});
