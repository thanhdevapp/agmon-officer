/**
 * Standard Trace Contract for AGMon.
 * All watchers normalize their session logs into this uniform schema.
 */

import { isCanonicalTraceState } from "./sessionActivity.js";

export function normalizeProvider(rawProvider, cli = "agent", model = "") {
  let p = String(rawProvider || "").toLowerCase().trim();
  // Strip out any trailing client type annotations like "(cli)", "(app)", "(codex)", "(extension)", "(ide)"
  p = p.replace(/\s*\([^)]*\)/g, "").trim();

  if (p === "claude" || p.includes("anthropic")) return "anthropic";
  if (p.includes("gemini") || p.includes("google")) return "gemini";
  if (p.includes("openai") || p.includes("codex") || p.includes("gpt")) return "openai";
  if (p.includes("minimax")) return "minimax";
  if (p.includes("deepseek")) return "deepseek";

  // Infer from model if provider wasn't recognized
  const m = String(model || "").toLowerCase();
  if (m.includes("claude") || m.includes("sonnet") || m.includes("opus") || m.includes("haiku")) return "anthropic";
  if (m.includes("gemini")) return "gemini";
  if (m.includes("gpt") || m.includes("o1") || m.includes("o3") || m.includes("o4") || m.includes("codex")) return "openai";
  if (m.includes("minimax")) return "minimax";
  if (m.includes("deepseek")) return "deepseek";

  // Infer from cli if still unknown
  const c = String(cli || "").toLowerCase();
  if (c.includes("claude")) return "anthropic";
  if (c.includes("antigravity")) return "gemini";
  if (c.includes("codex")) return "openai";

  return p || "other";
}

export function normalizeTrace(raw) {
  const tokens = raw.tokens || {};
  const asNumberOrNull = (value) => (Number.isFinite(value) ? Number(value) : null);
  const inputTokens = asNumberOrNull(tokens.input);
  const outputTokens = asNumberOrNull(tokens.output);
  const cachedTokens = asNumberOrNull(tokens.cached);
  const explicitTotal = asNumberOrNull(raw.totalTokens ?? tokens.total);
  const totalTokens = explicitTotal ?? (
    inputTokens !== null && outputTokens !== null
      ? inputTokens + outputTokens
      : null
  );
  const lowerConn = String(raw.connectionId || "").toLowerCase();
  const clientType = raw.clientType || (
    raw.source === "app" || lowerConn.includes("app") ? "app" :
    raw.source === "extension" || lowerConn.includes("extension") || raw.source === "ide" || lowerConn.includes("ide") ? "extension" : "cli"
  );
  const model = (raw.model && raw.model !== "<synthetic>") ? String(raw.model) : null;
  const provider = normalizeProvider(raw.provider, raw.cli, model);

  return {
    traceId: String(raw.traceId || `trace-${Math.random().toString(36).slice(2, 9)}`),
    cli: raw.cli || "agent", // "antigravity" | "claude" | "cursor" | etc.
    clientType, // "app" | "cli" | "ide" | "extension" | "desktop"
    source: raw.source || clientType,
    connectionId: String(raw.connectionId || "Agent Desk"),
    account: String(raw.account || "Default Workspace"),
    cwd: raw.cwd ? String(raw.cwd) : null,
    worktree: raw.worktree ? String(raw.worktree) : null,
    model,
    provider,
    state: isCanonicalTraceState(raw.state) ? raw.state : "idle",
    startedAt: typeof raw.startedAt === "number" ? raw.startedAt : null,
    elapsedMs: typeof raw.elapsedMs === "number" ? raw.elapsedMs : null,
    // Epoch ms of the most recent observable activity in this session. Unlike
    // `elapsedMs` (total session duration) this is what idle-time visuals must
    // use. Never derive it from startedAt + elapsedMs: that is session length,
    // not inactivity, and reusing it would hide the difference.
    lastActivityAt: Number.isFinite(raw.lastActivityAt) ? raw.lastActivityAt : null,
    tokens: {
      input: inputTokens,
      output: outputTokens,
      cached: cachedTokens,
    },
    totalTokens,
    cost: asNumberOrNull(raw.cost),
    status: raw.status ? String(raw.status) : null,
    tools: Array.isArray(raw.tools) ? raw.tools : [],
    activeTool: raw.activeTool || null,
    questionEvidence: raw.questionEvidence && typeof raw.questionEvidence === "object"
      ? {
          source: ["transcript", "provider-live", "live-terminal"].includes(raw.questionEvidence.source)
            ? raw.questionEvidence.source
            : null,
          observedAt: Number.isFinite(raw.questionEvidence.observedAt)
            ? raw.questionEvidence.observedAt
            : null,
        }
      : null,
    currentCommand: raw.currentCommand || null,
    sessionTitle: raw.sessionTitle ? String(raw.sessionTitle) : null,
    lastText: raw.lastText ? String(raw.lastText) : null,
    lastTextRole: ["user", "assistant"].includes(raw.lastTextRole) ? raw.lastTextRole : null,
    error: raw.error ? String(raw.error) : null,
    // A session that died in the middle of a turn. Carried through the contract
    // because the chat queue must not auto-drain into a session nobody can read.
    cutOffByExit: Boolean(raw.cutOffByExit || false),
    interruptedReason: raw.interruptedReason ? String(raw.interruptedReason) : null,
    compactionDetected: Boolean(raw.compactionDetected || false),
    compactionCount: asNumberOrNull(raw.compactionCount) ?? 0,
    failedCompactionCount: asNumberOrNull(raw.failedCompactionCount) ?? 0,
    schemaDriftSuspected: Boolean(raw.schemaDriftSuspected || false),
    isTurnComplete: Boolean(raw.isTurnComplete || false),
    openTurn: Boolean(raw.openTurn || false),
    lastStopReason: raw.lastStopReason ? String(raw.lastStopReason) : null,
    turnCount: asNumberOrNull(raw.turnCount),
    messageCount: asNumberOrNull(raw.messageCount),
    turnId: raw.turnId ? String(raw.turnId) : null,
    // Epoch ms of the moment the latest user prompt was submitted. This is the anchor for
    // "how long has the agent been working on the current turn" — `startedAt` is the session
    // age and `elapsedMs` is the session length, neither of which describes the open turn.
    lastUserPromptAt: asNumberOrNull(raw.lastUserPromptAt),
    lastCompletedAt: typeof raw.lastCompletedAt === "number" ? raw.lastCompletedAt : (typeof raw.completedAt === "number" ? raw.completedAt : null),
    pendingToolCallCount: asNumberOrNull(raw.pendingToolCallCount) ?? 0,
    resumableInterruptedTurn: Boolean(raw.resumableInterruptedTurn || false),
    logs: Array.isArray(raw.logs) ? raw.logs : [],
    parentTraceId: raw.parentTraceId || null,
    parentConnectionId: raw.parentConnectionId || null,
    isSubagent: Boolean(raw.isSubagent || false),
    role: raw.role ? String(raw.role) : null,
    subagents: Array.isArray(raw.subagents) ? raw.subagents : [],
  };
}

const PROVIDER_NAMES = {
  gemini: "Google Gemini",
  anthropic: "Anthropic Claude",
  openai: "OpenAI",
  minimax: "MiniMax",
  deepseek: "DeepSeek",
  other: "Other",
};

export function extractProviders(traces) {
  const seen = new Set();
  const list = [];
  for (const t of traces) {
    const p = normalizeProvider(t.provider, t.cli, t.model);
    if (!seen.has(p)) {
      seen.add(p);
      list.push({
        provider: p,
        name: PROVIDER_NAMES[p] || (p.charAt(0).toUpperCase() + p.slice(1)),
      });
    }
  }
  return list;
}

/**
 * Removes the fixed preamble a multi-agent environment prepends to a dispatched
 * worker's first user message, returning the actual task text when identifiable.
 */
export function stripDispatchPreamble(text) {
  const raw = String(text || "");
  if (!/multi-agent IDE|dispatched worker|coordinator's terminal/i.test(raw)) return raw;

  const task = raw.match(/===\s*TASK\s*===\s*([\s\S]+)/i);
  if (task) return task[1].trim();

  const labelled = raw.match(/\b(?:task|objective|spec)\b\s*[:\-]\s*([\s\S]+)/i);
  if (labelled) return labelled[1].trim();

  const paragraphs = raw.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return paragraphs.length > 1 ? paragraphs[paragraphs.length - 1] : raw;
}

