import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from '@/locales/en/translation.json';
import arCommon from '@/locales/ar/translation.json';

// In a real app, you might want to use a backend loader to load these asynchronously
// but for this size, bundling them is fine.

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enCommon,
      },
      ar: {
        translation: arCommon,
      },
    },
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
