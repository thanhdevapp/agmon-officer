/**
 * AGMon v1.0.0 — Phase 3: Dynamic Environment-Aware WebGL Context Budget Manager
 * (`src/lib/webglContextBudget.js`)
 *
 * Prevents Chromium `WEBGL_lose_context` crashes when running PixiJS 2D Office Canvas
 * alongside up to 24+ split `xterm.js` terminals:
 * - On Electron (`window.agmonElectron`): allows up to **16** active `xterm.js` WebGL contexts
 *   + **1** `PixiJS` 2D Office WebGL context (backed by `--max-active-webgl-contexts=32`).
 * - On external Web Browsers (`--web` / `localhost:3030`): caps active `xterm.js` WebGL contexts
 *   at **8** + **1** `PixiJS` 2D Office WebGL context to stay safely below the browser's 16 limit.
 * - Terminals exceeding the budget or hidden in background tabs automatically downgrade to
 *   Canvas2D/DOM renderer and seamlessly re-acquire WebGL on focus (LRU eviction).
 */

export const ELECTRON_MAX_TERMINAL_WEBGL = 16;
export const BROWSER_MAX_TERMINAL_WEBGL = 8;

export function detectMaxTerminalWebglContexts(envOverride = null) {
  if (typeof envOverride === "number" && envOverride > 0) {
    return envOverride;
  }
  if (
    typeof window !== "undefined" &&
    window.agmonElectron &&
    window.agmonElectron.isElectron === true
  ) {
    return Number(window.agmonElectron.maxWebglContexts) || ELECTRON_MAX_TERMINAL_WEBGL;
  }
  return BROWSER_MAX_TERMINAL_WEBGL;
}

export class WebglContextBudgetManager {
  constructor({ maxTerminalContexts = null } = {}) {
    this.customMax = maxTerminalContexts;
    this.pixiAllocated = false;
    // Map<terminalId, { id, lastActiveTs, releaseWebgl: () => void, restoreWebgl?: () => void }>
    this.activeTerminals = new Map();
    this.evictionCount = 0;
  }

  getMaxTerminalContexts() {
    return detectMaxTerminalWebglContexts(this.customMax);
  }

  acquirePixiOfficeContext() {
    this.pixiAllocated = true;
    return true;
  }

  releasePixiOfficeContext() {
    this.pixiAllocated = false;
  }

  /**
   * Requests a WebGL slot for an `xterm.js` instance.
   * If the active terminal count is at the environment cap (16 on Electron, 8 on Web),
   * evicts the Least Recently Used (LRU) terminal's WebGL addon first so it falls back
   * cleanly to Canvas2D/DOM without losing terminal buffer state.
   */
  acquireTerminalContext(terminalId, { releaseWebgl, restoreWebgl } = {}) {
    if (!terminalId) return false;

    const now = Date.now();
    if (this.activeTerminals.has(terminalId)) {
      const existing = this.activeTerminals.get(terminalId);
      existing.lastActiveTs = now;
      if (releaseWebgl) existing.releaseWebgl = releaseWebgl;
      if (restoreWebgl) existing.restoreWebgl = restoreWebgl;
      return true;
    }

    const maxAllowed = this.getMaxTerminalContexts();
    while (this.activeTerminals.size >= maxAllowed) {
      const evicted = this.evictLeastRecentlyUsed();
      if (!evicted) break;
    }

    this.activeTerminals.set(terminalId, {
      id: terminalId,
      lastActiveTs: now,
      releaseWebgl: typeof releaseWebgl === "function" ? releaseWebgl : () => {},
      restoreWebgl: typeof restoreWebgl === "function" ? restoreWebgl : null,
    });

    return true;
  }

  touchTerminalContext(terminalId) {
    const entry = this.activeTerminals.get(terminalId);
    if (entry) {
      entry.lastActiveTs = Date.now();
      return true;
    }
    return false;
  }

  releaseTerminalContext(terminalId) {
    const entry = this.activeTerminals.get(terminalId);
    if (!entry) return false;
    this.activeTerminals.delete(terminalId);
    try {
      entry.releaseWebgl?.();
    } catch {}
    return true;
  }

  evictLeastRecentlyUsed() {
    let oldestKey = null;
    let oldestTs = Infinity;

    for (const [id, entry] of this.activeTerminals.entries()) {
      if (entry.lastActiveTs < oldestTs) {
        oldestTs = entry.lastActiveTs;
        oldestKey = id;
      }
    }

    if (oldestKey === null) return false;
    const victim = this.activeTerminals.get(oldestKey);
    this.activeTerminals.delete(oldestKey);
    this.evictionCount += 1;

    try {
      victim?.releaseWebgl?.();
    } catch {}

    return true;
  }

  getSnapshot() {
    return {
      runtime:
        typeof window !== "undefined" && window.agmonElectron?.isElectron
          ? "electron"
          : "web",
      maxTerminalContexts: this.getMaxTerminalContexts(),
      activeTerminalWebglCount: this.activeTerminals.size,
      pixiOfficeContextActive: this.pixiAllocated,
      totalWebglContexts: this.activeTerminals.size + (this.pixiAllocated ? 1 : 0),
      activeTerminalIds: Array.from(this.activeTerminals.keys()),
      evictionCount: this.evictionCount,
    };
  }
}

export const webglContextBudget = new WebglContextBudgetManager();
export default webglContextBudget;
