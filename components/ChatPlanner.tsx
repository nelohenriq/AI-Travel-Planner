
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { ItineraryPlan, TripPreferences, AIProviderConfig } from '../types';
import { sendChatMessage } from '../services/aiService';
import AIProviderManager, { AIProviderManagerProps } from './AIProviderManager';

interface ChatPlannerProps {
    onItineraryGenerated: (plan: ItineraryPlan, prefs: TripPreferences) => void;
    onGenerationError: (error: string) => void;
    providerState: AIProviderManagerProps['providerState'];
}

interface Message {
    role: 'user' | 'model';
    text: string;
}

const ChatPlanner: React.FC<ChatPlannerProps> = ({ onItineraryGenerated, onGenerationError, providerState }) => {
    const { t } = useTranslation();
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: t('chatWelcome') }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastModelMessageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Do not scroll on the initial "welcome" message.
        if (messages.length <= 1) {
            return;
        }

        const lastMessage = messages[messages.length - 1];
        // Use a small timeout to ensure the DOM has updated before scrolling
        setTimeout(() => {
            if (lastMessage?.role === 'model' && lastModelMessageRef.current) {
                // If the last message is from the AI, scroll to the start of its bubble
                lastModelMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else if (messagesEndRef.current) {
                // Otherwise (e.g., user message), scroll to the very bottom
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const newUserMessage: Message = { role: 'user', text: input };
        const newMessages = [...messages, newUserMessage];
        
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);
        onGenerationError('');

        const { provider, groqApiKey, ollamaUrl, ollamaModel } = providerState;
        const providerConfig: AIProviderConfig = { provider, groqApiKey, ollamaUrl, ollamaModel };

        try {
            const responseText = await sendChatMessage(newMessages, providerConfig);
            
            // Check if the response is the final JSON object
            const jsonMatch = responseText.match(/{\s*"preferences":\s*{[\s\S]*?},\s*"itinerary":\s*{[\s\S]*?}\s*}/);
            
            if (jsonMatch) {
                try {
                    const parsedData = JSON.parse(jsonMatch[0]);
                    if (parsedData.preferences && parsedData.itinerary) {
                        onItineraryGenerated(parsedData.itinerary, parsedData.preferences);
                        setMessages(prev => [...prev, { role: 'model', text: t('chatGenerating') }]);
                    } else {
                         throw new Error("Parsed JSON is missing 'preferences' or 'itinerary' key.");
                    }
                } catch (parseError) {
                    console.error("Failed to parse final JSON from chat:", parseError);
                    onGenerationError("The AI generated the plan, but there was an error reading it. You can try asking for it again.");
                    setMessages(prev => [...prev, { role: 'model', text: responseText }]);
                }
            } else {
                 setMessages(prev => [...prev, { role: 'model', text: responseText }]);
            }

        } catch (err: any) {
            console.error("Error during chat:", err);
            const errorMessage = err.message || "An unknown error occurred during chat.";
            onGenerationError(errorMessage);
            setMessages(prev => [...prev, { role: 'model', text: `Sorry, I encountered an error: ${errorMessage}` }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg flex flex-col h-[80vh] sticky top-28 transition-colors duration-300">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">{t('planner_chat')}</h2>
                <AIProviderManager providerState={providerState} />
            </div>
            <div className="flex-grow p-4 overflow-y-auto space-y-4">
                {messages.map((msg, index) => {
                    const isLastMessage = index === messages.length - 1;
                    return (
                        <div
                            key={index}
                            ref={isLastMessage && msg.role === 'model' ? lastModelMessageRef : null}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-xs md:max-w-md lg:max-w-xs xl:max-w-md px-4 py-2 rounded-xl ${
                                msg.role === 'user' 
                                    ? 'bg-cyan-600 text-white' 
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                            }`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                            </div>
                        </div>
                    );
                })}
                 {isLoading && (
                    <div className="flex justify-start">
                        <div className="max-w-xs px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700">
                            <div className="flex items-center justify-center space-x-1">
                                <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={t('chatPlaceholder')}
                        disabled={isLoading}
                        className="flex-grow bg-white text-slate-900 placeholder-slate-400 border-slate-300 rounded-full shadow-sm focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400 transition-colors duration-300 disabled:opacity-50 px-4 py-2"
                    />
                    <button type="submit" disabled={isLoading || !input.trim()} className="p-2 bg-cyan-600 text-white rounded-full hover:bg-cyan-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed dark:disabled:bg-slate-600 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatPlanner;
