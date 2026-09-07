/**
 * HomeScreen — ScamShield AI Dashboard
 *
 * Sections:
 *  1. App Header  — Brand title + tagline + protection status pill
 *  2. Stats Row   — Scans Today / Threats Found / Protected
 *  3. Feature Cards — Message Scanner, Screenshot Scanner, URL Checker, Email Analyzer
 *  4. Recent Scans  — Last 3 scan results with status badges
 *  5. Safety Tips   — Rotating tip cards
 */
import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import SafeScreen from '../components/common/SafeScreen';
import StatusBadge from '../components/common/StatusBadge';
import { Colors, Spacing } from '../theme';
import { BorderRadius } from '../theme/spacing';
import { FontSize, FontWeight } from '../theme/typography';
import { STACKS, TABS } from '../constants/routes';
import { BottomTabParamList } from '../navigation/BottomTabNavigator';
import { getScanHistory, ScanHistoryItem } from '../services/scanHistory';

type HomeNavProp = BottomTabNavigationProp<BottomTabParamList>;

// ─── Data ────────────────────────────────────────────────────────────────────

const FEATURE_CARDS = [
  {
    id: 'msg',
    icon: '💬',
    title: 'Message\nScanner',
    description: 'Detect scams in SMS & chat messages',
    accent: Colors.primary,
    accentLight: Colors.primaryLight,
  },
  {
    id: 'screenshot',
    icon: '🖼️',
    title: 'Screenshot\nScanner',
    description: 'Analyse images for fraudulent content',
    accent: '#7C3AED',
    accentLight: '#EDE9FE',
  },
  {
    id: 'url',
    icon: '🔗',
    title: 'URL\nChecker',
    description: 'Verify links before you click them',
    accent: '#0891B2',
    accentLight: '#CFFAFE',
  },
  {
    id: 'email',
    icon: '📧',
    title: 'Email\nAnalyzer',
    description: 'Spot phishing & spoofed emails',
    accent: '#D97706',
    accentLight: '#FEF3C7',
  },
];

const RECENT_SCANS = [
  {
    id: '1',
    icon: '🔗',
    category: 'URL Check',
    value: 'http://suspicious-link.xyz/claim',
    status: 'danger' as const,
    label: 'Dangerous',
    time: '2 min ago',
  },
  {
    id: '2',
    icon: '💬',
    category: 'WhatsApp Message',
    value: '"You won a lottery! Click here to claim..."',
    status: 'warning' as const,
    label: 'Suspicious',
    time: '15 min ago',
  },
  {
    id: '3',
    icon: '📧',
    category: 'Email',
    value: 'Your account statement is ready — HDFC Bank',
    status: 'safe' as const,
    label: 'Safe',
    time: '1 hr ago',
  },
];

const SAFETY_TIPS = [
  {
    id: '1',
    icon: '🚫',
    tip: 'Never share your OTP, PIN, or CVV with anyone — banks never ask for these.',
  },
  {
    id: '2',
    icon: '🔍',
    tip: 'Always verify a URL\'s domain before entering personal information.',
  },
  {
    id: '3',
    icon: '📞',
    tip: 'Scammers often impersonate government agencies. Hang up and call back on the official number.',
  },
  {
    id: '4',
    icon: '⚠️',
    tip: '"Too good to be true" prize messages are almost always scams. Don\'t click suspicious links.',
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ value, label, valueColor }: { value: string; label: string; valueColor?: string }) {
  return (
    <View style={statStyles.card}>
      <Text style={[statStyles.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function FeatureCard({
  icon, title, description, accent, accentLight, onPress,
}: (typeof FEATURE_CARDS)[0] & { onPress: () => void }) {
  return (
    <TouchableOpacity style={featureStyles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[featureStyles.iconWrap, { backgroundColor: accentLight }]}>
        <Text style={featureStyles.icon}>{icon}</Text>
      </View>
      <Text style={[featureStyles.title, { color: accent }]}>{title}</Text>
      <Text style={featureStyles.description}>{description}</Text>
      <View style={[featureStyles.arrow, { backgroundColor: accent }]}>
        <Text style={featureStyles.arrowText}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

function ScanRow({
  item,
  onPress,
}: {
  item: (typeof RECENT_SCANS)[0] & { targetScreen?: string; resultPayload?: any };
  onPress?: () => void;
}) {
  const leftBorderColor =
    item.status === 'danger' ? Colors.danger :
    item.status === 'warning' ? Colors.warning :
    Colors.secondary;

  return (
    <TouchableOpacity
      style={[scanStyles.row, { borderLeftColor: leftBorderColor }]}
      onPress={onPress}
      activeOpacity={0.75}
      disabled={!onPress}
    >
      <View style={scanStyles.iconAvatar}>
        <Text style={scanStyles.iconAvatarText}>{item.icon}</Text>
      </View>
      <View style={scanStyles.textBlock}>
        <Text style={scanStyles.category}>{item.category}</Text>
        <Text style={scanStyles.value} numberOfLines={1}>{item.value}</Text>
        <Text style={scanStyles.time}>{item.time}</Text>
      </View>
      <StatusBadge variant={item.status} label={item.label} />
    </TouchableOpacity>
  );
}

function TipCard({ item, isActive }: { item: (typeof SAFETY_TIPS)[0]; isActive: boolean }) {
  return (
    <View style={[tipStyles.card, isActive && tipStyles.cardActive]}>
      <Text style={tipStyles.tipIcon}>{item.icon}</Text>
      <Text style={tipStyles.tipText}>{item.tip}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [activeTip, setActiveTip] = useState(0);
  const [savedScans, setSavedScans] = useState<ScanHistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    const scans = await getScanHistory();
    setSavedScans(scans);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, [loadDashboard]);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadDashboard);
    loadDashboard();
    return unsubscribe;
  }, [navigation, loadDashboard]);

  const today = new Date().toISOString().slice(0, 10);
  const todayScans = savedScans.filter((scan) => scan.date === today);
  const scansToday = todayScans.length;
  const threatsToday = todayScans.filter((scan) => scan.status === 'danger').length;
  const safeRate = scansToday > 0
    ? Math.round((todayScans.filter((scan) => scan.status === 'safe').length / scansToday) * 100)
    : 0;
  const recentScans = savedScans.slice(0, 4).map((scan) => ({
    id: scan.id,
    icon: scan.typeIcon,
    category: scan.typeLabel,
    value: scan.title,
    status: scan.status,
    label: scan.statusLabel,
    time: scan.timestamp,
    targetScreen: scan.targetScreen,
    resultPayload: scan.resultPayload,
  }));

  return (
    <SafeScreen backgroundColor={Colors.background}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >

        {/* ── 1. App Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.brandRow}>
              <Text style={styles.brandIcon}>🛡️</Text>
              <View>
                <Text style={styles.brandName}>ScamShield AI</Text>
                <Text style={styles.brandTagline}>Your AI-powered scam defence</Text>
              </View>
            </View>
            <View style={styles.protectedPill}>
              <View style={styles.protectedDot} />
              <Text style={styles.protectedText}>Protected</Text>
            </View>
          </View>

          <View style={styles.heroBanner}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroTitle}>Stay one step{'\n'}ahead of scammers.</Text>
              <Text style={styles.heroSub}>
                Scan messages, links & emails instantly with AI.
              </Text>
            </View>
            <Text style={styles.heroEmoji}>🤖</Text>
          </View>
        </View>

        {/* ── 2. Stats Row ── */}
        <View style={styles.statsRow}>
          <StatCard value={String(scansToday)} label="Scans Today" />
          <View style={styles.statDivider} />
          <StatCard value={String(threatsToday)} label="Threats Found" valueColor={Colors.danger} />
          <View style={styles.statDivider} />
          <StatCard value={`${safeRate}%`} label="Safe Rate" valueColor={Colors.secondary} />
        </View>

        {/* ── 3. Feature Cards ── */}
        <TouchableOpacity
          style={autoShieldStyles.banner}
          activeOpacity={0.85}
          onPress={() => navigation.navigate(STACKS.AUTO_SHIELD as any)}
        >
          <View style={autoShieldStyles.left}>
            <Text style={autoShieldStyles.icon}>🛡️</Text>
            <View>
              <Text style={autoShieldStyles.title}>Auto Message Shield Active</Text>
              <Text style={autoShieldStyles.sub}>
                Monitoring incoming SMS & WhatsApp for scams
              </Text>
            </View>
          </View>
          <Text style={autoShieldStyles.chevron}>›</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Scan Tools</Text>
          <Text style={styles.sectionSub}>Choose what to analyse</Text>
        </View>

        <View style={styles.featureGrid}>
          {FEATURE_CARDS.map((card) => (
            <FeatureCard
              key={card.id}
              {...card}
              onPress={() => {
                if (card.id === 'msg') {
                  navigation.navigate(STACKS.MESSAGE_SCANNER as any);
                } else if (card.id === 'screenshot') {
                  navigation.navigate(STACKS.SCREENSHOT_SCANNER as any);
                } else if (card.id === 'url') {
                  navigation.navigate(STACKS.URL_CHECKER as any);
                } else if (card.id === 'email') {
                  navigation.navigate(STACKS.EMAIL_ANALYZER as any);
                } else {
                  navigation.navigate(TABS.SCAN);
                }
              }}
            />
          ))}
        </View>

        {/* ── 4. Recent Scans ── */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Recent Scans</Text>
            <Text style={styles.sectionSub}>Your latest analysis results</Text>
          </View>
          <TouchableOpacity
            style={styles.seeAllBtn}
            onPress={() => navigation.navigate(TABS.HISTORY)}
          >
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        {recentScans.length === 0 ? (
          <View style={styles.emptyScansBox}>
            <Text style={styles.emptyScansIcon}>🛡️</Text>
            <Text style={styles.emptyScansTitle}>No scans yet today</Text>
            <Text style={styles.emptyScansSub}>
              Use the tools below to inspect any link, message, or email in real time.
            </Text>
          </View>
        ) : (
          <View style={styles.scanList}>
            {recentScans.map((item: any) => (
              <ScanRow
                key={item.id}
                item={item}
                onPress={() => {
                  if (item.targetScreen && item.resultPayload) {
                    navigation.navigate(item.targetScreen, { result: item.resultPayload });
                  } else {
                    navigation.navigate(TABS.HISTORY);
                  }
                }}
              />
            ))}
          </View>
        )}

        {/* ── 5. Safety Tips & Education Hub ── */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Safety Tips & Guides</Text>
            <Text style={styles.sectionSub}>Daily habits & anti-fraud defense</Text>
          </View>
          <TouchableOpacity
            style={styles.seeAllBtn}
            onPress={() => navigation.navigate(STACKS.SAFETY_EDUCATION as any)}
          >
            <Text style={styles.seeAllText}>See all guides</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tipsContainer}>
          <TipCard item={SAFETY_TIPS[activeTip]} isActive />
          {/* Dot indicators */}
          <View style={styles.tipDots}>
            {SAFETY_TIPS.map((_, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.tipDot, i === activeTip && styles.tipDotActive]}
                onPress={() => setActiveTip(i)}
              />
            ))}
          </View>
          {/* Prev / Next */}
          <View style={styles.tipNav}>
            <TouchableOpacity
              style={[styles.tipNavBtn, activeTip === 0 && styles.tipNavBtnDisabled]}
              onPress={() => setActiveTip((p) => Math.max(0, p - 1))}
              disabled={activeTip === 0}
            >
              <Text style={styles.tipNavText}>‹ Prev</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tipNavBtn, activeTip === SAFETY_TIPS.length - 1 && styles.tipNavBtnDisabled]}
              onPress={() => setActiveTip((p) => Math.min(SAFETY_TIPS.length - 1, p + 1))}
              disabled={activeTip === SAFETY_TIPS.length - 1}
            >
              <Text style={styles.tipNavText}>Next ›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 6. Safety Academy Banner ── */}
        <TouchableOpacity
          style={styles.academyBanner}
          activeOpacity={0.85}
          onPress={() => navigation.navigate(STACKS.SAFETY_EDUCATION as any)}
        >
          <View style={styles.academyIconBox}>
            <Text style={styles.academyIcon}>🎓</Text>
          </View>
          <View style={styles.academyTextBox}>
            <View style={styles.academyBadgeRow}>
              <Text style={styles.academyBadge}>6 DEFENSE GUIDES</Text>
            </View>
            <Text style={styles.academyTitle}>ScamShield Safety Academy</Text>
            <Text style={styles.academySub}>
              Learn how to identify Phishing, Impersonation, OTP theft, and Malicious Links.
            </Text>
          </View>
          <View style={styles.academyArrowBox}>
            <Text style={styles.academyArrow}>›</Text>
          </View>
        </TouchableOpacity>

        {/* Bottom padding */}
        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  // ── Header ──
  header: {
    backgroundColor: Colors.primary,
    paddingTop: Spacing.base,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: Spacing.base,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  brandIcon: { fontSize: 28 },
  brandName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  brandTagline: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  protectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.22)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  protectedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#34D399',
  },
  protectedText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: '#6EE7B7',
  },
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  heroLeft: { flex: 1 },
  heroTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.extrabold,
    color: '#FFFFFF',
    lineHeight: 32,
    marginBottom: 8,
  },
  heroSub: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 19,
  },
  heroEmoji: { fontSize: 56, marginLeft: Spacing.sm },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.base,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },

  // ── Sections ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  sectionSub: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  seeAllBtn: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  seeAllText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },

  // ── Feature Grid ──
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },

  // ── Scan List ──
  scanList: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyScansBox: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  emptyScansIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  emptyScansTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  emptyScansSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },

  // ── Tips ──
  tipsContainer: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  tipDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  tipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  tipDotActive: {
    backgroundColor: Colors.primary,
    width: 20,
  },
  tipNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tipNavBtn: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.full,
  },
  tipNavBtnDisabled: {
    backgroundColor: Colors.surfaceSecondary,
  },
  tipNavText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },

  // ── Academy Banner ──
  academyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: Spacing.sm,
  },
  academyIconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  academyIcon: {
    fontSize: 22,
  },
  academyTextBox: {
    flex: 1,
  },
  academyBadgeRow: {
    marginBottom: 2,
  },
  academyBadge: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: '#38BDF8',
    letterSpacing: 0.5,
  },
  academyTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#F8FAFC',
    marginBottom: 2,
  },
  academySub: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 15,
  },
  academyArrowBox: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  academyArrow: {
    fontSize: 16,
    fontWeight: FontWeight.bold,
    color: '#38BDF8',
    marginTop: -2,
  },

  bottomPad: { height: Spacing['2xl'] },
});

// ── Stat card styles ──
const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  value: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
});

// ── Feature card styles ──
const featureStyles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  icon: { fontSize: 22 },
  title: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    lineHeight: 20,
    marginBottom: 4,
  },
  description: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginBottom: Spacing.sm,
  },
  arrow: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  arrowText: {
    fontSize: FontSize.lg,
    color: '#FFFFFF',
    lineHeight: 22,
    fontWeight: FontWeight.bold,
  },
});

// ── Scan row styles ──
const scanStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
  },
  iconAvatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  iconAvatarText: { fontSize: 20 },
  textBlock: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  category: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  value: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 3,
  },
  time: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
});

// ── Tip card styles ──
const tipStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    minHeight: 90,
  },
  cardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  tipIcon: { fontSize: 28, marginTop: 2 },
  tipText: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    lineHeight: 22,
    fontWeight: FontWeight.medium,
  },
});

// ── Auto Shield banner styles ──
const autoShieldStyles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: BorderRadius.lg,
    paddingVertical: 12,
    paddingHorizontal: Spacing.base,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 22,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#15803D',
  },
  sub: {
    fontSize: FontSize.xs,
    color: '#166534',
    marginTop: 1,
  },
  chevron: {
    fontSize: 22,
    color: '#15803D',
    fontWeight: FontWeight.bold,
  },
});
