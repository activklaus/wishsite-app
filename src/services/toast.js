let listener = null;

// Registered once by the <Toast> component mounted at the app root. Kept as a plain
// module-level callback (like api.js's sessionExpiredHandler) so non-component code — the axios
// interceptor in particular — can trigger a toast without importing React state into it.
export const setToastListener = (fn) => {
  listener = fn;
};

export const showToast = (message) => {
  if (listener) listener(message);
};
