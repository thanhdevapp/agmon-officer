import React from "react";
import { cn } from "@/lib/utils";
import { useDialogBehavior } from "./useDialogBehavior";

/**
 * The dialog chrome the data-heavy modals all repeat: a scrim, a centred panel,
 * and nothing else. It deliberately renders no header, body or footer — those
 * differ per dialog — so a caller keeps full control of its own internals while
 * the overlay and panel surface stop drifting apart.
 *
 * The panel is the dialog: it carries `role="dialog"`, `aria-modal`, the
 * accessible name, the Escape key, the focus entry and the focus trap. That
 * contract lives in `useDialogBehavior` so every modal behaves the same way.
 *
 * `Modal` builds on this; so do the modals that need their own body layout.
 */
// Explicit pixel widths (matching Modal.jsx) so root `html { font-size: 13px }`
// does not shrink rem-based Tailwind `max-w-*` tokens by 18.75%.
const panelWidths = {
  md: "max-w-[448px]",
  lg: "max-w-[520px]",
  xl: "max-w-[600px]",
  "2xl": "max-w-[700px]",
  "3xl": "max-w-[800px]",
  "4xl": "max-w-[920px]",
  "5xl": "max-w-[1060px]",
  "6xl": "max-w-[1180px]",
  "7xl": "max-w-[1280px]",
  wide: "max-w-[min(94vw,1360px)]",
  full: "max-w-none w-full",
};

// Modal height caps in use across the dialogs, so the value is chosen from a
// named set rather than retyped as a raw vh literal at each call site.
const panelHeights = {
  "85vh": "max-h-[85vh]",
  "86vh": "max-h-[86vh]",
  "88vh": "max-h-[88vh]",
  "90vh": "max-h-[90vh]",
  full: "h-[100dvh] max-h-[100dvh]",
};

export const ModalShell = ({
  children,
  width = "3xl",
  height,
  embedded = false,
  className,
  panelClassName,
  onClose,
  closeOnEsc,
  closeOnOverlayClick,
  onOverlayClick,
  ariaLabel,
  // The dialog role belongs on the panel, never on the scrim — accept and drop
  // these so a stray `role` cannot end up describing the backdrop.
  role: _role,
  "aria-modal": _ariaModal,
  ...props
}) => {
  const { panelProps, backdropProps } = useDialogBehavior({
    open: !embedded,
    onClose,
    closeOnEsc,
    closeOnOverlayClick,
    ariaLabel,
  });

  if (embedded) {
    return (
      <div
        className={cn(
          "w-full h-full bg-[var(--bg-editor)] text-[var(--text-main)] flex flex-col overflow-hidden",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  // `onOverlayClick` stays as the explicit escape hatch: pass a function to
  // take over the backdrop, or `null` to keep the backdrop inert. Without it
  // the backdrop dismisses the dialog, like every other modal.
  const handleOverlayClick =
    onOverlayClick !== undefined
      ? onOverlayClick || undefined
      : backdropProps.onClick;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-[var(--overlay-bg)] backdrop-blur-sm flex items-center justify-center p-4",
        className
      )}
      onClick={handleOverlayClick}
      {...props}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] shadow-2xl overflow-hidden text-[var(--text-main)]",
          // A height cap only makes sense once the panel is a flex column, which
          // is what lets the header and body share the available space.
          height ? "flex flex-col" : "",
          panelWidths[width],
          height ? panelHeights[height] : "",
          panelClassName
        )}
        {...panelProps}
      >
        {children}
      </div>
    </div>
  );
};

ModalShell.displayName = "ModalShell";

/**
 * The title row that opens each dialog: a hairline-bottomed bar holding a title
 * block on the left and the dialog's actions on the right.
 */
export const ModalHeader = ({ children, className, ...props }) => (
  <div
    className={cn(
      "px-4 py-3 bg-[var(--bg-card-inner)] border-b border-[var(--border-subtle)] flex items-center justify-between",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

ModalHeader.displayName = "ModalHeader";
