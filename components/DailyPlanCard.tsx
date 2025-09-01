import React from 'react';
import { DailyItinerary } from '../types';
import { ActivityIcon, FoodIcon, TipIcon, ExternalLinkIcon, MapPinIcon } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';

interface DailyPlanCardProps {
  dayPlan: DailyItinerary;
  destination: string;
  highlightedItem: string | null;
  itemRefs: Record<string, React.RefObject<HTMLDivElement>>;
  dayIndex: number;
  onRefineRequest: (request: string) => void;
}

interface ItemProps {
  isHighlighted: boolean;
  itemRef: React.RefObject<HTMLDivElement>;
}

interface ActivityItemProps extends ItemProps {
  activity: DailyItinerary['activities'][0];
  destination: string;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, destination, isHighlighted, itemRef }) => {
  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${activity.description}, ${destination}`)}`;
  const highlightClass = isHighlighted ? 'ring-2 ring-cyan-500 ring-offset-2 dark:ring-offset-slate-800 rounded-md' : '';

  return (
    <li className="relative">
      <div className="absolute -left-[27px] top-1 h-3 w-3 bg-slate-300 dark:bg-slate-500 rounded-full border-2 border-white dark:border-slate-800/50 transition-colors duration-300" />
      <div ref={itemRef} className={`transition-all duration-300 p-2 -m-2 ${highlightClass}`}>
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
      </div>
    </li>
  );
};


interface FoodItemProps extends ItemProps {
  food: DailyItinerary['food'][0];
  destination: string;
}

const FoodItem: React.FC<FoodItemProps> = ({ food, destination, isHighlighted, itemRef }) => {
    const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${food.suggestion}, ${destination}`)}`;
    const tripAdvisorUrl = food.link || `https://www.tripadvisor.com/Search?q=${encodeURIComponent(`${food.suggestion} ${destination}`)}`;
    const highlightClass = isHighlighted ? 'ring-2 ring-cyan-500' : '';

    return (
        <li>
            <div ref={itemRef} className={`bg-slate-50 dark:bg-slate-700/50 p-3 rounded-md transition-all duration-300 flex justify-between items-start gap-2 ${highlightClass}`}>
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
            </div>
        </li>
    );
}

const DailyPlanCard: React.FC<DailyPlanCardProps> = ({ dayPlan, destination, highlightedItem, itemRefs, dayIndex, onRefineRequest }) => {
  const { t } = useTranslation();

  const refinementOptions = [
    { labelKey: "makeMoreActive", prompt: "For day {{day}}, make the schedule more active by adding another engaging activity." },
    { labelKey: "makeMoreRelaxed", prompt: "For day {{day}}, make the schedule more relaxed, perhaps by removing one activity or suggesting a more leisurely alternative." },
    { labelKey: "newDinnerIdea", prompt: "For day {{day}}, suggest a different, highly-rated restaurant for dinner." },
    { labelKey: "addKidFriendlyFun", prompt: "For day {{day}}, add a fun, kid-friendly activity suitable for the group composition." },
  ];

  const handleRefine = (requestTemplate: string) => {
      onRefineRequest(requestTemplate.replace('{{day}}', dayPlan.day.toString()));
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm transition-shadow hover:shadow-md transition-colors duration-300">
      <div className="bg-slate-50 dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 transition-colors duration-300">
        <div className="flex justify-between items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <span className="bg-cyan-600 text-white rounded-md h-10 w-10 flex items-center justify-center font-extrabold">{dayPlan.day}</span>
            <div>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{dayPlan.date}</span>
              <div className="text-xl font-semibold -mt-1 text-slate-800 dark:text-slate-100">{dayPlan.title}</div>
            </div>
          </h2>
        </div>
      </div>

      <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-slate-800/50 transition-colors duration-300">
        {/* Activities Section */}
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2 mb-3 text-cyan-700 dark:text-cyan-400">
            <ActivityIcon className="h-6 w-6" />
            {t('activities')}
          </h3>
          <ul className="space-y-4 border-l-2 border-slate-200 dark:border-slate-600 pl-4 transition-colors duration-300">
            {(dayPlan.activities || []).map((activity, index) => {
              const id = `activity-${dayIndex}-${index}`;
              return (
                <ActivityItem 
                  key={index} 
                  activity={activity} 
                  destination={destination} 
                  isHighlighted={highlightedItem === id}
                  itemRef={itemRefs[id]}
                />
              );
            })}
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
              {(dayPlan.food || []).map((food, index) => {
                const id = `food-${dayIndex}-${index}`;
                return (
                  <FoodItem 
                    key={index} 
                    food={food} 
                    destination={destination}
                    isHighlighted={highlightedItem === id}
                    itemRef={itemRefs[id]}
                  />
                )
              })}
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
      
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">{t('quickRefinements')}</h4>
        <div className="flex flex-wrap gap-2">
            {refinementOptions.map(opt => (
                <button
                    key={opt.labelKey}
                    onClick={() => handleRefine(opt.prompt)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-full bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 dark:focus:ring-offset-slate-800"
                >
                    {t(opt.labelKey)}
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default DailyPlanCard;
