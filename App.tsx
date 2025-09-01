

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { TripPreferences, ItineraryPlan, AIProvider, AIProviderConfig, DailyItinerary } from './types';
import { generateItinerary, translateItinerary, suggestDestination, modifyItinerary } from './services/aiService';
import PlannerForm from './components/PlannerForm';
import ItineraryDisplay from './components/ItineraryDisplay';
import ThemeToggle from './components/ThemeToggle';
import LanguageToggle from './components/LanguageToggle';
import { useTranslation, Language } from './contexts/LanguageContext';
import { PlaneIcon } from './constants';

const getDayWithSuffix = (day: number, lang: string) => {
  if (lang !== 'en') return day; // Suffixes are English-specific
  if (day > 3 && day < 21) return `${day}th`;
  switch (day % 10) {
    case 1:  return `${day}st`;
    case 2:  return `${day}nd`;
    case 3:  return `${day}rd`;
    default: return `${day}th`;
  }
};

const localeMap: { [key: string]: string } = {
  en: 'en-US',
  pt: 'pt-PT',
  fr: 'fr-FR',
};

const App: React.FC = () => {
  const [preferences, setPreferences] = useState<TripPreferences | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryPlan | null>(null);
  const [baseItinerary, setBaseItinerary] = useState<ItineraryPlan | null>(null);
  const [translatedItineraries, setTranslatedItineraries] = useState<Record<string, ItineraryPlan>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const { t, language, isLoaded } = useTranslation();
  
  // Theme state
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  
  // AI Provider State
  const [provider, setProvider] = useState<AIProvider>(() => (localStorage.getItem('provider') as AIProvider) || 'gemini');
  const [groqApiKey, setGroqApiKey] = useState(() => localStorage.getItem('groqApiKey') || '');
  const [ollamaUrl, setOllamaUrl] = useState(() => localStorage.getItem('ollamaUrl') || 'http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState(() => localStorage.getItem('ollamaModel') || '');
  const [providerConfig, setProviderConfig] = useState<AIProviderConfig | null>(null);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  useEffect(() => { localStorage.setItem('provider', provider); }, [provider]);
  useEffect(() => { localStorage.setItem('groqApiKey', groqApiKey); }, [groqApiKey]);
  useEffect(() => { localStorage.setItem('ollamaUrl', ollamaUrl); }, [ollamaUrl]);
  useEffect(() => { localStorage.setItem('ollamaModel', ollamaModel); }, [ollamaModel]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };
  
  const displayedItinerary = useMemo(() => {
    if (!itinerary || !preferences?.startDate) return itinerary;

    const newItinerary = JSON.parse(JSON.stringify(itinerary));

    if (newItinerary.dailyItineraries && Array.isArray(newItinerary.dailyItineraries)) {
        const baseDateParts = preferences.startDate.split('-').map(Number);
        const baseDate = new Date(baseDateParts[0], baseDateParts[1] - 1, baseDateParts[2]);

        newItinerary.dailyItineraries.forEach((dayPlan: DailyItinerary) => {
            if (typeof dayPlan.day === 'number' && isFinite(dayPlan.day)) {
                const currentDate = new Date(baseDate);
                currentDate.setDate(baseDate.getDate() + dayPlan.day - 1);
                
                const travelMonth = currentDate.toLocaleString(localeMap[language] || 'en-US', { month: 'long' });
                const travelDay = currentDate.getDate();
                
                const formattedMonth = (language === 'pt' || language === 'fr') 
                    ? travelMonth.charAt(0).toUpperCase() + travelMonth.slice(1)
                    : travelMonth;

                dayPlan.date = `${formattedMonth} ${getDayWithSuffix(travelDay, language)}`;
            }
        });
    }
    return newItinerary;
  }, [itinerary, language, preferences?.startDate]);


  const handlePlanRequest = useCallback(async (request: { preferences: Omit<TripPreferences, 'language'>, providerConfig: AIProviderConfig, suggestDestination: boolean }) => {
    const { preferences: prefs, providerConfig: config, suggestDestination: shouldSuggest } = request;
    
    setIsLoading(true);
    setError(null);
    setItinerary(null);
    setBaseItinerary(null);
    setTranslatedItineraries({});
    setProviderConfig(config);
    
    try {
      let finalPrefs = { ...prefs };

      if (shouldSuggest) {
        setLoadingMessage(t('suggestingDestination'));
        const suggestion = await suggestDestination(prefs, config);
        finalPrefs.destination = suggestion.destination;
      }
      
      setLoadingMessage(t('generating'));
      const userPrefs: TripPreferences = { ...finalPrefs, language };
      setPreferences(userPrefs);

      const generationPrefs: TripPreferences = { ...finalPrefs, language: 'en' };
      const englishPlan = await generateItinerary(generationPrefs, config);
      
      // Set English plan immediately
      setBaseItinerary(englishPlan);
      setTranslatedItineraries({ en: englishPlan });
      setItinerary(englishPlan);
      setIsLoading(false);
      setLoadingMessage('');
      
      // Proactively translate to other languages in the background
      const otherLanguages: Language[] = ['pt', 'fr'];
      (async () => {
        try {
          const translations = await Promise.all(
            otherLanguages.map(lang => translateItinerary(englishPlan, lang, config))
          );
          setTranslatedItineraries(prev => ({
            ...prev,
            pt: translations[0],
            fr: translations[1],
          }));
        } catch (err) {
          console.warn("Background translation failed. On-demand translation will be used as a fallback.", err);
        }
      })();

    } catch (err: any) {
      console.error("Error during itinerary generation:", err);
      setError(err.message || 'Failed to generate itinerary. Please check your inputs or API provider settings.');
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [language, t]);

  const handleItineraryModification = useCallback(async (modificationRequest: string) => {
    if (!baseItinerary || !providerConfig) return;

    setIsUpdating(true);
    setError(null);

    try {
      // Step 1: Modify the base (English) itinerary
      const newEnglishPlan = await modifyItinerary(baseItinerary, modificationRequest, providerConfig);

      // Step 2: Update states, resetting existing translations and triggering proactive translation
      setBaseItinerary(newEnglishPlan);
      setTranslatedItineraries({ en: newEnglishPlan });

      if (language === 'en') {
        setItinerary(newEnglishPlan);
      } else {
        // Translate to current language to update UI
        const translatedPlan = await translateItinerary(newEnglishPlan, language, providerConfig);
        setItinerary(translatedPlan);
        setTranslatedItineraries(prev => ({ ...prev, [language]: translatedPlan }));
      }
      
      // Step 3: Proactively translate other languages in the background
      const otherLanguages = (['pt', 'fr'] as Language[]).filter(l => l !== language);
      (async () => {
        try {
          const translations = await Promise.all(
            otherLanguages.map(lang => translateItinerary(newEnglishPlan, lang, providerConfig))
          );
          setTranslatedItineraries(prev => {
            const newCache = { ...prev };
            otherLanguages.forEach((lang, index) => {
              newCache[lang] = translations[index];
            });
            return newCache;
          });
        } catch(err) {
            console.warn("Background re-translation failed. On-demand will be used as fallback.", err);
        }
      })();

    } catch (err: any) {
      console.error("Error during itinerary modification:", err);
      setError(err.message || 'Failed to modify the itinerary. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  }, [baseItinerary, providerConfig, language]);
  
  // Effect to handle on-demand translation when language changes
  useEffect(() => {
    // If a plan exists but we don't have a translation for the current language
    if (baseItinerary && !translatedItineraries[language] && providerConfig) {
      const translateOnDemand = async () => {
        setIsTranslating(true);
        setError(null);
        try {
          const translatedPlan = await translateItinerary(baseItinerary, language, providerConfig);
          setTranslatedItineraries(prev => ({ ...prev, [language]: translatedPlan }));
          setItinerary(translatedPlan);
        } catch (err: any) {
          console.error(`Failed to translate on-demand to ${language}:`, err);
          setError(err.message || `Failed to load translation for ${language}. Displaying original version.`);
          // Fallback to the base itinerary if translation fails
          setItinerary(baseItinerary);
        } finally {
          setIsTranslating(false);
        }
      };
      translateOnDemand();
    } else if (translatedItineraries[language]) {
      // If we already have the translation, just switch to it
      setItinerary(translatedItineraries[language]);
    }
  }, [language, translatedItineraries, baseItinerary, providerConfig]);


  const providerState = {
    provider, setProvider,
    groqApiKey, setGroqApiKey,
    ollamaUrl, setOllamaUrl,
    ollamaModel, setOllamaModel
  }
  
  if (!isLoaded) {
    return (
      <div className="bg-slate-100 dark:bg-slate-900 min-h-screen flex items-center justify-center">
        <div className="text-xl text-slate-600 dark:text-slate-400">Loading languages...</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 dark:bg-slate-900 min-h-screen text-slate-800 dark:text-slate-200 transition-colors duration-300">
      <header className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-10 transition-colors duration-300">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <PlaneIcon className="h-8 w-8 text-cyan-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t('headerTitle')}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 xl:col-span-3">
            <PlannerForm onPlanRequest={handlePlanRequest} isLoading={isLoading} loadingText={loadingMessage} providerState={providerState} />
          </div>
          <div className="lg:col-span-8 xl:col-span-9">
            <ItineraryDisplay 
              itinerary={displayedItinerary} 
              isLoading={isLoading}
              isUpdating={isUpdating || isTranslating}
              error={error} 
              preferences={preferences}
              onModify={handleItineraryModification}
            />
          </div>
        </div>
      </main>
      <footer className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
        <p>{t('footerText')}</p>
      </footer>
    </div>
  );
};

export default App;