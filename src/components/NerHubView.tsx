import React, { useState, useEffect, useCallback } from 'react';
import { LocationItem, WeatherResponse } from '../types/weather';
import { DistrictEnvironmentalProfile, HistoricalLandslideRecord } from '../types/environmental';
import { fetchDistrictEnvironmentalProfile } from '../services/environmentalService';
import { fetchDistrictWeather } from '../services/weatherService';
import { NerStateDistrictSelector } from './NerStateDistrictSelector';
import { NerEnvironmentalOverview } from './NerEnvironmentalOverview';
import { NerEnvironmentalMap } from './NerEnvironmentalMap';
import { NerHistoricalLandslidesList } from './NerHistoricalLandslidesList';
import { NerDataSourcesAudit } from './NerDataSourcesAudit';
import { Loader2, RefreshCw, Layers, AlertTriangle, X, MapPin, Calendar, FileText } from 'lucide-react';

interface NerHubViewProps {
  selectedLocation: LocationItem;
  onSelectLocation: (location: LocationItem) => void;
  weatherData: WeatherResponse | null;
}

export const NerHubView: React.FC<NerHubViewProps> = ({
  selectedLocation,
  onSelectLocation,
  weatherData,
}) => {
  const [environmentalData, setEnvironmentalData] = useState<DistrictEnvironmentalProfile | null>(null);
  const [isLoadingEnv, setIsLoadingEnv] = useState<boolean>(true);
  const [selectedLandslide, setSelectedLandslide] = useState<HistoricalLandslideRecord | null>(null);
  const landslidesCatalogRef = React.useRef<HTMLDivElement>(null);

  // Load environmental & terrain telemetry whenever selectedLocation changes or updates
  const loadEnvironmentalData = useCallback(async (loc: LocationItem) => {
    setIsLoadingEnv(true);
    try {
      const data = await fetchDistrictEnvironmentalProfile(loc, weatherData?.current?.updatedAt);
      setEnvironmentalData(data);
    } catch (err) {
      console.error('Failed to load district environmental profile:', err);
    } finally {
      setIsLoadingEnv(false);
    }
  }, [weatherData?.current?.updatedAt]);

  useEffect(() => {
    loadEnvironmentalData(selectedLocation);

    // Auto-refresh periodic telemetry every 3 minutes (180,000ms)
    const interval = setInterval(() => {
      loadEnvironmentalData(selectedLocation);
    }, 180000);

    return () => clearInterval(interval);
  }, [selectedLocation, loadEnvironmentalData]);

  const handleScrollToLandslides = () => {
    landslidesCatalogRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div id="ner-hub-view-container" className="space-y-4">
      {/* 1. NER State & District Hierarchy Selector */}
      <NerStateDistrictSelector
        selectedLocation={selectedLocation}
        onSelectLocation={onSelectLocation}
        isLoading={isLoadingEnv}
      />

      {/* 2. Top-Level Metrics Overview Grid */}
      <NerEnvironmentalOverview
        location={selectedLocation}
        environmentalData={environmentalData}
        weatherData={weatherData}
        isLoading={isLoadingEnv}
        onViewLandslidesClick={handleScrollToLandslides}
      />

      {/* 3. Selected Historical Landslide Floating Detail Drawer */}
      {selectedLandslide && (
        <div className="bg-red-50/70 border border-red-200 rounded-xl p-3.5 shadow-xs transition-all animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-red-600 text-white rounded-lg shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                    Selected Historical Incident
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {selectedLandslide.locationName} ({selectedLandslide.district}, {selectedLandslide.state})
                  </span>
                </div>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  {selectedLandslide.impactDescription}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 mt-2">
                  <span><strong>Date:</strong> {selectedLandslide.date}</span>
                  <span>•</span>
                  <span><strong>Trigger:</strong> {selectedLandslide.trigger}</span>
                  <span>•</span>
                  <span><strong>Source:</strong> {selectedLandslide.catalogSource} ({selectedLandslide.sourceReferenceId})</span>
                  <span>•</span>
                  <span className="font-mono"><strong>Coordinates:</strong> {selectedLandslide.latitude.toFixed(4)}°N, {selectedLandslide.longitude.toFixed(4)}°E</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedLandslide(null)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close incident details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Interactive GIS Environmental Map with Layer Toggles */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-12">
          <NerEnvironmentalMap
            selectedLocation={selectedLocation}
            environmentalData={environmentalData}
            weatherData={weatherData}
            selectedLandslide={selectedLandslide}
            onSelectLandslide={(ls) => setSelectedLandslide(ls)}
          />
        </div>
      </div>

      {/* 5. Verified Historical Landslide Catalog */}
      <div ref={landslidesCatalogRef}>
        <NerHistoricalLandslidesList
          selectedDistrict={selectedLocation.name}
          selectedState={selectedLocation.state}
          records={environmentalData?.historicalLandslides || []}
          selectedRecordId={selectedLandslide?.id}
          onSelectRecord={(rec) => setSelectedLandslide(rec)}
        />
      </div>

      {/* 6. Authoritative Data Sources & Frequency Audit */}
      {environmentalData?.sourcesStatus && (
        <NerDataSourcesAudit sources={environmentalData.sourcesStatus} />
      )}
    </div>
  );
};
