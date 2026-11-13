import { useEffect, useId, useRef } from "react";

/**
 * The shared dialog contract.
 *
 * Every modal in the workbench is a scrim plus a panel, and the panel is the
 * dialog: it owns the accessible name, the modal state, the keyboard model and
 * the focus. Centralising that here keeps `ModalShell`, `Modal` and every
 * caller on one behaviour instead of each re-deriving "what does Escape do".
 *
 * The hook is headless — it decides nothing about how a dialog looks.
 */

/** Elements that can take keyboard focus while the dialog is open. */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Regions that run their own keyboard model. A code editor or a terminal
 * consumes Tab for indentation and for traversal inside itself, so the dialog
 * trap has to stay out of the way while focus is inside one of them.
 */
const SELF_OWNED_FOCUS_SELECTOR = [
  ".monaco-editor",
  ".xterm",
  ".xterm-screen",
  "[contenteditable='true']",
].join(",");

/** Where a dialog takes its accessible name from, in priority order. */
const TITLE_SELECTOR = "h1, h2, h3, [data-dialog-title]";

function isVisible(el) {
  if (!el) return false;
  if (typeof el.getClientRects !== "function") return true;
  return el.getClientRects().length > 0;
}

function ownsItsOwnFocus(el) {
  return Boolean(el && el.closest && el.closest(SELF_OWNED_FOCUS_SELECTOR));
}

/**
 * While an interactive driver.js spotlight tour is running over a modal,
 * Escape, Tab, and backdrop clicks belong to the spotlight tour overlay so
 * dismissing or stepping through the tour never tears down the underlying dialog.
 */
function isSpotlightTourActive() {
  if (typeof document === "undefined") return false;
  return Boolean(
    document.body?.classList?.contains("driver-active") ||
      document.querySelector(".driver-popover")
  );
}

function collectFocusable(panel) {
  if (!panel) return [];
  return Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => isVisible(el) && !ownsItsOwnFocus(el)
  );
}

/**
 * @param {object} options
 * @param {boolean} options.open            Whether the dialog is currently open.
 * @param {Function} [options.onClose]      Dismiss callback.
 * @param {boolean} [options.closeOnEsc]    Defaults to "close if there is an onClose".
 * @param {boolean} [options.closeOnOverlayClick]
 * @param {string} [options.ariaLabel]      Fallback accessible name when the
 *                                          panel has no heading of its own.
 * @returns {{ panelRef: object, panelProps: object, backdropProps: object }}
 */
export function useDialogBehavior({
  open = true,
  onClose,
  closeOnEsc,
  closeOnOverlayClick,
  ariaLabel,
} = {}) {
  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const closeRef = useRef(null);
  const fallbackTitleId = useId();

  const escEnabled = closeOnEsc === undefined ? Boolean(onClose) : closeOnEsc;
  const overlayEnabled =
    closeOnOverlayClick === undefined
      ? Boolean(onClose)
      : closeOnOverlayClick;

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  // Remember what had focus before the dialog opened so it can be handed back
  // when the dialog closes.
  useEffect(() => {
    if (!open) return undefined;
    const active =
      typeof document !== "undefined" ? document.activeElement : null;
    triggerRef.current =
      active && active !== document.body && active !== document.documentElement
        ? active
        : null;

    return () => {
      const el = triggerRef.current;
      triggerRef.current = null;
      if (
        el &&
        typeof el.focus === "function" &&
        typeof document !== "undefined" &&
        document.contains(el)
      ) {
        el.focus();
      }
    };
  }, [open]);

  // Move focus into the dialog when it opens, so the keyboard starts inside it.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (panel && typeof panel.focus === "function") {
      panel.focus();
    }
  }, [open]);

  // Name the dialog after its own heading. Re-applied on every commit because
  // the heading can be swapped by the caller between renders.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const title = panel.querySelector(TITLE_SELECTOR);
    if (title) {
      if (!title.id) title.id = `${fallbackTitleId}-title`;
      panel.setAttribute("aria-labelledby", title.id);
      panel.removeAttribute("aria-label");
      return;
    }

    panel.removeAttribute("aria-labelledby");
    panel.setAttribute("aria-label", ariaLabel || "Dialog");
  });

  // Escape dismisses the dialog.
  useEffect(() => {
    if (!open || !escEnabled) return undefined;
    const onKeyDown = (e) => {
      if (e.key !== "Escape" || isSpotlightTourActive()) return;
      e.preventDefault();
      closeRef.current?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, escEnabled]);

  // Tab stays inside the dialog: at either boundary focus wraps around.
  const handlePanelKeyDown = (e) => {
    if (e.key !== "Tab" || isSpotlightTourActive()) return;
    const panel = panelRef.current;
    if (!panel) return;

    const active = typeof document !== "undefined" ? document.activeElement : null;
    if (ownsItsOwnFocus(active)) return;

    const focusable = collectFocusable(panel);
    if (focusable.length === 0) {
      e.preventDefault();
      panel.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const index = focusable.indexOf(active);

    if (e.shiftKey) {
      if (index <= 0) {
        e.preventDefault();
        last.focus();
      }
      return;
    }

    if (index === -1 || index === focusable.length - 1) {
      e.preventDefault();
      first.focus();
    }
  };

  const panelProps = {
    ref: panelRef,
    role: "dialog",
    "aria-modal": "true",
    tabIndex: -1,
    onKeyDown: handlePanelKeyDown,
  };

  const backdropProps = {
    onClick: overlayEnabled
      ? () => {
          if (isSpotlightTourActive()) return;
          closeRef.current?.();
        }
      : undefined,
  };

  return { panelRef, panelProps, backdropProps };
}

export default useDialogBehavior;
