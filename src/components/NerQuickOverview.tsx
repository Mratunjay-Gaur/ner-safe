import React from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, AlertTriangle, ChevronRight, Sun, CloudRain, Cloud, CloudLightning } from 'lucide-react';
import { LocationItem, NerStateSummary } from '../types/weather';
import { ALL_DISTRICTS } from '../data/indiaLocations';
import { getLocalizedWeatherCondition } from '../utils/weatherUtils';

interface NerQuickOverviewProps {
  nerSummaries: NerStateSummary[];
  selectedLocation: LocationItem;
  onSelectLocation: (location: LocationItem) => void;
  isLoading: boolean;
}

export const NerQuickOverview: React.FC<NerQuickOverviewProps> = ({
  nerSummaries,
  selectedLocation,
  onSelectLocation,
  isLoading,
}) => {
  const { t } = useTranslation();
  const getConditionIcon = (code: number) => {
    if (code >= 95) return <CloudLightning className="w-3.5 h-3.5 text-amber-500" />;
    if (code >= 51 && code <= 82) return <CloudRain className="w-3.5 h-3.5 text-blue-500" />;
    if (code === 2 || code === 3) return <Cloud className="w-3.5 h-3.5 text-slate-400" />;
    return <Sun className="w-3.5 h-3.5 text-amber-500" />;
  };

  const handleCardClick = (summary: NerStateSummary) => {
    const matched = ALL_DISTRICTS.find(
      (d) => d.state.toLowerCase() === summary.state.toLowerCase() && d.name.toLowerCase().includes(summary.capitalDistrict.toLowerCase())
    ) || ALL_DISTRICTS.find((d) => d.state.toLowerCase() === summary.state.toLowerCase());

    if (matched) {
      onSelectLocation(matched);
    }
  };

  return (
    <div id="ner-quick-overview-section" className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {t('nerHub.stateHubsTitle', 'NER State Hubs (8 States)')}
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">{t('nerHub.clickToInspect', 'Click to inspect')}</span>
      </div>

      {nerSummaries.length === 0 ? (
        <div className="py-6 px-4 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <p className="text-xs font-bold text-slate-700">{t('common.weatherUnavailable', 'Weather data unavailable')}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{t('common.couldNotRetrieve', 'Could not retrieve NER state summaries at this time.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {nerSummaries.map((item) => {
            const isSelected = selectedLocation.state.toLowerCase() === item.state.toLowerCase();

            return (
              <button
                key={item.state}
                onClick={() => handleCardClick(item)}
                disabled={isLoading}
                className={`p-2.5 rounded-lg text-left border transition-all relative group cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-slate-50/80 text-slate-800 border-slate-100 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="overflow-hidden pr-1">
                    <div className="flex items-center gap-1">
                      <span className={`text-[9px] uppercase font-bold tracking-wider block truncate ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                        {item.capitalDistrict}
                      </span>
                      {item.isStale && (
                        <span className={`text-[7px] font-black uppercase px-1 py-0.2 rounded ${isSelected ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-800'}`}>
                          {t('weather.cached', 'CACHED')}
                        </span>
                      )}
                    </div>
                    <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                      {item.state}
                    </h4>
                  </div>

                  <div className="shrink-0">
                    {getConditionIcon(item.weatherCode)}
                  </div>
                </div>

                <div className="mt-2 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-base font-black tracking-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                      {item.temperature !== null ? `${item.temperature}°` : '--'}
                    </span>
                    <span className={`text-[9px] truncate max-w-[55px] font-medium ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                      {item.temperature !== null ? getLocalizedWeatherCondition(t, item.weatherCode, item.weatherCondition) : t('common.unavailable', 'Unavailable')}
                    </span>
                  </div>

                  {item.hasAlert ? (
                    <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-amber-900 bg-amber-200 px-1 py-0.2 rounded">
                      <AlertTriangle className="w-2.5 h-2.5" /> {t('common.alertBadge', 'Alert')}
                    </span>
                  ) : (
                    <ChevronRight className={`w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
