import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cva } from "class-variance-authority";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldLabel, FieldMessage, useFieldParts } from "./FieldParts";
import { Input } from "./Input";

export const selectVariants = cva(
  "w-full inline-flex items-center justify-between gap-1.5 text-left appearance-none bg-[var(--bg-input)] text-[var(--text-main)] border border-[var(--border-card)] rounded-[3px] outline-none transition-colors duration-150 hover:border-[var(--border-focus)] focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer pr-7 truncate select-none",
  {
    variants: {
      selectSize: {
        xs: "h-[22px] px-1.5 pr-6 text-[10px]",
        sm: "h-[24px] px-2 pr-6 text-[11px]",
        md: "h-[28px] px-2.5 pr-7 text-[12px]",
        lg: "h-[32px] px-3 pr-7 text-[13px]",
      },
      hasError: {
        true: "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]",
      },
    },
    defaultVariants: {
      selectSize: "md",
    },
  }
);

function flattenOptionText(node) {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(flattenOptionText).join("");
  }
  if (React.isValidElement(node)) {
    return flattenOptionText(node.props?.children);
  }
  return "";
}

function extractSelectOptions(optionsProp) {
  if (!Array.isArray(optionsProp)) {
    return [];
  }
  return optionsProp.map((opt) => ({
    value: opt.value !== undefined ? opt.value : "",
    label: opt.label ?? String(opt.value ?? ""),
    text:
      typeof opt.label === "string" || typeof opt.label === "number"
        ? String(opt.label)
        : flattenOptionText(opt.label) || String(opt.value ?? ""),
    disabled: Boolean(opt.disabled),
  }));
}

export const Select = React.forwardRef(
  (
    {
      className,
      selectSize,
      hasError,
      error,
      helperText,
      description,
      label,
      labelClassName,
      required,
      id,
      options,
      children,
      wrapperClassName,
      disabled,
      value,
      defaultValue,
      placeholder,
      searchable,
      onChange,
      onValueChange,
      ...props
    },
    ref
  ) => {
    const field = useFieldParts({
      id,
      label,
      description,
      helperText,
      error,
      hasError,
      required,
    });

    const parsedOptions = useMemo(
      () => extractSelectOptions(options),
      [options]
    );

    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState(
      defaultValue !== undefined
        ? defaultValue
        : parsedOptions[0]?.value !== undefined
          ? parsedOptions[0].value
          : ""
    );
    const currentValue = isControlled ? value : internalValue;

    const selectedOption = useMemo(() => {
      const exact = parsedOptions.find(
        (opt) => String(opt.value) === String(currentValue ?? "")
      );
      if (exact) return exact;
      return parsedOptions[0] || null;
    }, [parsedOptions, currentValue]);

    const [open, setOpen] = useState(false);
    const [filterQuery, setFilterQuery] = useState("");
    const [menuRect, setMenuRect] = useState(null);
    const containerRef = useRef(null);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const searchInputRef = useRef(null);

    const showSearch =
      searchable !== undefined ? Boolean(searchable) : parsedOptions.length > 8;

    const filteredOptions = useMemo(() => {
      if (!showSearch || !filterQuery.trim()) return parsedOptions;
      const q = filterQuery.trim().toLowerCase();
      return parsedOptions.filter(
        (opt) =>
          String(opt.text || opt.label || "")
            .toLowerCase()
            .includes(q) || String(opt.value || "").toLowerCase().includes(q)
      );
    }, [parsedOptions, showSearch, filterQuery]);

    const setMergedTriggerRef = (node) => {
      triggerRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref && typeof ref === "object") {
        ref.current = node;
      }
    };

    const updateMenuPosition = () => {
      if (!containerRef.current || typeof window === "undefined") return;
      const rect = containerRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = Math.max(rect.width, 148);
      const left = Math.max(6, Math.min(rect.left, vw - width - 6));
      const spaceBelow = vh - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const openUpward = spaceBelow < 180 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        130,
        Math.min(296, openUpward ? spaceAbove - 4 : spaceBelow - 4)
      );

      setMenuRect({
        left,
        width,
        maxHeight,
        top: openUpward ? undefined : rect.bottom + 4,
        bottom: openUpward ? vh - rect.top + 4 : undefined,
      });
    };

    const emitChange = (opt) => {
      if (!opt || opt.disabled) return;
      if (!isControlled) {
        setInternalValue(opt.value);
      }
      const strValue = String(opt.value ?? "");
      const syntheticEvent = {
        target: {
          value: strValue,
          name: props.name,
          id: field.controlId,
        },
        currentTarget: {
          value: strValue,
          name: props.name,
          id: field.controlId,
        },
        preventDefault() {},
        stopPropagation() {},
      };
      onChange?.(syntheticEvent);
      onValueChange?.(opt.value, opt);
    };

    useEffect(() => {
      if (!open) {
        setFilterQuery("");
        return undefined;
      }
      updateMenuPosition();
      if (showSearch) {
        setTimeout(() => {
          searchInputRef.current?.focus?.();
        }, 10);
      }

      const onKey = (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus?.();
        } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const enabledOpts = filteredOptions.filter((o) => !o.disabled);
          if (enabledOpts.length === 0) return;
          const curIdx = enabledOpts.findIndex(
            (o) => String(o.value) === String(currentValue)
          );
          const delta = e.key === "ArrowDown" ? 1 : -1;
          const nextIdx =
            curIdx === -1
              ? 0
              : (curIdx + delta + enabledOpts.length) % enabledOpts.length;
          const nextOpt = enabledOpts[nextIdx];
          if (nextOpt) {
            emitChange(nextOpt);
          }
        } else if (e.key === "Enter" && document.activeElement !== searchInputRef.current) {
          e.preventDefault();
          setOpen(false);
        }
      };

      const onMouseDown = (e) => {
        if (menuRef.current?.contains(e.target)) return;
        if (containerRef.current?.contains(e.target)) return;
        setOpen(false);
      };

      const onScrollOrResize = (e) => {
        if (menuRef.current && e?.target && menuRef.current.contains(e.target)) {
          return;
        }
        updateMenuPosition();
      };

      window.addEventListener("keydown", onKey, true);
      window.addEventListener("mousedown", onMouseDown, true);
      window.addEventListener("resize", onScrollOrResize);
      window.addEventListener("scroll", onScrollOrResize, true);
      return () => {
        window.removeEventListener("keydown", onKey, true);
        window.removeEventListener("mousedown", onMouseDown, true);
        window.removeEventListener("resize", onScrollOrResize);
        window.removeEventListener("scroll", onScrollOrResize, true);
      };
    }, [
      open,
      filteredOptions,
      currentValue,
      isControlled,
      showSearch,
      onChange,
      onValueChange,
      props.name,
      field.controlId,
    ]);

    const handleSelectOption = (opt) => {
      if (opt.disabled) return;
      emitChange(opt);
      setOpen(false);
    };

    const {
      "aria-describedby": externalDescribedBy,
      onClick: externalOnClick,
      onKeyDown: externalOnKeyDown,
      ...rest
    } = props;
    const describedBy =
      [externalDescribedBy, field.describedBy].filter(Boolean).join(" ") ||
      undefined;

    const displayLabel =
      selectedOption?.label ??
      placeholder ??
      (currentValue !== undefined && currentValue !== null
        ? String(currentValue)
        : "");

    return (
      <div
        className={cn(
          "relative flex flex-col gap-1",
          wrapperClassName || ( className?.includes("w-") ? "w-auto" : "w-full" )
        )}
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
        <div ref={containerRef} className="relative flex items-center w-full">
          <button
            ref={setMergedTriggerRef}
            type="button"
            role="combobox"
            id={field.controlId}
            disabled={disabled}
            data-value={String(currentValue ?? "")}
            aria-invalid={field.isError ? "true" : undefined}
            aria-required={field.required ? "true" : undefined}
            aria-describedby={describedBy}
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={(e) => {
              externalOnClick?.(e);
              if (disabled) return;
              setOpen((prev) => !prev);
            }}
            onKeyDown={(e) => {
              externalOnKeyDown?.(e);
              if (disabled) return;
              if (
                e.key === " " ||
                e.key === "Enter" ||
                e.key === "ArrowDown" ||
                e.key === "ArrowUp"
              ) {
                e.preventDefault();
                setOpen(true);
              }
            }}
            className={cn(
              selectVariants({ selectSize, hasError: field.isError }),
              open &&
                "border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]",
              className
            )}
            {...rest}
          >
            <span className="truncate block flex-1 text-left">
              {displayLabel}
            </span>
          </button>
          <div
            className={cn(
              "absolute flex items-center pointer-events-none text-[var(--text-muted)] transition-transform duration-150",
              selectSize === "xs" ? "right-1.5" : "right-2",
              open && "rotate-180 text-[var(--accent-primary)]"
            )}
          >
            <ChevronDown
              className={selectSize === "xs" ? "w-3 h-3" : "w-3.5 h-3.5"}
            />
          </div>
        </div>

        {open &&
          menuRect &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              ref={menuRef}
              role="listbox"
              data-testid={
                rest["data-testid"]
                  ? `${rest["data-testid"]}-listbox`
                  : "agmon-select-listbox"
              }
              style={{
                top: menuRect.top,
                bottom: menuRect.bottom,
                left: menuRect.left,
                width: menuRect.width,
                maxHeight: menuRect.maxHeight,
              }}
              onContextMenu={(e) => e.preventDefault()}
              className="fixed z-[1200] bg-[var(--bg-sidebar)] border border-[var(--border-card)] rounded-[4px] shadow-2xl flex flex-col overflow-hidden text-[11px] text-[var(--text-main)] select-none"
            >
              {showSearch && (
                <div className="p-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] flex items-center gap-1.5 shrink-0">
                  <Search className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                  <Input
                    bare
                    ref={searchInputRef}
                    type="text"
                    value={filterQuery}
                    onInput={(e) => setFilterQuery(e.target.value)}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="Filter options..."
                    className="w-full bg-transparent text-[11px] text-[var(--text-main)] placeholder:text-[var(--text-dim)] outline-none"
                  />
                </div>
              )}
              <div className="py-1 overflow-y-auto flex-1">
                {filteredOptions.length === 0 ? (
                  <div className="px-2.5 py-2 text-[10px] text-[var(--text-dim)] italic">
                    No matching options
                  </div>
                ) : (
                  filteredOptions.map((opt, idx) => {
                    const isSelected =
                      String(opt.value) === String(currentValue ?? "");
                    return (
                      <button
                        key={`sel-opt-${String(opt.value)}-${idx}`}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        disabled={opt.disabled}
                        data-option-value={String(opt.value)}
                        onClick={() => handleSelectOption(opt)}
                        className={cn(
                          "w-full text-left px-2.5 py-1.5 flex items-center justify-between gap-2 transition-colors leading-snug cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                          isSelected
                            ? "bg-[var(--accent-primary)]/15 text-[var(--text-bright)] font-medium"
                            : "text-[var(--text-main)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-bright)]"
                        )}
                      >
                        <span className="truncate">{opt.label}</span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>,
            document.body
          )}

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

Select.displayName = "Select";
export default Select;
