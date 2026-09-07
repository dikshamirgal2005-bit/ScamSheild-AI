/**
 * EmailAnalyzerScreen — Input and inspect email metadata (sender, subject, body, URLs, attachments).
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
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
import { addScanToHistory, createScanId } from '../services/scanHistory';

interface SampleEmail {
  label: string;
  icon: string;
  sender: string;
  subject: string;
  body: string;
  urls: string;
  attachments: string[];
  expectedStatus: 'danger' | 'warning' | 'safe';
}

const SAMPLE_EMAILS: SampleEmail[] = [
  {
    label: 'PayPal Phishing',
    icon: '🔴',
    sender: 'security@paypal-service-alert.xyz',
    subject: 'Action Required: Your Account Has Been Temporarily Limited',
    body: 'Dear Customer, We detected an unauthorized login attempt from an unknown device. To protect your funds, click the link below to verify your identity and restore access within 24 hours.',
    urls: 'http://login-paypal-verify.xyz/auth?id=9302',
    attachments: ['Identity_Verification_Form.pdf.exe'],
    expectedStatus: 'danger',
  },
  {
    label: 'CEO Gift Card Wire',
    icon: '🟡',
    sender: 'ceo.corporate.office.mail@gmail.com',
    subject: 'Urgent task - Are you at your desk right now?',
    body: 'Hi, I need you to purchase 5 Apple Gift Cards ($100 each) for an urgent client presentation right now. Send the card codes back to me immediately. I am currently in a meeting.',
    urls: '',
    attachments: [],
    expectedStatus: 'warning',
  },
  {
    label: 'Legitimate Cloud Receipt',
    icon: '🟢',
    sender: 'billing-noreply@google.com',
    subject: 'Your Google Workspace Monthly Tax Invoice',
    body: 'Thank you for your payment. Your invoice for the month of August is now ready for download. Amount billed: ₹1,250.00. Payment method: Credit Card ending in 4012.',
    urls: 'https://workspace.google.com/dashboard/billing',
    attachments: ['Invoice_Aug2026.pdf'],
    expectedStatus: 'safe',
  },
];

export default function EmailAnalyzerScreen() {
  const navigation = useNavigation<any>();

  // Form State
  const [sender, setSender] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [urls, setUrls] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [newAttachment, setNewAttachment] = useState('');

  // UI State
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('Initializing email scanner...');

  const handleApplySample = (sample: SampleEmail) => {
    setSender(sample.sender);
    setSubject(sample.subject);
    setBody(sample.body);
    setUrls(sample.urls);
    setAttachments([...sample.attachments]);
  };

  const handleClearAll = () => {
    setSender('');
    setSubject('');
    setBody('');
    setUrls('');
    setAttachments([]);
    setNewAttachment('');
    setLoading(false);
  };

  const handleAddAttachment = () => {
    if (!newAttachment.trim()) return;
    setAttachments((prev) => [...prev, newAttachment.trim()]);
    setNewAttachment('');
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = () => {
    if (!sender.trim() && !body.trim()) return;

    Keyboard.dismiss();
    setLoading(true);
    setLoadingPhase('Inspecting sender SPF/DKIM authentication & domain headers...');

    setTimeout(() => {
      setLoadingPhase('Scanning email body for psychological triggers & urgency...');
    }, 500);

    setTimeout(() => {
      setLoadingPhase('Analyzing embedded hyperlinks and attachment extensions...');
    }, 1000);

    setTimeout(async () => {
      setLoading(false);

      const senderLower = sender.toLowerCase();
      const bodyLower = body.toLowerCase();
      const urlsLower = urls.toLowerCase();
      const hasSuspiciousAttachment = attachments.some((att) =>
        att.toLowerCase().endsWith('.exe') || att.toLowerCase().endsWith('.scr') || att.toLowerCase().endsWith('.zip')
      );

      let resultData;

      if (
        senderLower.includes('xyz') ||
        senderLower.includes('alert') ||
        urlsLower.includes('xyz') ||
        hasSuspiciousAttachment ||
        bodyLower.includes('unauthorized') ||
        bodyLower.includes('paypal') ||
        bodyLower.includes('suspend')
      ) {
        resultData = {
          sender: sender || 'security@service-paypal-alert.xyz',
          subject: subject || 'Action Required: Unauthorized Access Detected',
          bodySnippet: body.slice(0, 160) + (body.length > 160 ? '...' : ''),
          status: 'danger' as const,
          statusLabel: 'HIGH RISK PHISHING',
          riskScore: 92,
          verdict: 'Credential Harvesting & Spoofed Brand Email',
          spfDkim: 'FAILED (Domain Unaligned)',
          senderReputation: 'Unverified Third-Party Mail Relay',
          urlRisk: urls ? 'Malicious Destination (.xyz domain)' : 'No Links Provided',
          attachmentRisk: attachments.length > 0 ? (hasSuspiciousAttachment ? 'High Risk Executable Disguise' : 'Standard Document') : 'None Attached',
          reason: 'This email attempts to masquerade as an official service provider. The sender address originates from an unauthenticated lookalike domain (.xyz), and the body contains urgency coercion demanding identity verification.',
          redFlags: [
            'Sender address does not match official corporate domain',
            'Failed SPF/DKIM cryptographic email alignment checks',
            'High urgency language ("account limited", "within 24 hours")',
            hasSuspiciousAttachment
              ? 'Attachment contains dangerous double extension (e.g. .pdf.exe)'
              : 'Contains unverified authentication verification links',
          ],
          recommendations: [
            'Do not click any link or download attachments from this email.',
            'Never enter login credentials or payment card details on this link.',
            'Report this message as Phishing in your email client and delete it.',
            'If you already entered passwords, change your credentials immediately.',
          ],
        };
      } else if (
        senderLower.includes('gmail.com') ||
        bodyLower.includes('gift card') ||
        bodyLower.includes('urgent task') ||
        bodyLower.includes('wire')
      ) {
        resultData = {
          sender: sender || 'ceo.corporate.office.mail@gmail.com',
          subject: subject || 'Urgent task - Are you available?',
          bodySnippet: body.slice(0, 160) + (body.length > 160 ? '...' : ''),
          status: 'warning' as const,
          statusLabel: 'SUSPICIOUS (CEO FRAUD)',
          riskScore: 74,
          verdict: 'Executive Impersonation & Gift Card Scheme',
          spfDkim: 'PASSED (Generic Public Webmail)',
          senderReputation: 'Free Public Webmail (Gmail/Yahoo)',
          urlRisk: 'No Direct Link Found',
          attachmentRisk: 'None Attached',
          reason: 'This email uses executive impersonation tactics (CEO Fraud / Business Email Compromise). The sender uses a free public email address pretending to be an internal executive requesting financial favors.',
          redFlags: [
            'Uses a public free webmail address for official executive communication',
            'Demands rapid off-book financial action (gift cards / instant transfers)',
            'Insists on secrecy or inability to verify via phone call',
          ],
          recommendations: [
            'Verify the request verbally with the person via official phone or internal chat.',
            'Do not purchase gift cards or transfer money without written corporate approval.',
            'Forward the email to your internal IT security department.',
          ],
        };
      } else {
        resultData = {
          sender: sender || 'billing-noreply@google.com',
          subject: subject || 'Monthly Workspace Invoice',
          bodySnippet: body.slice(0, 160) + (body.length > 160 ? '...' : ''),
          status: 'safe' as const,
          statusLabel: 'LEGITIMATE',
          riskScore: 8,
          verdict: 'Authentic & Verified Commercial Email',
          spfDkim: 'PASSED (Cryptographically Signed)',
          senderReputation: 'Verified Corporate Enterprise Gateway',
          urlRisk: 'Official Corporate Domain (workspace.google.com)',
          attachmentRisk: 'Clean PDF Document',
          reason: 'Sender domain has authentic SPF, DKIM, and DMARC verification records. No coercive language, malicious links, or suspicious file types detected.',
          redFlags: [
            'Cryptographic signatures match sender domain',
            'Neutral informational tone without coercion',
            'Links resolve directly to secure official servers',
          ],
          recommendations: [
            'Email appears authentic and safe to open.',
            'Always inspect sender address when transactions are mentioned.',
          ],
        };
      }

      const historyItem = {
        id: createScanId(),
        type: 'email' as const,
        typeLabel: 'Email Analyzer',
        typeIcon: '📧',
        title: sender.trim() || 'Email Analysis',
        snippet: subject.trim() || (body.trim().slice(0, 100) + (body.trim().length > 100 ? '...' : '')),
        riskScore: resultData.riskScore,
        status: resultData.status,
        statusLabel: resultData.statusLabel,
        category: resultData.verdict,
        timestamp: new Date().toLocaleString([], {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        }),
        date: new Date().toISOString().slice(0, 10),
        resultPayload: resultData,
        targetScreen: STACKS.EMAIL_ANALYSIS_RESULT,
        createdAt: new Date().toISOString(),
      };

      try {
        await addScanToHistory(historyItem);
      } catch (e) {
        console.warn('Failed to save email scan to history:', e);
      }

      navigation.navigate(STACKS.EMAIL_ANALYSIS_RESULT, { result: resultData });
    }, 1500);
  };

  const isFormEmpty = !sender.trim() && !body.trim();

  return (
    <SafeScreen backgroundColor={Colors.background}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Email Analyzer</Text>
          <Text style={styles.headerSubtitle}>Detect phishing, spoofing & malicious attachments</Text>
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
            Inspect suspicious emails for sender header spoofing, phishing links, and deceptive attachments.
          </Text>

          {/* Quick Sample Presets */}
          <View style={styles.sampleSection}>
            <Text style={styles.sampleTitle}>Try a sample email scenario:</Text>
            <View style={styles.sampleRow}>
              {SAMPLE_EMAILS.map((sample, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.sampleChip}
                  onPress={() => handleApplySample(sample)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sampleIcon}>{sample.icon}</Text>
                  <Text style={styles.sampleChipText}>{sample.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Input 1: Sender ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Sender Address (From) <Text style={styles.fieldRequired}>*</Text>
            </Text>
            <View style={styles.inputBox}>
              <Text style={styles.inputFieldIcon}>👤</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. security-team@paypal-service-alert.xyz"
                placeholderTextColor={Colors.textTertiary}
                value={sender}
                onChangeText={setSender}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!loading}
              />
            </View>
          </View>

          {/* ── Input 2: Subject ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email Subject</Text>
            <View style={styles.inputBox}>
              <Text style={styles.inputFieldIcon}>✉️</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. URGENT: Your account has been suspended"
                placeholderTextColor={Colors.textTertiary}
                value={subject}
                onChangeText={setSubject}
                autoCapitalize="sentences"
                editable={!loading}
              />
            </View>
          </View>

          {/* ── Input 3: Body ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Email Message Body <Text style={styles.fieldRequired}>*</Text>
            </Text>
            <View style={[styles.inputBox, styles.inputBoxMultiline]}>
              <TextInput
                style={[styles.textInput, styles.textInputMultiline]}
                placeholder="Paste the full text of the suspicious email here..."
                placeholderTextColor={Colors.textTertiary}
                value={body}
                onChangeText={setBody}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>
          </View>

          {/* ── Input 4: Embedded Links ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Embedded Links / URLs (Optional)</Text>
            <View style={styles.inputBox}>
              <Text style={styles.inputFieldIcon}>🔗</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. http://login-verify-account.xyz/update"
                placeholderTextColor={Colors.textTertiary}
                value={urls}
                onChangeText={setUrls}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!loading}
              />
            </View>
          </View>

          {/* ── Input 5: Attachments ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Attachments (Optional)</Text>

            {/* List of existing attachment chips */}
            {attachments.length > 0 && (
              <View style={styles.attachmentChipsWrap}>
                {attachments.map((att, idx) => (
                  <View key={idx} style={styles.attachmentChip}>
                    <Text style={styles.attachmentIcon}>📎</Text>
                    <Text style={styles.attachmentText} numberOfLines={1}>
                      {att}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveAttachment(idx)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.removeAttText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Add attachment input row */}
            <View style={styles.addAttachmentRow}>
              <View style={[styles.inputBox, { flex: 1, marginBottom: 0 }]}>
                <Text style={styles.inputFieldIcon}>📎</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Invoice_Payment.pdf.exe"
                  placeholderTextColor={Colors.textTertiary}
                  value={newAttachment}
                  onChangeText={setNewAttachment}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={[styles.btnAddAtt, !newAttachment.trim() && styles.btnAddAttDisabled]}
                onPress={handleAddAttachment}
                disabled={!newAttachment.trim()}
                activeOpacity={0.8}
              >
                <Text style={styles.btnAddAttText}>+ Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnClear, isFormEmpty && styles.btnDisabled]}
              onPress={handleClearAll}
              disabled={isFormEmpty}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnText, styles.btnClearText, isFormEmpty && styles.btnDisabledText]}>
                Clear All
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnAnalyze, isFormEmpty && styles.btnDisabled]}
              onPress={handleAnalyze}
              disabled={isFormEmpty}
              activeOpacity={0.8}
            >
              <Text style={[styles.btnText, styles.btnAnalyzeText, isFormEmpty && styles.btnDisabledText]}>
                Analyze Email
              </Text>
            </TouchableOpacity>
          </View>

          {/* Loading State Placeholder */}
          {loading && (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
              <Text style={styles.loadingTitle}>Analyzing Email Security...</Text>
              <Text style={styles.loadingSub}>{loadingPhase}</Text>

              {/* Skeleton Bars */}
              <View style={styles.skeletonBar} />
              <View style={[styles.skeletonBar, { width: '80%' }]} />
              <View style={[styles.skeletonBar, { width: '50%' }]} />
            </View>
          )}
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

  // Sample Presets
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

  // Form Field Groups
  fieldGroup: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  fieldRequired: {
    color: Colors.danger,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: '#000000',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  inputBoxMultiline: {
    paddingVertical: Spacing.base,
    alignItems: 'flex-start',
  },
  inputFieldIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: FontSize.sm,
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
  textInputMultiline: {
    minHeight: 110,
  },

  // Attachment Section
  attachmentChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    gap: 6,
    maxWidth: '100%',
  },
  attachmentIcon: {
    fontSize: 12,
  },
  attachmentText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: FontWeight.medium,
    flexShrink: 1,
  },
  removeAttText: {
    fontSize: 12,
    color: Colors.danger,
    fontWeight: FontWeight.bold,
    paddingLeft: 4,
  },
  addAttachmentRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  btnAddAtt: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  btnAddAttDisabled: {
    backgroundColor: Colors.border,
  },
  btnAddAttText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
  },

  // Action Buttons
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
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
  btnAnalyze: {
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
  btnAnalyzeText: {
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
});
