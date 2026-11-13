import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../ui";
import { ZoomIn, ZoomOut, Maximize2, Minimize2, Sparkles, Volume2, VolumeX, Maximize, ListFilter, Clock } from "lucide-react";
import { mountOfficeScene } from "./office-scene";
import { buildOffice } from "./scene/office-layout";
import { SUPPORTER_CHANGE_EVENT } from "@/lib/supporterStore";

export default function OfficeCanvas({
  traces = [],
  totalCount = 0,
  top = 20,
  onTopChange = null,
  timeframe = "24h",
  onTimeframeChange = null,
  onStats,
  onSelect,
  selectedId = null,
  isZenFullscreen = false,
  onToggleZenFullscreen = null,
  soundEnabled = false,
  onToggleSound = null,
  isActive = true,
}) {
  const hostRef = useRef(null);
  const sceneRef = useRef(null);
  const sleepTimerRef = useRef(null);
  const [zoomPct, setZoomPct] = useState(100);
  const [showToast, setShowToast] = useState(false);
  const latest = useRef({ onSelect, selectedId, traces, isActive });

  useEffect(() => {
    latest.current = { onSelect, selectedId, traces, isActive };
  });

  const [error, setError] = useState(null);

  useEffect(() => {
    let disposed = false;
    let handle = null;
    const host = hostRef.current;
    if (!host) return undefined;

    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.opacity = "0";
    canvas.style.transition = "opacity 0.2s ease-in-out";
    host.appendChild(canvas);

    (async () => {
      try {
        const mounted = await mountOfficeScene(canvas, latest.current.traces, {
          selectedId: latest.current.selectedId,
          onSelect: (id) => latest.current.onSelect?.(id),
          onZoomChange: (pct) => setZoomPct(pct),
          soundEnabled,
          isActive: latest.current.isActive,
        });

        if (disposed) {
          try {
            mounted?.destroy?.();
          } catch {}
          try {
            canvas.remove();
          } catch {}
          return;
        }

        handle = mounted;
        sceneRef.current = handle;
        canvas.style.opacity = "1";

        // Immediately reconcile in case traces arrived during async init
        if (latest.current.traces && latest.current.traces.length > 0) {
          handle.rebuild?.(latest.current.traces);
        }
      } catch (err) {
        if (!disposed) {
          console.error("[OfficeCanvas] mount failed:", err);
          setError(err?.message || "Failed to start the scene");
        }
      }
    })();

    return () => {
      disposed = true;
      clearSleepTimer();
      try {
        handle?.destroy?.();
      } catch (e) {
        console.warn("[OfficeCanvas] Cleanup warning:", e);
      }
      sceneRef.current = null;
      try {
        canvas.remove();
      } catch {}
    };
  }, []);

  const clearSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.rebuild?.(traces);
    }

    // Completed desks fall asleep purely because time passed, so no new trace
    // arrives at that boundary. Arm one timeout for the nearest sleep deadline.
    // `force` is required because an unchanged trace signature would otherwise
    // short-circuit the rebuild and the character would never fall asleep.
    clearSleepTimer();
    let nearestSleepAt = null;
    for (const ws of buildOffice(traces).workstations) {
      if (ws.mode !== "happy" || !Number.isFinite(ws.sleepAt)) continue;
      if (nearestSleepAt === null || ws.sleepAt < nearestSleepAt) nearestSleepAt = ws.sleepAt;
    }
    if (nearestSleepAt !== null) {
      const delay = Math.max(0, nearestSleepAt - Date.now());
      sleepTimerRef.current = setTimeout(() => {
        sleepTimerRef.current = null;
        sceneRef.current?.rebuild?.(latest.current.traces, true);
      }, delay);
    }
  }, [traces, clearSleepTimer]);

  useEffect(() => clearSleepTimer, [clearSleepTimer]);

  useEffect(() => {
    const handleSupporterChange = () => {
      if (sceneRef.current) {
        sceneRef.current.rebuild?.(latest.current.traces, true);
      }
    };
    window.addEventListener(SUPPORTER_CHANGE_EVENT, handleSupporterChange);
    return () => window.removeEventListener(SUPPORTER_CHANGE_EVENT, handleSupporterChange);
  }, []);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setSelected?.(selectedId);
    }
  }, [selectedId]);

  useEffect(() => {
    sceneRef.current?.setActive?.(isActive);
  }, [isActive]);

  useEffect(() => {
    sceneRef.current?.setSoundEnabled?.(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    if (!onStats) return undefined;
    const id = setInterval(() => {
      onStats?.({ mounted: Boolean(sceneRef.current) });
    }, 2000);
    return () => clearInterval(id);
  }, [onStats]);

  // Re-fit canvas layout whenever fullscreen mode changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("resize"));
      }
      sceneRef.current?.fit?.();
    }, 60);
    return () => clearTimeout(timer);
  }, [isZenFullscreen]);

  // Toast notification when entering Chill Mode
  useEffect(() => {
    if (isZenFullscreen) {
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 3500);
      return () => clearTimeout(timer);
    } else {
      setShowToast(false);
    }
  }, [isZenFullscreen]);

  // Global ESC key listener to exit Chill Mode
  useEffect(() => {
    if (!isZenFullscreen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onToggleZenFullscreen?.(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isZenFullscreen, onToggleZenFullscreen]);

  return (
    <div
      data-testid="office-canvas"
      className={`relative h-full w-full overflow-hidden bg-[var(--scene-canvas-bg)] ${
        isZenFullscreen
          ? "!fixed !inset-0 !z-[99] !w-screen !h-screen !rounded-none !border-none"
          : "rounded-xl border border-[var(--border-card)] shadow-2xl"
      }`}
    >
      <div ref={hostRef} className="absolute inset-0" />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-[var(--status-error)]">
          {error}
        </div>
      )}

      {/* Floating Canvas Filter Badge (Top-left) */}
      {!isZenFullscreen && (
        <div
          data-testid="canvas-filter-pill"
          className="absolute top-3 left-3 z-10 hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--border-subtle)]/80 bg-[var(--bg-workbench)]/80 backdrop-blur-md shadow-xl text-[var(--text-main)] text-xs select-none pointer-events-none"
        >
          <ListFilter className="w-3 h-3 text-[var(--info)] shrink-0" />
          <span className="font-semibold text-[11px] text-[var(--text-bright)]">
            {top === "all" ? "All Desks" : `Top ${top}`}
          </span>
          <span className="text-[var(--text-muted)]">·</span>
          <Clock className="w-3 h-3 text-[var(--status-warning)] shrink-0" />
          <span className="text-[11px] text-[var(--text-main)]">
            {timeframe === "all" ? "All time" : timeframe}
          </span>
          {totalCount > 0 && traces.length > 0 && traces.length < totalCount && (
            <span
              title={`Showing ${traces.length} of ${totalCount} recorded conversations`}
              className="ml-0.5 px-1.5 py-0.2 rounded text-[10px] font-mono bg-[var(--info-bg)]/60 text-[var(--info)] border border-[var(--info-border)]/40"
            >
              {traces.length}/{totalCount}
            </span>
          )}
        </div>
      )}

      {/* Chill Mode Entry Toast Banner */}
      {showToast && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-workbench)]/90 border border-[var(--info-border)] text-[var(--text-main)] text-xs shadow-2xl backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-[var(--info)] shrink-0" />
            <span>Full-Screen Chill Mode · Press <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-card)] text-[var(--status-warning)] font-mono text-[10px]">ESC</kbd> or click top-right button to exit</span>
          </div>
        </div>
      )}

      {/* Chill Mode Floating Top Control Bar */}
      {isZenFullscreen && (
        <div className="absolute top-4 right-4 z-30 flex items-center gap-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-workbench)]/70 border border-[var(--border-subtle)]/80 backdrop-blur-md shadow-xl text-xs text-[var(--text-main)] select-none">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--status-running)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--status-running)]" />
            </span>
            <span className="font-medium text-[11px]">Virtual Office · Chill Mode</span>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">({traces.length} Bots)</span>
          </div>

          <button
            type="button"
            data-testid="exit-zen-fullscreen-btn"
            onClick={() => onToggleZenFullscreen?.(false)}
            title="Exit Full-Screen Chill Mode (ESC)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-sidebar)]/80 hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] hover:border-[var(--status-warning-border)] text-[var(--text-main)] hover:text-[var(--text-bright)] backdrop-blur-md shadow-xl transition-all cursor-pointer text-xs font-medium group"
          >
            <Minimize2 className="w-3.5 h-3.5 text-[var(--status-warning)] group-hover:scale-110 transition-transform" />
            <span className="text-[11px]">Exit ESC</span>
          </button>
        </div>
      )}

      {/* Floating Canvas Camera Controls */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 rounded-lg border border-[var(--border-subtle)]/80 bg-[var(--bg-workbench)]/80 p-1 backdrop-blur-md shadow-xl text-[var(--text-muted)]">
        <Button variant="ghost" size="bare" className="p-1.5 rounded-md border-0 hover:bg-[var(--bg-hover)] hover:text-[var(--text-bright)]"
          onClick={() => sceneRef.current?.zoomOut?.()}
          title="Zoom out">
          <ZoomOut className="w-3.5 h-3.5" />
        </Button>
        <button
          onClick={() => sceneRef.current?.reset100?.()}
          title="Reset to 100% (1:1 natural scale)"
          className="px-2 py-1 rounded-md text-[11px] font-mono hover:bg-[var(--bg-hover)] hover:text-[var(--text-bright)] transition-colors font-semibold text-[var(--text-main)] cursor-pointer"
        >
          {zoomPct}%
        </button>
        <Button variant="ghost" size="bare" className="p-1.5 rounded-md border-0 hover:bg-[var(--bg-hover)] hover:text-[var(--text-bright)]"
          onClick={() => sceneRef.current?.zoomIn?.()}
          title="Zoom in">
          <ZoomIn className="w-3.5 h-3.5" />
        </Button>
        <div className="w-[1px] h-3.5 bg-[var(--border-subtle)] my-auto" />
        <Button variant="ghost" size="bare" className="p-1.5 rounded-md border-0 hover:bg-[var(--bg-hover)] hover:text-[var(--text-bright)]"
          onClick={() => sceneRef.current?.fit?.()}
          title="Fit to view">
          <Maximize2 className="w-3.5 h-3.5" />
        </Button>

        {onToggleZenFullscreen && (
          <>
            <div className="w-[1px] h-3.5 bg-[var(--border-subtle)] my-auto" />
            <button
              type="button"
              data-testid="canvas-camera-zen-fullscreen-btn"
              onClick={() => onToggleZenFullscreen(!isZenFullscreen)}
              title={
                isZenFullscreen
                  ? "Exit Full Screen (ESC)"
                  : "Full-Screen Virtual Office Chill Mode (ESC to exit)"
              }
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                isZenFullscreen
                  ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:bg-[var(--accent-hover)]"
                  : "hover:bg-[var(--bg-hover)] hover:text-[var(--text-bright)] text-[var(--text-muted)]"
              }`}
            >
              {isZenFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize className="w-3.5 h-3.5" />
              )}
            </button>
          </>
        )}

        {onToggleSound && (
          <>
            <div className="w-[1px] h-3.5 bg-[var(--border-subtle)] my-auto" />
            <button
              type="button"
              onClick={onToggleSound}
              title={soundEnabled ? "Sound: ON" : "Sound: OFF"}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                soundEnabled
                  ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:bg-[var(--accent-hover)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-bright)] hover:bg-[var(--bg-hover)]"
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
