// Core session workstation & telemetry aggregator for AGMon IDE.
// Decouples session grouping, subagent attachment, and telemetry stats from the
// 2D Virtual Office plugin so the Core IDE operates independently of PixiJS.

import { normalizeProvider } from "./traceContract.js";
import {
  isSessionError,
  isSessionQuestion,
  isSessionQueued,
  isSessionWorking,
} from "./sessionActivity.js";

export const STATE_COLORS = {
  pending: 0xf59e0b,
  question: 0xf59e0b,
  streaming: 0x22d3ee,
  idle: 0x38bdf8,
  done: 0x34d399,
  error: 0xef4444,
};

export const LOOP_COLORS = {
  alert: 0xf43f5e,
};

export const PROVIDER_BRAND_COLORS = {
  gemini: 0x38bdf8,
  anthropic: 0xd97706,
  openai: 0x10b981,
  minimax: 0xa855f7,
  deepseek: 0x3b82f6,
  other: 0x64748b,
};

export const PROVIDER_LABELS = {
  gemini: "GEMINI",
  anthropic: "ANTHROPIC",
  openai: "OPENAI",
  minimax: "MINIMAX",
  deepseek: "DEEPSEEK",
  other: "OTHER",
};

export const SLEEP_AFTER_MS = 60000;

export const STATE_LABELS = {
  pending: "Queued",
  question: "Waiting",
  streaming: "Working",
  idle: "Ready",
  done: "Done",
  error: "Failed",
};

export const OFFICE = {
  floorY: 820,
  agentCols: 6,
  agentRows: 5,
  deskW: 150,
  deskH: 84,
  colGap: 200,
  rowGap: 170,
  originX: 60,
  rackX: 1500,
  rackY: 480,
  podX: 1860,
  podGap: 158,
  podCapacity: 4,
};

function humanSize(n) {
  if (!n) return "0";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

/**
 * Aggregates live trace records into session workstations, provider pods, and
 * summary statistics for the Core IDE and optional plugins.
 *
 * @param {Array} traces
 * @param {number} [now]
 * @returns {{ workstations: Array, rack: object, pods: Array, fallbacks: Array, stats: object }}
 */
export function buildWorkstationsAndStats(traces = [], now = Date.now()) {
  const byAccount = new Map();
  const subagentTraces = [];

  for (const trace of traces) {
    if (!trace?.connectionId) continue;
    if (trace.isSubagent || trace.parentTraceId || trace.parentConnectionId) {
      subagentTraces.push(trace);
      continue;
    }

    const normalizedProvider = normalizeProvider(trace.provider, trace.cli, trace.model);
    let entry = byAccount.get(trace.connectionId);
    if (!entry) {
      const lowerConn = String(trace.connectionId || "").toLowerCase();
      const clientType =
        trace.clientType ||
        (trace.source === "app" || lowerConn.includes("app")
          ? "app"
          : trace.source === "extension" ||
              lowerConn.includes("extension") ||
              trace.source === "ide" ||
              lowerConn.includes("ide")
            ? "extension"
            : "cli");
      entry = {
        connectionId: trace.connectionId,
        account: trace.account || trace.connectionId,
        model: trace.model,
        provider: normalizedProvider,
        cli: trace.cli || "agent",
        clientType,
        source: trace.source || clientType,
        clientIcon: trace.clientIcon,
        traces: [],
        tokens: { input: 0, output: 0, cached: 0 },
        totalTokens: null,
        activeCount: 0,
        errorCount: 0,
        tools: [],
        errorReason: null,
        fallbackFrom: null,
        queued: 0,
        elapsedMs: 0,
        cost: null,
        pendingCount: 0,
        isLooping: false,
        loopPattern: null,
        loopReason: null,
        hotspotFile: null,
        compactionDetected: false,
        compactionCount: 0,
        schemaDriftSuspected: false,
        logs: [],
        subagents: [],
        skin: trace.skin || null,
        aura: trace.aura || null,
        pet: trace.pet || null,
        props: trace.props || [],
        trophy: trace.trophy || null,
        theme: trace.theme || null,
        sessionTitle: trace.sessionTitle || trace.account || "agent-factory",
        cwd: trace.cwd || null,
        detectedPort: trace.detectedPort || null,
        webPort: trace.webPort || null,
        lastText: null,
        lastTextRole: null,
        lastActivityAt: null,
      };
      byAccount.set(trace.connectionId, entry);
    } else {
      if (trace.model && (!entry.model || entry.model === "<synthetic>")) {
        entry.model = trace.model;
      }
      if (normalizedProvider && (!entry.provider || entry.provider === "other")) {
        entry.provider = normalizedProvider;
      }
    }
    entry.traces.push(trace);
    if (trace.cwd && !entry.cwd) entry.cwd = trace.cwd;
    if (trace.detectedPort && !entry.detectedPort) entry.detectedPort = trace.detectedPort;
    if (trace.webPort && !entry.webPort) entry.webPort = trace.webPort;
    if (trace.skin && !entry.skin) entry.skin = trace.skin;
    if (trace.aura && !entry.aura) entry.aura = trace.aura;
    if (trace.pet && !entry.pet) entry.pet = trace.pet;
    if (trace.props?.length && (!entry.props || !entry.props.length)) entry.props = trace.props;
    if (trace.trophy && !entry.trophy) entry.trophy = trace.trophy;
    if (trace.theme && !entry.theme) entry.theme = trace.theme;
    if (trace.isLooping) {
      entry.isLooping = true;
      entry.loopPattern = trace.loopPattern || entry.loopPattern || null;
      entry.loopReason = trace.loopReason || entry.loopReason || null;
      entry.hotspotFile = trace.hotspotFile || entry.hotspotFile || null;
    }
    if (trace.compactionDetected) {
      entry.compactionDetected = true;
      entry.compactionCount = Math.max(
        entry.compactionCount || 0,
        Number(trace.compactionCount) || 1
      );
    }
    if (trace.schemaDriftSuspected) {
      entry.schemaDriftSuspected = true;
    }
    if (Array.isArray(trace.logs) && trace.logs.length > 0) entry.logs = trace.logs;
    if (trace.activeTool && !entry.activeTool) entry.activeTool = trace.activeTool;
    if (trace.currentCommand && !entry.currentCommand) entry.currentCommand = trace.currentCommand;
    if (trace.sessionTitle) entry.sessionTitle = trace.sessionTitle;
    if (trace.lastText) {
      entry.lastText = trace.lastText;
      entry.lastTextRole = trace.lastTextRole;
    }
    if (Number.isFinite(trace.lastActivityAt)) {
      entry.lastActivityAt = Math.max(entry.lastActivityAt ?? 0, trace.lastActivityAt);
    }
    if (Array.isArray(trace.subagents) && trace.subagents.length > 0) {
      for (const sa of trace.subagents) {
        if (!entry.subagents.some((s) => s.id === sa.id || (s.role && s.role === sa.role))) {
          entry.subagents.push({
            ...sa,
            state: sa.state || sa.status || (trace.state === "streaming" ? "streaming" : "done"),
          });
        }
      }
    }
    for (const call of trace.toolCalls || []) {
      const toolName = call.tool || call.type;
      if (toolName && !entry.tools.includes(toolName)) entry.tools.push(toolName);
    }
    entry.tokens.input += trace.tokens?.input ?? 0;
    entry.tokens.output += trace.tokens?.output ?? 0;
    entry.tokens.cached += trace.tokens?.cached ?? 0;
    if (Number.isFinite(trace.totalTokens)) {
      entry.totalTokens = (entry.totalTokens ?? 0) + trace.totalTokens;
    }
    entry.queued += Math.max(1, trace.concurrent || 1);
    entry.elapsedMs = Math.max(entry.elapsedMs, trace.elapsedMs ?? 0);
    if (Number.isFinite(trace.cost)) {
      entry.cost = (entry.cost ?? 0) + trace.cost;
    }
    if (trace.fallback?.from && !entry.fallbackFrom) entry.fallbackFrom = trace.fallback.from;
    if (isSessionQuestion(trace)) {
      entry.questionCount = (entry.questionCount || 0) + 1;
    } else if (isSessionWorking(trace)) {
      entry.activeCount += 1;
      if (isSessionQueued(trace)) entry.pendingCount += 1;
    } else if (isSessionError(trace)) {
      entry.errorCount += 1;
      entry.errorReason = entry.errorReason || trace.error || "error";
    } else if (trace.state === "idle") {
      entry.idleCount = (entry.idleCount || 0) + 1;
    }
  }

  for (const sub of subagentTraces) {
    let parent = null;
    if (sub.parentConnectionId) {
      parent = byAccount.get(sub.parentConnectionId);
    }
    if (!parent && sub.parentTraceId) {
      parent = [...byAccount.values()].find((p) =>
        p.traces.some((t) => t.traceId === sub.parentTraceId)
      );
    }
    if (!parent && sub.account) {
      parent = [...byAccount.values()].find((p) => p.account === sub.account);
    }

    if (parent) {
      if (!parent.subagents) parent.subagents = [];
      const subId = sub.traceId || sub.connectionId;
      const existing = parent.subagents.find((s) => s.id === subId);
      if (existing) {
        existing.state = sub.state || existing.state;
        existing.activeTool = sub.activeTool || existing.activeTool;
        existing.tokens = sub.tokens || existing.tokens;
      } else {
        parent.subagents.push({
          id: subId,
          connectionId: sub.connectionId,
          role: sub.role || sub.sessionTitle || "Subagent",
          typeName: sub.typeName || "worker",
          state: sub.state || "idle",
          model: sub.model || parent.model,
          tokens: sub.tokens,
          activeTool: sub.activeTool,
          currentCommand: sub.currentCommand,
          sceneColor: sub.sceneColor || STATE_COLORS.idle,
        });
      }
      if (isSessionWorking(sub)) {
        parent.activeCount += 1;
        if (isSessionQueued(sub)) parent.pendingCount += 1;
      } else if (isSessionError(sub)) {
        parent.errorCount += 1;
        parent.errorReason = parent.errorReason || sub.error || "error";
      }
    } else {
      const normalizedProvider = normalizeProvider(sub.provider, sub.cli, sub.model);
      let entry = byAccount.get(sub.connectionId);
      if (!entry) {
        entry = {
          connectionId: sub.connectionId,
          account: sub.account || sub.connectionId,
          model: sub.model,
          provider: normalizedProvider,
          cli: sub.cli || "agent",
          clientType: sub.clientType || "cli",
          source: sub.source || "cli",
          clientIcon: sub.clientIcon,
          traces: [sub],
          tokens: {
            input: sub.tokens?.input ?? 0,
            output: sub.tokens?.output ?? 0,
            cached: sub.tokens?.cached ?? 0,
          },
          totalTokens: sub.totalTokens || null,
          activeCount: isSessionWorking(sub) ? 1 : 0,
          errorCount: isSessionError(sub) && !isSessionWorking(sub) ? 1 : 0,
          tools: sub.tools || [],
          errorReason: sub.error || null,
          fallbackFrom: null,
          queued: 1,
          elapsedMs: sub.elapsedMs || 0,
          cost: sub.cost || null,
          pendingCount: isSessionQueued(sub) ? 1 : 0,
          isLooping: sub.isLooping || false,
          loopPattern: sub.loopPattern || null,
          loopReason: sub.loopReason || null,
          hotspotFile: sub.hotspotFile || null,
          compactionDetected: Boolean(sub.compactionDetected),
          compactionCount: Number(sub.compactionCount || 0),
          schemaDriftSuspected: Boolean(sub.schemaDriftSuspected),
          logs: sub.logs || [],
          subagents: [],
          sessionTitle: sub.sessionTitle || "agent-factory",
          cwd: sub.cwd || null,
        };
        byAccount.set(sub.connectionId, entry);
      }
    }
  }

  const totalStations = byAccount.size;
  const cols = totalStations > 35 ? 8 : totalStations > 18 ? 7 : 6;
  const colGap = totalStations > 35 ? 175 : 200;
  const rowGap = totalStations > 35 ? 145 : 170;
  const rackX = Math.max(OFFICE.rackX, OFFICE.originX + cols * colGap + 120);
  const podX = rackX + 360;

  const workstations = [...byAccount.values()].map((entry, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const occupied = true;
    const isLooping = Boolean(entry.isLooping);
    const state =
      entry.questionCount > 0
        ? "question"
        : entry.activeCount > 0
          ? "streaming"
          : entry.errorCount > 0
            ? "error"
            : entry.idleCount > 0
              ? "idle"
              : "done";
    const lastActivityAt = Number.isFinite(entry.lastActivityAt) ? entry.lastActivityAt : null;
    const sleepAt = lastActivityAt === null ? null : lastActivityAt + SLEEP_AFTER_MS;
    const quietForMs = lastActivityAt === null ? entry.elapsedMs : now - lastActivityAt;
    const mode = isLooping
      ? "looping"
      : state === "question"
        ? "pending"
        : state === "error"
          ? "error"
          : state === "streaming"
            ? entry.pendingCount === entry.activeCount
              ? "pending"
              : "streaming"
            : state === "idle"
              ? "idle"
              : quietForMs >= SLEEP_AFTER_MS
                ? "sleeping"
                : "happy";
    const totalTokens =
      entry.totalTokens ??
      (entry.tokens.input > 0 || entry.tokens.output > 0
        ? entry.tokens.input + entry.tokens.output
        : null);
    const cachedPct =
      totalTokens && entry.tokens.cached > 0
        ? Math.round((entry.tokens.cached / totalTokens) * 100)
        : null;
    const fallbackWorkspace = entry.account || "agent-factory";
    const sessionTitle = entry.sessionTitle || fallbackWorkspace;
    return {
      ...entry,
      deskIndex: i,
      traceId: entry.traces?.[0]?.traceId || entry.connectionId,
      sessionTitle,
      occupied,
      state,
      mode,
      isLooping,
      lastActivityAt,
      sleepAt,
      logs: entry.logs,
      cachedPct,
      cost: Number.isFinite(entry.cost) ? Math.round(entry.cost * 100) / 100 : null,
      sceneColor: isLooping ? LOOP_COLORS.alert : STATE_COLORS[state],
      totalTokens,
      totalLabel: totalTokens === null ? "—" : humanSize(totalTokens),
      count: entry.traces.length,
      x: OFFICE.originX + col * colGap,
      y: OFFICE.floorY - row * rowGap,
      depth: 1,
      busy: entry.activeCount,
    };
  });

  const providers = [...new Set(workstations.map((w) => w.provider).filter(Boolean))];
  const podCount = providers.length;
  const podGap = podCount > 5 ? 136 : podCount === 5 ? 148 : 158;

  const pods = providers.map((provider, i) => {
    const clients = workstations.filter((w) => w.provider === provider);
    const busy = clients.reduce((s, w) => s + w.busy, 0);
    const tokens = clients.reduce((s, w) => s + (w.totalTokens ?? 0), 0);
    const anyError = clients.some((w) => w.state === "error");
    const brandColor = PROVIDER_BRAND_COLORS[provider] || 0x22d3ee;
    return {
      provider,
      brandColor,
      hasError: anyError,
      x: podX,
      y: OFFICE.rackY - ((providers.length - 1) * podGap) / 2 + i * podGap,
      busy,
      load: Math.min(1, busy / OFFICE.podCapacity),
      overloaded: busy >= OFFICE.podCapacity,
      totalTokens: tokens,
      totalLabel: humanSize(tokens),
      color: anyError ? STATE_COLORS.error : busy > 0 ? brandColor : STATE_COLORS.done,
    };
  });

  const podNames = new Set(providers);
  const laneMap = new Map();
  for (const w of workstations) {
    if (!w.fallbackFrom || !podNames.has(w.fallbackFrom) || w.fallbackFrom === w.provider) continue;
    const key = `${w.fallbackFrom}>${w.provider}`;
    const lane = laneMap.get(key) || { from: w.fallbackFrom, to: w.provider, count: 0 };
    lane.count += 1;
    laneMap.set(key, lane);
  }

  const totalTokens = workstations.reduce(
    (s, w) => s + (w.totalTokens ?? (w.tokens?.input ?? 0) + (w.tokens?.output ?? 0)),
    0
  );
  const totalInput = workstations.reduce((s, w) => s + (w.tokens?.input ?? 0), 0);
  const totalOutput = workstations.reduce((s, w) => s + (w.tokens?.output ?? 0), 0);
  const totalCached = workstations.reduce((s, w) => s + (w.tokens?.cached ?? 0), 0);

  return {
    workstations,
    pods,
    fallbacks: [...laneMap.values()],
    rack: {
      x: rackX,
      y: OFFICE.rackY,
      active: workstations.reduce((s, w) => s + w.busy, 0),
    },
    stats: {
      agents: workstations.length,
      busy: workstations.filter((w) => w.busy > 0).length,
      tokens: totalTokens,
      tokensLabel: humanSize(totalTokens),
      input: totalInput,
      output: totalOutput,
      cached: totalCached,
    },
  };
}

export const buildOffice = buildWorkstationsAndStats;
