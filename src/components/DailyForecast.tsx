import React from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, CloudRain, Sun, Cloud, CloudLightning } from 'lucide-react';
import { DailyForecastItem } from '../types/weather';
import { formatDate, getLocalizedWeatherCondition, getLocalizedDayName } from '../utils/weatherUtils';

interface DailyForecastProps {
  daily: DailyForecastItem[];
}

export const DailyForecast: React.FC<DailyForecastProps> = ({ daily }) => {
  const { t } = useTranslation();
  if (!daily || daily.length === 0) return null;

  const getConditionIcon = (code: number) => {
    if (code >= 95) return <CloudLightning className="w-4 h-4 text-amber-500" />;
    if (code >= 51 && code <= 82) return <CloudRain className="w-4 h-4 text-blue-500" />;
    if (code === 2 || code === 3) return <Cloud className="w-4 h-4 text-slate-400" />;
    return <Sun className="w-4 h-4 text-amber-500" />;
  };

  return (
    <div id="daily-forecast-section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-md bg-sky-50 text-sky-600 border border-sky-200/60">
            <CalendarDays className="w-3.5 h-3.5" />
          </span>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {t('weather.synopticOutlook', '7-Day Synoptic Outlook')}
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase font-mono">
          {t('weather.dailyMinMaxPrecip', 'Daily Min/Max & Precip')}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {daily.map((day, idx) => (
          <div
            key={idx}
            className={`p-3.5 rounded-xl border text-center transition-all ${
              idx === 0
                ? 'bg-sky-50/70 border-sky-200/90 shadow-2xs'
                : 'bg-slate-50/80 border-slate-200/60 hover:bg-white hover:shadow-2xs'
            }`}
          >
            <div className={`text-xs font-bold ${idx === 0 ? 'text-sky-950' : 'text-slate-800'}`}>
              {idx === 0 ? t('weather.today', 'Today') : getLocalizedDayName(t, day.dayName)}
            </div>

            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              {formatDate(day.date).split(',')[0]}
            </div>

            <div className="flex justify-center my-2">
              {getConditionIcon(day.weatherCode)}
            </div>

            <div className="text-xs font-extrabold text-slate-900 flex items-center justify-center gap-1 font-mono">
              <span>{day.temperatureMax}°</span>
              <span className="text-slate-400 font-normal text-[11px]">/ {day.temperatureMin}°</span>
            </div>

            <div
              className="text-[10px] font-medium text-slate-500 truncate mt-1"
              title={getLocalizedWeatherCondition(t, day.weatherCode, day.weatherCondition)}
            >
              {getLocalizedWeatherCondition(t, day.weatherCode, day.weatherCondition)}
            </div>

            {day.precipitationSum > 0 ? (
              <div className="mt-1.5 text-[10px] font-bold text-sky-700 bg-sky-100/70 px-1.5 py-0.5 rounded-full inline-block font-mono">
                {day.precipitationSum} mm
              </div>
            ) : (
              <div className="mt-1.5 text-[10px] text-slate-400 font-mono">
                0 mm
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
