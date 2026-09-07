/**
 * AppAlertModal — cross-platform replacement for React Native's `Alert.alert`.
 *
 * `Alert.alert` is a complete no-op on web (react-native-web ships an empty
 * stub), so any screen that relies on it silently does nothing when run with
 * `expo start --web`. This component renders an actual overlay using
 * React Native's `Modal`, which IS implemented on web, so the same dialog
 * works on iOS, Android, and web.
 *
 * Usage: render <AppAlertModal /> once per screen, keep its config in state,
 * and use the `showAlert` helper below to trigger it — mirrors the shape of
 * Alert.alert(title, message, buttons) so call sites stay familiar.
 */
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors, Spacing } from '../../theme';
import { FontSize, FontWeight } from '../../theme/typography';

export interface AppAlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AppAlertConfig {
  title: string;
  message?: string;
  buttons?: AppAlertButton[];
}

interface AppAlertModalProps {
  config: AppAlertConfig | null;
  onClose: () => void;
}

export default function AppAlertModal({ config, onClose }: AppAlertModalProps) {
  const visible = !!config;
  const buttons: AppAlertButton[] = config?.buttons?.length
    ? config.buttons
    : [{ text: 'OK', style: 'default' }];

  const handlePress = (button: AppAlertButton) => {
    onClose();
    button.onPress?.();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {config ? (
            <>
              <Text style={styles.title}>{config.title}</Text>
              {config.message ? <Text style={styles.message}>{config.message}</Text> : null}
              <View style={styles.buttonRow}>
                {buttons.map((button, index) => (
                  <TouchableOpacity
                    key={`${button.text}-${index}`}
                    style={[
                      styles.button,
                      index < buttons.length - 1 && styles.buttonSpacing,
                      button.style === 'cancel' && styles.buttonCancel,
                    ]}
                    onPress={() => handlePress(button)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        button.style === 'destructive' && styles.buttonTextDestructive,
                        button.style === 'cancel' && styles.buttonTextCancel,
                      ]}
                    >
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  buttonSpacing: {
    marginRight: Spacing.sm,
  },
  buttonCancel: {
    backgroundColor: Colors.surfaceSecondary,
  },
  buttonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textInverse,
  },
  buttonTextCancel: {
    color: Colors.textPrimary,
  },
  buttonTextDestructive: {
    color: Colors.danger,
  },
});
