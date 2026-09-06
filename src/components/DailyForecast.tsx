import React from 'react';
import { CalendarDays, CloudRain, Sun, Cloud, CloudLightning } from 'lucide-react';
import { DailyForecastItem } from '../types/weather';
import { formatDate } from '../utils/weatherUtils';

interface DailyForecastProps {
  daily: DailyForecastItem[];
}

export const DailyForecast: React.FC<DailyForecastProps> = ({ daily }) => {
  if (!daily || daily.length === 0) return null;

  const getConditionIcon = (code: number) => {
    if (code >= 95) return <CloudLightning className="w-4 h-4 text-amber-500" />;
    if (code >= 51 && code <= 82) return <CloudRain className="w-4 h-4 text-blue-500" />;
    if (code === 2 || code === 3) return <Cloud className="w-4 h-4 text-slate-400" />;
    return <Sun className="w-4 h-4 text-amber-500" />;
  };

  return (
    <div id="daily-forecast-section" className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            7-Day Outlook
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">Daily Max/Min & Precip</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {daily.map((day, idx) => (
          <div
            key={idx}
            className={`p-2.5 rounded-lg border text-center transition-all ${
              idx === 0
                ? 'bg-blue-50/40 border-blue-200 shadow-2xs'
                : 'bg-slate-50/80 border-slate-100 hover:bg-slate-100/80'
            }`}
          >
            <div className="text-xs font-bold text-slate-800">
              {idx === 0 ? 'Today' : day.dayName}
            </div>

            <div className="text-[10px] text-slate-400">
              {formatDate(day.date).split(',')[0]}
            </div>

            <div className="flex justify-center my-1.5">
              {getConditionIcon(day.weatherCode)}
            </div>

            <div className="text-xs font-extrabold text-slate-900 flex items-center justify-center gap-1">
              <span>{day.temperatureMax}°</span>
              <span className="text-slate-400 font-normal text-[11px]">/ {day.temperatureMin}°</span>
            </div>

            <div className="text-[10px] font-medium text-slate-500 truncate mt-0.5" title={day.weatherCondition}>
              {day.weatherCondition}
            </div>

            {day.precipitationSum > 0 ? (
              <div className="mt-1 text-[10px] font-bold text-blue-600">
                {day.precipitationSum} mm
              </div>
            ) : (
              <div className="mt-1 text-[10px] text-slate-300">
                0 mm
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
