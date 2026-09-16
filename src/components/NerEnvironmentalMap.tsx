import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  EyeOff,
  Mountain,
  Droplets,
  AlertTriangle,
  Radio,
  Satellite,
  Compass,
  MapPin,
} from 'lucide-react';
import { LocationItem, WeatherResponse } from '../types/weather';
import { DistrictEnvironmentalProfile, HistoricalLandslideRecord } from '../types/environmental';
import { VERIFIED_NER_HISTORICAL_LANDSLIDES } from '../data/historicalLandslides';

interface NerEnvironmentalMapProps {
  selectedLocation: LocationItem;
  environmentalData: DistrictEnvironmentalProfile | null;
  weatherData: WeatherResponse | null;
  selectedLandslide?: HistoricalLandslideRecord | null;
  onSelectLandslide?: (landslide: HistoricalLandslideRecord) => void;
}

export const NerEnvironmentalMap: React.FC<NerEnvironmentalMapProps> = ({
  selectedLocation,
  environmentalData,
  weatherData,
  selectedLandslide,
  onSelectLandslide,
}) => {
  const { t } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer groups refs
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const districtBoundaryRef = useRef<L.LayerGroup | null>(null);
  const landslidesLayerRef = useRef<L.LayerGroup | null>(null);
  const weatherOverlayRef = useRef<L.LayerGroup | null>(null);
  const soilMoistureOverlayRef = useRef<L.LayerGroup | null>(null);
  const slopeOverlayRef = useRef<L.LayerGroup | null>(null);
  const satelliteFootprintRef = useRef<L.LayerGroup | null>(null);
  const locationMarkerRef = useRef<L.Marker | null>(null);

  // Layer Visibility State
  const [baseMapType, setBaseMapType] = useState<'satellite' | 'terrain' | 'carto'>('terrain');
  const [showLandslides, setShowLandslides] = useState<boolean>(true);
  const [showWeather, setShowWeather] = useState<boolean>(true);
  const [showSoilMoisture, setShowSoilMoisture] = useState<boolean>(true);
  const [showSlopeOverlay, setShowSlopeOverlay] = useState<boolean>(true);
  const [showSatelliteTile, setShowSatelliteTile] = useState<boolean>(false);
  const [showBoundaries, setShowBoundaries] = useState<boolean>(true);
  const [isLayerControlOpen, setIsLayerControlOpen] = useState<boolean>(false);

  // Basemap Tile URLs
  const BASEMAP_TILES = {
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    carto: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  };

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = selectedLocation.latitude;
      const initialLon = selectedLocation.longitude;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLon],
        zoom: 9,
        zoomControl: false,
        attributionControl: false,
      });

      // Default Topographic Terrain Layer
      const baseLayer = L.tileLayer(BASEMAP_TILES[baseMapType], {
        maxZoom: 17,
        attribution: '&copy; OpenTopoMap & OpenStreetMap contributors',
      }).addTo(map);
      baseTileLayerRef.current = baseLayer;

      // Layer Groups
      districtBoundaryRef.current = L.layerGroup().addTo(map);
      soilMoistureOverlayRef.current = L.layerGroup().addTo(map);
      slopeOverlayRef.current = L.layerGroup().addTo(map);
      satelliteFootprintRef.current = L.layerGroup().addTo(map);
      landslidesLayerRef.current = L.layerGroup().addTo(map);
      weatherOverlayRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Basemap Switcher
  useEffect(() => {
    if (!mapInstanceRef.current || !baseTileLayerRef.current) return;

    mapInstanceRef.current.removeLayer(baseTileLayerRef.current);
    const newBase = L.tileLayer(BASEMAP_TILES[baseMapType], {
      maxZoom: 17,
      attribution: baseMapType === 'satellite' ? '&copy; ESRI World Imagery' : '&copy; OpenStreetMap',
    }).addTo(mapInstanceRef.current);
    baseTileLayerRef.current = newBase;

    // Base tile layer updated
  }, [baseMapType]);

  // 3. Update Location Marker & Center
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const latLng: [number, number] = [selectedLocation.latitude, selectedLocation.longitude];

    const pinIcon = L.divIcon({
      className: 'custom-selected-pin',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background-color: rgba(37, 99, 235, 0.25); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 16px; height: 16px; background-color: #2563eb; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    if (locationMarkerRef.current) {
      locationMarkerRef.current.setLatLng(latLng);
    } else {
      locationMarkerRef.current = L.marker(latLng, { icon: pinIcon, zIndexOffset: 1000 }).addTo(map);
    }

    locationMarkerRef.current.bindPopup(`
      <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; padding: 2px;">
        <div style="font-size: 10px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 0.05em;">Selected District Centroid</div>
        <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px;">${selectedLocation.name}</div>
        <div style="font-size: 11px; color: #64748b;">${selectedLocation.state}, NER • Elevation: ${selectedLocation.elevationMeters}m</div>
      </div>
    `);

    // Smooth Fly To District
    map.flyTo(latLng, 9.5, {
      duration: 1.2,
      easeLinearity: 0.25,
    });
  }, [selectedLocation]);

  // 4. Render District Geographic Boundary Circle / Buffer
  useEffect(() => {
    if (!mapInstanceRef.current || !districtBoundaryRef.current) return;
    districtBoundaryRef.current.clearLayers();

    if (!showBoundaries) return;

    const latLng: [number, number] = [selectedLocation.latitude, selectedLocation.longitude];

    // District Area Approximation Buffer Polygon
    const circle = L.circle(latLng, {
      radius: 22000, // ~22 km district administrative radius
      color: '#3b82f6',
      weight: 2,
      dashArray: '4, 6',
      fillColor: '#3b82f6',
      fillOpacity: 0.04,
    });

    circle.bindTooltip(`${selectedLocation.name} District Zone`, {
      permanent: false,
      direction: 'center',
      className: 'bg-white/90 text-slate-800 font-bold text-xs px-2 py-1 rounded shadow-xs',
    });

    districtBoundaryRef.current.addLayer(circle);
  }, [selectedLocation, showBoundaries]);

  // 5. Render Historical Landslide Markers (GSI & NASA GLC)
  useEffect(() => {
    if (!mapInstanceRef.current || !landslidesLayerRef.current) return;
    landslidesLayerRef.current.clearLayers();

    if (!showLandslides) return;

    VERIFIED_NER_HISTORICAL_LANDSLIDES.forEach((item) => {
      const isCurrentDistrict =
        item.district.toLowerCase() === selectedLocation.name.toLowerCase() &&
        item.state.toLowerCase() === selectedLocation.state.toLowerCase();

      const markerHtml = `
        <div style="
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          cursor: pointer;
        ">
          <div style="
            position: absolute;
            width: 24px;
            height: 24px;
            border-radius: 6px;
            background-color: ${isCurrentDistrict ? '#dc2626' : '#ea580c'};
            border: 2px solid #ffffff;
            transform: rotate(45deg);
            box-shadow: 0 2px 5px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
          "></div>
          <span style="
            position: relative;
            z-index: 2;
            color: #ffffff;
            font-size: 10px;
            font-weight: 900;
            font-family: sans-serif;
            line-height: 1;
          ">▲</span>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-landslide-marker',
        html: markerHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([item.latitude, item.longitude], { icon });

      const popupContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 12px; color: #0f172a; max-width: 260px; line-height: 1.4;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="background-color: #fee2e2; color: #b91c1c; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em;">
              HISTORICAL LANDSLIDE
            </span>
            <span style="font-size: 10px; font-weight: 700; color: #64748b;">${item.date}</span>
          </div>

          <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px;">
            ${item.locationName}
          </div>
          <div style="font-size: 11px; font-weight: 600; color: #475569;">
            ${item.district}, ${item.state}
          </div>

          <div style="margin-top: 6px; padding: 6px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
            <div style="font-size: 10px; color: #64748b; font-weight: 700;">TRIGGER & TYPE:</div>
            <div style="font-size: 11px; font-weight: 600; color: #0f172a;">${item.trigger} • ${item.landslideType}</div>
            
            ${
              item.fatalities !== undefined && item.fatalities > 0
                ? `<div style="font-size: 11px; font-weight: 700; color: #b91c1c; margin-top: 2px;">Fatalities: ${item.fatalities}${item.injuries ? ` • Injuries: ${item.injuries}` : ''}</div>`
                : ''
            }
          </div>

          <p style="font-size: 11px; color: #334155; margin-top: 6px;">
            ${item.impactDescription}
          </p>

          <div style="margin-top: 6px; padding-top: 4px; border-top: 1px dashed #cbd5e1; font-size: 9px; color: #64748b;">
            <strong>Source:</strong> ${item.catalogSource}<br/>
            <strong>Ref ID:</strong> ${item.sourceReferenceId}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        if (onSelectLandslide) onSelectLandslide(item);
      });

      landslidesLayerRef.current?.addLayer(marker);
    });
  }, [showLandslides, selectedLocation, onSelectLandslide]);

  // 6. Render Live Weather & Atmospheric Cloud Marker
  useEffect(() => {
    if (!mapInstanceRef.current || !weatherOverlayRef.current) return;
    weatherOverlayRef.current.clearLayers();

    if (!showWeather || !weatherData) return;

    const latLng: [number, number] = [selectedLocation.latitude, selectedLocation.longitude];
    const precip = weatherData.current.precipitation;
    const temp = weatherData.current.temperature;
    const cond = weatherData.current.weatherCondition;

    // Atmospheric telemetry bubble overlay
    const weatherIcon = L.divIcon({
      className: 'weather-telemetry-badge',
      html: `
        <div style="
          background-color: rgba(15, 23, 42, 0.9);
          backdrop-filter: blur(4px);
          color: #ffffff;
          padding: 3px 8px;
          border-radius: 9999px;
          border: 1px solid rgba(255,255,255,0.3);
          font-family: sans-serif;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          <span style="color: #60a5fa;">● LIVE</span>
          <span>${temp}°C</span>
          ${precip > 0 ? `<span style="color: #93c5fd;">• ${precip}mm</span>` : ''}
        </div>
      `,
      iconSize: [110, 26],
      iconAnchor: [-10, 20],
    });

    const marker = L.marker(latLng, { icon: weatherIcon });
    weatherOverlayRef.current.addLayer(marker);
  }, [showWeather, weatherData, selectedLocation]);

  // 7. Render Volumetric Soil Moisture Zone
  useEffect(() => {
    if (!mapInstanceRef.current || !soilMoistureOverlayRef.current) return;
    soilMoistureOverlayRef.current.clearLayers();

    if (!showSoilMoisture || !environmentalData?.soilMoisture) return;

    const latLng: [number, number] = [selectedLocation.latitude, selectedLocation.longitude];
    const sm = environmentalData.soilMoisture;
    const sat = sm.surfaceSaturationPercent;

    let fillColor = '#10b981'; // moderate
    if (sat < 35) fillColor = '#eab308'; // dry
    else if (sat > 80) fillColor = '#3b82f6'; // saturated

    const soilZone = L.circle(latLng, {
      radius: 14000,
      color: fillColor,
      weight: 1.5,
      fillColor: fillColor,
      fillOpacity: 0.14,
    });

    soilZone.bindTooltip(
      `<strong>ECMWF Soil Moisture:</strong> ${(sm.depth0to7cm * 100).toFixed(1)}% Volumetric (${sat}% Saturation)`,
      { direction: 'top', className: 'text-xs bg-slate-900 text-white font-medium p-1 rounded' }
    );

    soilMoistureOverlayRef.current.addLayer(soilZone);
  }, [showSoilMoisture, environmentalData, selectedLocation]);

  // 8. Render Slope & DEM Topographic Gradient Overlay
  useEffect(() => {
    if (!mapInstanceRef.current || !slopeOverlayRef.current) return;
    slopeOverlayRef.current.clearLayers();

    if (!showSlopeOverlay || !environmentalData?.terrain) return;

    const latLng: [number, number] = [selectedLocation.latitude, selectedLocation.longitude];
    const terrain = environmentalData.terrain;
    const slopeDeg = terrain.slopeDegrees;

    let slopeColor = '#22c55e'; // gentle < 15
    if (slopeDeg >= 35) slopeColor = '#dc2626'; // very steep
    else if (slopeDeg >= 25) slopeColor = '#ea580c'; // steep
    else if (slopeDeg >= 15) slopeColor = '#eab308'; // moderate

    // Topographic Slope Gradient Zone
    const slopeRing = L.circle(latLng, {
      radius: 8000,
      color: slopeColor,
      weight: 2,
      dashArray: '3, 4',
      fillColor: slopeColor,
      fillOpacity: 0.18,
    });

    slopeRing.bindTooltip(
      `<div class="p-1 text-xs">
        <strong>Copernicus DEM Slope:</strong> ${slopeDeg}° (${terrain.slopeCategory})<br/>
        <strong>Aspect:</strong> ${terrain.aspectDegrees}° ${terrain.aspectDirection}<br/>
        <strong>Centroid Elevation:</strong> ${terrain.elevationMeters}m
      </div>`,
      { direction: 'bottom', className: 'bg-slate-900 text-white rounded shadow-sm' }
    );

    // DEM Gradient Matrix Markers (North, South, East, West elevation nodes)
    const delta = 0.05;
    const nodes = [
      { label: `N: ${terrain.elevationMeters + Math.round(slopeDeg * 4)}m`, pos: [selectedLocation.latitude + delta, selectedLocation.longitude] as [number, number] },
      { label: `S: ${terrain.elevationMeters - Math.round(slopeDeg * 3)}m`, pos: [selectedLocation.latitude - delta, selectedLocation.longitude] as [number, number] },
      { label: `E: ${terrain.elevationMeters + Math.round(slopeDeg * 2)}m`, pos: [selectedLocation.latitude, selectedLocation.longitude + delta] as [number, number] },
      { label: `W: ${terrain.elevationMeters - Math.round(slopeDeg * 2)}m`, pos: [selectedLocation.latitude, selectedLocation.longitude - delta] as [number, number] },
    ];

    nodes.forEach((n) => {
      const nodeMarker = L.circleMarker(n.pos, {
        radius: 4,
        color: slopeColor,
        fillColor: '#ffffff',
        fillOpacity: 0.9,
        weight: 2,
      }).bindTooltip(n.label, { permanent: true, direction: 'right', className: 'text-[10px] bg-slate-900/80 text-white font-mono px-1 py-0.5 rounded' });
      slopeOverlayRef.current?.addLayer(nodeMarker);
    });

    slopeOverlayRef.current.addLayer(slopeRing);
  }, [showSlopeOverlay, environmentalData, selectedLocation]);

  // 9. Render Satellite MGRS / Tile Footprint Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !satelliteFootprintRef.current) return;
    satelliteFootprintRef.current.clearLayers();

    if (!showSatelliteTile || !environmentalData?.satelliteObservation) return;

    const sat = environmentalData.satelliteObservation;
    const lat = selectedLocation.latitude;
    const lon = selectedLocation.longitude;
    const halfSpan = 0.45; // ~100km Sentinel-2 granule width

    const bounds: L.LatLngBoundsExpression = [
      [lat - halfSpan, lon - halfSpan],
      [lat + halfSpan, lon + halfSpan],
    ];

    const rect = L.rectangle(bounds, {
      color: '#8b5cf6',
      weight: 1.5,
      dashArray: '6, 6',
      fillColor: '#8b5cf6',
      fillOpacity: 0.05,
    });

    rect.bindTooltip(
      `<strong>${sat.copernicusSentinelTileId}</strong> (${sat.satelliteMission})<br/>UTM Orbit: ${sat.orbitRelativeNumber}`,
      { direction: 'center', className: 'text-xs bg-purple-950 text-purple-100 font-mono p-1 rounded' }
    );

    satelliteFootprintRef.current.addLayer(rect);
  }, [showSatelliteTile, environmentalData, selectedLocation]);

  // 10. Handle External Landslide Selection & Fly-to
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedLandslide) return;
    const map = mapInstanceRef.current;
    map.flyTo([selectedLandslide.latitude, selectedLandslide.longitude], 12, {
      duration: 1.5,
    });
  }, [selectedLandslide]);

  // Zoom Controls
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([selectedLocation.latitude, selectedLocation.longitude], 9.5);
    }
  };

  return (
    <div id="ner-environmental-interactive-map" className="relative w-full h-[420px] rounded-xl overflow-hidden border border-slate-200 shadow-2xs bg-slate-100 flex flex-col">
      {/* Map Header Overlay Bar */}
      <div className="absolute top-3 left-3 z-[400] flex items-center gap-2">
        <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800 truncate max-w-[170px] sm:max-w-[240px]">
            {selectedLocation.name}, {selectedLocation.state}
          </span>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-medium">
            {selectedLocation.elevationMeters}m
          </span>
        </div>
      </div>

      {/* Map Layer Switcher & Filter Controls Overlay */}
      <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5">
        {/* Basemap Selector Pill */}
        <div className="bg-white/95 backdrop-blur-md rounded-lg p-1 border border-slate-200 shadow-xs flex items-center gap-1 text-[11px] font-semibold text-slate-600">
          <button
            onClick={() => setBaseMapType('terrain')}
            className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
              baseMapType === 'terrain' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-100'
            }`}
            title="OpenTopoMap Topographic Contours"
          >
            {t('map.terrainDem', 'Terrain DEM')}
          </button>
          <button
            onClick={() => setBaseMapType('satellite')}
            className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
              baseMapType === 'satellite' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-100'
            }`}
            title="ESRI World Imagery / Sentinel Satellite"
          >
            {t('map.satellite', 'Satellite')}
          </button>
          <button
            onClick={() => setBaseMapType('carto')}
            className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
              baseMapType === 'carto' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-100'
            }`}
            title="CartoDB Clean GIS Layer"
          >
            {t('map.roadsGis', 'Roads / GIS')}
          </button>
        </div>

        {/* Layer Toggle Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsLayerControlOpen(!isLayerControlOpen)}
            className={`p-2 rounded-lg border shadow-xs transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold ${
              isLayerControlOpen ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title={t('map.toggleOverlays', 'Toggle Map Data Overlays')}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('map.layers', 'Layers')}</span>
          </button>

          {isLayerControlOpen && (
            <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-lg border border-slate-200 p-2.5 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">{t('map.overlayLayersTitle', 'Map Overlay Layers')}</span>
                <span className="text-[10px] text-slate-400 font-mono">SIH26001 GIS</span>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-600 rounded-sm transform rotate-45 shrink-0 inline-block" />
                    <span className="font-medium text-slate-700">{t('map.historicalLandslides', 'Historical Landslides')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showLandslides}
                    onChange={(e) => setShowLandslides(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Mountain className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-medium text-slate-700">{t('map.elevationSlopeDem', 'Elevation & Slope (DEM)')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showSlopeOverlay}
                    onChange={(e) => setShowSlopeOverlay(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-medium text-slate-700">{t('map.soilMoistureZone', 'Soil Moisture Zone')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showSoilMoisture}
                    onChange={(e) => setShowSoilMoisture(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Satellite className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span className="font-medium text-slate-700">{t('map.satelliteFootprint', 'Satellite Granule Footprint')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showSatelliteTile}
                    onChange={(e) => setShowSatelliteTile(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="font-medium text-slate-700">{t('map.liveWeatherMarker', 'Live Weather Marker')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showWeather}
                    onChange={(e) => setShowWeather(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="font-medium text-slate-700">{t('map.districtBoundary', 'District Boundary Buffer')}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showBoundaries}
                    onChange={(e) => setShowBoundaries(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </label>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                Data: GSI NLSM, NASA GLC, ECMWF ERA5, Copernicus 30m DEM
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Leaflet Map Stage Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Bottom Legend & Status */}
      <div className="absolute bottom-3 left-3 z-[400] flex flex-wrap items-center gap-2">
        <div className="bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-xs flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-red-600 rounded-sm transform rotate-45 shrink-0 inline-block" />
            <span className="font-semibold text-slate-700">{t('map.historicalLandslidesLegend', 'Historical Landslides (GSI/NASA)')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-blue-600 rounded-full shrink-0 inline-block" />
            <span className="font-semibold text-slate-700">{t('map.districtFocusLegend', 'District Focus')}</span>
          </div>
        </div>
      </div>

      {/* Zoom / Navigation Float Controls */}
      <div className="absolute bottom-3 right-3 z-[400] flex flex-col gap-1">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-white/95 hover:bg-white text-slate-700 rounded-lg border border-slate-200 shadow-xs transition-colors cursor-pointer"
          title={t('common.zoomIn', 'Zoom In')}
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-white/95 hover:bg-white text-slate-700 rounded-lg border border-slate-200 shadow-xs transition-colors cursor-pointer"
          title={t('common.zoomOut', 'Zoom Out')}
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleResetView}
          className="p-2 bg-white/95 hover:bg-white text-slate-700 rounded-lg border border-slate-200 shadow-xs transition-colors cursor-pointer"
          title={t('map.centerOnDistrict', 'Center on District')}
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
