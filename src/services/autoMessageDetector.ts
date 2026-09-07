/**
 * autoMessageDetector.ts
 * -----------------------
 * Core engine for Automatic Message Scam Detection in ScamShield AI.
 * Intercepts incoming SMS, WhatsApp, and messaging notifications,
 * extracts text and any embedded URLs, runs multi-modal AI/ML analysis,
 * generates immediate ScamShield alerts, and records scans in device history.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scanMessageApi, scanUrl } from './scamShieldApi';
import { addScanToHistory, createScanId, ScanHistoryItem } from './scanHistory';
import { STACKS } from '../constants/routes';

export type MessageChannel = 'SMS' | 'WhatsApp' | 'Telegram';

export interface IncomingMessage {
  id?: string;
  sender: string;
  text: string;
  channel: MessageChannel;
  timestamp?: string;
}

export interface AutoScamAlert {
  id: string;
  title: string;
  sender: string;
  channel: MessageChannel;
  text: string;
  riskScore: number;
  riskLevel: 'High Risk' | 'Suspicious' | 'Safe';
  status: 'danger' | 'warning' | 'safe';
  statusLabel: string;
  reason: string;
  scamType: string;
  indicators: string[];
  recommendations: string[];
  resultPayload: any;
  createdAt: string;
}

export interface AutoShieldConfig {
  enabled: boolean;
  channels: {
    sms: boolean;
    whatsapp: boolean;
    telegram: boolean;
  };
  minRiskThreshold: number; // e.g. 40 triggers Suspicious & High Risk alerts
}

const CONFIG_KEY = '@scamshield_auto_shield_config';

const DEFAULT_CONFIG: AutoShieldConfig = {
  enabled: true,
  channels: {
    sms: true,
    whatsapp: true,
    telegram: true,
  },
  minRiskThreshold: 40,
};

// Registered in-memory alert listeners (e.g. notification banner UI)
type AlertListener = (alert: AutoScamAlert) => void;
const alertListeners = new Set<AlertListener>();

export function addAlertListener(listener: AlertListener): () => void {
  alertListeners.add(listener);
  return () => {
    alertListeners.delete(listener);
  };
}

export function emitAlert(alert: AutoScamAlert): void {
  alertListeners.forEach((listener) => {
    try {
      listener(alert);
    } catch (err) {
      console.warn('[AutoMessageDetector] Error in alert listener:', err);
    }
  });
}

/**
 * Loads current Auto-Shield configuration from persistent storage.
 */
export async function getAutoShieldConfig(): Promise<AutoShieldConfig> {
  try {
    const raw = await AsyncStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * Saves updated Auto-Shield configuration.
 */
export async function saveAutoShieldConfig(
  update: Partial<AutoShieldConfig>
): Promise<AutoShieldConfig> {
  try {
    const current = await getAutoShieldConfig();
    const updated = {
      ...current,
      ...update,
      channels: { ...current.channels, ...(update.channels || {}) },
    };
    await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * Extracts all URLs found inside a message string.
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;
  const matches = text.match(urlRegex) || [];
  return matches.map((m) => m.trim().replace(/[.,!?:;]+$/, ''));
}

/**
 * Processes an incoming SMS or WhatsApp notification message.
 * Analyzes message semantics AND any embedded URLs.
 * If suspicious, emits a ScamShield notification and updates history & dashboard.
 */
export async function processIncomingMessage(
  incoming: IncomingMessage
): Promise<{ isScam: boolean; alert?: AutoScamAlert; resultPayload: any }> {
  const config = await getAutoShieldConfig();

  // If feature is disabled or this channel is disabled, skip processing
  if (!config.enabled) {
    return { isScam: false, resultPayload: null };
  }
  const channelKey = incoming.channel.toLowerCase() as keyof AutoShieldConfig['channels'];
  if (config.channels[channelKey] === false) {
    return { isScam: false, resultPayload: null };
  }

  const trimmedText = incoming.text.trim();
  if (!trimmedText) {
    return { isScam: false, resultPayload: null };
  }

  // 1. Analyze message text via AI/ML backend (with fallback)
  const messageResult = await scanMessageApi(trimmedText, incoming.sender);

  // 2. Check for embedded URLs in message
  const embeddedUrls = extractUrls(trimmedText);
  let highestUrlRisk = 0;
  let urlFlags: string[] = [];
  let worstUrlVerdict = '';

  if (embeddedUrls.length > 0) {
    for (const url of embeddedUrls) {
      try {
        const urlResult = await scanUrl(url);
        if (urlResult.riskScore > highestUrlRisk) {
          highestUrlRisk = urlResult.riskScore;
          worstUrlVerdict = urlResult.verdict;
        }
        if (urlResult.flags && urlResult.flags.length > 0) {
          urlFlags.push(...urlResult.flags);
        }
      } catch (err) {
        console.warn('[AutoMessageDetector] URL check error:', err);
      }
    }
  }

  // 3. Synthesize blended risk score and indicators
  let finalRiskScore = messageResult.riskScore;
  const blendedIndicators = [...messageResult.indicators];

  if (embeddedUrls.length > 0) {
    blendedIndicators.push(`Contains ${embeddedUrls.length} embedded web link(s): ${embeddedUrls.slice(0, 2).join(', ')}`);
    if (highestUrlRisk >= 40) {
      // Elevate risk score if URL is suspicious or dangerous
      finalRiskScore = Math.max(finalRiskScore, highestUrlRisk);
      blendedIndicators.push(`High-threat link detected: ${worstUrlVerdict}`);
      if (urlFlags.length > 0) {
        blendedIndicators.push(...urlFlags.slice(0, 3));
      }
    }
  }

  // Determine final status
  const finalStatus: 'safe' | 'warning' | 'danger' =
    finalRiskScore >= 75 ? 'danger' : finalRiskScore >= config.minRiskThreshold ? 'warning' : 'safe';

  const finalStatusLabel =
    finalStatus === 'danger'
      ? 'High Risk Scam'
      : finalStatus === 'warning'
      ? 'Suspicious Message'
      : 'Likely Safe';

  const riskLevel: 'High Risk' | 'Suspicious' | 'Safe' =
    finalStatus === 'danger' ? 'High Risk' : finalStatus === 'warning' ? 'Suspicious' : 'Safe';

  // Format concise short reason for notification display
  let shortReason = messageResult.reason;
  if (embeddedUrls.length > 0 && highestUrlRisk >= 40) {
    shortReason = `Suspicious link & ${messageResult.scamType || 'threat cues'} detected (${worstUrlVerdict})`;
  } else if (!shortReason || shortReason.length > 120) {
    shortReason = messageResult.verdict || 'Contains urgent prompts, unsolicited rewards, or deceptive credential links.';
  }

  const resultPayload = {
    ...messageResult,
    riskScore: finalRiskScore,
    status: finalStatus,
    statusLabel: finalStatusLabel,
    indicators: Array.from(new Set(blendedIndicators)),
    reason: shortReason,
    sourceChannel: incoming.channel,
    sender: incoming.sender,
  };

  const isScam = finalRiskScore >= config.minRiskThreshold;
  const scanId = createScanId();
  const now = new Date();

  // 4. Create and save scan history item (updates Dashboard & History automatically)
  const historyItem: ScanHistoryItem = {
    id: scanId,
    type: 'message',
    typeLabel: `${incoming.channel} Auto-Shield`,
    typeIcon: incoming.channel === 'WhatsApp' ? '💬' : '📱',
    title: incoming.sender ? `${incoming.sender}: ${messageResult.scamType || 'Message Scan'}` : `${incoming.channel} Scan`,
    snippet: trimmedText.slice(0, 100) + (trimmedText.length > 100 ? '...' : ''),
    riskScore: finalRiskScore,
    status: finalStatus,
    statusLabel: finalStatusLabel,
    category: messageResult.scamType || 'Auto-Detected Threat',
    timestamp: now.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    date: now.toISOString().slice(0, 10),
    resultPayload,
    targetScreen: STACKS.MESSAGE_ANALYSIS_RESULT,
    createdAt: now.toISOString(),
  };

  try {
    await addScanToHistory(historyItem);
  } catch (err) {
    console.warn('[AutoMessageDetector] Failed to save scan history:', err);
  }

  // 5. If suspicious or scam, emit ScamShield Notification
  let alert: AutoScamAlert | undefined;
  if (isScam) {
    alert = {
      id: scanId,
      title: `🚨 Suspicious ${incoming.channel} Message Detected`,
      sender: incoming.sender || 'Unknown Sender',
      channel: incoming.channel,
      text: trimmedText,
      riskScore: finalRiskScore,
      riskLevel,
      status: finalStatus,
      statusLabel: finalStatusLabel,
      reason: shortReason,
      scamType: messageResult.scamType || 'Phishing / Fraud',
      indicators: blendedIndicators,
      recommendations: messageResult.recommendations || [
        'Do not click on links or share personal details.',
        'Verify the sender identity before taking any requested action.',
      ],
      resultPayload,
      createdAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    emitAlert(alert);
  }

  return { isScam, alert, resultPayload };
}
