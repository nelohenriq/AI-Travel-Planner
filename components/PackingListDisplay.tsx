
import React from 'react';
import { PackingList } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { BriefcaseIcon } from '../constants';

interface PackingListDisplayProps {
  packingList: PackingList;
}

const PackingListDisplay: React.FC<PackingListDisplayProps> = ({ packingList }) => {
  const { t } = useTranslation();
  return (
    <section className="mb-8">
      <div className="bg-slate-50 dark:bg-slate-700/50 p-4 sm:p-6 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors duration-300">
        <h3 className="font-bold text-xl flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <BriefcaseIcon className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
          {t('packingList')}
        </h3>
        
        {packingList.packingTips && (
            <div className="mt-4 p-3 bg-cyan-50 dark:bg-cyan-900/20 border-l-4 border-cyan-500 rounded-r-md">
                <h4 className="font-semibold text-cyan-800 dark:text-cyan-200">{t('packingTips')}</h4>
                <p className="text-sm text-cyan-700 dark:text-cyan-300 mt-1">{packingList.packingTips}</p>
            </div>
        )}
        
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {(packingList.categories || []).map((category, index) => (
            <div key={index}>
              <h4 className="font-semibold text-slate-700 dark:text-slate-200 border-b-2 border-slate-200 dark:border-slate-600 pb-1 mb-2">
                {category.category}
              </h4>
              <ul className="space-y-2">
                {(category.items || []).map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start">
                    <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer group">
                      <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-500 text-cyan-600 focus:ring-cyan-500 bg-white dark:bg-slate-700" />
                      <span>
                        {item.item}
                        {item.notes && <span className="block text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">{item.notes}</span>}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PackingListDisplay;