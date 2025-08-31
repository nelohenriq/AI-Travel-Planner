

import React from 'react';
import { DailyItinerary } from '../types';
import { CalendarIcon, ActivityIcon, FoodIcon, TipIcon, ExternalLinkIcon, MapPinIcon } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';

interface DailyPlanCardProps {
  dayPlan: DailyItinerary;
  destination: string;
}

interface ActivityItemProps {
  activity: DailyItinerary['activities'][0];
  destination: string;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, destination }) => {
  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${activity.description}, ${destination}`)}`;

  return (
    <li className="relative">
      <div className="absolute -left-[27px] top-1 h-3 w-3 bg-slate-300 dark:bg-slate-500 rounded-full border-2 border-white dark:border-slate-800/50 transition-colors duration-300" />
      <div className="flex justify-between items-start gap-2">
        <div className="flex-grow">
          <p className="font-semibold text-slate-800 dark:text-slate-100">
            <span className="font-normal">{activity.time}:</span> {activity.description}
          </p>
          {activity.details && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{activity.details}</p>}
        </div>
        <div className="flex-shrink-0">
          <a
            href={googleMapsSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:bg-slate-200 dark:focus:bg-slate-700"
            aria-label={`Find ${activity.description} on Google Maps`}
            title={`Find ${activity.description} on Google Maps`}
          >
            <MapPinIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          </a>
        </div>
      </div>
    </li>
  );
};


const FoodItem: React.FC<{ food: DailyItinerary['food'][0]; destination: string; }> = ({ food, destination }) => {
    const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${food.suggestion}, ${destination}`)}`;
    const tripAdvisorUrl = food.link || `https://www.tripadvisor.com/Search?q=${encodeURIComponent(`${food.suggestion} ${destination}`)}`;

    return (
        <li className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-md transition-colors duration-300 flex justify-between items-start gap-2">
            <div className="flex-grow">
                <p>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{food.meal}: </span>
                    {food.suggestion}
                </p>
                {food.notes && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{food.notes}</p>}
            </div>
            <div className="flex-shrink-0 flex items-center gap-1">
                <a
                    href={tripAdvisorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:bg-slate-200 dark:focus:bg-slate-600"
                    aria-label={`Search for ${food.suggestion} on TripAdvisor`}
                    title={`Search for ${food.suggestion} on TripAdvisor`}
                >
                    <ExternalLinkIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                </a>
                <a
                    href={googleMapsSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:bg-slate-200 dark:focus:bg-slate-700"
                    aria-label={`Find ${food.suggestion} on Google Maps`}
                    title={`Find ${food.suggestion} on Google Maps`}
                >
                    <MapPinIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </a>
            </div>
        </li>
    );
}


const DailyPlanCard: React.FC<DailyPlanCardProps> = ({ dayPlan, destination }) => {
  const { t } = useTranslation();
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm transition-shadow hover:shadow-md transition-colors duration-300">
      <div className="bg-slate-50 dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 transition-colors duration-300">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
          <span className="bg-cyan-600 text-white rounded-md h-10 w-10 flex items-center justify-center font-extrabold">{dayPlan.day}</span>
          <div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{dayPlan.date}</span>
            <div className="text-xl font-semibold -mt-1 text-slate-800 dark:text-slate-100">{dayPlan.title}</div>
          </div>
        </h2>
      </div>

      <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-slate-800/50 transition-colors duration-300">
        {/* Activities Section */}
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2 mb-3 text-cyan-700 dark:text-cyan-400">
            <ActivityIcon className="h-6 w-6" />
            {t('activities')}
          </h3>
          <ul className="space-y-4 border-l-2 border-slate-200 dark:border-slate-600 pl-4 transition-colors duration-300">
            {(dayPlan.activities || []).map((activity, index) => (
              <ActivityItem key={index} activity={activity} destination={destination} />
            ))}
          </ul>
        </div>

        {/* Food & Tips Section */}
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-3 text-cyan-700 dark:text-cyan-400">
              <FoodIcon className="h-6 w-6" />
              {t('diningSuggestions')}
            </h3>
            <ul className="space-y-3">
              {(dayPlan.food || []).map((food, index) => (
                <FoodItem key={index} food={food} destination={destination} />
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-3 text-cyan-700 dark:text-cyan-400">
              <TipIcon className="h-6 w-6" />
              {t('insiderTip')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 dark:border-amber-500 p-3 rounded-r-md transition-colors duration-300">
              {dayPlan.insiderTip}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyPlanCard;