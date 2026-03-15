export const qs = (selector, root = document) => root.querySelector(selector)

export const qsa = (selector, root = document) => [...root.querySelectorAll(selector)]

export const emit = (el, name, detail = {}) =>
  el.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }))
