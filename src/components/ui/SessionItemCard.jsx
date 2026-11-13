import React, { useEffect, useState } from "react";
import { Bell, GitBranch, GitFork, MoreHorizontal } from "lucide-react";
import SessionHoverCard from "@/components/sidebar/SessionHoverCard";
import { AgentProviderLogo, AgentStateIndicator } from "@/components/sidebar/AgentBrandIcons";
import {
  hasLiveTerminalQuestion,
  isSessionQuestion,
  isSessionWorking,
} from "@/lib/sessionActivity.js";
import { Badge } from "./Badge.jsx";
import { Button } from "./Button.jsx";

export function formatSessionRelativeAge(isoOrMs) {
  if (!isoOrMs) return "Just now";
  const t = typeof isoOrMs === "number" ? isoOrMs : new Date(isoOrMs).getTime();
  if (!Number.isFinite(t) || t <= 0) return "Just now";
  const diff = Date.now() - t;
  if (diff < 60_000) return "Just now";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function formatSessionShortAge(isoOrMs) {
  if (!isoOrMs) return "now";
  const t = typeof isoOrMs === "number" ? isoOrMs : new Date(isoOrMs).getTime();
  if (!Number.isFinite(t) || t <= 0) return "now";
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 50) return "now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function stripSessionXmlTags(str = "") {
  return String(str || "")
    .replace(/<command-message>[\s\S]*?<\/command-message>/gi, " ")
    .replace(/<\/?[a-z0-9_-]+>/gi, " ")
    .replace(
      /(?:\/private)?\/var\/folders\/[^\s"'<>]+|\/tmp\/[a-z0-9_-]*-paste-[^\s"'<>]+|\/tmp\/[^\s"'<>]+?\.(?:png|jpe?g|gif|webp|svg)/gi,
      "[Image]"
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function formatSessionCardTitle(item = {}) {
  const candidates = [
    item?.title,
    item?.sessionTitle,
    item?.lastPrompt,
    item?.account,
    item?.connectionId,
    item?.id,
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const cleaned = stripSessionXmlTags(String(raw))
      .replace(/^(?:\[Image\]\s*)+/i, "")
      .trim();
    if (cleaned && cleaned !== "[Image]") {
      return cleaned;
    }
  }
  const fallback = String(
    item?.account || item?.connectionId || item?.id || "Untitled session"
  ).trim();
  return stripSessionXmlTags(fallback) || "Untitled session";
}

export function getAgentDisplayName(item = {}) {
  const raw =
    item?.agent ||
    item?.cli ||
    item?.provider ||
    item?.clientType ||
    item?.model ||
    "";
  const a = String(raw).toLowerCase();
  if (a.includes("claude") || a.includes("anthropic")) return "Claude";
  if (a.includes("codex") || a.includes("openai") || a.includes("gpt")) return "Codex";
  if (a.includes("antigravity") || a.includes("agy") || a.includes("gemini")) return "Antigravity";
  if (a.includes("xia")) return "Xia";
  if (a === "manual") return "Manual";
  return raw ? String(raw) : "Agent";
}

export function buildSessionCardDescription(item = {}) {
  const rawSnippet = stripSessionXmlTags(item?.snippet || item?.lastText || "");
  const rawPrompt = stripSessionXmlTags(item?.lastPrompt || "");
  const previews = Array.isArray(item?.transcriptPreview) ? item.transcriptPreview : [];
  const lastPreview = previews.length > 0 ? previews[previews.length - 1] : null;
  const firstPreview = previews.length > 0 ? previews[0] : null;
  const logs = Array.isArray(item?.logs) ? item.logs : [];
  const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;

  const isGenericStatus = (txt) =>
    !txt || /^(working|running|idle|done|completed|session completed)$/i.test(txt.trim());

  let candidateText = rawSnippet;
  let candidateRole = null;

  if (!isGenericStatus(rawSnippet)) {
    if (/^(you|user):\s*/i.test(rawSnippet)) {
      candidateRole = "You";
      candidateText = rawSnippet.replace(/^(you|user):\s*/i, "").trim();
    } else if (/^(agent|ai|assistant|claude|codex|antigravity):\s*/i.test(rawSnippet)) {
      candidateRole = "Agent";
      candidateText = rawSnippet
        .replace(/^(agent|ai|assistant|claude|codex|antigravity):\s*/i, "")
        .trim();
    } else if (item?.lastTextRole) {
      candidateRole = item.lastTextRole === "user" ? "You" : "Agent";
    } else if (lastPreview?.role) {
      candidateRole = lastPreview.role === "user" ? "You" : "Agent";
    } else if (rawPrompt && rawSnippet === rawPrompt) {
      candidateRole = "You";
    } else {
      candidateRole = "Agent";
    }
  } else if (!isGenericStatus(rawPrompt)) {
    candidateRole = "You";
    candidateText = rawPrompt;
  } else if (lastPreview?.text && !isGenericStatus(stripSessionXmlTags(lastPreview.text))) {
    candidateRole = lastPreview.role === "user" ? "You" : "Agent";
    candidateText = stripSessionXmlTags(lastPreview.text);
  } else if (firstPreview?.text && !isGenericStatus(stripSessionXmlTags(firstPreview.text))) {
    candidateRole = firstPreview.role === "user" ? "You" : "Agent";
    candidateText = stripSessionXmlTags(firstPreview.text);
  } else if (item?.activeTool) {
    candidateRole = "Agent";
    candidateText = `Running tool ${item.activeTool}${
      item.currentCommand ? `: ${stripSessionXmlTags(item.currentCommand)}` : ""
    }`;
  } else if (item?.currentCommand) {
    candidateRole = "Agent";
    candidateText = stripSessionXmlTags(item.currentCommand);
  } else if (lastLog?.text || lastLog?.message) {
    candidateRole = "Agent";
    candidateText = stripSessionXmlTags(lastLog.text || lastLog.message);
  } else if (rawSnippet) {
    candidateRole = "Agent";
    candidateText = rawSnippet;
  } else {
    candidateRole = "Agent";
    candidateText = item?.cwd
      ? `Active workspace ${item.cwd}`
      : "Session transcript indexed in local AI Vault";
  }

  return {
    roleLabel: candidateRole || "Agent",
    text: candidateText,
  };
}

/**
 * Shared Session / Agent Card Component (`SessionItemCard`)
 * Standardized across:
 *   1. `IndexedSessionsList` (Agents tab -> SESSIONS panel)
 *   2. `WorktreeCardAgents` (Projects tab -> Worktree -> N agents accordion)
 *   3. `SidebarActivityView` (Projects tab -> Bell Activity View -> WORKING / DONE threads)
 *
 * Displays:
 *   - Line 1: Bold session title + optional Unread Bell + optional LIVE/IDLE badge + `...` context menu trigger
 *   - Lines 2-3: 2-line conversation snippet preview (`You: ...` / `Agent: ...`)
 *   - Line 4: Provider SVG logo + State indicator + Provider name + `N msgs` + `N subagents` + relative age + model
 *   - Line 5: Optional worktree & branch chips
 */
export function SessionItemCard({
  item,
  isSelected = false,
  showLiveBadge = false,
  showWorktreeBranchRow = true,
  compactMode = false,
  isUnread = false,
  onMarkRead,
  testId,
  onClick,
  onDoubleClick,
  onContextMenu,
  onMoreClick,
  className = "",
}) {
  const [, setQuestionTick] = useState(0);
  const [isHoverPreviewOpen, setIsHoverPreviewOpen] = useState(false);
  const hoverPreviewTimerRef = React.useRef(null);
  const hoverPreviewCloseTimerRef = React.useRef(null);
  const hoverPreviewShouldFocusRef = React.useRef(false);
  const cardRef = React.useRef(null);

  useEffect(() => {
    const onQuestionEvent = () => setQuestionTick((n) => n + 1);
    window.addEventListener("agmon:terminal-question-state", onQuestionEvent);
    return () => window.removeEventListener("agmon:terminal-question-state", onQuestionEvent);
  }, []);

  useEffect(
    () => () => {
      if (hoverPreviewTimerRef.current) clearTimeout(hoverPreviewTimerRef.current);
      if (hoverPreviewCloseTimerRef.current) clearTimeout(hoverPreviewCloseTimerRef.current);
    },
    []
  );

  if (!item) return null;

  const tsValue =
    item.lastActivityAt ||
    item.updatedAtMs ||
    item.updatedAt ||
    item.startedAt ||
    item.timestamp;
  const itemAgeMs = tsValue ? Math.max(0, Date.now() - new Date(tsValue).getTime()) : 0;
  const isStale = Boolean(tsValue && itemAgeMs > 5 * 60 * 1000);
  const isQuestionStale = Boolean(tsValue && itemAgeMs > 30 * 60 * 1000);

  const isLive = Boolean(item.ephemeral === true || showLiveBadge);
  const isQuestion = Boolean(
    hasLiveTerminalQuestion(item) || (!isQuestionStale && isSessionQuestion(item))
  );
  const isWorking = Boolean(!isStale && !isQuestion && (item.isWorking ?? isSessionWorking(item)));
  const sessionState = isQuestion
    ? "question"
    : (!isStale && item.state) ||
      (isWorking
        ? "running"
        : isLive
        ? "idle"
        : (!isStale && item.status === "active")
        ? "running"
        : "completed");

  const isWorktree = Boolean(
    item?.git?.worktree ||
      item?.entrypoint === "worktree" ||
      item?.worktree === true
  );
  const branchName =
    item?.branch ||
    item?.git?.branch ||
    (typeof item?.worktree === "string"
      ? item.worktree.split("/").filter(Boolean).pop()
      : item?.worktree?.branch || null);

  const subagentCount =
    Number(item?.subagentCount) ||
    (Array.isArray(item?.subagents) ? item.subagents.length : 0);

  const messageCount =
    Number(item?.messageCount) ||
    Number(item?.count) ||
    (Array.isArray(item?.logs) && item.logs.length > 0 ? item.logs.length : 0);

  const displayTitle = formatSessionCardTitle(item);
  const desc = buildSessionCardDescription(item);
  const timeText = formatSessionRelativeAge(tsValue);
  const shortTimeText = formatSessionShortAge(tsValue);
  const providerKey = item.agent || item.provider || item.cli || item.clientType || "";

  const handleMore = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (hoverPreviewTimerRef.current) clearTimeout(hoverPreviewTimerRef.current);
    hoverPreviewTimerRef.current = null;
    hoverPreviewShouldFocusRef.current = false;
    cancelHoverPreviewClose();
    setIsHoverPreviewOpen(false);
    if (onMoreClick) {
      onMoreClick(e);
    } else if (onContextMenu) {
      onContextMenu(e);
    }
  };

  const cancelHoverPreviewClose = () => {
    if (hoverPreviewCloseTimerRef.current) clearTimeout(hoverPreviewCloseTimerRef.current);
    hoverPreviewCloseTimerRef.current = null;
  };

  const openHoverPreview = (event) => {
    if (hoverPreviewTimerRef.current) clearTimeout(hoverPreviewTimerRef.current);
    cancelHoverPreviewClose();
    if (isHoverPreviewOpen) return;
    hoverPreviewShouldFocusRef.current = event?.type === "focus";
    hoverPreviewTimerRef.current = setTimeout(() => setIsHoverPreviewOpen(true), 420);
  };

  const closeHoverPreview = (event) => {
    if (event?.type === "blur" && cardRef.current?.contains(event.relatedTarget)) return;
    if (event?.type === "blur" && hoverPreviewShouldFocusRef.current) return;
    if (hoverPreviewTimerRef.current) clearTimeout(hoverPreviewTimerRef.current);
    hoverPreviewTimerRef.current = null;
    cancelHoverPreviewClose();
    hoverPreviewCloseTimerRef.current = setTimeout(() => setIsHoverPreviewOpen(false), 120);
  };

  return (
    <>
      <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onFocus={openHoverPreview}
      onBlur={closeHoverPreview}
      onMouseEnter={openHoverPreview}
      onMouseLeave={closeHoverPreview}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(e);
        }
      }}
      className={`group flex flex-col gap-1 px-2.5 py-2.5 rounded-[3px] cursor-pointer text-[11px] leading-snug transition-colors select-none text-left ${
        isSelected
          ? "bg-[var(--bg-selection)] text-[var(--text-bright)]"
          : isLive && isWorking
          ? "bg-[var(--status-running-bg)] text-[var(--text-bright)] hover:bg-[var(--status-running-bg)]/80"
          : isLive
          ? "bg-[var(--bg-card-inner)]/50 text-[var(--text-main)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-bright)]"
          : "text-[var(--text-main)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-bright)]"
      } ${className}`}
      data-testid={testId}
      data-live={isLive ? "true" : "false"}
    >
      {/* Row 1: Bold session title + Unread Bell + Live/Idle pill + More actions trigger */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span
          className="text-[12px] font-semibold text-[var(--text-bright)] truncate leading-snug tracking-[0.01em] flex-1"
          title={item.title || item.sessionTitle || displayTitle}
          data-testid="indexed-row-title"
        >
          {displayTitle}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {isUnread && (
            <Button
              variant="ghost"
              size="bare"
              title="Unread activity — click to mark read"
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead?.();
              }}
              className="border-0 hover:bg-transparent p-0.5 text-[var(--status-warning)] hover:text-[var(--status-warning)]/80 transition-colors"
            >
              <Bell className="w-3 h-3 fill-[var(--status-warning)] text-[var(--status-warning)]" />
            </Button>
          )}
          {(isLive || isQuestion) && (
            <Badge
              variant={isQuestion ? "warning" : isWorking ? "live" : "idle"}
              size="2xs"
              uppercase
              data-testid="indexed-row-live-badge"
            >
              {isQuestion ? "wait" : isWorking ? "live" : "idle"}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="bare"
            onClick={handleMore}
            className="border-0 p-0.5 rounded-[3px] text-[var(--text-muted)] hover:text-[var(--text-bright)] hover:bg-[var(--bg-hover)] transition-colors shrink-0"
            title="Session actions"
            data-testid="indexed-row-more-btn"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Row 2: 2-line description preview (You: ... / Agent: ...) */}
      {!compactMode && (
        <div
          className="line-clamp-2 text-[11px] leading-[1.42] text-[var(--text-muted)] break-words"
          data-testid="indexed-row-snippet"
        >
          <span className="font-medium text-[var(--text-main)]">{desc.roleLabel}: </span>
          <span>{desc.text}</span>
        </div>
      )}

      {/* Row 3: Provider logo + state indicator + agent name + msgs + subagents + relative time + model */}
      <div
        className="flex items-center gap-1.5 flex-wrap min-w-0 text-[10px] text-[var(--text-muted)] pt-0.5"
        data-testid="indexed-row-meta"
      >
        <AgentProviderLogo
          provider={providerKey}
          clientType={item.clientType || item.cli}
          model={item.model}
          cli={item.cli}
          className="w-3 h-3 shrink-0"
        />
        <span data-testid="indexed-row-spinner" className="inline-flex shrink-0">
          <AgentStateIndicator state={sessionState} className="w-3 h-3 shrink-0" />
        </span>
        <span className="font-medium text-[var(--text-bright)]">
          {getAgentDisplayName(item)}
        </span>
        {messageCount > 0 && (
          <>
            <span className="text-[var(--text-muted)]/60">·</span>
            <span className="tabular-nums">{messageCount} msgs</span>
          </>
        )}
        {subagentCount > 0 && (
          <>
            <span className="text-[var(--text-muted)]/60">·</span>
            <span
              className="inline-flex items-center gap-0.5 text-[var(--text-main)] tabular-nums"
              data-testid="indexed-row-subagent-count"
            >
              {subagentCount} subagent{subagentCount === 1 ? "" : "s"}
            </span>
          </>
        )}
        {timeText && (
          <>
            <span className="text-[var(--text-muted)]/60">·</span>
            <span className="tabular-nums">{timeText}</span>
            <span className="sr-only">{shortTimeText}</span>
          </>
        )}
        {item?.model && (
          <>
            <span className="text-[var(--text-muted)]/60">·</span>
            <span
              className="truncate max-w-[100px] font-mono text-[9.5px] text-[var(--text-muted)]"
              title={item.model}
            >
              {item.model}
            </span>
          </>
        )}
      </div>

      {/* Row 4: Worktree & Branch chips */}
      {showWorktreeBranchRow && (isWorktree || branchName) && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {isWorktree && (
            <Badge
              variant="worktree"
              size="2xs"
              uppercase
              icon={GitFork}
              className="text-[var(--accent-secondary)]"
              data-testid="indexed-row-worktree-chip"
            >
              <span>Current worktree</span>
            </Badge>
          )}
          {branchName && (
            <Badge
              variant="branch"
              size="2xs"
              mono
              className="bg-[var(--bg-card-inner)]"
              data-testid="indexed-row-branch-chip"
              title={`Branch ${branchName}`}
            >
              <GitBranch className="w-2.5 h-2.5 text-[var(--text-muted)]" />
              <span className="truncate max-w-[96px]">{branchName}</span>
            </Badge>
          )}
        </div>
      )}
      </div>
      <SessionHoverCard
        item={item}
        anchorRef={cardRef}
        isOpen={isHoverPreviewOpen}
        shouldFocus={hoverPreviewShouldFocusRef.current}
        onFocused={() => {
          hoverPreviewShouldFocusRef.current = false;
          cancelHoverPreviewClose();
        }}
        onRequestClose={(event) => {
          if (hoverPreviewTimerRef.current) clearTimeout(hoverPreviewTimerRef.current);
          hoverPreviewShouldFocusRef.current = false;
          cancelHoverPreviewClose();
          setIsHoverPreviewOpen(false);
          cardRef.current?.focus?.({ preventScroll: true });
        }}
        onMouseEnter={cancelHoverPreviewClose}
        onMouseLeave={closeHoverPreview}
      />
    </>
  );
}

export default SessionItemCard;
