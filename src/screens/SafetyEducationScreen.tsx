/**
 * SafetyEducationScreen — Educational Hub for ScamShield AI.
 * Displays interactive learning modules covering:
 *  - Phishing (Email, SMS & Web)
 *  - Authority & Brand Impersonation
 *  - Advance-Fee & Work-From-Home Scams
 *  - OTP & Password Safety
 *  - Suspicious Links & Malicious URLs
 *  - How to Verify a Company & Sender
 */
import React, { useState, useMemo } from 'react';
import {
  Alert,
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
import { SAFETY_TOPICS, SafetyTopic } from '../data/safetyTopics';
import { STACKS } from '../constants/routes';

export default function SafetyEducationScreen() {
  const navigation = useNavigation<any>();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const set = new Set(SAFETY_TOPICS.map((t) => t.category));
    return ['all', ...Array.from(set)];
  }, []);

  const filteredTopics = useMemo(() => {
    return SAFETY_TOPICS.filter((topic) => {
      if (selectedCategory !== 'all' && topic.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchTitle = topic.title.toLowerCase().includes(q);
        const matchSummary = topic.summary.toLowerCase().includes(q);
        const matchCategory = topic.category.toLowerCase().includes(q);
        if (!matchTitle && !matchSummary && !matchCategory) {
          return false;
        }
      }
      return true;
    });
  }, [searchQuery, selectedCategory]);

  const featuredTopic = SAFETY_TOPICS[3]; // OTP Safety as featured

  const handleOpenTopic = (topic: SafetyTopic) => {
    navigation.navigate(STACKS.SAFETY_TOPIC_DETAIL as any, { topicId: topic.id });
  };

  return (
    <SafeScreen backgroundColor={Colors.background}>
      {/* ── Custom Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Safety Education</Text>
          <Text style={styles.headerSub}>Anti-fraud guides & defense playbooks</Text>
        </View>
        <View style={styles.backSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Featured Masterclass Banner ── */}
        <TouchableOpacity
          style={styles.featuredCard}
          activeOpacity={0.85}
          onPress={() => handleOpenTopic(featuredTopic)}
        >
          <View style={styles.featuredBadgeRow}>
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>⭐ FEATURED GUIDE</Text>
            </View>
            <Text style={styles.featuredReadTime}>⏱️ {featuredTopic.readTime}</Text>
          </View>

          <View style={styles.featuredContentRow}>
            <View style={styles.featuredTextBox}>
              <Text style={styles.featuredTitle}>{featuredTopic.title}</Text>
              <Text style={styles.featuredSummary} numberOfLines={2}>
                {featuredTopic.summary}
              </Text>
            </View>
            <View style={styles.featuredIconWrap}>
              <Text style={styles.featuredIcon}>{featuredTopic.icon}</Text>
            </View>
          </View>

          <View style={styles.featuredFooter}>
            <Text style={styles.featuredActionText}>Read Complete Masterclass</Text>
            <Text style={styles.featuredActionArrow}>→</Text>
          </View>
        </TouchableOpacity>

        {/* ── 2. Search Box ── */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search topics (e.g. OTP, Links, Impersonation)..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
              <Text style={styles.searchClearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── 3. Category Filter Chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                selectedCategory === cat && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat && styles.categoryChipTextActive,
                ]}
              >
                {cat === 'all' ? 'All Guides (6)' : cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── 4. Topics List Header ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Essential Cyber Defense Modules</Text>
          <Text style={styles.sectionCount}>{filteredTopics.length} Topics</Text>
        </View>

        {/* ── 5. Topics Cards List ── */}
        {filteredTopics.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyTitle}>No topics matched</Text>
            <Text style={styles.emptySub}>
              Try searching with another keyword or reset the category filter.
            </Text>
            <TouchableOpacity
              style={styles.emptyResetBtn}
              onPress={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
            >
              <Text style={styles.emptyResetBtnText}>Reset Search</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.topicsGrid}>
            {filteredTopics.map((topic, index) => (
              <TouchableOpacity
                key={topic.id}
                style={styles.topicCard}
                activeOpacity={0.8}
                onPress={() => handleOpenTopic(topic)}
              >
                {/* Card Top: Icon & Category */}
                <View style={styles.cardTopRow}>
                  <View style={styles.topicIconBox}>
                    <Text style={styles.topicIcon}>{topic.icon}</Text>
                  </View>

                  <View style={styles.cardBadgeGroup}>
                    <View
                      style={[
                        styles.threatBadge,
                        { backgroundColor: topic.threatBg },
                      ]}
                    >
                      <Text style={[styles.threatBadgeText, { color: topic.threatColor }]}>
                        {topic.threatLevel}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Title & Summary */}
                <Text style={styles.topicTitle}>{topic.title}</Text>
                <Text style={styles.topicCategory}>{topic.category}</Text>
                <Text style={styles.topicSummary} numberOfLines={3}>
                  {topic.summary}
                </Text>

                {/* Card Footer: Read Time & Action */}
                <View style={styles.cardFooter}>
                  <Text style={styles.readTimeText}>⏱️ {topic.readTime}</Text>
                  <View style={styles.readGuideBtn}>
                    <Text style={styles.readGuideText}>Open Guide</Text>
                    <Text style={styles.readGuideArrow}>›</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── 6. Emergency Resource Box ── */}
        <View style={styles.emergencyCard}>
          <View style={styles.emergencyHeader}>
            <Text style={styles.emergencyIcon}>🚨</Text>
            <View style={styles.emergencyTextGroup}>
              <Text style={styles.emergencyTitle}>National Cyber Helplines (India)</Text>
              <Text style={styles.emergencySub}>
                Save these emergency numbers for rapid incident response
              </Text>
            </View>
          </View>

          <View style={styles.helplineRow}>
            <TouchableOpacity
              style={styles.helplineBtn}
              activeOpacity={0.75}
              onPress={() => {
                Alert.alert(
                  '1930 — National Cyber Crime Helpline',
                  'In India, call 1930 immediately if financial cyber fraud occurs. Filing within the golden hour helps freeze inter-bank money routing.',
                  [{ text: 'OK' }]
                );
              }}
            >
              <Text style={styles.helplineBtnNumber}>📞 1930</Text>
              <Text style={styles.helplineBtnDesc}>Financial Fraud Helpline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.helplineBtn}
              activeOpacity={0.75}
              onPress={() => {
                Alert.alert(
                  '1909 — Telecom Spam Registry (TRAI)',
                  'Forward fraudulent SMS to 1909 to register a Do-Not-Disturb (DND) telecom complaint and block malicious sender routes.',
                  [{ text: 'OK' }]
                );
              }}
            >
              <Text style={styles.helplineBtnNumber}>✉️ 1909</Text>
              <Text style={styles.helplineBtnDesc}>Telecom Spam DND</Text>
            </TouchableOpacity>
          </View>
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
  headerTitleGroup: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  backSpacer: {
    width: 40,
  },

  // Featured Card
  featuredCard: {
    backgroundColor: '#0F172A',
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  featuredBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  featuredBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  featuredBadgeText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  featuredReadTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  featuredContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  featuredTextBox: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  featuredTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#F8FAFC',
    marginBottom: 4,
  },
  featuredSummary: {
    fontSize: FontSize.xs,
    color: '#94A3B8',
    lineHeight: 18,
  },
  featuredIconWrap: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredIcon: {
    fontSize: 26,
  },
  featuredFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  featuredActionText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#60A5FA',
  },
  featuredActionArrow: {
    fontSize: 14,
    fontWeight: FontWeight.bold,
    color: '#60A5FA',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    height: 44,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  searchClearBtn: {
    padding: 4,
  },
  searchClearText: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: FontWeight.bold,
  },

  // Categories Scroll
  categoryScroll: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    paddingVertical: 2,
  },
  categoryChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  categoryChipText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: FontWeight.bold,
  },

  // Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },

  // Topics Grid
  topicsGrid: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  topicCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  topicIconBox: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicIcon: {
    fontSize: 22,
  },
  cardBadgeGroup: {
    flexDirection: 'row',
    gap: 6,
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
  topicTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  topicCategory: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  topicSummary: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  readTimeText: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  readGuideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  readGuideText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  readGuideArrow: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
    lineHeight: 16,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  emptySub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  emptyResetBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  emptyResetBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
  },

  // Emergency Card
  emergencyCard: {
    backgroundColor: '#0F172A',
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  emergencyIcon: {
    fontSize: 22,
  },
  emergencyTextGroup: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#F8FAFC',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emergencySub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  helplineRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  helplineBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  helplineBtnNumber: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#38BDF8',
    marginBottom: 2,
  },
  helplineBtnDesc: {
    fontSize: 9,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
