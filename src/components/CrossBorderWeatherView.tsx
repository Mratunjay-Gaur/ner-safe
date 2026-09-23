import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Globe2,
  Wind,
  Droplets,
  CloudRain,
  Compass,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Layers,
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  Eye,
  Gauge,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Info,
  Thermometer,
} from 'lucide-react';
import {
  NeighborCountryId,
  BorderCountryMeta,
  BorderStation,
  CrossBorderWeatherData,
} from '../types/crossBorder';
import { BORDER_COUNTRIES_DATA, NEIGHBOR_COUNTRIES_LIST } from '../data/crossBorderCountries';
import {
  fetchCrossBorderWeatherData,
  fetchAllBorderCountriesOverview,
} from '../services/crossBorderWeatherService';
import { CrossBorderMap } from './crossborder/CrossBorderMap';
import { getWeatherConditionByCode } from '../utils/weatherUtils';

export const CrossBorderWeatherView: React.FC = () => {
  const { t } = useTranslation();

  // Selected Country & Station
  const [selectedCountryId, setSelectedCountryId] = useState<NeighborCountryId>('bangladesh');
  const [selectedStationId, setSelectedStationId] = useState<string>('bd-sylhet');

  // Active Weather Data & Loading States
  const [weatherData, setWeatherData] = useState<CrossBorderWeatherData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Multi-Country Quick Scan Overview
  const [countriesOverview, setCountriesOverview] = useState<
    Array<{ country: BorderCountryMeta; weather: CrossBorderWeatherData | null; error?: string }>
  >([]);
  const [isLoadingOverview, setIsLoadingOverview] = useState<boolean>(true);

  // Load telemetry for selected country and station
  const loadWeatherData = useCallback(
    async (countryId: NeighborCountryId, stationId?: string) => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await fetchCrossBorderWeatherData(countryId, stationId);
        setWeatherData(data);
        setLastRefreshed(new Date());
      } catch (err: any) {
        console.error('Failed to load cross-border weather:', err);
        setErrorMessage(err.message || 'Unable to retrieve real meteorological telemetry.');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Load multi-country summary
  const loadOverview = useCallback(async () => {
    setIsLoadingOverview(true);
    try {
      const overview = await fetchAllBorderCountriesOverview();
      setCountriesOverview(overview);
    } catch (err) {
      console.warn('Failed to load countries overview:', err);
    } finally {
      setIsLoadingOverview(false);
    }
  }, []);

  // Initial mount & selection changes
  useEffect(() => {
    const country = BORDER_COUNTRIES_DATA[selectedCountryId];
    const defaultStation = country.stations.find((s) => s.id === selectedStationId)
      ? selectedStationId
      : country.stations[0].id;

    setSelectedStationId(defaultStation);
    loadWeatherData(selectedCountryId, defaultStation);
  }, [selectedCountryId, loadWeatherData]);

  // Load overview on initial mount
  useEffect(() => {
    loadOverview();
    const interval = setInterval(() => {
      loadOverview();
    }, 120000); // 2 minutes refresh
    return () => clearInterval(interval);
  }, [loadOverview]);

  const handleCountryChange = (countryId: NeighborCountryId) => {
    setSelectedCountryId(countryId);
    const country = BORDER_COUNTRIES_DATA[countryId];
    setSelectedStationId(country.stations[0].id);
  };

  const handleStationChange = (station: BorderStation) => {
    setSelectedStationId(station.id);
    loadWeatherData(selectedCountryId, station.id);
  };

  const handleManualRefresh = () => {
    loadWeatherData(selectedCountryId, selectedStationId);
    loadOverview();
  };

  const activeCountry = BORDER_COUNTRIES_DATA[selectedCountryId];

  // Helper for alert level styles
  const getAlertBadgeStyle = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-500/15 text-red-400 border-red-500/40';
      case 'HIGH':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/40';
      case 'ELEVATED':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/40';
      default:
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40';
    }
  };

  return (
    <div id="cross-border-weather-container" className="space-y-5 animate-in fade-in duration-300">
      {/* 1. Header Banner & Scope Notice */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-4 sm:p-6 border border-slate-700/80 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-400">
                <Globe2 className="w-5 h-5" />
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                Cross-Border Weather & Transboundary Early Warning
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Real-time meteorological monitoring and official alerts for countries sharing an
              international border with the 8 North Eastern Region (NER) states. Upstream precipitation
              and atmospheric vectors directly affect landslide and hydrological vulnerability in India.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <button
              onClick={handleManualRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600/80 text-xs font-semibold shadow-xs transition-all cursor-pointer btn-press disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Updating...' : 'Sync Real Feeds'}</span>
            </button>
          </div>
        </div>

        {/* Explicit Boundary Monitoring Scope Note */}
        <div className="mt-4 pt-3 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-200">Official Scope:</span>
            <span>Restricted exclusively to the 5 neighboring countries bordering the 8 NER states.</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Feed: WMO / ECMWF Global Meteorological Network via Open-Meteo
          </div>
        </div>
      </div>

      {/* 2. Country Selector Tabs (ONLY 5 COUNTRIES) */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200 shadow-xs">
        <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-2 mb-2">
          Select Neighboring Country (Borders 8 NER States)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {NEIGHBOR_COUNTRIES_LIST.map((country) => {
            const isSelected = country.id === selectedCountryId;
            const connectedStates = country.connectedNerStates.map((s) => s.state);

            return (
              <button
                key={country.id}
                onClick={() => handleCountryChange(country.id)}
                className={`relative p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'bg-sky-50/80 border-sky-500 shadow-xs ring-2 ring-sky-500/20'
                    : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl sm:text-2xl leading-none">{country.flag}</span>
                    <span className="font-extrabold text-sm text-slate-900 leading-tight">
                      {country.name}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-sky-600 ring-2 ring-sky-200" />
                  )}
                </div>

                {/* Connected NER States pill */}
                <div className="text-[10px] text-slate-500 leading-snug">
                  <span className="font-semibold text-slate-700">Borders ({connectedStates.length}):</span>{' '}
                  <span className="text-slate-600">{connectedStates.join(', ')}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Border Station Selector for Active Country */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
          <span className="font-bold text-slate-800">
            {activeCountry.name} Meteorological Observatories:
          </span>
          <span className="text-slate-500 hidden sm:inline">Select border or capital station</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {activeCountry.stations.map((st) => {
            const isStationActive = st.id === selectedStationId;
            return (
              <button
                key={st.id}
                onClick={() => handleStationChange(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  isStationActive
                    ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                }`}
              >
                <span>{st.name}</span>
                {st.isCapital && (
                  <span className="ml-1 text-[9px] px-1 py-0.2 rounded-sm bg-white/20 uppercase font-mono">
                    Cap
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Cross-Border Relevance & Transboundary Warning Banner */}
      {weatherData && (
        <div
          className={`rounded-2xl p-4 sm:p-5 border transition-all shadow-sm ${
            weatherData.crossBorderRelevanceLevel === 'CRITICAL' ||
            weatherData.crossBorderRelevanceLevel === 'HIGH'
              ? 'bg-rose-950/95 border-rose-700/80 text-white'
              : weatherData.crossBorderRelevanceLevel === 'ELEVATED'
              ? 'bg-amber-950/90 border-amber-700/80 text-white'
              : 'bg-slate-900 border-slate-800 text-white'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${getAlertBadgeStyle(
                    weatherData.crossBorderRelevanceLevel
                  )}`}
                >
                  Cross-Border Relevance: {weatherData.crossBorderRelevanceLevel}
                </span>
                <span className="text-xs text-slate-300 font-mono">
                  Impact Score: {weatherData.crossBorderRelevanceScore}/100
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {activeCountry.name} ⟷ Connected NER States Hydrological Linkage
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-4xl leading-relaxed">
                {weatherData.crossBorderRelevanceNote}
              </p>
            </div>

            <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2 border-t md:border-t-0 md:border-l border-slate-700/80 pt-3 md:pt-0 md:pl-5 shrink-0 text-xs">
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-semibold">
                  Upstream Rainfall
                </div>
                <div className="text-sm font-bold text-white">
                  {weatherData.upstreamRainfallStatus} ({weatherData.current.precipitation} mm/h)
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-semibold">
                  Transboundary Air Vector
                </div>
                <div className="text-sm font-mono text-slate-200">
                  {weatherData.transboundaryWindImpact}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Severe Weather Alerts List (Real Meteorological Alerts) */}
      {weatherData && weatherData.alerts && weatherData.alerts.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Active Transboundary Weather Alerts & Warnings ({weatherData.alerts.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {weatherData.alerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-extrabold text-xs text-amber-900">{alert.event}</span>
                    <span className="bg-amber-200/80 text-amber-900 border border-amber-300/80 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-xs text-amber-950/90 leading-relaxed">{alert.description}</p>
                </div>

                <div className="pt-2 border-t border-amber-200/80 text-[11px] text-amber-900/90 space-y-1">
                  <div>
                    <span className="font-bold">Direct NER Relevance:</span> {alert.relevanceExplanation}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-amber-800">
                    <span>Impacted NER States: {alert.affectedBorderStates.join(', ')}</span>
                    <span className="font-mono">{new Date(alert.detectedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Primary Country Weather Status & Telemetry Grid */}
      {weatherData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Weather Hero Card */}
          <div className="lg:col-span-1 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 border border-slate-700/80 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-2xl">{activeCountry.flag}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full">
                  Live Station Feed
                </span>
              </div>

              <div className="mt-3">
                <h3 className="text-xl font-extrabold text-white leading-tight">
                  {weatherData.activeStation.name}
                </h3>
                <p className="text-xs text-slate-300">
                  {activeCountry.name} • {weatherData.activeStation.region}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 italic leading-tight">
                  {weatherData.activeStation.borderContext}
                </p>
              </div>

              {/* Temperature & Condition */}
              <div className="mt-5 flex items-baseline gap-3">
                <div className="text-5xl font-black tracking-tight text-white">
                  {weatherData.current.temperature}°
                  <span className="text-2xl font-light text-slate-400">C</span>
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-200">
                    {weatherData.current.weatherCondition}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Feels like {weatherData.current.apparentTemperature}°C
                  </div>
                </div>
              </div>
            </div>

            {/* Quick telemetry footer */}
            <div className="mt-6 pt-4 border-t border-slate-700/80 grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-semibold">
                  Today's Rain Sum
                </div>
                <div className="text-sm font-bold text-sky-400">
                  {weatherData.daily[0]?.precipitationSum ?? 0} mm
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-semibold">
                  High / Low
                </div>
                <div className="text-sm font-bold text-slate-200">
                  {weatherData.daily[0]?.temperatureMax ?? 0}° / {weatherData.daily[0]?.temperatureMin ?? 0}°C
                </div>
              </div>
            </div>
          </div>

          {/* Meteorological Metrics Breakdown (Precipitation, Wind, Humidity, Pressure) */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Precipitation Rate */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Precipitation
                </span>
                <CloudRain className="w-4 h-4 text-sky-600" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-extrabold text-slate-900">
                  {weatherData.current.precipitation}{' '}
                  <span className="text-xs font-medium text-slate-500">mm/h</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {weatherData.current.precipitation > 0 ? 'Active Precipitation' : 'No Rain Falling'}
                </div>
              </div>
              <div className="mt-2 text-[10px] font-mono text-slate-400 border-t border-slate-100 pt-1.5">
                Upstream Ground Status
              </div>
            </div>

            {/* Wind Vector */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Surface Wind
                </span>
                <Wind className="w-4 h-4 text-teal-600" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-extrabold text-slate-900">
                  {weatherData.current.windSpeed}{' '}
                  <span className="text-xs font-medium text-slate-500">km/h</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Vector: {weatherData.current.windDirectionCardinal} ({weatherData.current.windDirection}°)
                </div>
              </div>
              <div className="mt-2 text-[10px] font-mono text-slate-400 border-t border-slate-100 pt-1.5">
                Transboundary Air Mass
              </div>
            </div>

            {/* Relative Humidity */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Humidity
                </span>
                <Droplets className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-extrabold text-slate-900">
                  {weatherData.current.relativeHumidity}{' '}
                  <span className="text-xs font-medium text-slate-500">%</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {weatherData.current.relativeHumidity >= 80 ? 'High Moisture Saturation' : 'Normal Atmospheric Range'}
                </div>
              </div>
              <div className="mt-2 text-[10px] font-mono text-slate-400 border-t border-slate-100 pt-1.5">
                Atmospheric Moisture
              </div>
            </div>

            {/* Atmospheric Surface Pressure */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Barometer
                </span>
                <Gauge className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-extrabold text-slate-900">
                  {weatherData.current.surfacePressure}{' '}
                  <span className="text-xs font-medium text-slate-500">hPa</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {weatherData.current.surfacePressure < 1005 ? 'Low Pressure Trough' : 'Standard Gradient'}
                </div>
              </div>
              <div className="mt-2 text-[10px] font-mono text-slate-400 border-t border-slate-100 pt-1.5">
                Surface Pressure
              </div>
            </div>

            {/* Atmospheric Visibility */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Visibility
                </span>
                <Eye className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-extrabold text-slate-900">
                  {weatherData.current.visibility}{' '}
                  <span className="text-xs font-medium text-slate-500">km</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {weatherData.current.cloudCover}% Cloud Cover
                </div>
              </div>
              <div className="mt-2 text-[10px] font-mono text-slate-400 border-t border-slate-100 pt-1.5">
                Optical Clarity
              </div>
            </div>

            {/* Total Border Length */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  NER Border
                </span>
                <ShieldCheck className="w-4 h-4 text-purple-600" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-extrabold text-slate-900">
                  {activeCountry.totalNerBorderKm}{' '}
                  <span className="text-xs font-medium text-slate-500">km</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Boundary with {activeCountry.connectedNerStates.length} NER States
                </div>
              </div>
              <div className="mt-2 text-[10px] font-mono text-slate-400 border-t border-slate-100 pt-1.5">
                International Perimeter
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Interactive CrossBorderMap showing the 5 Countries & 8 NER States */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-600" />
              Transboundary Geographic Theater Map
            </h3>
            <p className="text-xs text-slate-500">
              Interactive Leaflet GIS displaying the 5 neighboring countries, the 8 NER states of
              India, and cross-border weather linkage corridors.
            </p>
          </div>
          <div className="text-xs text-slate-600 font-mono">
            Active: <span className="font-bold text-slate-900">{activeCountry.name}</span>
          </div>
        </div>

        <CrossBorderMap
          selectedCountryId={selectedCountryId}
          selectedStationId={selectedStationId}
          onSelectCountry={handleCountryChange}
          onSelectStation={handleStationChange}
          weatherData={weatherData}
        />
      </div>

      {/* 8. Clear Indication of Geographically Connected NER States */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Indian NER States Connected to {activeCountry.name} ({activeCountry.connectedNerStates.length} States)
            </h3>
            <p className="text-xs text-slate-500">
              Direct geographic borders, shared river basins, and transboundary environmental vulnerability profiles.
            </p>
          </div>
          <div className="text-xs font-bold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">
            Total Boundary: {activeCountry.totalNerBorderKm} km
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {activeCountry.connectedNerStates.map((conn) => (
            <div
              key={conn.state}
              className="bg-slate-50/70 hover:bg-slate-50 rounded-xl p-4 border border-slate-200/90 transition-all flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 ring-2 ring-sky-200" />
                    <h4 className="font-extrabold text-sm text-slate-900">{conn.state}</h4>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      (NER State)
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                    {conn.borderLengthKm} km border
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="font-semibold text-slate-700">Terrain:</span>{' '}
                    <span className="text-slate-600">{conn.terrainType}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Shared Basins:</span>{' '}
                    <span className="text-slate-600">{conn.sharedRiversBasins.join(', ')}</span>
                  </div>
                  <div className="mt-2 p-2.5 bg-white rounded-lg border border-slate-200/70 text-slate-700 leading-relaxed text-[11px]">
                    <span className="font-bold text-slate-800">Transboundary Impact:</span>{' '}
                    {conn.vulnerabilitySummary}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-200/60 font-mono">
                <span>Boundary Type: International</span>
                <span>Active Risk Telemetry Link</span>
              </div>
            </div>
          ))}
        </div>

        {/* Hydrological Context Note */}
        <div className="p-3.5 bg-sky-50/70 border border-sky-200/80 rounded-xl text-xs text-sky-950 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-sky-900">Regional Hydrology Note:</span>{' '}
            <span>{activeCountry.crossBorderHydrologyNote}</span>
          </div>
        </div>
      </div>

      {/* 9. 24-Hour Hourly Forecast for Active Country Station */}
      {weatherData && weatherData.hourly && weatherData.hourly.length > 0 && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-extrabold text-slate-900">
                24-Hour Transboundary Meteorological Trend ({weatherData.activeStation.name})
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Real Hourly Model</span>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-2 custom-scrollbar">
            {weatherData.hourly.map((hr, idx) => {
              const timeStr = hr.time.includes('T') ? hr.time.split('T')[1].slice(0, 5) : hr.time;
              return (
                <div
                  key={idx}
                  className={`shrink-0 w-24 p-2.5 rounded-xl border text-center transition-all ${
                    idx === 0
                      ? 'bg-sky-500/10 border-sky-300 text-sky-900'
                      : 'bg-slate-50/70 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="text-[10px] font-bold text-slate-500">{timeStr}</div>
                  <div className="text-base font-black my-1 text-slate-900">{hr.temperature}°</div>
                  <div className="text-[10px] font-medium text-slate-600 truncate" title={hr.weatherCondition}>
                    {hr.weatherCondition}
                  </div>
                  <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 flex items-center justify-center gap-1 text-[10px] text-sky-700 font-semibold">
                    <Droplets className="w-3 h-3 text-sky-500" />
                    <span>{hr.precipitation} mm</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">
                    {hr.windSpeed} km/h
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 10. 7-Day Forecast for Active Country Station */}
      {weatherData && weatherData.daily && weatherData.daily.length > 0 && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-extrabold text-slate-900">
                7-Day Transboundary Outlook ({weatherData.activeStation.name})
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">ECMWF / WMO Multi-Day Projection</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {weatherData.daily.map((day, idx) => (
              <div
                key={day.date}
                className={`p-3 rounded-xl border text-center flex flex-col justify-between gap-1.5 transition-all ${
                  idx === 0
                    ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300'
                    : 'bg-slate-50/60 border-slate-200'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-800">{day.dayName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{day.date.slice(5)}</div>
                </div>

                <div className="my-1">
                  <div className="text-lg font-black text-slate-900">{day.temperatureMax}°</div>
                  <div className="text-xs text-slate-500">{day.temperatureMin}°C</div>
                </div>

                <div className="text-[11px] font-medium text-slate-700 leading-tight">
                  {day.weatherCondition}
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200/60 space-y-1 text-[10px]">
                  <div className="flex items-center justify-center gap-1 text-sky-700 font-bold">
                    <CloudRain className="w-3 h-3 text-sky-500" />
                    <span>{day.precipitationSum} mm</span>
                  </div>
                  {day.windSpeedMax && (
                    <div className="text-slate-400">Wind: {day.windSpeedMax} km/h</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 11. Multi-Country Quick Scan Comparison Grid (Strictly 5 Countries) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-extrabold text-slate-900">
              Multi-Country Transboundary Status Quick-Scan
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">All 5 Bordering Nations</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">
                <th className="py-2.5 px-3">Country</th>
                <th className="py-2.5 px-3">Primary Station</th>
                <th className="py-2.5 px-3">Temp</th>
                <th className="py-2.5 px-3">Rain (mm/h)</th>
                <th className="py-2.5 px-3">Wind</th>
                <th className="py-2.5 px-3">Humidity</th>
                <th className="py-2.5 px-3">Border Relevance</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {countriesOverview.map(({ country, weather, error }) => {
                const isSelected = country.id === selectedCountryId;
                return (
                  <tr
                    key={country.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? 'bg-sky-50/50 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{country.flag}</span>
                        <div>
                          <div className="font-bold text-slate-900">{country.name}</div>
                          <div className="text-[10px] text-slate-500">
                            {country.connectedNerStates.length} NER borders
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      {weather ? weather.activeStation.name : country.stations[0].name}
                    </td>
                    <td className="py-3 px-3">
                      {weather ? (
                        <span className="font-bold text-slate-900">
                          {weather.current.temperature}°C
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {weather ? (
                        <span
                          className={`font-semibold ${
                            weather.current.precipitation > 5
                              ? 'text-rose-600 font-bold'
                              : weather.current.precipitation > 0
                              ? 'text-sky-600'
                              : 'text-slate-600'
                          }`}
                        >
                          {weather.current.precipitation} mm
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-mono">
                      {weather
                        ? `${weather.current.windSpeed} km/h ${weather.current.windDirectionCardinal}`
                        : '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      {weather ? `${weather.current.relativeHumidity}%` : '—'}
                    </td>
                    <td className="py-3 px-3">
                      {weather ? (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${getAlertBadgeStyle(
                            weather.crossBorderRelevanceLevel
                          )}`}
                        >
                          {weather.crossBorderRelevanceLevel}
                        </span>
                      ) : (
                        <span className="text-slate-400">Loading...</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleCountryChange(country.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-600 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isSelected ? 'Viewing' : 'Inspect'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
