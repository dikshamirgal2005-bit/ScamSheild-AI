/**
 * UrlCheckerScreen — Enter or paste a website URL to verify safety.
 */
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import SafeScreen from '../components/common/SafeScreen';
import { Colors, Spacing } from '../theme';
import { BorderRadius } from '../theme/spacing';
import { FontSize, FontWeight } from '../theme/typography';
import { STACKS } from '../constants/routes';
import { scanUrl } from '../services/scamShieldApi';
import { addScanToHistory, createScanId } from '../services/scanHistory';

interface SampleUrl {
  label: string;
  url: string;
  expectedStatus: 'safe' | 'warning' | 'danger';
  icon: string;
}

const SAMPLE_URLS: SampleUrl[] = [
  {
    label: 'Fake Bank Login',
    url: 'http://secure-hdfc-update.xyz/login',
    expectedStatus: 'danger',
    icon: '🔴',
  },
  {
    label: 'Obfuscated Shortener',
    url: 'http://bit.ly/free-reward-gift-claim',
    expectedStatus: 'warning',
    icon: '🟡',
  },
  {
    label: 'Legitimate Portal',
    url: 'https://www.google.com',
    expectedStatus: 'safe',
    icon: '🟢',
  },
];

export default function UrlCheckerScreen() {
  const navigation = useNavigation<any>();
  const inputRef = useRef<TextInput>(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('Initializing URL check...');

  const handleClear = () => {
    setUrl('');
    setLoading(false);
  };

  const handleCheckUrl = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    Keyboard.dismiss();
    setLoading(true);
    setLoadingPhase('Connecting to ScamShield AI...');

    try {
      setLoadingPhase('Resolving host domain & checking public DNS...');
      await new Promise((resolve) => setTimeout(resolve, 250));

      setLoadingPhase('Performing live HTTPS/HTTP website check...');
      const result = await scanUrl(trimmedUrl);

      setLoadingPhase('Combining live signals with URL risk analysis...');
      await new Promise((resolve) => setTimeout(resolve, 200));

      const live = result.liveCheck || {};
      const isSafe = result.status === 'safe';
      const isWarning = result.status === 'suspicious';
      const resolvedIp = (result.features?.resolved_ip as string) || (live.dnsResolved ? 'Live Verified' : null);
      const isHttps = result.url.toLowerCase().startsWith('https://');

      const protocol = isHttps
        ? live.httpsValid
          ? 'HTTPS (SSL/TLS Active & Encrypted)'
          : 'HTTPS (SSL Secured)'
        : 'HTTP (Insecure & Unencrypted)';

      const sslStatus = isHttps
        ? live.httpsValid
          ? 'Active SSL/TLS Certificate'
          : 'HTTPS Secured'
        : 'None (Insecure Unencrypted HTTP)';

      const ipReputation = live.dnsResolved
        ? resolvedIp && resolvedIp !== 'Live Verified'
          ? `Real-Time DNS: Resolved to ${resolvedIp}`
          : 'Real-Time Public DNS: Active & Resolved'
        : 'DNS Resolution Failed (Domain Unregistered / NXDOMAIN)';

      const domainAge = live.trustedDomain
        ? 'Established Global Authority Domain'
        : live.dnsResolved
          ? 'Active Public Registered Domain'
          : 'Unverified Domain';

      const redirects = live.redirects
        ? `${live.redirects} redirect(s) observed`
        : 'Direct / 0 redirects observed';

      const liveSignals = [
        live.dnsResolved
          ? resolvedIp && resolvedIp !== 'Live Verified'
            ? `Real-time public DNS resolved to IP: ${resolvedIp}`
            : 'Real-time public DNS resolution succeeded'
          : 'Real-time public DNS resolution failed: domain does not exist or has no active A record',
        live.reachable && live.httpStatus
          ? `Live website probe responded with HTTP ${live.httpStatus}`
          : 'Live connection probe could not be confirmed',
        live.redirects ? `${live.redirects} redirect(s) observed` : 'Direct connection (0 redirects)',
      ];

      const reason = result.flags.length > 0
        ? result.flags.join('. ')
        : isSafe
          ? 'Real-time DNS resolution and live safety checks confirmed domain integrity with no threat indicators.'
          : !isHttps
            ? 'Warning: Connection uses unencrypted HTTP protocol without SSL/TLS encryption.'
            : 'The URL requires caution based on the available risk signals.';

      const recommendations = isSafe
        ? [
            'Website appears low risk based on the available live and URL signals.',
            'Still verify the domain name before entering passwords, OTPs, or payment details.',
          ]
        : !isHttps
          ? [
              'Connection is unencrypted (plain HTTP). Never transmit passwords, personal details, or payment card information over HTTP.',
              'Check if an official HTTPS version of this website exists.',
              'Do not trust forms or login boxes hosted on plain HTTP.',
            ]
          : [
              'Do not enter passwords, OTPs, card details, or other sensitive information.',
              'Verify the website address using an independently trusted source.',
              'If this link came from a message, confirm the sender before opening it.',
            ];

      const resultData = {
        url: result.url,
        status: isSafe ? ('safe' as const) : isWarning ? ('warning' as const) : ('danger' as const),
        statusLabel: isSafe ? 'SAFE' : isWarning ? 'SUSPICIOUS' : 'MALICIOUS',
        riskScore: result.riskScore,
        verdict: result.verdict,
        protocol,
        domainAge,
        sslStatus,
        ipReputation,
        redirects,
        reason,
        signals: [...result.flags, ...liveSignals],
        recommendations,
      };

      const historyItem = {
        id: createScanId(),
        type: 'url' as const,
        typeLabel: 'URL Checker',
        typeIcon: '🔗',
        title: trimmedUrl,
        snippet: resultData.verdict,
        riskScore: resultData.riskScore,
        status: resultData.status,
        statusLabel: resultData.statusLabel,
        category: result.status === 'safe' ? 'Verified Website' : 'Phishing / Suspicious Link',
        timestamp: new Date().toLocaleString([], {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        }),
        date: new Date().toISOString().slice(0, 10),
        resultPayload: resultData,
        targetScreen: STACKS.URL_ANALYSIS_RESULT,
        createdAt: new Date().toISOString(),
      };

      try {
        await addScanToHistory(historyItem);
      } catch (e) {
        console.warn('Failed to save URL scan to history:', e);
      }

      setLoading(false);
      navigation.navigate(STACKS.URL_ANALYSIS_RESULT, { result: resultData });
    } catch (error) {
      setLoading(false);
      const message = error instanceof Error ? error.message : 'Unable to complete the URL scan.';
      const fallbackResult = {
        url: trimmedUrl,
        status: 'warning' as const,
        statusLabel: 'SUSPICIOUS',
        riskScore: 50,
        verdict: 'Live URL Check Caution',
        protocol: trimmedUrl.toLowerCase().startsWith('https://') ? 'HTTPS (Not verified)' : 'HTTP (Unencrypted)',
        domainAge: 'Not checked',
        sslStatus: 'Not verified',
        ipReputation: 'Not available',
        redirects: 'Not checked',
        reason: `ScamShield AI completed partial check: ${message}`,
        signals: ['Domain inspection requires extra verification'],
        recommendations: [
          'Do not treat an unverified scan as proof that the website is safe.',
          'Verify the domain independently before entering sensitive information.',
        ],
      };

      try {
        await addScanToHistory({
          id: createScanId(),
          type: 'url' as const,
          typeLabel: 'URL Checker',
          typeIcon: '🔗',
          title: trimmedUrl,
          snippet: fallbackResult.verdict,
          riskScore: fallbackResult.riskScore,
          status: fallbackResult.status,
          statusLabel: fallbackResult.statusLabel,
          category: 'Unverified Link',
          timestamp: new Date().toLocaleString([], {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          }),
          date: new Date().toISOString().slice(0, 10),
          resultPayload: fallbackResult,
          targetScreen: STACKS.URL_ANALYSIS_RESULT,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Failed to save fallback scan to history:', e);
      }

      navigation.navigate(STACKS.URL_ANALYSIS_RESULT, {
        result: fallbackResult,
      });
    }
  };

  const isInputEmpty = !url.trim();

  return (
    <SafeScreen backgroundColor={Colors.background}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>URL Checker</Text>
          <Text style={styles.headerSubtitle}>Verify website links before you click</Text>
        </View>
        <View style={styles.backSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Instructions */}
          <Text style={styles.infoText}>
            Enter or paste any link from an SMS, email, or chat message to check for phishing websites, malware downloads, or fake payment gateways.
          </Text>

          {/* Quick Sample URLs */}
          <View style={styles.sampleSection}>
            <Text style={styles.sampleTitle}>Try a sample link:</Text>
            <View style={styles.sampleRow}>
              {SAMPLE_URLS.map((sample, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.sampleChip}
                  onPress={() => setUrl(sample.url)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sampleIcon}>{sample.icon}</Text>
                  <Text style={styles.sampleChipText}>{sample.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Text Input Container with Outline Focus */}
          <Pressable
            style={[
              styles.inputContainer,
              isFocused && styles.inputContainerFocused,
            ]}
            onPress={() => inputRef.current?.focus()}
          >
            <View style={styles.inputInnerRow}>
              <Text style={styles.urlIcon}>🔗</Text>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="https://example.com/verify-account"
                placeholderTextColor={Colors.textTertiary}
                value={url}
                onChangeText={setUrl}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!loading}
                underlineColorAndroid="transparent"
              />
            </View>
          </Pressable>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnClear, isInputEmpty && styles.btnDisabled]}
              onPress={handleClear}
              disabled={isInputEmpty}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnText, styles.btnClearText, isInputEmpty && styles.btnDisabledText]}>
                Clear
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnCheck, isInputEmpty && styles.btnDisabled]}
              onPress={handleCheckUrl}
              disabled={isInputEmpty}
              activeOpacity={0.8}
            >
              <Text style={[styles.btnText, styles.btnCheckText, isInputEmpty && styles.btnDisabledText]}>
                Check URL
              </Text>
            </TouchableOpacity>
          </View>

          {/* Loading State Placeholder */}
          {loading && (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
              <Text style={styles.loadingTitle}>Checking Website Safety...</Text>
              <Text style={styles.loadingSub}>{loadingPhase}</Text>

              {/* Skeleton Bars */}
              <View style={styles.skeletonBar} />
              <View style={[styles.skeletonBar, { width: '85%' }]} />
              <View style={[styles.skeletonBar, { width: '60%' }]} />
            </View>
          )}

          {/* What We Check Information Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>🛡️ What ScamShield AI Inspects:</Text>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>
                <Text style={styles.featureBold}>Domain Spoofing & Age:</Text> Detects freshly registered domains impersonating legitimate brands.
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>
                <Text style={styles.featureBold}>SSL/TLS Verification:</Text> Checks for missing or self-signed encryption certificates.
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>•</Text>
              <Text style={styles.featureText}>
                <Text style={styles.featureBold}>Blacklist Feeds:</Text> Cross-checks with known phishing and malware databases.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing['4xl'],
  },

  // Custom Header
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
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  backSpacer: {
    width: 40,
  },

  infoText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.base,
  },

  // Sample Section
  sampleSection: {
    marginBottom: Spacing.base,
  },
  sampleTitle: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  sampleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  sampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  sampleIcon: {
    fontSize: 12,
  },
  sampleChipText: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },

  // Input Container
  inputContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: '#000000',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.base,
  },
  inputContainerFocused: {
    borderColor: '#000000',
    borderWidth: 2,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  inputInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urlIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    padding: 0,
    borderWidth: 0,
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          outlineWidth: 0,
        } as any)
      : {}),
  },

  // Action Row
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  btn: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  btnCheck: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  btnClear: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  btnDisabled: {
    backgroundColor: Colors.surfaceSecondary,
    borderColor: Colors.border,
    opacity: 0.6,
  },
  btnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
  btnCheckText: {
    color: Colors.textInverse,
  },
  btnClearText: {
    color: Colors.textSecondary,
  },
  btnDisabledText: {
    color: Colors.textTertiary,
  },

  // Loading State Card
  loadingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  spinner: {
    marginBottom: Spacing.md,
  },
  loadingTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  loadingSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  skeletonBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.sm,
    width: '100%',
    marginBottom: 8,
    opacity: 0.6,
  },

  // Info Card
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoCardTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  featureBullet: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    marginRight: 6,
    fontWeight: FontWeight.bold,
  },
  featureText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  featureBold: {
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
});
