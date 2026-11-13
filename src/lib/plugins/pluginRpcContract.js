/**
 * Shared pure-JS RPC & permission contract between the Node plugin manager
 * and the browser/Electron renderer host (`SandboxedPluginHost.jsx`).
 *
 * IMPORTANT: Keep this module 100% free of `node:*` or Electron imports so it
 * bundles cleanly into Vite renderer assets and passes `npm run check:imports`.
 */

export const ALLOWED_PLUGIN_PERMISSIONS = Object.freeze([
  "traces:subscribe",
  "workbench:openSession",
  "storage:pluginScope",
  "theme:subscribe",
  "notifications:toast",
  "tasks:read",
  "editor:openedFile",
]);

export const FORBIDDEN_SANDBOX_PERMISSIONS = Object.freeze([
  "pty:spawn",
  "pty:write",
  "fs:readFile",
  "fs:writeFile",
  "shell:exec",
  "electron:ipc",
]);

export const BUILTIN_SANDBOX_RPC_METHODS = Object.freeze([
  "plugin:ready",
  "workbench:forwardShortcut",
]);

export const RPC_METHOD_PERMISSION_MAP = Object.freeze({
  "traces:subscribe": "traces:subscribe",
  "traces:getSnapshot": "traces:subscribe",
  "workbench:openSession": "workbench:openSession",
  "workbench:exitChillMode": "workbench:openSession",
  "storage:get": "storage:pluginScope",
  "storage:set": "storage:pluginScope",
  "theme:subscribe": "theme:subscribe",
  "notifications:toast": "notifications:toast",
  "tasks:list": "tasks:read",
  "editor:readOpenedFile": "editor:openedFile",
});

export const FORWARDED_HOST_SHORTCUTS = Object.freeze([
  { id: "new-shell-tab", key: "t", code: "KeyT", shiftKey: false, altKey: false },
  { id: "close-active-pane-or-tab", key: "w", code: "KeyW", shiftKey: false, altKey: false },
  { id: "command-palette", key: "p", code: "KeyP", shiftKey: true, altKey: false },
  { id: "quick-actions", key: "k", code: "KeyK", shiftKey: false, altKey: false },
]);

/**
 * Validates and normalizes a shortcut event sent from a sandboxed plugin iframe.
 * Only fixed workbench shortcuts (`Cmd/Ctrl+T`, `Cmd/Ctrl+W`, `Cmd/Ctrl+Shift+P`,
 * `Cmd/Ctrl+K`) are accepted; arbitrary keystrokes are dropped.
 */
export function matchForwardedHostShortcut(input) {
  if (!input || typeof input !== "object") return null;
  const metaKey = Boolean(input.metaKey);
  const ctrlKey = Boolean(input.ctrlKey);
  if (!metaKey && !ctrlKey) return null;

  const rawKey = String(input.key || "").trim().toLowerCase();
  if (!rawKey || rawKey.length !== 1) return null;

  const shiftKey = Boolean(input.shiftKey);
  const altKey = Boolean(input.altKey);

  const spec = FORWARDED_HOST_SHORTCUTS.find(
    (item) => item.key === rawKey && item.shiftKey === shiftKey && item.altKey === altKey
  );
  if (!spec) return null;

  return {
    id: spec.id,
    key: shiftKey ? spec.key.toUpperCase() : spec.key,
    code: spec.code,
    metaKey,
    ctrlKey,
    shiftKey,
    altKey,
  };
}
