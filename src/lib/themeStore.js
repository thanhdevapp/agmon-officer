/**
 * Design System Theme & Font Engine for AGMon (VS Code Standard)
 * Manages color themes, typography scales, font families, and live persistence.
 *
 * Colour values live in `src/app/globals.css`. This module owns theme *selection*
 * and the contract for telling renderers that the DOM palette changed — it does
 * not keep a second copy of any palette. `getThemePreviewColors()` reads the same
 * stylesheet, so a swatch in Settings can never drift from what the theme renders.
 */

import { getTokenColors, invalidateTokenCache, invalidateThemeTokenCache } from "./themeColorTokens.js";
import {
  parseVsCodeThemeJson,
  buildCustomThemesStylesheet,
} from "./theme/vscodeThemeImporter.js";

export const THEME_STORAGE_KEY = "agmon_theme_settings";
export const THEME_CHANGE_EVENT = "agmon:theme-change";
export const MAX_CUSTOM_THEMES = 25;

export const AVAILABLE_RADIUS_OPTIONS = [
  { id: "sharp", label: "Sharp (0px)", description: "Crisp architectural 0px corners" },
  { id: "default", label: "Default (6px)", description: "Standard balanced IDE corners" },
  { id: "soft", label: "Soft (10px)", description: "Smooth editorial card radius" },
  { id: "round", label: "Round (16px)", description: "Generous rounded Bento surfaces" },
];

export const AVAILABLE_SHADOW_OPTIONS = [
  { id: "soft", label: "Soft Elevation", description: "Subtle layered ambient shadow" },
  { id: "flat", label: "Flat Matte", description: "Zero shadow, pure 1px border discipline" },
  { id: "hard", label: "Hard Brutalist", description: "Crisp offset neo-brutalist shadow" },
  { id: "glow", label: "Accent Glow", description: "Subtle primary accent aura" },
];

export const AVAILABLE_BACKDROP_OPTIONS = [
  { id: "none", label: "None (Pure Matte)", description: "Clean solid workbench surface" },
  { id: "grid", label: "Technical Grid", description: "Subtle architectural blueprint grid" },
  { id: "dots", label: "Dot Matrix", description: "Fine isometric dot matrix pattern" },
  { id: "scanlines", label: "CRT Scanlines", description: "Retro terminal horizontal scanlines" },
  { id: "noise", label: "Film Grain Noise", description: "Tactile analog paper noise" },
  { id: "aurora", label: "Subtle Aurora", description: "Soft top-edge radial ambient wash" },
];

export const SIGNATURE_THEME_IDS = [
  "vercel-geist",
  "linear-carbon",
  "warm-obsidian",
  "zed-graphite",
];

/** Tokens a theme swatch needs, mapped onto the keys preview consumers use. */
const PREVIEW_TOKEN_KEYS = {
  workbench: "bg-workbench",
  editor: "bg-editor",
  sidebar: "bg-sidebar",
  accent: "accent-primary",
  border: "border-card",
  fg: "text-main",
};

const previewCache = new Map();

export const AVAILABLE_THEMES = [
  {
    id: "vercel-geist",
    name: "Vercel Geist Monochrome (Default)",
    shortName: "Vercel Geist",
    signature: true,
    category: "dark",
    description: "Pure matte zinc hierarchy where colour is reserved strictly for live status dots.",
  },
  {
    id: "linear-carbon",
    name: "Linear Carbon & Slate",
    shortName: "Linear Carbon",
    signature: true,
    category: "dark",
    description: "Refined obsidian-carbon surfaces with crisp 1px borders and calm indigo accents.",
  },
  {
    id: "warm-obsidian",
    name: "Warm Obsidian & Copper",
    shortName: "Warm Obsidian",
    signature: true,
    category: "dark",
    description: "Editorial warm stone surfaces with terracotta accents, zero cold blue cast.",
  },
  {
    id: "zed-graphite",
    name: "Zed Graphite & Sage",
    shortName: "Zed Graphite",
    signature: true,
    category: "dark",
    description: "Technical steel-graphite contrast with calm sage-emerald active indicators.",
  },
  {
    id: "dark-plus",
    name: "Dark+ (Classic IDE)",
    shortName: "Dark+",
    category: "dark",
    description: "Classic IDE dark carbon alias compatible with legacy workspace presets.",
  },
  {
    id: "one-dark-pro",
    name: "One Dark Pro",
    category: "dark",
    description: "Iconic Atom theme with soothing slate tones and soft sky accents.",
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    category: "dark",
    description: "Deep indigo night palette with soft periwinkle highlights.",
  },
  {
    id: "github-dark",
    name: "GitHub Dark",
    category: "dark",
    description: "High-contrast dark palette modeled after GitHub's developer design system.",
  },
  {
    id: "monokai-pro",
    name: "Monokai Pro",
    category: "dark",
    description: "Warm charcoal theme with muted gold highlights.",
  },
  {
    id: "light-plus",
    name: "Light+ (Daylight Paper)",
    category: "light",
    description: "Clean high-visibility developer light theme with crisp borders.",
  },
];

export const DEFAULT_THEME_ID = "vercel-geist";

export const DEFAULT_UI_FONT_STACK =
  '"Geist", "Geist Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const DEFAULT_CODE_FONT_STACK =
  '"Geist Mono", "JetBrains Mono", "Cascadia Code", "Roboto Mono", Monaco, Consolas, "Liberation Mono", monospace';

export const AVAILABLE_UI_FONTS = [
  { id: "system", name: "System Default (SF Pro / Segoe UI / Roboto)", value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
  { id: "inter", name: "Inter (Modern UI)", value: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { id: "segoe", name: "Segoe UI (Windows Native)", value: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif' },
  { id: "roboto", name: "Roboto (Material)", value: '"Roboto", "Helvetica Neue", Arial, sans-serif' },
  { id: "geist", name: "Geist Sans (Vercel Modern)", value: DEFAULT_UI_FONT_STACK },
];

export const AVAILABLE_CODE_FONTS = [
  { id: "system-mono", name: "System IDE Code (Geist / SF Mono / Consolas)", value: '"Geist Mono", "JetBrains Mono", "SF Mono", "Cascadia Code", "Roboto Mono", Monaco, Consolas, "Liberation Mono", monospace' },
  { id: "jetbrains", name: "JetBrains Mono (Developer Friendly)", value: '"JetBrains Mono", "Geist Mono", "Cascadia Code", "Roboto Mono", Monaco, Consolas, "Liberation Mono", monospace' },
  { id: "fira-code", name: "Fira Code (Ligatures Ready)", value: '"Fira Code", "Geist Mono", "JetBrains Mono", "Cascadia Code", "Roboto Mono", Monaco, Consolas, "Liberation Mono", monospace' },
  { id: "cascadia", name: "Cascadia Code (VS / Terminal)", value: '"Cascadia Code", "Cascadia Mono", "Geist Mono", "JetBrains Mono", "Roboto Mono", Consolas, "Liberation Mono", monospace' },
  { id: "geist-mono", name: "Geist Mono (Clean Technical)", value: DEFAULT_CODE_FONT_STACK },
];

export const AVAILABLE_FONT_SIZES = [
  { id: "12", label: "12px (Compact)" },
  { id: "13", label: "13px (VS Code Standard)" },
  { id: "14", label: "14px (Comfortable)" },
  { id: "15", label: "15px (Large Text)" },
  { id: "16", label: "16px (Extra Large)" },
];

export const DEFAULT_ZONE_FONT_SIZES = {
  toolbar: "12",
  sidebar: "13",
  editor: "13",
  terminal: "13",
  chat: "13",
};

export const FONT_SIZE_ZONES = [
  {
    id: "toolbar",
    label: "Chrome, Toolbars & Tabs",
    vsCodeKey: "window.toolbar.fontSize",
    cssVar: "--font-size-toolbar",
    description: "TitleBar, ActivityBar, Editor Tabs, Project Action Bar & StatusBar",
    sizes: ["11", "12", "13", "14", "15"],
    defaultSize: "12",
  },
  {
    id: "sidebar",
    label: "Sidebar & File Explorer",
    vsCodeKey: "workbench.tree.fontSize",
    cssVar: "--font-size-sidebar",
    description: "Agents list, Workstations, File Explorer & Watched Brain Folders",
    sizes: ["11", "12", "13", "14", "15", "16"],
    defaultSize: "13",
  },
  {
    id: "editor",
    label: "Code Editor & Diff Viewer",
    vsCodeKey: "editor.fontSize",
    cssVar: "--font-size-editor",
    description: "Monaco Code Editor, Side-by-Side Git Diff, Markdown & Telemetry JSON",
    sizes: ["12", "13", "14", "15", "16", "18"],
    defaultSize: "13",
  },
  {
    id: "terminal",
    label: "Integrated Terminal & Logs",
    vsCodeKey: "terminal.integrated.fontSize",
    cssVar: "--font-size-terminal",
    description: "XTerm.js Split Terminal (1x1 / 50:50 / 2x2), Quick Commands & Agent Output Logs",
    sizes: ["11", "12", "13", "14", "15", "16"],
    defaultSize: "13",
  },
  {
    id: "chat",
    label: "Live Chat & Inspector",
    vsCodeKey: "chat.editor.fontSize",
    cssVar: "--font-size-chat",
    description: "AI Live Chat dialogue, detailed transcripts, Replay & Inspector cards",
    sizes: ["12", "13", "14", "15", "16", "18"],
    defaultSize: "13",
  },
];

export const FONT_SIZE_PRESETS = [
  {
    id: "compact",
    label: "Compact IDE",
    description: "Optimized for 13–14 inch laptop screens to maximize screen real estate",
    fontSize: "12",
    fontSizes: { toolbar: "11", sidebar: "12", editor: "12", terminal: "12", chat: "12" },
  },
  {
    id: "standard",
    label: "VS Code Standard",
    description: "Standard balanced typography matching VS Code / Cursor default",
    fontSize: "13",
    fontSizes: { toolbar: "12", sidebar: "13", editor: "13", terminal: "13", chat: "13" },
  },
  {
    id: "reading",
    label: "Code & Chat Focus",
    description: "Enlarged Editor, Chat & Terminal while keeping Toolbar compact",
    fontSize: "14",
    fontSizes: { toolbar: "12", sidebar: "13", editor: "15", terminal: "14", chat: "15" },
  },
  {
    id: "hidpi",
    label: "Large / HiDPI 4K",
    description: "Crisp and clear typography for 27–32 inch external displays & 4K monitors",
    fontSize: "15",
    fontSizes: { toolbar: "13", sidebar: "14", editor: "16", terminal: "15", chat: "16" },
  },
];

export const DEFAULT_THEME_SETTINGS = {
  theme: DEFAULT_THEME_ID,
  uiFont: "geist",
  codeFont: "geist-mono",
  fontSize: "13",
  fontSizes: { ...DEFAULT_ZONE_FONT_SIZES },
  themeMigratedGeist: true,
  customThemes: [],
  radius: "default",
  shadow: "soft",
  backdrop: "none",
  dim: 0,
};

let memorySettingsFallback = {
  ...DEFAULT_THEME_SETTINGS,
  fontSizes: { ...DEFAULT_ZONE_FONT_SIZES },
};

/**
 * Returns all available themes (built-in AVAILABLE_THEMES + user-imported customThemes).
 */
export function getAllAvailableThemes(explicitSettings = null) {
  const settings = explicitSettings || getThemeSettings();
  const customList = Array.isArray(settings?.customThemes)
    ? settings.customThemes.slice(0, MAX_CUSTOM_THEMES)
    : [];
  return [...AVAILABLE_THEMES, ...customList];
}

/**
 * Swatch colours for a theme, read from `globals.css` so a preview can never
 * disagree with what the theme actually renders. Non-active themes are read by
 * temporarily applying the attribute — synchronous, so no paint happens in
 * between — and results are cached because a theme's palette never changes.
 */
export function getThemePreviewColors(themeId) {
  const id = themeId || DEFAULT_THEME_ID;
  if (previewCache.has(id)) return previewCache.get(id);

  const settings = getThemeSettings();
  const customMatch = (settings.customThemes || []).find((t) => t.id === id);

  const root = typeof document !== "undefined" ? document.documentElement : null;
  let colors;
  if (root) {
    const previous = root.getAttribute("data-theme");
    try {
      root.setAttribute("data-theme", id);
      invalidateTokenCache();
      const resolved = getTokenColors(Object.values(PREVIEW_TOKEN_KEYS), { root });
      colors = {};
      for (const [key, token] of Object.entries(PREVIEW_TOKEN_KEYS)) {
        colors[key] = resolved[token] || customMatch?.preview?.[key] || "";
      }
    } finally {
      if (previous === null) root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", previous);
      invalidateTokenCache();
    }
  } else {
    // No DOM (unit tests, tooling): fall back to custom theme preview or active theme's own tokens.
    const resolved = getTokenColors(Object.values(PREVIEW_TOKEN_KEYS));
    colors = {};
    for (const [key, token] of Object.entries(PREVIEW_TOKEN_KEYS)) {
      colors[key] = resolved[token] || customMatch?.preview?.[key] || "";
    }
  }

  previewCache.set(id, colors);
  return colors;
}

/**
 * Returns the currently active font family string (for Canvas/PixiJS, SVG, or Monaco)
 */
export function getActiveFont(type = "ui") {
  const isCodeFont = type === "mono" || type === "code";
  if (typeof window === "undefined") {
    return isCodeFont ? DEFAULT_CODE_FONT_STACK : DEFAULT_UI_FONT_STACK;
  }
  const settings = getThemeSettings();
  if (isCodeFont) {
    const found = AVAILABLE_CODE_FONTS.find((f) => f.id === settings.codeFont);
    return found ? found.value : DEFAULT_CODE_FONT_STACK;
  }
  const found = AVAILABLE_UI_FONTS.find((f) => f.id === settings.uiFont);
  return found ? found.value : DEFAULT_UI_FONT_STACK;
}

/**
 * Returns the numeric font size in px for a specific functional zone
 * ("toolbar" | "sidebar" | "editor" | "terminal" | "chat" | "ui")
 */
export function getZoneFontSize(zone = "ui", explicitSettings = null) {
  const settings = explicitSettings || getThemeSettings();
  const zoneMap = { ...DEFAULT_ZONE_FONT_SIZES, ...(settings?.fontSizes || {}) };
  if (zone && zoneMap[zone]) {
    return parseFloat(zoneMap[zone]) || parseFloat(DEFAULT_ZONE_FONT_SIZES[zone]) || 13;
  }
  return parseFloat(settings?.fontSize) || 13;
}

function normalizeFlairSettings(raw = {}) {
  const validRadius = ["sharp", "default", "soft", "round"];
  const validShadow = ["soft", "flat", "hard", "glow"];
  const validBackdrop = ["none", "grid", "dots", "scanlines", "noise", "aurora"];
  const radius = validRadius.includes(raw.radius) ? raw.radius : "default";
  const shadow = validShadow.includes(raw.shadow) ? raw.shadow : "soft";
  const backdrop = validBackdrop.includes(raw.backdrop) ? raw.backdrop : "none";
  const dimNum = Number(raw.dim);
  const dim = Number.isFinite(dimNum) ? Math.min(60, Math.max(0, Math.round(dimNum))) : 0;
  const customThemes = Array.isArray(raw.customThemes)
    ? raw.customThemes.filter((t) => t && typeof t === "object" && t.id).slice(0, MAX_CUSTOM_THEMES)
    : [];
  return { radius, shadow, backdrop, dim, customThemes };
}

/**
 * Load theme settings from localStorage
 */
export function getThemeSettings() {
  if (typeof window === "undefined") {
    return {
      ...DEFAULT_THEME_SETTINGS,
      ...memorySettingsFallback,
      fontSizes: { ...DEFAULT_ZONE_FONT_SIZES, ...(memorySettingsFallback.fontSizes || {}) },
    };
  }
  try {
    const storage = window.localStorage;
    const raw = storage ? storage.getItem(THEME_STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      const fallbackBase = parsed.fontSize || "13";
      // Upgrade legacy un-migrated "dark-plus" default to the current default
      const resolvedTheme =
        !parsed.themeMigratedGeist && (!parsed.theme || parsed.theme === "dark-plus")
          ? DEFAULT_THEME_ID
          : parsed.theme || DEFAULT_THEME_ID;
      const flair = normalizeFlairSettings(parsed);
      return {
        ...DEFAULT_THEME_SETTINGS,
        ...parsed,
        ...flair,
        theme: resolvedTheme,
        themeMigratedGeist: true,
        fontSizes: {
          toolbar: parsed.fontSizes?.toolbar || DEFAULT_ZONE_FONT_SIZES.toolbar,
          sidebar: parsed.fontSizes?.sidebar || fallbackBase,
          editor: parsed.fontSizes?.editor || fallbackBase,
          terminal: parsed.fontSizes?.terminal || fallbackBase,
          chat: parsed.fontSizes?.chat || fallbackBase,
        },
      };
    }
  } catch {
    // Opaque-origin sandboxed iframes (sandbox="allow-scripts") block localStorage by design.
  }
  return {
    ...DEFAULT_THEME_SETTINGS,
    ...memorySettingsFallback,
    fontSizes: { ...DEFAULT_ZONE_FONT_SIZES, ...(memorySettingsFallback.fontSizes || {}) },
  };
}

/**
 * Save theme settings to localStorage, persist to ~/.agmon/theme-settings.json, and apply live DOM changes
 */
export function saveThemeSettings(settings, options = {}) {
  try {
    const current = getThemeSettings();
    const mergedFontSizes = {
      ...DEFAULT_ZONE_FONT_SIZES,
      ...(current.fontSizes || {}),
      ...(settings.fontSizes || {}),
    };
    const mergedRaw = {
      ...current,
      ...settings,
    };
    const flair = normalizeFlairSettings(mergedRaw);
    const updated = {
      ...mergedRaw,
      ...flair,
      themeMigratedGeist: true,
      fontSizes: mergedFontSizes,
      updatedAt: settings.updatedAt || new Date().toISOString(),
    };
    memorySettingsFallback = updated;
    if (typeof window !== "undefined") {
      try {
        window.localStorage?.setItem(THEME_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Opaque-origin sandboxed iframes block localStorage by design.
      }
    }
    applyThemeSettingsToDOM(updated, options);

    if (typeof window !== "undefined" && !options?.skipDiskSync && typeof fetch === "function") {
      fetch("/api/theme-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: updated }),
      }).catch(() => {});
    }
    return updated;
  } catch (err) {
    console.warn("[themeStore] Failed to save theme settings:", err);
    return null;
  }
}

/**
 * Imports a VS Code theme JSON/JSONC string, saves it in customThemes (max 25),
 * activates it (unless `options.activate === false`), and injects its CSS rules.
 */
export function importVsCodeTheme(rawJsonString, options = {}) {
  const parsed = parseVsCodeThemeJson(rawJsonString, options);
  if (!parsed) {
    return {
      ok: false,
      error: "Invalid VS Code theme JSON or no color tokens found.",
    };
  }
  const current = getThemeSettings();
  const existingCustom = Array.isArray(current.customThemes) ? current.customThemes : [];
  const filtered = existingCustom.filter((t) => t.id !== parsed.id);
  const nextCustomThemes = [parsed, ...filtered].slice(0, MAX_CUSTOM_THEMES);

  previewCache.delete(parsed.id);
  const nextThemeId = options.activate === false ? current.theme : parsed.id;
  const updated = saveThemeSettings(
    {
      ...current,
      theme: nextThemeId,
      customThemes: nextCustomThemes,
    },
    options
  );
  return {
    ...parsed,
    ok: true,
    theme: parsed,
    settings: updated,
  };
}

/**
 * Removes an imported custom VS Code theme by ID and reverts to DEFAULT_THEME_ID if active.
 */
export function removeCustomTheme(themeId, options = {}) {
  if (!themeId) return getThemeSettings();
  const current = getThemeSettings();
  const existingCustom = Array.isArray(current.customThemes) ? current.customThemes : [];
  const nextCustomThemes = existingCustom.filter((t) => t.id !== themeId);
  previewCache.delete(themeId);
  const nextActiveTheme = current.theme === themeId ? DEFAULT_THEME_ID : current.theme;
  return saveThemeSettings(
    {
      ...current,
      theme: nextActiveTheme,
      customThemes: nextCustomThemes,
    },
    options
  );
}

/**
 * Apply theme and font settings to the <html> document root, then announce the
 * change once. This is the single notification point for every path that changes
 * the palette — save, disk hydration, and Settings/gallery preview — so renderers
 * that resolve tokens themselves (xterm, Pixi) never observe a stale palette.
 *
 * @param {object} settings
 * @param {{ notify?: boolean }} [options] set `notify: false` to update the DOM
 *   without re-announcing an unchanged palette.
 */
export function applyThemeSettingsToDOM(settings, options = {}) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!root) return;

  // 0. Inject or update `<style id="agmon-custom-themes">` in document.head
  const customThemes = Array.isArray(settings?.customThemes) ? settings.customThemes : [];
  const cssContent = buildCustomThemesStylesheet(customThemes);
  if (document.head) {
    let styleEl =
      typeof document.getElementById === "function"
        ? document.getElementById("agmon-custom-themes")
        : null;
    if (!styleEl && typeof document.createElement === "function") {
      styleEl = document.createElement("style");
      styleEl.id = "agmon-custom-themes";
      if (typeof styleEl.setAttribute === "function") {
        styleEl.setAttribute("id", "agmon-custom-themes");
      }
      if (typeof document.head.appendChild === "function") {
        document.head.appendChild(styleEl);
      }
    }
    if (styleEl && styleEl.textContent !== cssContent) {
      styleEl.textContent = cssContent;
    }
  }
  invalidateThemeTokenCache();

  // 1. Theme Data Attribute (NEVER set inline --bg-* on root.style!)
  const theme = settings?.theme || DEFAULT_THEME_ID;
  const themeChanged = root.getAttribute("data-theme") !== theme;
  root.setAttribute("data-theme", theme);
  const customTheme = customThemes.find((t) => t && t.id === theme);
  const isLight = theme === "light-plus" || customTheme?.category === "light";
  if (isLight) {
    root.classList.remove("dark");
    root.classList.add("light");
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
  }

  // 1b. Surface Flair & Painted Backdrop Data Attributes
  const flair = normalizeFlairSettings(settings);
  root.setAttribute("data-theme-radius", flair.radius);
  root.setAttribute("data-theme-shadow", flair.shadow);
  root.setAttribute("data-theme-backdrop", flair.backdrop);
  if (root.style && typeof root.style.setProperty === "function") {
    root.style.setProperty("--agmon-backdrop-dim", `${flair.dim}%`);
  }

  // 2. UI Font Family - unify workbench UI chrome under a single font family
  const uiFontObj = AVAILABLE_UI_FONTS.find((f) => f.id === settings.uiFont) || AVAILABLE_UI_FONTS[0];
  if (uiFontObj) {
    root.style.setProperty("--font-family-ui", uiFontObj.value);
    root.style.setProperty("--font-sans", uiFontObj.value);
    root.style.setProperty("--font-ui", uiFontObj.value);
    root.style.setProperty("--font-mono", uiFontObj.value);
  }

  // 3. Editor & Terminal Code Font Family - used strictly for code/terminal buffers
  const codeFontObj = AVAILABLE_CODE_FONTS.find((f) => f.id === settings.codeFont) || AVAILABLE_CODE_FONTS[0];
  if (codeFontObj) {
    root.style.setProperty("--font-family-mono", codeFontObj.value);
    root.style.setProperty("--font-code", codeFontObj.value);
  }

  // 4. Per-Zone Font Sizes & Base Font Size (13px = 1.0x baseline)
  const zoneSizes = {
    ...DEFAULT_ZONE_FONT_SIZES,
    ...(settings.fontSizes || {}),
  };
  const toolbarPx = parseFloat(zoneSizes.toolbar) || 12;
  const sidebarPx = parseFloat(zoneSizes.sidebar) || 13;
  const editorPx = parseFloat(zoneSizes.editor) || 13;
  const terminalPx = parseFloat(zoneSizes.terminal) || 13;
  const chatPx = parseFloat(zoneSizes.chat) || 13;

  root.style.setProperty("--font-size-toolbar", `${toolbarPx}px`);
  root.style.setProperty("--font-size-sidebar", `${sidebarPx}px`);
  root.style.setProperty("--font-size-editor", `${editorPx}px`);
  root.style.setProperty("--font-size-terminal", `${terminalPx}px`);
  root.style.setProperty("--font-size-chat", `${chatPx}px`);

  const numericBase = parseFloat(settings.fontSize) || sidebarPx || 13;
  root.style.setProperty("--font-size-ui", `${numericBase}px`);
  root.style.setProperty("--font-size-base", `${numericBase}px`);
  root.style.setProperty("--font-scale", String(numericBase / 13));

  // 5. Announce exactly once, after the DOM reflects the new palette.
  if (themeChanged) invalidateTokenCache();
  if (
    options.notify !== false &&
    typeof window !== "undefined" &&
    typeof window.dispatchEvent === "function"
  ) {
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: settings }));
  }
}

let diskHydratedOnce = false;
let storageSyncBound = false;

/**
 * Keep pop-out windows and extra tabs in step with whichever one saved the theme.
 * The `storage` event only fires in windows other than the writer, so applying
 * here without writing back avoids a ping-pong loop between windows.
 */
function bindStorageSync() {
  if (storageSyncBound || typeof window === "undefined") return;
  storageSyncBound = true;
  window.addEventListener("storage", (event) => {
    if (event.key !== THEME_STORAGE_KEY || !event.newValue) return;
    try {
      applyThemeSettingsToDOM(getThemeSettings());
    } catch (err) {
      console.warn("[themeStore] Failed to mirror theme from another window:", err);
    }
  });
}

/**
 * Initializer helper to run on application mount
 */
export function initThemeEngine(options = {}) {
  if (typeof window === "undefined") return;
  bindStorageSync();
  const hasLocalRaw = Boolean(localStorage.getItem(THEME_STORAGE_KEY));
  const settings = getThemeSettings();
  applyThemeSettingsToDOM(settings, { notify: false });

  if (!options?.skipDiskSync && !diskHydratedOnce && typeof fetch === "function") {
    diskHydratedOnce = true;
    fetch("/api/theme-settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.ok) return;
        const diskSettings = data.persisted ? data.settings : null;
        if (diskSettings) {
          const diskTime = diskSettings.updatedAt ? Date.parse(diskSettings.updatedAt) : 0;
          const localTime = settings.updatedAt ? Date.parse(settings.updatedAt) : 0;
          if (!hasLocalRaw || diskTime >= localTime) {
            saveThemeSettings(diskSettings, { skipDiskSync: true });
            return;
          }
        }
        // Seed or update ~/.agmon/theme-settings.json from localStorage selection
        fetch("/api/theme-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ settings: getThemeSettings() }),
        }).catch(() => {});
      })
      .catch(() => {});
  }
}
