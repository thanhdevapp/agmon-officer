import React from "react";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldLabel, FieldMessage, useFieldParts } from "./FieldParts";

function renderInputIcon(icon, defaultClassName = "w-3.5 h-3.5 shrink-0") {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  if (typeof icon === "function" || (typeof icon === "object" && icon !== null)) {
    const IconComp = icon;
    return <IconComp className={defaultClassName} />;
  }
  return null;
}

export const inputVariants = cva(
  "w-full bg-[var(--bg-input)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] border border-[var(--border-card)] rounded-[3px] outline-none transition-colors duration-150 focus:border-[var(--accent-primary)] disabled:opacity-60 disabled:cursor-not-allowed",
  {
    variants: {
      inputSize: {
        xs: "py-1.5 px-2.5 text-[11px]",
        sm: "h-[26px] px-2.5 text-[11px]",
        md: "h-[30px] px-3 text-[12px]",
        lg: "h-[34px] px-3.5 text-[13px]",
      },
      hasError: {
        true: "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]",
      },
    },
    defaultVariants: {
      inputSize: "md",
    },
  }
);

export const Input = React.forwardRef(
  (
    {
      className,
      size,
      inputSize,
      hasError,
      error,
      helperText,
      description,
      label,
      labelClassName,
      required,
      id,
      leftIcon,
      rightIcon,
      clearable,
      onClear,
      clearTestId,
      value,
      wrapperClassName,
      wrapperTestId,
      disabled,
      mono = false,
      bare = false,
      ...props
    },
    ref
  ) => {
    const resolvedSize = size || inputSize || "md";
    const isBare = bare || resolvedSize === "bare";
    const isClearable = Boolean(clearable || onClear);
    const field = useFieldParts({
      id,
      label,
      description,
      helperText,
      error,
      hasError,
      required,
    });
    const hasValue = value !== undefined && value !== "" && value !== null;

    const { "aria-describedby": externalDescribedBy, ...rest } = props;
    const describedBy =
      [externalDescribedBy, field.describedBy].filter(Boolean).join(" ") ||
      undefined;

    if (
      isBare &&
      !field.label &&
      !leftIcon &&
      !rightIcon &&
      !isClearable &&
      !field.errorText &&
      !field.hasDescription
    ) {
      return (
        <input
          ref={ref}
          id={field.controlId}
          value={value}
          disabled={disabled}
          required={field.required}
          aria-invalid={field.isError ? "true" : undefined}
          aria-required={field.required ? "true" : undefined}
          aria-describedby={describedBy}
          className={cn("outline-none", mono && "font-mono", className)}
          {...rest}
        />
      );
    }

    return (
      <div
        data-testid={wrapperTestId}
        className={cn("relative flex flex-col gap-1 w-full", wrapperClassName)}
      >
        {field.label ? (
          <FieldLabel
            htmlFor={field.controlId}
            required={field.required}
            className={labelClassName}
          >
            {field.label}
          </FieldLabel>
        ) : null}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-2.5 flex items-center pointer-events-none text-[var(--text-muted)] z-10">
              {renderInputIcon(leftIcon)}
            </div>
          )}
          <input
            ref={ref}
            id={field.controlId}
            value={value}
            disabled={disabled}
            required={field.required}
            aria-invalid={field.isError ? "true" : undefined}
            aria-required={field.required ? "true" : undefined}
            aria-describedby={describedBy}
            className={cn(
              isBare
                ? "outline-none"
                : inputVariants({ inputSize: resolvedSize, hasError: field.isError }),
              mono && "font-mono",
              leftIcon && "pl-8",
              (rightIcon || (isClearable && hasValue)) && "pr-7",
              className
            )}
            {...rest}
          />
          {isClearable && hasValue && !disabled && (
            <button
              type="button"
              onClick={onClear}
              data-testid={clearTestId}
              className="absolute right-2 flex items-center justify-center p-0.5 text-[var(--text-muted)] hover:text-[var(--text-bright)] bg-transparent border-none cursor-pointer rounded-[2px] z-10"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {!isClearable && rightIcon && (
            <div className="absolute right-2.5 flex items-center pointer-events-none text-[var(--text-muted)] z-10">
              {renderInputIcon(rightIcon)}
            </div>
          )}
        </div>
        {field.errorText ? (
          <FieldMessage id={field.errorId} tone="error">
            {field.errorText}
          </FieldMessage>
        ) : null}
        {field.hasDescription ? (
          <FieldMessage id={field.descriptionId}>{field.hint}</FieldMessage>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
