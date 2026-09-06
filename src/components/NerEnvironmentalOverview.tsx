import React from 'react';
import {
  Mountain,
  Droplets,
  Satellite,
  Compass,
  AlertTriangle,
  Radio,
  Clock,
  Layers,
  Thermometer,
  CloudRain,
  Wind,
  Info,
  Calendar,
  Eye,
} from 'lucide-react';
import { LocationItem, WeatherResponse } from '../types/weather';
import { DistrictEnvironmentalProfile, HistoricalLandslideRecord } from '../types/environmental';

interface NerEnvironmentalOverviewProps {
  location: LocationItem;
  environmentalData: DistrictEnvironmentalProfile | null;
  weatherData: WeatherResponse | null;
  isLoading: boolean;
  onViewLandslidesClick?: () => void;
}

export const NerEnvironmentalOverview: React.FC<NerEnvironmentalOverviewProps> = ({
  location,
  environmentalData,
  weatherData,
  isLoading,
  onViewLandslidesClick,
}) => {
  const sm = environmentalData?.soilMoisture;
  const slope = environmentalData?.terrainSlope;
  const sat = environmentalData?.satelliteObservation;
  const landslides = environmentalData?.historicalLandslides || [];
  const current = weatherData?.current;

  // Slope Severity Color
  const getSlopeBadgeColor = (deg: number) => {
    if (deg >= 35) return 'bg-rose-100 text-rose-800 border-rose-200';
    if (deg >= 20) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (deg >= 10) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  };

  // Soil Moisture Saturation Badge
  const getMoistureBadgeColor = (satPct: number) => {
    if (satPct >= 80) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (satPct >= 55) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (satPct >= 30) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-orange-100 text-orange-800 border-orange-200';
  };

  return (
    <div id="ner-environmental-overview-grid" className="space-y-4">
      {/* 4-Card Primary Monitoring Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Atmospheric Weather */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Atmospheric Weather</span>
              </div>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                LIVE
              </span>
            </div>

            <div className="my-3">
              {current ? (
                <>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {current.temperature}°C
                    </span>
                    <span className="text-xs font-bold text-slate-600">
                      {current.weatherCondition}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-medium block">Precipitation</span>
                      <span className="font-bold text-slate-800 text-sm">{current.precipitation} mm/h</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-medium block">Relative Humidity</span>
                      <span className="font-bold text-slate-800 text-sm">{current.relativeHumidity}%</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-4 text-center">
                  <span className="text-xs font-bold text-slate-400">Data unavailable</span>
                  <span className="text-[10px] text-slate-400 block mt-1">Awaiting meteorological response</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-1 text-[10px] text-slate-500">
            <div className="flex items-center justify-between">
              <span className="font-medium">Source:</span>
              <span className="font-semibold text-slate-700">WMO / ECMWF Network</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Last Obs:</span>
              <span className="font-mono text-slate-700">{current?.updatedAt ? new Date(current.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unavailable'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Connection:</span>
              <span className={`font-bold ${current ? 'text-emerald-700' : 'text-amber-600'}`}>{current ? 'Connected' : 'Reconnecting...'}</span>
            </div>
          </div>
        </div>

        {/* 2. Real Volumetric Soil Moisture */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Soil Moisture (0-100cm)</span>
              </div>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                UPDATED
              </span>
            </div>

            <div className="my-3">
              {sm ? (
                <>
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        {(sm.depth0to7cm * 100).toFixed(1)}
                      </span>
                      <span className="text-xs font-bold text-slate-500">% vol</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${getMoistureBadgeColor(sm.surfaceSaturationPercent)}`}>
                      {sm.surfaceSaturationPercent}% Saturation
                    </span>
                  </div>

                  {/* Depth breakdown */}
                  <div className="grid grid-cols-3 gap-1.5 mt-3 text-[10px] text-center">
                    <div className="bg-slate-50 p-1.5 rounded-md border border-slate-100">
                      <span className="text-slate-400 block font-medium">0–7 cm</span>
                      <span className="font-bold text-slate-800">{(sm.depth0to7cm * 100).toFixed(0)}%</span>
                    </div>
                    <div className="bg-slate-50 p-1.5 rounded-md border border-slate-100">
                      <span className="text-slate-400 block font-medium">7–28 cm</span>
                      <span className="font-bold text-slate-800">{(sm.depth7to28cm * 100).toFixed(0)}%</span>
                    </div>
                    <div className="bg-slate-50 p-1.5 rounded-md border border-slate-100">
                      <span className="text-slate-400 block font-medium">28–100 cm</span>
                      <span className="font-bold text-slate-800">{(sm.depth28to100cm * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-4 text-center">
                  <span className="text-xs font-bold text-slate-400">Data unavailable</span>
                  <span className="text-[10px] text-slate-400 block mt-1">ECMWF ERA5-Land feed unreachable</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-1 text-[10px] text-slate-500">
            <div className="flex items-center justify-between">
              <span className="font-medium">Source:</span>
              <span className="font-semibold text-slate-700">ECMWF ERA5-Land</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Last Obs:</span>
              <span className="font-mono text-slate-700">{sm?.observationTimestamp ? sm.observationTimestamp.slice(0, 16).replace('T', ' ') : 'Unavailable'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Connection:</span>
              <span className={`font-bold ${sm ? 'text-emerald-700' : 'text-amber-600'}`}>{sm ? 'Active' : 'Offline'}</span>
            </div>
          </div>
        </div>

        {/* 3. Real DEM Elevation & Calculated Slope */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Mountain className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Terrain & Calculated Slope</span>
              </div>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                STATIC DEM
              </span>
            </div>

            <div className="my-3">
              {slope ? (
                <>
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        {slope.calculatedSlopeDegrees}°
                      </span>
                      <span className="text-xs font-bold text-slate-500 font-mono">({slope.slopePercentage}% Grade)</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${getSlopeBadgeColor(slope.calculatedSlopeDegrees)}`}>
                      {slope.terrainCategory}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-medium block">Elevation MSL</span>
                      <span className="font-bold text-slate-800 text-sm">{slope.elevationMeters}m</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-medium block">Slope Aspect</span>
                      <span className="font-bold text-slate-800 text-sm">{slope.aspectCardinal} ({slope.aspectDegrees}°)</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-4 text-center">
                  <span className="text-xs font-bold text-slate-400">Data unavailable</span>
                  <span className="text-[10px] text-slate-400 block mt-1">Copernicus DEM query unreachable</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-1 text-[10px] text-slate-500">
            <div className="flex items-center justify-between">
              <span className="font-medium">Source:</span>
              <span className="font-semibold text-slate-700">Copernicus 30m DEM</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Calculation:</span>
              <span className="font-mono text-slate-700">Horn Gradient Matrix</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Connection:</span>
              <span className={`font-bold ${slope ? 'text-emerald-700' : 'text-amber-600'}`}>{slope ? 'Active' : 'Offline'}</span>
            </div>
          </div>
        </div>

        {/* 4. Latest Available Satellite Observation */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Satellite className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Satellite Observation</span>
              </div>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                UPDATED
              </span>
            </div>

            <div className="my-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-extrabold text-slate-900 tracking-tight truncate max-w-[170px]">
                  {sat?.satelliteName.split('&')[0] || 'Sentinel-2 MSI'}
                </span>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                  {sat?.utmZone || 'UTM 45N'}
                </span>
              </div>

              <div className="space-y-1.5 mt-3 text-xs">
                <div className="flex items-center justify-between text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100">
                  <span className="text-slate-500">Spatial Resolution:</span>
                  <span className="font-bold text-slate-800">{sat?.spatialResolution || '10m Optical'}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100">
                  <span className="text-slate-500">Constellation Revisit:</span>
                  <span className="font-bold text-slate-800">{sat?.revisitInterval || '5 Days'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-1 text-[10px] text-slate-500">
            <div className="flex items-center justify-between">
              <span className="font-medium">Source:</span>
              <span className="font-semibold text-slate-700">ESA Copernicus & ESRI</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Granule Tile:</span>
              <span className="font-mono text-slate-700">{sat?.granuleOrTileId || 'T45RBF'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Connection:</span>
              <span className="font-bold text-emerald-700">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Verified Historical Landslide Catalog Highlight Banner for the District */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-red-50 text-red-700 border border-red-200 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-red-100 text-red-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider">
                  HISTORICAL RECORDS
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  Verified Landslide Inventory: {location.name} & {location.state}
                </h3>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {landslides.length > 0
                  ? `Found ${landslides.length} documented historical landslide incident(s) in this sector from Geological Survey of India (GSI) NLSM and NASA Global Landslide Catalog.`
                  : `No high-casualty historical landslide events cataloged for this immediate district centroid; ${environmentalData?.nearbyLandslideCount || 0} recorded in the broader state corridor.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onViewLandslidesClick}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Inspect GSI Catalog ({landslides.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
