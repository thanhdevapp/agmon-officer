// Keep one pending response per session until the user has stopped interacting.
export function createDeferredAgentPush({ send, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout, idleMs = 60_000 }) {
  const pending = new Map();
  function cancelAll() {
    for (const timer of pending.values()) clearTimer(timer);
    pending.clear();
  }
  function enqueue(item, { lastActivityAt } = {}) {
    const key = String(item.sessionId || item.type);
    if (pending.has(key)) clearTimer(pending.get(key));
    pending.delete(key);
    const alreadyIdle = now() - (lastActivityAt ?? now()) >= idleMs;
    if (alreadyIdle) {
      send(item, { desktopAway: true });
      return;
    }
    const timer = setTimer(() => {
      pending.delete(key);
      send(item, { desktopAway: true });
    }, idleMs);
    pending.set(key, timer);
  }
  return { enqueue, cancelAll };
}
