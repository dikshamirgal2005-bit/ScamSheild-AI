/**
 * UrlAnalysisResultScreen — Detailed placeholder result screen for URL security checks.
 * Displays Safe, Suspicious, or Malicious status with technical domain inspection metrics.
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

type UrlResultRouteProp = RouteProp<RootStackParamList, 'UrlAnalysisResult'>;

interface UrlResultData {
  url: string;
  status: 'safe' | 'warning' | 'danger';
  statusLabel: string;
  riskScore: number;
  verdict: string;
  protocol: string;
  domainAge: string;
  sslStatus: string;
  ipReputation: string;
  redirects: string;
  reason: string;
  signals: string[];
  recommendations: string[];
}

const DEFAULT_URL_RESULT: UrlResultData = {
  url: 'http://secure-hdfc-update.xyz/login',
  status: 'danger',
  statusLabel: 'MALICIOUS',
  riskScore: 94,
  verdict: 'High-Risk Phishing Domain Detected',
  protocol: 'HTTP (Unencrypted / Insecure)',
  domainAge: 'Registered 3 days ago',
  sslStatus: 'Invalid / Self-Signed Certificate',
  ipReputation: 'Flagged on 4 Phishing Blacklists',
  redirects: '2 Hidden URL Redirects Found',
  reason: 'This URL mimics an authentic banking service but uses an untrusted top-level domain (.xyz) and lacks valid SSL encryption. It is engineered to capture entered login credentials and payment cards.',
  signals: [
    'Typo-squatted / lookalike domain name targeting bank customers',
    'Missing valid commercial SSL encryption certificate',
    'Domain registered within the last 72 hours',
    'Contains deceptive keywords ("secure", "login", "update")',
  ],
  recommendations: [
    'Do not open this website in any web browser.',
    'Never enter passwords, account IDs, or card numbers on this link.',
    'If you already clicked this link, change your account credentials immediately.',
    'Report this domain to your network provider or anti-phishing center.',
  ],
};

export default function UrlAnalysisResultScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<UrlResultRouteProp>();

  const result: UrlResultData = (route.params as any)?.result || DEFAULT_URL_RESULT;

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
        <Text style={styles.headerTitle}>URL Safety Report</Text>
        <View style={styles.backSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* URL Inspected Display Card */}
        <View style={styles.urlCard}>
          <Text style={styles.urlCardLabel}>Analyzed URL:</Text>
          <View style={styles.urlBox}>
            <Text style={styles.urlText} numberOfLines={2}>
              {result.url}
            </Text>
          </View>
          <View style={styles.protocolRow}>
            <Text style={styles.protocolLabel}>Security Protocol:</Text>
            <Text
              style={[
                styles.protocolValue,
                { color: result.status === 'safe' ? Colors.secondary : Colors.danger },
              ]}
            >
              {result.protocol}
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

          {/* Status Label Banner */}
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>
              {result.status === 'danger' ? '🔴 MALICIOUS' : result.status === 'warning' ? '🟡 SUSPICIOUS' : '🟢 SAFE'}
            </Text>
          </View>

          <Text style={[styles.verdictText, { color: statusColor }]}>
            {result.verdict}
          </Text>
        </View>

        {/* ── 2. Technical Domain Inspection Card ── */}
        <Text style={styles.sectionTitle}>Technical Domain Inspection</Text>
        <View style={styles.metricsCard}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>SSL/TLS Certificate</Text>
            <Text style={styles.metricValue}>{result.sslStatus}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Domain Registration Age</Text>
            <Text style={styles.metricValue}>{result.domainAge}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>IP & Blacklist Reputation</Text>
            <Text style={styles.metricValue}>{result.ipReputation}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Redirect Behavior</Text>
            <Text style={styles.metricValue}>{result.redirects}</Text>
          </View>
        </View>

        {/* ── 3. Analysis Summary ── */}
        <Text style={styles.sectionTitle}>Why was this status assigned?</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>{result.reason}</Text>
        </View>

        {/* ── 4. Detected Signals ── */}
        <Text style={styles.sectionTitle}>Detected URL Signals</Text>
        <View style={styles.signalsCard}>
          {result.signals.map((signal, index) => (
            <View key={index} style={styles.signalRow}>
              <Text style={[styles.signalBullet, { color: statusColor }]}>•</Text>
              <Text style={styles.signalText}>{signal}</Text>
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
              Alert.alert('Report Saved', 'URL safety evaluation details copied to clipboard.');
            }}
          >
            <Text style={styles.btnSecondaryText}>📤 Copy Safety Report</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnPrimary}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.btnPrimaryText}>Check Another URL</Text>
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

  // URL Display Card
  urlCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.base,
  },
  urlCardLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  urlBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    marginBottom: Spacing.sm,
  },
  urlText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  protocolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  protocolLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  protocolValue: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
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

  // Signals Card
  signalsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  signalBullet: {
    fontSize: FontSize.md,
    marginRight: Spacing.sm,
    fontWeight: FontWeight.bold,
    marginTop: -2,
  },
  signalText: {
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
