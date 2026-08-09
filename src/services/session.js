import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'wishsiteSession';

// Persists the logged-in user + token so the app stays logged in across restarts, instead of
// forcing a fresh login every cold start. SecureStore (Keychain/Keystore-backed) rather than
// AsyncStorage since this holds an auth token.
export const saveSession = async (user, token) => {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify({ user, token }));
};

export const loadSession = async () => {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.user) return null;
    return parsed;
  } catch (error) {
    return null;
  }
};

export const clearSession = async () => {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
};
