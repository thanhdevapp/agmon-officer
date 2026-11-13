import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cloneElement, isValidElement } from "../../lib/solidDomRuntime.js";
import { cn } from "@/lib/utils";

/**
 * AGMon — Lightweight Popover Primitives (`Root`, `Trigger`, `Portal`, `Content`)
 * + Standalone anchored `<Popover>` component with outside-click & Escape handling.
 */

const PopoverCtx = createContext({
  open: false,
  setOpen: () => {},
  rootRef: null,
});

export function Root({ open: controlledOpen, onOpenChange, children }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const rootRef = useRef(null);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const setOpen = (next) => {
    const val = typeof next === "function" ? next(isOpen) : Boolean(next);
    setInternalOpen(val);
    onOpenChange?.(val);
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const onDown = (ev) => {
      if (rootRef.current && !rootRef.current.contains(ev.target)) {
        setOpen(false);
      }
    };
    const onKey = (ev) => {
      if (ev.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  return (
    <PopoverCtx.Provider value={{ open: isOpen, setOpen, rootRef }}>
      <div ref={rootRef} className="relative inline-block">
        {children}
      </div>
    </PopoverCtx.Provider>
  );
}

export function Trigger({ asChild = false, children }) {
  const { open, setOpen } = useContext(PopoverCtx);
  const toggle = (e) => {
    e?.stopPropagation?.();
    setOpen(!open);
  };

  if (asChild && isValidElement(children)) {
    const origClick = children.props?.onClick;
    return cloneElement(children, {
      onClick: (e) => {
        origClick?.(e);
        toggle(e);
      },
    });
  }

  return (
    <button type="button" onClick={toggle}>
      {children}
    </button>
  );
}

export function Portal({ children }) {
  if (typeof document === "undefined") return children;
  return createPortal(children, document.body);
}

export function Content({
  className = "",
  style = {},
  children,
  align = "start",
  sideOffset = 6,
}) {
  const { open } = useContext(PopoverCtx);
  if (!open) return null;

  return (
    <div
      className={cn(
        "absolute bg-[var(--bg-card)] border border-[var(--border-card)] rounded-[3px] shadow-2xl text-[var(--text-main)]",
        align === "end" ? "right-0" : "left-0",
        className
      )}
      style={{ top: `calc(100% + ${sideOffset}px)`, zIndex: 100, ...style }}
    >
      {children}
    </div>
  );
}

/**
 * Anchored fixed-position Popover container (handles outside click, Escape, and viewport clamping).
 */
export const Popover = React.forwardRef(
  (
    {
      open = true,
      anchorRef,
      onClose,
      width = 320,
      offset = 4,
      className,
      children,
      ...props
    },
    forwardedRef
  ) => {
    const internalRef = useRef(null);
    const panelRef = forwardedRef || internalRef;
    const [position, setPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
      if (!open || !anchorRef?.current || typeof window === "undefined") return;
      const rect = anchorRef.current.getBoundingClientRect();
      const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
      const top = rect.bottom + offset;
      setPosition({ top, left });
    }, [open, anchorRef, width, offset]);

    useEffect(() => {
      if (!open) return undefined;
      const onDown = (ev) => {
        if (!panelRef.current) return;
        if (panelRef.current.contains(ev.target)) return;
        if (anchorRef?.current?.contains(ev.target)) return;
        onClose?.();
      };
      const onKey = (ev) => {
        if (ev.key === "Escape") onClose?.();
      };
      document.addEventListener("mousedown", onDown);
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("mousedown", onDown);
        document.removeEventListener("keydown", onKey);
      };
    }, [open, onClose, anchorRef, panelRef]);

    if (!open) return null;

    return (
      <div
        ref={panelRef}
        className={cn(
          "fixed z-50 max-h-[70vh] overflow-y-auto rounded-[3px] border border-[var(--border-card)] bg-[var(--bg-card)] shadow-2xl text-[var(--text-main)]",
          className
        )}
        style={{ top: position.top, left: position.left, width }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Popover.displayName = "Popover";

export default { Root, Trigger, Portal, Content, Popover };
