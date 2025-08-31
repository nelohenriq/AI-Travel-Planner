
import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';

const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useTranslation();

  return (
    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-full">
      {(['en', 'pt', 'fr'] as const).map((lang) => (
        <button
          key={lang}
          onClick={() => setLanguage(lang)}
          className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 dark:focus:ring-offset-slate-800 ${
            language === lang
              ? 'bg-white dark:bg-slate-900 text-cyan-700 dark:text-cyan-400 shadow'
              : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-900/20'
          }`}
          aria-current={language === lang ? 'page' : undefined}
          lang={lang}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export default LanguageToggle;
