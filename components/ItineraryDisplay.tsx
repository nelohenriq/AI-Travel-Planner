import React, { useState, useRef } from 'react';
import { ItineraryPlan, TripPreferences, FlightInfo, CostEstimation, AccommodationExample } from '../types';
import DailyPlanCard from './DailyPlanCard';
import { PlaneIcon, BedIcon, InfoIcon, CurrencyDollarIcon, DownloadIcon, MailIcon, MapPinIcon, ExternalLinkIcon, BookingIcon } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


interface ItineraryDisplayProps {
  itinerary: ItineraryPlan | null;
  isLoading: boolean;
  error: string | null;
  preferences: TripPreferences | null;
}

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

const FlightInfoDisplay: React.FC<{ flightInfo: FlightInfo }> = ({ flightInfo }) => {
  const { t } = useTranslation();
  return (
    <section className="mb-8">
      <div className="bg-slate-50 dark:bg-slate-700/50 p-4 sm:p-6 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors duration-300">
        <h3 className="font-bold text-xl flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <PlaneIcon className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
          {t('flightSuggestions')}
        </h3>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(flightInfo.suggestions || []).map((flight, index) => (
            <div key={index} className="bg-white dark:bg-slate-800 p-4 rounded-md shadow-sm border border-slate-200 dark:border-slate-700">
              <p className="font-semibold text-slate-900 dark:text-slate-100">{flight.airline}</p>
              <p className="text-cyan-600 dark:text-cyan-400 font-bold text-lg">{flight.priceRange}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{flight.notes}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
            <a href={flightInfo.googleFlightsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                <ExternalLinkIcon className="h-5 w-5" />
                {t('searchGoogleFlights')}
            </a>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{t('pricesSubjectToChange')}</p>
        </div>
      </div>
    </section>
  );
};

const CostEstimationDisplay: React.FC<{ cost: CostEstimation }> = ({ cost }) => {
  const { t } = useTranslation();
  return (
    <section className="mb-8">
      <div className="bg-slate-50 dark:bg-slate-700/50 p-4 sm:p-6 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors duration-300">
        <h3 className="font-bold text-xl flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <CurrencyDollarIcon className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
          {t('estimatedCosts')}
        </h3>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('accommodation')}</p>
            <p className="font-bold text-lg text-slate-800 dark:text-slate-100">{cost.accommodation}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('activities')}</p>
            <p className="font-bold text-lg text-slate-800 dark:text-slate-100">{cost.activities}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('food')}</p>
            <p className="font-bold text-lg text-slate-800 dark:text-slate-100">{cost.food}</p>
          </div>
          <div className="bg-slate-200 dark:bg-slate-600 rounded-md p-2">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t('totalEstimate')}</p>
            <p className="font-extrabold text-xl text-cyan-700 dark:text-cyan-300">{cost.total}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

const AccommodationSection: React.FC<{ accommodation: ItineraryPlan['accommodation']; destination: string }> = ({ accommodation, destination }) => {
  const { t } = useTranslation();
  return (
    <section className="mb-8">
      <div className="bg-slate-50 dark:bg-slate-700/50 p-4 sm:p-6 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors duration-300">
        <h3 className="font-bold text-xl flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <BedIcon className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
          {t('accommodation')}
        </h3>
        <p className="mt-2 text-slate-600 dark:text-slate-300">{accommodation.recommendations}</p>
        <div className="mt-4">
          <h4 className="font-semibold text-slate-700 dark:text-slate-200">{t('examples')}</h4>
          <ul className="mt-2 space-y-2">
            {(accommodation.examples || []).map((example, index) => {
                const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${example.name}, ${destination}`)}`;
                return (
                    <li key={index} className="bg-white dark:bg-slate-800 p-3 rounded-md flex justify-between items-center shadow-sm border border-slate-200 dark:border-slate-700">
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{example.name}</p>
                            <p className="text-sm text-cyan-600 dark:text-cyan-400 font-medium">{example.priceRange}</p>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-1">
                          {example.bookingUrl && (
                            <a
                              href={example.bookingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:bg-slate-200 dark:focus:bg-slate-700"
                              aria-label={`Book ${example.name} on Booking.com`}
                              title={`Book ${example.name} on Booking.com`}
                            >
                              <BookingIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                            </a>
                          )}
                          <a
                            href={googleMapsSearchUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:bg-slate-200 dark:focus:bg-slate-700"
                            aria-label={`Find ${example.name} on Google Maps`}
                            title={`Find ${example.name} on Google Maps`}
                          >
                            <MapPinIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                          </a>
                        </div>
                    </li>
                );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
};


const GeneralTipsSection: React.FC<{ tips: ItineraryPlan['generalTips'] }> = ({ tips }) => {
  const { t } = useTranslation();
  return (
    <section className="mb-8">
      <div className="bg-slate-50 dark:bg-slate-700/50 p-4 sm:p-6 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors duration-300">
        <h3 className="font-bold text-xl flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <InfoIcon className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
          {t('generalTips')}
        </h3>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-slate-700 dark:text-slate-200">{t('transit')}</h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{tips.transit}</p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-700 dark:text-slate-200">{t('weather')}</h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{tips.weather}</p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-700 dark:text-slate-200">{t('customs')}</h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{tips.customs}</p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-700 dark:text-slate-200">{t('advice')}</h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{tips.practicalAdvice}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

const SourcesSection: React.FC<{ sources: ItineraryPlan['sources'] }> = ({ sources }) => {
    const { t } = useTranslation();
    if (!sources || sources.length === 0) return null;
    return (
        <div className="mt-8">
            <h3 className="text-lg font-semibold mb-2">{t('informationSources')}</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
                {sources.map((source, index) => (
                    <li key={index}>
                        <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-cyan-600 dark:text-cyan-400 hover:underline">
                            {source.title || new URL(source.uri).hostname}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}

const ItineraryDisplay: React.FC<ItineraryDisplayProps> = ({ itinerary, isLoading, error, preferences }) => {
  const { t } = useTranslation();
  const itineraryContentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const handleDownload = async () => {
    const content = itineraryContentRef.current;
    if (!content) return;
    
    setIsDownloading(true);
    try {
        const canvas = await html2canvas(content, {
            scale: 2, // Higher scale for better quality
            useCORS: true,
            backgroundColor: window.getComputedStyle(document.body).backgroundColor,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`itinerary-${preferences?.destination || 'plan'}.pdf`);

    } catch (e) {
        console.error("Error generating PDF:", e);
    } finally {
        setIsDownloading(false);
    }
  };
  
  const handleEmailPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setEmailStatus('sending');
    setTimeout(() => {
        setEmailStatus('sent');
        console.log(`Itinerary for ${preferences?.destination} sent to ${email} (mock).`);
        setTimeout(() => {
            setEmailStatus('idle');
            setEmail('');
        }, 2000);
    }, 1000);
  }

  if (isLoading) return <LoadingSkeleton />;
  if (error) return (
    <div className="bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-r-lg" role="alert">
      <p className="font-bold">{t('errorTitle')}</p>
      <p>{error}</p>
    </div>
  );
  if (!itinerary || !preferences) return (
    <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md transition-colors duration-300">
      <PlaneIcon className="h-16 w-16 text-cyan-500 mx-auto" />
      <h2 className="mt-4 text-2xl font-bold text-slate-800 dark:text-slate-100">{t('itineraryAwaits')}</h2>
      <p className="mt-2 text-slate-600 dark:text-slate-400">{t('itineraryAwaitsDescription')}</p>
    </div>
  );
  
  const destination = preferences.destination.split(',')[0];

  return (
    <div>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
            <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{itinerary.tripTitle}</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-300">{itinerary.tripOverview}</p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
                <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition-colors disabled:bg-slate-400 flex items-center gap-2"
                >
                    <DownloadIcon className="h-5 w-5"/>
                    {isDownloading ? t('downloadingPdf') : t('download')}
                </button>
            </div>
        </div>

        {/* This div is what gets captured for the PDF */}
        <div ref={itineraryContentRef} className="p-4 bg-white dark:bg-slate-800 rounded-lg">
            {itinerary.costEstimation && <CostEstimationDisplay cost={itinerary.costEstimation} />}
            {itinerary.flightInfo && <FlightInfoDisplay flightInfo={itinerary.flightInfo} />}
            <AccommodationSection accommodation={itinerary.accommodation} destination={destination} />
            <GeneralTipsSection tips={itinerary.generalTips} />

            <div className="space-y-8 mt-8">
            {(itinerary.dailyItineraries || []).map(dayPlan => (
                <DailyPlanCard key={dayPlan.day} dayPlan={dayPlan} destination={destination} />
            ))}
            </div>
            
            <SourcesSection sources={itinerary.sources} />
        </div>
        
        <div className="mt-8 bg-slate-50 dark:bg-slate-700/50 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 mb-3">{t('emailPlan')}</h3>
            <form onSubmit={handleEmailPlan} className="flex flex-col sm:flex-row gap-2">
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('emailPlaceholder')}
                    required
                    className="flex-grow mt-1 block w-full bg-white text-slate-900 placeholder-slate-400 border-slate-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white dark:placeholder-slate-400 transition-colors duration-300"
                />
                <button type="submit" disabled={emailStatus !== 'idle' || !email} className="px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition-colors disabled:bg-slate-400 flex items-center gap-2 mt-1 sm:mt-0">
                    <MailIcon className="h-5 w-5" />
                    {emailStatus === 'idle' && t('sendPlan')}
                    {emailStatus === 'sending' && t('sending')}
                    {emailStatus === 'sent' && t('sent')}
                </button>
            </form>
        </div>
    </div>
  );
};

export default ItineraryDisplay;