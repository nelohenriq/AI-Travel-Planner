
import React, { useState } from 'react';
import { useTranslation } from '../contexts/LanguageContext';

interface ItineraryEditorProps {
    onModify: (modificationRequest: string) => Promise<void>;
    isUpdating: boolean;
}

const ItineraryEditor: React.FC<ItineraryEditorProps> = ({ onModify, isUpdating }) => {
    const { t } = useTranslation();
    const [request, setRequest] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!request.trim() || isUpdating) return;
        onModify(request.trim());
        setRequest('');
    };

    return (
        <div className="mt-8 bg-slate-50 dark:bg-slate-700/50 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 mb-3">{t('refinePlanTitle')}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
                <textarea
                    value={request}
                    onChange={(e) => setRequest(e.target.value)}
                    placeholder={t('refinePlanPlaceholder')}
                    required
                    rows={3}
                    className="block w-full bg-white text-slate-900 placeholder-slate-400 border-slate-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white dark:placeholder-slate-400 transition-colors duration-300 disabled:opacity-60"
                    disabled={isUpdating}
                />
                <button 
                    type="submit" 
                    disabled={isUpdating || !request.trim()} 
                    className="w-full sm:w-auto px-6 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed dark:disabled:bg-slate-600 flex items-center justify-center"
                >
                    {isUpdating ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {t('refinePlanButtonUpdating')}
                        </>
                    ) : t('refinePlanButton')}
                </button>
            </form>
        </div>
    );
};

export default ItineraryEditor;
