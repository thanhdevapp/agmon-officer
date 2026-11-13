import React, {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { cn } from "@/lib/utils";

/**
 * A group of options that a user picks between.
 *
 * The workbench is full of little clusters of buttons that pick one value —
 * viewport presets, terminal layouts, filter chips — and they all had the
 * same two problems: nothing told a screen reader which option was current,
 * and the keyboard could only reach them with Tab, one stop per button.
 *
 * `ToggleGroup` gives that cluster a meaning. A single-choice group is a
 * radio group: exactly one option is checked, the arrow keys move between
 * options and pick as they go, and the group is one stop on the Tab
 * order. A multiple-choice group is a set of toggle buttons: every option
 * keeps its own on/off state and every option is its own Tab stop.
 *
 * The group is controlled: it renders whatever `value` says and reports every
 * change through `onValueChange`. It never holds state of its own, so the
 * caller stays the single source of truth for what is selected.
 *
 * The look stays with the call site. `itemClassName` is the shape of a button,
 * `activeClassName` and `inactiveClassName` are the two states, and the
 * group's own `className` lays the buttons out. A caller that already had a
 * segmented control keeps its exact classes and only gains the semantics.
 */

/** Marks the buttons a group owns, so the keyboard model can find them. */
const ITEM_ATTRIBUTE = "data-toggle-group-item";
/** Carries the option's value on the button, so a key press can be mapped back. */
const VALUE_ATTRIBUTE = "data-toggle-group-value";

/** Keys that move between options in a single-choice group. */
const NEXT_KEYS = new Set(["ArrowRight", "ArrowDown"]);
const PREVIOUS_KEYS = new Set(["ArrowLeft", "ArrowUp"]);

/**
 * @param {object} props
 * @param {"single"|"multiple"} [props.type]     Selection model. Default "single".
 * @param {string|string[]} [props.value]        The selected option(s).
 * @param {Function} [props.onValueChange]        Receives the next value.
 * @param {string} [props.className]              Layout for the group container.
 * @param {string} [props.itemClassName]          Shape shared by every option.
 * @param {string} [props.activeClassName]        Classes for a selected option.
 * @param {string} [props.inactiveClassName]      Classes for an unselected option.
 * @param {string} [props.ariaLabel]              Accessible name for the group.
 * @param {string} [props.ariaLabelledBy]         Id of the element naming the group.
 * @param {boolean} [props.disabled]              Disables every option.
 */
const VARIANT_DEFAULTS = {
  pills: {
    container:
      "inline-flex flex-wrap items-center gap-0.5 p-0.5 rounded-lg bg-[var(--bg-card-inner)]",
    itemSm:
      "px-2.5 py-1 rounded-md border border-transparent text-xs font-medium whitespace-nowrap transition-colors cursor-pointer text-center",
    itemMd:
      "px-3 py-1.5 rounded-md border border-transparent text-xs font-medium whitespace-nowrap transition-colors cursor-pointer text-center",
    active:
      "bg-[var(--bg-card)] text-[var(--text-bright)] border-[var(--border-subtle)] font-semibold shadow-xs",
    inactive:
      "text-[var(--text-muted)] hover:text-[var(--text-bright)] hover:bg-[var(--bg-hover)]/60",
  },
  surface: {
    container:
      "inline-flex flex-wrap items-center gap-0.5 p-1 rounded-lg bg-[var(--bg-card-inner)]",
    itemSm:
      "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer",
    itemMd:
      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer",
    active:
      "bg-[var(--bg-card)] text-[var(--text-bright)] shadow-xs font-semibold",
    inactive:
      "text-[var(--text-muted)] hover:text-[var(--text-bright)] hover:bg-[var(--bg-hover)]/60",
  },
};

export function ToggleGroup({
  type = "single",
  variant,
  size = "sm",
  value,
  onValueChange,
  children,
  className,
  itemClassName,
  activeClassName,
  inactiveClassName,
  ariaLabel,
  ariaLabelledBy,
  disabled = false,
  onKeyDown,
  ...rest
}) {
  const preset = variant ? VARIANT_DEFAULTS[variant] : null;
  const resolvedContainerClass = cn(preset?.container, className);
  const resolvedItemClass =
    itemClassName ??
    (preset
      ? size === "md"
        ? preset.itemMd
        : preset.itemSm
      : "rounded-[3px] transition-colors cursor-pointer");
  const resolvedActiveClass =
    activeClassName ??
    (preset
      ? preset.active
      : "bg-[var(--bg-selection)] text-[var(--text-bright)] shadow-xs");
  const resolvedInactiveClass =
    inactiveClassName ??
    (preset
      ? preset.inactive
      : "text-[var(--text-muted)] hover:text-[var(--text-bright)] hover:bg-[var(--bg-hover)]");
  const containerRef = useRef(null);
  const onValueChangeRef = useRef(onValueChange);
  const isMultiple = type === "multiple";

  // Keep the latest callback without re-creating the handlers that read it.
  useEffect(() => {
    onValueChangeRef.current = onValueChange;
  }, [onValueChange]);

  const items = Children.toArray(children);
  const options = items.filter(
    (child) => isValidElement(child) && child.props?.value != null
  );

  const selectedValues = isMultiple
    ? Array.isArray(value)
      ? value
      : []
    : value == null
    ? []
    : [value];

  // The Tab stop of a single-choice group is the selected option, or the
  // first option that can take focus when nothing is selected yet.
  const focusableOptions = options.filter(
    (child) => !child.props?.disabled && !disabled
  );
  const tabStopValue =
    focusableOptions.find((child) => selectedValues.includes(child.props.value))
      ?.props.value ??
    focusableOptions[0]?.props.value ??
    null;

  const handleSelect = useCallback(
    (optionValue, optionDisabled) => {
      if (optionDisabled) return;
      if (isMultiple) {
        const current = Array.isArray(value) ? value : [];
        const next = current.includes(optionValue)
          ? current.filter((entry) => entry !== optionValue)
          : [...current, optionValue];
        onValueChangeRef.current?.(next);
        return;
      }
      // A radio group never empties itself: picking the current option again
      // leaves it selected.
      if (value === optionValue) return;
      onValueChangeRef.current?.(optionValue);
    },
    [isMultiple, value]
  );

  const handleKeyDown = useCallback(
    (event) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;
      // Toggle buttons are independent; only a radio group moves between
      // options with the arrow keys.
      if (isMultiple) return;

      const { key } = event;
      const isNext = NEXT_KEYS.has(key);
      const isPrevious = PREVIOUS_KEYS.has(key);
      if (!isNext && !isPrevious && key !== "Home" && key !== "End") return;

      const container = containerRef.current;
      if (!container) return;

      const nodes = Array.from(
        container.querySelectorAll(`[${ITEM_ATTRIBUTE}]`)
      );
      if (nodes.length === 0) return;

      const active =
        typeof document !== "undefined" ? document.activeElement : null;
      let index = nodes.findIndex((node) => node === active);
      if (index === -1) {
        const current = nodes.findIndex(
          (node) => node.getAttribute(VALUE_ATTRIBUTE) === String(tabStopValue)
        );
        index = current === -1 ? 0 : current;
      }

      let nextIndex = index;
      if (isNext) nextIndex = (index + 1) % nodes.length;
      else if (isPrevious) nextIndex = (index - 1 + nodes.length) % nodes.length;
      else if (key === "Home") nextIndex = 0;
      else nextIndex = nodes.length - 1;

      // Walk past the options that cannot take focus.
      const step = isNext || key === "Home" ? 1 : -1;
      let guard = 0;
      while (nodes[nextIndex]?.disabled && guard < nodes.length) {
        nextIndex = (nextIndex + step + nodes.length) % nodes.length;
        guard += 1;
      }

      const target = nodes[nextIndex];
      if (!target) return;

      event.preventDefault();
      target.focus();

      const targetValue = target.getAttribute(VALUE_ATTRIBUTE);
      const match = options.find(
        (child) => String(child.props.value) === targetValue
      );
      if (match) handleSelect(match.props.value, Boolean(match.props?.disabled));
    },
    [handleSelect, isMultiple, onKeyDown, options, tabStopValue]
  );

  const cloned = items.map((child) => {
    if (!isValidElement(child)) return child;
    const optionValue = child.props?.value;
    if (optionValue == null) return child;

    const optionDisabled = Boolean(child.props?.disabled) || disabled;
    const selected = selectedValues.includes(optionValue);
    const isTabStop = isMultiple || optionValue === tabStopValue;

    return cloneElement(child, {
      toggleGroup: {
        type,
        selected,
        disabled: optionDisabled,
        tabIndex: isTabStop && !optionDisabled ? 0 : -1,
        onSelect: handleSelect,
        itemClassName: resolvedItemClass,
        activeClassName: resolvedActiveClass,
        inactiveClassName: resolvedInactiveClass,
      },
    });
  });

  return (
    <div
      ref={containerRef}
      role={isMultiple ? "group" : "radiogroup"}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      onKeyDown={handleKeyDown}
      className={resolvedContainerClass}
      {...rest}
    >
      {cloned}
    </div>
  );
}

ToggleGroup.displayName = "ToggleGroup";

/**
 * One option inside a `ToggleGroup`. It takes its selected state, its
 * keyboard role and its classes from the group, and leaves everything else —
 * the label, the icon, the tooltip, the test id — to the call site.
 */
export function ToggleGroupItem({
  value,
  disabled,
  mono = false,
  className,
  children,
  onClick,
  toggleGroup,
  ...rest
}) {
  const group = toggleGroup || null;
  const isMultiple = group?.type === "multiple";
  const selected = Boolean(group?.selected);
  const optionDisabled = Boolean(disabled) || Boolean(group?.disabled);
  const stateClass = selected ? group?.activeClassName : group?.inactiveClassName;

  return (
    <button
      type="button"
      role={isMultiple ? undefined : "radio"}
      aria-checked={isMultiple ? undefined : selected}
      aria-pressed={isMultiple ? selected : undefined}
      tabIndex={group ? group.tabIndex : 0}
      disabled={optionDisabled}
      data-toggle-group-item=""
      data-toggle-group-value={value}
      onClick={(event) => {
        group?.onSelect?.(value, optionDisabled);
        onClick?.(event);
      }}
      className={cn(group?.itemClassName, stateClass, mono && "tabular-nums", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

ToggleGroupItem.displayName = "ToggleGroupItem";

export default ToggleGroup;
