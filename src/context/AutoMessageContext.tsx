/**
 * AutoMessageContext.tsx
 * ----------------------
 * React Context providing app-wide state and actions for Automatic Message Scam Detection:
 * - Protection enabled/disabled state & channel preferences
 * - Active floating alert notification banner state
 * - Simulation trigger for live testing (WhatsApp, SMS, Telegram)
 * - Intercepted alert history
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  AutoScamAlert,
  AutoShieldConfig,
  getAutoShieldConfig,
  saveAutoShieldConfig,
  processIncomingMessage,
  addAlertListener,
  MessageChannel,
  IncomingMessage,
} from '../services/autoMessageDetector';
import {
  startNativeNotificationListener,
  openAndroidNotificationAccessSettings,
} from '../services/nativeNotificationListener';

interface AutoMessageContextValue {
  config: AutoShieldConfig;
  updateConfig: (update: Partial<AutoShieldConfig>) => Promise<void>;
  activeAlert: AutoScamAlert | null;
  dismissAlert: () => void;
  interceptedAlerts: AutoScamAlert[];
  isProcessing: boolean;
  simulateIncomingMessage: (
    channel: MessageChannel,
    sender: string,
    text: string
  ) => Promise<{ isScam: boolean; alert?: AutoScamAlert; resultPayload: any }>;
  openNotificationSettings: () => Promise<boolean>;
}

const AutoMessageContext = createContext<AutoMessageContextValue | null>(null);

export function AutoMessageProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AutoShieldConfig>({
    enabled: true,
    channels: { sms: true, whatsapp: true, telegram: true },
    minRiskThreshold: 40,
  });
  const [activeAlert, setActiveAlert] = useState<AutoScamAlert | null>(null);
  const [interceptedAlerts, setInterceptedAlerts] = useState<AutoScamAlert[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Load config on mount
  useEffect(() => {
    getAutoShieldConfig().then(setConfig);
  }, []);

  // Listen to alert events emitted by the detection engine
  useEffect(() => {
    const unsubscribe = addAlertListener((alert) => {
      setActiveAlert(alert);
      setInterceptedAlerts((prev) => [alert, ...prev.slice(0, 19)]);
    });
    return unsubscribe;
  }, []);

  // Auto-dismiss active alert after 10 seconds
  useEffect(() => {
    if (!activeAlert) return;
    const timer = setTimeout(() => {
      setActiveAlert(null);
    }, 10000);
    return () => clearTimeout(timer);
  }, [activeAlert]);

  const updateConfig = useCallback(async (update: Partial<AutoShieldConfig>) => {
    const updated = await saveAutoShieldConfig(update);
    setConfig(updated);
  }, []);

  const dismissAlert = useCallback(() => {
    setActiveAlert(null);
  }, []);

  const simulateIncomingMessage = useCallback(
    async (channel: MessageChannel, sender: string, text: string) => {
      setIsProcessing(true);
      try {
        const incoming: IncomingMessage = {
          sender,
          text,
          channel,
          timestamp: new Date().toISOString(),
        };
        const result = await processIncomingMessage(incoming);
        return result;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  // Start Native Notification Listener for Android (WhatsApp, SMS, Telegram)
  useEffect(() => {
    const cleanup = startNativeNotificationListener();
    return cleanup;
  }, []);

  const openNotificationSettings = useCallback(async () => {
    return await openAndroidNotificationAccessSettings();
  }, []);

  return (
    <AutoMessageContext.Provider
      value={{
        config,
        updateConfig,
        activeAlert,
        dismissAlert,
        interceptedAlerts,
        isProcessing,
        simulateIncomingMessage,
        openNotificationSettings,
      }}
    >
      {children}
    </AutoMessageContext.Provider>
  );
}

export function useAutoMessage() {
  const ctx = useContext(AutoMessageContext);
  if (!ctx) {
    throw new Error('useAutoMessage must be used within an AutoMessageProvider');
  }
  return ctx;
}
