import { Container, Graphics, Text } from "pixi.js";
import { getActiveFont } from "@/lib/themeStore.js";

// One glyph per tool type. Each is drawn inside a ±10 box so a badge can swap
// icons without relayout. Only the tool *type* is shown — never arguments.

const S = { cap: "round", join: "round" };

export const TOOL_TYPES = {
  bash: {
    label: "Bash",
    color: 0x34d399,
    draw(g, c, s = 1) {
      g.moveTo(-8 * s, -6 * s).lineTo(-2 * s, 0).lineTo(-8 * s, 6 * s).stroke({ width: 2.4 * s, color: c, ...S });
      g.moveTo(1 * s, 7 * s).lineTo(8 * s, 7 * s).stroke({ width: 2.4 * s, color: c, ...S });
    },
  },
  read: {
    label: "Read",
    color: 0x60a5fa,
    draw(g, c, s = 1) {
      g.moveTo(-6 * s, -9 * s).lineTo(3 * s, -9 * s).lineTo(7 * s, -5 * s).lineTo(7 * s, 9 * s).lineTo(-6 * s, 9 * s).closePath()
        .stroke({ width: 2 * s, color: c, ...S });
      g.moveTo(-3 * s, -1 * s).lineTo(4 * s, -1 * s).stroke({ width: 1.8 * s, color: c, ...S });
      g.moveTo(-3 * s, 3 * s).lineTo(4 * s, 3 * s).stroke({ width: 1.8 * s, color: c, ...S });
      g.moveTo(-3 * s, 6.5 * s).lineTo(1 * s, 6.5 * s).stroke({ width: 1.8 * s, color: c, ...S });
    },
  },
  edit: {
    label: "Edit",
    color: 0xfbbf24,
    draw(g, c, s = 1) {
      g.moveTo(-7 * s, 8 * s).lineTo(-6 * s, 3 * s).lineTo(4 * s, -7 * s).lineTo(8 * s, -3 * s).lineTo(-2 * s, 7 * s).closePath()
        .stroke({ width: 2 * s, color: c, ...S });
      g.moveTo(1 * s, -4 * s).lineTo(5 * s, 0).stroke({ width: 1.8 * s, color: c, ...S });
      g.moveTo(-8 * s, 9.5 * s).lineTo(-1 * s, 9.5 * s).stroke({ width: 1.8 * s, color: c, ...S });
    },
  },
  search: {
    label: "Search",
    color: 0xf472b6,
    draw(g, c, s = 1) {
      g.circle(-2 * s, -2 * s, 6 * s).stroke({ width: 2.2 * s, color: c, ...S });
      g.moveTo(2.5 * s, 2.5 * s).lineTo(8 * s, 8 * s).stroke({ width: 2.6 * s, color: c, ...S });
    },
  },
  web: {
    label: "Web",
    color: 0x22d3ee,
    draw(g, c, s = 1) {
      g.circle(0, 0, 8.5 * s).stroke({ width: 2 * s, color: c, ...S });
      g.ellipse(0, 0, 3.6 * s, 8.5 * s).stroke({ width: 1.6 * s, color: c, ...S });
      g.moveTo(-8.5 * s, 0).lineTo(8.5 * s, 0).stroke({ width: 1.6 * s, color: c, ...S });
    },
  },
  mcp: {
    label: "MCP",
    color: 0xa78bfa,
    draw(g, c, s = 1) {
      g.moveTo(-4 * s, -9 * s).lineTo(-4 * s, -3 * s).stroke({ width: 2.4 * s, color: c, ...S });
      g.moveTo(4 * s, -9 * s).lineTo(4 * s, -3 * s).stroke({ width: 2.4 * s, color: c, ...S });
      g.roundRect(-8 * s, -3 * s, 16 * s, 9 * s, 3 * s).stroke({ width: 2 * s, color: c, ...S });
      g.moveTo(0, 6 * s).lineTo(0, 10 * s).stroke({ width: 2.4 * s, color: c, ...S });
    },
  },
  agent: {
    label: "Subagent",
    color: 0xfb923c,
    draw(g, c, s = 1) {
      g.moveTo(0, -4 * s).lineTo(-6 * s, 6 * s).stroke({ width: 1.8 * s, color: c, ...S });
      g.moveTo(0, -4 * s).lineTo(6 * s, 6 * s).stroke({ width: 1.8 * s, color: c, ...S });
      g.circle(0, -5 * s, 3.6 * s).fill({ color: c });
      g.circle(-6.5 * s, 7 * s, 3 * s).fill({ color: c });
      g.circle(6.5 * s, 7 * s, 3 * s).fill({ color: c });
    },
  },
  todo: {
    label: "Todo",
    color: 0x94a3b8,
    draw(g, c, s = 1) {
      g.moveTo(-8 * s, -5 * s).lineTo(-6 * s, -3 * s).lineTo(-3 * s, -7 * s).stroke({ width: 1.8 * s, color: c, ...S });
      g.moveTo(1 * s, -5 * s).lineTo(8 * s, -5 * s).stroke({ width: 1.8 * s, color: c, ...S });
      g.moveTo(-8 * s, 5 * s).lineTo(-6 * s, 7 * s).lineTo(-3 * s, 3 * s).stroke({ width: 1.8 * s, color: c, ...S });
      g.moveTo(1 * s, 5 * s).lineTo(8 * s, 5 * s).stroke({ width: 1.8 * s, color: c, ...S });
    },
  },
  gitnexus: {
    label: "GitNexus",
    color: 0xc084fc, // purple-400
    draw(g, c, s = 1) {
      // Knowledge graph: central hub connected to 3 orbiting nodes
      g.moveTo(0, 0).lineTo(-6 * s, -6 * s).stroke({ width: 1.5 * s, color: c, ...S });
      g.moveTo(0, 0).lineTo(6 * s, -5 * s).stroke({ width: 1.5 * s, color: c, ...S });
      g.moveTo(0, 0).lineTo(0, 7 * s).stroke({ width: 1.5 * s, color: c, ...S });
      g.circle(0, 0, 3.2 * s).fill({ color: c });
      g.circle(-6 * s, -6 * s, 2.2 * s).fill({ color: c });
      g.circle(6 * s, -5 * s, 2.2 * s).fill({ color: c });
      g.circle(0, 7 * s, 2.2 * s).fill({ color: c });
    },
  },
  browser: {
    label: "Browser",
    color: 0x06b6d4, // cyan-500
    draw(g, c, s = 1) {
      // Browser window with top tab bar
      g.roundRect(-8 * s, -7 * s, 16 * s, 14 * s, 2.5 * s).stroke({ width: 1.8 * s, color: c, ...S });
      g.moveTo(-8 * s, -2 * s).lineTo(8 * s, -2 * s).stroke({ width: 1.4 * s, color: c, ...S });
      g.circle(-5 * s, -4.5 * s, 1 * s).fill({ color: c });
      g.circle(-2 * s, -4.5 * s, 1 * s).fill({ color: c });
    },
  },
  git: {
    label: "Git",
    color: 0xf97316, // orange-500
    draw(g, c, s = 1) {
      // Git branching tree
      g.moveTo(-4 * s, -7 * s).lineTo(-4 * s, 7 * s).stroke({ width: 2 * s, color: c, ...S });
      g.moveTo(-4 * s, 2 * s).arc(0, 2 * s, 4 * s, Math.PI, 0).lineTo(4 * s, -3 * s).stroke({ width: 1.8 * s, color: c, ...S });
      g.circle(-4 * s, -6 * s, 2.4 * s).fill({ color: c });
      g.circle(-4 * s, 6 * s, 2.4 * s).fill({ color: c });
      g.circle(4 * s, -3 * s, 2.4 * s).fill({ color: c });
    },
  },
  docker: {
    label: "Docker",
    color: 0x38bdf8, // light blue
    draw(g, c, s = 1) {
      // Container blocks stacked
      g.roundRect(-7 * s, 1 * s, 6 * s, 5 * s, 1 * s).fill({ color: c, alpha: 0.8 }).stroke({ width: 1.2 * s, color: c, ...S });
      g.roundRect(1 * s, 1 * s, 6 * s, 5 * s, 1 * s).fill({ color: c, alpha: 0.8 }).stroke({ width: 1.2 * s, color: c, ...S });
      g.roundRect(-3 * s, -6 * s, 6 * s, 5 * s, 1 * s).fill({ color: c, alpha: 0.8 }).stroke({ width: 1.2 * s, color: c, ...S });
    },
  },
};

// Request-status glyphs share the badge machinery with tools: lifecycle states,
// the four failure reasons, and fallback.
export const STATUS_TYPES = {
  pending: {
    label: "Queued",
    color: 0xf59e0b,
    draw(g, c, s = 1) {
      for (const x of [-7, 0, 7]) g.circle(x * s, 1 * s, 2.6 * s).fill({ color: c });
    },
  },
  done: {
    label: "Done",
    color: 0x34d399,
    draw(g, c, s = 1) {
      g.moveTo(-7 * s, 0).lineTo(-2 * s, 6 * s).lineTo(8 * s, -7 * s).stroke({ width: 3 * s, color: c, ...S });
    },
  },
  rate_limited: {
    label: "Rate limit",
    color: 0xef4444,
    draw(g, c, s = 1) {
      g.moveTo(-6 * s, -9 * s).lineTo(6 * s, -9 * s).lineTo(-6 * s, 9 * s).lineTo(6 * s, 9 * s).closePath()
        .stroke({ width: 2 * s, color: c, ...S });
      g.moveTo(-3 * s, 6.5 * s).lineTo(3 * s, 6.5 * s).stroke({ width: 2.2 * s, color: c, ...S });
    },
  },
  upstream_timeout: {
    label: "Timeout",
    color: 0xef4444,
    draw(g, c, s = 1) {
      g.circle(0, 0, 8.5 * s).stroke({ width: 2 * s, color: c, ...S });
      g.moveTo(0, -5 * s).lineTo(0, 0).lineTo(4.5 * s, 3 * s).stroke({ width: 2 * s, color: c, ...S });
    },
  },
  quota_exhausted: {
    label: "Quota",
    color: 0xef4444,
    draw(g, c, s = 1) {
      g.roundRect(-8 * s, -5 * s, 14 * s, 10 * s, 2 * s).stroke({ width: 2 * s, color: c, ...S });
      g.rect(6 * s, -2 * s, 3 * s, 4 * s).fill({ color: c });
      g.rect(-6 * s, -3 * s, 2.6 * s, 6 * s).fill({ color: c });
    },
  },
  auth_refresh_failed: {
    label: "Auth",
    color: 0xef4444,
    draw(g, c, s = 1) {
      g.circle(-4 * s, 0, 4.2 * s).stroke({ width: 2 * s, color: c, ...S });
      g.moveTo(0, 0).lineTo(8 * s, 0).stroke({ width: 2 * s, color: c, ...S });
      g.moveTo(5 * s, 0).lineTo(5 * s, 4 * s).stroke({ width: 2 * s, color: c, ...S });
      g.moveTo(-9 * s, -8 * s).lineTo(9 * s, 8 * s).stroke({ width: 2.2 * s, color: 0xfbbf24, ...S });
    },
  },
  fallback: {
    label: "Fallback",
    color: 0xfbbf24,
    draw(g, c, s = 1) {
      g.moveTo(-8 * s, -4 * s).lineTo(7 * s, -4 * s).stroke({ width: 2.2 * s, color: c, ...S });
      g.moveTo(3 * s, -8 * s).lineTo(8 * s, -4 * s).lineTo(3 * s, 0).stroke({ width: 2.2 * s, color: c, ...S });
      g.moveTo(8 * s, 5 * s).lineTo(-7 * s, 5 * s).stroke({ width: 2.2 * s, color: c, ...S });
      g.moveTo(-3 * s, 1 * s).lineTo(-8 * s, 5 * s).lineTo(-3 * s, 9 * s).stroke({ width: 2.2 * s, color: c, ...S });
    },
  },
  looping: {
    label: "Looping",
    color: 0xf43f5e,
    draw(g, c, s = 1) {
      g.arc(0, 0, 6.5 * s, -Math.PI * 0.2, Math.PI * 1.3).stroke({ width: 2.2 * s, color: c, ...S });
      g.moveTo(4 * s, -6.5 * s).lineTo(7 * s, -3.5 * s).lineTo(1 * s, -3.5 * s).closePath().fill({ color: c });
    },
  },
};

export const TOOL_KEYS = Object.keys(TOOL_TYPES);
export const STATUS_KEYS = ["pending", "done", "rate_limited", "upstream_timeout", "quota_exhausted", "auth_refresh_failed", "fallback", "looping"];

/** A round badge: dark disc, coloured ring, the tool's glyph, optional name. */
export function createToolBadge(tool, { size = 1, showLabel = true, label: labelOverride, fontSize = 11.5 } = {}) {
  const def = TOOL_TYPES[tool] || STATUS_TYPES[tool] || TOOL_TYPES.bash;
  const root = new Container();

  // Supersample geometry at 4x base scale so circle and curve tessellation
  // produces dense vertices (64+ segments). When downscaled, vectors and text
  // remain ultra-smooth with zero jaggedness even when zoomed to 300%.
  const S_FACTOR = 4;
  const badgeGroup = new Container();

  const halo = new Graphics();
  halo.circle(0, 0, 21 * S_FACTOR).fill({ color: def.color, alpha: 0.18 });

  const disc = new Graphics();
  disc.circle(0, 0, 15 * S_FACTOR).fill({ color: 0x0f141c });
  disc.circle(0, 0, 15 * S_FACTOR).stroke({ width: 2 * S_FACTOR, color: def.color, alpha: 0.95 });

  const glyph = new Graphics();
  def.draw(glyph, def.color, S_FACTOR);
  glyph.scale.set(0.95);

  badgeGroup.addChild(halo, disc, glyph);
  badgeGroup.scale.set(1 / S_FACTOR);
  root.addChild(badgeGroup);

  if (showLabel) {
    const targetSize = Math.max(10, fontSize);
    const fontPt = Math.round(targetSize * S_FACTOR);
    const label = new Text({
      text: labelOverride ?? def.label,
      style: {
        fontFamily: getActiveFont("ui"),
        fontSize: fontPt,
        fill: def.color,
        fontWeight: "800",
        stroke: { color: 0x070b12, width: 5, join: "round" },
      },
      resolution: 4,
    });
    label.scale.set(1 / S_FACTOR);
    label.anchor.set(0.5, 0);
    label.y = 23; // Positioned clearly below halo boundary (y=21) for maximum legibility
    root.addChild(label);
  }

  root.scale.set(size);
  return { root, halo, tool };
}
