import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared scaffolding for form fields.
 *
 * `Input`, `Select` and `Textarea` each own their own label, so the markup
 * that binds a label to its control — and the ARIA wiring that points the
 * control at its description and error message — lives here once instead of
 * being written three times. One owner per message: the control owns both
 * the label and the text that describes it.
 */

/**
 * Stable ids for a field and the two messages it can point at.
 * `explicitId` keeps a caller-supplied id (e.g. a `data-testid` target or a
 * form that needs a known id); otherwise one is generated.
 */
export function useFieldIds(explicitId) {
  const generatedId = useId();
  const controlId = explicitId || generatedId;
  return {
    controlId,
    descriptionId: `${controlId}-description`,
    errorId: `${controlId}-error`,
  };
}

export function FieldLabel({ htmlFor, required, className, children, ...props }) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "block text-[11px] font-medium text-[var(--text-muted)]",
        className
      )}
      {...props}
    >
      {children}
      {required ? (
        <span aria-hidden="true" className="ml-0.5 text-[var(--danger)]">
          *
        </span>
      ) : null}
    </label>
  );
}

export function FieldMessage({ id, tone = "hint", className, children, ...props }) {
  return (
    <span
      id={id}
      className={cn(
        "text-[11px] leading-tight",
        tone === "error" ? "text-[var(--danger)]" : "text-[var(--text-muted)]",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * Resolves everything a control needs to render a labelled field:
 * the ids, the message texts, and the `aria-describedby` value.
 *
 * `helperText` is the legacy spelling of `description`; both are accepted so
 * existing call sites keep working.
 */
export function useFieldParts({
  id,
  label,
  description,
  helperText,
  error,
  hasError,
  required,
} = {}) {
  const { controlId, descriptionId, errorId } = useFieldIds(id);

  const hint = description ?? helperText ?? null;
  const errorText =
    typeof error === "string" && error.length > 0 ? error : null;
  const isError = Boolean(hasError || error);
  const hasDescription = Boolean(hint);

  const describedBy =
    [
      errorText ? errorId : null,
      hasDescription ? descriptionId : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  return {
    controlId,
    descriptionId,
    errorId,
    label: label ?? null,
    hint,
    hasDescription,
    errorText,
    isError,
    describedBy,
    required: Boolean(required),
  };
}

export default useFieldParts;
