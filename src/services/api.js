import axios from 'axios';
import { Platform } from 'react-native';
import i18n from '../i18n';
import { showToast } from './toast';

const API_VERSION = 'v1';

// Local Rails dev server, reached via the Android emulator's host alias or
// the iOS simulator's shared localhost. Overridable at build time via
// EXPO_PUBLIC_API_BASE_URL (see eas.json per-profile "env") for builds that
// need to reach a real device or a deployed backend instead.
const LOCAL_API_BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000/api/' + API_VERSION
  : 'http://localhost:3000/api/' + API_VERSION;

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || LOCAL_API_BASE_URL;

// Public web host (same Rails app as the API), used to build shareable wishlist links.
export const WEB_BASE_URL = API_BASE_URL.replace(/\/api\/v1$/, '');

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

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

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
  (response) => response,
  (error) => {
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
    }
    return Promise.reject(error);
  }
);

export default api;