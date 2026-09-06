import React, { useState } from 'react';
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
import { formatTime } from '../utils/weatherUtils';

interface HourlyForecastProps {
  hourly: HourlyForecastItem[];
}

export const HourlyForecast: React.FC<HourlyForecastProps> = ({ hourly }) => {
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
    <div id="hourly-forecast-section" className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Hourly Forecast (24H)
          </h3>
        </div>

        {/* View Toggle */}
        <div className="inline-flex rounded-md bg-slate-100 p-0.5 text-[11px] font-semibold text-slate-600">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
              viewMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            Strip
          </button>
          <button
            onClick={() => setViewMode('chart')}
            className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
              viewMode === 'chart' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            Curve
          </button>
        </div>
      </div>

      {viewMode === 'cards' ? (
        <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin scrollbar-thumb-slate-200">
          {hourly.slice(0, 18).map((hour, idx) => (
            <div
              key={idx}
              className="flex-shrink-0 w-16 p-2 rounded-lg bg-slate-50/80 border border-slate-100 text-center flex flex-col items-center gap-1 hover:bg-slate-100/70 transition-colors"
            >
              <span className="text-[10px] font-semibold text-slate-500">
                {idx === 0 ? 'Now' : formatTime(hour.time)}
              </span>

              <div className="my-0.5">
                {getConditionIcon(hour.weatherCode)}
              </div>

              <span className="text-xs font-extrabold text-slate-900">
                {hour.temperature}°
              </span>

              {hour.precipitation > 0 ? (
                <span className="text-[10px] font-bold text-blue-600">
                  {hour.precipitation}mm
                </span>
              ) : hour.precipitationProbability && hour.precipitationProbability > 0 ? (
                <span className="text-[10px] font-medium text-blue-500">
                  {hour.precipitationProbability}%
                </span>
              ) : (
                <span className="text-[10px] text-slate-300">0%</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="h-36 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="tempGradientSleek" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#64748b' }} unit="°" axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#3b82f6' }} unit="mm" axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-2 rounded-md text-[11px] shadow-md">
                        <p className="font-bold">{label}</p>
                        <p className="text-blue-400 font-semibold">{data.temp}°C ({data.condition})</p>
                        <p className="text-slate-300">Rain: {data.precip} mm ({data.prob}%)</p>
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
                stroke="#2563eb"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#tempGradientSleek)"
                name="Temperature (°C)"
              />
              <Bar yAxisId="right" dataKey="precip" fill="#60a5fa" radius={[2, 2, 0, 0]} maxBarSize={10} name="Precipitation (mm)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
