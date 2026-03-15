export function createStore(initial) {
  let state = { ...initial };
  const subs = new Set();

  return {
    getTime: () => ({ ...state }),
    setTime: (patch) => {
      state = { ...state, ...patch };
      subs.forEach(fn => fn({ ...state }));
    },
    subscribe: (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}
