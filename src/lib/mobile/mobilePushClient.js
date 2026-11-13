/**
 * Renderer-safe client for the Desktop Mobile Push API.
 *
 * The renderer never talks to the Cloud Push Gateway directly: the Gateway
 * requires a host bearer credential that only lives in the Desktop's backend
 * process. This module therefore forwards every intent to
 * `/api/mobile/push` and lets the backend own the signing, the credential
 * storage and the raw device tokens.
 *
 * Importing this file is safe in the browser — it only depends on the pure
 * shared contract and on the platform bridge.
 */

import { request } from "../platform/platformBridge.js";
import { mapNotificationTypeToPushSource } from "./mobilePushContract.js";

const PUSH_ROUTE = "/api/mobile/push";

async function postAction(action, payload = {}) {
  try {
    const res = await request(PUSH_ROUTE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await res.json().catch(() => null);
    return data && typeof data === "object" ? data : { ok: false, error: "invalid-response" };
  } catch (err) {
    return { ok: false, error: err?.message || "push request failed" };
  }
}

/** Aggregated push state (Gateway URL, host binding, registered devices). */
export async function fetchMobilePushStatus() {
  try {
    const res = await request(PUSH_ROUTE, { method: "GET" });
    const data = await res.json().catch(() => null);
    return data && typeof data === "object" ? data : { ok: false, error: "invalid-response" };
  } catch (err) {
    return { ok: false, error: err?.message || "push status request failed" };
  }
}

/**
 * Point the Desktop at a Push Gateway instance.
 * @param {{gatewayUrl?: string, enabled?: boolean}} patch
 */
export function saveMobilePushConfig(patch = {}) {
  return postAction("save-config", patch);
}

/**
 * Hand a fresh device token to the Desktop, which registers it with the Gateway.
 * @param {{deviceId: string, platform: string, token: string, apnsEnvironment?: string, filter?: object, deviceName?: string}} input
 */
export function registerMobilePushDevice(input = {}) {
  return postAction("register-device", input);
}

/**
 * @param {string} deviceId
 */
export function unregisterMobilePushDevice(deviceId) {
  return postAction("unregister-device", { deviceId });
}

/**
 * Update the per-device delivery preferences.
 * @param {string} deviceId
 * @param {object} filter
 */
export function updateMobilePushFilter(deviceId, filter = {}) {
  return postAction("update-filter", { deviceId, filter });
}

/**
 * Fire a push that ignores the "desktop away" preference.
 * @param {string} [deviceId]
 */
export function sendMobileTestPush(deviceId) {
  return postAction("send-test-push", { deviceId });
}

/**
 * Tell the Gateway that a session was handled on the Desktop.
 * @param {string | string[]} sessionIds
 */
export function dismissMobilePushSessions(sessionIds) {
  const list = (Array.isArray(sessionIds) ? sessionIds : [sessionIds])
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return postAction("dismiss", { sessionIds: list });
}

/**
 * Human-readable text for the reasons the Gateway reports per device.
 *
 * The reason codes are stable contract values; this text is what the Desktop
 * shows, so an operator can see at a glance what is missing — usually the
 * provider credentials that live on the Gateway, not on the phone.
 */
const PUSH_DELIVERY_REASON_TEXT = Object.freeze({
  "ios-provider-not-configured": "the Gateway has no APNs credentials",
  "android-provider-not-configured": "the Gateway has no FCM credentials",
  "provider-not-configured": "the Gateway has no push provider credentials",
  "registration-dead": "the device token is no longer valid",
  "registration-expired": "the device registration has expired",
  "filtered-by-device-preference": "the device turned this notification off",
  "unknown-registration": "the Gateway does not know this device",
  "session-dismissed": "the notification was already handled on the Desktop",
});

/**
 * Collect the distinct reasons why a push did not reach a device.
 * @param {Array<{status?: string, reason?: string}> | null | undefined} results
 * @returns {string[]}
 */
function collectDeliveryReasons(results) {
  const list = Array.isArray(results) ? results : [];
  const reasons = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    if (entry.status === "delivered") continue;
    const reason = String(entry.reason || entry.status || "").trim();
    if (!reason || reasons.includes(reason)) continue;
    reasons.push(reason);
  }
  return reasons.map((reason) => PUSH_DELIVERY_REASON_TEXT[reason] || reason);
}

/**
 * Turn a push send response into a sentence for the Desktop UI.
 *
 * The Gateway reports *why* a device was skipped, so the notice names that
 * reason instead of claiming that the delivery filter matched nothing.
 *
 * @param {{delivered?: number, results?: Array}} [result]
 * @returns {string}
 */
export function formatPushDeliveryNotice(result = {}) {
  const delivered = Number(result?.delivered || 0);
  const reasons = collectDeliveryReasons(result?.results);
  const envelopeReason = String(result?.reason || result?.skipped || "").trim();
  if (reasons.length === 0 && envelopeReason && PUSH_DELIVERY_REASON_TEXT[envelopeReason]) {
    reasons.push(PUSH_DELIVERY_REASON_TEXT[envelopeReason]);
  }
  if (delivered > 0) {
    const suffix = reasons.length > 0 ? ` Not delivered to the rest: ${reasons.join("; ")}.` : "";
    return `Test push delivered to ${delivered} device(s).${suffix}`;
  }
  if (reasons.length > 0) {
    return `Test push was not delivered: ${reasons.join("; ")}.`;
  }
  return "Test push accepted but no device matched the delivery filter.";
}

/**
 * Forward a Desktop notification to the paired phones.
 *
 * The backend maps the AGMon notification type onto a push source, so the
 * renderer only forwards the notification itself.
 *
 * @param {{
 *   type: string,
 *   title?: string,
 *   message?: string,
 *   sessionId?: string | null,
 *   sound?: boolean,
 *   force?: boolean,
 * }} notification
 * @param {{ desktopAway?: boolean }} [options]
 */
export function dispatchMobilePushForNotification(notification = {}, options = {}) {
  // Only notification types that map onto a push source reach the backend —
  // this keeps the common case free of an IPC round trip.
  if (!mapNotificationTypeToPushSource(notification.type)) {
    return Promise.resolve({ ok: true, skipped: "no-push-source" });
  }
  return postAction("dispatch", {
    type: notification.type,
    title: notification.title,
    message: notification.message,
    sessionId: notification.sessionId || null,
    sound: notification.sound,
    force: notification.force,
    desktopAway: Boolean(options.desktopAway),
    awayOnly: Boolean(options.awayOnly),
  });
}
