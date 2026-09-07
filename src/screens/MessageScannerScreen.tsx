/**
 * MessageScannerScreen — Scan suspicious SMS or chat messages for scams.
 * Initiates the AI scanning state and navigates to the dedicated analysis results screen.
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
import { scanMessageApi } from '../services/scamShieldApi';
import { addScanToHistory, createScanId } from '../services/scanHistory';

const MAX_CHAR_LIMIT = 1000;

interface DemoResult {
  riskScore: number; // 0 to 100
  status: 'safe' | 'warning' | 'danger';
  statusLabel: string;
  verdict: string;
  scamType: string;
  probability: number;
  reason: string;
  indicators: string[];
  recommendations: string[];
}

export default function MessageScannerScreen() {
  const navigation = useNavigation<any>();
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    setText('');
    setLoading(false);
  };

  const handleAnalyze = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    Keyboard.dismiss();
    setLoading(true);

    try {
      // Allow the scanning animation to display for a brief moment for good UX
      const [result] = await Promise.all([
        scanMessageApi(trimmed),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);

      const historyItem = {
        id: createScanId(),
        type: 'message' as const,
        typeLabel: 'Message Scan',
        typeIcon: '💬',
        title: result.scamType || 'Message Scan',
        snippet: trimmed.slice(0, 100) + (trimmed.length > 100 ? '...' : ''),
        riskScore: result.riskScore,
        status: result.status,
        statusLabel: result.statusLabel,
        category: result.scamType || 'General',
        timestamp: new Date().toLocaleString([], {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        }),
        date: new Date().toISOString().slice(0, 10),
        resultPayload: result,
        targetScreen: STACKS.MESSAGE_ANALYSIS_RESULT,
        createdAt: new Date().toISOString(),
      };

      try {
        await addScanToHistory(historyItem);
      } catch (e) {
        console.warn('Failed to save message scan history:', e);
      }

      setLoading(false);
      navigation.navigate(STACKS.MESSAGE_ANALYSIS_RESULT as any, { result });
    } catch (error) {
      setLoading(false);
      console.error('Message analysis failed:', error);
    }
  };

  const isInputEmpty = !text.trim();

  return (
    <SafeScreen backgroundColor={Colors.background}>
      {/* Custom Header back navigation stack support */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Message Scanner</Text>
          <Text style={styles.headerSubtitle}>Analyze SMS & chat messages for scams</Text>
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
            Paste or type any suspicious message (such as lottery wins, banking alerts, or package delivery warnings) to run an AI-powered scam check.
          </Text>

          {/* Quick sample button */}
          <TouchableOpacity
            style={styles.sampleBadge}
            onPress={() => {
              setText(
                'URGENT: Your bank account has been suspended due to pending KYC verification. Click http://hdfc-kyc-update.xyz to verify immediately or your account will be permanently blocked in 24 hours.'
              );
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.sampleBadgeText}>💡 Fill with Sample Scam Message</Text>
          </TouchableOpacity>

          {/* Text Input Container */}
          <Pressable
            style={[
              styles.inputContainer,
              isFocused && styles.inputContainerFocused,
            ]}
            onPress={() => inputRef.current?.focus()}
          >
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Paste or type suspicious message here..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={6}
              maxLength={MAX_CHAR_LIMIT}
              value={text}
              onChangeText={setText}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              underlineColorAndroid="transparent"
            />
            {/* Character counter */}
            <Text style={styles.charCounter}>
              {text.length} / {MAX_CHAR_LIMIT}
            </Text>
          </Pressable>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnClear, isInputEmpty && styles.btnDisabled]}
              onPress={handleClear}
              disabled={isInputEmpty}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnText, styles.btnClearText, isInputEmpty && styles.btnDisabledText]}>Clear</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnAnalyze, isInputEmpty && styles.btnDisabled]}
              onPress={handleAnalyze}
              disabled={isInputEmpty}
              activeOpacity={0.8}
            >
              <Text style={[styles.btnText, styles.btnAnalyzeText, isInputEmpty && styles.btnDisabledText]}>
                Analyze Message
              </Text>
            </TouchableOpacity>
          </View>

          {/* Loading State Placeholder */}
          {loading && (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
              <Text style={styles.loadingText}>Running AI Scan...</Text>
              <Text style={styles.loadingSub}>Analyzing context, language patterns, and risk signals</Text>
              {/* Skeleton placeholders */}
              <View style={styles.skeletonLine} />
              <View style={[styles.skeletonLine, { width: '80%' }]} />
              <View style={[styles.skeletonLine, { width: '50%' }]} />
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

  // Description
  infoText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },

  // Quick sample badge
  sampleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(26, 86, 219, 0.2)',
  },
  sampleBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },

  // Input Container
  inputContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: '#000000',
    padding: Spacing.base,
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
  input: {
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    minHeight: 130,
    textAlignVertical: 'top',
    paddingTop: 0,
    borderWidth: 0,
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          outlineWidth: 0,
        } as any)
      : {}),
  },
  charCounter: {
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: 'right',
    marginTop: Spacing.sm,
  },

  // Buttons
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

  // Loading State
  loadingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  spinner: {
    marginBottom: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  loadingSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  skeletonLine: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.sm,
    width: '100%',
    marginBottom: 10,
    opacity: 0.6,
  },
});
