import { useSyncExternalStore } from 'react';
import { getIsOffline, subscribeOffline } from '../services/offlineStatus';

// Thin React wrapper around offlineStatus.js's external store - no polling here, the store is
// only ever updated by real request outcomes (api.js) or a manual refresh (OfflineBanner).
export const useIsOffline = () => useSyncExternalStore(subscribeOffline, getIsOffline);
