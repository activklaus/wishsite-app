import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import de from './locales/de.json';

const i18n = new I18n({
  en,
  de,
});

i18n.locale = Localization.getLocales()[0].languageCode;
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export default i18n;