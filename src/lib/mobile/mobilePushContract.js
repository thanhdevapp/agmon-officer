/**
 * Shared contract between the AGMon Desktop host and the Cloud Push Gateway.
 *
 * This module is intentionally dependency-free and side-effect-free: the
 * Electron app imports it from `src/**`, and the Gateway (Cloudflare Worker +
 * Node.js) imports the very same file from the repository root. Keep it free
 * of Node-only APIs so it stays loadable inside a Worker runtime.
 */

/** Mobile platforms the Gateway can deliver to. */
export const PUSH_PLATFORMS = Object.freeze({
  IOS: "ios",
  ANDROID: "android",
});

/** Apple push environments. The Gateway routes on this value. */
export const APNS_ENVIRONMENTS = Object.freeze({
  SANDBOX: "sandbox",
  PRODUCTION: "production",
});

/** Logical origins of a push. */
export const PUSH_SOURCES = Object.freeze({
  AGENT_TASK_COMPLETE: "agent-task-complete",
  AGENT_WAITING_INPUT: "agent-waiting-input",
  AGENT_ERROR: "agent-error",
  TERMINAL_BELL: "terminal-bell",
  TEST_PUSH: "test-push",
});

/** Coarse outcome carried by a push, so the phone can render one banner shape. */
export const PUSH_STATES = Object.freeze({
  FINISHED: "finished",
  NEEDS_INPUT: "needs-input",
  ERROR: "error",
  INFO: "info",
});

/** How the Desktop maps its internal notification types onto push sources. */
export const NOTIFICATION_TYPE_TO_PUSH_SOURCE = Object.freeze({
  "agent.done": PUSH_SOURCES.AGENT_TASK_COMPLETE,
  "agent.waiting_input": PUSH_SOURCES.AGENT_WAITING_INPUT,
  "agent.error": PUSH_SOURCES.AGENT_ERROR,
  "terminal.bell": PUSH_SOURCES.TERMINAL_BELL,
});

/** Which per-device toggle gates each source. */
const SOURCE_FILTER_KEY = Object.freeze({
  [PUSH_SOURCES.AGENT_TASK_COMPLETE]: "notifyOnSessionComplete",
  [PUSH_SOURCES.AGENT_WAITING_INPUT]: "notifyOnHitlGate",
  [PUSH_SOURCES.AGENT_ERROR]: "notifyOnAgentError",
});

/** Delivery preferences stored next to every device registration. */
export const DEFAULT_PUSH_FILTER = Object.freeze({
  onlyWhenDesktopAway: true,
  sound: true,
  notifyOnHitlGate: true,
  notifyOnSessionComplete: true,
  notifyOnAgentError: true,
});

/** The Gateway collapses repeated pushes for the same logical target. */
export const PUSH_COLLAPSE_ID_MAX_LENGTH = 64;

/** Desktop-side suppression window for identical pushes. */
export const PUSH_DEDUPE_WINDOW_MS = 60_000;

/**
 * Suppression window after a notification is dismissed on Desktop so in-flight
 * bursts are muted without permanently silencing later turns of the session.
 */
export const PUSH_DISMISSAL_TTL_MS = 60_000;

/** Lifetime of a host challenge issued by the Gateway. */
export const PUSH_CHALLENGE_TTL_MS = 120_000;

/**
 * Deadline the Desktop gives the Gateway for one push request.
 *
 * The Desktop aborts the call when this expires, so the Gateway must finish
 * its own work — host authentication, store writes and the delivery to
 * APNs/FCM — inside it. A Gateway that answers later has lost the push: the
 * Desktop has already given up and never learns the outcome.
 */
export const PUSH_REQUEST_TIMEOUT_MS = 15_000;

/**
 * Time the Gateway needs for its own work around a delivery.
 *
 * Host authentication, store writes and the network time that is not spent
 * waiting on Apple all happen inside the Desktop's request deadline, so what
 * is left for the delivery itself is the deadline minus this reserve.
 */
export const GATEWAY_WORK_RESERVE_MS = 2_000;

/**
 * Coerce arbitrary input into a complete, boolean-only delivery filter.
 * Unknown keys are dropped; missing keys fall back to the defaults.
 *
 * @param {unknown} raw
 * @returns {{onlyWhenDesktopAway: boolean, sound: boolean, notifyOnHitlGate: boolean, notifyOnSessionComplete: boolean, notifyOnAgentError: boolean}}
 */
export function normalizePushFilter(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const pick = (key) => {
    const value = source[key];
    if (value === undefined || value === null) return DEFAULT_PUSH_FILTER[key];
    return Boolean(value);
  };

  return {
    onlyWhenDesktopAway: pick("onlyWhenDesktopAway"),
    sound: pick("sound"),
    notifyOnHitlGate: pick("notifyOnHitlGate"),
    notifyOnSessionComplete: pick("notifyOnSessionComplete"),
    notifyOnAgentError: pick("notifyOnAgentError"),
  };
}

/**
 * Map an AGMon notification type to a push source.
 * @param {string} type
 * @returns {string | null}
 */
export function mapNotificationTypeToPushSource(type) {
  const clean = String(type || "").trim();
  if (!clean) return null;
  return NOTIFICATION_TYPE_TO_PUSH_SOURCE[clean] || null;
}

/**
 * Coarse outcome for a push source.
 * @param {string} source
 * @returns {string}
 */
export function resolvePushStateForSource(source) {
  switch (source) {
    case PUSH_SOURCES.AGENT_TASK_COMPLETE:
      return PUSH_STATES.FINISHED;
    case PUSH_SOURCES.AGENT_WAITING_INPUT:
      return PUSH_STATES.NEEDS_INPUT;
    case PUSH_SOURCES.AGENT_ERROR:
      return PUSH_STATES.ERROR;
    default:
      return PUSH_STATES.INFO;
  }
}

/**
 * Whether the device's delivery filter allows a given push source.
 * @param {string} source
 * @param {unknown} filter
 * @returns {boolean}
 */
export function isPushSourceAllowedByFilter(source, filter) {
  const normalized = normalizePushFilter(filter);
  const key = SOURCE_FILTER_KEY[source];
  if (!key) return true;
  return normalized[key] !== false;
}

/**
 * Stable key used to suppress duplicate pushes on the Desktop side.
 * @param {{source?: string, sessionId?: string | null, title?: string}} input
 * @returns {string}
 */
export function buildPushDedupeKey(input = {}) {
  const source = String(input.source || "").trim() || "unknown";
  const sessionId = String(input.sessionId || "").trim() || "none";
  return `${source}:${sessionId}`;
}

/**
 * Collapse identifier handed to APNs (`apns-collapse-id`) and FCM
 * (`android.collapse_key`) so a newer push replaces the older one.
 *
 * @param {{source?: string, sessionId?: string | null}} input
 * @returns {string}
 */
export function buildPushCollapseId(input = {}) {
  const source = String(input.source || "").trim() || "unknown";
  const sessionId = String(input.sessionId || "").trim() || "none";
  const raw = `agmon.${source}.${sessionId}`.replace(/[^A-Za-z0-9._-]/g, "-");
  return raw.slice(0, PUSH_COLLAPSE_ID_MAX_LENGTH);
}

/**
 * Canonical message a Desktop host signs when binding to the Gateway.
 *
 * Both sides must build it identically, which is why it lives in the shared
 * contract rather than in either implementation.
 *
 * @param {{scope: string, challengeId: string, nonce: string, hostFingerprint: string}} input
 * @returns {string}
 */
export function buildHostSigningMessage({ scope, challengeId, nonce, hostFingerprint }) {
  return [scope, challengeId, nonce, hostFingerprint].join("|");
}

/**
 * Validate a device registration submitted by the Desktop host.
 *
 * @param {unknown} raw
 * @returns {{ok: boolean, errors: string[], value: object | null}}
 */
export function validateDeviceRegistration(raw) {
  const errors = [];
  const input = raw && typeof raw === "object" ? raw : {};

  const deviceId = String(input.deviceId || "").trim();
  if (!deviceId) errors.push("deviceId is required");
  if (deviceId.length > 128) errors.push("deviceId is too long");

  const platform = String(input.platform || "").trim().toLowerCase();
  if (!Object.values(PUSH_PLATFORMS).includes(platform)) {
    errors.push(`platform must be one of ${Object.values(PUSH_PLATFORMS).join(", ")}`);
  }

  const token = String(input.token || "").trim();
  if (!token) errors.push("token is required");
  if (token.length > 4096) errors.push("token is too long");

  let apnsEnvironment = String(input.apnsEnvironment || "").trim().toLowerCase();
  if (platform === PUSH_PLATFORMS.IOS) {
    if (!apnsEnvironment) apnsEnvironment = APNS_ENVIRONMENTS.PRODUCTION;
    if (!Object.values(APNS_ENVIRONMENTS).includes(apnsEnvironment)) {
      errors.push(
        `apnsEnvironment must be one of ${Object.values(APNS_ENVIRONMENTS).join(", ")}`
      );
    }
  } else {
    apnsEnvironment = "";
  }

  if (errors.length > 0) return { ok: false, errors, value: null };

  return {
    ok: true,
    errors: [],
    value: {
      deviceId,
      platform,
      token,
      apnsEnvironment,
      filter: normalizePushFilter(input.filter),
    },
  };
}

/**
 * Validate a push send envelope posted to the Gateway.
 *
 * @param {unknown} raw
 * @returns {{ok: boolean, errors: string[], value: object | null}}
 */
export function validatePushEnvelope(raw) {
  const errors = [];
  const input = raw && typeof raw === "object" ? raw : {};

  const source = String(input.source || "").trim();
  if (!source) errors.push("source is required");
  else if (!Object.values(PUSH_SOURCES).includes(source)) {
    errors.push(`source must be one of ${Object.values(PUSH_SOURCES).join(", ")}`);
  }

  const title = String(input.title || "").trim();
  if (!title) errors.push("title is required");
  if (title.length > 200) errors.push("title is too long");

  const body = String(input.body || "").trim();
  if (body.length > 1000) errors.push("body is too long");

  const state = String(input.state || "").trim() || resolvePushStateForSource(source);
  if (!Object.values(PUSH_STATES).includes(state)) {
    errors.push(`state must be one of ${Object.values(PUSH_STATES).join(", ")}`);
  }

  const sessionId = input.sessionId ? String(input.sessionId).trim() : null;
  if (sessionId && sessionId.length > 200) errors.push("sessionId is too long");

  const registrationIds = Array.isArray(input.registrationIds)
    ? input.registrationIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  if (registrationIds.length === 0) errors.push("registrationIds must not be empty");
  if (registrationIds.length > 200) errors.push("registrationIds must not exceed 200 entries");

  if (errors.length > 0) return { ok: false, errors, value: null };

  return {
    ok: true,
    errors: [],
    value: {
      source,
      state,
      title,
      body,
      sessionId: sessionId || null,
      registrationIds,
      collapseId: buildPushCollapseId({ source, sessionId }),
      dedupeKey: buildPushDedupeKey({ source, sessionId }),
      sound: input.sound === undefined ? true : Boolean(input.sound),
    },
  };
}
