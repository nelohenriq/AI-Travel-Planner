
import React, { useState, useEffect } from 'react';
import { AIProvider } from '../types';
import { fetchOllamaModels, testGroqConnection } from '../services/aiService';
import { useTranslation } from '../contexts/LanguageContext';

type ConnectionStatus = 'idle' | 'testing' | 'ok' | 'error';

export interface AIProviderManagerProps {
  providerState: {
    provider: AIProvider;
    setProvider: (p: AIProvider) => void;
    groqApiKey: string;
    setGroqApiKey: (k: string) => void;
    ollamaUrl: string;
    setOllamaUrl: (u: string) => void;
    ollamaModel: string;
    setOllamaModel: (m: string) => void;
  }
}

const labelStyles = "block text-sm font-medium text-slate-600 dark:text-slate-300";
const inputStyles = "mt-1 block w-full bg-white text-slate-900 placeholder-slate-400 border-slate-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400 transition-colors duration-300 disabled:bg-slate-100 dark:disabled:bg-slate-700/50 disabled:cursor-not-allowed";

const AIProviderManager: React.FC<AIProviderManagerProps> = ({ providerState }) => {
    const { provider, setProvider, groqApiKey, setGroqApiKey, ollamaUrl, setOllamaUrl, ollamaModel, setOllamaModel } = providerState;
    const { t } = useTranslation();

    const [groqStatus, setGroqStatus] = useState<ConnectionStatus>('idle');
    const [ollamaStatus, setOllamaStatus] = useState<ConnectionStatus>('idle');
    const [availableOllamaModels, setAvailableOllamaModels] = useState<string[]>([]);
    
    useEffect(() => {
        if (groqApiKey) testGroqConnection(groqApiKey).then(ok => setGroqStatus(ok ? 'ok' : 'idle'));
    }, []);

    const handleTestGroq = async () => {
        setGroqStatus('testing');
        const ok = await testGroqConnection(groqApiKey);
        setGroqStatus(ok ? 'ok' : 'error');
    };
    
    const handleCheckOllama = async () => {
        setOllamaStatus('testing');
        setAvailableOllamaModels([]);
        const models = await fetchOllamaModels(ollamaUrl);
        if (models.length > 0) {
            setAvailableOllamaModels(models);
            if (!ollamaModel || !models.includes(ollamaModel)) {
                setOllamaModel(models[0]);
            }
            setOllamaStatus('ok');
        } else {
            setOllamaStatus('error');
        }
    };

    return (
      <fieldset>
        <legend className="sr-only">{t('aiProvider')}</legend>
        <label className={labelStyles}>{t('aiProvider')}</label>
        <div className="mt-2 rounded-lg p-1 bg-slate-200 dark:bg-slate-700 grid grid-cols-3 gap-1 transition-colors duration-300">
            { (['gemini', 'groq', 'ollama'] as AIProvider[]).map(p => (
              <button type="button" key={p} onClick={() => setProvider(p)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
                  provider === p ? 'bg-white dark:bg-slate-900 text-cyan-700 dark:text-cyan-400 shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-900/20'
                }`}
              >{p.charAt(0).toUpperCase() + p.slice(1)}</button>
            ))}
        </div>
        <div className="mt-3 space-y-3">
            {provider === 'gemini' && <p className="text-xs text-slate-500 dark:text-slate-400">{t('geminiDescription')}</p>}
            {provider === 'groq' && (
              <div className="space-y-2">
                <label htmlFor="groq-key" className={labelStyles}>{t('groqApiKey')}</label>
                <div className="flex gap-2">
                  <input id="groq-key" type="password" value={groqApiKey} onChange={e => setGroqApiKey(e.target.value)} placeholder="gsk_..." className={inputStyles + " mt-0"} />
                  <button type="button" onClick={handleTestGroq} disabled={!groqApiKey || groqStatus === 'testing'} className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50">
                    {groqStatus === 'testing' ? '...' : t('testConnection')}
                  </button>
                </div>
                {groqStatus === 'ok' && <p className="text-xs text-green-600 dark:text-green-400">{t('connectionSuccessful')}</p>}
                {groqStatus === 'error' && <p className="text-xs text-red-600 dark:text-red-400">{t('connectionFailed')}</p>}
              </div>
            )}
            {provider === 'ollama' && (
              <div className="space-y-2">
                <label htmlFor="ollama-url" className={labelStyles}>{t('ollamaServerUrl')}</label>
                <div className="flex gap-2">
                  <input id="ollama-url" type="text" value={ollamaUrl} onChange={e => setOllamaUrl(e.target.value)} className={inputStyles + " mt-0"} />
                  <button type="button" onClick={handleCheckOllama} disabled={!ollamaUrl || ollamaStatus === 'testing'} className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50">
                    {ollamaStatus === 'testing' ? '...' : t('checkConnection')}
                  </button>
                </div>
                {ollamaStatus === 'ok' && (
                   <div>
                    <label htmlFor="ollama-model" className={labelStyles}>{t('ollamaModel')}</label>
                    <select id="ollama-model" value={ollamaModel} onChange={e => setOllamaModel(e.target.value)} className={inputStyles}>
                        {availableOllamaModels.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                   </div>
                )}
                {ollamaStatus === 'error' && <p className="text-xs text-red-600 dark:text-red-400">{t('connectionFailedOllama')}</p>}
              </div>
            )}
        </div>
      </fieldset>
    );
};

export default AIProviderManager;
