import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';

export type Language = 'en' | 'pt' | 'fr';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, replacements?: Record<string, string>) => string;
  isLoaded: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// In-memory cache for translations
const loadedTranslations: Record<string, any> = {};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const savedLang = localStorage.getItem('language');
    return (savedLang && ['en', 'pt', 'fr'].includes(savedLang)) ? savedLang as Language : 'en';
  });
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchTranslations = async () => {
      // Use cache if available to prevent re-fetching
      if (Object.keys(loadedTranslations).length > 0) {
        setTranslations(loadedTranslations);
        setIsLoaded(true);
        return;
      }
      try {
        const [en, pt, fr] = await Promise.all([
          // Paths are relative to the index.html file
          fetch('./locales/en.json').then(res => res.json()),
          fetch('./locales/pt.json').then(res => res.json()),
          fetch('./locales/fr.json').then(res => res.json()),
        ]);
        loadedTranslations.en = en;
        loadedTranslations.pt = pt;
        loadedTranslations.fr = fr;
        setTranslations(loadedTranslations);
      } catch (error) {
        console.error("Failed to load translation files:", error);
      } finally {
        setIsLoaded(true);
      }
    };

    fetchTranslations();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('language', language);
      document.documentElement.lang = language;
    }
  }, [language, isLoaded]);

  const t = useCallback((key: string, replacements?: Record<string, string>): string => {
    if (!isLoaded) return ''; // Return empty string or key while loading

    let translation = translations[language]?.[key] || translations['en']?.[key] || key;

    if (replacements) {
      Object.keys(replacements).forEach(placeholder => {
        translation = translation.replace(new RegExp(`{{${placeholder}}}`, 'g'), replacements[placeholder]);
      });
    }
    return translation;
  }, [language, translations, isLoaded]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isLoaded }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};