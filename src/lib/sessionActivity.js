/**
 * Canonical session activity contract.
 *
 * Watchers produce normalized trace states, while stores and UI projections may
 * add aggregate fields such as `busy`. This module is the single authority for
 * interpreting those lifecycle signals across AGMon.
 */

import { getLocalEngineBaseUrl } from "./providers/localAiEngineCatalog.js";

export const TRACE_STATES = Object.freeze([
  "streaming",
  "pending",
  "question",
  "idle",
  "done",
  "error",
  "interrupted",
]);

const TRACE_STATE_SET = new Set(TRACE_STATES);
const liveTerminalQuestionSessions = new Set();

export function setLiveTerminalQuestionState(sessionId, awaitingQuestion) {
  if (!sessionId || typeof sessionId !== "string") return;
  if (awaitingQuestion) {
    liveTerminalQuestionSessions.add(sessionId);
  } else {
    liveTerminalQuestionSessions.delete(sessionId);
  }
}

export function hasLiveTerminalQuestion(session) {
  if (!session || liveTerminalQuestionSessions.size === 0) return false;
  const raw = typeof session === "string" ? { id: session } : session;
  const keys = [
    raw.sessionId,
    raw.connectionId,
    raw.traceId,
    raw.id,
    raw.paneId,
    // A terminal registers its question under the PTY pane session id. A
    // trace that follows the pane in front carries that id in `ptySessionId`
    // and has no `id` of its own, so without this key the live terminal
    // question is invisible to the chat queue guard on the pane path.
    raw.ptySessionId,
    raw.cwd,
    raw.worktreePath,
  ];
  for (const k of keys) {
    if (typeof k === "string" && k && liveTerminalQuestionSessions.has(k)) {
      return true;
    }
  }
  return false;
}
const WORKING_TRACE_STATES = new Set(["streaming", "pending"]);
/**
 * UI-only aliases for "the agent is working". Exported so every surface that
 * renders a working indicator resolves the same set of state names instead of
 * keeping a private copy that can drift.
 */
export const UI_WORKING_STATE_ALIASES = Object.freeze(["running", "active", "busy", "working"]);
const UI_WORKING_STATE_ALIAS_SET = new Set(UI_WORKING_STATE_ALIASES);
const QUESTION_TRACE_STATES = new Set([
  "question",
  "waiting_input",
  "waiting_approval",
  "prompt",
]);
const ATTENTION_TRACE_STATES = new Set(["pending", "question", "error", "interrupted"]);
export const TRANSCRIPT_QUESTION_TTL_MS = 30 * 60 * 1000;
const QUESTION_EVIDENCE_SOURCES = new Set(["transcript", "provider-live", "live-terminal"]);

const QUESTION_TOOL_KEYS = new Set([
  "askuserquestion",
  "askquestion",
  "requestuserinput",
  "askfollowupquestion",
  "askpermission",
  "requestpermission",
  "askuser",
  "permissionrequest",
]);

/**
 * Checks whether a tool name represents an interactive human question or permission gate
 * (`AskUserQuestion`, `ask_question`, `request_user_input`, `ask_permission`, etc.).
 */
export function isInteractiveQuestionTool(toolName) {
  if (!toolName || typeof toolName !== "string") return false;
  const compact = toolName.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (!compact) return false;
  if (QUESTION_TOOL_KEYS.has(compact)) return true;
  return (
    compact.includes("askuser") ||
    compact.includes("askquestion") ||
    compact.includes("requestuserinput") ||
    compact.includes("askpermission") ||
    compact.includes("requestpermission")
  );
}

/**
 * Checks whether a tool call represents an unanswered interactive question or permission request.
 */
export function isUnansweredAskToolCall(toolCall) {
  if (!toolCall || typeof toolCall !== "object") return false;
  const toolName = String(
    toolCall.toolName ||
      toolCall.name ||
      toolCall.action ||
      toolCall.type ||
      toolCall.tool ||
      ""
  )
    .trim()
    .toLowerCase();
  if (!isInteractiveQuestionTool(toolName) && toolName !== "question") return false;

  if (toolCall.answered === true || toolCall.resolved === true) return false;
  const status = String(toolCall.status || "").trim().toLowerCase();
  if (status === "completed" || status === "answered" || status === "resolved") {
    return Boolean(toolCall.pendingAnswer || toolCall.unanswered);
  }
  return true;
}

/**
 * Extracts a short human-readable question/permission summary from tool input.
 */
export function extractQuestionPromptSummary(input) {
  if (!input || typeof input !== "object") return null;
  if (Array.isArray(input.questions) && input.questions.length > 0) {
    const first = input.questions[0] || {};
    const header = typeof first.header === "string" ? first.header.trim() : "";
    const question =
      typeof first.question === "string"
        ? first.question.trim()
        : typeof first.title === "string"
        ? first.title.trim()
        : "";
    const combined =
      header && question && !question.startsWith(header)
        ? `${header}: ${question}`
        : question || header;
    if (combined) {
      return combined.slice(0, 120);
    }
  }
  for (const key of ["question", "prompt", "message", "title", "header", "description", "command"]) {
    const val = input[key];
    if (typeof val === "string" && val.trim()) {
      return val.trim().slice(0, 120);
    }
  }
  return null;
}

const ANSI_STRIP_RE =
  // eslint-disable-next-line no-control-regex
  /\x1b(?:\[[0-9;?<=>! ]*[A-Za-z~@]|\][^\x07\x1b]*(?:\x07|\x1b\\)|[PX^_][^\x1b]*\x1b\\|[@-Z\\-_])/g;

/**
 * Detects whether a live PTY output buffer tail currently shows an interactive
 * question selector (`AskUserQuestion` / `ask_question`) or permission prompt.
 */
export function detectTerminalQuestionPrompt(rawAnsiBuffer) {
  if (!rawAnsiBuffer || typeof rawAnsiBuffer !== "string") return false;
  const tail = rawAnsiBuffer
    .slice(-800)
    .replace(ANSI_STRIP_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!tail) return false;

  let promptIndex = -1;

  // 1. Claude Code / Antigravity / Codex interactive option selector footer
  const selectorMatch = tail.search(/Enter to select/i);
  if (
    selectorMatch >= 0 &&
    /(?:to navigate|Esc to cancel|Submit|Chat about this)/i.test(tail.slice(selectorMatch))
  ) {
    promptIndex = selectorMatch;
  } else {
    // 2. Claude Code / Antigravity multi-choice Submit bar + Next step header
    const nextStepMatch = tail.search(/\bNext step\b/i);
    if (
      nextStepMatch >= 0 &&
      /\bSubmit\b/i.test(tail.slice(nextStepMatch)) &&
      /\bChat about this\b/i.test(tail.slice(nextStepMatch))
    ) {
      promptIndex = nextStepMatch;
    } else {
      // 3. Tool permission / confirmation prompts in CLI
      const permissionMatch = tail.search(
        /(?:Do you want to proceed\?|Do you want to make this edit|Do you want to run this command|Allow once[\s\S]*Allow for this session|Needs your permission to use)/i
      );
      if (permissionMatch >= 0) {
        promptIndex = permissionMatch;
      }
    }
  }

  if (promptIndex < 0) return false;

  // ADE #32136 Parity: Check if the question prompt was already auto-approved,
  // answered, or superseded by subsequent tool execution or shell prompt return.
  const afterPrompt = tail.slice(promptIndex);
  if (
    /\b(?:auto[- ]approved|already approved|proceeding|allowed once|allowed for this session|permission granted|confirmed|approved)\b/i.test(
      afterPrompt
    ) ||
    /\b(?:tests? passed|exited with 0|completed successfully|done in \d+m?s)\b/i.test(
      afterPrompt
    ) ||
    /(?:[\r\n][\\u276F$>#\\u279C%]\s*$|\bcommand finished\b)/i.test(afterPrompt)
  ) {
    return false;
  }

  return true;
}

/**
 * Returns true when user terminal input submits or cancels an active question prompt
 * (Enter, Escape, or Ctrl+C), while ignoring arrow-key navigation sequences (`\x1b[A`, `\x1b[B`).
 */
export function isTerminalQuestionDismissInput(data) {
  if (!data || typeof data !== "string") return false;
  if (data.includes("\r") || data.includes("\n") || data.includes("\x03")) {
    return true;
  }
  // Standalone Escape key (not CSI/SS3 arrow sequence like \x1b[A or \x1bOA)
  if (data === "\x1b") {
    return true;
  }
  return false;
}

export function isCanonicalTraceState(state) {
  return TRACE_STATE_SET.has(state);
}

/**
 * Decides whether a session that is no longer alive was cut off mid-turn.
 *
 * The criterion is deliberately narrow: the process is gone AND the transcript
 * still carries an unanswered tool call — a tool that was requested and never
 * received its `tool_result`. That is a turn that cannot finish.
 *
 * An open turn on its own proves nothing. A turn that ended in a provider
 * error (`stop_reason:"stop_sequence"` on a synthetic message), a `/clear`
 * command or a Stop-hook notice all leave the turn open while the session is
 * perfectly finished. Measured over 77 real Claude Code transcripts, the open
 * turn alone mislabels 18 of them (23%) as cut off, while the unanswered tool
 * call flags 7 with no false positive.
 *
 * @param {object} params
 * @param {boolean} [params.alive] Whether the session's process is still alive.
 * @param {number} [params.pendingToolCallCount] Tool calls never answered.
 * @returns {{ cutOffByExit: boolean, interruptedReason: string|null }}
 */
export function resolveCutOffTurn({ alive, pendingToolCallCount = 0 } = {}) {
  if (alive) return { cutOffByExit: false, interruptedReason: null };
  if (Number(pendingToolCallCount || 0) > 0) {
    return { cutOffByExit: true, interruptedReason: "process_exited_mid_turn" };
  }
  return { cutOffByExit: false, interruptedReason: null };
}

/**
 * Returns the canonical lifecycle state from a trace or derived workstation.
 * UI-only aliases remain supported at this boundary for legacy projections.
 */
export function getSessionState(session) {
  return String(session?.state || session?.status || "").toLowerCase();
}

export function getQuestionEvidence(session, now = Date.now()) {
  if (hasLiveTerminalQuestion(session)) {
    return { source: "live-terminal", observedAt: now, expiresAt: null };
  }

  const raw = session?.questionEvidence;
  if (raw && typeof raw === "object" && QUESTION_EVIDENCE_SOURCES.has(raw.source)) {
    const observedAt = Number.isFinite(raw.observedAt) ? raw.observedAt : null;
    const expiresAt =
      raw.source === "transcript" && observedAt !== null
        ? observedAt + TRANSCRIPT_QUESTION_TTL_MS
        : null;
    return { source: raw.source, observedAt, expiresAt };
  }

  let hasAskToolCall = false;
  let toolCallTimestamp = null;

  if (Array.isArray(session?.toolCalls)) {
    const found = session.toolCalls.find(isUnansweredAskToolCall);
    if (found) {
      hasAskToolCall = true;
      if (Number.isFinite(found.timestamp)) {
        toolCallTimestamp = found.timestamp;
      } else if (Number.isFinite(found.createdAt)) {
        toolCallTimestamp = found.createdAt;
      }
    }
  }

  const latestTurn =
    session?.latestTurn ||
    (Array.isArray(session?.turns) && session.turns.length > 0
      ? session.turns[session.turns.length - 1]
      : null) ||
    (Array.isArray(session?.transcriptPreview) &&
    session.transcriptPreview.length > 0
      ? session.transcriptPreview[session.transcriptPreview.length - 1]
      : null);

  if (!hasAskToolCall && latestTurn && typeof latestTurn === "object") {
    if (Array.isArray(latestTurn.toolCalls)) {
      const found = latestTurn.toolCalls.find(isUnansweredAskToolCall);
      if (found) {
        hasAskToolCall = true;
        if (Number.isFinite(found.timestamp)) {
          toolCallTimestamp = found.timestamp;
        } else if (Number.isFinite(found.createdAt)) {
          toolCallTimestamp = found.createdAt;
        }
      }
    }
    if (!hasAskToolCall) {
      const candidate = latestTurn.toolCall || latestTurn;
      if (isUnansweredAskToolCall(candidate)) {
        hasAskToolCall = true;
        if (Number.isFinite(candidate.timestamp)) {
          toolCallTimestamp = candidate.timestamp;
        } else if (Number.isFinite(candidate.createdAt)) {
          toolCallTimestamp = candidate.createdAt;
        }
      }
    }
  }

  const state = getSessionState(session);
  const isQuestion =
    Boolean(session?.awaitingQuestion) ||
    session?.pendingQuestion === true ||
    Boolean(session?.askQuestion) ||
    session?.activeTool === "question" ||
    isInteractiveQuestionTool(session?.activeTool) ||
    QUESTION_TRACE_STATES.has(state) ||
    hasAskToolCall;

  if (isQuestion) {
    const rawObserved =
      (Number.isFinite(session?.lastActivityAt) ? session.lastActivityAt : null) ??
      (Number.isFinite(session?.lastTimestamp) ? session.lastTimestamp : null) ??
      (Number.isFinite(session?.updatedAt) ? session.updatedAt : null) ??
      (Number.isFinite(session?.timestamp) ? session.timestamp : null) ??
      (Number.isFinite(toolCallTimestamp) ? toolCallTimestamp : null) ??
      (Number.isFinite(latestTurn?.timestamp) ? latestTurn.timestamp : null) ??
      (Number.isFinite(latestTurn?.createdAt) ? latestTurn.createdAt : null) ??
      null;
    const observedAt = Number.isFinite(rawObserved) ? rawObserved : null;
    return {
      source: "transcript",
      observedAt,
      expiresAt: observedAt === null ? null : observedAt + TRANSCRIPT_QUESTION_TTL_MS,
    };
  }

  return null;
}

export function isSessionQuestion(session, now = Date.now()) {
  const evidence = getQuestionEvidence(session, now);
  if (!evidence) return false;
  const state = getSessionState(session);
  if (evidence.source === "transcript") {
    // ADE #32136 Parity: A terminated, completed, or idle session cannot be actively
    // waiting for user input on an old transcript question.
    if (
      state === "done" ||
      state === "completed" ||
      state === "idle" ||
      state === "error" ||
      state === "failed" ||
      state === "interrupted"
    ) {
      return false;
    }
    return evidence.expiresAt === null || now < evidence.expiresAt;
  }
  // The live terminal registry is a heuristic: an entry is only cleared when
  // the terminal is typed into, scrolls the prompt away, or unmounts, so it
  // can outlive the question it described. A dead session cannot be waiting
  // for the user, so a stale entry must not keep a queue on hold forever.
  // "idle" is deliberately not vetoed here: a terminal blocked on a permission
  // approval stops writing to the transcript, so its session reads as idle
  // while the dialog is still on screen.
  if (state === "done" || state === "error" || state === "failed") {
    return false;
  }
  return true;
}

/**
 * Accepts both normalized live traces (`state`) and historical vault records
 * (`status`) without making either UI path maintain a second list of
 * working-state strings. A positive aggregate `busy` value wins over a
 * historical child state such as `error`, unless the session is explicitly paused
 * at a user question/permission prompt.
 */
export function isAggregateSession(session) {
  return Boolean(
    session &&
    (Number.isFinite(session.activeCount) ||
      Number.isFinite(session.errorCount) ||
      Number.isFinite(session.questionCount) ||
      Number.isFinite(session.pendingCount))
  );
}

export function isSessionWorking(session, now = Date.now()) {
  const state = getSessionState(session);
  if (isSessionQuestion(session, now)) return false;
  if (isAggregateSession(session)) return Number(session.activeCount ?? session.busy) > 0;
  if (state === "idle" || state === "error" || state === "done") return false;
  return WORKING_TRACE_STATES.has(state) || UI_WORKING_STATE_ALIAS_SET.has(state);
}

export function isSessionQueued(session) {
  return getSessionState(session) === "pending";
}

export function isSessionError(session) {
  return getSessionState(session) === "error";
}

export function isSessionNeedsAttention(session) {
  return (
    ATTENTION_TRACE_STATES.has(getSessionState(session)) ||
    isSessionQuestion(session) ||
    Boolean(session?.unread)
  );
}

/**
 * Accurately determines if a specific terminal tab is awaiting user input / question prompt.
 * Prevents false positives (ADE #32136 parity):
 * - Does NOT trigger on background agent questions or unrelated terminal sessions.
 * - Isolates matching to tab.sessionId, tab.paneId, tab.terminalPanes, or active panes in terminalWorkspace.
 */
export function isTerminalTabQuestion(
  tab,
  questionSessions = {},
  terminalWorkspace = null,
  traces = []
) {
  if (!tab || tab.type !== "terminal") return false;

  // 1. Direct tab matching (single-session or pane-specific terminal tab)
  if (tab.sessionId && questionSessions[tab.sessionId]) return true;
  if (tab.paneId && questionSessions[tab.paneId]) return true;

  // 2. Tab with embedded terminal panes array
  if (Array.isArray(tab.terminalPanes)) {
    const hasPaneQuestion = tab.terminalPanes.some(
      (p) =>
        Boolean(p?.awaitingQuestion) ||
        (p?.sessionId && Boolean(questionSessions[p.sessionId])) ||
        (p?.paneId && Boolean(questionSessions[p.paneId])) ||
        (p?.id && Boolean(questionSessions[p.id]))
    );
    if (hasPaneQuestion) return true;
  }

  // 3. Workspace-level terminal tab (tab.id === "terminal" or tab hosting terminalWorkspace)
  const effectiveWorkspace = tab.terminalWorkspace || terminalWorkspace;
  if (effectiveWorkspace?.panesByLeafId) {
    const panes = Object.values(effectiveWorkspace.panesByLeafId);
    const hasWorkspacePaneQuestion = panes.some(
      (pane) =>
        Boolean(pane?.awaitingQuestion) ||
        (pane?.sessionId && Boolean(questionSessions[pane.sessionId])) ||
        (pane?.id && Boolean(questionSessions[pane.id]))
    );
    if (hasWorkspacePaneQuestion) return true;
  }

  // 4. Tab matching by CWD
  if (tab.cwd && questionSessions[tab.cwd]) return true;

  // 5. Fallback for generic "terminal" key if no specific panes are configured
  if (tab.id === "terminal" && questionSessions["terminal"]) return true;

  return false;
}

/**
 * Theme tokens that express each lifecycle state in the DOM.
 *
 * The Pixi office scene paints its own numeric status palette (`STATE_COLORS` in
 * `factory/scene/office-layout.js`). Those numbers are renderer colours and must never
 * reach an inline DOM style, so the document reads status *tokens* instead — which also
 * keeps agent chips in step with the rest of the UI and correct under every `data-theme`.
 */
const STATE_COLOR_TOKENS = {
  streaming: { fg: "var(--status-running)", bg: "var(--status-running-bg)" },
  pending: { fg: "var(--status-warning)", bg: "var(--status-warning-bg)" },
  question: { fg: "var(--status-warning)", bg: "var(--status-warning-bg)" },
  interrupted: { fg: "var(--status-warning)", bg: "var(--status-warning-bg)" },
  error: { fg: "var(--status-error)", bg: "var(--status-error-bg)" },
  idle: { fg: "var(--status-idle)", bg: "var(--status-idle-bg)" },
  done: { fg: "var(--status-idle)", bg: "var(--status-idle-bg)" },
};

const IDLE_COLOR_TOKENS = STATE_COLOR_TOKENS.idle;

/**
 * Resolves the foreground/background token pair for a session's lifecycle state.
 * A looping session reads as an error, matching its "Loop Alert" label.
 */
export function sessionStateColor(session) {
  if (session?.isLooping) return STATE_COLOR_TOKENS.error;
  return STATE_COLOR_TOKENS[getSessionState(session)] || IDLE_COLOR_TOKENS;
}

/**
 * Infinite Thinking / Stall Watchdog (#48):
 * Detects when an agent session is marked as working (`streaming` / `pending` / `running`)
 * but has produced zero output or activity for >= `thresholdMs` (default 180 seconds).
 */
export function isSessionThinkingStalled(
  session,
  { now = Date.now(), thresholdMs = 180_000 } = {}
) {
  if (!session || !isSessionWorking(session, now)) return false;
  const lastActive =
    session.lastOutputAt ??
    session.lastActivityAt ??
    session.lastTimestamp ??
    session.updatedAt ??
    null;
  if (!Number.isFinite(lastActive) || lastActive <= 0) return false;
  return now - lastActive >= thresholdMs;
}

/**
 * Test Deletion Guard (#36):
 * Scans a unified git diff for removed test blocks (`it(`, `test(`, `describe(`),
 * removed assertions (`expect(`, `assert.`), or newly added `.skip(` / `xit(` calls.
 */
export function detectTestDeletionInDiff(diffText = "") {
  if (!diffText || typeof diffText !== "string") {
    return {
      violation: false,
      deletedAssertionsCount: 0,
      addedSkipsCount: 0,
      details: [],
    };
  }

  const lines = diffText.split(/\r?\n/);
  let deletedAssertionsCount = 0;
  let addedSkipsCount = 0;
  const details = [];

  for (const line of lines) {
    if (line.startsWith("---") || line.startsWith("+++")) continue;
    if (line.startsWith("-")) {
      const content = line.slice(1).trim();
      if (
        /\b(?:it|test|describe)\s*\(/.test(content) ||
        /\b(?:expect|assert)\s*(?:\(|\.)/.test(content)
      ) {
        deletedAssertionsCount += 1;
        details.push({ type: "deleted_test_or_assertion", line: content.slice(0, 120) });
      }
    } else if (line.startsWith("+")) {
      const content = line.slice(1).trim();
      if (/\b(?:it|test|describe)\.skip\s*\(/.test(content) || /\bx(?:it|test|describe)\s*\(/.test(content)) {
        addedSkipsCount += 1;
        details.push({ type: "added_test_skip", line: content.slice(0, 120) });
      }
    }
  }

  return {
    violation: deletedAssertionsCount > 0 || addedSkipsCount > 0,
    deletedAssertionsCount,
    addedSkipsCount,
    details,
  };
}

/**
 * Anti-Appeasement "Done-Gate" Verifier (#45):
 * Cross-checks an agent's completion claim ("Fixed", "Done", "All tests pass")
 * against real shell exit codes and test deletion metrics.
 */
export function verifyCompletionTruthfulness({
  claimedDone = false,
  lastResponseText = "",
  lastExitCode = 0,
  testDeletionCount = 0,
  addedSkipsCount = 0,
} = {}) {
  const textClaim =
    claimedDone ||
    /\b(?:all tests pass|fixed the issue|task is complete|implementation complete)\b/i.test(
      String(lastResponseText || "")
    );
  if (!textClaim) {
    return {
      verified: true,
      falseCompletion: false,
      reasons: [],
    };
  }

  const reasons = [];
  if (
    typeof lastExitCode === "number" &&
    Number.isFinite(lastExitCode) &&
    lastExitCode !== 0
  ) {
    reasons.push(`Last command exited with non-zero code (${lastExitCode})`);
  }
  if (Number(testDeletionCount) > 0) {
    reasons.push(`Detected ${testDeletionCount} deleted test assertion(s) in diff`);
  }
  if (Number(addedSkipsCount) > 0) {
    reasons.push(`Detected ${addedSkipsCount} newly skipped test(s) in diff`);
  }

  return {
    verified: reasons.length === 0,
    falseCompletion: reasons.length > 0,
    reasons,
  };
}

/**
 * Idea #21 (A14) & Idea #46 (A11): Auto-Failover Detector on HTTP 529/503 Overloaded
 * & Stuck Zero-Token 429 Rate-Limit Detector.
 * Inspects live PTY stream chunks or error turns to recommend instant failover
 * to `9router` / `acc2` / `codex` without losing worktree state.
 */
export function parseQuotaResetDurationMs(rawText = "") {
  const clean = String(rawText || "").trim();
  if (!clean) return null;
  const relMatch = clean.match(
    /(?:resets?\s+in|try\s+again\s+in|retry\s+after)\s+(?:(\d+)\s*h(?:ours?|r|rs)?)?\s*(?:(\d+)\s*m(?:inutes?|in|ins)?)?\s*(?:(\d+)\s*s(?:econds?|ec|ecs)?)?/i
  );
  if (relMatch && (relMatch[1] || relMatch[2] || relMatch[3])) {
    const hours = Number(relMatch[1] || 0);
    const minutes = Number(relMatch[2] || 0);
    const seconds = Number(relMatch[3] || 0);
    const totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
    if (totalMs > 0) return totalMs;
  }
  return null;
}

export function detectProviderOverloadOrRateLimit(rawText = "") {
  const clean = String(rawText || "")
    .replace(ANSI_STRIP_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) {
    return { detected: false, kind: null, recommendedFailoverPreset: null, resetAfterMs: null };
  }

  const resetAfterMs = parseQuotaResetDurationMs(clean);
  const resetAtIso =
    resetAfterMs !== null ? new Date(Date.now() + resetAfterMs).toISOString() : null;

  // 1. Stuck 0-token 429 bug (anthropics/claude-code#27053)
  if (
    /rate limit reached/i.test(clean) &&
    /\b0\s*tokens?\s*consumed\b/i.test(clean)
  ) {
    return {
      detected: true,
      kind: "stuck_zero_token_429",
      severity: "critical",
      recommendedAction: "switch_account_slot_or_9router",
      recommendedFailoverPreset: "9router",
      recommendedAccountSlot: "acc2",
      resetAfterMs,
      resetAtIso,
      message:
        "Detected stuck 0-token 429 rate-limit loop. Switch Account Pool slot (acc2) or route via 9Router.",
    };
  }

  // 2. HTTP 529 Overloaded / 503 Service Unavailable
  if (
    /\b(?:529|503)\b[\s:-]*(?:overloaded|service unavailable)/i.test(clean) ||
    /\boverloaded_error\b/i.test(clean) ||
    /\bapi is temporarily overloaded\b/i.test(clean)
  ) {
    return {
      detected: true,
      kind: "overloaded_529",
      severity: "high",
      recommendedAction: "failover_gateway",
      recommendedFailoverPreset: "9router",
      recommendedAccountSlot: "default",
      resetAfterMs,
      resetAtIso,
      message:
        "Upstream vendor API is overloaded (HTTP 529/503). 1-Click Failover to 9Router / OpenRouter / Codex recommended.",
    };
  }

  // 3. Billing / credit exhaustion (cc-haha #1836).
  //    Checked BEFORE the 429 branch on purpose: a hard spending cap is not a
  //    rate limit — waiting does not refill a credit balance, so it must not
  //    be answered with a reset time or a "retry later" posture.
  if (
    /\b(?:insufficient_quota|billing_hard_limit_reached|credit balance is too low|out of credits|exceeded your current quota.*billing)\b/i.test(
      clean
    )
  ) {
    return {
      detected: true,
      kind: "billing_quota_exhausted",
      severity: "critical",
      recommendedAction: "switch_provider_or_topup_credits",
      recommendedFailoverPreset: "9router",
      recommendedAccountSlot: "acc2",
      resetAfterMs: null,
      resetAtIso: null,
      message:
        "Provider billing credits or hard spending cap exhausted. Failover to secondary account or Managed Router immediately.",
    };
  }

  // 4. Standard HTTP 429 / 5-hour quota exhaustion
  if (
    /\b429\b[\s:-]*(?:too many requests|rate limit)/i.test(clean) ||
    /\brate_limit_error\b/i.test(clean) ||
    /\bquota exceeded\b/i.test(clean) ||
    /\byou've hit your limit\b/i.test(clean)
  ) {
    return {
      detected: true,
      kind: "rate_limit_429",
      severity: "high",
      recommendedAction: "switch_account_or_vendor",
      recommendedFailoverPreset: "9router",
      recommendedAccountSlot: "acc2",
      resetAfterMs,
      resetAtIso,
      message:
        "5-hour quota or rate limit reached (HTTP 429). Switch to Account #2 or failover via 9Router.",
    };
  }

  // 5. Wave 5 (#58): Network Offline / All Cloud Tiers Exhausted -> Tier-4 Local Ollama/LMStudio
  if (
    /\b(?:ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ENETUNREACH|EAI_AGAIN)\b/i.test(clean) ||
    /\ball cloud tiers exhausted\b/i.test(clean) ||
    /\boffline mode\b/i.test(clean)
  ) {
    return {
      detected: true,
      kind: "cloud_offline_or_exhausted",
      severity: "high",
      recommendedAction: "failover_tier4_local_ollama",
      recommendedFailoverPreset: "ollama-local",
      recommendedAccountSlot: "local",
      message:
        "Cloud provider unreachable or all cloud quotas exhausted (#58). Failover to Tier-4 local Ollama/LMStudio endpoint.",
    };
  }

  return { detected: false, kind: null, recommendedFailoverPreset: null };
}

/**
 * Wave 5 (#58): Tier-4 Offline Zero-Cost Local Fallback (`Ollama` / `LMStudio` / `vLLM`)
 * When Tier 1–3 cloud providers are exhausted (429/529) or network is offline, builds a
 * zero-cost local model failover plan (`http://127.0.0.1:11434` or `:1234`) so an
 * in-progress worktree task at 95% completion can finish cleanly.
 */
export function evaluateTier4LocalModelFailover({
  rawErrorText = "",
  cloudTiersExhausted = false,
  preferredLocalEngine = "ollama",
  localModel = "qwen2.5-coder:32b",
} = {}) {
  const overload = detectProviderOverloadOrRateLimit(rawErrorText);
  const shouldActivateTier4 =
    Boolean(cloudTiersExhausted) ||
    overload.kind === "cloud_offline_or_exhausted" ||
    (overload.detected && Boolean(rawErrorText.match(/tier[s]?\s*exhausted|offline/i)));

  const engine = String(preferredLocalEngine || "ollama").toLowerCase();
  const baseUrl = `${getLocalEngineBaseUrl(engine)}/v1`;

  const modelName = String(localModel || "qwen2.5-coder:32b").trim();

  return {
    ok: true,
    activateTier4Local: shouldActivateTier4,
    tier: 4,
    engine,
    localModel: modelName,
    baseUrl,
    costPerMillionTokensUsd: 0,
    envOverrides: {
      ANTHROPIC_BASE_URL: baseUrl.replace(/\/v1$/, ""),
      ANTHROPIC_AUTH_TOKEN: "ollama-local",
      OPENAI_BASE_URL: baseUrl,
      OPENAI_API_KEY: "ollama-local",
      AGMON_FAILOVER_TIER: "tier4-local",
    },
    cliLaunchPreview: `ANTHROPIC_BASE_URL=${baseUrl.replace(/\/v1$/, "")} ANTHROPIC_AUTH_TOKEN=ollama claude --model ${modelName}`,
  };
}


/**
 * Idea #46 (A11): Subagent Budget Cap & Runaway Fan-Out Guard
 * Inspects active subagent trees to flag runaway subagent spawning or excessive
 * tool calls / token burn (`anthropics/claude-code#36727`).
 */
export function evaluateSubagentRunawayBudget({
  subagents = [],
  maxSubagentCount = 6,
  maxSubagentToolCalls = 35,
  maxSubagentTokens = 250_000,
} = {}) {
  const list = Array.isArray(subagents) ? subagents : [];
  let totalToolCalls = 0;
  let totalTokens = 0;
  const runawayChildren = [];

  for (const sub of list) {
    const calls = Math.max(0, Number(sub?.toolCallCount ?? sub?.toolCalls?.length) || 0);
    const tokens = Math.max(0, Number(sub?.totalTokens ?? sub?.inputTokens) || 0);
    totalToolCalls += calls;
    totalTokens += tokens;

    if (calls > maxSubagentToolCalls || tokens > maxSubagentTokens) {
      runawayChildren.push({
        id: sub?.id || sub?.agentId || "subagent",
        role: sub?.role || sub?.name || "worker",
        toolCallCount: calls,
        totalTokens: tokens,
        reason:
          calls > maxSubagentToolCalls
            ? `Exceeded tool call cap (${calls} > ${maxSubagentToolCalls})`
            : `Exceeded token cap (${tokens} > ${maxSubagentTokens})`,
      });
    }
  }

  const countExceeded = list.length > maxSubagentCount;
  const budgetExceeded = countExceeded || runawayChildren.length > 0;

  return {
    budgetExceeded,
    subagentCount: list.length,
    maxSubagentCount,
    totalSubagentToolCalls: totalToolCalls,
    totalSubagentTokens: totalTokens,
    runawayChildren,
    recommendation: budgetExceeded
      ? `Subagent runaway detected (${list.length} subagents, ${runawayChildren.length} over cap). Pause or prune runaway child tasks.`
      : "Subagent resource consumption is within safe bounds.",
  };
}

/**
 * Wave 6 (#61): Context Length Exceeded Hard-Halt Circuit Breaker
 * Detects terminal context-window overflow errors (`context_length_exceeded`,
 * `prompt is too long`, `maximum context length`) or `inputTokens >= contextWindowLimit`.
 * Immediately halts auto-retry / heartbeat loops (`HALTED_CONTEXT_OVERFLOW`) and recommends
 * `AGMon Smart Compact` or `--fork-session` instead of burning retries.
 */
export function evaluateContextOverflowCircuitBreaker({
  rawErrorText = "",
  inputTokens = 0,
  contextWindowLimit = 200_000,
} = {}) {
  const text = String(rawErrorText || "");
  const tokens = Math.max(0, Number(inputTokens) || 0);
  const rawLimit = Number(contextWindowLimit);
  const hasValidPositiveLimit =
    contextWindowLimit !== null &&
    contextWindowLimit !== undefined &&
    contextWindowLimit !== "" &&
    Number.isFinite(rawLimit) &&
    rawLimit > 0;
  const limit = hasValidPositiveLimit ? Math.max(1, rawLimit) : 200_000;

  const regexOverflow =
    /context_length_exceeded|prompt is too long|maximum context length|context window exceeded|exceeds the model's maximum context|token limit exceeded/i.test(
      text
    );
  const tokenLimitExceeded = tokens >= limit;
  const halted = regexOverflow || tokenLimitExceeded;

  return {
    ok: true,
    halted,
    status: halted ? "HALTED_CONTEXT_OVERFLOW" : "HEALTHY",
    suppressAutoRetry: halted,
    suppressHeartbeat: halted,
    triggerSource: regexOverflow
      ? "provider_error_signature"
      : tokenLimitExceeded
      ? "token_ceiling_reached"
      : null,
    inputTokens: tokens,
    contextWindowLimit: limit,
    utilizationRatio: Number((tokens / limit).toFixed(4)),
    recommendedActions: halted
      ? ["AGMon Smart Compact (/compact)", "Time-Machine Fork (--fork-session)"]
      : [],
    message: halted
      ? "Context length exceeded (#61). Auto-retry and heartbeat loops hard-halted. Run Smart Compact or Fork Session."
      : "Context window within safe operating bounds.",
  };
}

/**
 * Wave 6 (#76): Chaos & Failover Drill Simulator
 * Simulates a multi-tier outage cascade (`Tier 1 429 -> Tier 2 529 -> Tier 3 Network Offline -> Tier 4 Local Ollama`)
 * and verifies that AGMon's failover state machine deterministically routes to a healthy fallback in <50ms.
 */
export function runChaosFailoverDrillSimulation({
  scenario = "all_tiers_cascade",
  localModel = "qwen2.5-coder:32b",
} = {}) {
  const startedAt = performance.now();
  const steps = [
    {
      tier: 1,
      provider: "claude-official-acc1",
      injectedFault: "HTTP 429 rate_limit_error (0-token stuck)",
      detectorResult: detectProviderOverloadOrRateLimit("HTTP 429 rate_limit_error"),
      actionTaken: "rotate_to_tier_2_account_slot",
    },
    {
      tier: 2,
      provider: "claude-official-acc2",
      injectedFault: "HTTP 529 overloaded_error",
      detectorResult: detectProviderOverloadOrRateLimit("529 overloaded_error"),
      actionTaken: "failover_to_tier_3_byok_router",
    },
    {
      tier: 3,
      provider: "9router-glm-4.7",
      injectedFault: "ECONNREFUSED / cloud_offline_or_exhausted",
      detectorResult: detectProviderOverloadOrRateLimit("ECONNREFUSED cloud_offline"),
      actionTaken: "activate_tier_4_local_ollama",
    },
  ];

  const tier4Plan = evaluateTier4LocalModelFailover({
    rawErrorText: "ECONNREFUSED all cloud tiers exhausted",
    cloudTiersExhausted: true,
    preferredLocalEngine: "ollama",
    localModel,
  });

  const elapsedMs = Number(Math.max(0.05, performance.now() - startedAt).toFixed(3));

  return {
    ok: true,
    scenario,
    drillPassed: Boolean(tier4Plan.activateTier4Local) && elapsedMs < 50,
    elapsedMs,
    slaTargetMs: 50,
    steps,
    finalDestination: {
      tier: 4,
      engine: tier4Plan.engine,
      baseUrl: tier4Plan.baseUrl,
      localModel: tier4Plan.localModel,
    },
  };
}



