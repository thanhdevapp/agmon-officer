import React from "react";
import { TerminalSquare } from "lucide-react";

/**
 * Provider SVG Brand Logos & Agent Status Icons
 * Pure vector icons without any unicode emojis.
 * Clean modern desktop visual language (Gemini ribbon, Claude starburst,
 * Yellow Crescent idle, Running spinner, Question bubble, Error/Complete).
 */

/* =========================================================================
   1. AI PROVIDER BRAND ICONS
   ========================================================================= */

/**
 * Anthropic Claude Starburst / Sunburst
 * Terracotta/coral multi-spoke radiating spark matching Image #2 rows 2 & 3.
 */
export function ClaudeIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`text-[var(--brand-claude)] shrink-0 ${className}`}
      aria-label="Claude Code"
    >
      <circle cx="12" cy="12" r="2.8" />
      <g stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <line x1="12" y1="2" x2="12" y2="6.2" />
        <line x1="12" y1="17.8" x2="12" y2="22" />
        <line x1="2" y1="12" x2="6.2" y2="12" />
        <line x1="17.8" y1="12" x2="22" y2="12" />
        <line x1="4.93" y1="4.93" x2="7.9" y2="7.9" />
        <line x1="16.1" y1="16.1" x2="19.07" y2="19.07" />
        <line x1="4.93" y1="19.07" x2="7.9" y2="16.1" />
        <line x1="16.1" y1="7.9" x2="19.07" y2="4.93" />
        <line x1="7.5" y1="3.5" x2="9.4" y2="7.2" />
        <line x1="14.6" y1="16.8" x2="16.5" y2="20.5" />
        <line x1="3.5" y1="7.5" x2="7.2" y2="9.4" />
        <line x1="16.8" y1="14.6" x2="20.5" y2="16.5" />
      </g>
    </svg>
  );
}

/**
 * Google Antigravity / Gemini 4-Point Curved Spark
 * Multi-color gradient ribbon (cyan -> blue -> purple -> coral red) matching Image #2 row 1.
 */
export function AntigravityIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      className={`shrink-0 ${className}`}
      aria-label="Antigravity / Gemini"
    >
      <defs>
        <linearGradient id="agy-gemini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--brand-antigravity-1)" />
          <stop offset="35%" stopColor="var(--brand-antigravity-2)" />
          <stop offset="70%" stopColor="var(--brand-antigravity-3)" />
          <stop offset="100%" stopColor="var(--brand-antigravity-4)" />
        </linearGradient>
      </defs>
      <path
        d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z"
        fill="url(#agy-gemini-gradient)"
      />
    </svg>
  );
}

/**
 * OpenAI Codex Spiral Logo
 */
export function CodexIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`text-[var(--brand-codex)] shrink-0 ${className}`}
      aria-label="OpenAI Codex"
    >
      <path d="M20.5 9.8a5.5 5.5 0 0 0-.5-4.4 5.6 5.6 0 0 0-4.6-2.7 5.7 5.7 0 0 0-3.4 1.1A5.6 5.6 0 0 0 3.8 6.5a5.5 5.5 0 0 0-.9 4.3 5.6 5.6 0 0 0 1.9 4.4 5.7 5.7 0 0 0 .5 4.4 5.6 5.6 0 0 0 4.6 2.7 5.7 5.7 0 0 0 3.4-1.1 5.6 5.6 0 0 0 8.2-2.7 5.5 5.5 0 0 0 .9-4.3 5.6 5.6 0 0 0-1.9-4.4zm-7.5 10.9a4.2 4.2 0 0 1-2.4-.8l.2-.1 3.5-2a.7.7 0 0 0 .4-.6v-4.9l1.5.9a.7.7 0 0 0 .4.1v4.4a4.3 4.3 0 0 1-3.6 3zm-7.6-4.4a4.3 4.3 0 0 1 .5-2.5l.2.1 3.5 2a.7.7 0 0 0 .7 0l4.2-2.4v1.7a.7.7 0 0 0 .4.6l-3.8 2.2a4.3 4.3 0 0 1-5.7-1.7zm-1.1-7.7a4.3 4.3 0 0 1 2.9-1.7l-.1.2v4.1a.7.7 0 0 0 .4.6l4.2 2.4-1.5.9a.7.7 0 0 0-.4.6l-3.8-2.2a4.3 4.3 0 0 1-1.7-5zm12.5 1.5l-4.2 2.4-1.5-.9a.7.7 0 0 0-.4-.1V7.1a4.3 4.3 0 0 1 3.6-3 4.2 4.2 0 0 1 2.5.8l-.2.1-3.5 2a.7.7 0 0 0-.4.6v4.9zm4.3 3.6a4.3 4.3 0 0 1-.5 2.5l-.2-.1-3.5-2a.7.7 0 0 0-.7 0l-4.2 2.4v-1.7a.7.7 0 0 0-.4-.6l3.8-2.2a4.3 4.3 0 0 1 5.7 1.7zm-6.8-1.5l-2.1-1.2 2.1-1.2 2.1 1.2-2.1 1.2z" />
    </svg>
  );
}

/**
 * AgentKit Xia Logo
 */
export function XiaIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-[var(--brand-xia)] shrink-0 ${className}`}
      aria-label="AgentKit Xia"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
      <path d="M12 8v8" />
      <circle cx="9" cy="9" r="1" fill="currentColor" />
      <circle cx="15" cy="9" r="1" fill="currentColor" />
    </svg>
  );
}

/**
 * Dynamic Provider Logo Dispatcher
 */
export function AgentProviderLogo({
  provider = "",
  clientType = "",
  model = "",
  cli = "",
  className = "w-3.5 h-3.5",
}) {
  const hasExplicitSize = /\bw-\S+|\bh-\S+/.test(className || "");
  const effectiveClass = hasExplicitSize
    ? className
    : `w-3.5 h-3.5 ${className || ""}`.trim();
  const p = (provider || "").toLowerCase();
  const ct = (clientType || "").toLowerCase();
  const m = (model || "").toLowerCase();
  const c = (cli || "").toLowerCase();

  if (p.includes("claude") || ct.includes("claude") || m.includes("claude") || c.includes("claude")) {
    return <ClaudeIcon className={effectiveClass} />;
  }
  if (
    p.includes("antigravity") ||
    p.includes("gemini") ||
    p.includes("agy") ||
    ct.includes("gemini") ||
    ct.includes("agy") ||
    m.includes("gemini") ||
    c.includes("agy") ||
    c.includes("antigravity")
  ) {
    return <AntigravityIcon className={effectiveClass} />;
  }
  if (p.includes("codex") || p.includes("openai") || ct.includes("codex") || m.includes("codex")) {
    return <CodexIcon className={effectiveClass} />;
  }
  if (p.includes("xia") || ct.includes("xia") || c.includes("xia")) {
    return <XiaIcon className={effectiveClass} />;
  }
  if (p || ct || c) {
    return (
      <TerminalSquare
        className={`text-[var(--accent-primary)] shrink-0 ${effectiveClass}`}
        aria-label={cli || provider || clientType || "CLI Agent"}
      />
    );
  }

  // Default fallback to Claude when no explicit CLI/provider token was supplied
  return <ClaudeIcon className={effectiveClass} />;
}

export function getBrandProviderIcon(provider) {
  return function DynamicBrandIcon(props) {
    return <AgentProviderLogo provider={provider} {...props} />;
  };
}

/* =========================================================================
   2. AGENT & WORKTREE STATUS ICONS (Matching Image #2)
   ========================================================================= */

/**
 * Idle / Stopped / Paused Crescent Moon (Amber/Yellow 'c' in Image #2)
 * Matches the amber crescent next to 'main' and each idle agent in Image #2.
 */
export function IdleCrescentIcon({ className = "w-3 h-3" }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={`text-[var(--status-idle)] shrink-0 ${className}`}
      aria-label="Idle / Stopped"
      title="Idle / Stopped"
    >
      <path d="M7.5 2a6 6 0 1 0 5.68 8.04A4.8 4.8 0 0 1 7.5 2Z" />
    </svg>
  );
}

/**
 * Running / Streaming Active State (Green animated spinner with outer ring)
 */
export function RunningStateIcon({ className = "w-3 h-3" }) {
  return (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      title="Running / Streaming"
    >
      <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-[var(--status-running)] opacity-60" />
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="relative w-3 h-3 text-[var(--status-running)] animate-spin"
        aria-label="Running"
      >
        <path d="M8 1.5a6.5 6.5 0 1 0 6.5 6.5A1 1 0 0 0 13.5 8 1 1 0 0 0 12.5 8 4.5 4.5 0 1 1 8 3.5a1 1 0 0 0 0-2z" />
      </svg>
    </span>
  );
}

/**
 * Question / Waiting for User Input / Approval (Warm Amber Question Bubble)
 * Triggered when agent asks user a question (AskUserQuestion, confirmation, prompt).
 */
export function QuestionStateIcon({ className = "w-3 h-3" }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-[var(--status-warning)] shrink-0 ${className}`}
      aria-label="Waiting for input / Question"
      title="Waiting for input / Question"
    >
      <circle cx="8" cy="8" r="6.5" />
      <path d="M6.5 6.2a1.8 1.8 0 0 1 3.2 1c0 1.2-1.7 1.4-1.7 2.3" />
      <circle cx="8" cy="11.8" r="0.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Error / Failed Alert State
 */
export function ErrorStateIcon({ className = "w-3 h-3" }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-[var(--status-error)] shrink-0 ${className}`}
      aria-label="Error"
      title="Error"
    >
      <circle cx="8" cy="8" r="6.5" />
      <line x1="8" y1="5" x2="8" y2="8.5" />
      <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Completed / Done / Ended State (Green Check Circle)
 */
export function CompletedStateIcon({ className = "w-3 h-3" }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-[var(--status-running)] shrink-0 ${className}`}
      aria-label="Completed"
      title="Completed"
    >
      <circle cx="8" cy="8" r="6.5" />
      <polyline points="5.5 8 7.2 9.8 10.8 6.2" />
    </svg>
  );
}

/**
 * Comprehensive Agent Status Icon Component
 * Switches between:
 * - "running" / "streaming" -> Animated green spinner
 * - "question" / "waiting_input" / "waiting_approval" -> Cyan pulsing question circle
 * - "idle" / "stopped" / "paused" -> Amber crescent moon
 * - "completed" / "done" -> Emerald checkmark
 * - "error" / "failed" -> Rose warning circle
 */
export function AgentStateIndicator({ state = "idle", className = "w-3 h-3" }) {
  const st = (state || "").toLowerCase();

  if (st === "streaming" || st === "running" || st === "busy" || st === "working") {
    return <RunningStateIcon className={className} />;
  }

  if (
    st === "question" ||
    st === "waiting_input" ||
    st === "waiting_approval" ||
    st === "waiting" ||
    st === "prompt" ||
    st === "pending"
  ) {
    return <QuestionStateIcon className={className} />;
  }

  if (st === "error" || st === "failed") {
    return <ErrorStateIcon className={className} />;
  }

  if (st === "completed" || st === "ended" || st === "done") {
    return <CompletedStateIcon className={className} />;
  }

  // Default: Idle / Stopped / Paused (Yellow crescent moon)
  return <IdleCrescentIcon className={className} />;
}
