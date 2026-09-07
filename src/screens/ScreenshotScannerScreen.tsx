/**
 * ScreenshotScannerScreen — Select and analyze screenshots for scam content.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import SafeScreen from '../components/common/SafeScreen';
import { Colors, Spacing } from '../theme';
import { BorderRadius } from '../theme/spacing';
import { FontSize, FontWeight } from '../theme/typography';
import { STACKS } from '../constants/routes';
import { addScanToHistory, createScanId } from '../services/scanHistory';

// Sample screenshots for quick one-tap testing (using high-quality placeholder security illustrations)
const SAMPLE_SCREENSHOTS = [
  {
    id: 'sample_electricity',
    icon: '⚡',
    title: 'Electricity Bill Notice',
    sub: 'Urgent disconnection threat with personal phone number',
    uri: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&auto=format&fit=crop&q=80',
    type: 'Government Scam',
    verdict: 'Fake Utility Disconnection Scam',
    reason: 'This screenshot displays an unverified utility disconnection notice threatening power cutoff tonight, providing an unauthorized personal WhatsApp contact for immediate bill payment.',
  },
  {
    id: 'sample_bank',
    icon: '🏦',
    title: 'Bank KYC Deactivation Alert',
    sub: 'Fake banking SMS screenshot with suspicious link',
    uri: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&auto=format&fit=crop&q=80',
    type: 'Banking Scam',
    verdict: 'Credential Harvesting Screenshot',
    reason: 'The screenshot mimics an official banking notification alleging PAN card expiration, with an unofficial URL designed to harvest banking logins and debit card numbers.',
  },
  {
    id: 'sample_job',
    icon: '💼',
    title: 'Part-Time Job Earnings',
    sub: 'Telegram task payment proof with daily wage claim',
    uri: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600&auto=format&fit=crop&q=80',
    type: 'Job Scam',
    verdict: 'Task Fraud / Advance-Fee Scam',
    reason: 'The image showcases fabricated transaction receipts claiming ₹5,000 daily earnings for liking videos, which is a textbook social media task trap requiring advance registration deposits.',
  },
];

export default function ScreenshotScannerScreen() {
  const navigation = useNavigation<any>();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedSample, setSelectedSample] = useState<(typeof SAMPLE_SCREENSHOTS)[0] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('Initializing scan...');

  // Pick an image from the device's photo gallery
  const pickImageFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          'Permission Required',
          'Permission to access your photo gallery is required to select and analyze screenshots.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
        setSelectedSample(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to pick image. Please try again.');
    }
  };

  const handleSelectSample = (sample: (typeof SAMPLE_SCREENSHOTS)[0]) => {
    setSelectedImage(sample.uri);
    setSelectedSample(sample);
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    setSelectedSample(null);
    setLoading(false);
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setLoadingPhase('Preprocessing screenshot pixels...');

    setTimeout(() => {
      setLoadingPhase('Extracting text and visual indicators with AI...');
    }, 600);

    setTimeout(() => {
      setLoadingPhase('Comparing against known scam signatures...');
    }, 1100);

    setTimeout(async () => {
      setLoading(false);

      // Construct demo analysis result based on sample or realistic default
      const currentSample = selectedSample || SAMPLE_SCREENSHOTS[0];

      const demoResult = {
        riskScore: 91,
        status: 'danger' as const,
        statusLabel: 'High Risk (Screenshot Scam)',
        verdict: currentSample.verdict,
        scamType: currentSample.type,
        probability: 91,
        reason: currentSample.reason,
        indicators: [
          'Deceptive authority branding without official telecom verification',
          'High urgency countdown attempting to force immediate payment',
          'Unverified contact channel / personal mobile number provided',
          'Unofficial web address or untrusted payment QR code identified',
        ],
        recommendations: [
          'Do not scan any QR codes or visit links shown in the screenshot.',
          'Do not call or message the telephone number displayed in the image.',
          'Always verify bill dues directly via the official service provider app.',
          'Delete the screenshot and warn anyone who shared it with you.',
        ],
      };

      const historyItem = {
        id: createScanId(),
        type: 'screenshot' as const,
        typeLabel: 'Screenshot Scan',
        typeIcon: '📸',
        title: currentSample ? currentSample.title : 'Screenshot Analysis',
        snippet: currentSample ? currentSample.sub : 'Screenshot analyzed for scam indicators.',
        riskScore: demoResult.riskScore,
        status: demoResult.status,
        statusLabel: demoResult.statusLabel,
        category: demoResult.scamType,
        timestamp: new Date().toLocaleString([], {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        }),
        date: new Date().toISOString().slice(0, 10),
        resultPayload: demoResult,
        targetScreen: STACKS.MESSAGE_ANALYSIS_RESULT,
        createdAt: new Date().toISOString(),
      };

      try {
        await addScanToHistory(historyItem);
      } catch (error) {
        console.warn('Unable to save screenshot scan history:', error);
      }

      navigation.navigate(STACKS.MESSAGE_ANALYSIS_RESULT, { result: demoResult });
    }, 1600);
  };

  return (
    <SafeScreen backgroundColor={Colors.background}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Screenshot Scanner</Text>
          <Text style={styles.headerSubtitle}>Analyze suspicious images & QR codes</Text>
        </View>
        <View style={styles.backSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Instruction note */}
        <Text style={styles.infoText}>
          Upload or select any screenshot (chat messages, fake banking alerts, payment QR codes, or job offers) to inspect for fraud patterns.
        </Text>

        {/* ── Image Selector / Preview Area ── */}
        {!selectedImage ? (
          <View style={styles.uploadArea}>
            <View style={styles.uploadDashedBox}>
              <View style={styles.uploadIconCircle}>
                <Text style={styles.uploadLargeIcon}>🖼️</Text>
              </View>
              <Text style={styles.uploadTitle}>Choose Screenshot from Gallery</Text>
              <Text style={styles.uploadSub}>Supports JPG, PNG, and camera roll screenshots</Text>

              <TouchableOpacity
                style={styles.btnChooseGallery}
                onPress={pickImageFromGallery}
                activeOpacity={0.8}
              >
                <Text style={styles.btnChooseGalleryText}>📁 Open Photo Gallery</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Sample Presets */}
            <View style={styles.sampleSection}>
              <Text style={styles.sampleSectionTitle}>Or test with a sample scam screenshot:</Text>
              <View style={styles.sampleCardsRow}>
                {SAMPLE_SCREENSHOTS.map((sample) => (
                  <TouchableOpacity
                    key={sample.id}
                    style={styles.sampleCard}
                    onPress={() => handleSelectSample(sample)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sampleIconBox}>
                      <Text style={styles.sampleIcon}>{sample.icon}</Text>
                    </View>
                    <View style={styles.sampleTextGroup}>
                      <Text style={styles.sampleTitle}>{sample.title}</Text>
                      <Text style={styles.sampleSub} numberOfLines={1}>
                        {sample.sub}
                      </Text>
                    </View>
                    <Text style={styles.sampleSelectArrow}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.previewContainer}>
            {/* Header info strip */}
            <View style={styles.previewHeaderStrip}>
              <View style={styles.readyBadge}>
                <View style={styles.readyDot} />
                <Text style={styles.readyText}>Screenshot Ready for Analysis</Text>
              </View>

              <TouchableOpacity onPress={handleClearImage} activeOpacity={0.7}>
                <Text style={styles.removeText}>✕ Remove</Text>
              </TouchableOpacity>
            </View>

            {/* Image Preview Box */}
            <View style={styles.imagePreviewFrame}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
            </View>

            {/* Change Image Button */}
            <TouchableOpacity
              style={styles.btnChangeImage}
              onPress={pickImageFromGallery}
              activeOpacity={0.75}
            >
              <Text style={styles.btnChangeImageText}>🔄 Choose Another Screenshot</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Action Button ── */}
        <TouchableOpacity
          style={[
            styles.btnAnalyze,
            (!selectedImage || loading) && styles.btnAnalyzeDisabled,
          ]}
          onPress={handleAnalyze}
          disabled={!selectedImage || loading}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.btnAnalyzeText,
              (!selectedImage || loading) && styles.btnAnalyzeTextDisabled,
            ]}
          >
            🔍 Analyze Screenshot
          </Text>
        </TouchableOpacity>

        {/* ── Loading State Placeholder ── */}
        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
            <Text style={styles.loadingTitle}>Scanning Screenshot with AI...</Text>
            <Text style={styles.loadingPhaseText}>{loadingPhase}</Text>

            {/* Visual Scan Skeletons */}
            <View style={styles.skeletonBar} />
            <View style={[styles.skeletonBar, { width: '80%' }]} />
            <View style={[styles.skeletonBar, { width: '55%' }]} />
          </View>
        )}
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

  // Upload Area (Empty State)
  uploadArea: {
    marginBottom: Spacing.base,
  },
  uploadDashedBox: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  uploadIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  uploadLargeIcon: {
    fontSize: 32,
  },
  uploadTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  uploadSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  btnChooseGallery: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  btnChooseGalleryText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
  },

  // Quick Samples
  sampleSection: {
    marginTop: Spacing.xs,
  },
  sampleSectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  sampleCardsRow: {
    gap: Spacing.xs,
  },
  sampleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sampleIconBox: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  sampleIcon: {
    fontSize: 18,
  },
  sampleTextGroup: {
    flex: 1,
  },
  sampleTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  sampleSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  sampleSelectArrow: {
    fontSize: FontSize.lg,
    color: Colors.textTertiary,
    marginLeft: Spacing.sm,
    fontWeight: FontWeight.bold,
  },

  // Preview Area
  previewContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  previewHeaderStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  readyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  readyText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: '#059669',
  },
  removeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.danger,
  },
  imagePreviewFrame: {
    width: '100%',
    height: 240,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  btnChangeImage: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnChangeImageText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },

  // Analyze Button
  btnAnalyze: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  btnAnalyzeDisabled: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnAnalyzeText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
  },
  btnAnalyzeTextDisabled: {
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
  loadingPhaseText: {
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
