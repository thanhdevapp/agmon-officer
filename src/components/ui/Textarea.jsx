import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { FieldLabel, FieldMessage, useFieldParts } from "./FieldParts";

export const textareaVariants = cva(
  "w-full bg-[var(--bg-input)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] border border-[var(--border-card)] rounded-[3px] outline-none transition-colors duration-150 focus:border-[var(--accent-primary)] disabled:opacity-60 disabled:cursor-not-allowed",
  {
    variants: {
      textareaSize: {
        xs: "px-2.5 py-1.5 text-[11px]",
        sm: "px-2.5 py-1.5 text-[11px]",
        md: "px-3 py-2 text-[12px]",
      },
      mono: {
        true: "font-mono",
        false: "",
      },
      resize: {
        none: "resize-none",
        vertical: "resize-y",
        both: "resize",
      },
      hasError: {
        true: "border-[var(--danger)] focus:border-[var(--danger)]",
      },
    },
    defaultVariants: {
      textareaSize: "md",
      mono: false,
    },
  }
);

export const Textarea = React.forwardRef(
  (
    {
      className,
      wrapperClassName,
      size,
      textareaSize,
      mono,
      resize,
      hasError,
      error,
      helperText,
      description,
      label,
      labelClassName,
      required,
      id,
      disabled,
      bare = false,
      ...props
    },
    ref
  ) => {
    const resolvedSize = textareaSize || size || "md";
    const isBare = bare || resolvedSize === "bare";
    const field = useFieldParts({
      id,
      label,
      description,
      helperText,
      error,
      hasError,
      required,
    });

    const { "aria-describedby": externalDescribedBy, ...rest } = props;
    const describedBy =
      [externalDescribedBy, field.describedBy].filter(Boolean).join(" ") ||
      undefined;

    if (
      isBare &&
      !field.label &&
      !field.errorText &&
      !field.hasDescription
    ) {
      return (
        <textarea
          ref={ref}
          id={field.controlId}
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

        <textarea
          ref={ref}
          id={field.controlId}
          disabled={disabled}
          required={field.required}
          aria-invalid={field.isError ? "true" : undefined}
          aria-required={field.required ? "true" : undefined}
          aria-describedby={describedBy}
          className={cn(
            textareaVariants({
              textareaSize: resolvedSize,
              mono,
              resize,
              hasError: field.isError,
            }),
            className
          )}
          {...rest}
        />

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

Textarea.displayName = "Textarea";
export default Textarea;
