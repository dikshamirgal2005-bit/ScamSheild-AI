/**
 * HistoryScreen — Scan History screen for ScamShield AI.
 * Displays previously analyzed messages, URLs, screenshots, and emails using rich demo data.
 * Supports:
 *  - Filter by Scan Type (All, Messages, URLs, Screenshots, Emails)
 *  - Filter by Risk Level (All, High Risk, Suspicious, Safe)
 *  - Real-time search by keyword, domain, or sender
 *  - Summary stats bar (Total Scans, High Risk, Suspicious, Safe)
 *  - Tapping any scan opens the full detailed result report
 *  - Simulated Clear / Export actions
 */
import React, { useState, useMemo, useCallback } from 'react';
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
import { STACKS, TABS } from '../constants/routes';
import { getScanHistory, clearScanHistory as clearStoredScanHistory } from '../services/scanHistory';

type ScanType = 'all' | 'message' | 'url' | 'screenshot' | 'email';
type RiskFilter = 'all' | 'danger' | 'warning' | 'safe';

interface HistoryItem {
  id: string;
  type: 'message' | 'url' | 'screenshot' | 'email';
  typeLabel: string;
  typeIcon: string;
  title: string;
  snippet: string;
  riskScore: number;
  status: 'danger' | 'warning' | 'safe';
  statusLabel: string;
  category: string;
  timestamp: string;
  date: string;
  // Detail payload to pass to result screens
  resultPayload: any;
  targetScreen: string;
}

const DEMO_HISTORY_ITEMS: HistoryItem[] = [
  {
    id: 'scan-001',
    type: 'message',
    typeLabel: 'Message Scan',
    typeIcon: '💬',
    title: 'HDFC NetBanking KYC Suspension Notice',
    snippet: 'Dear Customer, Your HDFC NetBanking is blocked due to incomplete KYC. Update immediately at http://hdfc-kyc-secure-auth.xyz/login to avoid permanent deactivation.',
    riskScore: 87,
    status: 'danger',
    statusLabel: 'High Risk',
    category: 'Banking Scam',
    timestamp: 'Today, 11:42 AM',
    date: '2026-09-05',
    targetScreen: STACKS.MESSAGE_ANALYSIS_RESULT,
    resultPayload: {
      riskScore: 87,
      status: 'danger',
      statusLabel: 'High Risk',
      verdict: 'Urgent Phishing Attempt',
      scamType: 'Banking Scam',
      probability: 87,
      reason: 'Contains urgent deactivation threats and requests for immediate credential updates on an unverified domain.',
      indicators: [
        'Urgent call-to-action ("Account blocked within 24 hours")',
        'Direct request for sensitive bank credentials and OTP',
        'Uses an unofficial lookalike domain (.xyz)',
      ],
      recommendations: [
        'Do not click the link or provide credentials.',
        'Report incident to official bank helpline.',
        'Block sender and forward SMS to 1909.',
      ],
    },
  },
  {
    id: 'scan-002',
    type: 'url',
    typeLabel: 'URL Checker',
    typeIcon: '🔗',
    title: 'http://secure-hdfc-update.xyz/login',
    snippet: 'Flagged on 4 phishing threat intelligence feeds. Insecure HTTP protocol with self-signed certificate registered 3 days ago.',
    riskScore: 94,
    status: 'danger',
    statusLabel: 'Malicious',
    category: 'Phishing Domain',
    timestamp: 'Today, 09:15 AM',
    date: '2026-09-05',
    targetScreen: STACKS.URL_ANALYSIS_RESULT,
    resultPayload: {
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
      ],
    },
  },
  {
    id: 'scan-003',
    type: 'email',
    typeLabel: 'Email Analyzer',
    typeIcon: '📧',
    title: 'security@paypal-service-alert.xyz',
    snippet: 'Subject: Action Required: Your Account Has Been Temporarily Limited. Includes suspicious executable attachment "Invoice_102.pdf.exe".',
    riskScore: 92,
    status: 'danger',
    statusLabel: 'High Risk',
    category: 'Credential Phishing',
    timestamp: 'Yesterday, 04:30 PM',
    date: '2026-09-04',
    targetScreen: STACKS.EMAIL_ANALYSIS_RESULT,
    resultPayload: {
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
        'Report the email as phishing to abuse@paypal.com.',
        'Block the sender address immediately.',
      ],
    },
  },
  {
    id: 'scan-004',
    type: 'screenshot',
    typeLabel: 'Screenshot Scanner',
    typeIcon: '📸',
    title: 'Screenshot_Paytm_Transfer_₹15000.png',
    snippet: 'Simulated UPI transfer receipt showing visual font misalignment, inconsistent kerning, and forged bank reference number (UTR).',
    riskScore: 89,
    status: 'danger',
    statusLabel: 'High Risk',
    category: 'Payment Forgery',
    timestamp: 'Yesterday, 01:20 PM',
    date: '2026-09-04',
    targetScreen: STACKS.MESSAGE_ANALYSIS_RESULT,
    resultPayload: {
      riskScore: 89,
      status: 'danger',
      statusLabel: 'High Risk',
      verdict: 'Counterfeit Payment Confirmation',
      scamType: 'Banking Scam',
      probability: 89,
      reason: 'Visual inspection reveals manipulated transaction timestamps, artificial font weights, and an invalid UPI transaction reference code.',
      indicators: [
        'Font mismatch in amount figures and recipient name',
        'Invalid 12-digit UTR checksum structure',
        'Missing standard payment gateway digital timestamp watermark',
      ],
      recommendations: [
        'Verify bank balance directly in your official banking app.',
        'Do not hand over goods or deliver services based on screenshots.',
        'Report counterfeit transaction proof to police cybercell.',
      ],
    },
  },
  {
    id: 'scan-005',
    type: 'message',
    typeLabel: 'Message Scan',
    typeIcon: '💬',
    title: 'Telegram Part-Time Work-From-Home Offer',
    snippet: 'Congratulations! Earn ₹5,000 daily by liking YouTube videos and rating hotels. Contact HR on Telegram @EarnFastDaily. Instant payout guaranteed.',
    riskScore: 64,
    status: 'warning',
    statusLabel: 'Suspicious',
    category: 'Job Scam',
    timestamp: 'Sep 3, 2026, 06:10 PM',
    date: '2026-09-03',
    targetScreen: STACKS.MESSAGE_ANALYSIS_RESULT,
    resultPayload: {
      riskScore: 64,
      status: 'warning',
      statusLabel: 'Suspicious',
      verdict: 'Unverified Employment Offer',
      scamType: 'Job Scam',
      probability: 64,
      reason: 'Offers unrealistic high daily compensation for minimal tasks and redirects to anonymous Telegram chat channels.',
      indicators: [
        'Unrealistic daily income claim (₹5,000/day for liking videos)',
        'Redirects to unmonitored messaging app handle (@EarnFastDaily)',
        'No verified company registration details or interview process',
      ],
      recommendations: [
        'Never pay advance registration or task processing fees.',
        'Do not join unverified task groups or invest money in prepaid missions.',
        'Block and report the contact.',
      ],
    },
  },
  {
    id: 'scan-006',
    type: 'url',
    typeLabel: 'URL Checker',
    typeIcon: '🔗',
    title: 'https://bit.ly/claim-free-voucher-500',
    snippet: 'Shortened redirect hyperlink masking an unverified e-commerce prize survey domain. Registered 12 days ago with private WHOIS.',
    riskScore: 58,
    status: 'warning',
    statusLabel: 'Suspicious',
    category: 'Shopping Scam',
    timestamp: 'Sep 2, 2026, 08:45 PM',
    date: '2026-09-02',
    targetScreen: STACKS.URL_ANALYSIS_RESULT,
    resultPayload: {
      url: 'https://bit.ly/claim-free-voucher-500',
      status: 'warning',
      statusLabel: 'SUSPICIOUS',
      riskScore: 58,
      verdict: 'Obfuscated Redirect & Prize Survey Domain',
      protocol: 'HTTPS (Encrypted)',
      domainAge: 'Registered 12 days ago',
      sslStatus: 'Valid Let\'s Encrypt Certificate',
      ipReputation: 'Unrated / Low Traffic Score',
      redirects: '1 URL Redirect (bit.ly → survey-win500.top)',
      reason: 'The shortened link disguises a destination domain (.top) hosting an unverified gift voucher claim form requesting personal details.',
      signals: [
        'Uses URL shortener to hide final destination domain',
        'Domain registered recently with privacy shielding',
        'Prompts user to share link to 10 WhatsApp groups before claiming',
      ],
      recommendations: [
        'Avoid sharing personal details, phone numbers, or addresses.',
        'Do not forward prize links to contacts.',
        'Close the browser tab without interacting.',
      ],
    },
  },
  {
    id: 'scan-007',
    type: 'email',
    typeLabel: 'Email Analyzer',
    typeIcon: '📧',
    title: 'payments-noreply@google.com',
    snippet: 'Subject: Your Google Workspace invoice is ready. Valid cryptographic DKIM signature and official corporate billing gateway alignment.',
    riskScore: 12,
    status: 'safe',
    statusLabel: 'Safe',
    category: 'Official Receipt',
    timestamp: 'Sep 1, 2026, 10:00 AM',
    date: '2026-09-01',
    targetScreen: STACKS.EMAIL_ANALYSIS_RESULT,
    resultPayload: {
      sender: 'payments-noreply@google.com',
      subject: 'Your Google Workspace invoice is ready',
      bodySnippet: 'Hello Customer, Your monthly billing statement for Google Workspace is now available in your Admin Console. Amount paid: $12.00...',
      status: 'safe',
      statusLabel: 'LEGITIMATE',
      riskScore: 12,
      verdict: 'Authentic Corporate Communication',
      spfDkim: 'PASSED (Cryptographically Signed)',
      senderReputation: 'Verified Google Workspace Mail Gateway',
      urlRisk: 'Official Google Domain (google.com)',
      attachmentRisk: 'Clean PDF Document (invoice.pdf)',
      reason: 'The email originates from an authenticated enterprise server with passing SPF/DKIM records and links directly to official Google infrastructure.',
      redFlags: [],
      recommendations: [
        'This email is authenticated and safe to view.',
        'Retain billing statement for your business expense records.',
      ],
    },
  },
  {
    id: 'scan-008',
    type: 'message',
    typeLabel: 'Message Scan',
    typeIcon: '💬',
    title: 'Official Transaction OTP from HDFCBK',
    snippet: 'Your OTP for online transaction of ₹450.00 at Swiggy is 482910. Valid for 10 minutes. Do not share OTP with anyone.',
    riskScore: 8,
    status: 'safe',
    statusLabel: 'Safe',
    category: 'Banking OTP',
    timestamp: 'Aug 30, 2026, 01:15 PM',
    date: '2026-08-30',
    targetScreen: STACKS.MESSAGE_ANALYSIS_RESULT,
    resultPayload: {
      riskScore: 8,
      status: 'safe',
      statusLabel: 'Safe',
      verdict: 'Authentic Security Notification',
      scamType: 'Banking Scam',
      probability: 8,
      reason: 'Standard transaction OTP notification originating from a registered telecom header without coercive links or external payment demands.',
      indicators: [
        'Registered telecom enterprise sender header (HDFCBK)',
        'Matches user-initiated transaction context',
        'Standard confidentiality warning included',
      ],
      recommendations: [
        'Enter OTP only on the official payment gateway screen.',
        'Never share the 6-digit code with anyone over phone or chat.',
      ],
    },
  },
];

export default function HistoryScreen() {
  const navigation = useNavigation<any>();

  const [items, setItems] = useState<HistoryItem[]>([]);

  const loadHistory = useCallback(async () => {
    const saved = await getScanHistory();
    setItems(saved as HistoryItem[]);
  }, []);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadHistory);
    loadHistory();
    return unsubscribe;
  }, [navigation, loadHistory]);
  const [selectedType, setSelectedType] = useState<ScanType>('all');
  const [selectedRisk, setSelectedRisk] = useState<RiskFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter items based on active type, risk level, and search keyword
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Type filter
      if (selectedType !== 'all' && item.type !== selectedType) {
        return false;
      }
      // Risk filter
      if (selectedRisk !== 'all' && item.status !== selectedRisk) {
        return false;
      }
      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchSnippet = item.snippet.toLowerCase().includes(q);
        const matchCategory = item.category.toLowerCase().includes(q);
        const matchType = item.typeLabel.toLowerCase().includes(q);
        if (!matchTitle && !matchSnippet && !matchCategory && !matchType) {
          return false;
        }
      }
      return true;
    });
  }, [items, selectedType, selectedRisk, searchQuery]);

  // Summary stats
  const totalCount = items.length;
  const threatCount = items.filter((i) => i.status === 'danger').length;
  const warningCount = items.filter((i) => i.status === 'warning').length;
  const safeCount = items.filter((i) => i.status === 'safe').length;

  const handleOpenDetail = (item: HistoryItem) => {
    navigation.navigate(item.targetScreen, { result: item.resultPayload });
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Scan History',
      'Are you sure you want to permanently clear all scan history from this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearStoredScanHistory();
            setItems([]);
            Alert.alert('History Cleared', 'Your scan history has been cleared.');
          },
        },
      ]
    );
  };

  const handleRefreshHistory = () => {
    loadHistory();
    setSelectedType('all');
    setSelectedRisk('all');
    setSearchQuery('');
  };

  const getStatusBadgeStyle = (status: HistoryItem['status']) => {
    switch (status) {
      case 'danger':
        return { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' };
      case 'warning':
        return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
      case 'safe':
      default:
        return { bg: '#D1FAE5', text: '#059669', border: '#A7F3D0' };
    }
  };

  return (
    <SafeScreen backgroundColor={Colors.background}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Scan History</Text>
          <Text style={styles.headerSub}>Audit archive of inspected items</Text>
        </View>

        <View style={styles.headerActions}>
          {items.length === 0 ? (
            <TouchableOpacity style={styles.restoreBtn} onPress={handleRefreshHistory}>
              <Text style={styles.restoreBtnText}>↺ Refresh</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={handleClearHistory}
              activeOpacity={0.7}
            >
              <Text style={styles.clearBtnText}>🗑️ Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Stats Summary Bar ── */}
        <View style={styles.statsStrip}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalCount}</Text>
            <Text style={styles.statLabel}>Total Scans</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: Colors.danger }]}>{threatCount}</Text>
            <Text style={styles.statLabel}>Threats Found</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: Colors.warning }]}>{warningCount}</Text>
            <Text style={styles.statLabel}>Suspicious</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: Colors.secondary }]}>{safeCount}</Text>
            <Text style={styles.statLabel}>Clean & Safe</Text>
          </View>
        </View>

        {/* ── 2. Search Input ── */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search past scans by name, domain, sender..."
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

        {/* ── 3. Scan Type Filter Tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeFilterScroll}
        >
          <TouchableOpacity
            style={[styles.typeFilterChip, selectedType === 'all' && styles.typeFilterChipActive]}
            onPress={() => setSelectedType('all')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.typeFilterText,
                selectedType === 'all' && styles.typeFilterTextActive,
              ]}
            >
              All Types ({items.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeFilterChip,
              selectedType === 'message' && styles.typeFilterChipActive,
            ]}
            onPress={() => setSelectedType('message')}
            activeOpacity={0.7}
          >
            <Text style={styles.typeFilterIcon}>💬</Text>
            <Text
              style={[
                styles.typeFilterText,
                selectedType === 'message' && styles.typeFilterTextActive,
              ]}
            >
              Messages ({items.filter((i) => i.type === 'message').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeFilterChip, selectedType === 'url' && styles.typeFilterChipActive]}
            onPress={() => setSelectedType('url')}
            activeOpacity={0.7}
          >
            <Text style={styles.typeFilterIcon}>🔗</Text>
            <Text
              style={[
                styles.typeFilterText,
                selectedType === 'url' && styles.typeFilterTextActive,
              ]}
            >
              URLs ({items.filter((i) => i.type === 'url').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeFilterChip,
              selectedType === 'screenshot' && styles.typeFilterChipActive,
            ]}
            onPress={() => setSelectedType('screenshot')}
            activeOpacity={0.7}
          >
            <Text style={styles.typeFilterIcon}>📸</Text>
            <Text
              style={[
                styles.typeFilterText,
                selectedType === 'screenshot' && styles.typeFilterTextActive,
              ]}
            >
              Screenshots ({items.filter((i) => i.type === 'screenshot').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeFilterChip,
              selectedType === 'email' && styles.typeFilterChipActive,
            ]}
            onPress={() => setSelectedType('email')}
            activeOpacity={0.7}
          >
            <Text style={styles.typeFilterIcon}>📧</Text>
            <Text
              style={[
                styles.typeFilterText,
                selectedType === 'email' && styles.typeFilterTextActive,
              ]}
            >
              Emails ({items.filter((i) => i.type === 'email').length})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ── 4. Risk Level Filter Chips ── */}
        <View style={styles.riskFilterRow}>
          <TouchableOpacity
            style={[styles.riskFilterChip, selectedRisk === 'all' && styles.riskFilterChipActive]}
            onPress={() => setSelectedRisk('all')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.riskFilterText,
                selectedRisk === 'all' && styles.riskFilterTextActive,
              ]}
            >
              All Levels
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.riskFilterChip,
              selectedRisk === 'danger' && styles.riskFilterChipDanger,
            ]}
            onPress={() => setSelectedRisk('danger')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.riskFilterText,
                selectedRisk === 'danger' && styles.riskFilterTextDanger,
              ]}
            >
              🔴 High Risk ({items.filter((i) => i.status === 'danger').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.riskFilterChip,
              selectedRisk === 'warning' && styles.riskFilterChipWarning,
            ]}
            onPress={() => setSelectedRisk('warning')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.riskFilterText,
                selectedRisk === 'warning' && styles.riskFilterTextWarning,
              ]}
            >
              🟡 Suspicious ({items.filter((i) => i.status === 'warning').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.riskFilterChip, selectedRisk === 'safe' && styles.riskFilterChipSafe]}
            onPress={() => setSelectedRisk('safe')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.riskFilterText,
                selectedRisk === 'safe' && styles.riskFilterTextSafe,
              ]}
            >
              🟢 Safe ({items.filter((i) => i.status === 'safe').length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── 5. Items List Header ── */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listHeaderTitle}>
            Results ({filteredItems.length})
          </Text>
          {(selectedType !== 'all' || selectedRisk !== 'all' || searchQuery !== '') && (
            <TouchableOpacity
              onPress={() => {
                setSelectedType('all');
                setSelectedRisk('all');
                setSearchQuery('');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.resetFilterText}>Reset Filters</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── 6. Scan Cards List ── */}
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={styles.emptyTitle}>No Scan History</Text>
            <Text style={styles.emptyBody}>
              Your scanned messages, links, screenshots, and emails will be archived here.
            </Text>
            <TouchableOpacity
              style={styles.emptyResetBtn}
              onPress={() => navigation.navigate(TABS.SCAN)}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyResetBtnText}>Start a New Scan</Text>
            </TouchableOpacity>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No matching scans found</Text>
            <Text style={styles.emptyBody}>
              Try searching with different keywords or clearing your active filters.
            </Text>
            <TouchableOpacity
              style={styles.emptyResetBtn}
              onPress={() => {
                setSelectedType('all');
                setSelectedRisk('all');
                setSearchQuery('');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyResetBtnText}>Reset All Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardsList}>
            {filteredItems.map((item) => {
              const badgeStyle = getStatusBadgeStyle(item.status);
              const leftColor =
                item.status === 'danger'
                  ? Colors.danger
                  : item.status === 'warning'
                  ? Colors.warning
                  : Colors.secondary;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.scanCard, { borderLeftColor: leftColor }]}
                  onPress={() => handleOpenDetail(item)}
                  activeOpacity={0.75}
                >
                  {/* Card Top Row: Type & Risk Badge */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.typeBadgeRow}>
                      <View style={styles.typeIconBox}>
                        <Text style={styles.typeIcon}>{item.typeIcon}</Text>
                      </View>
                      <View>
                        <Text style={styles.typeLabel}>{item.typeLabel}</Text>
                        <Text style={styles.timestampText}>{item.timestamp}</Text>
                      </View>
                    </View>

                    <View style={styles.cardScoreGroup}>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: badgeStyle.bg,
                            borderColor: badgeStyle.border,
                          },
                        ]}
                      >
                        <Text style={[styles.statusBadgeText, { color: badgeStyle.text }]}>
                          {item.statusLabel}
                        </Text>
                      </View>
                      <View style={styles.scorePill}>
                        <Text style={[styles.scoreValue, { color: leftColor }]}>
                          {item.riskScore}
                        </Text>
                        <Text style={styles.scoreLabel}>/100</Text>
                      </View>
                    </View>
                  </View>

                  {/* Title & Preview */}
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.cardSnippet} numberOfLines={2}>
                    {item.snippet}
                  </Text>

                  {/* Card Bottom: Category Tag & "View Report →" */}
                  <View style={styles.cardBottomRow}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{item.category}</Text>
                    </View>

                    <View style={styles.openReportLink}>
                      <Text style={styles.openReportText}>View Report</Text>
                      <Text style={styles.openReportArrow}>→</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
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
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  headerActions: {
    marginLeft: Spacing.sm,
  },
  clearBtn: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clearBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  restoreBtn: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  restoreBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing['4xl'],
  },

  // Stats Strip
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.borderLight,
  },

  // Search Input
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
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

  // Type Filter Tabs
  typeFilterScroll: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
    paddingVertical: 2,
  },
  typeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  typeFilterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  typeFilterIcon: {
    fontSize: 12,
  },
  typeFilterText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  typeFilterTextActive: {
    color: '#FFFFFF',
    fontWeight: FontWeight.bold,
  },

  // Risk Filter Row
  riskFilterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  riskFilterChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  riskFilterChipActive: {
    backgroundColor: Colors.surfaceSecondary,
    borderColor: Colors.textPrimary,
  },
  riskFilterChipDanger: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  riskFilterChipWarning: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  riskFilterChipSafe: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  riskFilterText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  riskFilterTextActive: {
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
  },
  riskFilterTextDanger: {
    color: '#DC2626',
    fontWeight: FontWeight.bold,
  },
  riskFilterTextWarning: {
    color: '#D97706',
    fontWeight: FontWeight.bold,
  },
  riskFilterTextSafe: {
    color: '#059669',
    fontWeight: FontWeight.bold,
  },

  // List Header
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  listHeaderTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resetFilterText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },

  // Scan Cards
  cardsList: {
    gap: Spacing.md,
  },
  scanCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    padding: Spacing.base,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.xs,
  },
  typeIconBox: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIcon: {
    fontSize: 16,
  },
  typeLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  timestampText: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  cardScoreGroup: {
    alignItems: 'flex-end',
    gap: 3,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extrabold,
  },
  scoreLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
  },

  cardTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  cardSnippet: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },

  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  categoryBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  openReportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openReportText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  openReportArrow: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.md,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  emptyResetBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  emptyResetBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
  },
});

