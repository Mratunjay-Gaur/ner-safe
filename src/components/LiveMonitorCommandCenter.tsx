import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CloudSun,
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  CloudFog,
  CloudDrizzle,
  Droplets,
  Wind,
  Gauge,
  MapPin,
  RefreshCw,
  AlertCircle,
  Thermometer,
} from 'lucide-react';
import { LocationItem, WeatherResponse } from '../types/weather';
import { LocationSelector } from './LocationSelector';
import { HourlyForecast } from './HourlyForecast';
import { DailyForecast } from './DailyForecast';
import { WeatherAlerts } from './WeatherAlerts';
import { ClimateTrendChart } from './ClimateTrendChart';
import { CurrentWeatherDetails } from './CurrentWeatherDetails';
import { getLocalizedWeatherCondition } from '../utils/weatherUtils';

interface LiveMonitorCommandCenterProps {
  selectedLocation: LocationItem;
  onSelectLocation: (location: LocationItem) => void;
  weatherData: WeatherResponse | null;
  isLoading: boolean;
  onRefresh: () => void;
  nerSummaries?: any[];
  onNavigateTab?: (tab: string) => void;
}

export const LiveMonitorCommandCenter: React.FC<LiveMonitorCommandCenterProps> = ({
  selectedLocation,
  onSelectLocation,
  weatherData,
  isLoading,
  onRefresh,
}) => {
  const { t } = useTranslation();
  const current = weatherData?.current;
  const todayForecast = weatherData?.daily && weatherData.daily.length > 0 ? weatherData.daily[0] : null;

  // Weather icon picker based on standard WMO weather codes
  const getWeatherIcon = (code?: number, isDay: boolean = true) => {
    if (code === undefined || code === null) {
      return <CloudSun className="w-14 h-14 text-sky-500" />;
    }
    if (code >= 95) return <CloudLightning className="w-14 h-14 text-amber-500" />;
    if (code >= 60 && code <= 82) return <CloudRain className="w-14 h-14 text-sky-600" />;
    if (code >= 51 && code <= 57) return <CloudDrizzle className="w-14 h-14 text-sky-400" />;
    if (code === 45 || code === 48) return <CloudFog className="w-14 h-14 text-slate-400" />;
    if (code === 2 || code === 3) return <Cloud className="w-14 h-14 text-slate-400" />;
    if (code === 1) return isDay ? <CloudSun className="w-14 h-14 text-sky-500" /> : <Cloud className="w-14 h-14 text-slate-400" />;
    if (code === 0) return isDay ? <Sun className="w-14 h-14 text-amber-500" /> : <Sun className="w-14 h-14 text-sky-400" />;
    return <CloudSun className="w-14 h-14 text-sky-500" />;
  };

  return (
    <div id="live-weather-homepage" className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* 1. Location & District Selection Bar with GPS control */}
      <LocationSelector
        selectedLocation={selectedLocation}
        onSelectLocation={onSelectLocation}
        isLoading={isLoading}
      />

      {/* Loading state skeleton */}
      {isLoading && !weatherData && (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">
            {t('weather.fetchingData', 'Fetching real-time meteorological data for {{name}}...', { name: selectedLocation.name })}
          </p>
        </div>
      )}

      {/* Weather Error State */}
      {!isLoading && !weatherData && (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">
            {t('weather.unavailable', 'Weather telemetry currently unavailable for this station.')}
          </p>
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('weather.retryConnection', 'Retry Connection')}</span>
          </button>
        </div>
      )}

      {/* Main Weather Content */}
      {weatherData && current && (
        <div className="space-y-6">
          {/* 2. Hero Current Weather Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 sm:p-6 relative overflow-hidden">
            {/* Subtle background ambient glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-400/10 via-teal-400/5 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              {/* Left Column: Location, Big Temp & Weather Condition */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-900">
                  <span className="p-1 rounded-md bg-blue-50 text-blue-600 border border-blue-200">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                  </span>
                  <span className="font-bold text-slate-800 text-sm">{selectedLocation.name}, {selectedLocation.state}</span>
                  {selectedLocation.isNer && (
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 border border-blue-500/20">
                      {t('weather.nerStation', 'NER Station')}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-6 pt-1">
                  <div className="shrink-0 p-3 rounded-2xl bg-gradient-to-br from-sky-50 to-white border border-sky-100 shadow-xs">
                    {getWeatherIcon(current.weatherCode, current.isDay)}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-6xl sm:text-7xl font-extrabold text-slate-900 tracking-tight leading-none">
                        {current.temperature}°
                      </span>
                      <span className="text-2xl font-bold text-slate-400 font-mono">C</span>
                    </div>
                    <div className="text-base font-bold text-slate-800 mt-1 capitalize tracking-tight">
                      {getLocalizedWeatherCondition(t, current.weatherCode, current.weatherCondition)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1 font-medium">
                  <span>{t('weather.feelsLike', 'Feels like')} <strong className="text-slate-900 font-semibold font-mono">{current.apparentTemperature}°C</strong></span>
                  {todayForecast && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span>{t('weather.high', 'High')}: <strong className="text-slate-900 font-semibold font-mono">{todayForecast.tempMax}°C</strong></span>
                      <span className="text-slate-300">•</span>
                      <span>{t('weather.low', 'Low')}: <strong className="text-slate-900 font-semibold font-mono">{todayForecast.tempMin}°C</strong></span>
                    </>
                  )}
                </div>
              </div>

              {/* Right Column: 4 Key Atmospheric Parameters (Rainfall, Humidity, Wind, Pressure) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 shrink-0 lg:w-88">
                {/* Rainfall */}
                <div className="bg-white/80 backdrop-blur-md rounded-xl p-3.5 border border-slate-200/90 shadow-2xs hover:border-sky-300/80 transition-colors">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium mb-1">
                    <CloudRain className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>{t('weather.rainfall', 'Rainfall')}</span>
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 font-mono">
                    {current.rainfall !== undefined ? current.rainfall : (current.precipitation || 0)} <span className="text-xs font-normal text-slate-500 font-sans">mm</span>
                  </div>
                  <div className="text-[10px] font-medium text-slate-500 mt-0.5">
                    {current.rainfall > 0 ? t('weather.activeRain', 'Active precipitation') : t('weather.noRain', 'No rainfall detected')}
                  </div>
                </div>

                {/* Humidity */}
                <div className="bg-white/80 backdrop-blur-md rounded-xl p-3.5 border border-slate-200/90 shadow-2xs hover:border-sky-300/80 transition-colors">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium mb-1">
                    <Droplets className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>{t('weather.humidity', 'Humidity')}</span>
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 font-mono">
                    {current.relativeHumidity}<span className="text-xs font-normal text-slate-500 font-sans">%</span>
                  </div>
                  <div className="text-[10px] font-medium text-slate-500 mt-0.5">
                    {current.relativeHumidity > 80 ? t('weather.highMoisture', 'High atmospheric moisture') : t('weather.nominalLevel', 'Nominal level')}
                  </div>
                </div>

                {/* Wind */}
                <div className="bg-white/80 backdrop-blur-md rounded-xl p-3.5 border border-slate-200/90 shadow-2xs hover:border-teal-300/80 transition-colors">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium mb-1">
                    <Wind className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>{t('weather.windVelocity', 'Wind Velocity')}</span>
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 font-mono">
                    {current.windSpeed} <span className="text-xs font-normal text-slate-500 font-sans">km/h</span>
                  </div>
                  <div className="text-[10px] font-medium text-slate-500 mt-0.5">
                    {t('weather.heading', 'Heading')}: {current.windDirectionCardinal} ({current.windDirection}°)
                  </div>
                </div>

                {/* Pressure */}
                <div className="bg-white/80 backdrop-blur-md rounded-xl p-3.5 border border-slate-200/90 shadow-2xs hover:border-indigo-300/80 transition-colors">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium mb-1">
                    <Gauge className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>{t('weather.barometricPressure', 'Barometric Pressure')}</span>
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 font-mono">
                    {current.surfacePressure} <span className="text-xs font-normal text-slate-500 font-sans">hPa</span>
                  </div>
                  <div className="text-[10px] font-medium text-slate-500 mt-0.5">
                    {t('weather.terrainCalibrated', 'Terrain calibrated')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Weather Alerts (Active warnings or nominal state) */}
          <WeatherAlerts
            alerts={weatherData.alerts || []}
            locationName={selectedLocation.name}
          />

          {/* 4. Hourly Forecast (Next 24 Hours) */}
          {weatherData.hourly && weatherData.hourly.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
              <HourlyForecast hourly={weatherData.hourly} />
            </div>
          )}

          {/* 5. 7-Day Forecast */}
          {weatherData.daily && weatherData.daily.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
              <DailyForecast daily={weatherData.daily} />
            </div>
          )}

          {/* 6. Weather Trend & Atmospheric Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Weather Trend (Past 48H) */}
            <div className="lg:col-span-6">
              {weatherData.history && weatherData.history.length > 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 h-full">
                  <ClimateTrendChart
                    history={weatherData.history}
                    districtName={selectedLocation.name}
                  />
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 text-center text-slate-400 text-xs flex items-center justify-center h-full">
                  {t('weather.historicalRecording', 'Historical telemetry recording for {{name}}...', { name: selectedLocation.name })}
                </div>
              )}
            </div>

            {/* Current Weather Extended Details (UV, Visibility, Vector, Dew point) */}
            <div className="lg:col-span-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 h-full">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="p-1 rounded-md bg-blue-50 text-blue-600 border border-blue-200">
                    <Thermometer className="w-3.5 h-3.5" />
                  </span>
                  <span>{t('weather.stationMetrics', 'Station Meteorological Metrics')}</span>
                </h3>
                <CurrentWeatherDetails current={current} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
