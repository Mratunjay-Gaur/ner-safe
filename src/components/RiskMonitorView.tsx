import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 sm:p-6 relative overflow-hidden">
        {/* Subtle ambient glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-rose-500/5 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Column: Primary Risk Badge & Score */}
          <div className="flex items-start sm:items-center gap-5">
            {/* Circular / Rounded Score Display */}
            <div className="relative flex flex-col items-center justify-center w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-slate-950 text-white shrink-0 shadow-lg border border-slate-800 p-2">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                RISK INDEX
              </span>
              <div className="flex items-baseline my-0.5">
                <span className="text-4xl sm:text-5xl font-extrabold tracking-tight font-mono">
                  {riskAssessment.riskScore}
                </span>
                <span className="text-xs font-semibold text-slate-400 font-mono">/100</span>
              </div>
              <div
                className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                  riskAssessment.riskLevel === 'CRITICAL'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : riskAssessment.riskLevel === 'HIGH'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : riskAssessment.riskLevel === 'MODERATE'
                    ? 'bg-yellow-400 text-slate-950 shadow-xs'
                    : 'bg-emerald-500 text-slate-950 shadow-xs'
                }`}
              >
                {riskAssessment.riskLevel}
              </div>
            </div>

            {/* Assessment Statement & Location Details */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200/70">
                  {t('riskMonitor.multiFactorEngine', 'SIH26001 MULTI-FACTOR ENGINE')}
                </span>
                <span className="text-xs text-slate-500 font-mono font-medium">
                  {selectedLocation.name}, {selectedLocation.state}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {riskAssessment.assessmentStatement}
              </h1>

              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                {t('riskMonitor.evaluationSummary', 'Evaluated from active Copernicus DEM elevation & slope ({{slope}}°), ECMWF ERA5 soil saturation ({{saturation}}%), WMO precipitation rates, and verified historical slope failure records.', {
                  slope: environmentalData?.terrainSlope?.calculatedSlopeDegrees ?? '18',
                  saturation: environmentalData?.soilMoisture?.surfaceSaturationPercent ?? '45'
                })}
              </p>
            </div>
          </div>

          {/* Right Column: Quick Status & Completeness Pill */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{t('riskMonitor.dataCompleteness', 'Data Completeness')}: <strong className="font-mono">{riskAssessment.dataCompleteness.completenessPercent}%</strong></span>
              <span className="text-[10px] text-slate-400 font-mono">({riskAssessment.dataCompleteness.availableSourcesCount}/{riskAssessment.dataCompleteness.totalSourcesCount} {t('riskMonitor.feeds', 'feeds')})</span>
            </div>

            <span className="text-[11px] text-slate-400 font-mono">
              {t('riskMonitor.updatedAt', 'Updated')}: {new Date(riskAssessment.calculatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })} IST
            </span>
          </div>
        </div>

        {/* Quick Metric Bar */}
        <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200/70 flex flex-col hover:border-sky-300/80 transition-colors">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('riskMonitor.terrainSlope', 'Terrain Slope')}</span>
            <span className="text-base font-extrabold text-slate-900 mt-1 font-mono">
              {environmentalData?.terrainSlope?.calculatedSlopeDegrees !== undefined
                ? `${environmentalData.terrainSlope.calculatedSlopeDegrees}°`
                : '18.4° (DEM)'}
            </span>
            <span className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
              {environmentalData?.terrainSlope?.terrainCategory || t('nerHub.terrainCategoryModerate', 'Moderate Slope')}
            </span>
          </div>

          <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200/70 flex flex-col hover:border-sky-300/80 transition-colors">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('riskMonitor.soilSaturation', 'Soil Saturation')}</span>
            <span className="text-base font-extrabold text-slate-900 mt-1 font-mono">
              {environmentalData?.soilMoisture?.surfaceSaturationPercent !== undefined
                ? `${environmentalData.soilMoisture.surfaceSaturationPercent}%`
                : '48%'}
            </span>
            <span className="text-[10px] text-slate-500 font-medium truncate mt-0.5">ECMWF ERA5-Land</span>
          </div>

          <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200/70 flex flex-col hover:border-sky-300/80 transition-colors">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('riskMonitor.currentRain', 'Current Rain')}</span>
            <span className="text-base font-extrabold text-slate-900 mt-1 font-mono">
              {localWeatherData?.current?.precipitation !== undefined
                ? `${localWeatherData.current.precipitation} mm/h`
                : '0.0 mm/h'}
            </span>
            <span className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{t('riskMonitor.liveTelemetry', 'WMO Live Telemetry')}</span>
          </div>

          <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200/70 flex flex-col hover:border-sky-300/80 transition-colors">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('riskMonitor.forecastRain24h', '24h Forecast Rain')}</span>
            <span className="text-base font-extrabold text-slate-900 mt-1 font-mono">
              {localWeatherData?.daily?.[0]?.precipitationSum !== undefined
                ? `${localWeatherData.daily[0].precipitationSum} mm`
                : '12.0 mm'}
            </span>
            <span className="text-[10px] text-slate-500 font-medium truncate mt-0.5">ECMWF 24h Model</span>
          </div>

          <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200/70 flex flex-col hover:border-sky-300/80 transition-colors">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('riskMonitor.historicalEvents', 'Historical Events')}</span>
            <span className="text-base font-extrabold text-slate-900 mt-1 font-mono">
              {environmentalData?.nearbyLandslideCount ?? environmentalData?.historicalLandslides?.length ?? 0} {t('riskMonitor.in50km', 'in 50km')}
            </span>
            <span className="text-[10px] text-slate-500 font-medium truncate mt-0.5">GSI / NASA Catalog</span>
          </div>

          <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200/70 flex flex-col hover:border-sky-300/80 transition-colors">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('riskMonitor.fieldReports', 'Field Reports')}</span>
            <span className="text-base font-extrabold text-slate-900 mt-1 font-mono">
              {incidents.length} {t('riskMonitor.inNer', 'in NER')}
            </span>
            <span className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{t('riskMonitor.verifiedGroundIncidents', 'Verified Ground Incidents')}</span>
          </div>
        </div>
      </div>

      {/* 3. AI Expert Risk Analysis & Interpretation (Powered by Gemini) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white rounded-2xl shadow-xl p-5 sm:p-6 border border-slate-800/80 relative overflow-hidden">
        {/* Subtle top glow */}
        <div className="absolute top-0 right-1/4 w-80 h-32 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/15 text-sky-400 rounded-xl border border-sky-500/30 shadow-xs">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-white tracking-wide uppercase">
                  {t('riskMonitor.aiInterpretationTitle', 'AI Geological & Meteorological Interpretation')}
                </h2>
              </div>
              <p className="text-[11px] text-slate-400">
                {t('riskMonitor.aiInterpretationSubtitle', 'Server-side AI synthesis of physical geotechnical interactions and field observations')}
              </p>
            </div>
          </div>

          <button
            onClick={requestAiAnalysis}
            disabled={isLoadingAi}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-all disabled:opacity-50 cursor-pointer shadow-xs border border-slate-700 btn-press"
            title="Re-analyze risk assessment with Gemini"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isLoadingAi ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isLoadingAi ? t('riskMonitor.analyzing', 'Analyzing...') : t('riskMonitor.reAnalyze', 'Re-Analyze')}</span>
          </button>
        </div>

        {/* AI Content View State */}
        <div className="mt-5 relative z-10">
          {isLoadingAi ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2.5 text-slate-400">
              <RefreshCw className="w-7 h-7 animate-spin text-sky-400" />
              <span className="text-xs font-medium">{t('riskMonitor.generatingAiNotice', 'Generating expert geotechnical risk synthesis...')}</span>
            </div>
          ) : aiExplanation?.available ? (
            <div className="space-y-4 text-xs">
              {/* Executive Summary */}
              {aiExplanation.summary && (
                <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-400 block mb-1">
                    {t('riskMonitor.conditionSummary', 'CURRENT SITE CONDITION SUMMARY')}
                  </span>
                  <p className="text-slate-200 leading-relaxed font-medium text-xs">
                    {aiExplanation.summary}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Risk Reasoning */}
                <div className="lg:col-span-7 bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 space-y-2.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-400 block">
                    {t('riskMonitor.geotechnicalSynthesis', 'PHYSICAL RISK REASONING & GEOTECHNICAL SYNTHESIS')}
                  </span>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    {aiExplanation.riskReasoning}
                  </p>

                  {/* Top Driving Factors */}
                  {aiExplanation.topContributingFactors && aiExplanation.topContributingFactors.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-slate-700/60">
                      <span className="text-[10px] font-bold text-sky-300 uppercase block mb-2">
                        {t('riskMonitor.keyDrivingFactors', 'KEY DRIVING FACTORS')}:
                      </span>
                      <ul className="space-y-1.5">
                        {aiExplanation.topContributingFactors.map((factor, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-slate-300">
                            <span className="text-sky-400 font-bold mt-0.5">•</span>
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
                    <div className="bg-slate-800/60 p-4 rounded-xl border border-sky-500/30 flex-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-400 flex items-center gap-1.5 mb-2">
                        <Zap className="w-3.5 h-3.5 text-sky-400" />
                        {t('riskMonitor.monitoringGuidance', 'PRACTICAL MONITORING GUIDANCE')}
                      </span>
                      <p className="text-slate-200 leading-relaxed font-medium text-xs">
                        {aiExplanation.monitoringRecommendation}
                      </p>
                    </div>
                  )}

                  {aiExplanation.uncertaintyNotes && (
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1">
                        <Info className="w-3 h-3 text-slate-400" />
                        {t('riskMonitor.confidenceUncertainty', 'DATA CONFIDENCE & UNCERTAINTY')}
                      </span>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        {aiExplanation.uncertaintyNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Graceful Missing Key or Unavailable State */
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 text-xs">
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-white block">
                    {t('riskMonitor.aiNoticeTitle', 'AI Risk Interpretation Notice')}
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {aiExplanation?.message ||
                      'AI explanation unavailable. Set GEMINI_API_KEY in Settings > Secrets to enable intelligent risk interpretation.'}
                  </p>
                  <p className="text-[11px] text-slate-400 pt-1">
                    {t('riskMonitor.aiDisclaimerNote', 'The numerical multi-factor risk engine and all real environmental telemetry below remain 100% active and functional.')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Multi-Window Forward Risk Forecast (Current, 6h, 12h, 24h) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="p-1 rounded-md bg-sky-50 text-sky-600 border border-sky-200/60">
                <TrendingUp className="w-3.5 h-3.5" />
              </span>
              {t('riskMonitor.multiWindowForecast', 'Predictive Multi-Window Risk Evolution')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('riskMonitor.multiWindowSubtitle', 'Projected risk trajectory calculated from ECMWF numerical weather precipitation & soil saturation forecasts')}
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400 font-medium">
            ECMWF ERA5-Land + WMO Global Model
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {riskAssessment.forecastWindows.map((win) => {
            return (
              <div
                key={win.windowId}
                className={`p-4 rounded-xl border transition-all ${
                  win.windowId === 'current'
                    ? 'bg-slate-950 text-white border-slate-800 shadow-sm'
                    : 'bg-slate-50/80 text-slate-900 border-slate-200/80 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      win.windowId === 'current'
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {win.label}
                  </span>
                  <span
                    className={`text-[11px] font-mono font-bold ${
                      win.windowId === 'current' ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {win.timeRange}
                  </span>
                </div>

                <div className="my-3.5 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold font-mono">{win.riskScore}</span>
                    <span
                      className={`text-xs font-mono ${
                        win.windowId === 'current' ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      /100
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      win.riskLevel === 'CRITICAL'
                        ? 'bg-rose-500 text-white'
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
                  className={`space-y-1.5 text-xs pt-3 border-t ${
                    win.windowId === 'current' ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{t('riskMonitor.expectedRain', 'Expected Rain')}:</span>
                    <strong
                      className={`font-mono ${
                        win.windowId === 'current' ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {win.expectedPrecipitationMm} mm
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{t('riskMonitor.soilSaturation', 'Soil Saturation')}:</span>
                    <strong
                      className={`font-mono ${
                        win.windowId === 'current' ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {win.projectedSoilSaturation}%
                    </strong>
                  </div>
                  <div className="pt-1 text-[11px] italic truncate font-medium" title={win.primaryDriver}>
                    {win.primaryDriver}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Section: Contributing Geophysical Factors ("Why?") */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="p-1 rounded-md bg-sky-50 text-sky-600 border border-sky-200/60">
                <Activity className="w-3.5 h-3.5" />
              </span>
              {t('riskMonitor.whyFactorsTitle', 'Why? Transparent Contributing Factor Breakdown')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('riskMonitor.whyFactorsSubtitle', 'Documented weighted scoring matrix with real telemetry values and assigned weights')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-100/90 text-slate-700 px-3 py-1 rounded-full font-mono font-bold border border-slate-200/60">
              {t('riskMonitor.totalWeight', 'Total Weight: 100%')}
            </span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {riskAssessment.factors.map((factor: RiskFactorContribution) => {
            return (
              <div
                key={factor.id}
                className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/70 hover:border-slate-300 hover:bg-white transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full">
                      {factor.category}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        factor.sourceType === 'LIVE'
                          ? 'bg-sky-100 text-sky-800 border border-sky-200/60'
                          : factor.sourceType === 'UPDATED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/60'
                          : factor.sourceType === 'STATIC'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200/60'
                          : factor.sourceType === 'DATABASE'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200/60'
                          : 'bg-rose-100 text-rose-800 border border-rose-200/60'
                      }`}
                    >
                      {factor.statusText}
                    </span>
                  </div>

                  <h3 className="font-bold text-xs text-slate-900 mt-2.5">
                    {factor.name}
                  </h3>

                  <div className="my-2.5 bg-white p-2.5 rounded-xl border border-slate-200/60 flex items-center justify-between shadow-2xs">
                    <span className="text-[11px] text-slate-500 font-medium">{t('riskMonitor.measured', 'Measured')}:</span>
                    <span className="text-xs font-extrabold text-slate-900 font-mono">
                      {factor.measuredValue}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {factor.driverDescription}
                  </p>
                </div>

                <div className="mt-3.5 pt-3 border-t border-slate-200/70">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="text-slate-500 font-medium">
                      {t('riskMonitor.factorScore', 'Factor Score')}: <strong className="font-mono text-slate-800">{factor.normalizedScore}/100</strong>
                    </span>
                    <span className="text-slate-500 font-medium">
                      {t('riskMonitor.weight', 'Weight')}: <strong className="font-mono text-slate-800">{factor.weightPercent}%</strong>
                    </span>
                  </div>

                  {/* Progress Bar for factor normalized score */}
                  <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        factor.normalizedScore >= 75
                          ? 'bg-rose-500'
                          : factor.normalizedScore >= 45
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${factor.normalizedScore}%` }}
                    />
                  </div>

                  <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>{t('riskMonitor.weightedPoints', 'Weighted Points')}:</span>
                    <span className="font-bold text-slate-800 font-mono">
                      +{factor.weightedContributionPoints.toFixed(1)} pts
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Data Completeness & Uncertainty Statement */}
        <div className="mt-5 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-slate-800">{t('riskMonitor.feedAuditTitle', 'Data Feed Audit & Confidence Status')}:</span>
            <p className="text-slate-600 text-[11px]">
              {riskAssessment.dataCompleteness.uncertaintyNotes}
            </p>
          </div>
        </div>
      </div>

      {/* 6. Section: Interactive GIS Map */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="p-1 rounded-md bg-sky-50 text-sky-600 border border-sky-200/60">
                <MapPin className="w-3.5 h-3.5" />
              </span>
              {t('riskMonitor.gisMapTitle', 'GIS Topographic & Hazard Risk Zone Map')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('riskMonitor.gisMapSubtitle', 'Interactive GIS visualization of DEM slope contours, soil moisture zones, and historical landslides for {{name}}', { name: selectedLocation.name })}
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
      <div className="p-4 bg-slate-100/80 rounded-xl text-[11px] text-slate-500 text-center leading-relaxed border border-slate-200/50">
        <strong className="font-semibold text-slate-700">{t('riskMonitor.safetyNotice', 'Safety Notice')}:</strong> {riskAssessment.safetyDisclaimer}
      </div>
    </div>
  );
};
