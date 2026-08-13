import AsyncStorage from '@react-native-async-storage/async-storage';

// GA4 Measurement Protocol (plain HTTP, no native SDK) — chosen over @react-native-firebase
// specifically to avoid native iOS setup (a GoogleService-Info.plist doesn't exist yet for this
// app's Firebase project) and any Podfile/Gradle changes. Get these two values from
// GA4 Admin -> Data Streams -> (your app stream) -> Measurement Protocol API secrets, and set
// them as EXPO_PUBLIC_GA_MEASUREMENT_ID / EXPO_PUBLIC_GA_API_SECRET (same per-profile "env"
// mechanism as EXPO_PUBLIC_API_BASE_URL in eas.json/api.js) before this actually sends anything.
// Note these are bundled into the client and technically extractable - acceptable here since the
// worst case is spoofed analytics events, not a data leak (no user data flows the other way).
const MEASUREMENT_ID = process.env.EXPO_PUBLIC_GA_MEASUREMENT_ID;
const API_SECRET = process.env.EXPO_PUBLIC_GA_API_SECRET;
const ENDPOINT = 'https://www.google-analytics.com/mp/collect';

const CLIENT_ID_STORAGE_KEY = 'analyticsClientId';
let clientIdPromise = null;

// Doesn't need to be cryptographically random - GA4 only uses it to group events from the same
// install, so a persisted-once, good-enough-unique string is fine (avoids adding a uuid
// dependency just for this).
const generateClientId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

const getClientId = async () => {
  if (!clientIdPromise) {
    clientIdPromise = (async () => {
      const stored = await AsyncStorage.getItem(CLIENT_ID_STORAGE_KEY);
      if (stored) return stored;
      const generated = generateClientId();
      await AsyncStorage.setItem(CLIENT_ID_STORAGE_KEY, generated);
      return generated;
    })();
  }
  return clientIdPromise;
};

// Fire-and-forget, like the rest of this app's non-critical background calls (e.g. push token
// registration) - a dropped analytics event should never surface an error to the user or block
// whatever they were doing.
const logEvent = async (name, params = {}) => {
  if (!MEASUREMENT_ID || !API_SECRET) return;
  try {
    const clientId = await getClientId();
    await fetch(`${ENDPOINT}?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`, {
      method: 'POST',
      body: JSON.stringify({
        client_id: clientId,
        events: [{ name, params }],
      }),
    });
  } catch (error) {
    // non-fatal, no network/offline handling needed for analytics
  }
};

export const logLogin = () => logEvent('login');

export const logScreenView = (screenName) => logEvent('screen_view', { screen_name: screenName });
