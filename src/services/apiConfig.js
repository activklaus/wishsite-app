import { Platform } from 'react-native';

const API_VERSION = 'v1';

// Local Rails dev server, reached via the Android emulator's host alias or
// the iOS simulator's shared localhost. Overridable at build time via
// EXPO_PUBLIC_API_BASE_URL (see eas.json per-profile "env") for builds that
// need to reach a real device or a deployed backend instead.
const LOCAL_API_BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:3000/api/' + API_VERSION
  : 'http://localhost:3000/api/' + API_VERSION;

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || LOCAL_API_BASE_URL;

// Public web host (same Rails app as the API), used to build shareable wishlist links and as
// the connectivity probe target (see offlineStatus.js). Split out of api.js so offlineStatus.js
// can depend on it without api.js and offlineStatus.js importing each other.
export const WEB_BASE_URL = API_BASE_URL.replace(/\/api\/v1$/, '');
