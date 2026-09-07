/**
 * SettingsScreen — App settings.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SafeScreen from '../components/common/SafeScreen';
import Header from '../components/common/Header';
import AppAlertModal, { AppAlertConfig } from '../components/common/AppAlertModal';
import { BorderRadius, Colors, Spacing } from '../theme';
import { FontSize, FontWeight } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { useAutoMessage } from '../context/AutoMessageContext';
import { clearScanHistory } from '../services/scanHistory';

const PREFS_KEY = '@scamshield/notification_prefs';

interface NotificationPrefs {
  alertNotifications: boolean;
  weeklyReport: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  alertNotifications: true,
  weeklyReport: true,
};

interface ToggleRowProps {
  icon: string;
  label: string;
  description?: string;
  value: boolean;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
}

function ToggleRow({ icon, label, description, value, disabled, onValueChange }: ToggleRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Text style={styles.rowIconText}>{icon}</Text>
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description ? <Text style={styles.rowDescription}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: Colors.border, true: Colors.primary }}
        thumbColor={Colors.surface}
      />
    </View>
  );
}

interface SettingRowProps {
  icon: string;
  label: string;
  description?: string;
  onPress?: () => void;
  destructive?: boolean;
}

function SettingRow({ icon, label, description, onPress, destructive }: SettingRowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.rowIcon}>
        <Text style={styles.rowIconText}>{icon}</Text>
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</Text>
        {description ? <Text style={styles.rowDescription}>{description}</Text> : null}
      </View>
      <Text style={styles.rowChevron}>›</Text>
    </TouchableOpacity>
  );
}

const APP_VERSION = '1.0.0';
const SUPPORT_EMAIL = 'support@scamshieldai.app';
const APP_STORE_URL = 'https://play.google.com/store/apps/details?id=com.scamshieldai.app';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { config: autoConfig, updateConfig: updateAutoConfig } = useAutoMessage();

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
  const [alertConfig, setAlertConfig] = useState<AppAlertConfig | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(PREFS_KEY);
        if (stored) {
          setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
        }
      } catch {
        // Fall back to defaults if storage read fails.
      } finally {
        setIsLoadingPrefs(false);
      }
    })();
  }, []);

  const updatePref = async (key: keyof NotificationPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      // Non-fatal — preference just won't persist across app restarts.
    }
  };

  const handleClearHistory = () => {
    setAlertConfig({
      title: 'Clear Scan History',
      message: 'This will permanently remove all past scans from this device. This cannot be undone.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearScanHistory();
            } catch (e) {
              console.warn('Failed to clear scan history:', e);
            }
            setAlertConfig({
              title: 'History Cleared',
              message: 'Your scan history has been removed.',
            });
          },
        },
      ],
    });
  };

  const handleDataPrivacy = () => {
    setAlertConfig({
      title: 'Data Privacy',
      message:
        'ScamShield AI analyzes the messages, links, and screenshots you submit on-device and via secure cloud checks to detect scams. We never sell your data, and scan content is only used to generate your results and history.',
    });
  };

  const handleAbout = () => {
    setAlertConfig({
      title: 'About ScamShield AI',
      message: `Version ${APP_VERSION}\n\nScamShield AI helps you spot phishing messages, malicious links, and fraudulent emails before they cause harm.`,
    });
  };

  const handleRateApp = () => {
    Linking.openURL(APP_STORE_URL).catch(() =>
      setAlertConfig({ title: 'Unable to Open', message: 'Could not open the app store right now.' })
    );
  };

  const handleReportBug = () => {
    const subject = encodeURIComponent('ScamShield AI — Bug Report');
    const body = encodeURIComponent(`App version: ${APP_VERSION}\n\nDescribe the issue:\n`);
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`).catch(() =>
      setAlertConfig({ title: 'Unable to Open', message: 'Could not open your email app right now.' })
    );
  };

  const handleLogout = () => {
    setAlertConfig({
      title: 'Log Out',
      message: 'Are you sure you want to log out?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: logout },
      ],
    });
  };

  return (
    <SafeScreen>
      <Header title="Settings" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {user ? (
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.sectionCard}>
            {isLoadingPrefs ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            ) : (
              <>
                <ToggleRow
                  icon="🔔"
                  label="Alert Notifications"
                  description="Get warned of detected scams"
                  value={prefs.alertNotifications}
                  onValueChange={(v) => updatePref('alertNotifications', v)}
                />
                <View style={styles.divider} />
                <ToggleRow
                  icon="📊"
                  label="Weekly Report"
                  description="Summary of your protection stats"
                  value={prefs.weeklyReport}
                  onValueChange={(v) => updatePref('weeklyReport', v)}
                />
                <View style={styles.divider} />
                <ToggleRow
                  icon="🛡️"
                  label="Auto Message Scam Shield"
                  description="Alert on suspicious SMS & WhatsApp messages"
                  value={autoConfig.enabled}
                  onValueChange={(v) => updateAutoConfig({ enabled: v })}
                />
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="🔒"
              label="Data Privacy"
              description="How your data is handled"
              onPress={handleDataPrivacy}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="🗑️"
              label="Clear Scan History"
              description="Remove all past scans"
              onPress={handleClearHistory}
              destructive
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="ℹ️"
              label="About ScamShield AI"
              description={`Version ${APP_VERSION}`}
              onPress={handleAbout}
            />
            <View style={styles.divider} />
            <SettingRow icon="⭐" label="Rate the App" description="Help us improve" onPress={handleRateApp} />
            <View style={styles.divider} />
            <SettingRow
              icon="🐛"
              label="Report a Bug"
              description="Send feedback to our team"
              onPress={handleReportBug}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <AppAlertModal config={alertConfig} onClose={() => setAlertConfig(null)} />
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.base,
  },
  profileAvatarText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  profileEmail: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: Colors.dangerLight,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.danger,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  logoutButtonText: {
    color: Colors.danger,
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
  section: {
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  loadingRow: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  rowIconText: {
    fontSize: 18,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  rowLabelDestructive: {
    color: Colors.danger,
  },
  rowDescription: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rowChevron: {
    fontSize: FontSize.xl,
    color: Colors.textTertiary,
    marginLeft: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 36 + Spacing.base + Spacing.md,
  },
});
