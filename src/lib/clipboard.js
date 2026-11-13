/**
 * Canonical clipboard service with graceful fallback.
 * (Claudecodeui #1642 Parity)
 *
 * Prevents false-positive success toasts by:
 * 1. Awaiting asynchronous clipboard writes rather than firing unconfirmed toasts.
 * 2. Falling back to an off-screen <textarea> execCommand("copy") when navigator.clipboard
 *    rejects (e.g. document not focused, iframe context, or non-secure HTTP LAN access).
 * 3. Showing an error notification only when BOTH modern and legacy copy methods fail.
 */

import { notify } from "./notifications.js";

/**
 * Attempts to copy text to the system clipboard using the best available method.
 *
 * @param {string} text - Text to copy
 * @returns {Promise<{ success: boolean, method: "clipboard-api" | "exec-command" | "failed", error?: string }>}
 */
export async function copyTextToClipboard(text) {
  if (text === null || text === undefined) {
    return { success: false, method: "failed", error: "Empty or invalid text provided" };
  }

  const str = String(text);

  // 1. Primary: Modern asynchronous Clipboard API
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(str);
      return { success: true, method: "clipboard-api" };
    } catch (primaryErr) {
      // Modern clipboard rejected (e.g. document not focused, permission denied, iframe restriction).
      // Fall through to legacy execCommand fallback.
    }
  }

  // 2. Fallback: Legacy hidden textarea + execCommand('copy')
  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    let textArea = null;
    try {
      textArea = document.createElement("textarea");
      textArea.value = str;
      textArea.setAttribute("readonly", "");
      textArea.setAttribute("aria-hidden", "true");
      textArea.tabIndex = -1;

      // Prevent scrolling or visual glitches
      textArea.style.position = "fixed";
      textArea.style.top = "-9999px";
      textArea.style.left = "-9999px";
      textArea.style.opacity = "0";
      textArea.style.pointerEvents = "none";
      textArea.style.zIndex = "-1";

      document.body.appendChild(textArea);

      // Select content
      textArea.focus({ preventScroll: true });
      textArea.select();
      textArea.setSelectionRange(0, str.length);

      const successful = document.execCommand("copy");
      if (successful) {
        return { success: true, method: "exec-command" };
      }
    } catch (fallbackErr) {
      return {
        success: false,
        method: "failed",
        error: fallbackErr?.message || "Legacy copy failed",
      };
    } finally {
      if (textArea && textArea.parentNode) {
        textArea.parentNode.removeChild(textArea);
      }
    }
  }

  return {
    success: false,
    method: "failed",
    error: "Clipboard API and DOM execCommand are unavailable or blocked",
  };
}

/**
 * Copies text to clipboard and only displays a success toast when the operation succeeds.
 * If the write fails on all methods, an error toast is displayed instead of a false success.
 *
 * @param {string} text - Text to copy
 * @param {Object} [options]
 * @param {string} [options.successTitle="Copied to clipboard"]
 * @param {string} [options.successDetail]
 * @param {string} [options.failureTitle="Failed to copy"]
 * @param {string} [options.failureDetail="Clipboard access was blocked or rejected by browser"]
 * @param {number} [options.durationMs=2200]
 * @param {boolean} [options.sound=false]
 * @param {boolean} [options.desktop=false]
 * @returns {Promise<boolean>} - True if copied successfully, false otherwise
 */
export async function copyTextWithNotification(text, options = {}) {
  const {
    successTitle = "Copied to clipboard",
    successDetail = String(text ?? "").slice(0, 96),
    failureTitle = "Failed to copy",
    failureDetail = "Clipboard access was blocked or rejected by browser",
    durationMs = 2200,
    sound = false,
    desktop = false,
  } = options;

  const result = await copyTextToClipboard(text);

  if (result.success) {
    notify.success(successTitle, successDetail, {
      durationMs,
      sound,
      desktop,
    });
    return true;
  }

  notify.error(failureTitle, failureDetail, {
    durationMs: Math.max(durationMs, 3000),
    sound: false,
    desktop: false,
  });
  return false;
}
