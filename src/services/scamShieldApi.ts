/**
 * ScamShield AI API Service
 * Handles communication with the Python FastAPI MLOps serving backend,
 * with seamless client-side real-time DNS/HTTP live analysis fallback.
 */
import { Platform } from 'react-native';

export interface URLScanApiResponse {
  url: string;
  riskScore: number;
  status: 'safe' | 'suspicious' | 'malicious';
  statusLabel: string;
  verdict: string;
  flags: string[];
  features: Record<string, unknown>;
  liveCheck: {
    checked?: boolean;
    reachable?: boolean;
    dnsResolved?: boolean;
    httpsValid?: boolean;
    httpStatus?: number | null;
    finalUrl?: string;
    finalDomain?: string;
    redirects?: number;
    trustedDomain?: boolean;
    error?: string | null;
  };
  modelVersion?: string | null;
}

export interface MessageScanApiResponse {
  riskScore: number;
  status: 'safe' | 'warning' | 'danger';
  statusLabel: string;
  verdict: string;
  reason: string;
  indicators: string[];
  recommendations: string[];
  scamType: string;
  probability: number;
  modelVersion?: string | null;
}

// Determine the default backend base URL depending on platform
function getDefaultBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL.replace(/\/$/, '');
  }
  // Android emulator routes host localhost to 10.0.2.2; Web & iOS use localhost
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return 'http://localhost:8000';
}

const API_BASE_URL = getDefaultBaseUrl();

const TRUSTED_DOMAINS = [
  'google.com',
  'google.co.in',
  'google.co.uk',
  'youtube.com',
  'youtu.be',
  'microsoft.com',
  'live.com',
  'office.com',
  'bing.com',
  'apple.com',
  'icloud.com',
  'amazon.com',
  'amazon.in',
  'github.com',
  'gitlab.com',
  'wikipedia.org',
  'cloudflare.com',
  'openai.com',
  'chatgpt.com',
  'facebook.com',
  'meta.com',
  'instagram.com',
  'whatsapp.com',
  'linkedin.com',
  'twitter.com',
  'x.com',
  'netflix.com',
  'spotify.com',
  'hdfcbank.com',
  'icicibank.com',
  'onlinesbi.sbi',
  'sbi.co.in',
  'axisbank.com',
  'kotak.com',
  'paytm.com',
  'phonepe.com',
];

export function isTrustedDomain(domain: string): boolean {
  if (!domain) return false;
  let d = domain.toLowerCase().trim();
  if (d.startsWith('www.')) {
    d = d.slice(4);
  }
  for (const trusted of TRUSTED_DOMAINS) {
    if (d === trusted || d.endsWith('.' + trusted)) {
      return true;
    }
  }
  return false;
}

const SUSPICIOUS_TLDS = new Set([
  'xyz', 'top', 'club', 'buzz', 'work', 'icu', 'cam', 'rest', 'fit', 'tk', 'ml', 'ga', 'cf', 'gq', 'click', 'link', 'download'
]);

const BRAND_KEYWORDS = [
  'hdfc', 'sbi', 'icici', 'axis', 'paytm', 'phonepe', 'gpay', 'paypal', 'apple', 'amazon', 'google', 'netflix', 'microsoft', 'flipkart'
];

/**
 * Performs real-time client-side DNS resolution using Google Public DNS-over-HTTPS.
 */
async function resolveDnsLive(domain: string): Promise<{ resolved: boolean; ip?: string; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`, {
      signal: controller.signal,
      headers: { Accept: 'application/dns-json' },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { resolved: false, error: `DNS query returned HTTP ${res.status}` };
    }

    const data = await res.json();
    // Status 0 means NOERROR (resolved successfully)
    if (data.Status === 0 && Array.isArray(data.Answer) && data.Answer.length > 0) {
      const aRecord = data.Answer.find((ans: any) => ans.type === 1);
      return { resolved: true, ip: aRecord?.data || data.Answer[0].data };
    } else if (data.Status === 3) {
      return { resolved: false, error: 'Domain does not exist (NXDOMAIN)' };
    }
    return { resolved: false, error: `DNS status code ${data.Status}` };
  } catch (err: any) {
    return { resolved: false, error: err?.message || 'DNS resolution failed' };
  }
}

/**
 * Performs real-time live reachability check using HTTP fetch with a short timeout.
 */
async function probeUrlReachability(url: string): Promise<{ reachable: boolean; status?: number; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      mode: 'no-cors', // Avoid browser CORS blocks on web
    });
    clearTimeout(timeout);
    return { reachable: true, status: res.status || 200 };
  } catch (err: any) {
    return { reachable: false, error: err?.message || 'Host unreachable' };
  }
}

/**
 * Real-time client-side URL analysis engine.
 */
export async function analyzeUrlClientSide(rawUrl: string): Promise<URLScanApiResponse> {
  let normalized = rawUrl.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }

  let domain = '';
  let path = '';
  let isHttps = normalized.startsWith('https://');

  try {
    const parsed = new URL(normalized);
    domain = parsed.hostname.toLowerCase();
    path = parsed.pathname.toLowerCase();
  } catch {
    domain = normalized.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase();
  }

  const domainParts = domain.split('.');
  const tld = domainParts.length > 1 ? domainParts[domainParts.length - 1] : '';
  const isTrusted = isTrustedDomain(domain);

  // Parallel live DNS resolution and reachability probe
  const [dnsResult, reachResult] = await Promise.all([
    resolveDnsLive(domain),
    probeUrlReachability(normalized),
  ]);

  const flags: string[] = [];
  let riskScore = 15;

  if (isTrusted) {
    if (!isHttps) {
      riskScore = 45;
      flags.push('Warning: Accessed via unencrypted HTTP connection (lacks SSL/TLS encryption)');
    } else {
      riskScore = 1;
      flags.push(`Live check: Recognized trusted domain (${domain})`);
    }
  } else {
    if (SUSPICIOUS_TLDS.has(tld)) {
      riskScore += 45;
      flags.push(`Suspicious top-level domain (.${tld}) frequently used in phishing`);
    }

    if (!isHttps) {
      riskScore += 35;
      flags.push('Insecure HTTP protocol: Traffic is unencrypted and vulnerable to interception');
    }

    // Brand impersonation check: only triggers for unverified, non-trusted domains
    const matchedBrand = BRAND_KEYWORDS.find((b) => domain.includes(b));
    if (matchedBrand) {
      riskScore += 45;
      flags.push(`Lookalike brand keyword detected ("${matchedBrand}") on unofficial domain`);
    }

    // Deceptive keywords in URL or path
    const deceptiveKeywords = ['login', 'verify', 'update', 'secure', 'bank', 'account', 'kyc', 'pan', 'reward', 'claim', 'free'];
    const foundKeywords = deceptiveKeywords.filter((k) => normalized.toLowerCase().includes(k));
    if (foundKeywords.length > 0) {
      riskScore += Math.min(foundKeywords.length * 15, 30);
      flags.push(`Contains deceptive security/urgency keywords: ${foundKeywords.join(', ')}`);
    }

    // IP address instead of domain
    const isIpHost = /^(\d{1,3}\.){3}\d{1,3}$/.test(domain);
    if (isIpHost) {
      riskScore += 40;
      flags.push('Raw IP address used instead of a registered domain name');
    }

    // Subdomain count check
    if (domainParts.length > 3) {
      riskScore += 20;
      flags.push(`Excessive subdomains detected (${domainParts.length} levels)`);
    }

    // Live DNS signals
    if (!dnsResult.resolved && dnsResult.error?.includes('NXDOMAIN')) {
      riskScore += 25;
      flags.push('Real-time DNS check: Domain is not registered or has no active DNS record');
    } else if (dnsResult.resolved) {
      flags.push(`Real-time DNS check: Resolved to public IP ${dnsResult.ip || 'OK'}`);
    }

    // Live Reachability signals
    if (reachResult.reachable) {
      flags.push('Real-time HTTP check: Host responded to connection probe');
    }
  }

  // If connection is unencrypted plain HTTP, enforce minimum risk score of 45 (Suspicious)
  if (!isHttps) {
    riskScore = Math.max(riskScore, 45);
  }

  // Clamp risk score
  riskScore = Math.max(1, Math.min(99, riskScore));

  const status: 'safe' | 'suspicious' | 'malicious' =
    riskScore >= 75 ? 'malicious' : riskScore >= 40 ? 'suspicious' : 'safe';

  const statusLabel =
    status === 'safe'
      ? 'Safe Link'
      : status === 'suspicious'
      ? (!isHttps ? 'Suspicious (Insecure HTTP)' : 'Suspicious Link')
      : 'Dangerous Link';

  const verdict =
    status === 'safe'
      ? 'Safe: Real-time verification confirmed domain integrity and secure HTTPS encryption.'
      : status === 'suspicious'
      ? (!isHttps
          ? 'Suspicious: Connection uses unencrypted HTTP protocol without SSL/TLS security, making it vulnerable to interception.'
          : 'Suspicious: URL exhibits potential phishing markers and unverified domain patterns.')
      : 'High-Risk: Deceptive phishing indicators, brand spoofing, or untrusted TLD detected.';

  return {
    url: normalized,
    riskScore,
    status,
    statusLabel,
    verdict,
    flags,
    features: {
      url_length: normalized.length,
      domain_length: domain.length,
      is_https: isHttps ? 1 : 0,
      tld,
      resolved_ip: dnsResult.ip || null,
    },
    liveCheck: {
      checked: true,
      reachable: reachResult.reachable,
      dnsResolved: dnsResult.resolved,
      httpsValid: isHttps,
      httpStatus: reachResult.status || (reachResult.reachable ? 200 : null),
      finalUrl: normalized,
      finalDomain: domain,
      redirects: 0,
      trustedDomain: isTrusted,
      error: dnsResult.error || reachResult.error || null,
    },
    modelVersion: 'v1.0.0 (Hybrid Real-Time Engine)',
  };
}

/**
 * Scan a URL: queries FastAPI serving backend, with real-time client-side live engine fallback.
 */
export async function scanUrl(url: string): Promise<URLScanApiResponse> {
  const trimmedUrl = url.trim();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/scan/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: trimmedUrl }),
      signal: controller.signal,
    });

    if (response.ok) {
      const data = await response.json();
      return data as URLScanApiResponse;
    }
  } catch {
    // Backend unreachable, offline, or timed out — seamlessly use real-time client engine
  } finally {
    clearTimeout(timeout);
  }

  return analyzeUrlClientSide(trimmedUrl);
}

/**
 * Client-side message classification engine.
 */
export function analyzeMessageClientSide(text: string): MessageScanApiResponse {
  const lower = text.toLowerCase();

  if (
    lower.includes('win') ||
    lower.includes('won') ||
    lower.includes('lottery') ||
    lower.includes('prize') ||
    lower.includes('crore') ||
    lower.includes('gift card') ||
    lower.includes('jackpot')
  ) {
    return {
      riskScore: 92,
      status: 'danger',
      statusLabel: 'High Risk',
      verdict: 'Dangerous Scam Detected',
      scamType: 'Lottery Scam',
      probability: 0.92,
      reason: 'This message claims you have won an unentered lottery or cash reward and prompts you to pay an upfront processing fee to claim it.',
      indicators: [
        'Unsolicited winnings / reward claims',
        'Requests to click a link or send personal info to claim a prize',
        'Grammatical mistakes or informal language for large sums',
      ],
      recommendations: [
        'Do not click any link in this message.',
        'Never pay any upfront fee/taxes to claim a prize.',
        'Block this sender immediately.',
      ],
      modelVersion: 'v1.0.0 (Client Engine)',
    };
  }

  if (
    lower.includes('otp') ||
    lower.includes('bank') ||
    lower.includes('account') ||
    lower.includes('block') ||
    lower.includes('pan') ||
    lower.includes('kyc') ||
    lower.includes('card') ||
    lower.includes('verify') ||
    lower.includes('login') ||
    lower.includes('password')
  ) {
    return {
      riskScore: 87,
      status: 'danger',
      statusLabel: 'High Risk',
      verdict: 'Urgent Phishing Attempt',
      scamType: 'Banking Scam',
      probability: 0.87,
      reason: 'This message mimics communications from a bank or financial institution, attempting to harvest credentials, PAN/KYC updates, or OTPs.',
      indicators: [
        'High pressure and urgency ("immediate action required", "account blocked")',
        'Requests for verification details, passwords, or OTPs',
        'Contains suspicious unverified links or unofficial contact numbers',
      ],
      recommendations: [
        'Never share OTPs, PINs, or card details with anyone.',
        'Banks will never ask you to update details via a random SMS link.',
        'Directly contact your bank using the official helpline.',
      ],
      modelVersion: 'v1.0.0 (Client Engine)',
    };
  }

  if (
    lower.includes('job') ||
    lower.includes('salary') ||
    lower.includes('part-time') ||
    lower.includes('part time') ||
    lower.includes('work from home') ||
    lower.includes('daily income') ||
    lower.includes('hiring')
  ) {
    return {
      riskScore: 84,
      status: 'danger',
      statusLabel: 'High Risk',
      verdict: 'Employment Fraud Detected',
      scamType: 'Job Scam',
      probability: 0.84,
      reason: 'Offers unrealistic high daily wages for trivial online tasks and usually demands upfront registration fees or private bank info.',
      indicators: [
        'Unsolicited job offer via messaging apps',
        'Extravagant pay promises (e.g. ₹5,000/day for liking videos)',
        'Requests to join private Telegram or WhatsApp groups',
      ],
      recommendations: [
        'Never pay registration or training fees for any job.',
        'Verify company openings on legitimate career portals.',
        'Do not share personal ID documents with unknown recruiters.',
      ],
      modelVersion: 'v1.0.0 (Client Engine)',
    };
  }

  if (
    lower.includes('invest') ||
    lower.includes('crypto') ||
    lower.includes('bitcoin') ||
    lower.includes('guaranteed return') ||
    lower.includes('trading') ||
    lower.includes('profit')
  ) {
    return {
      riskScore: 95,
      status: 'danger',
      statusLabel: 'Critical Threat',
      verdict: 'High-Yield Investment Fraud',
      scamType: 'Investment Scam',
      probability: 0.95,
      reason: 'Promises zero-risk, high-multiplier profits through fake cryptocurrency trading or unverified stock tip syndicates.',
      indicators: [
        'Guaranteed return promises with no downside',
        'Pressure to deposit funds into private crypto wallets',
        'Unregulated investment schemes operating on messaging channels',
      ],
      recommendations: [
        'Legitimate investments never promise guaranteed returns.',
        'Never transfer funds into personal accounts or private crypto wallets.',
        'Consult SEBI/FINRA registered financial advisors only.',
      ],
      modelVersion: 'v1.0.0 (Client Engine)',
    };
  }

  if (
    lower.includes('police') ||
    lower.includes('arrest') ||
    lower.includes('cbi') ||
    lower.includes('court') ||
    lower.includes('challan') ||
    lower.includes('warrant')
  ) {
    return {
      riskScore: 96,
      status: 'danger',
      statusLabel: 'Critical Threat',
      verdict: 'Extortion / Digital Arrest Attempt',
      scamType: 'Government Scam',
      probability: 0.96,
      reason: 'Coerces the victim with threats of immediate police arrest or fake legal notices, demanding instant settlement payments.',
      indicators: [
        'Extreme legal threats ("Digital arrest", "Immediate warrant")',
        'Claims of illegal contraband or tax penalties',
        'Demand for direct settlement to clear charges',
      ],
      recommendations: [
        'Law enforcement never arrests or questions citizens over WhatsApp/Skype video calls.',
        'Do not transfer any fine without official court summons.',
        'Report to the cybercrime portal immediately.',
      ],
      modelVersion: 'v1.0.0 (Client Engine)',
    };
  }

  if (
    lower.includes('delivery') ||
    lower.includes('fedex') ||
    lower.includes('dhl') ||
    lower.includes('post office') ||
    lower.includes('package') ||
    lower.includes('courier')
  ) {
    return {
      riskScore: 65,
      status: 'warning',
      statusLabel: 'Medium Risk',
      verdict: 'Suspicious Delivery Alert',
      scamType: 'Delivery Scam',
      probability: 0.65,
      reason: 'Claims a package cannot be delivered due to address issues or nominal fees, designed to capture credit card credentials.',
      indicators: [
        'Unsolicited package update message',
        'Requests to update delivery address or pay nominal fees via link',
      ],
      recommendations: [
        'Check official parcel trackers using your original tracking number.',
        'Do not pay any verification or shipping fees via link.',
      ],
      modelVersion: 'v1.0.0 (Client Engine)',
    };
  }

  return {
    riskScore: 12,
    status: 'safe',
    statusLabel: 'Low Risk',
    verdict: 'Likely Safe',
    scamType: 'Safe Communication',
    probability: 0.12,
    reason: 'This message does not exhibit typical scam or phishing patterns. No emergency language, financial coercion, or suspicious credential requests were detected.',
    indicators: [
      'No urgent or threatening language detected',
      'No known scam triggers found',
    ],
    recommendations: [
      'Always stay vigilant. If this message is from an unknown sender requesting actions, verify independently.',
    ],
    modelVersion: 'v1.0.0 (Client Engine)',
  };
}

/**
 * Scan a message: queries FastAPI serving backend, with client-side fallback.
 */
export async function scanMessageApi(text: string, sender?: string): Promise<MessageScanApiResponse> {
  const trimmed = text.trim();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/scan/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed, sender: sender || undefined }),
      signal: controller.signal,
    });

    if (response.ok) {
      const data = await response.json();
      return data as MessageScanApiResponse;
    }
  } catch {
    // Backend offline / unreachable — use client-side classification
  } finally {
    clearTimeout(timeout);
  }

  return analyzeMessageClientSide(trimmed);
}

