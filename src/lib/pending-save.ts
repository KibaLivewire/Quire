const flushers = new Set<() => void>();

/** Editor debounces ink. Quit and hide must run these before the notebook is written. */
export function registerPendingFlush(fn: () => void) {
  flushers.add(fn);
  return () => {
    flushers.delete(fn);
  };
}

export function flushPendingEdits() {
  for (const fn of flushers) fn();
}
