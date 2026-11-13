import {
  getDesktopAwayMonitor,
  USER_PRESENCE_STATES,
} from "./desktopAwayState.js";
import {
  isSessionQuestion,
  hasLiveTerminalQuestion,
  TRANSCRIPT_QUESTION_TTL_MS,
} from "../sessionActivity.js";

export const ATTENTION_REASONS = {
  TERMINAL_BELL: "terminal-bell",
  AGENT_COMPLETION: "agent-completion",
  AGENT_QUESTION: "agent-question",
  RUNAWAY_LOOP: "runaway-loop",
  AGENT_ERROR: "agent-error",
  MANUAL_UNREAD: "manual-mark-unread",
};

const MAX_ATTENTION_ITEMS = 100;

export class AttentionHub {
  constructor(options = {}) {
    this.awayMonitor = options.awayMonitor || getDesktopAwayMonitor();
    /** @type {Map<string, AttentionItem>} */
    this.items = new Map();
    this.listeners = new Set();
    this.onDesktopNotification = options.onDesktopNotification || null;
    this.onAudioCue = options.onAudioCue || null;
  }

  /**
   * Raise a new attention signal from an agent or terminal pane
   * @param {{
   *   sessionId: string,
   *   paneId?: string,
   *   agentName?: string,
   *   reason: string,
   *   title?: string,
   *   message?: string,
   *   severity?: "info" | "warning" | "critical",
   *   now?: number
   * }} payload
   */
  raiseAttention(payload = {}) {
    const now = typeof payload.now === "number" ? payload.now : Date.now();
    const sessionId = String(payload.sessionId || payload.paneId || "default");
    const reason = payload.reason || ATTENTION_REASONS.TERMINAL_BELL;
    const id = `${sessionId}:${reason}`;

    const awayState = this.awayMonitor.getState(now);

    const severity =
      payload.severity ||
      (reason === ATTENTION_REASONS.RUNAWAY_LOOP ||
      reason === ATTENTION_REASONS.AGENT_ERROR
        ? "critical"
        : reason === ATTENTION_REASONS.AGENT_QUESTION ||
          reason === ATTENTION_REASONS.TERMINAL_BELL
        ? "warning"
        : "info");

    const item = {
      id,
      sessionId,
      paneId: payload.paneId || null,
      agentName: payload.agentName || sessionId,
      reason,
      severity,
      title: payload.title || this._defaultTitleForReason(reason, payload.agentName || sessionId),
      message: payload.message || "",
      createdAt: now,
      acknowledged: false,
      presenceAtTrigger: awayState.presence,
      dispatchedNotification: false,
      playedAudio: false,
    };

    // Enforce bounded map size (Garbage Collection with True LRU)
    if (this.items.has(id)) {
      this.items.delete(id);
    } else if (this.items.size >= MAX_ATTENTION_ITEMS) {
      const oldestKey = this.items.keys().next().value;
      if (oldestKey) this.items.delete(oldestKey);
    }

    // Smart Filter: Only dispatch disruptive OS notification or sound when not actively typing in AGMon.
    // Suppress desktop notification when caller explicitly handles native push dispatch (e.g. notifications.js).
    const shouldDispatchPush =
      !payload.suppressDesktopNotification &&
      awayState.shouldSendDesktopNotification;

    if (shouldDispatchPush) {
      item.dispatchedNotification = true;
      if (typeof this.onDesktopNotification === "function") {
        try {
          this.onDesktopNotification(item);
        } catch {}
      } else if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification(item.title, {
            body: item.message || `Reason: ${item.reason}`,
            tag: item.id,
          });
        } catch {}
      }
    }

    if (awayState.shouldPlaySubtleSound) {
      item.playedAudio = true;
      if (typeof this.onAudioCue === "function") {
        try {
          this.onAudioCue(item);
        } catch {}
      }
    }

    this.items.set(id, item);
    this._emit();

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("agmon:attention-raised", { detail: item })
      );
    }

    return item;
  }

  _defaultTitleForReason(reason, agentName) {
    switch (reason) {
      case ATTENTION_REASONS.TERMINAL_BELL:
        return `Terminal Bell: ${agentName}`;
      case ATTENTION_REASONS.AGENT_QUESTION:
        return `${agentName} is waiting for input`;
      case ATTENTION_REASONS.AGENT_COMPLETION:
        return `${agentName} completed task`;
      case ATTENTION_REASONS.RUNAWAY_LOOP:
        return `Runaway loop detected on ${agentName}`;
      case ATTENTION_REASONS.AGENT_ERROR:
        return `${agentName} encountered an error`;
      default:
        return `Attention required: ${agentName}`;
    }
  }

  /**
   * Acknowledge and clear attention for a specific item ID or session ID
   * @param {string} idOrSessionId
   */
  acknowledgeAttention(idOrSessionId) {
    if (!idOrSessionId) return 0;
    let count = 0;
    for (const [key, item] of this.items.entries()) {
      if (
        key === idOrSessionId ||
        item.sessionId === idOrSessionId ||
        item.paneId === idOrSessionId
      ) {
        this.items.delete(key);
        count++;
      }
    }
    if (count > 0) {
      this._emit();
    }
    return count;
  }

  acknowledgeAll() {
    const count = this.items.size;
    this.items.clear();
    if (count > 0) {
      this._emit();
    }
    return count;
  }

  /**
   * Reconciles active attention items with current session states.
   * Automatically clears AGENT_QUESTION items that have been resolved, dismissed, or expired.
   *
   * @param {Array<object> | Map<string, object> | object} sessions
   * @param {number} [now]
   * @returns {number} Number of cleared items
   */
  reconcileWithSessionActivity(sessions = [], now = Date.now()) {
    let clearedCount = 0;
    const sessionList = Array.isArray(sessions)
      ? sessions
      : sessions instanceof Map
      ? Array.from(sessions.values())
      : sessions && typeof sessions === "object"
      ? Object.values(sessions)
      : [];

    const sessionLookup = new Map();
    for (const s of sessionList) {
      if (!s || typeof s !== "object") continue;
      const ids = [
        s.id,
        s.rawId,
        s.sessionId,
        s.connectionId,
        s.traceId,
        s.terminalId,
        s.cwd,
        s.worktreePath,
      ].filter(Boolean);
      for (const id of ids) {
        sessionLookup.set(String(id).trim(), s);
      }
    }

    for (const [key, item] of this.items.entries()) {
      if (item.reason === ATTENTION_REASONS.AGENT_ERROR) {
        const matchedSession =
          sessionLookup.get(item.sessionId) ||
          (item.paneId ? sessionLookup.get(item.paneId) : null);

        let shouldClear = false;
        if (matchedSession) {
          const isErrorState = ["error", "rate_limit", "quota"].includes(matchedSession.state);
          if (!isErrorState) {
            shouldClear = true;
          }
        } else {
          const age = now - (item.createdAt || 0);
          if (age >= 15 * 60 * 1000) {
            shouldClear = true;
          }
        }

        if (shouldClear) {
          this.items.delete(key);
          clearedCount++;
        }
        continue;
      }

      if (item.reason !== ATTENTION_REASONS.AGENT_QUESTION) {
        continue;
      }

      // If the terminal pane or session still has an active live prompt, never clear it
      if (
        hasLiveTerminalQuestion({
          sessionId: item.sessionId,
          paneId: item.paneId,
          id: item.sessionId,
        })
      ) {
        continue;
      }

      const matchedSession =
        sessionLookup.get(item.sessionId) ||
        (item.paneId ? sessionLookup.get(item.paneId) : null);

      let shouldClear = false;
      if (matchedSession) {
        if (!isSessionQuestion(matchedSession, now)) {
          shouldClear = true;
        }
      } else {
        const age = now - (item.createdAt || 0);
        if (age >= TRANSCRIPT_QUESTION_TTL_MS) {
          shouldClear = true;
        }
      }

      if (shouldClear) {
        this.items.delete(key);
        clearedCount++;
      }
    }

    if (clearedCount > 0) {
      this._emit();
    }

    return clearedCount;
  }

  /**
   * Convenience alias for single session reconciliation
   * @param {object} session
   * @param {number} [now]
   */
  reconcileSessionState(session, now = Date.now()) {
    return this.reconcileWithSessionActivity([session], now);
  }

  getActiveAttentionItems() {
    return Array.from(this.items.values()).filter((i) => !i.acknowledged);
  }

  getAttentionForSession(sessionId) {
    if (!sessionId) return null;
    for (const item of this.items.values()) {
      if (
        !item.acknowledged &&
        (item.sessionId === sessionId || item.paneId === sessionId)
      ) {
        return item;
      }
    }
    return null;
  }

  subscribe(fn) {
    if (typeof fn === "function") {
      this.listeners.add(fn);
    }
    return () => this.listeners.delete(fn);
  }

  _emit() {
    const list = this.getActiveAttentionItems();
    for (const fn of this.listeners) {
      try {
        fn(list);
      } catch {}
    }
  }
}

let globalAttentionHub = null;

export function getAttentionHub(options = {}) {
  if (!globalAttentionHub) {
    globalAttentionHub = new AttentionHub(options);
  }
  return globalAttentionHub;
}
