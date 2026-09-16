import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, CloudRain, Sun, Cloud, CloudLightning } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  ComposedChart,
} from 'recharts';
import { HourlyForecastItem } from '../types/weather';
import { formatTime, getLocalizedWeatherCondition } from '../utils/weatherUtils';

interface HourlyForecastProps {
  hourly: HourlyForecastItem[];
}

export const HourlyForecast: React.FC<HourlyForecastProps> = ({ hourly }) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'cards' | 'chart'>('cards');

  if (!hourly || hourly.length === 0) return null;

  const chartData = hourly.slice(0, 18).map((item) => ({
    time: formatTime(item.time),
    temp: item.temperature,
    precip: item.precipitation,
    prob: item.precipitationProbability || 0,
    condition: item.weatherCondition,
  }));

  const getConditionIcon = (code: number) => {
    if (code >= 95) return <CloudLightning className="w-4 h-4 text-amber-500" />;
    if (code >= 51 && code <= 82) return <CloudRain className="w-4 h-4 text-blue-500" />;
    if (code === 2 || code === 3) return <Cloud className="w-4 h-4 text-slate-400" />;
    return <Sun className="w-4 h-4 text-amber-500" />;
  };

  return (
    <div id="hourly-forecast-section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-md bg-sky-50 text-sky-600 border border-sky-200/60">
            <Clock className="w-3.5 h-3.5" />
          </span>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {t('weather.hourlyTitle', 'Hourly Forecast (24H Timeline)')}
          </h3>
        </div>

        {/* View Toggle */}
        <div className="inline-flex rounded-lg bg-slate-100/90 p-1 text-[11px] font-semibold text-slate-600 border border-slate-200/50">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              viewMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            {t('weather.strip', 'Strip')}
          </button>
          <button
            onClick={() => setViewMode('chart')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              viewMode === 'chart' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            {t('weather.curve', 'Curve')}
          </button>
        </div>
      </div>

      {viewMode === 'cards' ? (
        <div className="flex gap-2.5 overflow-x-auto pb-2 pt-0.5 custom-scrollbar">
          {hourly.slice(0, 18).map((hour, idx) => (
            <div
              key={idx}
              className={`shrink-0 w-20 p-3 rounded-xl text-center flex flex-col items-center gap-1.5 transition-all ${
                idx === 0
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50/90 border border-slate-200/70 hover:bg-white hover:shadow-2xs text-slate-700'
              }`}
            >
              <span className={`text-[10px] font-bold tracking-tight ${idx === 0 ? 'text-slate-300' : 'text-slate-500'}`}>
                {idx === 0 ? t('weather.now', 'Now') : formatTime(hour.time)}
              </span>

              <div className="my-1">
                {getConditionIcon(hour.weatherCode)}
              </div>

              <span className={`text-sm font-extrabold font-mono ${idx === 0 ? 'text-white' : 'text-slate-900'}`}>
                {hour.temperature}°
              </span>

              {hour.precipitation > 0 ? (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${idx === 0 ? 'bg-sky-400/20 text-sky-200' : 'bg-sky-50 text-sky-700 font-mono'}`}>
                  {hour.precipitation}mm
                </span>
              ) : hour.precipitationProbability && hour.precipitationProbability > 0 ? (
                <span className={`text-[10px] font-medium ${idx === 0 ? 'text-sky-300' : 'text-sky-600'}`}>
                  {hour.precipitationProbability}%
                </span>
              ) : (
                <span className={`text-[10px] ${idx === 0 ? 'text-slate-500' : 'text-slate-300'}`}>0%</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="h-44 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tempGradientSleek" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#64748b' }} unit="°" axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#0284c7' }} unit="mm" axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 backdrop-blur-md text-white p-2.5 rounded-xl text-[11px] shadow-lg border border-slate-700">
                        <p className="font-bold text-slate-200">{label}</p>
                        <p className="text-sky-400 font-semibold mt-0.5">
                          {data.temp}°C ({getLocalizedWeatherCondition(t, data.weatherCode, data.condition)})
                        </p>
                        <p className="text-slate-400 font-mono text-[10px] mt-0.5">
                          {t('weather.precipitation', 'Precip')}: {data.precip} mm ({data.prob}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="temp"
                stroke="#0284c7"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#tempGradientSleek)"
                name={t('weather.temperature', 'Temperature')}
              />
              <Bar
                yAxisId="right"
                dataKey="precip"
                fill="#38bdf8"
                radius={[3, 3, 0, 0]}
                maxBarSize={12}
                name={t('weather.precipitation', 'Precipitation')}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
