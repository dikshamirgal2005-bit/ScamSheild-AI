/**
 * ScamShield AI - Route Name Constants
 * Single source of truth for all navigation route names.
 */

// Bottom Tab routes
export const TABS = {
  HOME: 'Home',
  SCAN: 'Scan',
  HISTORY: 'History',
  SETTINGS: 'Settings',
} as const;

// Auth stack routes
export const AUTH = {
  LOGIN: 'Login',
  REGISTER: 'Register',
} as const;

// Stack routes (future top-level stacks)
export const STACKS = {
  MAIN: 'Main',
  ONBOARDING: 'Onboarding',
  RESULT_DETAIL: 'ResultDetail',
  MESSAGE_SCANNER: 'MessageScanner',
  MESSAGE_ANALYSIS_RESULT: 'MessageAnalysisResult',
  SCREENSHOT_SCANNER: 'ScreenshotScanner',
  URL_CHECKER: 'UrlChecker',
  URL_ANALYSIS_RESULT: 'UrlAnalysisResult',
  EMAIL_ANALYZER: 'EmailAnalyzer',
  EMAIL_ANALYSIS_RESULT: 'EmailAnalysisResult',
  SAFETY_EDUCATION: 'SafetyEducation',
  SAFETY_TOPIC_DETAIL: 'SafetyTopicDetail',
  AUTO_SHIELD: 'AutoShield',
} as const;

export type TabRouteName = (typeof TABS)[keyof typeof TABS];
export type StackRouteName = (typeof STACKS)[keyof typeof STACKS];
export type AuthRouteName = (typeof AUTH)[keyof typeof AUTH];
