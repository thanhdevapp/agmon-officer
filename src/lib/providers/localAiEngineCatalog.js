/**
 * Pure local AI engine catalog data.
 *
 * Deliberately has zero imports beyond plain JS. `localAiDiscovery.js` needs
 * the loopback guard (which pulls in `trackerEndpointGuard.js` ->
 * `cliInputHelpers.js` -> `sshFleetTunnel.js`, a Node `child_process` module)
 * for its probing logic, but `sessionActivity.js` is reachable from renderer
 * components and must stay Vite-bundleable without a Node-only transitive
 * import. Splitting the catalog data out keeps `getLocalEngineBaseUrl`
 * import-safe for both worlds while `localAiDiscovery.js` re-exports the
 * same catalog for backward compatibility.
 */

/**
 * The four local inference engines AGMon discovers, in probe order.
 * `modelPaths` is tried in order; the first reachable path wins.
 */
export const LOCAL_AI_ENGINES = Object.freeze([
  Object.freeze({
    id: "ollama",
    label: "Ollama",
    port: 11434,
    protocol: "ollama",
    baseUrl: "http://127.0.0.1:11434",
    modelPaths: Object.freeze(["/api/tags", "/v1/models"]),
  }),
  Object.freeze({
    id: "lmstudio",
    label: "LM Studio",
    port: 1234,
    protocol: "openai",
    baseUrl: "http://127.0.0.1:1234",
    modelPaths: Object.freeze(["/v1/models"]),
  }),
  Object.freeze({
    id: "vllm",
    label: "vLLM",
    port: 8000,
    protocol: "openai",
    baseUrl: "http://127.0.0.1:8000",
    modelPaths: Object.freeze(["/v1/models"]),
  }),
  Object.freeze({
    id: "9router",
    label: "9Router",
    port: 20128,
    protocol: "openai",
    baseUrl: "http://127.0.0.1:20128",
    modelPaths: Object.freeze(["/v1/models"]),
  }),
]);

/**
 * @param {string} engineId
 * @returns {object | null}
 */
export function getEngineDescriptor(engineId) {
  const clean = String(engineId || "").trim().toLowerCase();
  return LOCAL_AI_ENGINES.find((engine) => engine.id === clean) || null;
}

/**
 * Returns the default local base URL for an engine id, used by
 * `sessionActivity.js` Tier-4 failover so the three local ports live in
 * exactly one place.
 *
 * @param {string} engineId
 * @returns {string} The engine's base URL, or the Ollama default if unknown.
 */
export function getLocalEngineBaseUrl(engineId) {
  const descriptor = getEngineDescriptor(engineId) || getEngineDescriptor("ollama");
  return descriptor.baseUrl;
}
