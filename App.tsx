import React, { useState, useCallback, useEffect } from 'react';
import { TripPreferences, ItineraryPlan, AIProvider, AIProviderConfig } from './types';
import { generateItinerary } from './services/aiService';
import PlannerForm from './components/PlannerForm';
import ItineraryDisplay from './components/ItineraryDisplay';
import ThemeToggle from './components/ThemeToggle';
import { PlaneIcon } from './constants';

const getDayWithSuffix = (day: number) => {
  if (day > 3 && day < 21) return `${day}th`;
  switch (day % 10) {
    case 1:  return `${day}st`;
    case 2:  return `${day}nd`;
    case 3:  return `${day}rd`;
    default: return `${day}th`;
  }
};

const App: React.FC = () => {
  const [preferences, setPreferences] = useState<TripPreferences | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryPlan | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Theme state
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  
  // AI Provider State
  const [provider, setProvider] = useState<AIProvider>(() => (localStorage.getItem('provider') as AIProvider) || 'gemini');
  const [groqApiKey, setGroqApiKey] = useState(() => localStorage.getItem('groqApiKey') || '');
  const [ollamaUrl, setOllamaUrl] = useState(() => localStorage.getItem('ollamaUrl') || 'http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState(() => localStorage.getItem('ollamaModel') || '');

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

  const handlePlanRequest = useCallback(async (prefs: TripPreferences, providerConfig: AIProviderConfig) => {
    setIsLoading(true);
    setError(null);
    setItinerary(null);
    setPreferences(prefs);
    try {
      const plan = await generateItinerary(prefs, providerConfig);
      
      // Post-process dates for consistency and correctness
      if (plan.dailyItineraries && Array.isArray(plan.dailyItineraries) && prefs.startDate) {
        // Create a date object from YYYY-MM-DD string, compensating for timezone offset
        const baseDateParts = prefs.startDate.split('-').map(Number);
        const baseDate = new Date(baseDateParts[0], baseDateParts[1] - 1, baseDateParts[2]);

        plan.dailyItineraries.forEach(dayPlan => {
          if (typeof dayPlan.day === 'number' && isFinite(dayPlan.day)) {
            const currentDate = new Date(baseDate);
            currentDate.setDate(baseDate.getDate() + dayPlan.day - 1);
            const travelMonth = currentDate.toLocaleString('default', { month: 'long' });
            const travelDay = currentDate.getDate();
            dayPlan.date = `${travelMonth} ${getDayWithSuffix(travelDay)}`;
          }
        });
      }

      setItinerary(plan);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate itinerary. Please check your inputs or API provider settings.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const providerState = {
    provider, setProvider,
    groqApiKey, setGroqApiKey,
    ollamaUrl, setOllamaUrl,
    ollamaModel, setOllamaModel
  }

  return (
    <div className="bg-slate-100 dark:bg-slate-900 min-h-screen text-slate-800 dark:text-slate-200 transition-colors duration-300">
      <header className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-10 transition-colors duration-300">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <PlaneIcon className="h-8 w-8 text-cyan-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              AI Travel Planner
            </h1>
          </div>
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 xl:col-span-3">
            <PlannerForm onPlanRequest={handlePlanRequest} isLoading={isLoading} providerState={providerState} />
          </div>
          <div className="lg:col-span-8 xl:col-span-9">
            <ItineraryDisplay 
              itinerary={itinerary} 
              isLoading={isLoading} 
              error={error} 
              preferences={preferences}
            />
          </div>
        </div>
      </main>
      <footer className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
        <p>Powered by Google Gemini, Groq, and Ollama. Your personalized journey awaits.</p>
      </footer>
    </div>
  );
};

export default App;