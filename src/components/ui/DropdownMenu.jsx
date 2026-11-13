import React, { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

function renderMenuIcon(icon, iconClassName = "w-3 h-3 shrink-0") {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  if (typeof icon === "function" || (typeof icon === "object" && icon !== null)) {
    const IconComp = icon;
    return <IconComp className={cn("w-3 h-3 shrink-0", iconClassName)} />;
  }
  return null;
}

/**
 * DropdownMenu — Unified component for both Button Dropdowns and Right-Click Context Menus.
 * Handles Escape key, outside mousedown/contextmenu dismissal, and viewport clamping.
 */
export function DropdownMenu({
  open = false,
  position = null, // { x, y } in viewport coordinates
  anchorRef = null,
  triggerSelector = null,
  onClose,
  width = 248,
  estimatedHeight = 420,
  className,
  style: customStyle,
  children,
  ref: forwardedRef,
  ...props
}) {
  const menuRef = useRef(null);
  const setMenuRefs = (node) => {
    menuRef.current = node;
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef && typeof forwardedRef === "object") {
      forwardedRef.current = node;
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    };
    const onMouseDown = (e) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(e.target)) return;
      if (anchorRef?.current?.contains(e.target)) return;
      if (e.button === 0 && triggerSelector && e.target?.closest?.(triggerSelector)) return;
      onClose?.();
    };
    const onContextMenu = (e) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(e.target)) return;
      onClose?.();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKey);
      window.addEventListener("mousedown", onMouseDown);
      window.addEventListener("contextmenu", onContextMenu);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("mousedown", onMouseDown);
        window.removeEventListener("contextmenu", onContextMenu);
      }
    };
  }, [open, onClose, anchorRef, triggerSelector]);

  const hasAnchorOrPos = Boolean(
    (position && position.x !== undefined && position.y !== undefined) ||
      anchorRef?.current
  );

  const style = useMemo(() => {
    if (!open) return undefined;
    if (!hasAnchorOrPos) {
      return width ? { width } : undefined;
    }
    if (typeof window === "undefined") return { visibility: "hidden" };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = position?.x;
    let y = position?.y;
    if ((x === undefined || y === undefined) && anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      x = rect.left;
      y = rect.bottom + 4;
    }
    if (x === undefined || y === undefined) return { visibility: "hidden" };
    const resolvedWidth = typeof width === "number" ? width : 248;
    const left = Math.max(6, Math.min(x, vw - resolvedWidth - 6));
    const top = Math.max(6, Math.min(y, vh - estimatedHeight - 6));
    return { top, left, width: resolvedWidth };
  }, [open, hasAnchorOrPos, position, anchorRef, width, estimatedHeight]);

  if (!open) return null;

  const mergedStyle =
    style || customStyle ? { ...(style || {}), ...(customStyle || {}) } : undefined;

  const menuNode = (
    <div
      ref={setMenuRefs}
      role="menu"
      style={mergedStyle}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        hasAnchorOrPos ? "fixed z-[1000]" : "absolute z-50",
        "bg-[var(--bg-sidebar)] border border-[var(--border-card)] rounded-[3px] shadow-2xl py-1.5 text-[11px] text-[var(--text-main)] select-none",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );

  if (hasAnchorOrPos && typeof document !== "undefined" && document.body) {
    return createPortal(menuNode, document.body);
  }

  return menuNode;
}

export function DropdownMenuHeader({
  title,
  rightSlot,
  onClose,
  closeTestId,
  className,
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-[var(--border-subtle)] mb-1",
        className
      )}
    >
      <span
        className="truncate font-bold uppercase tracking-wider text-[9.5px] text-[var(--text-muted)]"
        title={title}
      >
        {title}
      </span>
      {(rightSlot || onClose) && (
        <div className="flex items-center gap-1.5 shrink-0">
          {rightSlot}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              data-testid={closeTestId}
              className="text-[var(--text-muted)] hover:text-[var(--text-bright)] hover:bg-[var(--bg-hover)] p-0.5 rounded-[2px] transition-colors"
              title="Close menu"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function DropdownMenuLabel({ className, children }) {
  return (
    <div
      className={cn(
        "px-2.5 pt-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DropdownMenuSeparator({ className }) {
  return (
    <div
      className={cn("my-1.5 border-t border-[var(--border-subtle)]", className)}
    />
  );
}

export function DropdownMenuItem({
  icon,
  iconClassName,
  shortcut,
  rightSlot,
  subtitle,
  active = false,
  variant = "default",
  danger = false,
  disabled = false,
  className,
  children,
  ...props
}) {
  const isDanger = danger || variant === "danger";
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={cn(
        "w-full text-left px-2.5 py-1.5 inline-flex items-center justify-between gap-2.5 transition-colors leading-snug cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent",
        isDanger
          ? "text-[var(--status-error)] hover:bg-[var(--status-error-bg)]"
          : active
            ? "bg-[var(--bg-selection)] text-[var(--text-bright)] font-medium"
            : "text-[var(--text-main)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-bright)]",
        className
      )}
      {...props}
    >
      <span className="inline-flex items-center gap-2 min-w-0 truncate flex-1">
        {renderMenuIcon(icon, iconClassName)}
        {subtitle ? (
          <span className="flex flex-col min-w-0 truncate">
            <span className="truncate">{children}</span>
            <span className="text-[9.5px] text-[var(--text-muted)] truncate font-normal">
              {subtitle}
            </span>
          </span>
        ) : (
          <span className="truncate">{children}</span>
        )}
      </span>
      {rightSlot}
      {shortcut && (
        <span className="text-[9.5px] font-mono text-[var(--text-muted)] shrink-0">
          {shortcut}
        </span>
      )}
    </button>
  );
}

export default DropdownMenu;
