import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Thermometer, Droplets, CloudRain } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Bar,
  ComposedChart,
} from 'recharts';
import { ClimateHistoryPoint } from '../types/weather';

interface ClimateTrendChartProps {
  history?: ClimateHistoryPoint[];
  districtName: string;
}

export const ClimateTrendChart: React.FC<ClimateTrendChartProps> = ({
  history,
  districtName,
}) => {
  const { t } = useTranslation();
  const [activeMetric, setActiveMetric] = useState<'temp' | 'precip' | 'humidity'>('temp');

  if (!history || history.length === 0) {
    return null;
  }

  return (
    <div id="climate-trend-section" className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {t('weather.past48hTrend', 'Past 48H Trend')} • {districtName}
          </h3>
        </div>

        {/* Metric Selector */}
        <div className="inline-flex rounded-md bg-slate-100 p-0.5 text-[11px] font-semibold text-slate-600">
          <button
            onClick={() => setActiveMetric('temp')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
              activeMetric === 'temp'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            {t('weather.tempTab', 'Temp (°C)')}
          </button>
          <button
            onClick={() => setActiveMetric('precip')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
              activeMetric === 'precip'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            {t('weather.rainTab', 'Rain (mm)')}
          </button>
          <button
            onClick={() => setActiveMetric('humidity')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
              activeMetric === 'humidity'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            {t('weather.humidityTab', 'Humidity (%)')}
          </button>
        </div>
      </div>

      <div className="h-44 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          {activeMetric === 'precip' ? (
            <ComposedChart data={history} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} unit="mm" axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-2 rounded-md text-[11px] shadow-md">
                        <p className="text-slate-400">{d.dateStr} {label}</p>
                        <p className="font-bold text-blue-400">{t('weather.precipitation', 'Precipitation')}: {d.precipitation} mm</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="precipitation" fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={12} />
            </ComposedChart>
          ) : (
            <LineChart data={history} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: '#64748b' }}
                unit={activeMetric === 'temp' ? '°' : '%'}
                axisLine={false}
                tickLine={false}
                domain={activeMetric === 'humidity' ? [0, 100] : ['auto', 'auto']}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-2 rounded-md text-[11px] shadow-md">
                        <p className="text-slate-400">{d.dateStr} {label}</p>
                        {activeMetric === 'temp' ? (
                          <p className="font-bold text-blue-400">{t('weather.temperature', 'Temperature')}: {d.temperature}°C</p>
                        ) : (
                          <p className="font-bold text-sky-400">{t('weather.humidity', 'Humidity')}: {d.humidity}%</p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey={activeMetric === 'temp' ? 'temperature' : 'humidity'}
                stroke={activeMetric === 'temp' ? '#2563eb' : '#0284c7'}
                strokeWidth={2}
                dot={{ r: 1.5, fill: activeMetric === 'temp' ? '#2563eb' : '#0284c7' }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
