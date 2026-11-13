/**
 * Desktop Away State Engine (AGMon Pattern)
 * Tracks user presence and interaction activity with a configurable idle threshold (default: 180s).
 * Prevents notification fatigue by suppressing disruptive popups/sounds while the developer is actively typing.
 */

export const DEFAULT_AWAY_THRESHOLD_MS = 180 * 1000; // 180 seconds (3 minutes)

export const USER_PRESENCE_STATES = {
  ACTIVE: "ACTIVE", // User is focused on AGMon and interacted within threshold
  BACKGROUND: "BACKGROUND", // User is active recently, but AGMon tab/window is hidden or blurred
  AWAY: "AWAY", // No interaction for >= 180s or system locked
};

export class DesktopAwayStateMonitor {
  /**
   * @param {{ idleThresholdMs?: number }} [options]
   */
  constructor(options = {}) {
    this.idleThresholdMs =
      typeof options.idleThresholdMs === "number" && options.idleThresholdMs > 0
        ? options.idleThresholdMs
        : DEFAULT_AWAY_THRESHOLD_MS;
    this.lastActivityAt = Date.now();
    this.isWindowFocused = true;
    this.isPageVisible = true;
    this.isSystemLocked = false;
    this.listeners = new Set();
    this.activityListeners = new Set();
    this._boundRecordActivity = () => this.recordActivity();
    this._boundVisibilityChange = this._handleVisibilityChange.bind(this);
    this._boundFocus = () => {
      this.isWindowFocused = true;
      this.recordActivity();
    };
    this._boundBlur = () => {
      this.isWindowFocused = false;
      this._notifyListeners();
    };
    this._attached = false;
  }

  /**
   * Attach DOM event listeners when running in browser context
   */
  attachBrowserListeners() {
    if (this._attached || typeof window === "undefined") return;
    this._attached = true;

    const activityEvents = [
      "keydown",
      "mousedown",
      "mousemove",
      "wheel",
      "touchstart",
      "pointerdown",
    ];
    for (const evt of activityEvents) {
      window.addEventListener(evt, this._boundRecordActivity, { passive: true });
    }
    window.addEventListener("focus", this._boundFocus);
    window.addEventListener("blur", this._boundBlur);
    if (typeof document !== "undefined") {
      this.isPageVisible = document.visibilityState !== "hidden";
      document.addEventListener("visibilitychange", this._boundVisibilityChange);
    }
  }

  detachBrowserListeners() {
    if (!this._attached || typeof window === "undefined") return;
    this._attached = false;

    const activityEvents = [
      "keydown",
      "mousedown",
      "mousemove",
      "wheel",
      "touchstart",
      "pointerdown",
    ];
    for (const evt of activityEvents) {
      window.removeEventListener(evt, this._boundRecordActivity);
    }
    window.removeEventListener("focus", this._boundFocus);
    window.removeEventListener("blur", this._boundBlur);
    if (typeof document !== "undefined") {
      document.removeEventListener(
        "visibilitychange",
        this._boundVisibilityChange
      );
    }
  }

  _handleVisibilityChange() {
    if (typeof document !== "undefined") {
      this.isPageVisible = document.visibilityState !== "hidden";
      if (this.isPageVisible) {
        this.lastActivityAt = Date.now();
      }
      this._notifyListeners();
    }
  }

  /**
   * Record user interaction timestamp
   * @param {number} [now]
   */
  recordActivity(now = Date.now()) {
    const prev = this.getState(now);
    this.lastActivityAt = typeof now === "number" ? now : Date.now();
    for (const listener of this.activityListeners) {
      try { listener(); } catch {}
    }
    const next = this.getState(this.lastActivityAt);
    if (prev.presence !== next.presence) {
      this._notifyListeners(next);
    }
  }

  /**
   * Explicitly mark system screen lock status (from Tauri / OS bridge)
   * @param {boolean} locked
   */
  setSystemLocked(locked) {
    this.isSystemLocked = Boolean(locked);
    this._notifyListeners();
  }

  /**
   * Computes current user presence state and notification delivery policy.
   * @param {number} [now]
   * @returns {{
   *   presence: "ACTIVE" | "BACKGROUND" | "AWAY",
   *   idleMs: number,
   *   idleSeconds: number,
   *   isAway: boolean,
   *   shouldSendDesktopNotification: boolean,
   *   shouldPlaySubtleSound: boolean,
   *   shouldShowVisualBadge: boolean
   * }}
   */
  getState(now = Date.now()) {
    const idleMs = Math.max(0, now - this.lastActivityAt);
    const idleSeconds = Math.floor(idleMs / 1000);
    const isIdleExpired = idleMs >= this.idleThresholdMs;

    let presence = USER_PRESENCE_STATES.ACTIVE;
    if (this.isSystemLocked || isIdleExpired) {
      presence = USER_PRESENCE_STATES.AWAY;
    } else if (!this.isPageVisible || !this.isWindowFocused) {
      presence = USER_PRESENCE_STATES.BACKGROUND;
    }

    return {
      presence,
      idleMs,
      idleSeconds,
      isAway: presence === USER_PRESENCE_STATES.AWAY,
      // Never spam OS push notifications while user is actively typing inside AGMon
      shouldSendDesktopNotification:
        presence === USER_PRESENCE_STATES.AWAY ||
        presence === USER_PRESENCE_STATES.BACKGROUND,
      shouldPlaySubtleSound: presence !== USER_PRESENCE_STATES.ACTIVE,
      shouldShowVisualBadge: true,
    };
  }

  subscribeActivity(fn) {
    this.activityListeners.add(fn);
    return () => this.activityListeners.delete(fn);
  }

  subscribe(fn) {
    if (typeof fn === "function") {
      this.listeners.add(fn);
    }
    return () => this.listeners.delete(fn);
  }

  _notifyListeners(state = this.getState()) {
    for (const fn of this.listeners) {
      try {
        fn(state);
      } catch {}
    }
  }
}

let globalAwayMonitor = null;

export function getDesktopAwayMonitor(options = {}) {
  if (!globalAwayMonitor) {
    globalAwayMonitor = new DesktopAwayStateMonitor(options);
    globalAwayMonitor.attachBrowserListeners();
  }
  return globalAwayMonitor;
}
