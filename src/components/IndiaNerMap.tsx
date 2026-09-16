import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import { MapPin, Layers, ZoomIn, ZoomOut, Compass, Navigation2 } from 'lucide-react';
import { LocationItem } from '../types/weather';
import { ALL_DISTRICTS, NER_STATE_REPRESENTATIVES } from '../data/indiaLocations';

interface IndiaNerMapProps {
  selectedLocation: LocationItem;
  onSelectLocation: (location: LocationItem) => void;
}

export const IndiaNerMap: React.FC<IndiaNerMapProps> = ({
  selectedLocation,
  onSelectLocation,
}) => {
  const { t } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const nerMarkersGroupRef = useRef<L.LayerGroup | null>(null);

  const [mapScope, setMapScope] = useState<'ner' | 'india'>('ner');
  const [mapLayer, setMapLayer] = useState<'carto' | 'osm' | 'terrain'>('carto');

  // NER Bounding Box Coordinates
  const NER_CENTER: [number, number] = [26.2006, 92.9376];
  const INDIA_CENTER: [number, number] = [22.5937, 78.9629];

  // Tile layers
  const TILE_URLS = {
    carto: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialCenter = selectedLocation.isNer ? NER_CENTER : [selectedLocation.latitude, selectedLocation.longitude] as [number, number];
      const initialZoom = selectedLocation.isNer ? 7 : 6;

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        zoomControl: false,
        attributionControl: false,
      });

      // CartoDB Voyager as default high-contrast clean tiles
      const tileLayer = L.tileLayer(TILE_URLS[mapLayer], {
        maxZoom: 18,
        attribution: '&copy; CartoDB & OpenStreetMap',
      }).addTo(map);

      // Create LayerGroup for reference pins
      const nerGroup = L.layerGroup().addTo(map);
      nerMarkersGroupRef.current = nerGroup;

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapInstanceRef.current?.removeLayer(layer);
      }
    });

    L.tileLayer(TILE_URLS[mapLayer], {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap',
    }).addTo(mapInstanceRef.current);
  }, [mapLayer]);

  // Update Selected Location Pin & Smooth Pan
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const latLng: [number, number] = [selectedLocation.latitude, selectedLocation.longitude];

    // Create custom pin icon
    const customIcon = L.divIcon({
      className: 'custom-pin-container',
      html: `
        <div style="
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
        ">
          <div style="
            position: absolute;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: rgba(16, 185, 129, 0.25);
            animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
          <div style="
            width: 14px;
            height: 14px;
            background-color: #0f172a;
            border: 3px solid #10b981;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng(latLng);
    } else {
      markerRef.current = L.marker(latLng, { icon: customIcon }).addTo(map);
    }

    markerRef.current.bindPopup(
      `<div style="font-family: sans-serif; font-size: 12px; font-weight: bold; color: #0f172a;">
        ${selectedLocation.name}
        <div style="font-size: 10px; color: #64748b; font-weight: normal;">${selectedLocation.state} • ${selectedLocation.isNer ? t('weather.nerStation', 'NER Station') : t('location.india', 'India')}</div>
       </div>`
    );

    map.flyTo(latLng, Math.max(map.getZoom(), 8), {
      duration: 1.2,
      easeLinearity: 0.25,
    });
  }, [selectedLocation]);

  // Render NER Hub Pins on the map
  useEffect(() => {
    if (!mapInstanceRef.current || !nerMarkersGroupRef.current) return;
    nerMarkersGroupRef.current.clearLayers();

    NER_STATE_REPRESENTATIVES.forEach((rep) => {
      if (rep.id === selectedLocation.id) return; // Skip selected

      const hubIcon = L.divIcon({
        className: 'hub-pin',
        html: `
          <div style="
            width: 10px;
            height: 10px;
            background-color: #0284c7;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 1px 3px rgba(0,0,0,0.4);
            cursor: pointer;
          " title="${rep.name} (${rep.state})"></div>
        `,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });

      const m = L.marker([rep.latitude, rep.longitude], { icon: hubIcon });
      m.on('click', () => {
        const fullLocation = ALL_DISTRICTS.find((d) => d.id === rep.id) || rep;
        onSelectLocation(fullLocation);
      });
      m.bindTooltip(`<b>${rep.name}</b> (${rep.state})`, { direction: 'top', offset: [0, -6] });
      nerMarkersGroupRef.current?.addLayer(m);
    });
  }, [selectedLocation, onSelectLocation]);

  // Scope toggle (All India vs NER)
  const handleScopeChange = (scope: 'ner' | 'india') => {
    setMapScope(scope);
    if (!mapInstanceRef.current) return;

    if (scope === 'ner') {
      mapInstanceRef.current.flyTo(NER_CENTER, 7, { duration: 1 });
    } else {
      mapInstanceRef.current.flyTo(INDIA_CENTER, 5, { duration: 1 });
    }
  };

  return (
    <div id="gis-map-monitoring-section" className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
      {/* Sleek Map Header Bar */}
      <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {t('gisMap.atmosphericGisMap', 'Atmospheric GIS Map')}
          </span>
        </div>

        {/* Controls: Scope Switcher & Layer Selector */}
        <div className="flex items-center gap-2">
          {/* All India | NER Switch */}
          <div className="inline-flex rounded-md bg-white border border-slate-200 p-0.5 text-[11px] font-semibold text-slate-600">
            <button
              onClick={() => handleScopeChange('ner')}
              className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                mapScope === 'ner'
                  ? 'bg-blue-600 text-white shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              {t('gisMap.nerOnly', 'NER Only')}
            </button>
            <button
              onClick={() => handleScopeChange('india')}
              className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                mapScope === 'india'
                  ? 'bg-blue-600 text-white shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              {t('gisMap.allIndia', 'All India')}
            </button>
          </div>

          {/* Map Layer Dropdown */}
          <select
            value={mapLayer}
            onChange={(e) => setMapLayer(e.target.value as any)}
            className="text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-md px-2 py-0.5 focus:outline-hidden cursor-pointer"
          >
            <option value="carto">{t('gisMap.layerCarto', 'CartoDB')}</option>
            <option value="terrain">{t('gisMap.layerTerrain', 'Terrain')}</option>
            <option value="osm">{t('gisMap.layerOsm', 'OSM')}</option>
          </select>
        </div>
      </div>

      {/* Map Canvas Container */}
      <div className="relative bg-slate-100 h-64 sm:h-80 w-full z-0">
        <div ref={mapContainerRef} className="h-full w-full" />

        {/* Floating Top-Left Overlay */}
        <div className="absolute top-2.5 left-2.5 z-10 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-200 text-[11px] font-bold text-slate-800 shadow-2xs">
          {t('gisMap.focus', 'Focus:')} {mapScope === 'ner' ? t('gisMap.northEasternRegion', 'North Eastern Region') : t('gisMap.allIndia', 'All India')} • {selectedLocation.name}
        </div>

        {/* Floating Zoom & Center overlay controls */}
        <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1 bg-white/95 backdrop-blur-xs p-1 rounded-md border border-slate-200 shadow-2xs">
          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="p-1 rounded text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            title={t('gisMap.zoomIn', 'Zoom In')}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="p-1 rounded text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            title={t('gisMap.zoomOut', 'Zoom Out')}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.flyTo([selectedLocation.latitude, selectedLocation.longitude], 9);
              }
            }}
            className="p-1 rounded text-blue-600 hover:bg-blue-50 cursor-pointer"
            title={t('gisMap.centerDistrict', 'Center Active District')}
          >
            <Navigation2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Map Legend */}
        <div className="absolute bottom-2.5 left-2.5 z-10 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-200 text-[10px] shadow-2xs flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-slate-900" />
            <span className="font-bold text-slate-800">{t('gisMap.activeStation', 'Active Station')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            <span className="text-slate-600">{t('gisMap.nerHubs', 'NER Hubs')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
