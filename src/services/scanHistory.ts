import AsyncStorage from '@react-native-async-storage/async-storage';

export type ScanType = 'message' | 'url' | 'screenshot' | 'email';
export type ScanStatus = 'danger' | 'warning' | 'safe';

export interface ScanHistoryItem {
  id: string;
  type: ScanType;
  typeLabel: string;
  typeIcon: string;
  title: string;
  snippet: string;
  riskScore: number;
  status: ScanStatus;
  statusLabel: string;
  category: string;
  timestamp: string;
  date: string;
  resultPayload: any;
  targetScreen: string;
  createdAt: string;
}

const STORAGE_KEY = '@scamshield_scan_history_v1';

export async function getScanHistory(): Promise<ScanHistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addScanToHistory(item: ScanHistoryItem): Promise<void> {
  const existing = await getScanHistory();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([item, ...existing]));
}

export async function clearScanHistory(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export function createScanId(): string {
  return `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
