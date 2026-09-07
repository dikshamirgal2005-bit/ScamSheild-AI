/**
 * MessageAnalysisResultScreen — Detailed breakdown of the message scan result.
 * Features:
 *  - Circular Risk Score Meter
 *  - Dedicated Scam Type Section supporting 9 categories (Banking, Job, Investment,
 *    Shopping, Romance, Lottery, Delivery, Government, Tech Support)
 *  - Psychological Manipulation Detection (Urgency, Fear, Greed, Emotional Pressure,
 *    Secrecy, Authority, Payment Pressure) with confidence indicators
 *  - Explainable AI (Why was this flagged?) with expandable/collapsible factor cards
 *  - Detected Warning Signs
 *  - Recommended Actions
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
import StatusBadge from '../components/common/StatusBadge';
import { Colors, Spacing } from '../theme';
import { BorderRadius } from '../theme/spacing';
import { FontSize, FontWeight } from '../theme/typography';
import { RootStackParamList } from '../navigation/AppNavigator';

type ResultScreenRouteProp = RouteProp<RootStackParamList, 'MessageAnalysisResult'>;

interface AnalysisResult {
  riskScore: number;
  status: 'safe' | 'warning' | 'danger';
  statusLabel: string;
  verdict: string;
  reason: string;
  indicators: string[];
  recommendations: string[];
  scamType: string;
  probability: number;
}

interface XAIFactor {
  id: string;
  icon: string;
  title: string;
  category: string;
  detected: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'safe';
  severityLabel: string;
  snippet?: string;
  explanation: string;
  tactic: string;
}

interface ScamCategoryDetail {
  id: string;
  name: string;
  icon: string;
  tag: string;
  riskLevel: 'Critical' | 'High' | 'Medium';
  matchPercent: number;
  description: string;
  commonSigns: string[];
}

interface PsychologicalTactic {
  id: string;
  name: string;
  icon: string;
  intensity: number; // 0 to 100
  level: 'Critical' | 'High' | 'Moderate' | 'Low' | 'Clean';
  triggerDescription: string;
  detectedPhrase?: string;
}

interface RecommendedSafetyAction {
  id: string;
  icon: string;
  title: string;
  category: string;
  urgency: 'Immediate' | 'Critical' | 'High Priority' | 'Action Required' | 'Standard';
  urgencyColor: string;
  urgencyBg: string;
  description: string;
  steps: string[];
  isDestructiveWarning?: boolean;
}

// Supported 9 Scam Categories with rich educational demo metadata
const ALL_SCAM_CATEGORIES: Record<string, ScamCategoryDetail> = {
  banking: {
    id: 'banking',
    name: 'Banking Scam',
    icon: '🏦',
    tag: 'Financial Fraud',
    riskLevel: 'Critical',
    matchPercent: 94,
    description: 'Impersonates banks, UPI apps, or credit card desks claiming your account is frozen or deactivation is imminent, requesting urgent KYC updates or OTP verification.',
    commonSigns: ['Fake KYC update link', 'Account blocked threat within 24h', 'Unsolicited request for OTP/CVV'],
  },
  job: {
    id: 'job',
    name: 'Job Scam',
    icon: '💼',
    tag: 'Employment Fraud',
    riskLevel: 'High',
    matchPercent: 88,
    description: 'Fraudulent recruiters advertise high-paying part-time tasks or work-from-home positions, demanding upfront registration or training fees before vanishing.',
    commonSigns: ['Unrealistic salary (₹5,000/day)', 'Paid Telegram/WhatsApp task groups', 'Advance registration fee demand'],
  },
  investment: {
    id: 'investment',
    name: 'Investment Scam',
    icon: '📈',
    tag: 'Wealth & Crypto',
    riskLevel: 'Critical',
    matchPercent: 96,
    description: 'Syndicates promise guaranteed high-yield returns through fake crypto trading platforms, insider stock schemes, or multi-level Ponzi programs.',
    commonSigns: ['Guaranteed 200% return in 7 days', 'Zero-risk trading claims', 'Pressure to transfer to private wallets'],
  },
  shopping: {
    id: 'shopping',
    name: 'Shopping Scam',
    icon: '🛍️',
    tag: 'E-Commerce Fraud',
    riskLevel: 'Medium',
    matchPercent: 82,
    description: 'Phony e-commerce websites advertise electronics or luxury goods at impossible 80-90% discounts, taking upfront payments without fulfilling orders.',
    commonSigns: ['90% discount flash sale prices', 'Prepaid payment only (no COD)', 'Unverified lookalike domain name'],
  },
  romance: {
    id: 'romance',
    name: 'Romance Scam',
    icon: '💖',
    tag: 'Social Engineering',
    riskLevel: 'High',
    matchPercent: 85,
    description: 'Scammers establish fake romantic relationships online over weeks, eventually inventing urgent personal emergencies or airport customs duties requiring money transfers.',
    commonSigns: ['Intense affection without meeting in person', 'Refusal to video call', 'Urgent wire transfer or gift card plea'],
  },
  lottery: {
    id: 'lottery',
    name: 'Lottery Scam',
    icon: '🎟️',
    tag: 'Prize & Sweepstakes',
    riskLevel: 'High',
    matchPercent: 92,
    description: 'Bogus notifications declare you have won an unentered international lottery, lucky draw, or car, demanding upfront clearance taxes before releasing the prize.',
    commonSigns: ['You won an unentered lucky draw', 'Advance tax demanded before payout', 'Informal contact number and typos'],
  },
  delivery: {
    id: 'delivery',
    name: 'Delivery Scam',
    icon: '📦',
    tag: 'Logistics Spoofing',
    riskLevel: 'Medium',
    matchPercent: 86,
    description: 'Fake SMS alerts from India Post, FedEx, or DHL claim an incoming package is detained due to an incorrect address, urging you to click a link and pay a redelivery fee.',
    commonSigns: ['Unscheduled parcel delivery warning', 'Demand for ₹25 redelivery fee via link', 'Shortened tracking link to phishing site'],
  },
  government: {
    id: 'government',
    name: 'Government Scam',
    icon: '🏛️',
    tag: 'Coercion & Extortion',
    riskLevel: 'Critical',
    matchPercent: 97,
    description: 'Coerces victims by posing as Police, CBI, Customs, or Income Tax officials, threatening digital arrest warrants unless immediate settlement fines are transferred.',
    commonSigns: ['Digital arrest order threat', 'Fake court warrant or summons', 'Demand for instant online fine transfer'],
  },
  tech_support: {
    id: 'tech_support',
    name: 'Tech Support Scam',
    icon: '💻',
    tag: 'Device Hijacking',
    riskLevel: 'High',
    matchPercent: 90,
    description: 'Deceptive alerts claim your system is infected with viruses or hacked, urging you to dial a toll-free helpline and install remote-control tools like AnyDesk.',
    commonSigns: ['Windows Defender or Apple virus popup', 'Toll-free helpline with urgent countdown', 'Instructions to install AnyDesk/TeamViewer'],
  },
};

// Map arbitrary scamType strings to one of the 9 supported category keys
function resolveScamTypeKey(scamType: string): string {
  const lower = scamType.toLowerCase();
  if (lower.includes('bank') || lower.includes('phish') || lower.includes('account') || lower.includes('kyc')) return 'banking';
  if (lower.includes('job') || lower.includes('work') || lower.includes('career') || lower.includes('employment') || lower.includes('salary')) return 'job';
  if (lower.includes('invest') || lower.includes('crypto') || lower.includes('stock') || lower.includes('bitcoin')) return 'investment';
  if (lower.includes('shop') || lower.includes('discount') || lower.includes('sale') || lower.includes('store')) return 'shopping';
  if (lower.includes('romance') || lower.includes('dating') || lower.includes('love') || lower.includes('relationship')) return 'romance';
  if (lower.includes('lottery') || lower.includes('prize') || lower.includes('reward') || lower.includes('jackpot')) return 'lottery';
  if (lower.includes('delivery') || lower.includes('package') || lower.includes('courier') || lower.includes('parcel')) return 'delivery';
  if (lower.includes('gov') || lower.includes('police') || lower.includes('arrest') || lower.includes('tax') || lower.includes('court') || lower.includes('cbi')) return 'government';
  if (lower.includes('tech') || lower.includes('support') || lower.includes('virus') || lower.includes('defender') || lower.includes('device')) return 'tech_support';
  return 'banking';
}

// Generate the 7 Psychological Manipulation Tactics
function getPsychologicalTactics(result: AnalysisResult): PsychologicalTactic[] {
  const isDanger = result.status === 'danger';
  const isWarning = result.status === 'warning';
  const catKey = resolveScamTypeKey(result.scamType);

  if (!isDanger && !isWarning) {
    // Safe message
    return [
      { id: 'urgency', name: 'Urgency', icon: '⏳', intensity: 4, level: 'Clean', triggerDescription: 'Natural pacing without coercive countdowns.' },
      { id: 'fear', name: 'Fear', icon: '😨', intensity: 2, level: 'Clean', triggerDescription: 'No punitive or threatening language detected.' },
      { id: 'greed', name: 'Greed', icon: '💰', intensity: 5, level: 'Clean', triggerDescription: 'No unrealistic wealth or gift claims.' },
      { id: 'emotional', name: 'Emotional Pressure', icon: '💔', intensity: 3, level: 'Clean', triggerDescription: 'Balanced interpersonal tone.' },
      { id: 'secrecy', name: 'Secrecy', icon: '🤫', intensity: 2, level: 'Clean', triggerDescription: 'Transparent communication.' },
      { id: 'authority', name: 'Authority', icon: '🏛️', intensity: 5, level: 'Clean', triggerDescription: 'No false authority coercion.' },
      { id: 'payment', name: 'Payment Pressure', icon: '💳', intensity: 0, level: 'Clean', triggerDescription: 'Zero unsolicited payment demands.' },
    ];
  }

  // Danger or Warning scenarios with specific tactic weights
  let urgency = 92;
  let fear = 88;
  let greed = 25;
  let emotional = 30;
  let secrecy = 45;
  let authority = 85;
  let payment = 84;

  if (catKey === 'lottery' || catKey === 'investment' || catKey === 'job') {
    greed = 96;
    fear = 30;
    urgency = 88;
    payment = 90;
  } else if (catKey === 'government') {
    fear = 98;
    authority = 97;
    urgency = 94;
    secrecy = 78;
    payment = 89;
    greed = 5;
  } else if (catKey === 'romance') {
    emotional = 95;
    secrecy = 88;
    payment = 84;
    urgency = 72;
    fear = 40;
    greed = 20;
    authority = 15;
  }

  const getLevel = (score: number): PsychologicalTactic['level'] => {
    if (score >= 90) return 'Critical';
    if (score >= 75) return 'High';
    if (score >= 50) return 'Moderate';
    if (score >= 20) return 'Low';
    return 'Clean';
  };

  return [
    {
      id: 'urgency',
      name: 'Urgency',
      icon: '⏳',
      intensity: urgency,
      level: getLevel(urgency),
      triggerDescription: 'Imposes strict artificial deadlines (e.g. 24h) to induce panic and prevent rational verification.',
      detectedPhrase: urgency > 70 ? '"Action required within 24 hours / account blocked"' : undefined,
    },
    {
      id: 'fear',
      name: 'Fear',
      icon: '😨',
      intensity: fear,
      level: getLevel(fear),
      triggerDescription: 'Threatens service suspension, financial loss, or legal arrest if immediate action is not taken.',
      detectedPhrase: fear > 70 ? '"Account permanently deactivated / digital arrest"' : undefined,
    },
    {
      id: 'greed',
      name: 'Greed',
      icon: '💰',
      intensity: greed,
      level: getLevel(greed),
      triggerDescription: 'Lures victims with promises of guaranteed wealth, unearned lottery prizes, or oversized returns.',
      detectedPhrase: greed > 70 ? '"Won ₹25,00,000 / Guaranteed 300% profit"' : undefined,
    },
    {
      id: 'emotional',
      name: 'Emotional Pressure',
      icon: '💔',
      intensity: emotional,
      level: getLevel(emotional),
      triggerDescription: 'Appeals to sympathy, personal crises, or forged emotional connections to cloud judgment.',
      detectedPhrase: emotional > 70 ? '"Emergency customs fee / need urgent help"' : undefined,
    },
    {
      id: 'secrecy',
      name: 'Secrecy',
      icon: '🤫',
      intensity: secrecy,
      level: getLevel(secrecy),
      triggerDescription: 'Instructs the recipient not to discuss the communication with family, bank staff, or advisors.',
      detectedPhrase: secrecy > 60 ? '"Do not share OTP / keep confidential"' : undefined,
    },
    {
      id: 'authority',
      name: 'Authority',
      icon: '🏛️',
      intensity: authority,
      level: getLevel(authority),
      triggerDescription: 'Exploits institutional trust by impersonating law enforcement, tax bureaus, or bank compliance.',
      detectedPhrase: authority > 70 ? '"Official Bank Security Desk / CBI Cyber Dept"' : undefined,
    },
    {
      id: 'payment',
      name: 'Payment Pressure',
      icon: '💳',
      intensity: payment,
      level: getLevel(payment),
      triggerDescription: 'Forces immediate upfront fee transfers, UPI payments, or confidential card credential inputs.',
      detectedPhrase: payment > 70 ? '"Pay clearance charges / enter card OTP now"' : undefined,
    },
  ];
}

// Realistic default demo data if no params are passed
const DEFAULT_DEMO_RESULT: AnalysisResult = {
  riskScore: 87,
  status: 'danger',
  statusLabel: 'High Risk',
  verdict: 'Urgent Phishing Attempt',
  scamType: 'Banking Scam',
  probability: 87,
  reason: 'This message contains high-pressure language claiming account suspension, along with requests for immediate card details verification, which is a classic signature of credential harvesting bank scams.',
  indicators: [
    'Urgent call-to-action ("Account suspended", "Action required today")',
    'Direct request for sensitive bank credentials or card details',
    'Uses an unofficial web link pointing to a compromised domain',
    'Sender masking details look suspicious and do not match official bank headers',
  ],
  recommendations: [
    'Do not click the link or visit the web address mentioned in the message.',
    'Do not reply to this SMS or caller.',
    'Report the incident immediately to your bank\'s customer protection helpline.',
    'Delete this message and block the sender contact.',
  ],
};

// Generates practical safety action items based on demo risk level and scam characteristics
function getRecommendedSafetyActions(result: AnalysisResult): RecommendedSafetyAction[] {
  const isDanger = result.status === 'danger';
  const isWarning = result.status === 'warning';

  if (isDanger) {
    return [
      {
        id: 'no_money',
        icon: '🛑',
        title: 'Do Not Send Money',
        category: 'Financial Defense',
        urgency: 'Immediate',
        urgencyColor: '#DC2626',
        urgencyBg: '#FEE2E2',
        description: 'Never make any payments, transfer funds via UPI/NetBanking, or purchase gift cards requested in this message.',
        steps: [
          'Decline demands for advance registration, clearance fees, or unverified deposits.',
          'Never scan unfamiliar QR codes or send small amounts to "activate" accounts.',
          'Scammers vanish instantly once funds are transferred.',
        ],
        isDestructiveWarning: true,
      },
      {
        id: 'no_otp',
        icon: '🔐',
        title: 'Do Not Share OTP or Password',
        category: 'Credential Security',
        urgency: 'Immediate',
        urgencyColor: '#DC2626',
        urgencyBg: '#FEE2E2',
        description: 'Keep all one-time passwords (OTP), card CVVs, UPI PINs, and account passwords strictly confidential.',
        steps: [
          'Official bank personnel and authorities NEVER ask for secret OTPs or PINs.',
          'Disclosing OTP grants immediate access to empty your bank accounts.',
          'Immediately update passwords if previously entered on third-party links.',
        ],
        isDestructiveWarning: true,
      },
      {
        id: 'no_links',
        icon: '🚫',
        title: 'Do Not Click Suspicious Links',
        category: 'Cyber Hygiene',
        urgency: 'Critical',
        urgencyColor: '#EF4444',
        urgencyBg: '#FEF2F2',
        description: 'Refrain from opening unverified hyperlinks, shortened URLs, or downloading APK attachments from this message.',
        steps: [
          'Embedded URLs lead to cloned phishing portals designed to steal login credentials.',
          'Downloading unsolicited APKs or files installs remote access malware.',
          'If already clicked, disconnect internet and run a device antivirus scan.',
        ],
        isDestructiveWarning: true,
      },
      {
        id: 'verify_sender',
        icon: '🔍',
        title: 'Verify the Sender Independently',
        category: 'Identity Verification',
        urgency: 'High Priority',
        urgencyColor: '#D97706',
        urgencyBg: '#FEF3C7',
        description: 'Authenticate the communication directly through the official website, app, or physical branch—never via the SMS.',
        steps: [
          'Never call phone numbers or helplines included inside suspicious messages.',
          'Look up official customer care numbers on verified portals or card backs.',
          'Verify alleged account suspension claims independently.',
        ],
      },
      {
        id: 'report_block',
        icon: '🚨',
        title: 'Report or Block the Sender',
        category: 'Incident Response',
        urgency: 'Action Required',
        urgencyColor: '#7C3AED',
        urgencyBg: '#EDE9FE',
        description: 'Block the sender on your phone and file a report with telecom spam registries and national cybercrime helplines.',
        steps: [
          'Block the contact and mark the conversation as spam in your messaging app.',
          'Forward scam SMS to 1909 (Telecom Spam Registry).',
          'Report cyber fraud to National Helpline (1930) or visit cybercrime.gov.in.',
        ],
      },
    ];
  }

  if (isWarning) {
    return [
      {
        id: 'no_links',
        icon: '🚫',
        title: 'Do Not Click Suspicious Links',
        category: 'Cyber Hygiene',
        urgency: 'Critical',
        urgencyColor: '#EF4444',
        urgencyBg: '#FEF2F2',
        description: 'Exercise high caution with embedded links or call-to-actions originating from unconfirmed senders.',
        steps: [
          'Do not open shortened or misspelled web addresses.',
          'Avoid logging into accounts through links sent in chat messages.',
        ],
        isDestructiveWarning: true,
      },
      {
        id: 'no_otp',
        icon: '🔐',
        title: 'Do Not Share OTP or Password',
        category: 'Credential Security',
        urgency: 'Immediate',
        urgencyColor: '#DC2626',
        urgencyBg: '#FEE2E2',
        description: 'Never reveal security tokens or account credentials, even if sender claims routine verification.',
        steps: [
          'Legitimate services never request credentials via SMS or chat.',
        ],
        isDestructiveWarning: true,
      },
      {
        id: 'verify_sender',
        icon: '🔍',
        title: 'Verify the Sender',
        category: 'Identity Verification',
        urgency: 'High Priority',
        urgencyColor: '#D97706',
        urgencyBg: '#FEF3C7',
        description: 'Confirm if you have an active relationship or recent order with the claimed entity before taking action.',
        steps: [
          'Open the official mobile application directly or check official portal inbox.',
          'Contact verified support channels to validate any pending notices.',
        ],
      },
      {
        id: 'no_money',
        icon: '🛑',
        title: 'Do Not Send Money',
        category: 'Financial Defense',
        urgency: 'High Priority',
        urgencyColor: '#D97706',
        urgencyBg: '#FEF3C7',
        description: 'Pause any money transfers until sender legitimacy is verified beyond doubt.',
        steps: [
          'Refuse unexpected delivery surcharges or clearance penalties.',
        ],
      },
      {
        id: 'report_block',
        icon: '🚨',
        title: 'Report or Block the Sender',
        category: 'Incident Response',
        urgency: 'Action Required',
        urgencyColor: '#7C3AED',
        urgencyBg: '#EDE9FE',
        description: 'Flag the message as suspicious and block repeat outreach.',
        steps: [
          'Use your messaging app\'s spam report button to prevent future contact.',
        ],
      },
    ];
  }

  // Safe / Clean Message
  return [
    {
      id: 'verify_sender',
      icon: '🔍',
      title: 'Verify the Sender',
      category: 'Proactive Vigilance',
      urgency: 'Standard',
      urgencyColor: '#059669',
      urgencyBg: '#D1FAE5',
      description: 'Although this message appears legitimate, verify that sender headers align with registered company identifiers.',
      steps: [
        'Confirm header matches official registered telecom sender IDs.',
        'Ensure the context matches an inquiry or transaction you initiated.',
      ],
    },
    {
      id: 'no_otp',
      icon: '🔐',
      title: 'Do Not Share OTP or Password',
      category: 'Credential Security',
      urgency: 'Standard',
      urgencyColor: '#059669',
      urgencyBg: '#D1FAE5',
      description: 'Uphold standard security hygiene by never sharing verification codes with anyone.',
      steps: [
        'Maintain multi-factor authentication (2FA) on all critical accounts.',
      ],
    },
    {
      id: 'no_links',
      icon: '🚫',
      title: 'Do Not Click Suspicious Links',
      category: 'Cyber Hygiene',
      urgency: 'Standard',
      urgencyColor: '#059669',
      urgencyBg: '#D1FAE5',
      description: 'Check full browser destination addresses before providing any personal details.',
      steps: [
        'Look for secure HTTPS encryption and verify domain spelling.',
      ],
    },
    {
      id: 'no_money',
      icon: '🛑',
      title: 'Do Not Send Money Without Checking',
      category: 'Financial Defense',
      urgency: 'Standard',
      urgencyColor: '#059669',
      urgencyBg: '#D1FAE5',
      description: 'Always double check payee names and accounts prior to confirming financial transactions.',
      steps: [
        'Verify merchant identity in UPI/NetBanking before entering PIN.',
      ],
    },
    {
      id: 'report_block',
      icon: '🚨',
      title: 'Report or Block Unwanted Spam',
      category: 'Incident Response',
      urgency: 'Standard',
      urgencyColor: '#059669',
      urgencyBg: '#D1FAE5',
      description: 'Opt out or block promotional senders who message you without explicit consent.',
      steps: [
        'Use registered Do-Not-Disturb (DND) options to limit spam.',
      ],
    },
  ];
}

// Generates the 5 Explainable AI factors based on scan severity/type
function getXAIFactors(result: AnalysisResult): XAIFactor[] {
  const isDanger = result.status === 'danger';
  const isWarning = result.status === 'warning';

  return [
    {
      id: 'urgency',
      icon: '⏳',
      title: 'Urgency & Time Coercion',
      category: 'Psychological Manipulation',
      detected: isDanger || isWarning,
      severity: isDanger ? 'high' : isWarning ? 'medium' : 'safe',
      severityLabel: isDanger ? 'High Urgency' : isWarning ? 'Moderate Urgency' : 'No Threat',
      snippet: isDanger
        ? '"Your account will be permanently blocked within 24 hours"'
        : isWarning
        ? '"Immediate action recommended to avoid delays"'
        : undefined,
      explanation: isDanger
        ? 'The sender imposes an immediate deadline (24 hours) to induce panic and prevent the recipient from calmly verifying authenticity.'
        : isWarning
        ? 'The message uses mild pressure phrases encouraging swift action before full evaluation.'
        : 'The message maintains a neutral, non-coercive tone with no artificial deadlines detected.',
      tactic: isDanger || isWarning
        ? 'Scammers employ panic triggers to force impulsive action before you consult official help.'
        : 'Legitimate services allow reasonable response windows without immediate punitive threats.',
    },
    {
      id: 'payment',
      icon: '💳',
      title: 'Payment & Fee Demand',
      category: 'Financial Request',
      detected: isDanger || isWarning,
      severity: isDanger ? 'high' : isWarning ? 'medium' : 'safe',
      severityLabel: isDanger ? 'Suspicious Fee' : isWarning ? 'Payment Flag' : 'No Payment Request',
      snippet: isDanger
        ? '"Clear pending verification fee of ₹499 to restore access"'
        : isWarning
        ? '"Nominal parcel release fee pending"'
        : undefined,
      explanation: isDanger
        ? 'The message attempts to solicit an upfront payment or processing fee through unverified channels.'
        : isWarning
        ? 'Mentions an unexpected fee or unpaid balance tied to service continuation.'
        : 'No financial demands, processing fees, or money transfers were requested.',
      tactic: isDanger || isWarning
        ? 'Advance-fee fraud traps victims into paying small sums that rapidly escalate into larger losses.'
        : 'Standard notifications do not demand urgent arbitrary payments over SMS.',
    },
    {
      id: 'suspicious_link',
      icon: '🔗',
      title: 'Suspicious Phishing Link',
      category: 'Web URL Verification',
      detected: isDanger || isWarning,
      severity: isDanger ? 'critical' : isWarning ? 'high' : 'safe',
      severityLabel: isDanger ? 'Malicious URL' : isWarning ? 'Unverified URL' : 'Clean / No Links',
      snippet: isDanger
        ? '"http://secure-bank-verify.xyz/update"'
        : isWarning
        ? '"http://track-pkg-info.net/claim"'
        : undefined,
      explanation: isDanger
        ? 'The link uses an untrusted top-level domain (.xyz) and lacks secure HTTPS encryption. It mimics legitimate banks to harvest credentials.'
        : isWarning
        ? 'Contains a shortened or redirected URL that disguises the real landing destination.'
        : 'No unverified, obfuscated, or suspicious hyperlinks were found in the message.',
      tactic: isDanger || isWarning
        ? 'Cloned login portals replicate brand visual styling to silently record passwords and PINs.'
        : 'Official organizations use verified, secure corporate domains (e.g. .com, .bank).',
    },
    {
      id: 'impersonation',
      icon: '🎭',
      title: 'Brand & Authority Impersonation',
      category: 'Identity Verification',
      detected: isDanger || isWarning,
      severity: isDanger ? 'high' : isWarning ? 'medium' : 'safe',
      severityLabel: isDanger ? 'Brand Spoofing' : isWarning ? 'Unverified Sender' : 'Authentic / Clean',
      snippet: isDanger
        ? '"HDFC Bank Official KYC & Account Security Desk"'
        : isWarning
        ? '"Customer Support Notification Center"'
        : undefined,
      explanation: isDanger
        ? 'The message falsely claims to originate from a prominent bank, but the sender header and routing metadata do not match authentic corporate gateways.'
        : isWarning
        ? 'Uses generic authority titles without verifying specific account or customer identifiers.'
        : 'No deceptive entity impersonation or forged institutional branding detected.',
      tactic: isDanger || isWarning
        ? 'Impersonating reputable authorities exploits organizational trust and lowers customer defenses.'
        : 'Legitimate communications originate from registered, telecom-verified enterprise IDs.',
    },
    {
      id: 'sensitive_info',
      icon: '🔒',
      title: 'Sensitive Information & OTP Request',
      category: 'Credential Harvesting',
      detected: isDanger,
      severity: isDanger ? 'critical' : 'safe',
      severityLabel: isDanger ? 'Critical Threat' : 'Protected / None',
      snippet: isDanger
        ? '"Confirm 6-digit OTP, debit card CVV & Internet Banking password"'
        : undefined,
      explanation: isDanger
        ? 'Direct solicitation of one-time passwords (OTP) and card security numbers (CVV). Banks strictly prohibit asking for these via SMS.'
        : 'No confidential credentials, authentication tokens, or personal identifiers were requested.',
      tactic: isDanger
        ? 'Once an attacker acquires an OTP and CVV, they bypass multi-factor authentication to drain funds.'
        : 'Banks and authentic institutions will NEVER ask for your secret OTP or passwords.',
    },
  ];
}

export default function MessageAnalysisResultScreen() {
  const navigation = useNavigation();
  const route = useRoute<ResultScreenRouteProp>();

  // Extract analysis result from route params, or use the default demo data
  const result: AnalysisResult = route.params?.result || DEFAULT_DEMO_RESULT;
  const factors = getXAIFactors(result);
  const tactics = getPsychologicalTactics(result);
  const safetyActions = getRecommendedSafetyActions(result);

  // Identify the AI predicted category key
  const predictedCategoryKey = resolveScamTypeKey(result.scamType);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>(predictedCategoryKey);

  // Keep the most important Explainable AI factors expanded by default
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({
    urgency: true,
    suspicious_link: true,
  });

  // Track completed safety checklist items
  const [completedSafetyActions, setCompletedSafetyActions] = useState<Record<string, boolean>>({});

  const toggleSafetyAction = (id: string) => {
    setCompletedSafetyActions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const completedActionsCount = safetyActions.filter((a) => completedSafetyActions[a.id]).length;
  const safetyProgressPercent = Math.round((completedActionsCount / safetyActions.length) * 100);

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    factors.forEach((f) => {
      allExpanded[f.id] = true;
    });
    setExpandedCards(allExpanded);
  };

  const collapseAll = () => {
    setExpandedCards({});
  };

  const allAreExpanded = factors.every((f) => expandedCards[f.id]);

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

  const getSeverityBadge = (severity: XAIFactor['severity']) => {
    switch (severity) {
      case 'critical':
        return { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' };
      case 'high':
        return { bg: '#FEF2F2', text: '#EF4444', border: '#FECACA' };
      case 'medium':
        return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
      case 'low':
        return { bg: '#E0F2FE', text: '#0284C7', border: '#BAE6FD' };
      case 'safe':
      default:
        return { bg: '#D1FAE5', text: '#059669', border: '#A7F3D0' };
    }
  };

  const getTacticLevelColor = (level: PsychologicalTactic['level']) => {
    switch (level) {
      case 'Critical':
        return { color: '#DC2626', bg: '#FEE2E2' };
      case 'High':
        return { color: '#EF4444', bg: '#FEF2F2' };
      case 'Moderate':
        return { color: '#D97706', bg: '#FEF3C7' };
      case 'Low':
        return { color: '#0284C7', bg: '#E0F2FE' };
      case 'Clean':
      default:
        return { color: '#059669', bg: '#D1FAE5' };
    }
  };

  const statusColor = getStatusColor();
  const statusBgColor = getStatusBgColor();

  const selectedCategory = ALL_SCAM_CATEGORIES[selectedCategoryKey] || ALL_SCAM_CATEGORIES.banking;
  const isMatch = selectedCategoryKey === predictedCategoryKey;

  // Find dominant psychological tactic
  const dominantTactic = [...tactics].sort((a, b) => b.intensity - a.intensity)[0];

  return (
    <SafeScreen backgroundColor={Colors.background}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Analysis Result</Text>
        <View style={styles.backSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Score Circle Area ── */}
        <View style={styles.scoreContainer}>
          <View style={[styles.outerRing, { borderColor: statusColor }]}>
            <View style={[styles.innerRing, { backgroundColor: statusBgColor }]}>
              <Text style={[styles.scoreNumber, { color: statusColor }]}>
                {result.riskScore}
              </Text>
              <Text style={styles.scoreLabel}>Risk Score</Text>
            </View>
          </View>
          <Text style={[styles.verdictText, { color: statusColor }]}>{result.verdict}</Text>
          <StatusBadge variant={result.status} label={result.statusLabel} />
        </View>

        {/* ── 2. Dedicated Scam Type Section ── */}
        <View style={styles.scamTypeSection}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Scam Classification</Text>
              <Text style={styles.sectionSub}>
                Predicted scam category & threat pattern match
              </Text>
            </View>
            <View style={styles.categoryCountBadge}>
              <Text style={styles.categoryCountText}>9 Categories</Text>
            </View>
          </View>

          {/* Interactive Category Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChipsScroll}
          >
            {Object.values(ALL_SCAM_CATEGORIES).map((cat) => {
              const isSelected = selectedCategoryKey === cat.id;
              const isPredicted = predictedCategoryKey === cat.id;

              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    isSelected && styles.categoryChipSelected,
                    isPredicted && !isSelected && styles.categoryChipPredicted,
                  ]}
                  onPress={() => setSelectedCategoryKey(cat.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && styles.categoryChipTextSelected,
                    ]}
                  >
                    {cat.name}
                  </Text>
                  {isPredicted && (
                    <View style={[styles.aiDot, isSelected && styles.aiDotSelected]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Selected Category Detail Card */}
          <View style={styles.scamTypeCard}>
            <View style={styles.scamTypeCardHeader}>
              <View style={styles.scamTypeIconBox}>
                <Text style={styles.scamTypeLargeIcon}>{selectedCategory.icon}</Text>
              </View>

              <View style={styles.scamTypeTitleBlock}>
                <View style={styles.scamTypeBadgeRow}>
                  <View
                    style={[
                      styles.categoryTagBadge,
                      { backgroundColor: isMatch ? Colors.primaryLight : Colors.surfaceSecondary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryTagBadgeText,
                        { color: isMatch ? Colors.primary : Colors.textSecondary },
                      ]}
                    >
                      {selectedCategory.tag}
                    </Text>
                  </View>

                  {isMatch && (
                    <View style={styles.predictedBadge}>
                      <Text style={styles.predictedBadgeText}>🎯 AI Predicted</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.scamTypeCardTitle}>{selectedCategory.name}</Text>
              </View>

              <View
                style={[
                  styles.riskLevelPill,
                  {
                    backgroundColor:
                      selectedCategory.riskLevel === 'Critical'
                        ? '#FEE2E2'
                        : selectedCategory.riskLevel === 'High'
                        ? '#FEF2F2'
                        : '#FEF3C7',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.riskLevelPillText,
                    {
                      color:
                        selectedCategory.riskLevel === 'Critical'
                          ? '#DC2626'
                          : selectedCategory.riskLevel === 'High'
                          ? '#EF4444'
                          : '#D97706',
                    },
                  ]}
                >
                  {selectedCategory.riskLevel}
                </Text>
              </View>
            </View>

            {/* Match / Benchmark Confidence Bar */}
            <View style={styles.confidenceSection}>
              <View style={styles.confidenceRow}>
                <Text style={styles.confidenceLabel}>
                  {isMatch ? 'Model Match Confidence' : 'Category Threat Index'}
                </Text>
                <Text style={[styles.confidenceValue, { color: statusColor }]}>
                  {isMatch ? `${result.probability}%` : `${selectedCategory.matchPercent}%`}
                </Text>
              </View>
              <View style={styles.confidenceTrack}>
                <View
                  style={[
                    styles.confidenceFill,
                    {
                      width: `${isMatch ? result.probability : selectedCategory.matchPercent}%`,
                      backgroundColor: statusColor,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Description */}
            <Text style={styles.scamTypeDescription}>{selectedCategory.description}</Text>

            {/* Common Signs */}
            <View style={styles.commonSignsContainer}>
              <Text style={styles.commonSignsTitle}>Typical Attack Vectors:</Text>
              <View style={styles.commonSignsRow}>
                {selectedCategory.commonSigns.map((sign, idx) => (
                  <View key={idx} style={styles.commonSignPill}>
                    <Text style={styles.commonSignPillText}>• {sign}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* ── 3. Psychological Manipulation Detection ── */}
        <View style={styles.psychSection}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <View style={styles.psychBadge}>
                <Text style={styles.psychBadgeText}>🧠 Behavioral AI</Text>
              </View>
              <Text style={styles.sectionTitle}>Psychological Manipulation</Text>
              <Text style={styles.sectionSub}>
                Detection of 7 coercive psychological vectors & pressure triggers
              </Text>
            </View>
          </View>

          {/* Dominant Weapon Highlight Banner */}
          {result.status !== 'safe' && (
            <View style={styles.dominantBanner}>
              <Text style={styles.dominantBannerIcon}>⚡</Text>
              <View style={styles.dominantBannerTextGroup}>
                <Text style={styles.dominantBannerTitle}>Primary Coercive Vector</Text>
                <Text style={styles.dominantBannerDesc}>
                  Dominant tactic: <Text style={styles.dominantBold}>{dominantTactic.name} ({dominantTactic.intensity}%)</Text> — {dominantTactic.triggerDescription}
                </Text>
              </View>
            </View>
          )}

          {/* 7 Tactics Cards List */}
          <View style={styles.tacticsGrid}>
            {tactics.map((tactic) => {
              const levelStyle = getTacticLevelColor(tactic.level);

              return (
                <View key={tactic.id} style={styles.tacticCard}>
                  <View style={styles.tacticHeader}>
                    <View style={styles.tacticTitleGroup}>
                      <Text style={styles.tacticIcon}>{tactic.icon}</Text>
                      <Text style={styles.tacticName}>{tactic.name}</Text>
                    </View>

                    <View style={[styles.tacticLevelBadge, { backgroundColor: levelStyle.bg }]}>
                      <Text style={[styles.tacticLevelText, { color: levelStyle.color }]}>
                        {tactic.intensity}% • {tactic.level}
                      </Text>
                    </View>
                  </View>

                  {/* Intensity Progress Bar */}
                  <View style={styles.tacticTrack}>
                    <View
                      style={[
                        styles.tacticFill,
                        {
                          width: `${Math.max(tactic.intensity, 4)}%`,
                          backgroundColor: levelStyle.color,
                        },
                      ]}
                    />
                  </View>

                  <Text style={styles.tacticDesc}>{tactic.triggerDescription}</Text>

                  {tactic.detectedPhrase && (
                    <View style={styles.tacticPhraseBox}>
                      <Text style={styles.tacticPhraseText}>
                        Detected: {tactic.detectedPhrase}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* ── 4. Explainable AI: "Why was this flagged?" ── */}
        <View style={styles.xaiSectionHeader}>
          <View style={styles.xaiTitleContainer}>
            <View style={styles.xaiBadge}>
              <Text style={styles.xaiBadgeText}>🤖 Explainable AI</Text>
            </View>
            <Text style={styles.sectionTitle}>Why was this flagged?</Text>
            <Text style={styles.xaiSubtitle}>
              Detailed breakdown of key scam triggers and behavioral signals
            </Text>
          </View>
          <TouchableOpacity
            style={styles.toggleAllBtn}
            onPress={allAreExpanded ? collapseAll : expandAll}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleAllText}>
              {allAreExpanded ? 'Collapse All' : 'Expand All'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>AI Assessment Summary</Text>
          <Text style={styles.summaryText}>{result.reason}</Text>
        </View>

        {/* Expandable Factor Cards */}
        <View style={styles.factorsList}>
          {factors.map((factor) => {
            const isExpanded = !!expandedCards[factor.id];
            const badgeStyle = getSeverityBadge(factor.severity);

            return (
              <View key={factor.id} style={styles.factorCard}>
                {/* Header / Tap to expand */}
                <TouchableOpacity
                  style={styles.factorHeader}
                  onPress={() => toggleCard(factor.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.factorHeaderLeft}>
                    <View style={styles.factorIconWrap}>
                      <Text style={styles.factorIcon}>{factor.icon}</Text>
                    </View>
                    <View style={styles.factorTitleGroup}>
                      <Text style={styles.factorTitle}>{factor.title}</Text>
                      <Text style={styles.factorCategory}>{factor.category}</Text>
                    </View>
                  </View>

                  <View style={styles.factorHeaderRight}>
                    <View
                      style={[
                        styles.severityBadge,
                        {
                          backgroundColor: badgeStyle.bg,
                          borderColor: badgeStyle.border,
                        },
                      ]}
                    >
                      <Text style={[styles.severityBadgeText, { color: badgeStyle.text }]}>
                        {factor.severityLabel}
                      </Text>
                    </View>
                    <Text style={styles.chevronIcon}>
                      {isExpanded ? '▲' : '▼'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Collapsible Details */}
                {isExpanded && (
                  <View style={styles.factorBody}>
                    <View style={styles.factorDivider} />

                    {/* Detected snippet if present */}
                    {factor.snippet ? (
                      <View style={styles.snippetContainer}>
                        <Text style={styles.snippetLabel}>Detected Evidence in Message:</Text>
                        <View style={styles.snippetBox}>
                          <Text style={styles.snippetQuoteMark}>“</Text>
                          <Text style={styles.spnippetText}>{factor.snippet}</Text>
                        </View>
                      </View>
                    ) : null}

                    {/* Reasoning explanation */}
                    <View style={styles.reasonBlock}>
                      <Text style={styles.reasonLabel}>AI Risk Reasoning:</Text>
                      <Text style={styles.reasonText}>{factor.explanation}</Text>
                    </View>

                    {/* Scammer Tactic */}
                    <View style={styles.tacticBlock}>
                      <Text style={styles.tacticLabel}>Scam Tactic Explained:</Text>
                      <Text style={styles.tacticText}>{factor.tactic}</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ── 5. Detected Warning Signs ── */}
        <Text style={styles.sectionTitle}>Detected Warning Signs</Text>
        <View style={styles.indicatorsCard}>
          {result.indicators.map((indicator, index) => (
            <View key={index} style={styles.indicatorRow}>
              <Text style={[styles.indicatorBullet, { color: statusColor }]}>⚠</Text>
              <Text style={styles.indicatorText}>{indicator}</Text>
            </View>
          ))}
        </View>

        {/* ── 6. Recommended Actions Protocol ── */}
        <View style={styles.actionPlanSection}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <View style={styles.actionPlanBadge}>
                <Text style={styles.actionPlanBadgeText}>🛡️ Action Protocol</Text>
              </View>
              <Text style={styles.sectionTitle}>Recommended Safety Actions</Text>
              <Text style={styles.sectionSub}>
                Practical defense measures based on {result.statusLabel} risk level
              </Text>
            </View>
          </View>

          {/* Defense Protocol Summary Banner */}
          <View
            style={[
              styles.protocolBanner,
              {
                backgroundColor:
                  result.status === 'danger'
                    ? '#FEF2F2'
                    : result.status === 'warning'
                    ? '#FFFBEB'
                    : '#F0FDF4',
                borderColor:
                  result.status === 'danger'
                    ? '#FECACA'
                    : result.status === 'warning'
                    ? '#FDE68A'
                    : '#BBF7D0',
              },
            ]}
          >
            <View style={styles.protocolBannerHeader}>
              <Text style={styles.protocolBannerIcon}>
                {result.status === 'danger' ? '🚨' : result.status === 'warning' ? '⚠️' : '✅'}
              </Text>
              <View style={styles.protocolBannerTextGroup}>
                <Text
                  style={[
                    styles.protocolBannerTitle,
                    {
                      color:
                        result.status === 'danger'
                          ? '#991B1B'
                          : result.status === 'warning'
                          ? '#92400E'
                          : '#166534',
                    },
                  ]}
                >
                  {result.status === 'danger'
                    ? 'Immediate Threat Defense Protocol'
                    : result.status === 'warning'
                    ? 'Cautionary Defense Protocol'
                    : 'Standard Security Hygiene Protocol'}
                </Text>
                <Text
                  style={[
                    styles.protocolBannerDesc,
                    {
                      color:
                        result.status === 'danger'
                          ? '#B91C1C'
                          : result.status === 'warning'
                          ? '#B45309'
                          : '#15803D',
                    },
                  ]}
                >
                  {result.status === 'danger'
                    ? 'Execute the 5 safety measures below immediately to protect financial accounts and identity.'
                    : result.status === 'warning'
                    ? 'Follow standard verification precautions before responding or engaging.'
                    : 'Uphold daily cybersecurity habits to keep accounts protected.'}
                </Text>
              </View>
            </View>

            {/* Checklist Progress Indicator */}
            <View style={styles.checklistProgressBlock}>
              <View style={styles.checklistProgressRow}>
                <Text style={styles.checklistProgressLabel}>Defensive Steps Completed</Text>
                <Text
                  style={[
                    styles.checklistProgressValue,
                    {
                      color:
                        completedActionsCount === safetyActions.length
                          ? '#059669'
                          : statusColor,
                    },
                  ]}
                >
                  {completedActionsCount} of {safetyActions.length} Done ({safetyProgressPercent}%)
                </Text>
              </View>
              <View style={styles.checklistTrack}>
                <View
                  style={[
                    styles.checklistFill,
                    {
                      width: `${Math.max(safetyProgressPercent, 3)}%`,
                      backgroundColor:
                        completedActionsCount === safetyActions.length
                          ? '#059669'
                          : statusColor,
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Action Cards List */}
          <View style={styles.safetyActionsList}>
            {safetyActions.map((action, idx) => {
              const isCompleted = !!completedSafetyActions[action.id];

              return (
                <View
                  key={action.id}
                  style={[
                    styles.safetyActionCard,
                    isCompleted && styles.safetyActionCardDone,
                    action.isDestructiveWarning && !isCompleted && styles.safetyActionCardCritical,
                  ]}
                >
                  {/* Card Top Row */}
                  <View style={styles.actionCardTopRow}>
                    <View
                      style={[
                        styles.actionCardIconBox,
                        { backgroundColor: action.urgencyBg },
                      ]}
                    >
                      <Text style={styles.actionCardIcon}>{action.icon}</Text>
                    </View>

                    <View style={styles.actionCardTitleGroup}>
                      <View style={styles.actionCardCategoryRow}>
                        <Text style={styles.actionCardCategory}>{action.category}</Text>
                        <View
                          style={[
                            styles.urgencyBadge,
                            { backgroundColor: action.urgencyBg },
                          ]}
                        >
                          <Text style={[styles.urgencyBadgeText, { color: action.urgencyColor }]}>
                            {action.urgency}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.actionCardTitle,
                          isCompleted && styles.actionCardTitleDone,
                        ]}
                      >
                        {idx + 1}. {action.title}
                      </Text>
                    </View>
                  </View>

                  {/* Description */}
                  <Text style={styles.actionCardDesc}>{action.description}</Text>

                  {/* Practical Action Steps / Guidance */}
                  <View style={styles.actionStepsBox}>
                    {action.steps.map((step, sIdx) => (
                      <View key={sIdx} style={styles.actionStepRow}>
                        <Text style={styles.actionStepDot}>•</Text>
                        <Text style={styles.actionStepText}>{step}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Interactive Toggle Button */}
                  <TouchableOpacity
                    style={[
                      styles.actionCheckBtn,
                      isCompleted && styles.actionCheckBtnDone,
                    ]}
                    onPress={() => toggleSafetyAction(action.id)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.actionCheckBtnIcon,
                        isCompleted && styles.actionCheckBtnIconDone,
                      ]}
                    >
                      {isCompleted ? '✓' : '○'}
                    </Text>
                    <Text
                      style={[
                        styles.actionCheckBtnText,
                        isCompleted && styles.actionCheckBtnTextDone,
                      ]}
                    >
                      {isCompleted ? 'Safety Step Completed' : 'Mark as Done'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Quick Emergency Assistance Box */}
          <View style={styles.emergencyBox}>
            <Text style={styles.emergencyTitle}>🚨 Direct Assistance Shortcuts</Text>
            <View style={styles.emergencyGrid}>
              <TouchableOpacity
                style={styles.emergencyBtn}
                activeOpacity={0.75}
                onPress={() => {
                  Alert.alert(
                    'National Cyber Crime Helpline (1930)',
                    'In India, dial 1930 immediately to report online financial frauds, unauthorized debits, or identity impersonations.',
                    [{ text: 'OK' }]
                  );
                }}
              >
                <Text style={styles.emergencyBtnIcon}>📞</Text>
                <Text style={styles.emergencyBtnText}>Dial 1930 Helpline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.emergencyBtn}
                activeOpacity={0.75}
                onPress={() => {
                  Alert.alert(
                    'Block & Report Sender',
                    '1. Open your SMS/messaging app settings.\n2. Tap "Block Contact & Report Spam".\n3. Forward suspicious text to 1909 (Telecom DND).',
                    [{ text: 'Got it' }]
                  );
                }}
              >
                <Text style={styles.emergencyBtnIcon}>🚫</Text>
                <Text style={styles.emergencyBtnText}>Block & Flag Sender</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── 7. Bottom Actions ── */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.btnSecondary}
            activeOpacity={0.8}
            onPress={() => {
              // Share alert simulation
              alert('Security alert details copied to clipboard to share.');
            }}
          >
            <Text style={styles.btnSecondaryText}>📤 Share Alert Info</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnPrimary}
            activeOpacity={0.85}
            onPress={() => {
              // Go back to scanning screen
              navigation.goBack();
            }}
          >
            <Text style={styles.btnPrimaryText}>Scan Another Message</Text>
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
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  backSpacer: {
    width: 40,
  },

  // Score display
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.base,
    marginTop: Spacing.xs,
  },
  outerRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  innerRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: FontSize['4xl'],
    fontWeight: FontWeight.extrabold,
  },
  scoreLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
    marginTop: -2,
  },
  verdictText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
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
  },

  // Scam Type Section
  scamTypeSection: {
    marginBottom: Spacing.lg,
  },
  categoryCountBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryCountText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
  },

  // Category Chips Scroll
  categoryChipsScroll: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 5,
  },
  categoryChipSelected: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  categoryChipPredicted: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  categoryChipIcon: {
    fontSize: 14,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: FontWeight.bold,
  },
  aiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  aiDotSelected: {
    backgroundColor: '#60A5FA',
  },

  // Scam Type Detail Card
  scamTypeCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
  },
  scamTypeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  scamTypeIconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  scamTypeLargeIcon: {
    fontSize: 24,
  },
  scamTypeTitleBlock: {
    flex: 1,
  },
  scamTypeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  categoryTagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  categoryTagBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
  },
  predictedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  predictedBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: '#D97706',
  },
  scamTypeCardTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  riskLevelPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  riskLevelPillText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },

  // Confidence Section
  confidenceSection: {
    marginBottom: Spacing.md,
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  confidenceLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  confidenceValue: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  confidenceTrack: {
    height: 6,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },

  scamTypeDescription: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },

  // Common Signs
  commonSignsContainer: {
    backgroundColor: Colors.surfaceSecondary,
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  commonSignsTitle: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  commonSignsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  commonSignPill: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  commonSignPillText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },

  // Psychological Section
  psychSection: {
    marginBottom: Spacing.lg,
  },
  psychBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    marginBottom: 4,
  },
  psychBadgeText: {
    fontSize: 11,
    color: '#7C3AED',
    fontWeight: FontWeight.bold,
  },
  dominantBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  dominantBannerIcon: {
    fontSize: 20,
  },
  dominantBannerTextGroup: {
    flex: 1,
  },
  dominantBannerTitle: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: '#C2410C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dominantBannerDesc: {
    fontSize: FontSize.xs,
    color: '#7C2D12',
    lineHeight: 16,
  },
  dominantBold: {
    fontWeight: FontWeight.bold,
  },
  tacticsGrid: {
    gap: Spacing.xs,
  },
  tacticCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  tacticHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tacticTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tacticIcon: {
    fontSize: 16,
  },
  tacticName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  tacticLevelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  tacticLevelText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  tacticTrack: {
    height: 5,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: 6,
  },
  tacticFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  tacticDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  tacticPhraseBox: {
    marginTop: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderLeftWidth: 2,
    borderLeftColor: Colors.danger,
  },
  tacticPhraseText: {
    fontSize: 10,
    color: Colors.textPrimary,
    fontStyle: 'italic',
  },

  // Explainable AI Header Section
  xaiSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  xaiTitleContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  xaiBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    marginBottom: 4,
  },
  xaiBadgeText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  xaiSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  toggleAllBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleAllText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  summaryTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Factors List
  factorsList: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  factorCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  factorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
  },
  factorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  factorIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  factorIcon: {
    fontSize: 18,
  },
  factorTitleGroup: {
    flex: 1,
  },
  factorTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  factorCategory: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  factorHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  severityBadgeText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  chevronIcon: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginLeft: 2,
  },

  // Factor Collapsible Body
  factorBody: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
  },
  factorDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginBottom: Spacing.md,
  },
  snippetContainer: {
    marginBottom: Spacing.md,
  },
  snippetLabel: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  snippetBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.danger,
    padding: Spacing.sm,
    alignItems: 'flex-start',
  },
  snippetQuoteMark: {
    fontSize: FontSize.lg,
    color: Colors.danger,
    lineHeight: 18,
    marginRight: 4,
    fontWeight: FontWeight.bold,
  },
  spnippetText: {
    flex: 1,
    fontSize: FontSize.xs,
    fontStyle: 'italic',
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  reasonBlock: {
    marginBottom: Spacing.sm,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  reasonText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  tacticBlock: {
    backgroundColor: Colors.surfaceSecondary,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  tacticLabel: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  tacticText: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },

  // Indicators list
  indicatorsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  indicatorBullet: {
    fontSize: FontSize.md,
    marginRight: Spacing.sm,
    fontWeight: FontWeight.bold,
    marginTop: -1,
  },
  indicatorText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Action Plan / Recommended Actions Section
  actionPlanSection: {
    marginBottom: Spacing.xl,
  },
  actionPlanBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    marginBottom: 4,
  },
  actionPlanBadgeText: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: FontWeight.bold,
  },
  protocolBanner: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  protocolBannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  protocolBannerIcon: {
    fontSize: 22,
    marginTop: 2,
  },
  protocolBannerTextGroup: {
    flex: 1,
  },
  protocolBannerTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  protocolBannerDesc: {
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  checklistProgressBlock: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  checklistProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  checklistProgressLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  checklistProgressValue: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
  },
  checklistTrack: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  checklistFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },

  // Safety Action Cards
  safetyActionsList: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  safetyActionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
  },
  safetyActionCardCritical: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFAFA',
  },
  safetyActionCardDone: {
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
    opacity: 0.9,
  },
  actionCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  actionCardIconBox: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  actionCardIcon: {
    fontSize: 18,
  },
  actionCardTitleGroup: {
    flex: 1,
  },
  actionCardCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  actionCardCategory: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  urgencyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  urgencyBadgeText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
  },
  actionCardTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  actionCardTitleDone: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  actionCardDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  actionStepsBox: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: 4,
  },
  actionStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  actionStepDot: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginRight: 6,
    lineHeight: 16,
  },
  actionStepText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  actionCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingVertical: 8,
    gap: 6,
  },
  actionCheckBtnDone: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  actionCheckBtnIcon: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: FontWeight.bold,
  },
  actionCheckBtnIconDone: {
    color: '#15803D',
  },
  actionCheckBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  actionCheckBtnTextDone: {
    color: '#15803D',
  },

  // Direct Assistance Shortcuts
  emergencyBox: {
    backgroundColor: '#0F172A',
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginTop: Spacing.xs,
  },
  emergencyTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#F8FAFC',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  emergencyGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  emergencyBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emergencyBtnIcon: {
    fontSize: 18,
  },
  emergencyBtnText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: '#E2E8F0',
    textAlign: 'center',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'column',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
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
