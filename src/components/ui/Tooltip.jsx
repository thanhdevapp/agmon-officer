import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export const Tooltip = ({
  content,
  children,
  position = "top",
  className,
  delayMs = 200,
  portal = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const timerRef = useRef(null);

  const updateCoords = () => {
    if (!triggerRef.current || typeof window === "undefined") return;
    const rect = triggerRef.current.getBoundingClientRect();
    const gap = 6;
    let top = rect.top - gap;
    let left = rect.left + rect.width / 2;

    if (position === "bottom") {
      top = rect.bottom + gap;
    } else if (position === "left") {
      top = rect.top + rect.height / 2;
      left = rect.left - gap;
    } else if (position === "right") {
      top = rect.top + rect.height / 2;
      left = rect.right + gap;
    }

    setCoords({ top, left });
  };

  const showTooltip = () => {
    updateCoords();
    timerRef.current = setTimeout(() => {
      updateCoords();
      setIsVisible(true);
    }, delayMs);
  };

  const hideTooltip = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const transformClasses = {
    top: "-translate-x-1/2 -translate-y-full",
    bottom: "-translate-x-1/2",
    left: "-translate-x-full -translate-y-1/2",
    right: "-translate-y-1/2",
  };

  const inlinePositionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
    left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
    right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
  };

  const tooltipNode = isVisible && content && (
    <div
      role="tooltip"
      style={
        portal && typeof document !== "undefined"
          ? { position: "fixed", top: coords.top, left: coords.left, zIndex: 9999 }
          : undefined
      }
      className={cn(
        "px-2.5 py-1 text-[11px] leading-snug text-[var(--text-main)] bg-[var(--bg-card)] border border-[var(--border-card)] rounded-[3px] shadow-xl whitespace-nowrap pointer-events-none",
        portal && typeof document !== "undefined"
          ? transformClasses[position]
          : cn("absolute z-50", inlinePositionClasses[position]),
        className
      )}
    >
      {content}
    </div>
  );

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex items-center"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {portal && typeof document !== "undefined"
        ? isVisible && content && createPortal(tooltipNode, document.body)
        : tooltipNode}
    </div>
  );
};

Tooltip.displayName = "Tooltip";
