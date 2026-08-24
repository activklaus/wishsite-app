import { useSyncExternalStore } from 'react';
import { getIsLoading, subscribeLoading } from '../services/loadingStatus';

// Thin React wrapper around loadingStatus.js's external store, same shape as useNetworkStatus.js.
export const useIsLoading = () => useSyncExternalStore(subscribeLoading, getIsLoading);
