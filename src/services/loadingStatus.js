// Mirrors wishsite3's global $(document).ajaxStart()/ajaxComplete() (functions/baseEventListener.js)
// which shows/hides a blocking overlay for every AJAX request site-wide - see api.js's
// interceptors for where begin/endRequest are actually called, and GlobalLoadingOverlay.js for
// the React-facing side (useLoadingStatus.js). A plain counter (not a boolean) since requests can
// overlap - the overlay should only disappear once the last of them finishes.
let pendingCount = 0;
const listeners = new Set();

export const getIsLoading = () => pendingCount > 0;

const notify = () => listeners.forEach((listener) => listener(getIsLoading()));

export const beginRequest = () => {
  pendingCount += 1;
  if (pendingCount === 1) notify();
};

export const endRequest = () => {
  pendingCount = Math.max(0, pendingCount - 1);
  if (pendingCount === 0) notify();
};

export const subscribeLoading = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
