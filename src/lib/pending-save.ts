const flushers = new Set<() => void>();
const titleFlushers = new Set<() => void>();
const cancellers = new Set<() => void>();
const pageCancellers = new Set<() => void>();

/** Editor debounces ink. Quit and hide must run these before the notebook is written. */
export function registerPendingFlush(fn: () => void) {
  flushers.add(fn);
  return () => {
    flushers.delete(fn);
  };
}

export function registerPendingTitleFlush(fn: () => void) {
  titleFlushers.add(fn);
  return () => {
    titleFlushers.delete(fn);
  };
}

/** A page split must drop the pre-split debounce, not write it back onto sheet 1. */
export function registerPendingCancel(fn: () => void) {
  cancellers.add(fn);
  return () => {
    cancellers.delete(fn);
  };
}

export function registerPendingPageCancel(fn: () => void) {
  pageCancellers.add(fn);
  return () => {
    pageCancellers.delete(fn);
  };
}

export function flushPendingEdits() {
  for (const fn of titleFlushers) fn();
  for (const fn of flushers) fn();
}

export function flushPendingTitles() {
  for (const fn of titleFlushers) fn();
}

export function cancelPendingEdits() {
  for (const fn of cancellers) fn();
}

export function cancelPendingPageEdits() {
  for (const fn of pageCancellers) fn();
}
