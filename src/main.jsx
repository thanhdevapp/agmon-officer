import "pixi.js/unsafe-eval";
import "./app/globals.css";
import React, { useEffect, useState, useCallback } from "react";
import { createRootRenderer } from "./lib/solidDomRuntime.js";
import { THEME_CHANGE_EVENT } from "./lib/themeStore.js";
import { invalidateTokenCache } from "./lib/themeColorTokens.js";
import { matchForwardedHostShortcut } from "./lib/plugins/pluginRpcContract.js";
import OfficeCanvas from "./components/factory/office-canvas.js";

const PLUGIN_ID = "thanhdevapp.agmon-officer";

let nextRpcId = 1;
const pendingRpcMap = new Map();
let lastRpcError = null;

export function callHostRpc(method, params = {}) {
  const id = nextRpcId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingRpcMap.delete(id);
      const err = { code: "RPC_TIMEOUT", message: `RPC '${method}' timed out` };
      lastRpcError = err;
      reject(err);
    }, 4000);

    pendingRpcMap.set(id, {
      resolve: (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      reject: (err) => {
        clearTimeout(timer);
        lastRpcError = err;
        reject(err);
      },
    });

    try {
      window.parent.postMessage(
        {
          jsonrpc: "2.0",
          id,
          method,
          params,
        },
        "*"
      );
    } catch (err) {
      clearTimeout(timer);
      pendingRpcMap.delete(id);
      reject(err);
    }
  });
}

if (typeof window !== "undefined") {
  window.__agmonPluginSandbox = {
    pluginId: PLUGIN_ID,
    getOrigin: () => window.origin,
    getLastRpcError: () => lastRpcError,
    callHostRpc,
  };
}

function VirtualOfficePluginApp() {
  const [traces, setTraces] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isChillMode, setIsChillMode] = useState(false);

  useEffect(() => {
    const handleHostMessage = (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0") return;

      if (msg.id !== undefined && pendingRpcMap.has(msg.id)) {
        const entry = pendingRpcMap.get(msg.id);
        pendingRpcMap.delete(msg.id);
        if (msg.error) {
          entry.reject(msg.error);
        } else {
          entry.resolve(msg.result);
        }
        return;
      }

      if (msg.method === "traces:snapshot") {
        const nextTraces = Array.isArray(msg.params?.traces) ? msg.params.traces : [];
        setTraces(nextTraces);
        if (msg.params?.selectedId !== undefined) {
          setSelectedId(msg.params.selectedId);
        }
        if (msg.params?.isChillMode !== undefined) {
          setIsChillMode(Boolean(msg.params.isChillMode));
        }
        return;
      }

      if (msg.method === "theme:variables" && msg.params?.variables) {
        const rootStyle = document.documentElement?.style;
        if (rootStyle) {
          let themeChanged = false;
          for (const [k, v] of Object.entries(msg.params.variables)) {
            if (
              typeof k === "string" &&
              k.startsWith("--") &&
              typeof v === "string" &&
              rootStyle.getPropertyValue(k).trim() !== v
            ) {
              rootStyle.setProperty(k, v);
              themeChanged = true;
            }
          }
          if (themeChanged) {
            invalidateTokenCache();
            window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
          }
        }
      }
    };

    const handleForwardHostShortcut = (event) => {
      const matched = matchForwardedHostShortcut(event);
      if (!matched) return;
      event.preventDefault();
      callHostRpc("workbench:forwardShortcut", matched).catch(() => {});
    };

    window.addEventListener("message", handleHostMessage);
    window.addEventListener("keydown", handleForwardHostShortcut);

    callHostRpc("plugin:ready", { pluginId: PLUGIN_ID }).catch(() => {});
    callHostRpc("traces:subscribe", {})
      .then((res) => {
        if (Array.isArray(res?.traces)) {
          setTraces(res.traces);
        }
        if (res?.selectedId !== undefined) {
          setSelectedId(res.selectedId);
        }
        if (res?.isChillMode !== undefined) {
          setIsChillMode(Boolean(res.isChillMode));
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener("message", handleHostMessage);
      window.removeEventListener("keydown", handleForwardHostShortcut);
    };
  }, []);

  const handleSelectWorkstation = useCallback((ws) => {
    const nextId = ws?.connectionId || ws?.traceId || null;
    setSelectedId(nextId);
    if (ws) {
      callHostRpc("workbench:openSession", {
        session: {
          connectionId: ws.connectionId,
          traceId: ws.traceId,
          account: ws.account,
          sessionTitle: ws.sessionTitle,
          provider: ws.provider,
          cli: ws.cli,
          model: ws.model,
          state: ws.state,
        },
      }).catch(() => {});
    }
  }, []);

  const handleToggleZen = useCallback((nextIsChillMode) => {
    callHostRpc("workbench:exitChillMode", {
      isChillMode: Boolean(nextIsChillMode),
    }).catch(() => {});
  }, []);

  return (
    <div
      data-testid="virtual-office-plugin-root"
      className="w-screen h-screen overflow-hidden relative bg-[var(--bg-workbench)]"
    >
      <OfficeCanvas
        traces={traces}
        totalCount={traces.length}
        selectedId={selectedId}
        onSelect={handleSelectWorkstation}
        isZenFullscreen={isChillMode}
        onToggleZenFullscreen={handleToggleZen}
        isActive={true}
      />
    </div>
  );
}

const rootEl =
  typeof document !== "undefined" ? document.getElementById("plugin-root") : null;
if (rootEl) {
  const root = createRootRenderer(rootEl);
  root.render(<VirtualOfficePluginApp />);
}

export default VirtualOfficePluginApp;
