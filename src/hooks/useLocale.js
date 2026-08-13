import React, { createContext, useCallback, useContext, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';

const LOCALE_STORAGE_KEY = 'appLocale';

// Restores a previously-picked language over i18n's device-locale default (src/i18n/index.js).
// Awaited in App.tsx before the first render of LocaleProvider, so its initial state already
// reflects the stored choice instead of flashing the device language for a frame.
export const loadStoredLocale = async () => {
  try {
    const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'de' || stored === 'en') {
      i18n.locale = stored;
    }
  } catch (error) {
    // keep whatever i18n.locale already defaulted to (device locale), non-fatal
  }
  return i18n.locale;
};

const LocaleContext = createContext({ locale: i18n.locale, setLocale: () => {} });

// i18n.locale is a plain mutable property (i18n-js), not React state — mutating it alone doesn't
// re-render anything. This context is the single shared source of truth so every consumer (e.g.
// AppShell's `key={locale}` remount in App.tsx) reacts to a change made from anywhere, instead of
// each screen tracking its own out-of-sync copy.
export const LocaleProvider = ({ children }) => {
  const [locale, setLocaleState] = useState(i18n.locale);

  const setLocale = useCallback((newLocale) => {
    i18n.locale = newLocale;
    setLocaleState(newLocale);
    AsyncStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => useContext(LocaleContext);
