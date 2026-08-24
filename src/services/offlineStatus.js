import NetInfo from '@react-native-community/netinfo';
import { WEB_BASE_URL } from './apiConfig';

// Plain external store (no polling, no subscriptions to NetInfo events) - the offline banner is
// now driven entirely by real request outcomes (see api.js's response interceptor) plus the
// user's own "Aktualisieren" tap, instead of a background check running every few seconds that's
// wrong >99% of the time. See useIsOffline (hooks/useNetworkStatus.js) for the React-facing side.
let isOffline = false;
const listeners = new Set();

export const getIsOffline = () => isOffline;

export const setOffline = (value) => {
  if (value === isOffline) return;
  isOffline = value;
  listeners.forEach((listener) => listener(isOffline));
};

export const subscribeOffline = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// One-shot connectivity probe for the banner's manual "Aktualisieren" button - not called
// automatically anywhere. Talks to our own backend directly instead of trusting NetInfo's
// isInternetReachable, which reflects the OS's own general internet reachability (unrelated to
// whether our backend specifically is up, and known to get stuck on the iOS Simulator) and which
// NetInfo.fetch() only ever reads from its last cached value rather than probing fresh - tapping
// "Aktualisieren" was therefore reading the very same stale reading every time.
export const checkConnectivity = async () => {
  const netState = await NetInfo.fetch();
  if (netState.isConnected === false) {
    // Device radio itself is off (e.g. airplane mode) - no point making a request.
    setOffline(true);
    return false;
  }
  try {
    // GET, not HEAD: matches the request method every other successful call in this app already
    // uses (api.js's axios calls), instead of a method that's far less exercised end-to-end.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      await fetch(`${WEB_BASE_URL}/`, { method: 'GET', signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    setOffline(false);
    return true;
  } catch (error) {
    setOffline(true);
    return false;
  }
};
