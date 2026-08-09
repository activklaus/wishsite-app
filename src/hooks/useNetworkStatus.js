import { useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

const deriveIsConnected = (state) =>
  // isInternetReachable can be `null` while still being determined — only treat an explicit
  // `false` (from either flag) as offline, so we don't show the banner on a false positive.
  state.isConnected !== false && state.isInternetReachable !== false;

// isConnected starts `true` (optimistic) so the app doesn't flash an offline banner before the
// first real reading comes in — NetInfo delivers that within a tick of mounting.
export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState(true);
  const isConnectedRef = useRef(isConnected);
  isConnectedRef.current = isConnected;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(deriveIsConnected(state));
    });

    // Connectivity events (especially "back online") are unreliable on the iOS Simulator, so
    // poll for a fresh reading while we're showing offline, instead of waiting indefinitely for
    // an event that may never come. Only polls while offline — no overhead once reconnected.
    const interval = setInterval(() => {
      if (!isConnectedRef.current) {
        NetInfo.fetch().then((state) => setIsConnected(deriveIsConnected(state)));
      }
    }, 3000);

    // Also re-check whenever the app comes back to the foreground (e.g. connectivity was fixed
    // while the app was backgrounded).
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        NetInfo.fetch().then((state) => setIsConnected(deriveIsConnected(state)));
      }
    });

    return () => {
      unsubscribe();
      clearInterval(interval);
      appStateSub.remove();
    };
  }, []);

  return isConnected;
};
