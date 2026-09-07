/**
 * AutoShieldScreen.tsx
 * --------------------
 * Management & Simulation Center for Automatic Message Scam Detection.
 *
 * Allows the user to:
 * 1. Toggle master Automatic Message Scam Detection on / off
 * 2. Toggle supported messaging channels (SMS, WhatsApp, Telegram)
 * 3. Adjust sensitivity / minimum risk threshold for firing alerts
 * 4. Run instant simulations (WhatsApp Job Scam, Bank KYC SMS, Safe Swiggy OTP, or custom input)
 * 5. View intercepted alerts history with quick access to full analysis
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import SafeScreen from '../components/common/SafeScreen';
import StatusBadge from '../components/common/StatusBadge';
import { useAutoMessage } from '../context/AutoMessageContext';
import { STACKS } from '../constants/routes';
import { Colors, Spacing } from '../theme';
import { BorderRadius } from '../theme/spacing';
import { FontSize, FontWeight } from '../theme/typography';
import { MessageChannel } from '../services/autoMessageDetector';

const PRESET_SIMULATIONS = [
  {
    id: 'whatsapp_job',
    channel: 'WhatsApp' as MessageChannel,
    sender: '+91 98765 43210 (HR Recruiter)',
    title: 'WhatsApp Job Scam',
    desc: 'Unrealistic work-from-home pay offer with external telegram link',
    icon: '💼',
    text: 'Hello dear! Amazon is hiring part-time assistants. Work 15 mins daily and earn ₹8,000 - ₹15,000/day. Join our task group right now: https://amazon-career-tasks.xyz/invite',
  },
  {
    id: 'sms_bank_kyc',
    channel: 'SMS' as MessageChannel,
    sender: 'VM-HDFCBK',
    title: 'Bank KYC Suspension SMS',
    desc: 'Phishing attempt threatening account blockage with malicious link',
    icon: '🏦',
    text: 'URGENT ALERT: Your HDFC Bank A/C 4910 has been suspended due to pending PAN/KYC. Verify immediately to avoid permanent deactivation: http://hdfc-pan-update.xyz',
  },
  {
    id: 'whatsapp_lottery',
    channel: 'WhatsApp' as MessageChannel,
    sender: '+92 300 1234567 (KBC Lucky Winner)',
    title: 'KBC Lottery Scam',
    desc: 'Fraudulent lottery winning message demanding processing fee',
    icon: '🎟️',
    text: 'Congratulations! Your WhatsApp number has won ₹25,00,000 in KBC 2026 Lucky Draw. Contact lottery manager Rana Pratap on WhatsApp to claim your prize money immediately.',
  },
  {
    id: 'sms_legit_otp',
    channel: 'SMS' as MessageChannel,
    sender: 'BZ-SWIGGY',
    title: 'Legitimate Safe SMS',
    desc: 'Standard one-time password communication with no suspicious markers',
    icon: '✅',
    text: 'Your Swiggy verification code is 6294. Never share this OTP with anyone, including Swiggy delivery partners or staff.',
  },
];

export default function AutoShieldScreen() {
  const navigation = useNavigation<any>();
  const { config, updateConfig, simulateIncomingMessage, interceptedAlerts, isProcessing } =
    useAutoMessage();

  const [customChannel, setCustomChannel] = useState<MessageChannel>('WhatsApp');
  const [customSender, setCustomSender] = useState('');
  const [customText, setCustomText] = useState('');
  const [activeSimulationId, setActiveSimulationId] = useState<string | null>(null);

  const handleToggleMaster = async (val: boolean) => {
    await updateConfig({ enabled: val });
  };

  const handleToggleChannel = async (channel: string, val: boolean) => {
    await updateConfig({
      channels: {
        ...config.channels,
        [channel]: val,
      },
    });
  };

  const handleRunSimulation = async (sim: typeof PRESET_SIMULATIONS[0]) => {
    if (!config.enabled) {
      Alert.alert(
        'Auto Shield is Disabled',
        'Please enable Automatic Message Scam Shield above before running simulations.',
        [{ text: 'OK' }]
      );
      return;
    }
    setActiveSimulationId(sim.id);
    try {
      const outcome = await simulateIncomingMessage(sim.channel, sim.sender, sim.text);
      if (!outcome.isScam) {
        Alert.alert(
          'Safe Message Passed',
          `ScamShield analyzed "${sim.title}" and found it safe (Risk Score: ${outcome.resultPayload?.riskScore ?? 0}/100). No alert banner was triggered.`,
          [
            {
              text: 'View Analysis',
              onPress: () =>
                navigation.navigate(STACKS.MESSAGE_ANALYSIS_RESULT as any, {
                  result: outcome.resultPayload,
                }),
            },
            { text: 'Done', style: 'cancel' },
          ]
        );
      }
    } finally {
      setActiveSimulationId(null);
    }
  };

  const handleRunCustomSimulation = async () => {
    if (!customText.trim()) {
      Alert.alert('Empty Text', 'Please enter a message to simulate.');
      return;
    }
    if (!config.enabled) {
      Alert.alert(
        'Auto Shield is Disabled',
        'Please enable Automatic Message Scam Shield above before testing.',
        [{ text: 'OK' }]
      );
      return;
    }

    const sender = customSender.trim() || (customChannel === 'WhatsApp' ? '+91 99999 88888' : 'TEST-SMS');
    setActiveSimulationId('custom');
    try {
      const outcome = await simulateIncomingMessage(customChannel, sender, customText.trim());
      if (!outcome.isScam) {
        Alert.alert(
          'Safe Message Passed',
          `ScamShield analyzed the custom message and found it safe (Risk Score: ${outcome.resultPayload?.riskScore ?? 0}/100). No alert banner was triggered.`,
          [
            {
              text: 'View Analysis',
              onPress: () =>
                navigation.navigate(STACKS.MESSAGE_ANALYSIS_RESULT as any, {
                  result: outcome.resultPayload,
                }),
            },
            { text: 'Done', style: 'cancel' },
          ]
        );
      }
    } finally {
      setActiveSimulationId(null);
    }
  };

  return (
    <SafeScreen backgroundColor={Colors.background}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Auto Message Shield</Text>
          <Text style={styles.headerSubtitle}>Real-time SMS & messaging defence</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View style={[styles.card, config.enabled ? styles.cardActive : styles.cardInactive]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIconBox}>
              <Text style={styles.cardIconText}>🛡️</Text>
            </View>
            <View style={styles.cardHeaderInfo}>
              <Text style={styles.cardTitle}>Automatic Scam Detection</Text>
              <Text style={styles.cardSubtitle}>
                {config.enabled
                  ? 'Active — Inspecting incoming messages & URLs'
                  : 'Disabled — Turn on to protect against malicious notifications'}
              </Text>
            </View>
            <Switch
              value={config.enabled}
              onValueChange={handleToggleMaster}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.surface}
            />
          </View>
        </View>

        {/* Monitored Channels */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Protected Channels</Text>
          <Text style={styles.sectionSub}>Select which channels ScamShield monitors</Text>

          <View style={styles.channelCard}>
            <View style={styles.channelRow}>
              <View style={styles.channelInfo}>
                <Text style={styles.channelIcon}>💬</Text>
                <View>
                  <Text style={styles.channelName}>SMS Messages</Text>
                  <Text style={styles.channelDesc}>Financial, delivery & bank alerts</Text>
                </View>
              </View>
              <Switch
                value={config.channels.sms}
                disabled={!config.enabled}
                onValueChange={(val) => handleToggleChannel('sms', val)}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.surface}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.channelRow}>
              <View style={styles.channelInfo}>
                <Text style={styles.channelIcon}>🟢</Text>
                <View>
                  <Text style={styles.channelName}>WhatsApp</Text>
                  <Text style={styles.channelDesc}>Scam offers, fake job groups & lottery links</Text>
                </View>
              </View>
              <Switch
                value={config.channels.whatsapp}
                disabled={!config.enabled}
                onValueChange={(val) => handleToggleChannel('whatsapp', val)}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.surface}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.channelRow}>
              <View style={styles.channelInfo}>
                <Text style={styles.channelIcon}>✈️</Text>
                <View>
                  <Text style={styles.channelName}>Telegram / Messaging Apps</Text>
                  <Text style={styles.channelDesc}>Crypto investment schemes & phishing</Text>
                </View>
              </View>
              <Switch
                value={config.channels.telegram}
                disabled={!config.enabled}
                onValueChange={(val) => handleToggleChannel('telegram', val)}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.surface}
              />
            </View>
          </View>
        </View>

        {/* Live Simulation Testing Panel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test & Simulation Center</Text>
          <Text style={styles.sectionSub}>
            Simulate incoming notifications to see ScamShield in action
          </Text>

          <View style={styles.presetsList}>
            {PRESET_SIMULATIONS.map((sim) => {
              const isSimulating = activeSimulationId === sim.id;
              return (
                <View key={sim.id} style={styles.presetCard}>
                  <View style={styles.presetTop}>
                    <Text style={styles.presetEmoji}>{sim.icon}</Text>
                    <View style={styles.presetHeadInfo}>
                      <Text style={styles.presetTitle}>{sim.title}</Text>
                      <Text style={styles.presetChannelBadge}>
                        {sim.channel.toUpperCase()} • {sim.sender}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.presetTextPreview} numberOfLines={2}>
                    "{sim.text}"
                  </Text>
                  <TouchableOpacity
                    style={[styles.simulateBtn, isSimulating && styles.simulateBtnDisabled]}
                    disabled={isSimulating || isProcessing}
                    onPress={() => handleRunSimulation(sim)}
                    activeOpacity={0.8}
                  >
                    {isSimulating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.simulateBtnText}>Simulate Incoming Message</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Custom Message Simulator */}
          <View style={styles.customSimulatorCard}>
            <Text style={styles.customTitle}>Custom Notification Tester</Text>
            <Text style={styles.customDesc}>
              Enter any message text or link to test the live detection engine
            </Text>

            {/* Channel picker buttons */}
            <View style={styles.channelPickerRow}>
              {(['WhatsApp', 'SMS', 'Telegram'] as MessageChannel[]).map((ch) => (
                <TouchableOpacity
                  key={ch}
                  style={[
                    styles.pickerChip,
                    customChannel === ch && styles.pickerChipActive,
                  ]}
                  onPress={() => setCustomChannel(ch)}
                >
                  <Text
                    style={[
                      styles.pickerChipText,
                      customChannel === ch && styles.pickerChipTextActive,
                    ]}
                  >
                    {ch === 'WhatsApp' ? '🟢 WhatsApp' : ch === 'SMS' ? '💬 SMS' : '✈️ Telegram'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.senderInput}
              placeholder="Sender (e.g. +91 99999 12345 or BANK-ALERT)"
              placeholderTextColor={Colors.textSecondary}
              value={customSender}
              onChangeText={setCustomSender}
            />

            <TextInput
              style={styles.messageInput}
              placeholder="Paste message text or URL to analyze..."
              placeholderTextColor={Colors.textSecondary}
              multiline
              numberOfLines={3}
              value={customText}
              onChangeText={setCustomText}
            />

            <TouchableOpacity
              style={[
                styles.customAnalyzeBtn,
                (activeSimulationId === 'custom' || isProcessing) && styles.simulateBtnDisabled,
              ]}
              disabled={activeSimulationId === 'custom' || isProcessing}
              onPress={handleRunCustomSimulation}
              activeOpacity={0.8}
            >
              {activeSimulationId === 'custom' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.customAnalyzeBtnText}>Analyze Custom Message</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Intercepted Scams Log */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Intercepted Scams</Text>
          <Text style={styles.sectionSub}>Auto-detected messages in this session</Text>

          {interceptedAlerts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🛡️</Text>
              <Text style={styles.emptyTitle}>No Scams Detected Yet</Text>
              <Text style={styles.emptyDesc}>
                Trigger a simulation above to see how ScamShield captures and alerts you to threats.
              </Text>
            </View>
          ) : (
            interceptedAlerts.map((alert, idx) => (
              <TouchableOpacity
                key={`${alert.id}-${idx}`}
                style={styles.historyCard}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate(STACKS.MESSAGE_ANALYSIS_RESULT as any, {
                    result: alert.resultPayload,
                  })
                }
              >
                <View style={styles.historyTop}>
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyChannelTag}>
                      {alert.channel.toUpperCase()} • {alert.sender}
                    </Text>
                    <Text style={styles.historyReason} numberOfLines={2}>
                      {alert.reason}
                    </Text>
                  </View>
                  <StatusBadge variant={alert.status} label={`Risk ${alert.riskScore}`} />
                </View>
                <View style={styles.historyBottom}>
                  <Text style={styles.historySnippet} numberOfLines={1}>
                    "{alert.text}"
                  </Text>
                  <Text style={styles.historyDetailLink}>View Full Analysis →</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 50,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1.5,
    marginBottom: Spacing.lg,
    shadowColor: Colors.border,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardActive: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  cardInactive: {
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  cardIconText: {
    fontSize: 24,
  },
  cardHeaderInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  cardTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  sectionSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  channelCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  channelIcon: {
    fontSize: 22,
    marginRight: Spacing.md,
  },
  channelName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  channelDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  presetsList: {
    gap: Spacing.md,
    marginBottom: Spacing.base,
  },
  presetCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
  },
  presetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  presetEmoji: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  presetHeadInfo: {
    flex: 1,
  },
  presetTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  presetChannelBadge: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  presetTextPreview: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: Spacing.md,
  },
  simulateBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simulateBtnDisabled: {
    opacity: 0.6,
  },
  simulateBtnText: {
    color: '#FFFFFF',
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.sm,
  },
  customSimulatorCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
  },
  customTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  customDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  channelPickerRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  pickerChip: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  pickerChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  pickerChipText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  pickerChipTextActive: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  senderInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    minHeight: 64,
    textAlignVertical: 'top',
    marginBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  customAnalyzeBtn: {
    backgroundColor: '#0F172A',
    borderRadius: BorderRadius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customAnalyzeBtnText: {
    color: '#FFFFFF',
    fontWeight: FontWeight.bold,
    fontSize: FontSize.sm,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  historyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  historyLeft: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  historyChannelTag: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginBottom: 2,
  },
  historyReason: {
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
    fontWeight: FontWeight.semibold,
  },
  historyBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  historySnippet: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginRight: Spacing.sm,
  },
  historyDetailLink: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
});
