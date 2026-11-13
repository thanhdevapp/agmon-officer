import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function renderRowIcon(icon, iconClassName = "w-3.5 h-3.5 shrink-0") {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  if (typeof icon === "function" || (typeof icon === "object" && icon !== null)) {
    const IconComp = icon;
    return <IconComp className={cn("w-3.5 h-3.5 shrink-0", iconClassName)} />;
  }
  return null;
}

/**
 * ListRow — Standardized ADE list item with breathable padding, 2px left indicator bar,
 * left content slot (`gap-2.5`), and right metadata/badge slot (`gap-2`).
 */
export const ListRow = React.forwardRef(
  (
    {
      state = "default", // "default" | "active" | "live" | "idle"
      active = false,
      icon,
      iconClassName,
      left,
      right,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const resolvedState = active ? "active" : state;
    const stateClasses = {
      default:
        "text-[var(--text-main)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-bright)]",
      active:
        "bg-[var(--bg-selection)] text-[var(--text-bright)]",
      live:
        "bg-[var(--status-running-bg)] text-[var(--text-bright)] hover:bg-[var(--status-running-bg)]/80",
      idle:
        "bg-[var(--bg-card-inner)]/50 text-[var(--text-main)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-bright)]",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-[3px] cursor-pointer text-[11px] leading-snug transition-colors select-none",
          stateClasses[resolvedState] || stateClasses.default,
          className
        )}
        {...props}
      >
        {left !== undefined || right !== undefined ? (
          <>
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {renderRowIcon(icon, iconClassName)}
              {left}
            </div>
            {right && (
              <div className="flex items-center gap-2 shrink-0 pl-1">{right}</div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {renderRowIcon(icon, iconClassName)}
            {children}
          </div>
        )}
      </div>
    );
  }
);

ListRow.displayName = "ListRow";

/**
 * SectionHeader — Standardized collapsible group header with Chevron, optional icon,
 * uppercase tracking label, and right count/status badges.
 */
export function SectionHeader({
  expanded,
  isOpen,
  onToggle,
  icon,
  iconClassName,
  label,
  title,
  right,
  actions,
  borderedWhenOpen = false,
  className,
  children,
  ...props
}) {
  const open = expanded !== undefined ? expanded : isOpen !== undefined ? isOpen : true;
  const content = children !== undefined ? children : label;
  const rightContent = right !== undefined ? right : actions;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={cn(
        "w-full flex items-center justify-between gap-2 px-3.5 py-2 bg-[var(--bg-sidebar)]/60 hover:bg-[var(--bg-hover)] text-left text-[11px] font-semibold text-[var(--text-main)] transition-colors select-none cursor-pointer",
        open && borderedWhenOpen ? "border-b border-[var(--border-subtle)]" : "",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2 min-w-0">
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
        )}
        {renderRowIcon(icon, iconClassName)}
        <span
          className="uppercase text-[10px] tracking-wider text-[var(--text-bright)] truncate"
          title={typeof content === "string" ? title || content : title}
        >
          {content}
        </span>
      </div>
      {rightContent && (
        <div className="flex items-center gap-1.5 shrink-0">{rightContent}</div>
      )}
    </button>
  );
}

export default ListRow;
