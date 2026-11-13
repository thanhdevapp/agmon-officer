import React from "react";
import { cva } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function renderIcon(icon, defaultClassName = "w-3.5 h-3.5 shrink-0") {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  if (typeof icon === "function" || (typeof icon === "object" && icon !== null)) {
    const IconComp = icon;
    return <IconComp className={defaultClassName} />;
  }
  return null;
}

export const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium rounded-[3px] select-none transition-colors duration-150 outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer leading-normal whitespace-nowrap",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] active:opacity-85 text-[var(--text-on-accent)] border border-[var(--accent-primary)] shadow-xs",
        secondary:
          "bg-[var(--bg-hover)]/80 hover:bg-[var(--bg-selection)] active:bg-[var(--bg-selection)] text-[var(--text-main)] hover:text-[var(--text-bright)] border border-transparent",
        outline:
          "bg-[var(--bg-card-inner)] hover:bg-[var(--bg-hover)] active:bg-[var(--bg-selection)] text-[var(--text-main)] hover:text-[var(--text-bright)] border border-transparent",
        subtle:
          "bg-[var(--bg-hover)] hover:bg-[var(--bg-selection)] text-[var(--text-muted)] hover:text-[var(--text-bright)] border border-transparent",
        activeOutline:
          "bg-[var(--bg-selection)] hover:bg-[var(--bg-selection)] border border-[var(--border-subtle)] text-[var(--text-bright)] shadow-xs",
        ghost:
          "bg-transparent hover:bg-[var(--bg-hover)] active:opacity-85 text-[var(--text-muted)] hover:text-[var(--text-bright)] border border-transparent",
        // Bare text affordance: brightens on hover without a background or box.
        // Used by toolbars whose neighbours already supply the spacing.
        link: "bg-transparent border border-transparent text-[var(--text-muted)] hover:text-[var(--text-bright)]",
        danger:
          "bg-[var(--danger)] hover:opacity-90 active:opacity-80 text-[var(--text-on-accent)] border border-transparent shadow-xs",
        success:
          "bg-[var(--status-running)] hover:opacity-90 active:opacity-85 text-[var(--text-on-accent)] border border-[var(--status-running)] shadow-xs",
      },
      size: {
        bare: "",
        "2xs": "px-2 py-0.5 text-[10px] gap-1",
        xs: "h-[22px] px-2 text-[10.5px] gap-1.5",
        sm: "h-[26px] px-2.5 text-[11px] gap-1.5",
        md: "h-[30px] px-3 text-[12px] gap-2",
        lg: "h-[34px] px-4 text-[13px] gap-2",
        "icon-xs": "h-[24px] w-[24px] p-1 flex items-center justify-center",
        "icon-sm": "h-[26px] w-[26px] p-1 flex items-center justify-center",
        icon: "h-[30px] w-[30px] p-0 flex items-center justify-center",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export const Button = React.forwardRef(
  (
    {
      className,
      variant,
      size,
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      type = "button",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
        ) : (
          renderIcon(leftIcon)
        )}
        {children}
        {!isLoading && renderIcon(rightIcon)}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
