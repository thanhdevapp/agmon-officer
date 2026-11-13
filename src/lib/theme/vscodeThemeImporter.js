/**
 * VS Code Theme JSON/JSONC Importer & Dynamic CSS Rule Engine for AGMon.
 *
 * Parses community VS Code theme files (Catppuccin, Dracula, Rose Pine, Gruvbox,
 * Tokyo Night, etc.), strips JSONC comments + trailing commas without corrupting
 * string URLs, normalizes all color formats (#rgb, #rgba, #rrggbb, #rrggbbaa,
 * rgb, rgba, hsl, hsla, oklch) into safe #rrggbb / rgba() tokens, classifies
 * WCAG relative luminance ("dark" vs "light"), extracts xterm.js 16 ANSI colors
 * and Monaco tokenColors, and builds `:root[data-theme="custom-..."]` CSS blocks
 * for `<style id="agmon-custom-themes">`.
 */

const CSS_INJECTION_BLACKLIST = /(<\/?\s*style|<\/?\s*script|;|[{}]|url\s*\(|expression\s*\(|javascript:|@import|\\)/i;

const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_FUNC_RE = /^rgba?\(\s*([^)]+?)\s*\)$/i;
const HSL_FUNC_RE = /^hsla?\(\s*([^)]+?)\s*\)$/i;
const OKLCH_FUNC_RE = /^oklch\(\s*([^)]+?)\s*\)$/i;

function clampByte(n) {
  return Math.min(255, Math.max(0, Math.round(Number(n) || 0)));
}

function clampUnit(n) {
  if (!Number.isFinite(n)) return 1;
  return Math.min(1, Math.max(0, n));
}

function toHexByte(n) {
  return clampByte(n).toString(16).padStart(2, "0");
}

function roundAlpha(a) {
  return Math.round(clampUnit(a) * 1000) / 1000;
}

function formatRgbaOrHex(r, g, b, a = 1) {
  const rb = clampByte(r);
  const gb = clampByte(g);
  const bb = clampByte(b);
  const alpha = roundAlpha(a);
  if (alpha >= 1) {
    return `#${toHexByte(rb)}${toHexByte(gb)}${toHexByte(bb)}`;
  }
  return `rgba(${rb}, ${gb}, ${bb}, ${alpha})`;
}

function parseAngleDegrees(rawAngle) {
  const str = String(rawAngle || "").trim().toLowerCase();
  if (!str || str === "none") return 0;
  const num = parseFloat(str);
  if (!Number.isFinite(num)) return NaN;
  if (str.endsWith("rad")) return (num * 180) / Math.PI;
  if (str.endsWith("turn")) return num * 360;
  if (str.endsWith("grad")) return num * 0.9;
  return num;
}

function parseAlphaValue(rawAlpha) {
  if (rawAlpha === undefined || rawAlpha === null || rawAlpha === "") return 1;
  const str = String(rawAlpha).trim();
  if (str === "none") return 0;
  const num = parseFloat(str);
  if (!Number.isFinite(num)) return NaN;
  return str.endsWith("%") ? clampUnit(num / 100) : clampUnit(num);
}

function hslToRgb(hDeg, sPct, lPct) {
  const h = (((hDeg % 360) + 360) % 360) / 360;
  const s = clampUnit(sPct / 100);
  const l = clampUnit(lPct / 100);

  if (s === 0) {
    const gray = clampByte(l * 255);
    return { r: gray, g: gray, b: gray };
  }

  const hue2rgb = (p, q, t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: clampByte(hue2rgb(p, q, h + 1 / 3) * 255),
    g: clampByte(hue2rgb(p, q, h) * 255),
    b: clampByte(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

function oklchToRgb(L, C, hDeg) {
  const hRad = (hDeg * Math.PI) / 180;
  const aLab = C * Math.cos(hRad);
  const bLab = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * aLab + 0.2158037573 * bLab;
  const m_ = L - 0.1055613458 * aLab - 0.0638541728 * bLab;
  const s_ = L - 0.0894841775 * aLab - 1.2914855480 * bLab;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const linearToSrgb = (c) => {
    const clamped = Math.min(1, Math.max(0, c));
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  return {
    r: clampByte(linearToSrgb(rLin) * 255),
    g: clampByte(linearToSrgb(gLin) * 255),
    b: clampByte(linearToSrgb(bLin) * 255),
  };
}

/**
 * Safely strips `//` line comments, `/* * /` block comments, and trailing commas
 * from a JSON/JSONC string without corrupting URLs (`http://`, `https://`) inside strings.
 *
 * @param {string} rawText
 * @returns {string}
 */
export function stripJsonComments(rawText) {
  if (typeof rawText !== "string") return "";
  const len = rawText.length;
  let out = "";
  let inString = false;
  let i = 0;

  while (i < len) {
    const ch = rawText[i];
    const next = rawText[i + 1];

    if (inString) {
      out += ch;
      if (ch === "\\" && i + 1 < len) {
        out += rawText[i + 1];
        i += 2;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      i += 1;
      continue;
    }

    if (ch === '"') {
      inString = true;
      out += ch;
      i += 1;
      continue;
    }

    // Single-line comment //
    if (ch === "/" && next === "/") {
      i += 2;
      while (i < len && rawText[i] !== "\n" && rawText[i] !== "\r") {
        i += 1;
      }
      continue;
    }

    // Multi-line block comment /* ... */
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < len && !(rawText[i] === "*" && rawText[i + 1] === "/")) {
        i += 1;
      }
      i += 2;
      continue;
    }

    out += ch;
    i += 1;
  }

  // Second pass: strip trailing commas outside string literals before } or ]
  let cleaned = "";
  let inStr2 = false;
  for (let j = 0; j < out.length; j += 1) {
    const ch = out[j];
    if (inStr2) {
      cleaned += ch;
      if (ch === "\\" && j + 1 < out.length) {
        cleaned += out[j + 1];
        j += 1;
        continue;
      }
      if (ch === '"') {
        inStr2 = false;
      }
      continue;
    }

    if (ch === '"') {
      inStr2 = true;
      cleaned += ch;
      continue;
    }

    if (ch === ",") {
      let k = j + 1;
      while (k < out.length && /\s/.test(out[k])) {
        k += 1;
      }
      if (k < out.length && (out[k] === "}" || out[k] === "]")) {
        continue;
      }
    }

    cleaned += ch;
  }

  return cleaned;
}

/**
 * Normalizes a CSS color string into `#rrggbb` (opaque) or `rgba(r, g, b, a)` (translucent).
 * Supports `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`, `hsl()`, `hsla()`,
 * and `oklch(L C H [/ alpha])`.
 * Returns `null` if invalid or containing CSS injection characters.
 *
 * @param {unknown} colorStr
 * @returns {string | null}
 */
export function normalizeCssColorToHexOrRgba(colorStr) {
  if (typeof colorStr !== "string") return null;
  const raw = colorStr.trim();
  if (!raw || raw.length > 120) return null;
  if (CSS_INJECTION_BLACKLIST.test(raw)) return null;

  const lower = raw.toLowerCase();
  if (lower === "transparent") return "rgba(0, 0, 0, 0)";

  // 1. Hex (#rgb, #rgba, #rrggbb, #rrggbbaa)
  const hexMatch = HEX_COLOR_RE.exec(lower);
  if (hexMatch) {
    let digits = hexMatch[1];
    if (digits.length === 3 || digits.length === 4) {
      digits = digits
        .split("")
        .map((c) => c + c)
        .join("");
    }
    const r = parseInt(digits.slice(0, 2), 16);
    const g = parseInt(digits.slice(2, 4), 16);
    const b = parseInt(digits.slice(4, 6), 16);
    const a = digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1;
    return formatRgbaOrHex(r, g, b, a);
  }

  // 2. rgb() / rgba()
  const rgbMatch = RGB_FUNC_RE.exec(lower);
  if (rgbMatch) {
    const body = rgbMatch[1].replace(/\//g, " ");
    const parts = body.split(/[\s,]+/).filter(Boolean);
    if (parts.length < 3 || parts.length > 4) return null;
    const parseChannel = (p) => {
      if (!/^[+-]?(\d+\.?\d*|\.\d+)%?$/.test(p)) return NaN;
      const n = parseFloat(p);
      return p.endsWith("%") ? (n / 100) * 255 : n;
    };
    const r = parseChannel(parts[0]);
    const g = parseChannel(parts[1]);
    const b = parseChannel(parts[2]);
    const a = parts.length === 4 ? parseAlphaValue(parts[3]) : 1;
    if ([r, g, b, a].some((v) => !Number.isFinite(v))) return null;
    return formatRgbaOrHex(r, g, b, a);
  }

  // 3. hsl() / hsla()
  const hslMatch = HSL_FUNC_RE.exec(lower);
  if (hslMatch) {
    const [coordPart, alphaPart] = hslMatch[1].split("/");
    const parts = coordPart.split(/[\s,]+/).filter(Boolean);
    if (parts.length < 3 || parts.length > 4) return null;
    const h = parseAngleDegrees(parts[0]);
    const s = parts[1].endsWith("%") ? parseFloat(parts[1]) : NaN;
    const l = parts[2].endsWith("%") ? parseFloat(parts[2]) : NaN;
    const rawAlpha = alphaPart !== undefined ? alphaPart : parts[3];
    const a = rawAlpha !== undefined ? parseAlphaValue(rawAlpha) : 1;
    if ([h, s, l, a].some((v) => !Number.isFinite(v))) return null;
    const { r, g, b } = hslToRgb(h, s, l);
    return formatRgbaOrHex(r, g, b, a);
  }

  // 4. oklch(L C H [/ alpha])
  const oklchMatch = OKLCH_FUNC_RE.exec(lower);
  if (oklchMatch) {
    const [coordPart, alphaPart] = oklchMatch[1].split("/");
    const parts = coordPart.split(/[\s,]+/).filter(Boolean);
    if (parts.length < 3 || parts.length > 4) return null;
    const rawL = parts[0];
    const rawC = parts[1];
    const rawH = parts[2];

    let L = parseFloat(rawL);
    if (!Number.isFinite(L)) return null;
    if (rawL.endsWith("%") || L > 1) {
      L = L / 100;
    }
    L = clampUnit(L);

    let C = parseFloat(rawC);
    if (!Number.isFinite(C) || C < 0) return null;
    if (rawC.endsWith("%")) {
      C = (C / 100) * 0.4;
    }

    const H = parseAngleDegrees(rawH);
    const rawAlpha = alphaPart !== undefined ? alphaPart : parts[3];
    const a = rawAlpha !== undefined ? parseAlphaValue(rawAlpha) : 1;
    if (!Number.isFinite(H) || !Number.isFinite(a)) return null;

    const { r, g, b } = oklchToRgb(L, C, H);
    return formatRgbaOrHex(r, g, b, a);
  }

  return null;
}

function parseNormalizedRgb(hexOrRgba) {
  const norm = normalizeCssColorToHexOrRgba(hexOrRgba);
  if (!norm) return null;
  if (norm.startsWith("#")) {
    return {
      r: parseInt(norm.slice(1, 3), 16),
      g: parseInt(norm.slice(3, 5), 16),
      b: parseInt(norm.slice(5, 7), 16),
      a: 1,
    };
  }
  const m = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)$/.exec(norm);
  if (!m) return null;
  return {
    r: Number(m[1]),
    g: Number(m[2]),
    b: Number(m[3]),
    a: Number(m[4]),
  };
}

/**
 * Computes WCAG 2.1 relative luminance (0.0 = pitch black, 1.0 = pure white).
 *
 * @param {string} hexOrRgba
 * @returns {number}
 */
export function computeRelativeLuminance(hexOrRgba) {
  const rgb = parseNormalizedRgb(hexOrRgba);
  if (!rgb) return 0;
  const toLinear = (channel) => {
    const v = channel / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);
  return Math.round((0.2126 * r + 0.7152 * g + 0.0722 * b) * 10000) / 10000;
}

/**
 * Classifies a background color into `"light"` (luminance > 0.45) or `"dark"`.
 *
 * @param {string} bgHex
 * @returns {"light" | "dark"}
 */
export function classifyThemeLuminance(bgHex) {
  return computeRelativeLuminance(bgHex) > 0.45 ? "light" : "dark";
}

function shiftBrightness(hexColor, delta) {
  const rgb = parseNormalizedRgb(hexColor);
  if (!rgb) return hexColor;
  return formatRgbaOrHex(rgb.r + delta, rgb.g + delta, rgb.b + delta, 1);
}

function toOpaqueHex(colorStr, fallback = "#1e1e2e") {
  const rgb = parseNormalizedRgb(colorStr);
  if (!rgb) return fallback;
  return `#${toHexByte(rgb.r)}${toHexByte(rgb.g)}${toHexByte(rgb.b)}`;
}

function slugifyThemeId(rawName) {
  const base = String(rawName || "vscode-theme")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const clean = base || "vscode-theme";
  return clean.startsWith("custom-") ? clean : `custom-${clean}`;
}

function sanitizeThemeDisplayName(rawName) {
  const cleaned = String(rawName || "Custom VS Code Theme")
    .replace(/[<>"{};\\]/g, "")
    .trim()
    .slice(0, 64);
  return cleaned || "Custom VS Code Theme";
}

const DEFAULT_DARK_ANSI = {
  "ansi-black": "#1e2430",
  "ansi-red": "#f0616f",
  "ansi-green": "#3fb984",
  "ansi-yellow": "#d9a441",
  "ansi-blue": "#5b9cf8",
  "ansi-magenta": "#c98bf0",
  "ansi-cyan": "#45b8c4",
  "ansi-white": "#c8cdd6",
  "ansi-bright-black": "#4a5563",
  "ansi-bright-red": "#ff7b85",
  "ansi-bright-green": "#58c896",
  "ansi-bright-yellow": "#e8bd5c",
  "ansi-bright-blue": "#7bb0fa",
  "ansi-bright-magenta": "#dda5f5",
  "ansi-bright-cyan": "#5fcbd6",
  "ansi-bright-white": "#f2f5f8",
};

const DEFAULT_LIGHT_ANSI = {
  "ansi-black": "#24292f",
  "ansi-red": "#cf222e",
  "ansi-green": "#1a7f37",
  "ansi-yellow": "#9a6700",
  "ansi-blue": "#0969da",
  "ansi-magenta": "#8250df",
  "ansi-cyan": "#1b7c83",
  "ansi-white": "#57606a",
  "ansi-bright-black": "#6e7781",
  "ansi-bright-red": "#a40e26",
  "ansi-bright-green": "#116329",
  "ansi-bright-yellow": "#7d4e00",
  "ansi-bright-blue": "#0550ae",
  "ansi-bright-magenta": "#6639ba",
  "ansi-bright-cyan": "#136065",
  "ansi-bright-white": "#1f2328",
};

const VSCODE_ANSI_KEY_MAP = {
  "terminal.ansiBlack": "ansi-black",
  "terminal.ansiRed": "ansi-red",
  "terminal.ansiGreen": "ansi-green",
  "terminal.ansiYellow": "ansi-yellow",
  "terminal.ansiBlue": "ansi-blue",
  "terminal.ansiMagenta": "ansi-magenta",
  "terminal.ansiCyan": "ansi-cyan",
  "terminal.ansiWhite": "ansi-white",
  "terminal.ansiBrightBlack": "ansi-bright-black",
  "terminal.ansiBrightRed": "ansi-bright-red",
  "terminal.ansiBrightGreen": "ansi-bright-green",
  "terminal.ansiBrightYellow": "ansi-bright-yellow",
  "terminal.ansiBrightBlue": "ansi-bright-blue",
  "terminal.ansiBrightMagenta": "ansi-bright-magenta",
  "terminal.ansiBrightCyan": "ansi-bright-cyan",
  "terminal.ansiBrightWhite": "ansi-bright-white",
};

/**
 * Extracts Monaco `ITokenThemeRule[]` from VS Code `tokenColors`.
 *
 * @param {Array} tokenColors
 * @returns {Array<{ token: string, foreground?: string, background?: string, fontStyle?: string }>}
 */
function extractMonacoRules(tokenColors) {
  if (!Array.isArray(tokenColors)) return [];
  const rules = [];
  for (const entry of tokenColors) {
    if (!entry || typeof entry !== "object") continue;
    const settings = entry.settings;
    if (!settings || typeof settings !== "object") continue;

    const fgNorm = settings.foreground ? normalizeCssColorToHexOrRgba(settings.foreground) : null;
    const bgNorm = settings.background ? normalizeCssColorToHexOrRgba(settings.background) : null;
    const fgHex = fgNorm ? toOpaqueHex(fgNorm, "").replace(/^#/, "") : undefined;
    const bgHex = bgNorm ? toOpaqueHex(bgNorm, "").replace(/^#/, "") : undefined;
    const rawStyle = typeof settings.fontStyle === "string" ? settings.fontStyle.trim() : "";
    const fontStyle = /^[a-z\s-]{0,40}$/i.test(rawStyle) ? rawStyle : undefined;

    if (!fgHex && !bgHex && fontStyle === undefined) continue;

    const scopes = Array.isArray(entry.scope)
      ? entry.scope
      : typeof entry.scope === "string"
      ? entry.scope.split(",").map((s) => s.trim())
      : [""];

    for (const rawScope of scopes) {
      const token = String(rawScope || "")
        .trim()
        .replace(/[^a-zA-Z0-9._-]/g, "");
      const rule = { token };
      if (fgHex) rule.foreground = fgHex;
      if (bgHex) rule.background = bgHex;
      if (fontStyle) rule.fontStyle = fontStyle;
      rules.push(rule);
      if (rules.length >= 250) return rules;
    }
  }
  return rules;
}

/**
 * Parses a VS Code theme `.json` / `.jsonc` string into an AGMon theme definition.
 * Returns `null` if the input is malformed, empty, or contains no valid theme structure.
 *
 * @param {string} rawJsonString
 * @param {{ customName?: string, customId?: string }} [options]
 */
export function parseVsCodeThemeJson(rawJsonString, { customName, customId } = {}) {
  if (typeof rawJsonString !== "string" || !rawJsonString.trim()) {
    return null;
  }

  let parsed;
  try {
    const cleanJson = stripJsonComments(rawJsonString);
    parsed = JSON.parse(cleanJson);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  const rawColors =
    parsed.colors && typeof parsed.colors === "object" && !Array.isArray(parsed.colors)
      ? parsed.colors
      : null;
  const rawTokenColors = Array.isArray(parsed.tokenColors) ? parsed.tokenColors : null;

  if (!rawColors && !rawTokenColors) {
    return null;
  }

  const validColors = {};
  let validColorCount = 0;
  if (rawColors) {
    for (const [key, value] of Object.entries(rawColors)) {
      if (typeof key !== "string" || CSS_INJECTION_BLACKLIST.test(key)) continue;
      const norm = normalizeCssColorToHexOrRgba(value);
      if (norm) {
        validColors[key] = norm;
        validColorCount += 1;
      }
    }
  }

  const monacoRules = extractMonacoRules(rawTokenColors);
  if (validColorCount === 0 && monacoRules.length === 0) {
    return null;
  }

  const pick = (...keys) => {
    for (const k of keys) {
      if (validColors[k]) return validColors[k];
    }
    return null;
  };

  const editorBgRaw = pick("editor.background", "sideBar.background", "panel.background") || "#1e1e2e";
  const editorBgHex = toOpaqueHex(editorBgRaw, "#1e1e2e");
  const luminance = computeRelativeLuminance(editorBgHex);
  const declaredType = typeof parsed.type === "string" ? parsed.type.toLowerCase() : "";
  const category =
    declaredType === "light" || declaredType === "hc-light"
      ? "light"
      : classifyThemeLuminance(editorBgHex);
  const isLight = category === "light";

  const workbenchBg = toOpaqueHex(
    pick("activityBar.background", "titleBar.activeBackground", "sideBar.background") ||
      shiftBrightness(editorBgHex, isLight ? -10 : -8),
    isLight ? "#f3f4f6" : "#11111b"
  );
  const sidebarBg = toOpaqueHex(
    pick("sideBar.background", "editorGroupHeader.tabsBackground") ||
      shiftBrightness(editorBgHex, isLight ? -6 : -4),
    isLight ? "#f8fafc" : "#181825"
  );
  const activityBarBg = toOpaqueHex(
    pick("activityBar.background", "sideBar.background") || workbenchBg,
    workbenchBg
  );
  const titlebarBg = toOpaqueHex(
    pick("titleBar.activeBackground", "activityBar.background") || editorBgHex,
    editorBgHex
  );
  const statusbarBg = toOpaqueHex(
    pick("statusBar.background", "activityBar.background") || workbenchBg,
    workbenchBg
  );
  const panelBg = toOpaqueHex(
    pick("panel.background", "terminal.background", "sideBar.background") || sidebarBg,
    sidebarBg
  );
  const cardBg = toOpaqueHex(
    pick("editorWidget.background", "dropdown.background", "sideBar.background") ||
      shiftBrightness(editorBgHex, isLight ? -4 : 10),
    isLight ? "#ffffff" : "#24273a"
  );
  const cardInnerBg = toOpaqueHex(
    pick("input.background", "sideBar.background") ||
      shiftBrightness(editorBgHex, isLight ? -8 : 4),
    isLight ? "#f1f5f9" : "#191926"
  );
  const hoverBg = toOpaqueHex(
    pick("list.hoverBackground", "toolbar.hoverBackground") ||
      shiftBrightness(editorBgHex, isLight ? -14 : 18),
    isLight ? "#e2e8f0" : "#313244"
  );
  const selectionBg = toOpaqueHex(
    pick("list.activeSelectionBackground", "editor.selectionBackground") ||
      shiftBrightness(editorBgHex, isLight ? -22 : 28),
    isLight ? "#cbd5e1" : "#45475a"
  );

  const textMain = toOpaqueHex(
    pick("editor.foreground", "foreground", "sideBar.foreground") ||
      (isLight ? "#1f2937" : "#cdd6f4"),
    isLight ? "#1f2937" : "#cdd6f4"
  );
  const textBright = toOpaqueHex(
    pick("activityBar.foreground", "list.activeSelectionForeground", "editor.foreground") ||
      (isLight ? "#0f172a" : "#f8fafc"),
    isLight ? "#0f172a" : "#f8fafc"
  );
  const textSecondary = toOpaqueHex(
    pick("sideBar.foreground", "descriptionForeground", "editor.foreground") ||
      shiftBrightness(textMain, isLight ? 35 : -25),
    isLight ? "#334155" : "#bac2de"
  );
  const textMuted = toOpaqueHex(
    pick("descriptionForeground", "editorLineNumber.foreground", "tab.inactiveForeground") ||
      shiftBrightness(textMain, isLight ? 75 : -70),
    isLight ? "#64748b" : "#7f849c"
  );

  const accentPrimary = toOpaqueHex(
    pick("button.background", "focusBorder", "activityBarBadge.background", "textLink.foreground") ||
      (isLight ? "#2563eb" : "#89b4fa"),
    isLight ? "#2563eb" : "#89b4fa"
  );
  const accentHover = shiftBrightness(accentPrimary, isLight ? -16 : 16);
  const accentSecondary = toOpaqueHex(
    pick("textLink.foreground", "focusBorder", "button.secondaryBackground") || accentPrimary,
    accentPrimary
  );
  const textOnAccent =
    classifyThemeLuminance(accentPrimary) === "light" ? "#09090b" : "#ffffff";

  const borderCard = toOpaqueHex(
    pick("panel.border", "sideBar.border", "editorGroup.border", "contrastBorder") ||
      shiftBrightness(editorBgHex, isLight ? -28 : 26),
    isLight ? "#cbd5e1" : "#313244"
  );
  const borderSubtle = toOpaqueHex(
    pick("sideBar.border", "tab.border", "panel.border") ||
      shiftBrightness(editorBgHex, isLight ? -18 : 16),
    isLight ? "#e2e8f0" : "#262637"
  );
  const borderFocus = toOpaqueHex(
    pick("focusBorder", "button.background") || accentPrimary,
    accentPrimary
  );

  const errorFg = toOpaqueHex(
    pick("errorForeground", "editorError.foreground", "terminal.ansiRed") || "#e5534b",
    "#e5534b"
  );
  const diffInserted =
    pick("diffEditor.insertedTextBackground", "gitDecoration.addedResourceForeground") ||
    "rgba(63, 185, 132, 0.18)";
  const diffRemoved =
    pick("diffEditor.removedTextBackground", "gitDecoration.deletedResourceForeground") ||
    "rgba(229, 83, 75, 0.18)";

  const terminalBg = toOpaqueHex(
    pick("terminal.background", "panel.background", "editor.background") || editorBgHex,
    editorBgHex
  );
  const terminalFg = toOpaqueHex(
    pick("terminal.foreground", "editor.foreground") || textMain,
    textMain
  );
  const terminalCursor = toOpaqueHex(
    pick("terminalCursor.foreground", "focusBorder", "button.background") || accentPrimary,
    accentPrimary
  );
  const terminalSelection =
    pick("terminal.selectionBackground", "editor.selectionBackground") || "#3fb9844d";

  const defaultAnsi = isLight ? DEFAULT_LIGHT_ANSI : DEFAULT_DARK_ANSI;
  const ansiColors = {};
  for (const [vsKey, tokenName] of Object.entries(VSCODE_ANSI_KEY_MAP)) {
    ansiColors[tokenName] = toOpaqueHex(validColors[vsKey] || defaultAnsi[tokenName], defaultAnsi[tokenName]);
  }

  const variables = {
    "--bg-workbench": workbenchBg,
    "--bg-editor": editorBgHex,
    "--bg-sidebar": sidebarBg,
    "--bg-activitybar": activityBarBg,
    "--bg-titlebar": titlebarBg,
    "--bg-statusbar": statusbarBg,
    "--bg-panel": panelBg,
    "--bg-card": cardBg,
    "--bg-card-inner": cardInnerBg,
    "--bg-elevated": cardBg,
    "--bg-hover": hoverBg,
    "--bg-selection": selectionBg,
    "--bg-selected": hoverBg,
    "--bg-input": cardInnerBg,
    "--border-subtle": borderSubtle,
    "--border-card": borderCard,
    "--border-focus": borderFocus,
    "--accent-primary": accentPrimary,
    "--accent-hover": accentHover,
    "--accent-secondary": accentSecondary,
    "--text-main": textMain,
    "--text-secondary": textSecondary,
    "--text-muted": textMuted,
    "--text-bright": textBright,
    "--text-on-accent": textOnAccent,
    "--status-error": errorFg,
    "--danger": errorFg,
    "--diff-inserted-bg": diffInserted,
    "--diff-removed-bg": diffRemoved,
    "--terminal-bg": terminalBg,
    "--terminal-fg": terminalFg,
    "--term-bg": terminalBg,
    "--term-fg": terminalFg,
    "--term-cursor": terminalCursor,
    "--term-cursor-accent": terminalBg,
    "--term-selection": terminalSelection,
    "--bg-chat-user": cardBg,
    "--border-chat-user": borderCard,
    "--text-chat-user": textSecondary,
    "--text-chat-user-body": textBright,
    "--bg-chat-agent": cardInnerBg,
    "--border-chat-agent": borderSubtle,
    "--bg-chat-tool": workbenchBg,
    "--border-chat-tool": borderSubtle,
    "--bg-chat-code": workbenchBg,
    "--text-chat-code": textMain,
    "--scene-canvas-bg": workbenchBg,
  };

  for (const [tokenName, hexVal] of Object.entries(ansiColors)) {
    variables[`--${tokenName}`] = hexVal;
  }

  const resolvedName = sanitizeThemeDisplayName(customName || parsed.name || "Custom VS Code Theme");
  const resolvedId = slugifyThemeId(customId || customName || parsed.name || "vscode-theme");

  const monacoColors = {
    "editor.background": editorBgHex,
    "editor.foreground": textMain,
    "editorLineNumber.foreground": textMuted,
    "editor.selectionBackground": selectionBg,
    "editorCursor.foreground": accentPrimary,
  };

  const cssDeclarations = Object.entries(variables)
    .map(([prop, val]) => `  ${prop}: ${val};`)
    .join("\n");
  const cssRule = `:root[data-theme="${resolvedId}"],\n[data-theme="${resolvedId}"] {\n  color-scheme: ${category};\n${cssDeclarations}\n}`;

  return {
    ok: true,
    id: resolvedId,
    name: resolvedName,
    shortName: resolvedName.slice(0, 22),
    category,
    luminance,
    custom: true,
    description: `Imported VS Code ${category} theme (${validColorCount} UI tokens, ${monacoRules.length} syntax rules).`,
    variables,
    ansiColors,
    monacoRules,
    monacoColors,
    cssRule,
    preview: {
      workbench: workbenchBg,
      editor: editorBgHex,
      sidebar: sidebarBg,
      accent: accentPrimary,
      border: borderCard,
      fg: textMain,
    },
  };
}

const FLAIR_STYLESHEET_RULES = `
/* AGMon Surface Flair & Painted Backdrop Controls */
:root[data-theme-radius="sharp"] { --agmon-radius-scale: 0px; }
:root[data-theme-radius="default"] { --agmon-radius-scale: 6px; }
:root[data-theme-radius="soft"] { --agmon-radius-scale: 10px; }
:root[data-theme-radius="round"] { --agmon-radius-scale: 16px; }

:root[data-theme-shadow="flat"] { --agmon-card-shadow: none; }
:root[data-theme-shadow="soft"] { --agmon-card-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.28); }
:root[data-theme-shadow="hard"] { --agmon-card-shadow: 3px 3px 0px 0px var(--border-card); }
:root[data-theme-shadow="glow"] { --agmon-card-shadow: 0 0 18px -3px color-mix(in srgb, var(--accent-primary) 28%, transparent); }
`.trim();

/**
 * Builds the combined CSS stylesheet string for `<style id="agmon-custom-themes">`.
 * Re-validates every token through `normalizeCssColorToHexOrRgba` so persisted storage
 * can never inject arbitrary CSS.
 *
 * @param {Array} customThemes
 * @returns {string}
 */
export function buildCustomThemesStylesheet(customThemes = []) {
  const blocks = [FLAIR_STYLESHEET_RULES];
  if (!Array.isArray(customThemes)) return blocks.join("\n\n");

  for (const theme of customThemes.slice(0, 25)) {
    if (!theme || typeof theme !== "object") continue;
    const safeId = slugifyThemeId(theme.id || theme.name || "custom");
    const safeCategory = theme.category === "light" ? "light" : "dark";
    const vars = theme.variables && typeof theme.variables === "object" ? theme.variables : {};

    const safeLines = [`  color-scheme: ${safeCategory};`];
    for (const [rawKey, rawVal] of Object.entries(vars)) {
      const key = String(rawKey).startsWith("--") ? String(rawKey) : `--${rawKey}`;
      if (!/^--[a-z0-9-]+$/i.test(key)) continue;
      const safeVal = normalizeCssColorToHexOrRgba(String(rawVal));
      if (!safeVal) continue;
      safeLines.push(`  ${key}: ${safeVal};`);
    }

    if (safeLines.length > 1) {
      blocks.push(
        `:root[data-theme="${safeId}"],\n[data-theme="${safeId}"] {\n${safeLines.join("\n")}\n}`
      );
    }
  }

  return blocks.join("\n\n");
}
