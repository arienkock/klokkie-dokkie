export const on = (el, event, handler, options) => {
  el.addEventListener(event, handler, options)
  return () => el.removeEventListener(event, handler, options)
}

export const once = (el, event) =>
  new Promise((resolve) => el.addEventListener(event, resolve, { once: true }))
