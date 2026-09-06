import React from 'react';
import {
  CloudSun,
  Sun,
  CloudRain,
  CloudLightning,
  CloudFog,
  Cloud,
  MapPin,
  Clock,
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  Eye,
} from 'lucide-react';
import { CurrentWeather, LocationItem } from '../types/weather';
import { formatTime } from '../utils/weatherUtils';

interface MainWeatherSummaryProps {
  location: LocationItem;
  current: CurrentWeather;
  isLoading?: boolean;
  isCached?: boolean;
  isStale?: boolean;
}

export const MainWeatherSummary: React.FC<MainWeatherSummaryProps> = ({
  location,
  current,
  isLoading,
  isCached,
  isStale,
}) => {
  // Select contextual weather icon
  const getWeatherIcon = (code: number, isDay: boolean) => {
    if (code >= 95) return <CloudLightning className="w-8 h-8 text-amber-500" />;
    if (code >= 51 && code <= 82) return <CloudRain className="w-8 h-8 text-blue-500" />;
    if (code === 45 || code === 48) return <CloudFog className="w-8 h-8 text-slate-400" />;
    if (code === 2 || code === 3) return <Cloud className="w-8 h-8 text-slate-400" />;
    return isDay ? (
      <Sun className="w-8 h-8 text-amber-500 animate-spin-slow" />
    ) : (
      <CloudSun className="w-8 h-8 text-sky-400" />
    );
  };

  return (
    <div
      id="main-weather-summary-card"
      className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col justify-between h-full"
    >
      <div>
        {/* Top badges */}
        <div className="flex items-center justify-between gap-2">
          {isStale ? (
            <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200/80 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              CACHED / STALE
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-600 border border-rose-200/60 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              LIVE
            </div>
          )}

          {location.isNer && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
              NER Station
            </span>
          )}
        </div>

        {/* Location Header */}
        <div className="mt-2.5">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {location.name}
          </h2>
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{location.state}, India</span>
          </p>
        </div>

        {/* Giant Main Temperature Readout */}
        <div className="my-3">
          <div className="text-5xl sm:text-6xl font-extrabold text-slate-900 tracking-tighter leading-none">
            {current.temperature}°
          </div>

          <div className="flex items-center gap-2 mt-2">
            <div className="shrink-0">{getWeatherIcon(current.weatherCode, current.isDay)}</div>
            <div>
              <span className="text-sm font-bold text-slate-800 block leading-tight">
                {current.weatherCondition}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Feels like <strong className="text-slate-700 font-semibold">{current.apparentTemperature}°C</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Sleek Atmospheric Details Grid */}
        <div className="border-t border-slate-100 pt-3 mt-3">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
            Current Observations
          </div>
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="flex flex-col bg-slate-50/60 p-2 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Humidity</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5">{current.relativeHumidity}%</span>
            </div>

            <div className="flex flex-col bg-slate-50/60 p-2 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Wind</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5">{current.windSpeed} km/h</span>
            </div>

            <div className="flex flex-col bg-slate-50/60 p-2 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Precipitation</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5">{current.precipitation} mm</span>
            </div>

            <div className="flex flex-col bg-slate-50/60 p-2 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Pressure</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5">{current.surfacePressure} hPa</span>
            </div>

            <div className="flex flex-col bg-slate-50/60 p-2 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Visibility</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5">{current.visibility} km</span>
            </div>

            <div className="flex flex-col bg-slate-50/60 p-2 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Cloud Cover</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5">{current.cloudCover}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Timestamp */}
      <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>Sync: {formatTime(current.updatedAt)}</span>
        </span>
        <span>{location.latitude.toFixed(2)}°N, {location.longitude.toFixed(2)}°E</span>
      </div>
    </div>
  );
};
