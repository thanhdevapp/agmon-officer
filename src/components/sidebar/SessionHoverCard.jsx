import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  Check,
  Copy,
  ExternalLink,
  FolderGit2,
  GitBranch,
  Loader2,
  Server,
  X,
  Zap,
} from "lucide-react";
import { Button, Badge } from "@/components/ui";
import {
  buildSessionCardDescription,
  formatSessionCardTitle,
  formatSessionRelativeAge,
  getAgentDisplayName,
} from "../ui/SessionItemCard.jsx";
import { AgentProviderLogo } from "@/components/sidebar/AgentBrandIcons";
import { copyTextWithNotification } from "@/lib/clipboard";
import { request } from "@/lib/platform/platformBridge";

const CARD_WIDTH = 380;
const VIEWPORT_GUTTER = 12;

function normalizeCwd(cwd) {
  return String(cwd || "").replace(/[/\\]+$/, "").trim();
}

function matchesWorkspace(candidate, cwd) {
  const target = normalizeCwd(cwd);
  const value = normalizeCwd(candidate);
  return Boolean(target && value && value === target);
}

function sessionBranch(item = {}) {
  return item.branch || item.git?.branch || item.worktree?.branch || "";
}

function sessionWorkspace(item = {}) {
  return item.cwd || item.git?.worktreePath || item.worktreePath || "";
}

function selectAutomations(payload, cwd) {
  const automations = Array.isArray(payload?.automations) ? payload.automations : [];
  const runs = Array.isArray(payload?.runs) ? payload.runs : [];
  const runByAutomationId = new Map();
  for (const run of runs) {
    if (run?.automationId && !runByAutomationId.has(run.automationId)) {
      runByAutomationId.set(run.automationId, run);
    }
  }
  return automations
    .filter((automation) => matchesWorkspace(automation?.cwd, cwd))
    .slice(0, 3)
    .map((automation) => ({
      ...automation,
      run: runByAutomationId.get(automation.id) || null,
    }));
}

function selectPorts(payload, lanes, cwd) {
  const sourcePorts = Array.isArray(payload?.ports) ? payload.ports : [];
  const attributedPorts = sourcePorts.filter((port) => matchesWorkspace(port?.cwd, cwd));
  // Older relay versions return a workspace-unaware port list. Do not claim an
  // unrelated service belongs to this session; only use it when a single port is
  // clearly the current AGMon relay started from the same workspace.
  const workspacePorts = attributedPorts.length > 0
    ? attributedPorts
    : sourcePorts.filter((port) => port?.processName === "node" && matchesWorkspace(port?.cwd, cwd));
  const lanePorts = (Array.isArray(lanes) ? lanes : [])
    .filter((lane) => matchesWorkspace(lane?.worktreePath, cwd))
    .map((lane) => ({
      id: `lane-${lane.laneSlug || lane.port}`,
      port: lane.port,
      label: lane.laneName || lane.laneSlug || "Lane runtime",
      previewUrl: lane.proxyUrl || `http://localhost:${lane.port}`,
      healthy: lane.healthy,
      isLane: true,
    }));
  const seen = new Set();
  return [...workspacePorts, ...lanePorts]
    .filter((port) => {
      const key = `${port.port}-${port.previewUrl || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

function computeCardPosition(anchor) {
  if (!anchor || typeof window === "undefined") return { left: VIEWPORT_GUTTER, top: VIEWPORT_GUTTER };
  const rect = anchor.getBoundingClientRect();
  const preferredLeft = rect.right + 10;
  const fitsRight = preferredLeft + CARD_WIDTH <= window.innerWidth - VIEWPORT_GUTTER;
  const left = fitsRight
    ? preferredLeft
    : Math.max(VIEWPORT_GUTTER, rect.left - CARD_WIDTH - 10);
  return {
    left: Math.min(left, Math.max(VIEWPORT_GUTTER, window.innerWidth - CARD_WIDTH - VIEWPORT_GUTTER)),
    top: Math.min(
      Math.max(VIEWPORT_GUTTER, rect.top),
      Math.max(VIEWPORT_GUTTER, window.innerHeight - VIEWPORT_GUTTER - 460)
    ),
  };
}

function PanelHeading({ icon: Icon, children, trailing }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <Icon className="h-3 w-3 shrink-0 text-[var(--accent-primary)]" />
        {children}
      </span>
      {trailing}
    </div>
  );
}

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const copy = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const success = await copyTextWithNotification(value, {
      successTitle: `${label} copied`,
      successDetail: String(value || "").slice(0, 96),
    });
    if (!success) return;
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1400);
  };

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      onClick={copy}
      title={`Copy ${label.toLowerCase()}`}
      className="h-5 w-5 shrink-0 rounded-[3px] p-0 text-[var(--text-muted)] hover:text-[var(--text-bright)]"
    >
      {copied ? <Check className="h-3 w-3 text-[var(--status-running)]" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

function AutomationRows({ automations, loading }) {
  if (loading) {
    return <p className="text-[10px] text-[var(--text-muted)]">Loading workspace automations…</p>;
  }
  if (automations.length === 0) {
    return <p className="text-[10px] text-[var(--text-muted)]">No automations assigned to this workspace.</p>;
  }
  return (
    <div className="space-y-1.5">
      {automations.map((automation) => {
        const isRunning = ["requested", "awaiting_approval", "starting", "running"].includes(automation.run?.status);
        return (
          <div key={automation.id} className="rounded-[3px] bg-[var(--bg-card-inner)]/70 px-2 py-1.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <Zap className="h-3 w-3 shrink-0 text-[var(--accent-secondary)]" />
              <span className="truncate text-[10px] font-medium text-[var(--text-main)]">{automation.name || "Automation"}</span>
              {isRunning && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[var(--status-running)]" />}
            </div>
            <p className="mt-0.5 truncate pl-[18px] text-[9.5px] text-[var(--text-muted)]">
              {automation.run?.status || (automation.enabled ? "Scheduled" : "Paused")}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function PortRows({ ports, loading }) {
  if (loading) {
    return <p className="text-[10px] text-[var(--text-muted)]">Checking workspace services…</p>;
  }
  if (ports.length === 0) {
    return <p className="text-[10px] text-[var(--text-muted)]">No live ports detected for this workspace.</p>;
  }
  return (
    <div className="space-y-1">
      {ports.map((port) => (
        <a
          key={port.id || `${port.port}-${port.pid || ""}`}
          href={port.previewUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="flex items-center gap-2 rounded-[3px] px-1.5 py-1 text-[10px] text-[var(--text-main)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-bright)]"
        >
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${port.healthy === false ? "bg-[var(--status-warning)]" : "bg-[var(--status-running)]"}`} />
          <span className="font-mono text-[9.5px]">:{port.port}</span>
          <span className="min-w-0 flex-1 truncate text-[var(--text-muted)]">
            {port.label || port.processName || port.command || "Local service"}
          </span>
          <ExternalLink className="h-3 w-3 shrink-0 text-[var(--text-muted)]" />
        </a>
      ))}
    </div>
  );
}

export default function SessionHoverCard({
  item,
  anchorRef,
  isOpen,
  shouldFocus = false,
  onFocused,
  onRequestClose,
  onMouseEnter,
  onMouseLeave,
}) {
  const [position, setPosition] = useState({ left: VIEWPORT_GUTTER, top: VIEWPORT_GUTTER });
  const [workspaceData, setWorkspaceData] = useState({ automations: [], ports: [], lanes: [] });
  const [isLoading, setIsLoading] = useState(false);
  const requestRef = useRef(0);
  const cardRef = useRef(null);

  const cwd = sessionWorkspace(item);
  const title = formatSessionCardTitle(item);
  const description = buildSessionCardDescription(item);
  const branch = sessionBranch(item);
  const updatedAt = item?.lastActivityAt || item?.updatedAtMs || item?.updatedAt || item?.startedAt || item?.timestamp;
  const providerKey = item?.agent || item?.provider || item?.cli || item?.clientType || "";

  useEffect(() => {
    if (!isOpen) return undefined;
    const updatePosition = () => setPosition(computeCardPosition(anchorRef?.current));
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, anchorRef]);

  useEffect(() => {
    if (!isOpen || !cwd) {
      setWorkspaceData({ automations: [], ports: [], lanes: [] });
      setIsLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setIsLoading(true);
    const encodedCwd = encodeURIComponent(cwd);

    Promise.allSettled([
      request("/api/automations", { signal: controller.signal }),
      request(`/api/system/ports?cwd=${encodedCwd}`, { signal: controller.signal }),
      request(`/api/git/lanes/runtime?cwd=${encodedCwd}`, { signal: controller.signal }),
    ])
      .then(([automationsResult, portsResult, lanesResult]) => {
        if (controller.signal.aborted || requestRef.current !== requestId) return;
        const automationsData = automationsResult.status === "fulfilled" ? automationsResult.value.data : null;
        const portsData = portsResult.status === "fulfilled" ? portsResult.value.data : null;
        const lanesData = lanesResult.status === "fulfilled" ? lanesResult.value.data : null;
        setWorkspaceData({
          automations: selectAutomations(automationsData, cwd),
          ports: selectPorts(portsData, lanesData?.lanes, cwd),
          lanes: Array.isArray(lanesData?.lanes) ? lanesData.lanes : [],
        });
      })
      .finally(() => {
        if (!controller.signal.aborted && requestRef.current === requestId) setIsLoading(false);
      });

    return () => controller.abort();
  }, [isOpen, cwd]);

  useEffect(() => {
    if (!isOpen || !shouldFocus) return undefined;
    const focusTimer = setTimeout(() => {
      const firstControl = cardRef.current?.querySelector("button, a[href]");
      firstControl?.focus?.({ preventScroll: true });
      onFocused?.();
    }, 0);
    return () => clearTimeout(focusTimer);
  }, [isOpen, onFocused, shouldFocus]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onRequestClose?.(event);
      }
    };
    const onFocusIn = (event) => {
      if (cardRef.current?.contains(event.target)) {
        onMouseEnter?.();
      } else if (shouldFocus) {
        onMouseLeave?.(event);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [isOpen, onMouseEnter, onRequestClose]);

  const handleCardBlur = (event) => {
    if (cardRef.current?.contains(event.relatedTarget)) return;
    onMouseLeave?.(event);
  };

  if (!isOpen || typeof document === "undefined") return null;

  const card = (
    <aside
      ref={cardRef}
      role="dialog"
      tabIndex={-1}
      aria-label={`Session overview for ${title}`}
      data-testid="session-hover-card"
      style={{
        position: "fixed",
        left: `${position.left}px`,
        top: `${position.top}px`,
        width: `${CARD_WIDTH}px`,
        maxHeight: "calc(100vh - 24px)",
        zIndex: 9999,
      }}
      onClick={(event) => event.stopPropagation()}
      onBlur={handleCardBlur}
      onFocus={onMouseEnter}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="overflow-y-auto rounded-[6px] border border-[var(--border-card)] bg-[var(--bg-card)]/98 p-3 text-[var(--text-main)] shadow-2xl backdrop-blur-md custom-scrollbar"
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="mt-0.5 rounded-[3px] bg-[var(--bg-card-inner)] p-1.5">
          <AgentProviderLogo provider={providerKey} clientType={item?.clientType || item?.cli} model={item?.model} cli={item?.cli} className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-[var(--text-main)]">{getAgentDisplayName(item)}</span>
            {item?.status && <Badge variant={item.status === "active" ? "live" : "idle"} size="2xs" uppercase>{item.status}</Badge>}
            {updatedAt && <span className="ml-auto shrink-0 text-[9.5px] text-[var(--text-muted)]">{formatSessionRelativeAge(updatedAt)}</span>}
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onRequestClose}
              title="Close session overview"
              className="-mr-1 ml-0.5 h-5 w-5 shrink-0 rounded-[3px] p-0 text-[var(--text-muted)] hover:text-[var(--text-bright)]"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <h3 className="mt-0.5 line-clamp-2 text-[12px] font-semibold leading-snug text-[var(--text-bright)]">{title}</h3>
        </div>
      </div>

      <div className="mt-2.5 rounded-[3px] border border-[var(--border-subtle)] bg-[var(--bg-card-inner)]/70 px-2.5 py-2">
        <p className="line-clamp-3 text-[10.5px] leading-[1.45] text-[var(--text-muted)]">
          <span className="font-medium text-[var(--text-main)]">{description.roleLabel}: </span>
          {description.text}
        </p>
      </div>

      <div className="mt-3 space-y-3">
        <section className="space-y-1.5">
          <PanelHeading icon={FolderGit2}>Workspace</PanelHeading>
          {cwd ? (
            <div className="space-y-1.5 rounded-[3px] bg-[var(--bg-card-inner)]/55 px-2 py-1.5">
              {branch && (
                <div className="flex min-w-0 items-center gap-1.5 text-[10px]">
                  <GitBranch className="h-3 w-3 shrink-0 text-[var(--accent-secondary)]" />
                  <span className="truncate font-mono text-[var(--text-main)]">{branch}</span>
                </div>
              )}
              <div className="flex min-w-0 items-center gap-1.5 text-[10px]">
                <span className="min-w-0 flex-1 truncate font-mono text-[var(--text-muted)]" title={cwd}>{cwd}</span>
                <CopyButton value={cwd} label="Workspace path" />
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-[var(--text-muted)]">Workspace path is not available for this session.</p>
          )}
        </section>

        <section className="space-y-1.5">
          <PanelHeading icon={Activity}>Automation</PanelHeading>
          <AutomationRows automations={workspaceData.automations} loading={isLoading && Boolean(cwd)} />
        </section>

        <section className="space-y-1.5">
          <PanelHeading icon={Server} trailing={workspaceData.ports.length > 0 ? <span>{workspaceData.ports.length} live</span> : null}>Live ports</PanelHeading>
          <PortRows ports={workspaceData.ports} loading={isLoading && Boolean(cwd)} />
        </section>
      </div>
    </aside>
  );

  return createPortal(card, document.body);
}

export { computeCardPosition, matchesWorkspace, selectAutomations, selectPorts };
