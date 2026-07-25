import { useEffect } from 'react';
import { useShareIntent } from 'expo-share-intent';

export const useShareHandler = (onShareReceived) => {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  useEffect(() => {
    if (!hasShareIntent) return;

    if (shareIntent.webUrl) {
      onShareReceived(shareIntent.webUrl);
    }
    resetShareIntent();
    // Only re-run when a new share intent arrives (hasShareIntent flips false -> true) —
    // onShareReceived is a fresh closure every render in App.tsx and would otherwise loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShareIntent]);
};
