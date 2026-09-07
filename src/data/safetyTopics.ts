/**
 * safetyTopics.ts — Static educational content repository for ScamShield AI.
 * Covers 6 primary cybersecurity & anti-fraud topics.
 */

export interface SafetyTopic {
  id: string;
  icon: string;
  title: string;
  category: string;
  readTime: string;
  threatLevel: 'Critical' | 'High' | 'Moderate' | 'Essential';
  threatColor: string;
  threatBg: string;
  summary: string;
  whatIsIt: string;
  howItWorks: { step: string; title: string; desc: string }[];
  redFlags: string[];
  goldenRules: string[];
  realWorldExample: {
    title: string;
    scenario: string;
    takeaway: string;
  };
  whatToDoIfTargeted: string[];
}

export const SAFETY_TOPICS: SafetyTopic[] = [
  {
    id: 'phishing',
    icon: '🎣',
    title: 'Phishing (Email, SMS & Web)',
    category: 'Social Engineering',
    readTime: '3 min read',
    threatLevel: 'Critical',
    threatColor: '#DC2626',
    threatBg: '#FEE2E2',
    summary: 'Deceptive messages and lookalike login portals designed to trick you into entering confidential passwords, card PINs, and personal identity numbers.',
    whatIsIt: 'Phishing is a social engineering cyberattack where attackers disguise themselves as reputable organizations (banks, delivery couriers, e-commerce giants) to steal sensitive information such as usernames, passwords, credit card numbers, or OTPs.',
    howItWorks: [
      {
        step: '1',
        title: 'The Bait',
        desc: 'You receive an urgent SMS or email claiming an account suspension, undelivered parcel, or unauthorized charge.',
      },
      {
        step: '2',
        title: 'The Hook',
        desc: 'The message contains a hyperlink pointing to a spoofed, lookalike website that mimics the real company\'s visual theme.',
      },
      {
        step: '3',
        title: 'Harvesting',
        desc: 'When you enter your login credentials, OTP, or debit card numbers on the fake site, they are recorded directly by the attacker.',
      },
      {
        step: '4',
        title: 'Exploitation',
        desc: 'Scammers immediately log into your real accounts or execute unauthorized fund transfers before you notice.',
      },
    ],
    redFlags: [
      'Urgent artificial deadlines ("Action required within 24 hours to prevent account closure")',
      'Sender email or header uses unfamiliar lookalike domains (.xyz, .top, .info)',
      'Generic greetings like "Dear Customer" instead of your actual registered name',
      'Spelling mistakes, awkward grammar, or mismatched logos',
    ],
    goldenRules: [
      'Never tap on login links sent via SMS, WhatsApp, or unsolicited emails.',
      'Always type the official URL directly into your browser or use the official mobile app.',
      'Enable Multi-Factor Authentication (2FA) with an authenticator app wherever possible.',
    ],
    realWorldExample: {
      title: 'The "HDFC Bank KYC Expired" SMS',
      scenario: 'You receive a text: "Dear Customer, your HDFC account is blocked due to KYC. Update Aadhaar & PAN at http://hdfc-bank-secure.xyz now." The webpage looks identical to NetBanking.',
      takeaway: 'Official banks NEVER send links to update KYC via SMS. They require visiting official net banking or a physical branch.',
    },
    whatToDoIfTargeted: [
      'Immediately change your account passwords and transaction PINs.',
      'Notify your bank\'s customer protection helpline to freeze compromised cards.',
      'Forward the phishing SMS to 1909 (Telecom Spam Registry).',
    ],
  },
  {
    id: 'impersonation',
    icon: '🎭',
    title: 'Authority & Brand Impersonation',
    category: 'Identity Fraud',
    readTime: '4 min read',
    threatLevel: 'Critical',
    threatColor: '#DC2626',
    threatBg: '#FEE2E2',
    summary: 'Scammers pose as Police, Tax authorities, RBI, customs officials, or company executives to extort money through fear and fabricated legal threats.',
    whatIsIt: 'Impersonation scams occur when fraudsters pretend to be trusted authority figures (Police officers, CBI agents, Income Tax inspectors, or senior corporate executives) to coerce victims into complying with urgent financial or data demands.',
    howItWorks: [
      {
        step: '1',
        title: 'False Authority',
        desc: 'The caller identifies themselves with fake badge numbers, official-sounding titles, and government agency names.',
      },
      {
        step: '2',
        title: 'Manufactured Crisis',
        desc: 'They claim your Aadhaar/phone was used in money laundering, drug trafficking, or an illegal international courier.',
      },
      {
        step: '3',
        title: 'Digital Arrest / Isolation',
        desc: 'They demand you stay on a continuous video call, forbidding you from talking to family members or legal advisors.',
      },
      {
        step: '4',
        title: 'Settlement Extortion',
        desc: 'They instruct you to transfer your savings into a "government verification account" or pay a fine to avoid arrest.',
      },
    ],
    redFlags: [
      'Claims of a "Digital Arrest" — no legitimate law enforcement agency conducts digital arrests over Skype or WhatsApp',
      'Demands for instant money transfers to settle legal or tax cases',
      'Extreme pressure to keep the conversation secret from family, friends, or bank staff',
      'Caller sends photos of forged police badges, court summons, or arrest warrants via WhatsApp',
    ],
    goldenRules: [
      'Law enforcement agencies NEVER arrest citizens or demand security deposits over video calls.',
      'Never transfer money to any "safe" or "verification" bank account.',
      'Hang up immediately and contact the local police station or national helpline (1930).',
    ],
    realWorldExample: {
      title: 'The "FedEx Drug Package / Digital Arrest" Scam',
      scenario: 'A caller claiming to be FedEx states a parcel sent to Taiwan in your name contains illegal passports and narcotics. They connect you to a fake police officer on Skype wearing a uniform.',
      takeaway: 'This is a 100% fabricated extortion racket. Real police never interrogate citizens on Skype or demand bond transfers.',
    },
    whatToDoIfTargeted: [
      'Disconnect the call immediately and block the number.',
      'Dial 1930 (National Cyber Crime Helpline) or report on cybercrime.gov.in.',
      'Inform family members so you have trusted emotional and rational support.',
    ],
  },
  {
    id: 'advance_fee',
    icon: '💰',
    title: 'Advance-Fee & Work-From-Home Scams',
    category: 'Financial Fraud',
    readTime: '3 min read',
    threatLevel: 'High',
    threatColor: '#D97706',
    threatBg: '#FEF3C7',
    summary: 'Promises of huge payouts, lottery jackpots, fast loan approvals, or easy part-time jobs in exchange for an upfront processing or registration fee.',
    whatIsIt: 'An advance-fee scam tricks victims into paying a small amount of money upfront with the promise of receiving a much larger sum (lottery winnings, high-paying work-from-home jobs, or pre-approved loans) later. The promised reward never arrives.',
    howItWorks: [
      {
        step: '1',
        title: 'The Grand Promise',
        desc: 'You are contacted about winning an unentered lottery, getting a pre-approved loan, or earning ₹5,000/day liking videos.',
      },
      {
        step: '2',
        title: 'Initial Small Win',
        desc: 'In task scams, you might receive a tiny payout (₹150) to build false trust and convince you it is genuine.',
      },
      {
        step: '3',
        title: 'The Advance Demand',
        desc: 'You are told to pay a "processing fee", "registration charge", "customs clearance", or "prepaid task deposit" first.',
      },
      {
        step: '4',
        title: 'The Disappearance',
        desc: 'As soon as you transfer the money, the scammers demand even larger sums or block you completely.',
      },
    ],
    redFlags: [
      'Being asked to pay money in order to receive money, prizes, or employment',
      'Unsolicited notices claiming you won a lottery or lucky draw you never entered',
      'Work-from-home offers promising ₹3,000–₹10,000/day for trivial tasks like liking YouTube videos',
      'Demands to join private Telegram channels for payment clearance',
    ],
    goldenRules: [
      'The Golden Rule: Never pay money to receive money or get a job.',
      'Legitimate companies and employers NEVER charge candidates for hiring or training.',
      'If an offer sounds too good to be true, it is almost certainly a scam.',
    ],
    realWorldExample: {
      title: 'The Telegram "YouTube Video Rating" Job',
      scenario: 'A recruiter on WhatsApp offers ₹500 per video review. After paying you ₹150 for 3 reviews, they invite you to invest ₹10,000 in a "VIP crypto task" to earn ₹30,000. Once you pay ₹10,000, your funds are locked.',
      takeaway: 'Initial small payouts are bait to lure you into depositing thousands of rupees into untraceable accounts.',
    },
    whatToDoIfTargeted: [
      'Stop all further payments immediately. Never pay "withdrawal fees" to recover trapped funds.',
      'Take screenshots of chat history, payment receipts, and bank transaction IDs.',
      'Report the transaction immediately to your bank and the 1930 Cyber Fraud helpline.',
    ],
  },
  {
    id: 'otp_safety',
    icon: '🔐',
    title: 'OTP & Credential Safety Masterclass',
    category: 'Account Security',
    readTime: '3 min read',
    threatLevel: 'Critical',
    threatColor: '#DC2626',
    threatBg: '#FEE2E2',
    summary: 'Your One-Time Password (OTP) is the ultimate key protecting your bank accounts and digital identity. Learn why you must never disclose it.',
    whatIsIt: 'One-Time Passwords (OTPs) and PINs are dynamic security codes that verify your identity for authorizing money transfers, card purchases, and account recovery. Scammers use psychological tricks to get you to read these codes out loud.',
    howItWorks: [
      {
        step: '1',
        title: 'Triggering the Code',
        desc: 'The attacker initiates a fund transfer or password reset on your bank/UPI account, causing an OTP to be sent to your phone.',
      },
      {
        step: '2',
        title: 'The Pretext Call',
        desc: 'The scammer calls claiming to be bank security, an electricity board executive, or a courier delivery agent.',
      },
      {
        step: '3',
        title: 'The Deceptive Request',
        desc: 'They ask you to "confirm the 6-digit cancellation code" or "verify your identity" to stop an imaginary fraudulent debit.',
      },
      {
        step: '4',
        title: 'Account Takeover',
        desc: 'Once you provide the code, the attacker completes the transaction and your money is immediately debited.',
      },
    ],
    redFlags: [
      'Anyone calling you and asking for a 4-digit or 6-digit verification code sent to your SMS',
      'Callers claiming you need to share OTP to "reverse a mistake" or "receive a cash refund"',
      'SMS text that says "OTP for debit of ₹..." when you are allegedly expecting a credit',
      'Requests to enter your UPI PIN to receive money (You NEVER enter a PIN to receive money)',
    ],
    goldenRules: [
      'NO bank executive, telecom rep, or government official will EVER ask for your OTP.',
      'Entering a UPI PIN ALWAYS debits money from your account. You NEVER enter a PIN to receive funds.',
      'Always read the full SMS text: check the exact amount and purpose before authorizing.',
    ],
    realWorldExample: {
      title: 'The "QR Code to Receive Payment" Trick',
      scenario: 'You post furniture on OLX for ₹5,000. A buyer sends a QR code: "Scan this and enter your UPI PIN to accept payment." The moment you enter your PIN, ₹5,000 is deducted from your balance.',
      takeaway: 'Receiving money requires NO PIN or OTP. If you enter your PIN, you are paying out.',
    },
    whatToDoIfTargeted: [
      'If you shared an OTP, call your bank immediately to block your NetBanking and debit card.',
      'Report unauthorized transactions within the "Golden Hour" on 1930 to freeze inter-bank money routing.',
      'Reset all banking and UPI passwords from a secure device.',
    ],
  },
  {
    id: 'suspicious_links',
    icon: '🔗',
    title: 'Spotting Suspicious Links & URLs',
    category: 'Web Security',
    readTime: '3 min read',
    threatLevel: 'High',
    threatColor: '#D97706',
    threatBg: '#FEF3C7',
    summary: 'Master the anatomy of malicious web addresses, typo-squatted domains, and sneaky redirect links before you tap.',
    whatIsIt: 'Malicious links (URLs) are crafted by cybercriminals to silently install malware, hijack browser sessions, or lure you onto fraudulent phishing sites designed to capture credentials.',
    howItWorks: [
      {
        step: '1',
        title: 'Domain Obfuscation',
        desc: 'Attackers register lookalike domains like "sbi-bank-verify.xyz" or use link shorteners (bit.ly) to disguise the real destination.',
      },
      {
        step: '2',
        title: 'Subdomain Trickery',
        desc: 'They use misleading subdomains like "paypal.com.login-portal.net" where the real destination domain is login-portal.net.',
      },
      {
        step: '3',
        title: 'Drive-By Download',
        desc: 'Some links trigger automatic background downloads of malicious APK files disguised as system updates.',
      },
    ],
    redFlags: [
      'Unusual domain extensions (.xyz, .top, .info, .live, .cc) for official financial services',
      'Misspelled brand names or typo-squatting (e.g., "amaz0n-deal.com" or "g00gle.com")',
      'Shortened URLs (bit.ly, tinyurl, is.gd) used in unexpected security or banking alerts',
      'Insecure connections: Links using "http://" instead of secure "https://"',
    ],
    goldenRules: [
      'Look at the ROOT domain name right before the first single slash (/).',
      'Hover over links (or long-press on mobile) to inspect the destination URL before clicking.',
      'Never download APK files or install apps from links received via chat or SMS.',
    ],
    realWorldExample: {
      title: 'The "Electricity Bill Due / APK Download" SMS',
      scenario: 'You get a text: "Electricity power will be cut tonight at 9:30 PM due to unpaid bill. Call officer or install our helper app at http://power-update.apk." The APK installs a spyware remote tool.',
      takeaway: 'Power utilities do not send APK links. Always pay bills through official state portal apps.',
    },
    whatToDoIfTargeted: [
      'Do not tap or interact with the link. Delete the message immediately.',
      'If you already opened it and entered credentials, change passwords instantly.',
      'If an APK was installed, disconnect Wi-Fi/data, boot into Safe Mode, and uninstall the app.',
    ],
  },
  {
    id: 'company_verification',
    icon: '🏛️',
    title: 'How to Verify a Company or Sender',
    category: 'Authentication Guide',
    readTime: '4 min read',
    threatLevel: 'Essential',
    threatColor: '#059669',
    threatBg: '#D1FAE5',
    summary: 'A step-by-step practical framework to independently verify whether a business, recruiter, seller, or caller is genuine.',
    whatIsIt: 'Company and sender verification is the practice of independently cross-referencing public corporate registries, email headers, domain registrations, and official telephone numbers to ensure the entity communicating with you is authentic.',
    howItWorks: [
      {
        step: '1',
        title: 'Email Header Inspection',
        desc: 'Legitimate businesses send emails from their corporate domain (@company.com), never from generic @gmail.com or @yahoo.com addresses.',
      },
      {
        step: '2',
        title: 'Registrar & MCA Check',
        desc: 'In India, legitimate companies possess a Corporate Identification Number (CIN) and GST registration verifiable on the Ministry of Corporate Affairs (mca.gov.in) portal.',
      },
      {
        step: '3',
        title: 'Independent Channel Lookup',
        desc: 'Never dial phone numbers or email addresses provided in a suspicious message. Search the official website independently.',
      },
      {
        step: '4',
        title: 'Telecom Sender ID (SMS Header)',
        desc: 'Official Indian enterprise SMS headers feature 6 characters (e.g. AD-HDFCBK, AX-ICICIB) indicating the telecom circle and verified sender entity.',
      },
    ],
    redFlags: [
      'Recruiters or companies contacting you from personal Gmail/WhatsApp accounts claiming to be Microsoft or Amazon',
      'Absence of a verifiable physical office address, registered CIN number, or public LinkedIn company presence',
      'Demands to conduct interviews exclusively via Telegram text chat without any video/voice meetings',
      'SMS alerts regarding bank accounts originating from normal 10-digit mobile numbers instead of registered headers',
    ],
    goldenRules: [
      'Always look up customer support helplines from the back of your debit card or verified websites.',
      'Check if the business has a verifiable MCA registration or verified social handles.',
      'Take 5 minutes to cross-verify: the golden rule of cybersecurity is "Trust, but Verify".',
    ],
    realWorldExample: {
      title: 'The "Amazon HR" WhatsApp Recruiter',
      scenario: 'You are contacted on WhatsApp from a +62 (Indonesia) number: "Hello, I am HR manager at Amazon India. We selected your resume for part-time role." They ask for registration fee.',
      takeaway: 'Global companies never recruit from international WhatsApp numbers or demand advance fees.',
    },
    whatToDoIfTargeted: [
      'Report and block the fake profile on WhatsApp / LinkedIn.',
      'Check the official company career portal (e.g., amazon.jobs) for real job postings.',
      'Warn friends and family about the latest scam templates.',
    ],
  },
];
