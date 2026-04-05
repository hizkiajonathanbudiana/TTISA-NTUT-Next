'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import enTranslations from '@/locales/en/translation.json';
import zhHantTranslations from '@/locales/zh-HANT/translation.json';

type Language = 'en' | 'zh-HANT';

type TranslationTree = typeof enTranslations;

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
};

const TRANSLATIONS: Record<Language, TranslationTree> = {
  en: enTranslations,
  'zh-HANT': zhHantTranslations,
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = 'ttisa-language';

const readStoredLanguage = (): Language => {
  if (typeof window === 'undefined') {
    return 'en';
  }
  const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
  return stored === 'zh-HANT' ? 'zh-HANT' : 'en';
};

const getNestedTranslation = (language: Language, key: string): unknown => {
  const segments = key.split('.');
  let result: unknown = TRANSLATIONS[language];
  for (const segment of segments) {
    if (typeof result !== 'object' || result === null) {
      return undefined;
    }
    result = (result as Record<string, unknown>)[segment];
  }
  return result;
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language === 'zh-HANT' ? 'zh-Hant' : 'en';
    }
  }, [language]);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, nextLanguage);
    }
  }, []);

  const translate = useCallback(
    (key: string): string => {
      const result = getNestedTranslation(language, key);
      return typeof result === 'string' ? result : key;
    },
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t: translate }), [language, setLanguage, translate]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
