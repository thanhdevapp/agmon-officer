import { createSignal, createRenderEffect, createRoot, batch, untrack } from "solid-js";

/**
 * AGMon v1.0.0 — SolidJS Fine-Grained Reactive DOM & Component Runtime
 * (`src/lib/solidDomRuntime.js`)
 *
 * Powers the entire AGMon Workbench UI using SolidJS primitives (`createSignal`,
 * `createRenderEffect`, `createRoot`, `batch`, `untrack`) with zero `react` or `react-dom`
 * dependencies. Each component instance runs inside an isolated `createRoot` +
 * `createRenderEffect`, and every `useState` slot is backed directly by a SolidJS `createSignal`.
 */

export const FRAGMENT_TYPE = Symbol.for("agmon.solid.fragment");
export const PORTAL_TYPE = Symbol.for("agmon.solid.portal");
export const CONTEXT_TYPE = Symbol.for("agmon.solid.context");

const SVG_NS = "http://www.w3.org/2000/svg";

const SVG_ATTR_MAP = {
  strokeWidth: "stroke-width",
  strokeLinecap: "stroke-linecap",
  strokeLinejoin: "stroke-linejoin",
  strokeDasharray: "stroke-dasharray",
  strokeDashoffset: "stroke-dashoffset",
  strokeMiterlimit: "stroke-miterlimit",
  strokeOpacity: "stroke-opacity",
  fillOpacity: "fill-opacity",
  fillRule: "fill-rule",
  clipRule: "clip-rule",
  clipPath: "clip-path",
  stopColor: "stop-color",
  stopOpacity: "stop-opacity",
  fontFamily: "font-family",
  fontSize: "font-size",
  fontWeight: "font-weight",
  textAnchor: "text-anchor",
  dominantBaseline: "dominant-baseline",
  xmlnsXlink: "xmlns:xlink",
  xlinkHref: "xlink:href",
};

let currentComponent = null;

function flattenChildren(rawChildren, out = []) {
  if (rawChildren === null || rawChildren === undefined || typeof rawChildren === "boolean") {
    return out;
  }
  if (Array.isArray(rawChildren)) {
    for (let i = 0; i < rawChildren.length; i++) {
      flattenChildren(rawChildren[i], out);
    }
    return out;
  }
  out.push(rawChildren);
  return out;
}

/**
 * Preserves positional slots (including `false` / `null` / `undefined` from `{cond && <Child />}`)
 * so toggling conditional siblings never shifts subsequent unkeyed elements or remounts panels.
 */
function toChildArray(rawChildren) {
  if (rawChildren === undefined) return [];
  if (Array.isArray(rawChildren)) return rawChildren;
  return [rawChildren];
}

export function createElement(type, props, ...restChildren) {
  const normalizedProps = { ...(props || {}) };
  const key = normalizedProps.key !== undefined ? normalizedProps.key : null;
  const ref = normalizedProps.ref !== undefined ? normalizedProps.ref : null;
  delete normalizedProps.key;

  if (restChildren.length === 1) {
    normalizedProps.children = restChildren[0];
  } else if (restChildren.length > 1) {
    normalizedProps.children = restChildren;
  }

  return {
    $$typeof: true,
    type,
    props: normalizedProps,
    key,
    ref,
  };
}

export function Fragment(props) {
  return props?.children ?? null;
}

export function createPortal(children, container) {
  return {
    $$typeof: PORTAL_TYPE,
    type: PORTAL_TYPE,
    props: { children, container },
    key: null,
    ref: null,
  };
}

export function forwardRef(renderFn) {
  const Wrapped = (props) => renderFn(props, props?.ref ?? null);
  Wrapped.__isForwardRef = true;
  return Wrapped;
}

export function memo(Component) {
  return Component;
}

export function isValidElement(obj) {
  return Boolean(obj && typeof obj === "object" && obj.$$typeof);
}

export function cloneElement(element, extraProps = {}, ...extraChildren) {
  if (!isValidElement(element)) return element;
  const mergedProps = { ...element.props, ...extraProps };
  if (extraChildren.length > 0) {
    mergedProps.children = extraChildren.length === 1 ? extraChildren[0] : extraChildren;
  }
  return {
    ...element,
    props: mergedProps,
    key: extraProps.key !== undefined ? extraProps.key : element.key,
    ref: extraProps.ref !== undefined ? extraProps.ref : element.ref,
  };
}

export const Children = {
  map(children, fn) {
    return flattenChildren(children).map(fn);
  },
  forEach(children, fn) {
    flattenChildren(children).forEach(fn);
  },
  count(children) {
    return flattenChildren(children).length;
  },
  toArray(children) {
    return flattenChildren(children);
  },
  only(children) {
    const arr = flattenChildren(children);
    return arr[0] || null;
  },
};

export function createContext(defaultValue) {
  const ctxSymbol = Symbol("agmon.context");
  const [getFallback, setFallback] = createSignal(defaultValue, { equals: false });

  const Provider = (props) => {
    const comp = currentComponent;
    if (comp) {
      if (!comp.contextSignals) comp.contextSignals = new Map();
      if (!comp.contextSignals.has(ctxSymbol)) {
        const [getVal, setVal] = createSignal(props.value, { equals: false });
        comp.contextSignals.set(ctxSymbol, { getVal, setVal });
      } else {
        const entry = comp.contextSignals.get(ctxSymbol);
        untrack(() => entry.setVal(() => props.value));
      }
    } else {
      untrack(() => setFallback(() => props.value));
    }
    return props.children;
  };

  const readContext = () => {
    let cursor = currentComponent;
    while (cursor) {
      if (cursor.contextSignals && cursor.contextSignals.has(ctxSymbol)) {
        return cursor.contextSignals.get(ctxSymbol).getVal();
      }
      cursor = cursor.parentComponent || null;
    }
    return getFallback();
  };

  return {
    $$typeof: CONTEXT_TYPE,
    _symbol: ctxSymbol,
    Provider,
    Consumer: (props) => (typeof props.children === "function" ? props.children(readContext()) : null),
    _get: readContext,
    _defaultValue: defaultValue,
  };
}

// ============================================================================
// SolidJS-Backed Hooks
// ============================================================================

function getHookSlot() {
  if (!currentComponent) {
    throw new Error("[solidDomRuntime] Hook called outside component render");
  }
  const comp = currentComponent;
  const idx = comp.hookIndex++;
  if (idx >= comp.hooks.length) {
    comp.hooks.push({});
  }
  return { comp, slot: comp.hooks[idx], idx };
}

function depsChanged(prevDeps, nextDeps) {
  if (!prevDeps || !nextDeps) return true;
  if (prevDeps.length !== nextDeps.length) return true;
  for (let i = 0; i < prevDeps.length; i++) {
    if (!Object.is(prevDeps[i], nextDeps[i])) return true;
  }
  return false;
}

export function useState(initialValue) {
  const { comp, slot } = getHookSlot();
  if (!slot.initialized) {
    slot.initialized = true;
    const init = typeof initialValue === "function" ? initialValue() : initialValue;
    slot.currentValue = init;
    const [getter, setter] = createSignal(init, { equals: false });
    slot.getter = getter;
    slot.setter = (updater) => {
      const next = typeof updater === "function" ? updater(slot.currentValue) : updater;
      if (!Object.is(next, slot.currentValue)) {
        slot.currentValue = next;
        if (!comp.disposed) {
          setter(() => next);
        }
      }
    };
  }
  return [slot.getter(), slot.setter];
}

export function useReducer(reducer, initialArg, initFn) {
  const initVal = typeof initFn === "function" ? initFn(initialArg) : initialArg;
  const [state, setState] = useState(initVal);
  const dispatch = (action) => {
    setState((prev) => reducer(prev, action));
  };
  return [state, dispatch];
}

export function useRef(initialValue) {
  const { slot } = getHookSlot();
  if (!slot.initialized) {
    slot.initialized = true;
    slot.ref = { current: initialValue };
  }
  return slot.ref;
}

export function useMemo(factory, deps) {
  const { slot } = getHookSlot();
  if (!slot.initialized || depsChanged(slot.deps, deps)) {
    slot.initialized = true;
    slot.deps = deps;
    slot.value = untrack(factory);
  }
  return slot.value;
}

export function useCallback(callback, deps) {
  return useMemo(() => callback, deps);
}

export function useEffect(effectFn, deps) {
  const { comp, slot } = getHookSlot();
  if (!slot.initialized || depsChanged(slot.deps, deps)) {
    slot.initialized = true;
    slot.deps = deps;
    comp.pendingEffects.push(() => {
      if (comp.disposed) return;
      if (typeof slot.cleanup === "function") {
        try {
          slot.cleanup();
        } catch {}
        slot.cleanup = null;
      }
      const cleanup = untrack(effectFn);
      if (typeof cleanup === "function") {
        slot.cleanup = cleanup;
      }
    });
  }
}

export const useLayoutEffect = useEffect;

export function useContext(contextObj) {
  if (!contextObj) return undefined;
  return typeof contextObj._get === "function" ? contextObj._get() : contextObj._defaultValue;
}

export function useId() {
  const { slot } = getHookSlot();
  if (!slot.initialized) {
    slot.initialized = true;
    slot.id = `agmon-${Math.random().toString(36).slice(2, 9)}`;
  }
  return slot.id;
}

export function useImperativeHandle(ref, createHandle, deps) {
  useEffect(() => {
    const handle = typeof createHandle === "function" ? createHandle() : null;
    assignRef(ref, handle);
    return () => assignRef(ref, null);
  }, deps);
}

export function Suspense(props) {
  return props?.children ?? null;
}

// ============================================================================
// SolidJS Fine-Grained DOM Reconciler
// ============================================================================

function assignRef(ref, domNode) {
  if (!ref) return;
  if (typeof ref === "function") {
    try {
      ref(domNode);
    } catch {}
  } else if (typeof ref === "object") {
    ref.current = domNode;
  }
}

function setDomAttribute(el, key, value, prevValue, isSvg) {
  if (key === "children" || key === "key" || key === "ref" || key === "suppressHydrationWarning") {
    return;
  }

  if (key === "dangerouslySetInnerHTML") {
    const nextHtml = value?.__html ?? "";
    const prevHtml = prevValue?.__html ?? "";
    if (nextHtml !== prevHtml) {
      el.innerHTML = nextHtml;
    }
    return;
  }

  if (key === "className" || key === "class") {
    const cls = value || "";
    if (cls !== (prevValue || "")) {
      if (isSvg) {
        if (cls) el.setAttribute("class", cls);
        else el.removeAttribute("class");
      } else {
        el.className = cls;
      }
    }
    return;
  }

  if (key === "style") {
    if (typeof value === "string") {
      el.style.cssText = value;
      return;
    }
    const prevStyle = typeof prevValue === "object" && prevValue ? prevValue : {};
    const nextStyle = typeof value === "object" && value ? value : {};
    for (const k of Object.keys(prevStyle)) {
      if (!(k in nextStyle)) {
        if (k.startsWith("--")) el.style.removeProperty(k);
        else el.style[k] = "";
      }
    }
    for (const [k, v] of Object.entries(nextStyle)) {
      if (prevStyle[k] !== v) {
        if (k.startsWith("--")) {
          el.style.setProperty(k, v == null ? "" : String(v));
        } else if (typeof v === "number" && !/^(opacity|zIndex|fontWeight|lineHeight|flex|flexGrow|flexShrink|order|zoom|scale)$/i.test(k)) {
          el.style[k] = `${v}px`;
        } else {
          el.style[k] = v == null ? "" : String(v);
        }
      }
    }
    return;
  }

  if (key.startsWith("on") && key.length > 2) {
    if (!el.__agmonHandlers) el.__agmonHandlers = {};
    if (!el.__agmonListeners) el.__agmonListeners = {};

    let rawEvent = key.slice(2).toLowerCase();
    if (rawEvent === "doubleclick") rawEvent = "dblclick";

    const tag = el.tagName ? el.tagName.toLowerCase() : "";
    const type = el.type ? String(el.type).toLowerCase() : (el.getAttribute ? String(el.getAttribute("type") || "").toLowerCase() : "");
    const isCheckable = tag === "input" && (type === "checkbox" || type === "radio");
    const isTextual = (tag === "input" && !isCheckable) || tag === "textarea";

    const eventsToBind =
      rawEvent === "change" && isTextual
        ? ["input", "change"]
        : [rawEvent];

    el.__agmonHandlers[key] = value;

    for (const evName of eventsToBind) {
      const listenerKey = `${evName}:${key}`;
      if (!el.__agmonListeners[listenerKey]) {
        const listener = (domEvent) => {
          // If this is an "input" event dispatched for a checkbox or radio,
          // ignore it so onChange only runs on the native "change" event!
          if (domEvent.type === "input") {
            const curType = el.type ? String(el.type).toLowerCase() : (el.getAttribute ? String(el.getAttribute("type") || "").toLowerCase() : "");
            if (curType === "checkbox" || curType === "radio") {
              return;
            }
          }
          const fn = el.__agmonHandlers[key];
          if (typeof fn === "function") {
            batch(() => fn(domEvent));
          }
          if (
            el.__agmonControlled &&
            typeof el.__agmonControlledValue === "string" &&
            el.value !== el.__agmonControlledValue
          ) {
            el.value = el.__agmonControlledValue;
          }
        };
        el.__agmonListeners[listenerKey] = listener;
        el.addEventListener(evName, listener);
      }
    }
    return;
  }

  if (!isSvg && key === "autoFocus") {
    return;
  }

  if (!isSvg && key === "defaultValue") {
    const strVal = value == null ? "" : String(value);
    el.defaultValue = strVal;
    if (!el.__agmonControlled && prevValue === undefined && el.value === "") {
      el.value = strVal;
    }
    return;
  }

  if (!isSvg && key === "defaultChecked") {
    const boolVal = Boolean(value);
    el.defaultChecked = boolVal;
    if (prevValue === undefined) {
      el.checked = boolVal;
    }
    return;
  }

  if (!isSvg && (key === "value" || key === "checked" || key === "disabled" || key === "selected" || key === "readOnly")) {
    if (key === "value") {
      if (value === undefined) {
        el.__agmonControlled = false;
        el.__agmonControlledValue = undefined;
      } else {
        const strVal = value == null ? "" : String(value);
        el.__agmonControlled = true;
        el.__agmonControlledValue = strVal;
        if (el.value !== strVal) {
          el.value = strVal;
        }
      }
    } else {
      el[key] = Boolean(value);
    }
    return;
  }

  const attrName = isSvg && SVG_ATTR_MAP[key] ? SVG_ATTR_MAP[key] : key === "htmlFor" ? "for" : key;

  if (value === null || value === undefined) {
    el.removeAttribute(attrName);
  } else if (typeof value === "boolean" && attrName.startsWith("aria-")) {
    // ARIA states are string-valued, not presence-valued: a screen reader reads
    // `aria-checked=""` as neither true nor false, so an open/closed toggle
    // would announce both states identically. Other boolean attributes keep
    // presence semantics, where the empty value is correct.
    if (value !== prevValue) el.setAttribute(attrName, String(value));
  } else if (value === false) {
    el.removeAttribute(attrName);
  } else if (value === true) {
    el.setAttribute(attrName, "");
  } else if (value !== prevValue) {
    el.setAttribute(attrName, String(value));
  }
}

function updateDomProperties(el, prevProps = {}, nextProps = {}, isSvg = false) {
  for (const k of Object.keys(prevProps)) {
    if (!(k in nextProps)) {
      setDomAttribute(el, k, undefined, prevProps[k], isSvg);
    }
  }
  for (const [k, v] of Object.entries(nextProps)) {
    setDomAttribute(el, k, v, prevProps[k], isSvg);
  }
}

function normalizeVNode(raw) {
  if (raw === null || raw === undefined || typeof raw === "boolean") {
    return { kind: "empty", key: null };
  }
  if (typeof raw === "string" || typeof raw === "number") {
    return { kind: "text", text: String(raw), key: null };
  }
  if (Array.isArray(raw)) {
    return { kind: "fragment", children: toChildArray(raw), key: null };
  }
  if (raw.$$typeof === PORTAL_TYPE) {
    return {
      kind: "portal",
      container: raw.props.container,
      children: toChildArray(raw.props.children),
      key: raw.key ?? null,
    };
  }
  if (typeof raw === "object" && raw.$$typeof) {
    if (raw.type === FRAGMENT_TYPE || raw.type === Fragment) {
      return {
        kind: "fragment",
        children: toChildArray(raw.props?.children),
        key: raw.key ?? null,
      };
    }
    if (typeof raw.type === "function") {
      return {
        kind: "component",
        type: raw.type,
        props: raw.props || {},
        ref: raw.ref ?? null,
        key: raw.key ?? null,
      };
    }
    if (typeof raw.type === "string") {
      return {
        kind: "element",
        type: raw.type,
        props: raw.props || {},
        ref: raw.ref ?? null,
        key: raw.key ?? null,
      };
    }
  }
  return { kind: "empty", key: null };
}

function getFirstDomNode(instance) {
  if (!instance) return null;
  if (instance.kind === "portal") return instance.marker || null;
  if (instance.dom) return instance.dom;
  if (instance.childInstance) return getFirstDomNode(instance.childInstance);
  if (instance.childInstances && instance.childInstances.length > 0) {
    for (const c of instance.childInstances) {
      const dom = getFirstDomNode(c);
      if (dom) return dom;
    }
  }
  return instance.marker || null;
}

function getAllDomNodes(instance, out = []) {
  if (!instance) return out;
  if (instance.kind === "portal") {
    if (instance.marker) out.push(instance.marker);
    return out;
  }
  if (instance.dom) {
    out.push(instance.dom);
    return out;
  }
  if (instance.childInstance) {
    getAllDomNodes(instance.childInstance, out);
  }
  if (instance.childInstances) {
    for (const c of instance.childInstances) {
      getAllDomNodes(c, out);
    }
  }
  if (instance.marker) {
    out.push(instance.marker);
  }
  return out;
}

function unmountInstance(instance, removeDom = true) {
  if (!instance) return;

  if (instance.kind === "component") {
    instance.disposed = true;
    if (typeof instance.disposeRoot === "function") {
      try {
        instance.disposeRoot();
      } catch {}
    }
    if (instance.hooks) {
      for (const h of instance.hooks) {
        if (typeof h?.cleanup === "function") {
          try {
            h.cleanup();
          } catch {}
          h.cleanup = null;
        }
      }
    }
    unmountInstance(instance.childInstance, removeDom);
    if (removeDom && instance.marker && instance.marker.parentNode) {
      instance.marker.parentNode.removeChild(instance.marker);
    }
    return;
  }

  if (instance.kind === "portal") {
    if (instance.childInstances) {
      for (const c of instance.childInstances) {
        unmountInstance(c, true);
      }
    }
    if (removeDom && instance.marker && instance.marker.parentNode) {
      instance.marker.parentNode.removeChild(instance.marker);
    }
    return;
  }

  if (instance.ref) {
    assignRef(instance.ref, null);
  }

  if (instance.childInstances) {
    for (const c of instance.childInstances) {
      unmountInstance(c, false);
    }
  }

  if (removeDom) {
    const nodes = getAllDomNodes(instance);
    for (const n of nodes) {
      if (n && n.parentNode) {
        n.parentNode.removeChild(n);
      }
    }
  }
}

function mountVNode(rawVNode, parentDom, beforeNode = null, isSvg = false) {
  const vnode = normalizeVNode(rawVNode);

  if (vnode.kind === "empty") {
    const marker = document.createComment("e");
    parentDom.insertBefore(marker, beforeNode);
    return { kind: "empty", key: vnode.key, dom: marker };
  }

  if (vnode.kind === "text") {
    const textNode = document.createTextNode(vnode.text);
    parentDom.insertBefore(textNode, beforeNode);
    return { kind: "text", key: vnode.key, text: vnode.text, dom: textNode };
  }

  if (vnode.kind === "fragment") {
    const marker = document.createComment("f");
    parentDom.insertBefore(marker, beforeNode);
    const childInstances = vnode.children.map((ch) =>
      mountVNode(ch, parentDom, marker, isSvg)
    );
    return {
      kind: "fragment",
      key: vnode.key,
      childInstances,
      marker,
    };
  }

  if (vnode.kind === "portal") {
    const marker = document.createComment("portal");
    parentDom.insertBefore(marker, beforeNode);
    const targetContainer = vnode.container || document.body;
    const childInstances = vnode.children.map((ch) =>
      mountVNode(ch, targetContainer, null, false)
    );
    return {
      kind: "portal",
      key: vnode.key,
      container: targetContainer,
      childInstances,
      marker,
    };
  }

  if (vnode.kind === "element") {
    const nextIsSvg = isSvg || vnode.type === "svg";
    const el = nextIsSvg
      ? document.createElementNS(SVG_NS, vnode.type)
      : document.createElement(vnode.type);

    updateDomProperties(el, {}, vnode.props, nextIsSvg);
    // Insert into parentDom BEFORE mounting children so child components see live DOM layout & dimensions
    parentDom.insertBefore(el, beforeNode);

    let childInstances = [];
    if (!vnode.props.dangerouslySetInnerHTML) {
      const rawChildren = toChildArray(vnode.props.children);
      childInstances = rawChildren.map((ch) => mountVNode(ch, el, null, nextIsSvg));
    }

    if (vnode.type === "select" && vnode.props.value !== undefined) {
      const strVal = vnode.props.value == null ? "" : String(vnode.props.value);
      if (el.value !== strVal) el.value = strVal;
    }

    if (vnode.ref) {
      assignRef(vnode.ref, el);
    }

    if (!nextIsSvg && vnode.props?.autoFocus) {
      queueMicrotask(() => {
        if (el.isConnected && typeof el.focus === "function") {
          try {
            el.focus();
          } catch {}
        }
      });
    }

    return {
      kind: "element",
      type: vnode.type,
      key: vnode.key,
      props: vnode.props,
      ref: vnode.ref,
      isSvg: nextIsSvg,
      dom: el,
      childInstances,
    };
  }

  if (vnode.kind === "component") {
    const marker = document.createComment("c");
    parentDom.insertBefore(marker, beforeNode);

    const [getProps, setProps] = createSignal(
      vnode.ref ? { ...vnode.props, ref: vnode.ref } : vnode.props,
      { equals: false }
    );

    const instance = {
      kind: "component",
      type: vnode.type,
      key: vnode.key,
      isSvg,
      parentComponent: currentComponent,
      contextSignals: null,
      hooks: [],
      hookIndex: 0,
      pendingEffects: [],
      childInstance: null,
      marker,
      setProps,
      disposeRoot: null,
      disposed: false,
    };

    createRoot((dispose) => {
      instance.disposeRoot = dispose;
      createRenderEffect(() => {
        if (instance.disposed) return;
        const activeProps = getProps();
        const prevComp = currentComponent;
        currentComponent = instance;
        instance.hookIndex = 0;
        instance.pendingEffects = [];

        let renderedVNode = null;
        let renderFailed = false;
        try {
          renderedVNode = instance.type(activeProps);
        } catch (err) {
          renderFailed = true;
          const compName = instance.type.displayName || instance.type.name || "Component";
          console.error(`[solidDomRuntime] Error rendering ${compName}:`, err);
          if (typeof window !== "undefined" && window.agmonDiagnostics?.captureException) {
            try {
              window.agmonDiagnostics.captureException(err, {
                source: "renderer",
                category: "component-render-boundary",
                component: compName,
              });
            } catch {}
          }
          renderedVNode = null;
        } finally {
          currentComponent = prevComp;
        }

        if (renderFailed && instance.childInstance) {
          return;
        }

        const currentParent = instance.marker.parentNode || parentDom;
        const prevCompDuringPatch = currentComponent;
        currentComponent = instance;
        try {
          untrack(() => {
            if (!instance.childInstance) {
              instance.childInstance = mountVNode(
                renderedVNode,
                currentParent,
                instance.marker,
                instance.isSvg
              );
            } else {
              instance.childInstance = patchInstance(
                instance.childInstance,
                renderedVNode,
                currentParent,
                instance.marker,
                instance.isSvg
              );
            }
          });
        } finally {
          currentComponent = prevCompDuringPatch;
        }

        const effectsToRun = instance.pendingEffects.splice(0, instance.pendingEffects.length);
        if (effectsToRun.length > 0) {
          queueMicrotask(() => {
            for (const eff of effectsToRun) {
              try {
                eff();
              } catch (err) {
                const compName = instance.type.displayName || instance.type.name || "Component";
                console.warn("[solidDomRuntime] Effect error:", err);
                if (typeof window !== "undefined" && window.agmonDiagnostics?.captureException) {
                  try {
                    window.agmonDiagnostics.captureException(err, {
                      source: "renderer",
                      category: "component-effect-error",
                      component: compName,
                    });
                  } catch {}
                }
              }
            }
          });
        }
      });
    });

    return instance;
  }

  const fallback = document.createComment("u");
  parentDom.insertBefore(fallback, beforeNode);
  return { kind: "empty", key: null, dom: fallback };
}

function patchChildren(parentDom, prevChildInstances = [], nextRawChildren = [], endAnchor = null, isSvg = false) {
  const nextChildren = toChildArray(nextRawChildren);
  const nextInstances = new Array(nextChildren.length);

  const keyedPrev = new Map();
  const unkeyedPrev = [];

  for (let i = 0; i < prevChildInstances.length; i++) {
    const prev = prevChildInstances[i];
    if (prev && prev.key !== null && prev.key !== undefined) {
      // Duplicate keys queue up instead of overwriting, so every previous instance is either
      // reused or unmounted and none of its DOM is orphaned.
      const queue = keyedPrev.get(prev.key);
      if (queue) queue.push(prev);
      else keyedPrev.set(prev.key, [prev]);
    } else if (prev) {
      unkeyedPrev.push(prev);
    }
  }

  let unkeyedIdx = 0;

  for (let i = 0; i < nextChildren.length; i++) {
    const nextRaw = nextChildren[i];
    const nextNorm = normalizeVNode(nextRaw);
    let matchedPrev = null;

    if (nextNorm.key !== null && nextNorm.key !== undefined) {
      const queue = keyedPrev.get(nextNorm.key);
      if (queue) {
        matchedPrev = queue.shift();
        if (queue.length === 0) keyedPrev.delete(nextNorm.key);
      }
    } else if (unkeyedIdx < unkeyedPrev.length) {
      matchedPrev = unkeyedPrev[unkeyedIdx++];
    }

    if (matchedPrev) {
      nextInstances[i] = patchInstance(matchedPrev, nextRaw, parentDom, endAnchor, isSvg);
    } else {
      nextInstances[i] = mountVNode(nextRaw, parentDom, endAnchor, isSvg);
    }
  }

  for (const queue of keyedPrev.values()) {
    for (const unused of queue) unmountInstance(unused, true);
  }
  while (unkeyedIdx < unkeyedPrev.length) {
    unmountInstance(unkeyedPrev[unkeyedIdx++], true);
  }

  // Ensure exact DOM node order across elements, text, fragments, and components
  let cursor = endAnchor;
  for (let i = nextInstances.length - 1; i >= 0; i--) {
    const inst = nextInstances[i];
    const nodes = getAllDomNodes(inst);
    for (let nIdx = nodes.length - 1; nIdx >= 0; nIdx--) {
      const node = nodes[nIdx];
      if (node && node.parentNode === parentDom) {
        if (node.nextSibling !== cursor) {
          parentDom.insertBefore(node, cursor);
        }
        cursor = node;
      }
    }
  }

  return nextInstances;
}

function patchInstance(prevInstance, rawNextVNode, parentDom, beforeNode = null, isSvg = false) {
  const nextVNode = normalizeVNode(rawNextVNode);

  if (
    !prevInstance ||
    prevInstance.kind !== nextVNode.kind ||
    prevInstance.type !== nextVNode.type ||
    prevInstance.key !== nextVNode.key
  ) {
    const firstDom = getFirstDomNode(prevInstance);
    const anchor =
      firstDom && firstDom.parentNode === parentDom
        ? firstDom
        : beforeNode && beforeNode.parentNode === parentDom
          ? beforeNode
          : null;
    const mounted = mountVNode(rawNextVNode, parentDom, anchor, isSvg);
    unmountInstance(prevInstance, true);
    return mounted;
  }

  if (nextVNode.kind === "empty") {
    return prevInstance;
  }

  if (nextVNode.kind === "text") {
    if (prevInstance.text !== nextVNode.text) {
      prevInstance.dom.nodeValue = nextVNode.text;
      prevInstance.text = nextVNode.text;
    }
    return prevInstance;
  }

  if (nextVNode.kind === "fragment") {
    prevInstance.childInstances = patchChildren(
      parentDom,
      prevInstance.childInstances,
      nextVNode.children,
      prevInstance.marker,
      isSvg
    );
    return prevInstance;
  }

  if (nextVNode.kind === "portal") {
    const targetContainer = nextVNode.container || document.body;
    prevInstance.childInstances = patchChildren(
      targetContainer,
      prevInstance.childInstances,
      nextVNode.children,
      null,
      false
    );
    return prevInstance;
  }

  if (nextVNode.kind === "element") {
    updateDomProperties(prevInstance.dom, prevInstance.props, nextVNode.props, prevInstance.isSvg);
    prevInstance.props = nextVNode.props;

    if (nextVNode.ref !== prevInstance.ref) {
      if (prevInstance.ref) assignRef(prevInstance.ref, null);
      if (nextVNode.ref) assignRef(nextVNode.ref, prevInstance.dom);
      prevInstance.ref = nextVNode.ref;
    }

    if (!nextVNode.props.dangerouslySetInnerHTML) {
      prevInstance.childInstances = patchChildren(
        prevInstance.dom,
        prevInstance.childInstances,
        nextVNode.props.children,
        null,
        prevInstance.isSvg
      );
    }

    if (nextVNode.type === "select" && nextVNode.props.value !== undefined) {
      const strVal = nextVNode.props.value == null ? "" : String(nextVNode.props.value);
      if (prevInstance.dom.value !== strVal) prevInstance.dom.value = strVal;
    }

    return prevInstance;
  }

  if (nextVNode.kind === "component") {
    const nextProps = nextVNode.ref
      ? { ...nextVNode.props, ref: nextVNode.ref }
      : nextVNode.props;
    prevInstance.setProps(() => nextProps);
    return prevInstance;
  }

  return prevInstance;
}

export function createRootRenderer(container) {
  let rootInstance = null;
  return {
    render(vnode) {
      if (!container) return;
      if (rootInstance) {
        unmountInstance(rootInstance, true);
        rootInstance = null;
      }
      container.innerHTML = "";
      rootInstance = mountVNode(vnode, container, null, false);
    },
    unmount() {
      if (rootInstance) {
        unmountInstance(rootInstance, true);
        rootInstance = null;
      }
    },
  };
}

export { createRootRenderer as createRoot };

const SolidReactCompat = {
  createElement,
  Fragment,
  createPortal,
  forwardRef,
  memo,
  isValidElement,
  cloneElement,
  Children,
  createContext,
  useState,
  useReducer,
  useRef,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useContext,
  useId,
  useImperativeHandle,
  Suspense,
  createRoot: createRootRenderer,
};

export default SolidReactCompat;
