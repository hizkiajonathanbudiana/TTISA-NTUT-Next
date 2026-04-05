'use client';

import { useTranslation } from '@/providers/LanguageProvider';

export const LanguageSwitcher = () => {
  const { language, setLanguage } = useTranslation();

  return (
    <div className="flex items-center rounded-full border border-border bg-white/90 p-1 text-sm font-semibold shadow-sm outline-none ring-0">
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`appearance-none rounded-full border-0 px-3 py-1 outline-none ring-0 transition-colors focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${language === 'en' ? 'bg-primary text-white shadow' : 'text-text-secondary hover:bg-neutral-100'}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('zh-HANT')}
        className={`appearance-none rounded-full border-0 px-3 py-1 outline-none ring-0 transition-colors focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${language === 'zh-HANT' ? 'bg-primary text-white shadow' : 'text-text-secondary hover:bg-neutral-100'}`}
      >
        繁
      </button>
    </div>
  );
};
