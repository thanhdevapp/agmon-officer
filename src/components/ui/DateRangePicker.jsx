import React, { useState, useEffect, useMemo } from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./Input";

/**
 * Format Date object into YYYY-MM-DD (local timezone)
 */
function formatDate(d) {
  if (!d || isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string into local Date object
 */
function parseDate(str) {
  if (!str || typeof str !== "string") return null;
  const parts = str.split("-");
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const date = new Date(y, m, d);
  return isNaN(date.getTime()) ? null : date;
}

const PRESETS = [
  {
    label: "Today",
    getValue: () => {
      const now = new Date();
      const s = formatDate(now);
      return { startDate: s, endDate: s };
    },
  },
  {
    label: "Yesterday",
    getValue: () => {
      const now = new Date();
      now.setDate(now.getDate() - 1);
      const s = formatDate(now);
      return { startDate: s, endDate: s };
    },
  },
  {
    label: "Last 7 days",
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 6);
      return { startDate: formatDate(start), endDate: formatDate(end) };
    },
  },
  {
    label: "Last 14 days",
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 13);
      return { startDate: formatDate(start), endDate: formatDate(end) };
    },
  },
  {
    label: "Last 30 days",
    getValue: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 29);
      return { startDate: formatDate(start), endDate: formatDate(end) };
    },
  },
  {
    label: "This month",
    getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: formatDate(start), endDate: formatDate(now) };
    },
  },
  {
    label: "Last month",
    getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: formatDate(start), endDate: formatDate(end) };
    },
  },
  {
    label: "All time",
    getValue: () => ({ startDate: "", endDate: "" }),
  },
];

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function DateRangePicker({
  startDate = "",
  endDate = "",
  isActive = false,
  onChange,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const [hoverDate, setHoverDate] = useState(null);

  // Month navigation state
  const [viewDate, setViewDate] = useState(() => {
    return parseDate(startDate) || parseDate(endDate) || new Date();
  });

  // Keep temporary dates in sync with parent props when opened
  useEffect(() => {
    if (open) {
      setTempStart(startDate);
      setTempEnd(endDate);
      const initial = parseDate(startDate) || parseDate(endDate) || new Date();
      setViewDate(new Date(initial.getFullYear(), initial.getMonth(), 1));
      setHoverDate(null);
    }
  }, [open, startDate, endDate]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Prev month padding days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const dateObj = new Date(year, month - 1, d);
      days.push({
        dateStr: formatDate(dateObj),
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateObj = new Date(year, month, d);
      days.push({
        dateStr: formatDate(dateObj),
        dayNum: d,
        isCurrentMonth: true,
      });
    }

    // Next month padding days to complete grid
    const totalSlots = days.length > 35 ? 42 : 35;
    const remainingSlots = totalSlots - days.length;
    for (let d = 1; d <= remainingSlots; d++) {
      const dateObj = new Date(year, month + 1, d);
      days.push({
        dateStr: formatDate(dateObj),
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month]);

  const handleDayClick = (dateStr) => {
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dateStr);
      setTempEnd("");
    } else {
      if (dateStr < tempStart) {
        setTempEnd(tempStart);
        setTempStart(dateStr);
      } else {
        setTempEnd(dateStr);
      }
    }
  };

  const handleApply = () => {
    if (onChange) {
      onChange({ startDate: tempStart, endDate: tempEnd });
    }
    setOpen(false);
  };

  const handleReset = () => {
    setTempStart("");
    setTempEnd("");
    if (onChange) {
      onChange({ startDate: "", endDate: "" });
    }
    setOpen(false);
  };

  const handleSelectPreset = (preset) => {
    const val = preset.getValue();
    setTempStart(val.startDate);
    setTempEnd(val.endDate);
    if (onChange) {
      onChange(val);
    }
    setOpen(false);
  };

  const effectiveEnd =
    tempEnd || (hoverDate && tempStart && hoverDate > tempStart ? hoverDate : "");

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 px-2.5 py-1 border rounded text-xs transition-colors shadow-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] cursor-pointer",
            isActive
              ? "bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--text-on-accent)] ring-1 ring-[var(--accent-primary)]/40"
              : "bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border-[var(--border-card)] hover:border-[var(--accent-primary)] text-[var(--text-main)]",
            className
          )}
        >
          <Calendar
            className={cn(
              "w-3.5 h-3.5 shrink-0",
              isActive ? "text-[var(--text-on-accent)]" : "text-[var(--accent-primary)]"
            )}
          />
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            {startDate ? (
              <span className={isActive ? "text-[var(--text-on-accent)] font-medium" : "text-[var(--text-bright)] font-medium"}>{startDate}</span>
            ) : (
              <span className={isActive ? "text-[var(--text-on-accent)]/80" : "text-[var(--text-muted)]"}>Start</span>
            )}
            <ArrowRight className={cn("w-2.5 h-2.5", isActive ? "text-[var(--text-on-accent)]/70" : "text-[var(--text-muted)]")} />
            {endDate ? (
              <span className={isActive ? "text-[var(--text-on-accent)] font-medium" : "text-[var(--text-bright)] font-medium"}>{endDate}</span>
            ) : (
              <span className={isActive ? "text-[var(--text-on-accent)]/80" : "text-[var(--text-muted)]"}>Present</span>
            )}
          </div>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 bg-[var(--bg-panel)] border border-[var(--border-card)] rounded-lg shadow-2xl p-0 text-[var(--text-main)] w-[520px] max-w-[95vw] overflow-hidden select-none animate-in fade-in-50 zoom-in-95"
          style={{ colorScheme: "dark" }}
        >
          <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-card)]">
            {/* Left: Quick Presets */}
            <div className="w-full sm:w-36 bg-[var(--bg-card)] p-2 flex flex-col gap-1 shrink-0">
              <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider px-2 py-1">
                Presets
              </span>
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="text-left px-2 py-1.5 rounded text-xs text-[var(--text-main)] hover:text-[var(--text-on-accent)] hover:bg-[var(--accent-primary)] transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Right: Calendar & Custom Inputs */}
            <div className="flex-1 p-3 bg-[var(--bg-panel)] flex flex-col gap-3">
              {/* Month Navigation Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-bright)] flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  {viewDate.toLocaleString("en-US", { month: "long" })} {year}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-bright)] rounded transition-colors cursor-pointer"
                    title="Previous month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-bright)] rounded transition-colors cursor-pointer"
                    title="Next month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day Headers (Mo - Su) */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {WEEKDAYS.map((wd) => (
                  <div
                    key={wd}
                    className="text-[10px] font-semibold text-[var(--text-muted)] py-0.5"
                  >
                    {wd}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((item, idx) => {
                  const isStart = tempStart && item.dateStr === tempStart;
                  const isEnd = effectiveEnd && item.dateStr === effectiveEnd;
                  const inRange =
                    tempStart &&
                    effectiveEnd &&
                    item.dateStr > tempStart &&
                    item.dateStr < effectiveEnd;

                  let cellClass =
                    "h-7 text-xs flex items-center justify-center transition-colors rounded relative cursor-pointer ";

                  if (isStart && isEnd) {
                    cellClass += "bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-bold rounded ";
                  } else if (isStart) {
                    cellClass +=
                      "bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-bold rounded-l rounded-r-none ";
                  } else if (isEnd) {
                    cellClass +=
                      "bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-bold rounded-r rounded-l-none ";
                  } else if (inRange) {
                    cellClass += "bg-[var(--bg-selection)] text-[var(--text-bright)] rounded-none ";
                  } else if (!item.isCurrentMonth) {
                    cellClass += "text-[var(--text-muted)] opacity-50 hover:bg-[var(--bg-hover)]/50 ";
                  } else {
                    cellClass += "text-[var(--text-main)] hover:bg-[var(--bg-hover)] ";
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleDayClick(item.dateStr)}
                      onMouseEnter={() => setHoverDate(item.dateStr)}
                      className={cellClass}
                    >
                      {item.dayNum}
                    </button>
                  );
                })}
              </div>

              {/* Manual Date Input Fields */}
              <div className="pt-2 border-t border-[var(--border-card)] flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--text-muted)] text-[11px]">From:</span>
                  <Input
                    bare
                    type="date"
                    value={tempStart}
                    onChange={(e) => setTempStart(e.target.value)}
                    style={{ colorScheme: "dark" }}
                    className="bg-[var(--bg-card)] border border-[var(--border-card)] text-[var(--text-main)] text-xs rounded px-2 py-1 outline-none w-32 focus:border-[var(--accent-primary)]"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--text-muted)] text-[11px]">To:</span>
                  <Input
                    bare
                    type="date"
                    value={tempEnd}
                    onChange={(e) => setTempEnd(e.target.value)}
                    style={{ colorScheme: "dark" }}
                    className="bg-[var(--bg-card)] border border-[var(--border-card)] text-[var(--text-main)] text-xs rounded px-2 py-1 outline-none w-32 focus:border-[var(--accent-primary)]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1 px-2.5 py-1 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-card)] text-[var(--text-main)] hover:text-[var(--text-bright)] text-xs rounded transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-2.5 py-1 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-card)] text-[var(--text-main)] hover:text-[var(--text-bright)] text-xs rounded transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    className="flex items-center gap-1 px-3 py-1 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-[var(--text-on-accent)] border border-[var(--accent-primary)] text-xs font-medium rounded transition-colors shadow-sm cursor-pointer"
                  >
                    <Check className="w-3 h-3" /> Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export default DateRangePicker;
