/**
 * SafetyTopicDetailScreen — Detailed explanation screen for individual anti-fraud topics.
 * Features:
 *  - Comprehensive concept explanation
 *  - Step-by-step scam operation lifecycle
 *  - Detected red flags checklist
 *  - Golden defense rules
 *  - Real-world case study scenario & takeaway
 *  - Incident response action plan
 *  - Mark as learned toggle & next topic navigation
 */
import React, { useState } from 'react';
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
import { SAFETY_TOPICS, SafetyTopic } from '../data/safetyTopics';
import { RootStackParamList } from '../navigation/AppNavigator';
import { STACKS } from '../constants/routes';

type TopicDetailRouteProp = RouteProp<RootStackParamList, any>;

export default function SafetyTopicDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<TopicDetailRouteProp>();

  const topicId = route.params?.topicId || 'phishing';
  const topicIndex = SAFETY_TOPICS.findIndex((t) => t.id === topicId);
  const topic: SafetyTopic = SAFETY_TOPICS[topicIndex >= 0 ? topicIndex : 0];

  const nextTopic = SAFETY_TOPICS[(topicIndex + 1) % SAFETY_TOPICS.length];

  const [isLearned, setIsLearned] = useState(false);

  const handleShare = () => {
    Alert.alert(
      'Share Safety Guide',
      `"${topic.title}" — Learn how to protect yourself with ScamShield AI.`,
      [{ text: 'OK' }]
    );
  };

  const handleNextTopic = () => {
    navigation.replace(STACKS.SAFETY_TOPIC_DETAIL as any, { topicId: nextTopic.id });
  };

  return (
    <SafeScreen backgroundColor={Colors.background}>
      {/* ── Custom Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {topic.title}
          </Text>
          <Text style={styles.headerSub}>{topic.category}</Text>
        </View>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>📤</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Card ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconBox}>
              <Text style={styles.heroIcon}>{topic.icon}</Text>
            </View>

            <View style={styles.heroBadgeGroup}>
              <View
                style={[
                  styles.threatBadge,
                  { backgroundColor: topic.threatBg },
                ]}
              >
                <Text style={[styles.threatBadgeText, { color: topic.threatColor }]}>
                  {topic.threatLevel} Threat
                </Text>
              </View>
              <Text style={styles.heroReadTime}>⏱️ {topic.readTime}</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>{topic.title}</Text>
          <Text style={styles.heroSummary}>{topic.summary}</Text>
        </View>

        {/* ── 1. What is it? ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionIcon}>📖</Text>
            <Text style={styles.sectionTitle}>What is {topic.title}?</Text>
          </View>
          <Text style={styles.paragraphText}>{topic.whatIsIt}</Text>
        </View>

        {/* ── 2. How the Scam Operates ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionIcon}>⚙️</Text>
            <Text style={styles.sectionTitle}>How the Attack Operates</Text>
          </View>
          <Text style={styles.sectionSubtext}>
            Common step-by-step playbook employed by cybercriminals:
          </Text>

          <View style={styles.stepsTimeline}>
            {topic.howItWorks.map((item, idx) => (
              <View key={idx} style={styles.stepItem}>
                <View style={styles.stepNumberCircle}>
                  <Text style={styles.stepNumberText}>{item.step}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{item.title}</Text>
                  <Text style={styles.stepDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── 3. Red Flags Checklist ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionIcon}>🚩</Text>
            <Text style={styles.sectionTitle}>Key Warning Signs & Red Flags</Text>
          </View>

          <View style={styles.redFlagsList}>
            {topic.redFlags.map((flag, idx) => (
              <View key={idx} style={styles.redFlagRow}>
                <Text style={styles.redFlagDot}>⚠</Text>
                <Text style={styles.redFlagText}>{flag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── 4. Golden Defense Rules ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionIcon}>🛡️</Text>
            <Text style={styles.sectionTitle}>Golden Defense Rules</Text>
          </View>

          <View style={styles.rulesList}>
            {topic.goldenRules.map((rule, idx) => (
              <View key={idx} style={styles.ruleRow}>
                <Text style={styles.ruleCheck}>✓</Text>
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── 5. Real-World Case Study ── */}
        <View style={styles.caseStudyCard}>
          <View style={styles.caseStudyHeader}>
            <Text style={styles.caseStudyBadge}>CASE STUDY</Text>
            <Text style={styles.caseStudyTitle}>{topic.realWorldExample.title}</Text>
          </View>

          <View style={styles.scenarioBlock}>
            <Text style={styles.scenarioLabel}>Scenario:</Text>
            <Text style={styles.scenarioText}>{topic.realWorldExample.scenario}</Text>
          </View>

          <View style={styles.takeawayBlock}>
            <Text style={styles.takeawayLabel}>💡 Key Takeaway:</Text>
            <Text style={styles.takeawayText}>{topic.realWorldExample.takeaway}</Text>
          </View>
        </View>

        {/* ── 6. What To Do If Targeted ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionIcon}>🚨</Text>
            <Text style={styles.sectionTitle}>What To Do If Targeted</Text>
          </View>

          <View style={styles.responseList}>
            {topic.whatToDoIfTargeted.map((action, idx) => (
              <View key={idx} style={styles.responseRow}>
                <View style={styles.responseNumberBox}>
                  <Text style={styles.responseNumberText}>{idx + 1}</Text>
                </View>
                <Text style={styles.responseText}>{action}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── 7. Learning Completion Button ── */}
        <TouchableOpacity
          style={[styles.learnedBtn, isLearned && styles.learnedBtnActive]}
          onPress={() => setIsLearned((prev) => !prev)}
          activeOpacity={0.8}
        >
          <Text style={[styles.learnedBtnIcon, isLearned && styles.learnedBtnIconActive]}>
            {isLearned ? '✓' : '○'}
          </Text>
          <Text style={[styles.learnedBtnText, isLearned && styles.learnedBtnTextActive]}>
            {isLearned ? 'Topic Completed & Mastered!' : 'Mark Topic as Learned'}
          </Text>
        </TouchableOpacity>

        {/* ── 8. Next Topic Navigation ── */}
        <TouchableOpacity
          style={styles.nextTopicCard}
          onPress={handleNextTopic}
          activeOpacity={0.85}
        >
          <View style={styles.nextTopicLeft}>
            <Text style={styles.nextTopicSub}>NEXT MODULE</Text>
            <Text style={styles.nextTopicTitle}>{nextTopic.title}</Text>
            <Text style={styles.nextTopicTime}>⏱️ {nextTopic.readTime}</Text>
          </View>
          <View style={styles.nextTopicIconWrap}>
            <Text style={styles.nextTopicIcon}>{nextTopic.icon}</Text>
          </View>
        </TouchableOpacity>
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
  headerTitleGroup: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonText: {
    fontSize: 16,
  },

  // Hero Card
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  heroIconBox: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: {
    fontSize: 28,
  },
  heroBadgeGroup: {
    alignItems: 'flex-end',
    gap: 4,
  },
  threatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  threatBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
  },
  heroReadTime: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  heroTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  heroSummary: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Generic Section Card
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sectionIcon: {
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  sectionSubtext: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  paragraphText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Steps Timeline
  stepsTimeline: {
    gap: Spacing.sm,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
  },
  stepNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },

  // Red Flags
  redFlagsList: {
    gap: Spacing.xs,
  },
  redFlagRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.danger,
  },
  redFlagDot: {
    fontSize: 12,
    color: Colors.danger,
    marginRight: 6,
    lineHeight: 16,
    fontWeight: FontWeight.bold,
  },
  redFlagText: {
    flex: 1,
    fontSize: 11,
    color: '#7F1D1D',
    lineHeight: 16,
  },

  // Golden Rules
  rulesList: {
    gap: Spacing.xs,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
  },
  ruleCheck: {
    fontSize: 13,
    color: Colors.secondary,
    marginRight: 6,
    lineHeight: 16,
    fontWeight: FontWeight.bold,
  },
  ruleText: {
    flex: 1,
    fontSize: 11,
    color: '#14532D',
    lineHeight: 16,
    fontWeight: FontWeight.medium,
  },

  // Case Study Card
  caseStudyCard: {
    backgroundColor: '#0F172A',
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  caseStudyHeader: {
    marginBottom: Spacing.sm,
  },
  caseStudyBadge: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: '#38BDF8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  caseStudyTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#F8FAFC',
  },
  scenarioBlock: {
    backgroundColor: '#1E293B',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  scenarioLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  scenarioText: {
    fontSize: 11,
    color: '#E2E8F0',
    lineHeight: 17,
    fontStyle: 'italic',
  },
  takeawayBlock: {
    backgroundColor: '#064E3B',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: '#34D399',
  },
  takeawayLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: '#6EE7B7',
    marginBottom: 2,
  },
  takeawayText: {
    fontSize: 11,
    color: '#A7F3D0',
    lineHeight: 16,
  },

  // Response List
  responseList: {
    gap: Spacing.xs,
  },
  responseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  responseNumberBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  responseNumberText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  responseText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },

  // Learned Button
  learnedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  learnedBtnActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  learnedBtnIcon: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: FontWeight.bold,
  },
  learnedBtnIconActive: {
    color: '#15803D',
  },
  learnedBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  learnedBtnTextActive: {
    color: '#15803D',
  },

  // Next Topic Card
  nextTopicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
  },
  nextTopicLeft: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  nextTopicSub: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  nextTopicTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  nextTopicTime: {
    fontSize: 10,
    color: Colors.textTertiary,
  },
  nextTopicIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextTopicIcon: {
    fontSize: 22,
  },
});
