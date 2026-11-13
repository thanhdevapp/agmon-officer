import React from "react";
import { cn } from "@/lib/utils";

function renderTabIcon(icon, iconClassName = "w-3.5 h-3.5 text-[var(--text-muted)] shrink-0") {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  if (typeof icon === "function" || (typeof icon === "object" && icon !== null)) {
    const IconComp = icon;
    return <IconComp className={iconClassName} />;
  }
  return null;
}

/**
 * Tabs / TabItem — Standardized tab navigation supporting:
 * - `segmented`: compact pill/box selector (`ALL / ACTIVE / DONE`, `Projects / Agents / Files`)
 * - `underline`: sharp 2px bottom indicator bar for ADE headers & panels
 */
export function Tabs({
  variant = "segmented",
  className,
  children,
  ...props
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center select-none overflow-x-auto no-scrollbar",
        variant === "underline"
          ? "border-b border-[var(--border-subtle)] gap-1"
          : variant === "pill"
          ? "gap-1.5"
          : "p-0.5 rounded-lg bg-[var(--bg-card-inner)] border border-transparent gap-0.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function TabItem({
  active = false,
  variant = "segmented",
  size = "sm",
  icon,
  iconClassName,
  badge,
  className,
  children,
  ...props
}) {
  const sizeClasses = {
    xs: "px-2 py-0.5 text-[10px] font-medium gap-1",
    sm: "px-2 py-1 text-[11px] font-medium gap-1.5",
    md: "px-3 py-1.5 text-[12px] font-medium gap-2",
  };

  const variantClasses =
    variant === "underline"
      ? active
        ? "text-[var(--text-bright)] border-b-2 border-[var(--accent-primary)] font-semibold"
        : "text-[var(--text-muted)] border-b-2 border-transparent hover:text-[var(--text-bright)]"
      : variant === "pill"
      ? active
        ? "rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] border border-[var(--accent-primary)] font-semibold"
        : "rounded-md bg-[var(--bg-card-inner)] text-[var(--text-muted)] hover:text-[var(--text-bright)] hover:bg-[var(--bg-hover)] border border-transparent"
      : active
      ? "rounded-md bg-[var(--bg-card)] text-[var(--text-bright)] font-semibold shadow-xs"
      : "rounded-md bg-transparent text-[var(--text-muted)] hover:text-[var(--text-bright)] hover:bg-[var(--bg-hover)]";

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={cn(
        "inline-flex items-center justify-center transition-colors cursor-pointer shrink-0",
        sizeClasses[size] || sizeClasses.sm,
        variantClasses,
        className
      )}
      {...props}
    >
      {renderTabIcon(icon, iconClassName)}
      <span>{children}</span>
      {badge}
    </button>
  );
}

export default Tabs;
