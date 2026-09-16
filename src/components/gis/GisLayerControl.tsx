import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Layers,
  MapPin,
  AlertTriangle,
  History,
  Radio,
  Route,
  Shield,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';

export interface GisLayerVisibility {
  incidents: boolean;
  riskZones: boolean;
  historicalLandslides: boolean;
  weatherStations: boolean;
  roadCorridors: boolean;
  boundaries: boolean;
}

interface GisLayerControlProps {
  layers: GisLayerVisibility;
  onToggleLayer: (layerKey: keyof GisLayerVisibility) => void;
  counts: {
    incidents: number;
    riskZones: number;
    historicalLandslides: number;
    weatherStations: number;
    roadCorridors: number;
  };
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const GisLayerControl: React.FC<GisLayerControlProps> = ({
  layers,
  onToggleLayer,
  counts,
  isOpen,
  onToggleOpen,
}) => {
  const { t } = useTranslation();
  const activeCount = Object.values(layers).filter(Boolean).length;

  const layerItems: Array<{
    key: keyof GisLayerVisibility;
    label: string;
    sublabel: string;
    count: number;
    icon: React.ReactNode;
    color: string;
  }> = [
    {
      key: 'incidents',
      label: t('gisMap.layerLiveIncidents', 'Live Incident Reports'),
      sublabel: t('gisMap.layerLiveIncidentsDesc', 'Verified & submitted hazard coords'),
      count: counts.incidents,
      icon: <MapPin className="w-3.5 h-3.5 text-rose-400" />,
      color: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
    },
    {
      key: 'riskZones',
      label: t('gisMap.layerRiskHeatmap', 'Landslide Risk Heatmap'),
      sublabel: t('gisMap.layerRiskHeatmapDesc', 'Critical & high vulnerability radii'),
      count: counts.riskZones,
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
      color: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    },
    {
      key: 'historicalLandslides',
      label: t('gisMap.layerHistoricalLandslides', 'Historical Landslides (GSI)'),
      sublabel: t('gisMap.layerHistoricalLandslidesDesc', 'Verified GSI & SDMA catalog events'),
      count: counts.historicalLandslides,
      icon: <History className="w-3.5 h-3.5 text-orange-400" />,
      color: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
    },
    {
      key: 'weatherStations',
      label: t('gisMap.layerImdStations', 'IMD Telemetry Stations'),
      sublabel: t('gisMap.layerImdStationsDesc', 'RMC, AWS & Agro-Met observatories'),
      count: counts.weatherStations,
      icon: <Radio className="w-3.5 h-3.5 text-cyan-400" />,
      color: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
    },
    {
      key: 'roadCorridors',
      label: t('gisMap.layerMountainRoads', 'Mountain Lifeline Roads'),
      sublabel: t('gisMap.layerMountainRoadsDesc', 'Strategic BRO / NHAI highway arteries'),
      count: counts.roadCorridors,
      icon: <Route className="w-3.5 h-3.5 text-indigo-400" />,
      color: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
    },
    {
      key: 'boundaries',
      label: t('gisMap.layerNerBoundaries', 'NER State Boundaries'),
      sublabel: t('gisMap.layerNerBoundariesDesc', '8 North Eastern Region jurisdictions'),
      count: 8,
      icon: <Shield className="w-3.5 h-3.5 text-teal-400" />,
      color: 'border-teal-500/40 bg-teal-500/10 text-teal-300',
    },
  ];

  return (
    <div className="relative">
      <button
        id="gis-layer-control-toggle"
        onClick={onToggleOpen}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold backdrop-blur-md transition-all shadow-lg cursor-pointer ${
          isOpen
            ? 'bg-blue-600 text-white border-blue-400 shadow-blue-500/20'
            : 'bg-slate-900/90 text-slate-200 border-slate-700/80 hover:bg-slate-800 hover:text-white'
        }`}
        title={t('gisMap.toggleLayersTitle', 'Toggle GIS Data Layers')}
      >
        <Layers className="w-3.5 h-3.5 text-blue-400" />
        <span className="hidden sm:inline">{t('gisMap.gisLayers', 'GIS Layers')}</span>
        <span className="px-1.5 py-0.2 bg-blue-500/30 border border-blue-400/40 rounded-full text-[10px] font-mono">
          {activeCount} {t('gisMap.activeCount', 'active')}
        </span>
      </button>

      {isOpen && (
        <div
          id="gis-layer-control-panel"
          className="absolute top-10 right-0 w-72 sm:w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl p-3 z-[1000] text-slate-100 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                {t('gisMap.activeGisLayers', 'Active GIS Data Layers')}
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Live Geo-Telemetry
            </span>
          </div>

          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            {layerItems.map((item) => {
              const isEnabled = layers[item.key];
              return (
                <button
                  key={item.key}
                  id={`gis-toggle-layer-${item.key}`}
                  onClick={() => onToggleLayer(item.key)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left cursor-pointer group ${
                    isEnabled
                      ? 'bg-slate-800/80 border-slate-600/70 hover:bg-slate-800'
                      : 'bg-slate-950/40 border-slate-800/60 opacity-60 hover:opacity-90'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center border shrink-0 ${item.color}`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-200 truncate">
                          {item.label}
                        </span>
                        {item.count > 0 && (
                          <span className="px-1.5 py-0.2 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-slate-300">
                            {item.count}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">
                        {item.sublabel}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 ml-2">
                    {isEnabled ? (
                      <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-xs">
                        <Check className="w-3 h-3" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-md border border-slate-700 bg-slate-900 flex items-center justify-center text-slate-500">
                        <EyeOff className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span>{t('gisMap.onlyDisplayingAvailable', 'Only displaying available backend data')}</span>
            <span className="text-blue-400 font-mono">SIH26001 GIS</span>
          </div>
        </div>
      )}
    </div>
  );
};
