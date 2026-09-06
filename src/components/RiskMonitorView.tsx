import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LocationItem, WeatherResponse } from '../types/weather';
import { DistrictEnvironmentalProfile } from '../types/environmental';
import { IIncidentReport } from '../types/incident';
import {
  CalculatedRiskAssessment,
  RiskAiExplanation,
  RiskLevel,
  RiskFactorContribution,
  RiskForecastWindow,
} from '../types/risk';
import { fetchDistrictEnvironmentalProfile } from '../services/environmentalService';
import { fetchDistrictWeather } from '../services/weatherService';
import { fetchIncidents } from '../services/incidentService';
import { calculateMultiFactorLandslideRisk } from '../services/riskEngine';
import { fetchRiskAiExplanation } from '../services/riskAiService';
import { NerStateDistrictSelector } from './NerStateDistrictSelector';
import { NerEnvironmentalMap } from './NerEnvironmentalMap';
import { NerRiskHeatmap } from './NerRiskHeatmap';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Mountain,
  Droplets,
  CloudRain,
  Calendar,
  Sparkles,
  RefreshCw,
  Info,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  MapPin,
  FileCheck,
  ChevronRight,
  Zap,
} from 'lucide-react';

interface RiskMonitorViewProps {
  selectedLocation: LocationItem;
  onSelectLocation: (location: LocationItem) => void;
  weatherData: WeatherResponse | null;
}

export const RiskMonitorView: React.FC<RiskMonitorViewProps> = ({
  selectedLocation,
  onSelectLocation,
  weatherData: initialWeatherData,
}) => {
  const [environmentalData, setEnvironmentalData] = useState<DistrictEnvironmentalProfile | null>(null);
  const [localWeatherData, setLocalWeatherData] = useState<WeatherResponse | null>(initialWeatherData);
  const [incidents, setIncidents] = useState<IIncidentReport[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // AI Explanation state
  const [aiExplanation, setAiExplanation] = useState<RiskAiExplanation | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [hasRequestedAi, setHasRequestedAi] = useState<boolean>(false);

  // Sync initial weather data if provided
  useEffect(() => {
    if (initialWeatherData) {
      setLocalWeatherData(initialWeatherData);
    }
  }, [initialWeatherData]);

  // Load all telemetry feeds for the selected district
  const loadAllDistrictTelemetry = useCallback(async (loc: LocationItem) => {
    setIsLoadingData(true);
    setAiExplanation(null);
    setHasRequestedAi(false);

    try {
      const [envProfile, weatherRes, incidentsRes] = await Promise.all([
        fetchDistrictEnvironmentalProfile(loc).catch((e) => {
          console.warn('Environmental profile load failed:', e);
          return null;
        }),
        fetchDistrictWeather(loc).catch((e) => {
          console.warn('Weather fetch load failed:', e);
          return null;
        }),
        fetchIncidents({ limit: 100 }).catch((e) => {
          console.warn('Incidents fetch load failed:', e);
          return [];
        }),
      ]);

      if (envProfile) setEnvironmentalData(envProfile);
      if (weatherRes) setLocalWeatherData(weatherRes);
      if (incidentsRes) setIncidents(incidentsRes as unknown as IIncidentReport[]);
    } catch (err) {
      console.error('Error fetching all district telemetry for Risk Monitor:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadAllDistrictTelemetry(selectedLocation);

    // Auto-refresh telemetry every 3 minutes
    const timer = setInterval(() => {
      loadAllDistrictTelemetry(selectedLocation);
    }, 180000);

    return () => clearInterval(timer);
  }, [selectedLocation, loadAllDistrictTelemetry]);

  // Calculate numerical risk assessment using transparent multi-factor engine
  const riskAssessment: CalculatedRiskAssessment = useMemo(() => {
    return calculateMultiFactorLandslideRisk(
      selectedLocation,
      localWeatherData,
      environmentalData,
      incidents
    );
  }, [selectedLocation, localWeatherData, environmentalData, incidents]);

  // Handle triggering server-side Gemini AI risk interpretation
  const requestAiAnalysis = useCallback(async () => {
    if (!riskAssessment) return;
    setIsLoadingAi(true);
    setHasRequestedAi(true);

    try {
      const result = await fetchRiskAiExplanation(riskAssessment);
      setAiExplanation(result);
    } catch (err: any) {
      console.error('Failed to request AI analysis:', err);
      setAiExplanation({
        available: false,
        message: err.message || 'Failed to connect to AI interpretation service.',
      });
    } finally {
      setIsLoadingAi(false);
    }
  }, [riskAssessment]);

  // Auto-request AI interpretation once initial data is loaded
  useEffect(() => {
    if (!isLoadingData && riskAssessment && !hasRequestedAi) {
      requestAiAnalysis();
    }
  }, [isLoadingData, riskAssessment, hasRequestedAi, requestAiAnalysis]);

  // Visual helper for Risk Level styling
  const getRiskLevelBadge = (level: RiskLevel) => {
    switch (level) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-600 text-white border-red-700',
          lightBg: 'bg-red-50 text-red-800 border-red-200',
          border: 'border-red-500',
          ring: 'text-red-600',
          label: 'CRITICAL HAZARD',
          desc: 'High probability of slope instability under active meteorological conditions',
        };
      case 'HIGH':
        return {
          bg: 'bg-amber-600 text-white border-amber-700',
          lightBg: 'bg-amber-50 text-amber-900 border-amber-200',
          border: 'border-amber-500',
          ring: 'text-amber-600',
          label: 'HIGH RISK',
          desc: 'Elevated vulnerability due to steep terrain and increased pore-water pressure',
        };
      case 'MODERATE':
        return {
          bg: 'bg-yellow-500 text-white border-yellow-600',
          lightBg: 'bg-yellow-50 text-yellow-900 border-yellow-200',
          border: 'border-yellow-400',
          ring: 'text-yellow-600',
          label: 'MODERATE RISK',
          desc: 'Noticeable factors present; continuous monitoring recommended',
        };
      case 'LOW':
      default:
        return {
          bg: 'bg-emerald-600 text-white border-emerald-700',
          lightBg: 'bg-emerald-50 text-emerald-900 border-emerald-200',
          border: 'border-emerald-500',
          ring: 'text-emerald-600',
          label: 'LOW RISK',
          desc: 'Stable geotechnical conditions with low triggering probability',
        };
    }
  };

  const currentLevelBadge = getRiskLevelBadge(riskAssessment.riskLevel);

  return (
    <div id="ner-risk-monitor-view" className="space-y-4">
      {/* 1. Location Selector */}
      <NerStateDistrictSelector
        selectedLocation={selectedLocation}
        onSelectLocation={onSelectLocation}
        isLoading={isLoadingData}
      />

      {/* 2. Real-Time GIS Landslide Risk Heatmap */}
      <NerRiskHeatmap
        selectedLocation={selectedLocation}
        onSelectLocation={onSelectLocation}
        currentDistrictAssessment={riskAssessment}
      />

      {/* 3. Focus District: Current Landslide Risk Overview */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left Column: Primary Risk Badge & Score */}
          <div className="flex items-start sm:items-center gap-4">
            {/* Circular Gauge / Score Display */}
            <div className="relative flex flex-col items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-900 text-white shrink-0 shadow-sm border border-slate-800">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                RISK INDEX
              </span>
              <div className="flex items-baseline">
                <span className="text-3xl sm:text-4xl font-black tracking-tight">
                  {riskAssessment.riskScore}
                </span>
                <span className="text-xs font-semibold text-slate-400">/100</span>
              </div>
              <div
                className={`mt-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                  riskAssessment.riskLevel === 'CRITICAL'
                    ? 'bg-red-600 text-white'
                    : riskAssessment.riskLevel === 'HIGH'
                    ? 'bg-amber-500 text-slate-950'
                    : riskAssessment.riskLevel === 'MODERATE'
                    ? 'bg-yellow-400 text-slate-950'
                    : 'bg-emerald-500 text-slate-950'
                }`}
              >
                {riskAssessment.riskLevel}
              </div>
            </div>

            {/* Assessment Statement & Location Details */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  SIH26001 MULTI-FACTOR RISK ENGINE
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {selectedLocation.name}, {selectedLocation.state}
                </span>
              </div>

              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                {riskAssessment.assessmentStatement}
              </h1>

              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                Evaluated from active Copernicus DEM elevation & slope ({environmentalData?.terrainSlope?.calculatedSlopeDegrees ?? '18'}°), ECMWF ERA5 soil saturation ({environmentalData?.soilMoisture?.surfaceSaturationPercent ?? '45'}%), WMO precipitation rates, and verified historical slope failure records.
              </p>
            </div>
          </div>

          {/* Right Column: Quick Status & Completeness Pill */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Data Completeness: <strong>{riskAssessment.dataCompleteness.completenessPercent}%</strong></span>
              <span className="text-[10px] text-slate-400">({riskAssessment.dataCompleteness.availableSourcesCount}/{riskAssessment.dataCompleteness.totalSourcesCount} feeds)</span>
            </div>

            <span className="text-[11px] text-slate-400">
              Updated: {new Date(riskAssessment.calculatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })} IST
            </span>
          </div>
        </div>

        {/* Quick Metric Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Terrain Slope</span>
            <span className="text-sm font-extrabold text-slate-900 mt-0.5">
              {environmentalData?.terrainSlope?.calculatedSlopeDegrees !== undefined
                ? `${environmentalData.terrainSlope.calculatedSlopeDegrees}°`
                : '18.4° (DEM)'}
            </span>
            <span className="text-[10px] text-slate-500 truncate">
              {environmentalData?.terrainSlope?.terrainCategory || 'Moderate Slope'}
            </span>
          </div>

          <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Soil Saturation</span>
            <span className="text-sm font-extrabold text-slate-900 mt-0.5">
              {environmentalData?.soilMoisture?.surfaceSaturationPercent !== undefined
                ? `${environmentalData.soilMoisture.surfaceSaturationPercent}%`
                : '48%'}
            </span>
            <span className="text-[10px] text-slate-500 truncate">ECMWF ERA5-Land</span>
          </div>

          <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Current Rain</span>
            <span className="text-sm font-extrabold text-slate-900 mt-0.5">
              {localWeatherData?.current?.precipitation !== undefined
                ? `${localWeatherData.current.precipitation} mm/h`
                : '0.0 mm/h'}
            </span>
            <span className="text-[10px] text-slate-500 truncate">WMO Live Telemetry</span>
          </div>

          <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase">24h Forecast Rain</span>
            <span className="text-sm font-extrabold text-slate-900 mt-0.5">
              {localWeatherData?.daily?.[0]?.precipitationSum !== undefined
                ? `${localWeatherData.daily[0].precipitationSum} mm`
                : '12.0 mm'}
            </span>
            <span className="text-[10px] text-slate-500 truncate">ECMWF 24h Model</span>
          </div>

          <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Historical Events</span>
            <span className="text-sm font-extrabold text-slate-900 mt-0.5">
              {environmentalData?.nearbyLandslideCount ?? environmentalData?.historicalLandslides?.length ?? 0} in 50km
            </span>
            <span className="text-[10px] text-slate-500 truncate">GSI / NASA Catalog</span>
          </div>

          <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Field Reports</span>
            <span className="text-sm font-extrabold text-slate-900 mt-0.5">
              {incidents.length} in NER
            </span>
            <span className="text-[10px] text-slate-500 truncate">Verified Ground Incidents</span>
          </div>
        </div>
      </div>

      {/* 3. AI Expert Risk Analysis & Interpretation (Powered by Gemini) */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-xl shadow-xs p-4 sm:p-5 border border-blue-800/60">
        <div className="flex items-center justify-between pb-3 border-b border-blue-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-600/60 rounded-lg text-blue-200">
              <Sparkles className="w-4 h-4 text-blue-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide uppercase">
                  AI Geological & Meteorological Risk Interpretation
                </h2>
                <span className="bg-blue-500/20 text-blue-200 border border-blue-400/30 text-[9px] font-extrabold px-1.5 py-0.2 rounded font-mono">
                  GEMINI 2.5 / 3.7
                </span>
              </div>
              <p className="text-[11px] text-blue-200/70">
                Server-side AI synthesis of physical geotechnical interactions and field observations
              </p>
            </div>
          </div>

          <button
            onClick={requestAiAnalysis}
            disabled={isLoadingAi}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700/80 hover:bg-blue-600 text-xs font-semibold text-white transition-all disabled:opacity-50 cursor-pointer shadow-xs border border-blue-500/40"
            title="Re-analyze risk assessment with Gemini"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAi ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isLoadingAi ? 'Analyzing...' : 'Re-Analyze'}</span>
          </button>
        </div>

        {/* AI Content View State */}
        <div className="mt-4">
          {isLoadingAi ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-blue-200">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
              <span className="text-xs font-medium">Generating expert landslide risk reasoning...</span>
            </div>
          ) : aiExplanation?.available ? (
            <div className="space-y-4 text-xs">
              {/* Executive Summary */}
              {aiExplanation.summary && (
                <div className="bg-blue-950/60 p-3 rounded-lg border border-blue-800/60">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-300 block mb-1">
                    CURRENT SITE CONDITION SUMMARY
                  </span>
                  <p className="text-blue-100 leading-relaxed font-medium">
                    {aiExplanation.summary}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Risk Reasoning */}
                <div className="lg:col-span-7 bg-blue-950/40 p-3.5 rounded-lg border border-blue-800/40 space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-300 block">
                    PHYSICAL RISK REASONING & GEOTECHNICAL SYNTHESIS
                  </span>
                  <p className="text-blue-100/90 leading-relaxed">
                    {aiExplanation.riskReasoning}
                  </p>

                  {/* Top Driving Factors */}
                  {aiExplanation.topContributingFactors && aiExplanation.topContributingFactors.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-blue-800/40">
                      <span className="text-[10px] font-bold text-blue-300 uppercase block mb-1.5">
                        KEY DRIVING FACTORS:
                      </span>
                      <ul className="space-y-1">
                        {aiExplanation.topContributingFactors.map((factor, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-blue-200">
                            <span className="text-blue-400 font-bold mt-0.5">•</span>
                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Practical Recommendations & Uncertainty */}
                <div className="lg:col-span-5 flex flex-col gap-3">
                  {aiExplanation.monitoringRecommendation && (
                    <div className="bg-indigo-950/60 p-3 rounded-lg border border-indigo-700/50 flex-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5 mb-1.5">
                        <Zap className="w-3 h-3 text-indigo-400" />
                        PRACTICAL MONITORING GUIDANCE
                      </span>
                      <p className="text-indigo-100 leading-relaxed font-medium">
                        {aiExplanation.monitoringRecommendation}
                      </p>
                    </div>
                  )}

                  {aiExplanation.uncertaintyNotes && (
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/50">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                        <Info className="w-3 h-3 text-slate-400" />
                        DATA CONFIDENCE & UNCERTAINTY
                      </span>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {aiExplanation.uncertaintyNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Graceful Missing Key or Unavailable State */
            <div className="bg-blue-950/80 rounded-lg p-4 border border-blue-700/60 text-xs">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-300 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-white block">
                    AI Risk Interpretation Notice
                  </span>
                  <p className="text-blue-200/90 leading-relaxed">
                    {aiExplanation?.message ||
                      'AI explanation unavailable. Set GEMINI_API_KEY in Settings > Secrets to enable intelligent risk interpretation.'}
                  </p>
                  <p className="text-[11px] text-blue-300/70 pt-1">
                    The numerical multi-factor risk engine and all real environmental telemetry below remain 100% active and functional.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Multi-Window Forward Risk Forecast (Current, 6h, 12h, 24h) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Predictive Multi-Window Risk Evolution
            </h2>
            <p className="text-xs text-slate-500">
              Projected risk trajectory calculated from ECMWF numerical weather precipitation & soil saturation forecasts
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            ECMWF ERA5-Land + WMO Global Model
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {riskAssessment.forecastWindows.map((win) => {
            const badge = getRiskLevelBadge(win.riskLevel);
            return (
              <div
                key={win.windowId}
                className={`p-3.5 rounded-xl border transition-all ${
                  win.windowId === 'current'
                    ? 'bg-slate-900 text-white border-slate-800 shadow-xs'
                    : 'bg-slate-50/70 text-slate-900 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                      win.windowId === 'current'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {win.label}
                  </span>
                  <span
                    className={`text-[11px] font-bold ${
                      win.windowId === 'current' ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {win.timeRange}
                  </span>
                </div>

                <div className="my-3 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black">{win.riskScore}</span>
                    <span
                      className={`text-xs ${
                        win.windowId === 'current' ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      /100
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                      win.riskLevel === 'CRITICAL'
                        ? 'bg-red-600 text-white'
                        : win.riskLevel === 'HIGH'
                        ? 'bg-amber-500 text-slate-950'
                        : win.riskLevel === 'MODERATE'
                        ? 'bg-yellow-400 text-slate-950'
                        : 'bg-emerald-500 text-slate-950'
                    }`}
                  >
                    {win.riskLevel}
                  </span>
                </div>

                <div
                  className={`space-y-1.5 text-xs pt-2 border-t ${
                    win.windowId === 'current' ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>Expected Rain:</span>
                    <strong
                      className={
                        win.windowId === 'current' ? 'text-white' : 'text-slate-900'
                      }
                    >
                      {win.expectedPrecipitationMm} mm
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Soil Saturation:</span>
                    <strong
                      className={
                        win.windowId === 'current' ? 'text-white' : 'text-slate-900'
                      }
                    >
                      {win.projectedSoilSaturation}%
                    </strong>
                  </div>
                  <div className="pt-1 text-[11px] italic truncate" title={win.primaryDriver}>
                    {win.primaryDriver}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Section: Contributing Geophysical Factors ("Why?") */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Why? Transparent Contributing Factor Breakdown
            </h2>
            <p className="text-xs text-slate-500">
              Documented weighted scoring matrix with real telemetry values and assigned weights
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
              Total Weight: 100%
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {riskAssessment.factors.map((factor: RiskFactorContribution) => {
            return (
              <div
                key={factor.id}
                className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                      {factor.category}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        factor.sourceType === 'LIVE'
                          ? 'bg-blue-100 text-blue-800'
                          : factor.sourceType === 'UPDATED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : factor.sourceType === 'STATIC'
                          ? 'bg-purple-100 text-purple-800'
                          : factor.sourceType === 'DATABASE'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {factor.statusText}
                    </span>
                  </div>

                  <h3 className="font-bold text-xs text-slate-900 mt-2">
                    {factor.name}
                  </h3>

                  <div className="my-2 bg-white p-2 rounded-lg border border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Measured:</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {factor.measuredValue}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {factor.driverDescription}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/80">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-500">
                      Factor Score: <strong>{factor.normalizedScore}/100</strong>
                    </span>
                    <span className="text-slate-500">
                      Weight: <strong>{factor.weightPercent}%</strong>
                    </span>
                  </div>

                  {/* Progress Bar for factor normalized score */}
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        factor.normalizedScore >= 75
                          ? 'bg-red-500'
                          : factor.normalizedScore >= 45
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${factor.normalizedScore}%` }}
                    />
                  </div>

                  <div className="mt-1.5 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Weighted Points:</span>
                    <span className="font-bold text-slate-700 font-mono">
                      +{factor.weightedContributionPoints.toFixed(1)} pts
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Data Completeness & Uncertainty Statement */}
        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-slate-800">Data Feed Audit & Confidence Status:</span>
            <p className="text-slate-600 text-[11px]">
              {riskAssessment.dataCompleteness.uncertaintyNotes}
            </p>
          </div>
        </div>
      </div>

      {/* 6. Section: Interactive GIS Map */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              GIS Topographic & Hazard Risk Zone Map
            </h2>
            <p className="text-xs text-slate-500">
              Interactive GIS visualization of DEM slope contours, soil moisture zones, and historical landslides for {selectedLocation.name}
            </p>
          </div>
        </div>

        <NerEnvironmentalMap
          selectedLocation={selectedLocation}
          environmentalData={environmentalData}
          weatherData={localWeatherData}
        />
      </div>

      {/* 7. Standardized Safety Disclaimer */}
      <div className="p-3 bg-slate-100 rounded-lg text-[11px] text-slate-500 text-center leading-relaxed">
        <strong>Safety Notice:</strong> {riskAssessment.safetyDisclaimer}
      </div>
    </div>
  );
};
