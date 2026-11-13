// Proactive core notification engine for AGMon.
// Supports:
// 1. In-App Floating Toast Stack & TitleBar Notification Center Inbox
// 2. Native macOS / OS Desktop Notifications + Dock Bounce & Unread Badge via Electron IPC
// 3. Web Notification API fallback for browser mode
// 4. Proactive triggers: Terminal Stop (Process Exit & Long Command Finish), Terminal Bell,
//    Agent Task Done, Agent Waiting Input, Agent Error / Runaway Loop

import { playComplete, playAlarm, playNeedInput } from "./soundFx.js";
import { getAttentionHub, ATTENTION_REASONS } from "./attention/attentionHub.js";
import { getDesktopAwayMonitor } from "./attention/desktopAwayState.js";
import { createDeferredAgentPush } from "./mobile/deferredAgentPush.js";
import {
  dispatchMobilePushForNotification,
  dismissMobilePushSessions,
} from "./mobile/mobilePushClient.js";

export const NOTIFICATION_SETTINGS_KEY = "agmon_notification_settings_v1";
export const NOTIFICATION_HISTORY_KEY = "agmon_notification_history_v1";
export const NOTIFICATION_EVENT_NAME = "agmon:notification-center-update";
export const NOTIFICATION_TOAST_EVENT = "agmon:notification-toast";
export const NOTIFICATION_ACTION_EVENT = "agmon:notification-action";

const MAX_HISTORY_ITEMS = 100;
const DEDUPE_COOLDOWN_MS = 2000;

export const NOTIFICATION_TYPES = {
  TERMINAL_STOP: "terminal.stop",
  TERMINAL_COMMAND_DONE: "terminal.command_done",
  TERMINAL_BELL: "terminal.bell",
  AGENT_DONE: "agent.done",
  AGENT_WAITING_INPUT: "agent.waiting_input",
  AGENT_ERROR: "agent.error",
  SYSTEM_EVENT: "system.event",
};

export const DEFAULT_NOTIFICATION_SETTINGS = {
  enabled: true,
  inAppToasts: true,
  nativeDesktopPush: true,
  soundAlerts: true,
  dockBounce: true,
  deliveryPolicy: "proactive", // "proactive" | "smart_away"
  terminalCommandThresholdSec: 3,
  toastDurationSec: 6,
  rules: {
    [NOTIFICATION_TYPES.TERMINAL_STOP]: true,
    [NOTIFICATION_TYPES.TERMINAL_COMMAND_DONE]: true,
    [NOTIFICATION_TYPES.TERMINAL_BELL]: true,
    [NOTIFICATION_TYPES.AGENT_DONE]: true,
    [NOTIFICATION_TYPES.AGENT_WAITING_INPUT]: true,
    [NOTIFICATION_TYPES.AGENT_ERROR]: true,
    [NOTIFICATION_TYPES.SYSTEM_EVENT]: true,
  },
};

let memoryHistory = null;
const recentDedupeMap = new Map();
const lastNotifiedTurnBySession = new Map();
const lastNotifiedAlertBySession = new Map();
const ALERT_SESSION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes minimum between duplicate alerts for the same session
let deferredAgentPush;
function getDeferredAgentPush(monitor) {
  if (!deferredAgentPush) {
    deferredAgentPush = createDeferredAgentPush({
      send: (item, options) => {
        const settings = getNotificationSettings();
        if (settings.enabled && settings.rules?.[item.type] !== false) {
          dispatchMobilePushForNotification(item, { ...options, awayOnly: true }).catch(() => {});
        }
      },
    });
    monitor.subscribeActivity(() => deferredAgentPush.cancelAll());
  }
  return deferredAgentPush;
}

export function formatAgentNotificationContext(account = "Agent Desk", meta = {}) {
  const baseAccount = String(account || "Agent Desk").trim();
  const worktreeName =
    meta?.worktreeName ||
    (meta?.cwd ? String(meta.cwd).split("/").filter(Boolean).pop() || "" : "");
  const tabTitle = String(meta?.tabTitle || "").trim();
  const parts = [];
  if (worktreeName && !baseAccount.includes(worktreeName)) parts.push(worktreeName);
  if (tabTitle && !baseAccount.includes(tabTitle) && tabTitle !== worktreeName) parts.push(tabTitle);
  return parts.length > 0 ? `${baseAccount} [${parts.join(" · ")}]` : baseAccount;
}

export function isNotificationSupported() {
  if (typeof window === "undefined") return false;
  if (window.agmonElectron?.sendNotification) return true;
  return "Notification" in window;
}

export function getNotificationSettings() {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_SETTINGS;
  try {
    const raw = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (!raw) {
      const legacyToggle = localStorage.getItem("agmon_notifications_enabled");
      const enabled = legacyToggle === null ? true : legacyToggle === "true";
      return { ...DEFAULT_NOTIFICATION_SETTINGS, enabled };
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...parsed,
      rules: {
        ...DEFAULT_NOTIFICATION_SETTINGS.rules,
        ...(parsed?.rules || {}),
      },
    };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export function saveNotificationSettings(partial = {}) {
  const current = getNotificationSettings();
  const next = {
    ...current,
    ...partial,
    rules: {
      ...current.rules,
      ...(partial.rules || {}),
    },
  };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(next));
      localStorage.setItem("agmon_notifications_enabled", next.enabled ? "true" : "false");
      window.dispatchEvent(
        new CustomEvent(NOTIFICATION_EVENT_NAME, {
          detail: { settings: next, history: getNotificationHistory() },
        })
      );
    } catch {}
  }
  return next;
}

export function isNotificationsEnabled() {
  const settings = getNotificationSettings();
  return Boolean(settings.enabled);
}

export async function requestNotificationPermission() {
  if (typeof window === "undefined") return false;
  if (window.agmonElectron?.sendNotification) {
    saveNotificationSettings({ enabled: true, nativeDesktopPush: true });
    return true;
  }
  if (!("Notification" in window)) return false;

  try {
    const permission = await Notification.requestPermission();
    const granted = permission === "granted";
    saveNotificationSettings({ enabled: granted });
    return granted;
  } catch {
    return false;
  }
}

export async function toggleNotifications() {
  const current = getNotificationSettings();
  const nextEnabled = !current.enabled;
  if (
    nextEnabled &&
    typeof window !== "undefined" &&
    !window.agmonElectron?.sendNotification &&
    "Notification" in window &&
    Notification.permission !== "granted"
  ) {
    await requestNotificationPermission();
  }
  const updated = saveNotificationSettings({ enabled: nextEnabled });
  return updated.enabled;
}

export function getNotificationHistory() {
  if (memoryHistory) return memoryHistory;
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(NOTIFICATION_HISTORY_KEY);
    if (!raw) {
      memoryHistory = [];
      return memoryHistory;
    }
    const parsed = JSON.parse(raw);
    memoryHistory = Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY_ITEMS) : [];
    return memoryHistory;
  } catch {
    memoryHistory = [];
    return memoryHistory;
  }
}

function persistHistory(list) {
  memoryHistory = list.slice(0, MAX_HISTORY_ITEMS);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(memoryHistory));
    } catch {}
    const unreadCount = memoryHistory.filter((item) => !item.read).length;
    try {
      window.agmonElectron?.setDockBadge?.(unreadCount);
    } catch {}
    window.dispatchEvent(
      new CustomEvent(NOTIFICATION_EVENT_NAME, {
        detail: {
          history: memoryHistory,
          unreadCount,
          settings: getNotificationSettings(),
        },
      })
    );
  }
}

export function getUnreadNotificationCount() {
  return getNotificationHistory().filter((item) => !item.read).length;
}

export function markNotificationRead(id) {
  if (!id) return;
  const list = getNotificationHistory().map((item) =>
    item.id === id ? { ...item, read: true } : item
  );
  persistHistory(list);
}

export function markAllNotificationsRead() {
  const list = getNotificationHistory().map((item) => ({ ...item, read: true }));
  persistHistory(list);
}

export function clearNotificationHistory() {
  persistHistory([]);
}

/**
 * Core Proactive Notification Dispatcher
 * @param {{
 *   type?: string,
 *   severity?: "info" | "success" | "warning" | "critical",
 *   title: string,
 *   message: string,
 *   source?: string,
 *   sessionId?: string,
 *   cwd?: string,
 *   exitCode?: number | null,
 *   command?: string,
 *   durationMs?: number,
 *   actionLabel?: string,
 *   actionType?: "open-terminal" | "open-agent" | "open-settings" | null,
 *   dedupeKey?: string,
 *   force?: boolean,
 *   skipSound?: boolean
 * }} payload
 */
export function dispatchNotification(payload = {}) {
  if (typeof window === "undefined") return null;

  const settings = getNotificationSettings();
  const type = payload.type || NOTIFICATION_TYPES.SYSTEM_EVENT;

  if (!payload.force) {
    if (!settings.enabled) return null;
    if (settings.rules && settings.rules[type] === false) return null;
  }

  const now = Date.now();
  const dedupeKey =
    payload.dedupeKey || `${type}:${payload.sessionId || payload.source || ""}:${payload.title || ""}`;
  const lastTime = recentDedupeMap.get(dedupeKey) || 0;
  if (!payload.force && now - lastTime < DEDUPE_COOLDOWN_MS) {
    return null;
  }
  recentDedupeMap.set(dedupeKey, now);

  if (recentDedupeMap.size > 120) {
    for (const [k, ts] of recentDedupeMap.entries()) {
      if (now - ts > 30000) recentDedupeMap.delete(k);
    }
  }

  const severity =
    payload.severity ||
    (type === NOTIFICATION_TYPES.AGENT_ERROR ||
    (type === NOTIFICATION_TYPES.TERMINAL_STOP &&
      typeof payload.exitCode === "number" &&
      payload.exitCode !== 0)
      ? "critical"
      : type === NOTIFICATION_TYPES.TERMINAL_STOP ||
        type === NOTIFICATION_TYPES.TERMINAL_BELL ||
        type === NOTIFICATION_TYPES.AGENT_WAITING_INPUT
      ? "warning"
      : type === NOTIFICATION_TYPES.AGENT_DONE ||
        type === NOTIFICATION_TYPES.TERMINAL_COMMAND_DONE
      ? "success"
      : "info");

  const item = {
    id: `notif-${now}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    severity,
    title: payload.title || "AGMon Notification",
    message: payload.message || "",
    source: payload.source || payload.sessionId || "System",
    sessionId: payload.sessionId || null,
    cwd: payload.cwd || null,
    hotspotFile: payload.hotspotFile || null,
    turnSignature: payload.turnSignature || null,
    exitCode: typeof payload.exitCode === "number" ? payload.exitCode : null,
    command: payload.command || null,
    durationMs: typeof payload.durationMs === "number" ? payload.durationMs : null,
    actionLabel:
      payload.actionLabel ||
      (type.startsWith("terminal.")
        ? "Open Terminal"
        : type.startsWith("agent.")
        ? "Inspect Agent"
        : null),
    actionType:
      payload.actionType ||
      (type.startsWith("terminal.")
        ? "open-terminal"
        : type.startsWith("agent.")
        ? "open-agent"
        : null),
    timestamp: now,
    read: false,
  };

  // 1. Prepend to bounded notification history
  const nextHistory = [item, ...getNotificationHistory()].slice(0, MAX_HISTORY_ITEMS);
  persistHistory(nextHistory);

  // 2. Dispatch In-App Toast Event
  if (settings.inAppToasts || payload.force) {
    window.dispatchEvent(new CustomEvent(NOTIFICATION_TOAST_EVENT, { detail: item }));
  }

  // 3. Play Audio Cue if enabled and not already played by caller
  if (settings.soundAlerts && !payload.skipSound) {
    if (severity === "critical") {
      playAlarm();
    } else if (
      type === NOTIFICATION_TYPES.AGENT_WAITING_INPUT ||
      type === NOTIFICATION_TYPES.TERMINAL_BELL ||
      type === NOTIFICATION_TYPES.TERMINAL_STOP
    ) {
      playNeedInput();
    } else {
      playComplete();
    }
  }

  // 4. Bridge into AttentionHub for visual badges on Terminal tabs / Agent cards
  try {
    const attentionReason =
      type === NOTIFICATION_TYPES.TERMINAL_BELL ||
      type === NOTIFICATION_TYPES.TERMINAL_STOP ||
      type === NOTIFICATION_TYPES.TERMINAL_COMMAND_DONE
        ? ATTENTION_REASONS.TERMINAL_BELL
        : type === NOTIFICATION_TYPES.AGENT_WAITING_INPUT
        ? ATTENTION_REASONS.AGENT_QUESTION
        : type === NOTIFICATION_TYPES.AGENT_ERROR
        ? ATTENTION_REASONS.AGENT_ERROR
        : ATTENTION_REASONS.AGENT_COMPLETION;

    getAttentionHub().raiseAttention({
      sessionId: item.sessionId || item.source,
      agentName: item.source,
      reason: attentionReason,
      severity: severity === "critical" ? "critical" : severity === "warning" ? "warning" : "info",
      title: item.title,
      message: item.message,
      suppressDesktopNotification: true, // Step 5 below handles native desktop OS push centrally
      now,
    });
  } catch {}

  // 5. Native Desktop OS Push Notification (Electron IPC or Web Notification API)
  const awayState = getDesktopAwayMonitor().getState(now);
  // Warning-level agent alerts (e.g. code churn) stay in-app / badge only — avoid blasting desktop OS notification noise
  const isWarningAgentAlert =
    type === NOTIFICATION_TYPES.AGENT_ERROR && severity === "warning" && !payload.forcePush;

  const shouldPushNative =
    !isWarningAgentAlert &&
    (payload.force ||
      (settings.nativeDesktopPush &&
        (settings.deliveryPolicy === "proactive" || awayState.shouldSendDesktopNotification)));

  if (shouldPushNative) {
    const unreadCount = nextHistory.filter((n) => !n.read).length;
    if (typeof window.agmonElectron?.sendNotification === "function") {
      window.agmonElectron
        .sendNotification({
          id: item.id,
          title: item.title,
          subtitle: item.source,
          body: item.message,
          severity: item.severity,
          bounce: settings.dockBounce,
          badgeCount: unreadCount,
          actionType: item.actionType,
          sessionId: item.sessionId,
        })
        .catch(() => {});
    } else if ("Notification" in window && Notification.permission === "granted") {
      try {
        const n = new Notification(item.title, {
          body: item.message,
          icon: "/icons/icon-192x192.png",
          tag: dedupeKey,
        });
        n.onclick = () => {
          window.focus();
          triggerNotificationAction(item);
          n.close();
        };
      } catch {}
    }
  }

  // 6. Mobile Push — forward the same event to the paired phones through the
  //    Cloud Push Gateway. Fire-and-forget: a Gateway outage never blocks the
  //    Desktop notification that already went out.
  const mobileItem = { type, title: item.title, message: item.message, sessionId: item.sessionId };
  const isAgentResponse = type === NOTIFICATION_TYPES.AGENT_DONE || type === NOTIFICATION_TYPES.AGENT_WAITING_INPUT;
  const monitor = getDesktopAwayMonitor();
  const responseAway = isAgentResponse && awayState.idleMs >= 60_000;
  dispatchMobilePushForNotification(mobileItem, { desktopAway: awayState.isAway || responseAway }).catch(() => {});
  if (isAgentResponse && !awayState.isAway && !responseAway) {
    getDeferredAgentPush(monitor).enqueue(mobileItem, { lastActivityAt: monitor.lastActivityAt });
  }

  return item;
}

export function triggerNotificationAction(item) {
  if (!item || typeof window === "undefined") return;
  markNotificationRead(item.id);
  window.dispatchEvent(new CustomEvent(NOTIFICATION_ACTION_EVENT, { detail: item }));
  // The session was handled on the Desktop — stop the phone from advertising it.
  if (item.sessionId) {
    dismissMobilePushSessions(item.sessionId).catch(() => {});
  }
}

// ============================================================================
// Specialized Proactive Notification Helpers
// ============================================================================

/**
 * Proactively notify when a Terminal session process exits/stops
 */
export function notifyTerminalStopped({
  sessionId = "terminal",
  cwd = "",
  shell = "zsh",
  exitCode = 0,
  signal = null,
  reason = "",
} = {}) {
  const folderName = cwd ? cwd.split("/").filter(Boolean).pop() || cwd : "workspace";
  const shellName = shell ? shell.split("/").pop() : "shell";
  const isError = typeof exitCode === "number" && exitCode !== 0;

  return dispatchNotification({
    type: NOTIFICATION_TYPES.TERMINAL_STOP,
    severity: isError ? "critical" : "warning",
    title: isError
      ? `Terminal Stopped with Error (Exit ${exitCode})`
      : `Terminal Stopped: ${shellName} (${folderName})`,
    message:
      reason ||
      (isError
        ? `Process in "${folderName}" terminated with exit code ${exitCode}${signal ? ` (signal ${signal})` : ""}.`
        : `Terminal session "${sessionId}" in "${folderName}" has stopped (exit code ${exitCode ?? 0}).`),
    source: `${shellName} · ${folderName}`,
    sessionId,
    cwd,
    exitCode,
    actionLabel: "Open Terminal",
    actionType: "open-terminal",
    dedupeKey: `term-stop:${sessionId}:${exitCode}`,
  });
}

/**
 * Proactively notify when a foreground command inside a terminal finishes.
 */
export function notifyTerminalCommandFinished({
  sessionId = "terminal",
  cwd = "",
  command = "",
  durationMs = 0,
  exitCode = 0,
} = {}) {
  const settings = getNotificationSettings();
  const minMs = Math.max(1, Number(settings.terminalCommandThresholdSec) || 3) * 1000;
  if (durationMs > 0 && durationMs < minMs) {
    return null;
  }

  const folderName = cwd ? cwd.split("/").filter(Boolean).pop() || cwd : "terminal";
  const durationSec = durationMs ? `${(durationMs / 1000).toFixed(1)}s` : "";
  const cleanCmd = String(command || "Foreground command").trim().slice(0, 60);
  const isError = typeof exitCode === "number" && exitCode !== 0;

  return dispatchNotification({
    type: NOTIFICATION_TYPES.TERMINAL_COMMAND_DONE,
    severity: isError ? "critical" : "success",
    title: isError
      ? `Command Failed in ${folderName} (${durationSec || "exit " + exitCode})`
      : `Terminal Command Finished (${durationSec || folderName})`,
    message: `${cleanCmd} completed in ${folderName}${durationSec ? ` after ${durationSec}` : ""}.`,
    source: `Terminal · ${folderName}`,
    sessionId,
    cwd,
    command: cleanCmd,
    durationMs,
    exitCode,
    actionLabel: "View Output",
    actionType: "open-terminal",
    dedupeKey: `term-cmd:${sessionId}:${cleanCmd}`,
  });
}

/**
 * Proactively notify on Terminal ASCII Bell (\x07)
 */
export function notifyTerminalBell({
  sessionId = "terminal",
  cwd = "",
} = {}) {
  const folderName = cwd ? cwd.split("/").filter(Boolean).pop() || cwd : "terminal";
  return dispatchNotification({
    type: NOTIFICATION_TYPES.TERMINAL_BELL,
    severity: "warning",
    title: `Terminal Bell: ${folderName}`,
    message: `Terminal session "${sessionId}" emitted an attention bell in ${cwd || folderName}.`,
    source: `Terminal · ${folderName}`,
    sessionId,
    cwd,
    actionLabel: "Open Terminal",
    actionType: "open-terminal",
    dedupeKey: `term-bell:${sessionId}`,
  });
}

/**
 * Proactively notify when an AI Agent completes its task.
 * Includes terminal tab title & worktree context (#31728) and suppresses duplicate
 * notifications for the same completed turn signature when a subsequent prompt is submitted (#31820).
 */
export function notifyAgentDone(
  account = "Agent Desk",
  summary = "Task completed successfully.",
  sessionId = null,
  meta = {}
) {
  const targetKey = String(sessionId || account || "default");
  const turnSignature = meta?.turnSignature ? String(meta.turnSignature) : "";
  if (turnSignature && lastNotifiedTurnBySession.get(targetKey) === turnSignature) {
    return null;
  }
  if (turnSignature) {
    lastNotifiedTurnBySession.set(targetKey, turnSignature);
    if (lastNotifiedTurnBySession.size > 200) {
      const firstKey = lastNotifiedTurnBySession.keys().next().value;
      if (firstKey) lastNotifiedTurnBySession.delete(firstKey);
    }
  }

  const contextLabel = formatAgentNotificationContext(account, meta);
  return dispatchNotification({
    type: NOTIFICATION_TYPES.AGENT_DONE,
    severity: "success",
    title: `Agent Task Complete: ${contextLabel}`,
    message: summary,
    source: contextLabel,
    sessionId: sessionId || account,
    cwd: meta?.cwd || null,
    actionLabel: "Inspect Agent",
    actionType: "open-agent",
    dedupeKey: `agent-done:${targetKey}:${turnSignature || "latest"}`,
    skipSound: true, // caller in useFactoryTraces plays sound or we handle it
  });
}

/**
 * Proactively notify when an AI Agent stops and waits for user input / approval
 */
export function notifyAgentWaitingInput(
  account = "Agent Desk",
  promptText = "Agent is waiting for your confirmation or input.",
  sessionId = null
) {
  return dispatchNotification({
    type: NOTIFICATION_TYPES.AGENT_WAITING_INPUT,
    severity: "warning",
    title: `Waiting for Input: ${account}`,
    message: promptText,
    source: account,
    sessionId: sessionId || account,
    actionLabel: "Reply to Agent",
    actionType: "open-agent",
    dedupeKey: `agent-wait:${sessionId || account}`,
    skipSound: true,
  });
}

/**
 * Proactively notify on Agent error or rate limit
 */
export function notifyAgentAlert(
  account = "Agent Desk",
  reason = "Agent execution failed.",
  sessionId = null,
  meta = {}
) {
  const targetKey = String(sessionId || account || "default");
  const turnSignature = meta?.turnSignature ? String(meta.turnSignature) : "";
  const now = Date.now();
  const severity = meta?.severity || "critical";

  // Rehydrate lastNotifiedAlertBySession from persistent history if map is empty (e.g. after module reload)
  if (lastNotifiedAlertBySession.size === 0) {
    const history = getNotificationHistory();
    for (let i = history.length - 1; i >= 0; i--) {
      const h = history[i];
      if (h?.type === NOTIFICATION_TYPES.AGENT_ERROR && h?.sessionId) {
        lastNotifiedAlertBySession.set(String(h.sessionId), {
          turnSignature: h.turnSignature || "",
          severity: h.severity || "critical",
          timestamp: h.timestamp || 0,
        });
      }
    }
  }

  const lastAlert = lastNotifiedAlertBySession.get(targetKey);
  if (!meta?.force && lastAlert) {
    if (turnSignature && lastAlert.turnSignature === turnSignature && lastAlert.severity === severity) {
      return null;
    }
    if (now - lastAlert.timestamp < ALERT_SESSION_COOLDOWN_MS) {
      return null;
    }
  }

  const contextLabel = formatAgentNotificationContext(account, meta);
  const title = `Agent Alert: ${contextLabel}`;
  const message = reason || "Agent execution failed.";
  const actionLabel = meta?.actionLabel || "Inspect Agent";

  const dispatched = dispatchNotification({
    type: NOTIFICATION_TYPES.AGENT_ERROR,
    severity,
    title,
    message,
    source: contextLabel,
    sessionId: sessionId || account,
    cwd: meta?.cwd || null,
    turnSignature,
    actionLabel,
    actionType: "open-agent",
    dedupeKey: `agent-alert:${targetKey}:${severity}:${turnSignature || "alert"}`,
    skipSound: meta?.skipSound ?? true,
    forcePush: severity === "critical",
  });

  if (dispatched) {
    lastNotifiedAlertBySession.set(targetKey, {
      turnSignature,
      severity,
      timestamp: now,
    });
    if (lastNotifiedAlertBySession.size > 200) {
      const firstKey = lastNotifiedAlertBySession.keys().next().value;
      if (firstKey) lastNotifiedAlertBySession.delete(firstKey);
    }
  }

  return dispatched;
}

/**
 * Common Notification SDK (`notify`) — Any feature or module can call `notify(...)` or `notify.success(...)`
 */
export const notify = Object.assign(
  (payload) =>
    typeof payload === "string"
      ? dispatchNotification({ title: payload, message: "" })
      : dispatchNotification(payload),
  {
    dispatch: dispatchNotification,
    info: (title, message = "", opts = {}) =>
      dispatchNotification({ ...opts, severity: "info", title, message }),
    success: (title, message = "", opts = {}) =>
      dispatchNotification({ ...opts, severity: "success", title, message }),
    warning: (title, message = "", opts = {}) =>
      dispatchNotification({ ...opts, severity: "warning", title, message }),
    error: (title, message = "", opts = {}) =>
      dispatchNotification({ ...opts, severity: "critical", title, message }),
    terminalStop: notifyTerminalStopped,
    commandDone: notifyTerminalCommandFinished,
    bell: notifyTerminalBell,
    agentDone: notifyAgentDone,
    agentWait: notifyAgentWaitingInput,
    agentError: notifyAgentAlert,
  }
);

if (typeof window !== "undefined") {
  window.agmonNotify = notify;
}

