import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { GisLayerVisibility } from './GisLayerControl';

interface GisLegendProps {
  layers: GisLayerVisibility;
}

export const GisLegend: React.FC<GisLegendProps> = ({ layers }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Collect active legend items based strictly on active layers
  const activeItems: Array<{
    id: string;
    symbol: React.ReactNode;
    label: string;
    description: string;
  }> = [];

  if (layers.incidents) {
    activeItems.push({
      id: 'leg-inc-critical',
      symbol: (
        <span className="relative flex h-3 w-3 items-center justify-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600 border border-white"></span>
        </span>
      ),
      label: t('gisMap.legendCriticalIncident', 'Critical / Verified Incident'),
      description: t('gisMap.legendCriticalDesc', 'Reported landslide / severe hazard'),
    });
    activeItems.push({
      id: 'leg-inc-moderate',
      symbol: (
        <span className="inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 border border-slate-900"></span>
      ),
      label: t('gisMap.legendSubmittedReport', 'Submitted Hazard Report'),
      description: t('gisMap.legendSubmittedDesc', 'Ground crack, water seepage, rockfall'),
    });
  }

  if (layers.riskZones) {
    activeItems.push({
      id: 'leg-risk-critical',
      symbol: (
        <span className="w-3.5 h-3.5 rounded-full border border-rose-500 bg-rose-500/30 flex items-center justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
        </span>
      ),
      label: t('gisMap.legendRiskCritical', 'Critical Risk Zone (Score 80-100)'),
      description: t('gisMap.legendRiskCriticalDesc', 'High slope saturation & precipitation'),
    });
    activeItems.push({
      id: 'leg-risk-high',
      symbol: (
        <span className="w-3.5 h-3.5 rounded-full border border-orange-500 bg-orange-500/30 flex items-center justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
        </span>
      ),
      label: t('gisMap.legendRiskHigh', 'High Risk Zone (Score 60-79)'),
      description: t('gisMap.legendRiskHighDesc', 'Elevated hydro-geological susceptibility'),
    });
    activeItems.push({
      id: 'leg-risk-mod',
      symbol: (
        <span className="w-3.5 h-3.5 rounded-full border border-amber-500 bg-amber-500/30 flex items-center justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        </span>
      ),
      label: t('gisMap.legendRiskMod', 'Moderate Risk Zone (Score 40-59)'),
      description: t('gisMap.legendRiskModDesc', 'Precautionary slope surveillance'),
    });
  }

  if (layers.historicalLandslides) {
    activeItems.push({
      id: 'leg-hist-ls',
      symbol: (
        <span className="w-3 h-3 rounded-sm bg-orange-600 border border-orange-300 flex items-center justify-center text-[8px] font-bold text-white">
          ⚠
        </span>
      ),
      label: t('gisMap.legendHistoricalLandslide', 'Historical Landslide (GSI/SDMA)'),
      description: t('gisMap.legendHistoricalDesc', 'Catalogued failure location & impact'),
    });
  }

  if (layers.weatherStations) {
    activeItems.push({
      id: 'leg-ws',
      symbol: (
        <span className="w-3 h-3 rounded-full bg-cyan-500 border border-cyan-200 flex items-center justify-center">
          <span className="w-1 h-1 rounded-full bg-slate-900"></span>
        </span>
      ),
      label: t('gisMap.legendImdWeatherStation', 'IMD Weather / AWS Station'),
      description: t('gisMap.legendImdDesc', 'Surface meteorological telemetry'),
    });
  }

  if (layers.roadCorridors) {
    activeItems.push({
      id: 'leg-road',
      symbol: (
        <span className="w-4 h-1.5 rounded bg-indigo-500 border-t border-b border-indigo-300 inline-block"></span>
      ),
      label: t('gisMap.legendMountainHighway', 'Mountain Lifeline Highway'),
      description: t('gisMap.legendMountainHighwayDesc', 'Strategic BRO / NHAI arterial corridor'),
    });
  }

  if (layers.boundaries) {
    activeItems.push({
      id: 'leg-boundary',
      symbol: (
        <span className="w-4 h-1.5 rounded border border-dashed border-teal-400 bg-teal-500/20 inline-block"></span>
      ),
      label: t('gisMap.legendNerBoundary', 'NER State Boundary'),
      description: t('gisMap.legendNerBoundaryDesc', 'Inter-state administrative jurisdiction'),
    });
  }

  // If no layers active
  if (activeItems.length === 0) {
    return null;
  }

  return (
    <div
      id="gis-map-legend"
      className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-xl overflow-hidden transition-all text-slate-200 text-xs w-64 sm:w-72"
    >
      <button
        id="gis-legend-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/80 hover:bg-slate-800 cursor-pointer border-b border-slate-700/60"
      >
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-300">
          <Info className="w-3.5 h-3.5 text-blue-400" />
          <span>{t('gisMap.activeMapLegend', 'Active Map Legend')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 font-mono">
            {activeItems.length} {t('gisMap.activeCount', 'active')}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="p-2.5 space-y-2 max-h-56 overflow-y-auto pr-1 divide-y divide-slate-800/60">
          {activeItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2.5 pt-1.5 first:pt-0"
            >
              <div className="mt-0.5 shrink-0 flex items-center justify-center w-4 h-4">
                {item.symbol}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-[11px] text-slate-200 leading-tight">
                  {item.label}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  {item.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
