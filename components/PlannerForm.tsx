
import React, { useState, useMemo, useRef } from 'react';
import { TripPreferences, AIProvider, AIProviderConfig } from '../types';
import { INTEREST_OPTIONS, BUDGET_OPTIONS, GROUP_COMPOSITION_OPTIONS, EXPERIENCE_OPTIONS, ATTRACTION_TYPE_OPTIONS } from '../constants';
import AIProviderManager, { AIProviderManagerProps } from './AIProviderManager';
import { CalendarIcon } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';

interface PlannerFormProps {
  onPlanRequest: (request: { preferences: Omit<TripPreferences, 'language'>, providerConfig: AIProviderConfig, suggestDestination: boolean }) => void;
  isLoading: boolean;
  loadingText: string;
  providerState: AIProviderManagerProps['providerState'];
}

// --- Helper Functions and Constants ---
const getTodayString = () => {
    const today = new Date();
    today.setDate(today.getDate() + 1); // Start date from tomorrow
    return today.toISOString().split('T')[0];
};
const labelStyles = "block text-sm font-medium text-slate-600 dark:text-slate-300";
const inputStyles = "mt-1 block w-full bg-white text-slate-900 placeholder-slate-400 border-slate-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400 transition-colors duration-300 disabled:bg-slate-100 dark:disabled:bg-slate-700/50 disabled:cursor-not-allowed";

// --- Sub-Components ---
const DatePicker: React.FC<{ value: string; onChange: (value: string) => void; min: string; }> = ({ value, onChange, min }) => {
    const dateInputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="relative mt-1">
            <input
                id="start-date"
                ref={dateInputRef}
                type="date"
                name="startDate"
                value={value}
                onChange={e => onChange(e.target.value)}
                min={min}
                required
                className={`${inputStyles} mt-0 pr-10`}
            />
            <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 group focus:outline-none"
                onClick={() => dateInputRef.current?.showPicker()}
                aria-label="Open date picker"
                tabIndex={-1}
            >
                <CalendarIcon className="h-5 w-5 text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-300 transition-colors" />
            </button>
        </div>
    );
};


// --- Main Form Component ---

const PlannerForm: React.FC<PlannerFormProps> = ({ onPlanRequest, isLoading, loadingText, providerState }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Omit<TripPreferences, 'language'>>({
    origin: 'New York, USA',
    destination: 'Rome, Italy',
    duration: 5,
    startDate: getTodayString(),
    groupComposition: 'Family with kids',
    budget: 'Mid-Range',
    interests: ['History', 'Art & Culture', 'Food & Culinary'],
    accommodationStyle: 'Apartment rental',
    transportation: 'Public transport and walking',
    specialNeeds: '',
    experience: 'First-timer',
    attractionType: 'A mix of both',
  });
  const [suggestDestination, setSuggestDestination] = useState(false);

  const { provider, groqApiKey, ollamaUrl, ollamaModel } = providerState;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value,
    }));
  };

  const handleInterestChange = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const isProviderConfigured = useMemo(() => {
    if (provider === 'gemini') return !!process.env.API_KEY;
    if (provider === 'groq') return !!groqApiKey; // Simple check, button provides richer status
    if (provider === 'ollama') return !!ollamaUrl && !!ollamaModel;
    return false;
  }, [provider, groqApiKey, ollamaUrl, ollamaModel]);

  const canSubmit = useMemo(() => {
    return formData.origin && (formData.destination || suggestDestination) && formData.duration > 0 && formData.interests.length > 0 && isProviderConfigured;
  }, [formData, isProviderConfigured, suggestDestination]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isLoading) return;
    onPlanRequest({ 
        preferences: formData, 
        providerConfig: { provider, groqApiKey, ollamaUrl, ollamaModel },
        suggestDestination: suggestDestination
    });
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg sticky top-28 transition-colors duration-300">
      <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">{t('yourTripDetails')}</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <AIProviderManager providerState={providerState} />

        <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
            <fieldset>
                <legend className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">{t('coreDetails')}</legend>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="origin" className={labelStyles}>{t('origin')}</label>
                        <input id="origin" name="origin" type="text" value={formData.origin} onChange={handleChange} required className={inputStyles} placeholder={t('originPlaceholder')}/>
                    </div>
                    <div>
                        <label htmlFor="destination" className={labelStyles}>{t('destination')}</label>
                        <input id="destination" name="destination" type="text" value={formData.destination} onChange={handleChange} required={!suggestDestination} className={inputStyles} disabled={suggestDestination} />
                    </div>
                    <div className="mt-2">
                        <label className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input type="checkbox" checked={suggestDestination} onChange={(e) => setSuggestDestination(e.target.checked)} className="rounded text-cyan-600 focus:ring-cyan-500 dark:text-cyan-400 dark:bg-slate-600 dark:border-slate-500 transition-colors duration-300"/>
                            <span>{t('suggestDestinationLabel')}</span>
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="duration" className={labelStyles}>{t('duration')}</label>
                            <input id="duration" name="duration" type="number" value={formData.duration} onChange={handleChange} min="1" required className={inputStyles} />
                        </div>
                        <div>
                            <label htmlFor="start-date" className={labelStyles}>{t('startDate')}</label>
                            <DatePicker value={formData.startDate} onChange={date => setFormData(p => ({ ...p, startDate: date }))} min={getTodayString()} />
                        </div>
                    </div>
                </div>
            </fieldset>
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
            <fieldset>
                <legend className={labelStyles}>{t('interests')}</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                    {INTEREST_OPTIONS.map(interest => (
                    <label key={interest} className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300">
                        <input type="checkbox" checked={formData.interests.includes(interest)} onChange={() => handleInterestChange(interest)} className="rounded text-cyan-600 focus:ring-cyan-500 dark:text-cyan-400 dark:bg-slate-600 dark:border-slate-500 transition-colors duration-300"/>
                        <span>{t(`interest_${interest}`)}</span>
                    </label>
                    ))}
                </div>
            </fieldset>
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
            <fieldset>
                <legend className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">{t('optionalPreferences')}</legend>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="budget" className={labelStyles}>{t('budget')}</label>
                            <select id="budget" name="budget" value={formData.budget} onChange={handleChange} className={inputStyles}>
                                {BUDGET_OPTIONS.map(opt => <option key={opt} value={opt}>{t(`budget_${opt}`)}</option>)}
                            </select>
                        </div>
                        <div>
                          <label htmlFor="groupComposition" className={labelStyles}>{t('groupComposition')}</label>
                          <select id="groupComposition" name="groupComposition" value={formData.groupComposition} onChange={handleChange} className={inputStyles}>
                              {GROUP_COMPOSITION_OPTIONS.map(opt => <option key={opt} value={opt}>{t(`group_${opt}`)}</option>)}
                          </select>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="accommodationStyle" className={labelStyles}>{t('accommodationStyle')}</label>
                        <input id="accommodationStyle" name="accommodationStyle" type="text" value={formData.accommodationStyle} onChange={handleChange} placeholder={t('accommodationStylePlaceholder')} className={inputStyles} />
                    </div>
                    <div>
                        <label htmlFor="specialNeeds" className={labelStyles}>{t('specialNeeds')}</label>
                        <input id="specialNeeds" name="specialNeeds" type="text" value={formData.specialNeeds} onChange={handleChange} placeholder={t('specialNeedsPlaceholder')} className={inputStyles} />
                    </div>
                </div>
            </fieldset>
        </div>
        
        <button type="submit" disabled={isLoading || !canSubmit} className="w-full bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-cyan-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed dark:disabled:bg-slate-600 flex items-center justify-center">
            {isLoading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {loadingText || t('generating')}
                </>
            ) : t('generateItinerary')}
        </button>
      </form>
    </div>
  );
};

export default PlannerForm;
