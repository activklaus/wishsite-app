import { useEffect } from 'react';
import { useShareIntent } from 'expo-share-intent';

export const useShareHandler = (onShareReceived) => {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  useEffect(() => {
    if (!hasShareIntent) return;

    if (shareIntent.webUrl) {
      // meta.* comes from the share extension's JS preprocessor reading document.title and the
      // page's own <meta> tags in the shared page's own context (see expo-share-intent's
      // ShareExtensionPreprocessor) - the actual page metadata, not anything we derive ourselves.
      // Deliberately NOT including price here: unlike title/description, price meta tags are
      // inconsistently present/formatted across sites, and the backend's own scrape already
      // does a much more careful job of it (see ShareFormScreen.js's fetchItemData).
      onShareReceived(shareIntent.webUrl, {
        title: shareIntent.meta?.title,
        description: shareIntent.meta?.['og:description'] || shareIntent.meta?.description,
      });
    }
    resetShareIntent();
    // Only re-run when a new share intent arrives (hasShareIntent flips false -> true) —
    // onShareReceived is a fresh closure every render in App.tsx and would otherwise loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShareIntent]);
};
