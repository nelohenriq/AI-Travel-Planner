

import React, { useState } from 'react';
import { ItineraryPlan, TripPreferences, FlightInfo, CostEstimation, AccommodationExample } from '../types';
import DailyPlanCard from './DailyPlanCard';
import { PlaneIcon, BedIcon, InfoIcon, CurrencyDollarIcon, DownloadIcon, MailIcon, MapPinIcon, ExternalLinkIcon } from '../constants';

interface ItineraryDisplayProps {
  itinerary: ItineraryPlan | null;
  isLoading: boolean;
  error: string | null;
  preferences: TripPreferences | null;
}

const formatItineraryForDownload = (plan: ItineraryPlan): string => {
  let content = `AI Travel Plan: ${plan.tripTitle || 'N/A'}\n`;
  content += `========================================\n\n`;
  content += `OVERVIEW\n${plan.tripOverview || 'N/A'}\n\n`;

  if (plan.costEstimation) {
    content += `ESTIMATED COSTS\n`;
    content += `- Accommodation: ${plan.costEstimation.accommodation || 'N/A'}\n`;
    content += `- Activities: ${plan.costEstimation.activities || 'N/A'}\n`;
    content += `- Food: ${plan.costEstimation.food || 'N/A'}\n`;
    content += `- TOTAL: ${plan.costEstimation.total || 'N/A'}\n\n`;
  }
  
  if (plan.flightInfo) {
    content += `FLIGHT SUGGESTIONS\n`;
    (plan.flightInfo.suggestions || []).forEach(s => {
      content += `- ${s.airline || 'N/A'} (${s.priceRange || 'N/A'}): ${s.notes || 'N/A'}\n`;
    });
    if (plan.flightInfo.googleFlightsUrl) {
      content += `Search on Google Flights: ${plan.flightInfo.googleFlightsUrl}\n\n`;
    }
  }

  if (plan.accommodation) {
    content += `ACCOMMODATION\n${plan.accommodation.recommendations || 'N/A'}\n`;
    if (plan.accommodation.examples && plan.accommodation.examples.length > 0) {
        content += 'Examples:\n';
        plan.accommodation.examples.forEach(ex => {
            content += `- ${ex.name} (${ex.priceRange})\n`;
        });
    }
    content += '\n';
  }
  
  if (plan.generalTips) {
    content += `GENERAL TIPS\n`;
    content += `- Transit: ${plan.generalTips.transit || 'N/A'}\n`;
    content += `- Weather: ${plan.generalTips.weather || 'N/A'}\n`;
    content += `- Customs: ${plan.generalTips.customs || 'N/A'}\n`;
    content += `- Advice: ${plan.generalTips.practicalAdvice || 'N/A'}\n\n`;
  }

  content += `DAILY ITINERARY\n----------------\n\n`;
  (plan.dailyItineraries || []).forEach(day => {
    content += `** DAY ${day.day}: ${day.title || 'N/A'} (${day.date || 'N/A'}) **\n\n`;
    content += `Activities:\n`;
    (day.activities || []).forEach(act => {
      content += `- ${act.time || 'N/A'}: ${act.description || 'N/A'}`;
      if (act.details) content += `\n  ${act.details}`;
      content += `\n`;
    });
    content += `\nDining:\n`;
    (day.food || []).forEach(food => {
      content += `- ${food.meal || 'N/A'}: ${food.suggestion || 'N/A'}`;
      if (food.notes) content += `\n  ${food.notes}`;
      if (food.link) content += `\n  Link: ${food.link}`;
      content += `\n`;
    });
    content += `\nInsider Tip: ${day.insiderTip || 'N/A'}\n\n----------------\n\n`;
  });

  return content;
};


const LoadingSkeleton: React.FC = () => (
    <div className="animate-pulse space-y-6">
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-md w-3/4 transition-colors duration-300"></div>
        <div className="space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full transition-colors duration-300"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6 transition-colors duration-300"></div>
        </div>
        <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded-lg transition-colors duration-300"></div>
        <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded-lg transition-colors duration-300"></div>
        <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded-lg transition-colors duration-300"></div>
    </div>
);

const FlightInfoDisplay: React.FC<{ flightInfo: FlightInfo }> = ({ flightInfo }) => (
  <section className="mb-8">
    <div className="bg-slate-50 dark:bg-slate-700/50 p-4 sm:p-6 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors duration-300">
      <h3 className="font-bold text-xl flex items-center gap-2 text-slate-800 dark:text-slate-100">
        <PlaneIcon className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
        Flight Suggestions
      </h3>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(flightInfo.suggestions || []).map((flight, index) => (
          <div key={index} className="bg-white dark:bg-slate-800 p-4 rounded-md shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="font-semibold text-slate-900 dark:text-slate-100">{flight.airline}</p>
            <p className="text-cyan-600 dark:text-cyan-400 font-bold text-lg">{flight.priceRange}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{flight.notes}</p>
          </div>
        ))}
      </div>
      {flightInfo.googleFlightsUrl && (
        <div className="mt-6 text-center">
          <a 
            href={flightInfo.googleFlightsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search on Google Flights
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Prices are estimates and subject to change.</p>
        </div>
      )}
    </div>
  </section>
);

const CostEstimationDisplay: React.FC<{ cost: CostEstimation }> = ({ cost }) => (
    <section className="mb-8">
        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 sm:p-6 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors duration-300">
            <h3 className="font-bold text-xl flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <CurrencyDollarIcon className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                Estimated Trip Costs
            </h3>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-md shadow-sm">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Accommodation</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{cost.accommodation || 'N/A'}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-md shadow-sm">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Activities</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{cost.activities || 'N/A'}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-md shadow-sm">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Food</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{cost.food || 'N/A'}</p>
                </div>
                <div className="bg-cyan-50 dark:bg-cyan-900/50 p-4 rounded-md shadow-sm border-2 border-cyan-500">
                    <p className="text-sm font-medium text-cyan-800 dark:text-cyan-200">Total Estimate</p>
                    <p className="text-2xl font-extrabold text-cyan-900 dark:text-white">{cost.total || 'N/A'}</p>
                </div>
            </div>
        </div>
    </section>
);

const AccommodationExampleItem: React.FC<{ example: AccommodationExample; destination: string; }> = ({ example, destination }) => {
    const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${example.name}, ${destination}`)}`;
    const webSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${example.name} ${destination}`)}`;

    return (
        <div className="bg-white dark:bg-slate-800 p-3 rounded-md shadow-sm transition-colors duration-300 flex justify-between items-start gap-2 border border-slate-200 dark:border-slate-700">
            <div className="flex-grow">
                <p className="font-semibold text-slate-800 dark:text-slate-100">{example.name}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{example.priceRange}</p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-1">
                 <a
                    href={webSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:bg-slate-200 dark:focus:bg-slate-600"
                    aria-label={`Search for ${example.name}`}
                    title={`Search for ${example.name}`}
                >
                    <ExternalLinkIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                </a>
                <a
                    href={googleMapsSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:bg-slate-200 dark:focus:bg-slate-600"
                    aria-label={`Find ${example.name} on Google Maps`}
                    title={`Find ${example.name} on Google Maps`}
                >
                    <MapPinIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </a>
            </div>
        </div>
    );
}

const ItineraryDisplay: React.FC<ItineraryDisplayProps> = ({ itinerary, isLoading, error, preferences }) => {
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleDownload = () => {
    if (!itinerary) return;
    const content = formatItineraryForDownload(itinerary);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(itinerary.tripTitle || 'trip').replace(/ /g, '_')}_itinerary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setEmailStatus('sending');
    // NOTE: This is a mock. In a real app, you would send the 'email' and 
    // 'formatItineraryForDownload(itinerary)' content to a backend service.
    setTimeout(() => {
      console.log(`(Mock) Emailing plan to: ${email}`);
      setEmailStatus('sent');
      setTimeout(() => setEmailStatus('idle'), 4000);
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-lg shadow-lg transition-colors duration-300">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Crafting your adventure from {preferences?.origin || 'your home base'} to {preferences?.destination || 'your destination'}...</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">Our AI is exploring the best spots just for you. This might take a moment.</p>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg text-center transition-colors duration-300">
        <h3 className="text-xl font-bold text-red-600">Oops! Something went wrong.</h3>
        <p className="text-slate-600 dark:text-slate-400 mt-2">{error}</p>
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg text-center h-full flex flex-col justify-center items-center transition-colors duration-300">
        <PlaneIcon className="h-16 w-16 text-slate-300 dark:text-slate-600 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Your Personalized Itinerary Awaits</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2 max-w-md">Fill in your travel details on the left, and our AI will generate a custom travel plan just for you!</p>
      </div>
    );
  }

  const { tripTitle, tripOverview, accommodation, generalTips, dailyItineraries, flightInfo, sources, costEstimation } = itinerary;

  return (
    <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-lg shadow-lg transition-colors duration-300">
      <header className="mb-6 border-b border-slate-200 dark:border-slate-700 pb-6 transition-colors duration-300">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">{tripTitle}</h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">{tripOverview}</p>
      </header>
      
      <section className="mb-8 p-4 bg-slate-100 dark:bg-slate-900/50 rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
                 <button onClick={handleDownload} className="inline-flex items-center gap-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold py-2 px-4 rounded-md transition-colors">
                    <DownloadIcon className="h-5 w-5" />
                    Download
                </button>
            </div>
            <form onSubmit={handleEmailSubmit} className="flex items-center gap-2 flex-wrap">
                 <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter email to send plan..."
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 py-2 px-3 text-sm transition-colors"
                    disabled={emailStatus !== 'idle'}
                 />
                 <button type="submit" className="inline-flex items-center gap-2 bg-cyan-600 text-white font-bold py-2 px-4 rounded-md hover:bg-cyan-700 disabled:bg-slate-400 transition-colors" disabled={emailStatus !== 'idle' || !email}>
                    <MailIcon className="h-5 w-5" />
                    {emailStatus === 'sending' ? 'Sending...' : emailStatus === 'sent' ? 'Sent!' : 'Email Plan'}
                </button>
            </form>
        </div>
        {emailStatus === 'sent' && <p className="text-xs text-green-600 dark:text-green-400 mt-2 text-right">Done! Your itinerary has been sent (mock).</p>}
      </section>

      {costEstimation && <CostEstimationDisplay cost={costEstimation} />}
      {flightInfo && <FlightInfoDisplay flightInfo={flightInfo} />}

      <section className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors duration-300">
            <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800 dark:text-slate-100"><BedIcon className="h-6 w-6 text-cyan-600 dark:text-cyan-400"/> Accommodation</h3>
            <p className="text-slate-700 dark:text-slate-300 mt-2">{accommodation?.recommendations}</p>
            {accommodation?.examples && accommodation.examples.length > 0 && preferences && (
              <div className="mt-3 space-y-2">
                <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400">Examples:</h4>
                <div className="space-y-2">
                    {accommodation.examples.map((ex, index) => (
                        <AccommodationExampleItem key={index} example={ex} destination={preferences.destination} />
                    ))}
                </div>
              </div>
            )}
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors duration-300">
            <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800 dark:text-slate-100"><InfoIcon className="h-6 w-6 text-cyan-600 dark:text-cyan-400"/> General Tips</h3>
            <ul className="list-disc list-inside mt-2 text-slate-700 dark:text-slate-300 space-y-1">
                <li><strong>Transit:</strong> {generalTips?.transit}</li>
                <li><strong>Weather:</strong> {generalTips?.weather}</li>
                <li><strong>Customs:</strong> {generalTips?.customs}</li>
                <li><strong>Advice:</strong> {generalTips?.practicalAdvice}</li>
            </ul>
        </div>
      </section>

      <div className="space-y-8">
        {preferences && (dailyItineraries || []).map(dayPlan => (
          <DailyPlanCard key={dayPlan.day} dayPlan={dayPlan} destination={preferences.destination} />
        ))}
      </div>
      
      {sources && sources.length > 0 && (
        <footer className="mt-12 pt-4 border-t border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400">Information Sources</h4>
          <ul className="mt-2 text-xs text-slate-500 dark:text-slate-500 list-disc list-inside space-y-1">
            {sources.map((source, index) => (
              <li key={index}>
                <a href={source.uri} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-600 dark:hover:text-cyan-400 underline transition-colors">
                  {source.title}
                </a>
              </li>
            ))}
          </ul>
        </footer>
      )}
    </div>
  );
};

export default ItineraryDisplay;