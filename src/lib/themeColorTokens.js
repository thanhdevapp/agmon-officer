/**
 * Runtime colour adapter for AGMon.
 *
 * Colour *definitions* live in `src/app/globals.css` (`:root` plus one block per
 * `[data-theme]`). This module never defines a colour — it only resolves and
 * converts the ones already defined there, for the renderers that cannot consume
 * CSS custom properties directly:
 *
 *   - xterm.js      needs concrete colour strings, not `var(...)`
 *   - PixiJS/WebGL  needs numeric `0xRRGGBB`
 *   - Electron main needs concrete values before any renderer/CSS exists
 *   - innerHTML art needs validated values before interpolation
 *
 * CSS and the DOM should reference `var(--token)` directly and never import this
 * module. Reading tokens is cached per active theme and keyed off the live
 * `data-theme` attribute, so a theme switch invalidates the cache without any
 * explicit teardown.
 */

import { normalizeCssColorToHexOrRgba } from "./theme/vscodeThemeImporter.js";

/** CSS custom property names that make up the AGMon colour contract. */
export const CSS_COLOR_TOKENS = [
  // Surfaces
  "bg-workbench",
  "bg-editor",
  "bg-sidebar",
  "bg-activitybar",
  "bg-titlebar",
  "bg-statusbar",
  "bg-card",
  "bg-card-inner",
  "bg-hover",
  "bg-selection",
  "bg-elevated",
  "bg-panel",
  "bg-selected",
  "bg-input",
  // Borders
  "border-subtle",
  "border-card",
  "border-focus",
  // Accent
  "accent-primary",
  "accent-hover",
  "accent-secondary",
  // Text
  "text-main",
  "text-muted",
  "text-secondary",
  "text-dim",
  "text-bright",
  "text-on-accent",
  // Status
  "status-running",
  "status-running-bg",
  "status-running-border",
  "status-warning",
  "status-warning-bg",
  "status-warning-border",
  "status-error",
  "status-error-bg",
  "status-error-border",
  "status-idle",
  "status-idle-bg",
  // Chat
  "bg-chat-user",
  "border-chat-user",
  "text-chat-user",
  "text-chat-user-body",
  "bg-chat-agent",
  "border-chat-agent",
  "bg-chat-tool",
  "border-chat-tool",
  "bg-chat-code",
  "text-chat-code",
  // Danger / destructive
  "danger",
  "danger-bg",
  "danger-border",
  // Image canvas
  "canvas-backdrop",
  "canvas-checker",
  // Informational
  "info",
  "info-bg",
  "info-bg-hover",
  "info-border",
  // Overlay & shadow
  "overlay-bg",
  "shadow-strong",
  "scrim-base",
  "overlay-ink",
  "surface-document",
  // Terminal
  "term-bg",
  "term-fg",
  "term-cursor",
  "term-cursor-accent",
  "term-selection",
  "ansi-black",
  "ansi-red",
  "ansi-green",
  "ansi-yellow",
  "ansi-blue",
  "ansi-magenta",
  "ansi-cyan",
  "ansi-white",
  "ansi-bright-black",
  "ansi-bright-red",
  "ansi-bright-green",
  "ansi-bright-yellow",
  "ansi-bright-blue",
  "ansi-bright-magenta",
  "ansi-bright-cyan",
  "ansi-bright-white",
  // Office scene
  "scene-canvas-bg",
  // AI Provider Brand Logos
  "brand-claude",
  "brand-antigravity-1",
  "brand-antigravity-2",
  "brand-antigravity-3",
  "brand-antigravity-4",
  "brand-codex",
  "brand-xia",
  // Git decorations
  "git-decoration-added",
  "git-decoration-modified",
  "git-decoration-deleted",
  "git-decoration-renamed",
  "git-decoration-untracked",
  "git-decoration-copied",
  "git-decoration-ignored",
  // Feature accents
  "feature-office",
  "feature-workspace",
  "feature-tasks",
  "feature-cto",
];

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_PATTERN = /^rgba?\(\s*([^)]+?)\s*\)$/i;

/**
 * Parse a CSS colour string into channel values.
 * Supports hex (3/4/6/8 digit), `rgb()`, `rgba()`, and modern space/slash syntax.
 * Returns `null` for anything it cannot verify — callers that interpolate into
 * markup or hand values to a canvas must treat `null` as "reject".
 *
 * @param {unknown} value
 * @returns {{r:number,g:number,b:number,a:number}|null}
 */
export function parseColor(value) {
  if (typeof value !== "string") return null;
  let raw = value.trim().toLowerCase();
  if (!raw) return null;
  if (raw === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

  if (raw.startsWith("oklch(") || raw.startsWith("hsl(") || raw.startsWith("hsla(")) {
    const normalized = normalizeCssColorToHexOrRgba(raw);
    if (!normalized) return null;
    raw = normalized.toLowerCase();
  }

  const hex = HEX_PATTERN.exec(raw);
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3 || digits.length === 4) {
      digits = digits.split("").map((ch) => ch + ch).join("");
    }
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
      a: digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1,
    };
  }

  const rgb = RGB_PATTERN.exec(raw);
  if (!rgb) return null;

  const body = rgb[1].replace(/\//g, " ");
  const parts = body.split(/[\s,]+/).filter(Boolean);
  if (parts.length < 3) return null;

  const channel = (part) =>
    part.endsWith("%")
      ? Math.round((parseFloat(part) / 100) * 255)
      : parseInt(part, 10);

  const r = channel(parts[0]);
  const g = channel(parts[1]);
  const b = channel(parts[2]);
  if ([r, g, b].some((n) => !Number.isFinite(n))) return null;

  let a = 1;
  if (parts.length >= 4) {
    a = parts[3].endsWith("%") ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
    if (!Number.isFinite(a)) a = 1;
  }

  return {
    r: clampChannel(r),
    g: clampChannel(g),
    b: clampChannel(b),
    a: Math.min(1, Math.max(0, a)),
  };
}

function clampChannel(value) {
  return Math.min(255, Math.max(0, value));
}

/**
 * True when `value` is a colour this project is willing to render.
 * Use before interpolating externally supplied colours into markup.
 */
export function isValidColor(value) {
  return parseColor(value) !== null;
}

/** Normalise a colour to `#rrggbb`, or return `fallback` when unparseable. */
export function toHex(value, fallback = "#000000") {
  const parsed = parseColor(value);
  if (!parsed) return fallback;
  return `#${[parsed.r, parsed.g, parsed.b].map(to2).join("")}`;
}

/**
 * Normalise a colour to XTerm 16-bit RGB notation: `rgb:rrrr/gggg/bbbb`.
 * Used for terminal OSC 10/11/12 color reporting responses (ADE #32242 parity).
 *
 * @param {unknown} value
 * @param {string} [fallback="#000000"]
 * @returns {string} e.g. "rgb:0c0c/0c0c/0e0e"
 */
export function toXtermRgb(value, fallback = "#000000") {
  const parsed = parseColor(value) || parseColor(fallback) || { r: 0, g: 0, b: 0 };
  const toHex4 = (channel) => {
    const hex2 = clampChannel(channel).toString(16).padStart(2, "0");
    return hex2 + hex2;
  };
  return `rgb:${toHex4(parsed.r)}/${toHex4(parsed.g)}/${toHex4(parsed.b)}`;
}

/**
 * Normalise a colour to a string every supported renderer accepts.
 * Opaque colours become `#rrggbb`; translucent ones become `rgba(...)` because
 * xterm and canvas paths differ on 8-digit hex support.
 */
export function toCssColor(value, fallback = "#000000") {
  const parsed = parseColor(value);
  if (!parsed) return fallback;
  if (parsed.a >= 1) return `#${[parsed.r, parsed.g, parsed.b].map(to2).join("")}`;
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${round(parsed.a)})`;
}

/** Normalise a colour to a numeric `0xRRGGBB` value for PixiJS/WebGL. */
export function toPixiNumber(value, fallback = 0x000000) {
  const parsed = parseColor(value);
  if (!parsed) return fallback;
  return ((parsed.r << 16) | (parsed.g << 8) | parsed.b) >>> 0;
}

/** Normalise a colour to `[r, g, b, a]` with a 0–1 alpha, for PixiJS tints. */
export function toRgbaArray(value, fallback = [0, 0, 0, 1]) {
  const parsed = parseColor(value);
  if (!parsed) return fallback;
  return [parsed.r, parsed.g, parsed.b, parsed.a];
}

/** Re-emit a colour at a different opacity without hex concatenation. */
export function withAlpha(value, alpha, fallback = "#000000") {
  const parsed = parseColor(value);
  if (!parsed) return fallback;
  const next = Math.min(1, Math.max(0, Number.isFinite(alpha) ? alpha : parsed.a));
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${round(next)})`;
}

/** A `var(...)` reference for use in CSS strings and inline styles. */
export function cssVar(token) {
  return `var(--${token.replace(/^--/, "")})`;
}

/**
 * A translucent `var(...)` for CSS consumers.
 * Uses `color-mix` rather than appending a hex alpha suffix, because the token
 * value may itself be a `var()` reference or an `rgb()` function.
 */
export function cssVarAlpha(token, alpha) {
  return `color-mix(in srgb, ${cssVar(token)} ${round(Math.min(1, Math.max(0, alpha)) * 100)}%, transparent)`;
}

function to2(value) {
  return clampChannel(value).toString(16).padStart(2, "0");
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

let cache = null;
let cacheTheme = null;
let cacheRoot = null;
let cachedThemeKey = "";
let cachedTokens = null;

function currentThemeId(root) {
  return root?.getAttribute?.("data-theme") || "";
}

/**
 * Read a batch of tokens as concrete colour strings for the active theme.
 * Returns `{}` when there is no DOM (Electron main, unit tests).
 */
export function getTokenColors(tokens, options = {}) {
  const root = options.root || (typeof document !== "undefined" ? document.documentElement : null);
  if (!root || typeof getComputedStyle !== "function") return {};

  const themeId = currentThemeId(root);
  if (!cache || cacheTheme !== themeId || cacheRoot !== root || cachedThemeKey !== themeId) {
    cache = {};
    cacheTheme = themeId;
    cacheRoot = root;
    cachedThemeKey = themeId;
    cachedTokens = cache;
  }

  const computed = getComputedStyle(root);
  const result = {};
  for (const token of tokens) {
    if (cache[token]) {
      result[token] = cache[token];
      continue;
    }
    const raw = computed.getPropertyValue(`--${token.replace(/^--/, "")}`).trim();
    if (!raw) continue;
    const value = toCssColor(raw, "");
    if (value) {
      cache[token] = value;
      result[token] = value;
    }
  }
  return result;
}

/**
 * Read one token as a concrete colour string.
 * Falls back to `fallback` when the token is missing or holds an expression this
 * parser cannot reduce (for example an unresolved `color-mix()`).
 */
export function getTokenColor(token, fallback = "#000000", options = {}) {
  const values = getTokenColors([token], options);
  return values[token] || fallback;
}

/** Read one token as a numeric `0xRRGGBB` value, for PixiJS. */
export function getTokenPixiNumber(token, fallback = 0x000000, options = {}) {
  const parsed = parseColor(getTokenColor(token, "", options));
  return parsed ? toPixiNumberValue(parsed) : fallback;
}

function toPixiNumberValue({ r, g, b }) {
  return ((r << 16) | (g << 8) | b) >>> 0;
}

/** Drop the resolved-token cache. Only needed when a test swaps the document. */
export function invalidateTokenCache() {
  cache = null;
  cacheTheme = null;
  cacheRoot = null;
  cachedThemeKey = "";
  cachedTokens = null;
}

/** Alias to invalidate resolved theme token cache when dynamic `<style id="agmon-custom-themes">` updates. */
export function invalidateThemeTokenCache() {
  invalidateTokenCache();
}

/** Map from AGMon token name to xterm.js `ITheme` key. */
const XTERM_TOKEN_MAP = {
  background: "term-bg",
  foreground: "term-fg",
  cursor: "term-cursor",
  cursorAccent: "term-cursor-accent",
  selectionBackground: "term-selection",
  black: "ansi-black",
  red: "ansi-red",
  green: "ansi-green",
  yellow: "ansi-yellow",
  blue: "ansi-blue",
  magenta: "ansi-magenta",
  cyan: "ansi-cyan",
  white: "ansi-white",
  brightBlack: "ansi-bright-black",
  brightRed: "ansi-bright-red",
  brightGreen: "ansi-bright-green",
  brightYellow: "ansi-bright-yellow",
  brightBlue: "ansi-bright-blue",
  brightMagenta: "ansi-bright-magenta",
  brightCyan: "ansi-bright-cyan",
  brightWhite: "ansi-bright-white",
};

/** Neutral fallbacks so a terminal is still legible if a theme omits a token. */
const XTERM_FALLBACKS = {
  background: "#0c0c0e",
  foreground: "#d4d4d8",
  cursor: "#ededef",
  cursorAccent: "#0c0c0e",
  selectionBackground: "#3fb9844d",
  black: "#1e2430",
  red: "#f0616f",
  green: "#3fb984",
  yellow: "#d9a441",
  blue: "#5b9cf8",
  magenta: "#c98bf0",
  cyan: "#45b8c4",
  white: "#c8cdd6",
  brightBlack: "#4a5563",
  brightRed: "#ff7b85",
  brightGreen: "#58c896",
  brightYellow: "#e8bd5c",
  brightBlue: "#7bb0fa",
  brightMagenta: "#dda5f5",
  brightCyan: "#5fcbd6",
  brightWhite: "#f2f5f8",
};

/**
 * Build the xterm.js theme object for the active UI theme.
 * Shared by the desktop and mobile terminal surfaces so both follow one palette.
 */
export function getTerminalPalette(options = {}) {
  const tokens = Object.values(XTERM_TOKEN_MAP);
  const resolved = getTokenColors(tokens, options);
  const palette = {};
  for (const [key, token] of Object.entries(XTERM_TOKEN_MAP)) {
    palette[key] = resolved[token] || XTERM_FALLBACKS[key];
  }
  return palette;
}

/**
 * Colours used by the PixiJS office scene that belong to the UI theme rather than
 * to an office-environment cosmetic. Floor, rack and panel colours stay in the
 * office theme catalogue; only the renderer background follows the app theme.
 */
export function getScenePalette(options = {}) {
  const resolved = getTokenColors(["scene-canvas-bg"], options);
  return {
    canvasBackground: toPixiNumber(resolved["scene-canvas-bg"], 0x0b0f16),
  };
}