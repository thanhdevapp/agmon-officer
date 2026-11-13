import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

function renderBadgeIcon(icon, iconClassName = "w-2.5 h-2.5 shrink-0") {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  if (typeof icon === "function" || (typeof icon === "object" && icon !== null)) {
    const IconComp = icon;
    return <IconComp className={iconClassName} />;
  }
  return null;
}

export const badgeVariants = cva(
  "inline-flex items-center justify-center font-medium rounded-[3px] select-none leading-none tracking-tight whitespace-nowrap shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--bg-card-inner)] text-[var(--text-main)] border border-transparent",
        plain: "",
        primary:
          "bg-[var(--info-bg)] text-[var(--info)] border border-transparent",
        secondary:
          "bg-[var(--bg-hover)]/80 text-[var(--text-muted)] border border-transparent",
        success:
          "bg-[var(--status-running-bg)] text-[var(--status-running)] border border-transparent",
        warning:
          "bg-[var(--status-warning-bg)] text-[var(--status-warning)] border border-transparent",
        danger:
          "bg-[var(--status-error-bg)] text-[var(--status-error)] border border-transparent",
        info:
          "bg-[var(--info-bg)] text-[var(--info)] border border-transparent",
        purple:
          "bg-[var(--accent-secondary)]/15 text-[var(--accent-secondary)] border border-transparent",
        type:
          "bg-[var(--bg-card-inner)] text-[var(--info)] tabular-nums border border-transparent",
        live:
          "border border-transparent bg-[var(--status-running-bg)] text-[var(--status-running)] uppercase tracking-wider font-bold",
        idle:
          "border border-transparent bg-[var(--bg-card-inner)] text-[var(--status-idle)] uppercase tracking-wider font-bold",
        branch:
          "bg-[var(--bg-card-inner)] text-[var(--text-bright)] border border-transparent tabular-nums font-bold",
        worktree:
          "border border-transparent bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)] uppercase tracking-wider font-bold",
        subagent:
          "border border-transparent bg-[var(--info-bg)] text-[var(--info)] font-bold",
        claude:
          "text-[var(--brand-claude)] border border-transparent bg-[var(--brand-claude)]/10 tabular-nums font-bold",
        codex:
          "text-[var(--brand-codex)] border border-transparent bg-[var(--brand-codex)]/10 tabular-nums font-bold",
        agy:
          "text-[var(--brand-antigravity-3)] border border-transparent bg-[var(--brand-antigravity-3)]/10 tabular-nums font-bold",
        manual:
          "text-[var(--text-muted)] border border-transparent bg-[var(--bg-card-inner)] tabular-nums font-bold",
        pillLive:
          "bg-[var(--status-running-bg)] text-[var(--status-running)] border border-transparent rounded-full font-bold",
        pillIdle:
          "bg-[var(--bg-card-inner)] text-[var(--status-idle)] border border-transparent rounded-full font-medium",
        pillCount:
          "bg-[var(--bg-card-inner)] text-[var(--text-muted)] rounded-full tabular-nums",
      },
      badgeSize: {
        bare: "",
        "2xs": "px-1.5 py-0.5 text-[8.5px] gap-1",
        xs: "px-2 py-0.5 text-[9.5px] gap-1",
        sm: "h-[20px] px-2 text-[11px] gap-1",
        md: "h-[22px] px-2.5 text-[12px] gap-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      badgeSize: "sm",
    },
  }
);

export function agentBadgeVariant(agent) {
  if (!agent) return "manual";
  const a = String(agent).toLowerCase();
  if (a === "claude" || a.startsWith("claude")) return "claude";
  if (a === "codex" || a.startsWith("codex")) return "codex";
  if (a === "antigravity" || a.startsWith("antigravity") || a.startsWith("agy"))
    return "agy";
  return "manual";
}

export const Badge = React.forwardRef(
  (
    {
      className,
      variant,
      size,
      badgeSize,
      mono = false,
      uppercase = false,
      icon,
      iconClassName,
      children,
      ...props
    },
    ref
  ) => {
    const resolvedSize = size || badgeSize || "sm";
    return (
      <span
        ref={ref}
        className={cn(
          badgeVariants({ variant, badgeSize: resolvedSize }),
          mono && "tabular-nums",
          uppercase && "uppercase tracking-wider",
          icon && "gap-1",
          className
        )}
        {...props}
      >
        {renderBadgeIcon(icon, iconClassName)}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";
export default Badge;
