import { createElement, Fragment } from "./solidDomRuntime.js";

/**
 * Automatic JSX Runtime Bridge (`jsx`, `jsxs`, `jsxDEV`, `Fragment`)
 * Wired directly to `src/lib/solidDomRuntime.js`.
 */

export function jsx(type, config, maybeKey) {
  const props = { ...(config || {}) };
  if (maybeKey !== undefined) {
    props.key = maybeKey;
  }
  const children = props.children;
  delete props.children;
  if (children !== undefined) {
    return Array.isArray(children)
      ? createElement(type, props, ...children)
      : createElement(type, props, children);
  }
  return createElement(type, props);
}

export const jsxs = jsx;
export const jsxDEV = jsx;
export { Fragment };
