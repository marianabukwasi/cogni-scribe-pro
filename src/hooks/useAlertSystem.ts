import { useCallback, useRef, useState, useEffect } from "react";

export interface SessionAlert {
  id: string;
  severity: "critical" | "important" | "info";
  message: string;
  timestamp: string;
  read: boolean;
  triggeredAt: string; // ISO timestamp for alert log
}

interface UseAlertSystemOptions {
  alertStyles: string[];
  onFlash?: (severity: "critical" | "important") => void;
}

export function useAlertSystem({ alertStyles }: UseAlertSystemOptions) {
  const [alerts, setAlerts] = useState<SessionAlert[]>([]);
  const [flashSeverity, setFlashSeverity] = useState<"critical" | "important" | null>(null);
  const [flashCount, setFlashCount] = useState(0);
  const [vibrationSupported] = useState(() => "vibrate" in navigator);
  const flashTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const unreadCount = alerts.filter(a => !a.read).length;
  const criticalUnread = alerts.filter(a => !a.read && a.severity === "critical").length;

  const triggerAlert = useCallback((alert: Omit<SessionAlert, "id" | "read" | "triggeredAt">) => {
    const newAlert: SessionAlert = {
      ...alert,
      id: crypto.randomUUID(),
      read: false,
      triggeredAt: new Date().toISOString(),
    };
    setAlerts(prev => [...prev, newAlert]);

    // Layer 1: Corner flash (always active)
    const sev = alert.severity === "critical" ? "critical" : "important";
    setFlashSeverity(sev);
    setFlashCount(0);

    if (flashTimerRef.current) clearInterval(flashTimerRef.current);
    let count = 0;
    flashTimerRef.current = setInterval(() => {
      count++;
      setFlashCount(count);
      if (count >= 6) { // 3 on/off cycles
        if (flashTimerRef.current) clearInterval(flashTimerRef.current);
        // Stay lit after pulsing
      }
    }, 300);

    // Layer 2: Phone vibration
    if (alertStyles.includes("phone_vibration") && vibrationSupported) {
      if (alert.severity === "critical") {
        navigator.vibrate([200, 100, 200, 100, 200]); // three short
      } else {
        navigator.vibrate([400]); // single long
      }
    }

    // Layer 3: Smartwatch — placeholder, no-op for now
  }, [alertStyles, vibrationSupported]);

  const markRead = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, read: true } : a));
    // Clear flash if all read
    const remaining = alerts.filter(a => !a.read && a.id !== alertId);
    if (remaining.length === 0) {
      setFlashSeverity(null);
      if (flashTimerRef.current) clearInterval(flashTimerRef.current);
    }
  }, [alerts]);

  const markAllRead = useCallback(() => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
    setFlashSeverity(null);
    if (flashTimerRef.current) clearInterval(flashTimerRef.current);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearInterval(flashTimerRef.current);
    };
  }, []);

  // Test alert function for settings
  const testAlert = useCallback(() => {
    triggerAlert({
      severity: "critical",
      message: "Test Alert — Drug interaction detected: St. John's Wort may interact with SSRIs and oral contraceptives.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  }, [triggerAlert]);

  return {
    alerts,
    unreadCount,
    criticalUnread,
    flashSeverity,
    flashCount,
    vibrationSupported,
    triggerAlert,
    markRead,
    markAllRead,
    testAlert,
  };
}
