/**
 * AGMon v1.0.0 — Dual-Runtime PlatformBridge
 * Automatically bridges Electron Native IPC + MessagePort binary streams
 * and Web Localhost (`http://localhost:3030`) HTTP/SSE/WebSocket transports.
 */

export function isElectronRuntime() {
  return Boolean(
    typeof window !== "undefined" &&
      window.agmonElectron &&
      window.agmonElectron.isElectron === true
  );
}

export function getRuntimeMode() {
  if (typeof window === "undefined") return "node";
  return isElectronRuntime() ? "electron" : "web";
}

/**
 * Unified API request method.
 * Routes via zero-TCP Electron IPC when running inside Electron Desktop,
 * or standard Web `fetch` when running on `localhost:3030`.
 */
export async function request(pathAndQuery, options = {}) {
  if (isElectronRuntime() && typeof window.agmonElectron.invokeApi === "function") {
    const method = (options.method || "GET").toUpperCase();
    let body = options.body ?? null;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        // Keep raw string
      }
    }
    const ipcRes = await window.agmonElectron.invokeApi(pathAndQuery, {
      method,
      headers: options.headers || {},
      body,
    });
    return {
      ok: Boolean(ipcRes?.ok),
      status: ipcRes?.status || 200,
      headers: ipcRes?.headers || {},
      data: ipcRes?.data,
      json: async () => ipcRes?.data,
      text: async () =>
        typeof ipcRes?.data === "string"
          ? ipcRes.data
          : JSON.stringify(ipcRes?.data ?? {}),
    };
  }

  let url = pathAndQuery;
  if (typeof window === "undefined" && typeof pathAndQuery === "string" && pathAndQuery.startsWith("/")) {
    const port = process.env.PORT || 3030;
    const host = process.env.HOSTNAME || "127.0.0.1";
    url = `http://${host}:${port}${pathAndQuery}`;
  }

  const res = await fetch(url, options);
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await res.clone().json().catch(() => null)
    : await res.clone().text().catch(() => "");

  return {
    ok: res.ok,
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    data,
    json: async () => data,
    text: async () => (typeof data === "string" ? data : JSON.stringify(data)),
  };
}

let fetchInterceptorInstalled = false;

/**
 * Automatically upgrades `window.fetch("/api/...")` inside Electron Renderer
 * to dispatch directly over Electron IPC (`agmon:api`) with zero TCP overhead,
 * except for long-lived SSE endpoints (`/api/traces/stream`, `/api/project/run-script`).
 */
export function installElectronFetchInterceptor() {
  if (
    fetchInterceptorInstalled ||
    typeof window === "undefined" ||
    !isElectronRuntime() ||
    typeof window.agmonElectron?.invokeApi !== "function"
  ) {
    return false;
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input?.url || "";
    const isLocalApi =
      urlStr.startsWith("/api/") &&
      !urlStr.startsWith("/api/traces/stream") &&
      !urlStr.startsWith("/api/vault/sessions/rescan") &&
      !urlStr.startsWith("/api/project/run-script");

    if (isLocalApi) {
      try {
        const method = (init.method || (typeof input === "object" && input.method) || "GET").toUpperCase();
        const ipcRes = await window.agmonElectron.invokeApi(urlStr, {
          method,
          headers: init.headers || {},
          body: init.body ?? null,
        });
        const responseBody =
          ipcRes.data instanceof Uint8Array
            ? ipcRes.data
            : typeof ipcRes.data === "string"
            ? ipcRes.data
            : JSON.stringify(ipcRes.data ?? {});
        return new Response(responseBody, {
          status: ipcRes.status || 200,
          headers: ipcRes.headers || { "Content-Type": "application/json" },
        });
      } catch (err) {
        // Fallback to native fetch if embedded server is also running
        return nativeFetch(input, init);
      }
    }

    return nativeFetch(input, init);
  };

  fetchInterceptorInstalled = true;
  return true;
}

/**
 * Subscribes to live agent trace snapshots via Electron IPC Push or Web EventSource SSE.
 */
export function subscribeTraces({ hours = 24, limit = 20 } = {}, onMessage, onError) {
  if (isElectronRuntime() && typeof window.agmonElectron.subscribeTraces === "function") {
    const unsubscribe = window.agmonElectron.subscribeTraces(
      { hours, limit },
      (payload) => {
        onMessage?.(payload);
      },
      (err) => {
        onError?.(err);
      }
    );
    return {
      transport: "electron-ipc",
      close: () => {
        try {
          unsubscribe?.();
        } catch {}
      },
    };
  }

  const params = new URLSearchParams({
    hours: String(hours),
    limit: String(limit),
  });
  const es = new EventSource(`/api/traces/stream?${params.toString()}`);
  es.onmessage = (ev) => {
    try {
      const parsed = JSON.parse(ev.data);
      onMessage?.(parsed);
    } catch (err) {
      onError?.(err);
    }
  };
  es.onerror = (err) => {
    onError?.(err);
  };

  return {
    transport: "web-sse",
    close: () => {
      try {
        es.close();
      } catch {}
    },
  };
}

export const apiFetch = request;

/**
 * Establishes a zero-copy binary PTY connection via Electron MessagePort (`Uint8Array`)
 * or WebSocket (`binaryType = "arraybuffer"`).
 */
export function connectPtyTransport({ sessionId, cwd, cols = 80, rows = 24, command = "" } = {}, handlers = {}) {
  const { onData, onOpen, onClose, onError } = handlers;

  if (isElectronRuntime() && typeof window.agmonElectron.openPtyChannel === "function") {
    const channel = window.agmonElectron.openPtyChannel(
      { sessionId, cwd, cols, rows, command },
      {
        onData: (chunk) => onData?.(chunk),
        onOpen: (info) => onOpen?.(info),
        onClose: (info) => onClose?.(info),
        onError: (err) => onError?.(err),
      }
    );
    return {
      transport: "electron-messageport",
      write: (data) => channel.write(data),
      resize: (c, r) => channel.resize(c, r),
      close: () => channel.close(),
    };
  }

  const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = typeof window !== "undefined" ? window.location.host : "localhost:3030";
  const params = new URLSearchParams({
    cols: String(cols),
    rows: String(rows),
  });
  if (sessionId) params.set("sessionId", sessionId);
  if (cwd) params.set("cwd", cwd);
  if (command) params.set("cmd", command);

  const ws = new WebSocket(`${protocol}//${host}/api/pty?${params.toString()}`);
  ws.binaryType = "arraybuffer";

  ws.onopen = () => onOpen?.({ transport: "web-websocket" });
  ws.onmessage = (ev) => {
    if (ev.data instanceof ArrayBuffer) {
      onData?.(new Uint8Array(ev.data));
      return;
    }
    if (typeof ev.data === "string") {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "data" && typeof msg.data === "string") {
          onData?.(msg.data);
        } else if (msg.type === "exit") {
          onClose?.({ exitCode: msg.exitCode });
        }
      } catch {
        onData?.(ev.data);
      }
    }
  };
  ws.onerror = (err) => onError?.(err);
  ws.onclose = () => onClose?.({});

  return {
    transport: "web-websocket",
    write: (input) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input", data: input }));
      }
    },
    resize: (c, r) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "resize", cols: c, rows: r }));
      }
    },
    close: () => {
      try {
        ws.close();
      } catch {}
    },
  };
}

export const platformBridge = {
  isElectronRuntime,
  getRuntimeMode,
  request,
  installElectronFetchInterceptor,
  subscribeTraces,
  connectPtyTransport,
};

export default platformBridge;
