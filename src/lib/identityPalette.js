/**
 * Identity palette for user-facing entities: projects, project groups, agent graph nodes
 * and config-driven terminal tabs.
 *
 * These are identity colours, not UI chrome. Each one is assigned once (or by round-robin)
 * and stored on the record, then replayed as inline style on that record's chip, avatar or
 * node. Because they are appended with an alpha suffix at the usage site (e.g.
 * `${color}20`) and written to disk before any CSS is loaded, they cannot be CSS custom
 * properties and deliberately stay independent of the UI theme tokens.
 *
 * Every literal lives here exactly once. Usage sites import the table they need instead of
 * repeating a hex, and a user-supplied colour always wins over the default.
 *
 * @module identityPalette
 */

/**
 * Round-robin identity colours handed to newly created projects. Ordered so that the
 * first few projects in a session get maximally distinct hues.
 */
export const PROJECT_IDENTITY_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#6366f1", // indigo
];

/**
 * Default colour for the auto-created project representing the current working directory.
 */
export const DEFAULT_PROJECT_COLOR = "#3b82f6";

/**
 * Default colour for a config-driven terminal tab that does not declare its own. Currently
 * the same blue as DEFAULT_PROJECT_COLOR, but kept as its own entry: a tab accent and a
 * project identity are different semantics and must be free to diverge.
 */
export const DEFAULT_TAB_COLOR = "#3b82f6";

/** Default colour for a project group in the sidebar. */
export const DEFAULT_PROJECT_GROUP_COLOR = "#38bdf8";

/**
 * Agent graph node colours. Root sessions are the visually dominant node type, so they get
 * the brighter sky tone; delegated subagents sit one step back in indigo.
 */
export const AGENT_NODE_COLORS = {
  root: "#38bdf8",
  subagent: "#818cf8",
};

/**
 * Badge colour per progression rank. Each rank owns a distinct hue so the ladder stays
 * readable at a glance; the palette ramps cool → warm → magenta as the rank climbs.
 */
export const RANK_BADGE_COLORS = {
  "Intern Apprentice": "#94a3b8",
  "Junior Craftsman": "#38bdf8",
  "Senior Artificer": "#34d399",
  "Factory Overseer": "#f59e0b",
  "Chief Architect": "#a855f7",
  "Automation Archmage": "#ec4899",
};