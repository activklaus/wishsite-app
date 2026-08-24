import axios from 'axios';
import i18n from '../i18n';
import { showToast } from './toast';
import { setOffline } from './offlineStatus';
import { beginRequest, endRequest } from './loadingStatus';
import { API_BASE_URL, WEB_BASE_URL } from './apiConfig';

// GET requests populate a screen's own initial/refresh state, which already has its own loading
// UI (skeleton loaders, pull-to-refresh spinners, per-button `loading` props) - the global
// overlay is only for the "you just did something, is it saving?" gap that motivated it (see
// loadingStatus.js), which is exactly wishsite3's write-only form submits/AJAX actions.
const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);
const isMutating = (config) => MUTATING_METHODS.has((config?.method || '').toLowerCase());

export { WEB_BASE_URL };

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// True when the request never reached the server at all (no connection, DNS failure, timeout) —
// as opposed to the server responding with an actual error status. Axios sets `error.request`
// but leaves `error.response` undefined in that case. Screens use this to show "no internet
// connection" instead of misreading the failure as "the list is genuinely empty".
export const isNetworkError = (error) => !error.response && !!error.request;

// Revokes this device's token server-side (see Api::V1::SessionsController#destroy /
// ApiToken). Best-effort: called right before the local session is cleared, so a failed
// request (offline, etc.) shouldn't block logging out locally - the token just lingers
// server-side until it naturally stops being used.
export const logout = () => api.delete('/logout').catch(() => {});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Tells the backend which locale/marketplace to use (e.g. Amazon::Aws.search picks
// amazon.de vs amazon.com from I18n.locale) - without this, API requests have no
// locale signal of their own and the backend falls back to a dev-hardcoded/TLD-based
// default, so app users never see non-German results.
api.interceptors.request.use((config) => {
  config.headers['Accept-Language'] = i18n.locale;
  if (isMutating(config)) {
    beginRequest();
  }
  return config;
});

let sessionExpiredHandler = null;

// Registered once by App.tsx so this plain module can trigger a full logout without importing
// React state into it. Only /user and /guest_wishlists are Bearer-token-authenticated on the
// backend (see Api::V1::BaseController#authenticate_api_user!) — everything else (wishlists,
// items, comments, ...) is authorized via admin_key in the URL and can 401/404 for reasons that
// have nothing to do with the login token, so this must not react to those.
const SESSION_AUTH_PATH = /^\/(user|guest_wishlists)(\/|\?|$)/;

export const setSessionExpiredHandler = (handler) => {
  sessionExpiredHandler = handler;
};

api.interceptors.response.use(
  (response) => {
    if (isMutating(response.config)) {
      endRequest();
    }
    // Any successful round-trip proves we're online - clears the offline banner if it was
    // showing, without needing a dedicated background check for it (see offlineStatus.js).
    setOffline(false);
    return response;
  },
  (error) => {
    if (isMutating(error.config)) {
      endRequest();
    }
    const url = error.config?.url || '';
    if (error.response?.status === 401 && SESSION_AUTH_PATH.test(url) && sessionExpiredHandler) {
      sessionExpiredHandler();
    }
    // Catches this consistently for every request app-wide, instead of relying on each screen's
    // own try/catch to notice and say something — a screen can still show a more specific,
    // contextual message on top of this (see WishlistScreen's offline empty state), but nothing
    // should ever fail completely silently anymore.
    if (isNetworkError(error)) {
      showToast(i18n.t('offline.actionFailed'));
      setOffline(true);
    }
    return Promise.reject(error);
  }
);

export default api;