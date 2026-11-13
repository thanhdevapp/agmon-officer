import React, { useId } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef(
  (
    {
      className,
      label,
      description,
      wrapperClassName,
      checked,
      disabled,
      onChange,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    const hasLabelContent = Boolean(label || description);
    const WrapperTag = hasLabelContent ? "label" : "span";

    return (
      <WrapperTag
        htmlFor={hasLabelContent ? inputId : undefined}
        className={cn(
          "inline-flex items-start gap-2 cursor-pointer select-none text-[12px] text-[var(--text-main)]",
          !hasLabelContent && "items-center shrink-0",
          disabled && "opacity-50 cursor-not-allowed",
          wrapperClassName
        )}
      >
        <span className={cn("relative inline-flex items-center justify-center", hasLabelContent && "mt-0.5")}>
          <input
            id={inputId}
            ref={ref}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer peer z-10 m-0"
            {...props}
          />
          <span
            className={cn(
              "w-[14px] h-[14px] rounded-[2px] border border-[var(--border-card)] bg-[var(--bg-card-inner)] transition-colors duration-150 flex items-center justify-center",
              "peer-focus-visible:ring-1 peer-focus-visible:ring-[var(--accent-primary)]",
              "hover:border-[var(--accent-primary)]",
              "peer-checked:bg-[var(--accent-primary)] peer-checked:border-[var(--accent-primary)] text-[var(--text-on-accent)]",
              className
            )}
          >
            {checked && <Check className="w-2.5 h-2.5 stroke-[3] text-[var(--text-on-accent)]" />}
          </span>
        </span>

        {hasLabelContent && (
          <span className="flex flex-col">
            {label && <span className="font-normal leading-normal">{label}</span>}
            {description && (
              <span className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">
                {description}
              </span>
            )}
          </span>
        )}
      </WrapperTag>
    );
  }
);

Checkbox.displayName = "Checkbox";
