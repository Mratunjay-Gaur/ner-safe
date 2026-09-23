import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, ZoomIn, ZoomOut, Compass, Info, RefreshCw, ShieldCheck, AlertTriangle, Waves } from 'lucide-react';
import { BorderCountryMeta, BorderStation, NeighborCountryId } from '../../types/crossBorder';
import { BORDER_COUNTRIES_DATA, NEIGHBOR_COUNTRIES_LIST } from '../../data/crossBorderCountries';
import {
  NEPAL_FLOOD_DISTRICTS,
  NEPAL_TRISHULI_HAZARD_CORRIDOR_COORDINATES,
  NEPAL_TRIBUTARY_FEEDER_LINES,
} from '../../data/nepalFloodEventData';

interface CrossBorderMapProps {
  selectedCountryId: NeighborCountryId;
  selectedStationId?: string;
  onSelectCountry: (countryId: NeighborCountryId) => void;
  onSelectStation?: (station: BorderStation) => void;
  weatherData?: any;
}

// 8 NER States reference centroids for geographic linkage
const NER_STATE_COORDINATES: Record<string, { lat: number; lon: number; capital: string }> = {
  Assam: { lat: 26.2006, lon: 92.9376, capital: 'Dispur / Guwahati' },
  'Arunachal Pradesh': { lat: 28.218, lon: 94.7278, capital: 'Itanagar' },
  Manipur: { lat: 24.6637, lon: 93.9063, capital: 'Imphal' },
  Meghalaya: { lat: 25.467, lon: 91.3662, capital: 'Shillong' },
  Mizoram: { lat: 23.1645, lon: 92.9376, capital: 'Aizawl' },
  Nagaland: { lat: 26.1584, lon: 94.5624, capital: 'Kohima' },
  Sikkim: { lat: 27.533, lon: 88.5122, capital: 'Gangtok' },
  Tripura: { lat: 23.9408, lon: 91.9882, capital: 'Agartala' },
};

const TILE_URLS = {
  carto: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
};

export const CrossBorderMap: React.FC<CrossBorderMapProps> = ({
  selectedCountryId,
  selectedStationId,
  onSelectCountry,
  onSelectStation,
  weatherData,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const connectionsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const nepalFloodLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [mapLayer, setMapLayer] = useState<'carto' | 'osm' | 'terrain'>('carto');
  const [showConnections, setShowConnections] = useState<boolean>(true);
  const [showNepalFloodLayer, setShowNepalFloodLayer] = useState<boolean>(true);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Centered on Eastern Himalaya / NER regional cross-border theater
      const map = L.map(mapContainerRef.current, {
        center: [26.0, 91.8],
        zoom: 6,
        minZoom: 4,
        maxZoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer(TILE_URLS[mapLayer], {
        maxZoom: 18,
        attribution: '&copy; CartoDB & OpenStreetMap',
      }).addTo(map);

      const connGroup = L.layerGroup().addTo(map);
      connectionsLayerGroupRef.current = connGroup;

      const floodGroup = L.layerGroup().addTo(map);
      nepalFloodLayerGroupRef.current = floodGroup;

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerGroupRef.current = markersGroup;

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

  // Update Markers, Connected Lines, and Bounds whenever selection changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerGroupRef.current || !connectionsLayerGroupRef.current) {
      return;
    }

    const markersGroup = markersLayerGroupRef.current;
    const connGroup = connectionsLayerGroupRef.current;
    const floodGroup = nepalFloodLayerGroupRef.current;
    markersGroup.clearLayers();
    connGroup.clearLayers();
    floodGroup?.clearLayers();

    const selectedCountry = BORDER_COUNTRIES_DATA[selectedCountryId];
    const connectedStateNames = new Set(
      selectedCountry ? selectedCountry.connectedNerStates.map((s) => s.state) : []
    );

    // 1. Render the 8 NER States of India
    Object.entries(NER_STATE_COORDINATES).forEach(([stateName, coord]) => {
      const isConnected = connectedStateNames.has(stateName);

      const stateIcon = L.divIcon({
        className: 'ner-state-marker',
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: ${isConnected ? '36px' : '26px'};
            height: ${isConnected ? '36px' : '26px'};
            cursor: pointer;
            transition: all 0.3s ease;
          ">
            ${
              isConnected
                ? `<div style="
                    position: absolute;
                    inset: -4px;
                    border-radius: 50%;
                    background: rgba(14, 165, 233, 0.35);
                    animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
                  "></div>`
                : ''
            }
            <div style="
              width: 100%;
              height: 100%;
              border-radius: 50%;
              background: ${isConnected ? '#0284c7' : '#334155'};
              border: 2px solid ${isConnected ? '#ffffff' : '#64748b'};
              color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: ui-sans-serif, system-ui, sans-serif;
              font-weight: 800;
              font-size: ${isConnected ? '11px' : '9px'};
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            ">
              ${stateName.substring(0, 2).toUpperCase()}
            </div>
            ${
              isConnected
                ? `<span style="
                    position: absolute;
                    bottom: -18px;
                    white-space: nowrap;
                    background: rgba(2, 6, 23, 0.88);
                    color: #7dd3fc;
                    border: 1px solid rgba(56, 189, 248, 0.4);
                    border-radius: 4px;
                    padding: 1px 5px;
                    font-size: 9px;
                    font-weight: 700;
                    letter-spacing: 0.025em;
                    backdrop-filter: blur(4px);
                  ">${stateName} (Borders ${selectedCountry.name})</span>`
                : ''
            }
          </div>
        `,
        iconSize: [isConnected ? 36 : 26, isConnected ? 36 : 26],
        iconAnchor: [isConnected ? 18 : 13, isConnected ? 18 : 13],
      });

      const marker = L.marker([coord.lat, coord.lon], { icon: stateIcon }).addTo(markersGroup);

      marker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 180px; padding: 2px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="font-size: 14px;">🇮🇳</span>
            <strong style="color: #0f172a; font-size: 13px;">${stateName} (NER State)</strong>
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">Capital: ${coord.capital}</div>
          ${
            isConnected
              ? `<div style="background: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; border: 1px solid #bae6fd;">
                  Direct International Border with ${selectedCountry.name}
                 </div>`
              : `<div style="color: #94a3b8; font-size: 10px;">Not directly bordering ${selectedCountry.name}</div>`
          }
        </div>
      `);
    });

    // 2. Render the 5 Neighboring Countries and their border stations
    NEIGHBOR_COUNTRIES_LIST.forEach((country) => {
      const isCountrySelected = country.id === selectedCountryId;

      country.stations.forEach((station) => {
        const isStationSelected =
          isCountrySelected && (!selectedStationId || selectedStationId === station.id);

        const pinColor = isCountrySelected ? '#e11d48' : '#d97706'; // Crimson red for active, amber for neighbors
        const pinSize = isStationSelected ? 40 : 30;

        const countryIcon = L.divIcon({
          className: 'country-station-marker',
          html: `
            <div style="
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
              width: ${pinSize}px;
              height: ${pinSize}px;
              cursor: pointer;
            ">
              ${
                isStationSelected
                  ? `<div style="
                      position: absolute;
                      inset: -6px;
                      border-radius: 50%;
                      background: rgba(225, 29, 72, 0.35);
                      animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
                    "></div>`
                  : ''
              }
              <div style="
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background: ${isStationSelected ? '#e11d48' : '#f59e0b'};
                border: 3px solid #ffffff;
                box-shadow: 0 4px 12px rgba(0,0,0,0.35);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${isStationSelected ? '18px' : '14px'};
              ">
                ${country.flag}
              </div>
              <span style="
                position: absolute;
                top: -18px;
                white-space: nowrap;
                background: ${isCountrySelected ? '#881337' : 'rgba(15, 23, 42, 0.9)'};
                color: #ffffff;
                border: 1px solid ${isCountrySelected ? '#f43f5e' : 'rgba(255,255,255,0.2)'};
                border-radius: 4px;
                padding: 1px 6px;
                font-size: 9px;
                font-weight: 700;
                letter-spacing: 0.025em;
                box-shadow: 0 2px 6px rgba(0,0,0,0.2);
              ">
                ${station.name}
              </span>
            </div>
          `,
          iconSize: [pinSize, pinSize],
          iconAnchor: [pinSize / 2, pinSize / 2],
        });

        const marker = L.marker([station.latitude, station.longitude], { icon: countryIcon }).addTo(
          markersGroup
        );

        marker.on('click', () => {
          onSelectCountry(country.id);
          if (onSelectStation) {
            onSelectStation(station);
          }
        });

        const isNepalStation = country.id === 'nepal';

        marker.bindPopup(`
          <div style="font-family: sans-serif; min-width: 210px; padding: 2px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 16px;">${country.flag}</span>
              <span style="font-size: 9px; font-weight: 800; background: ${
                isNepalStation ? '#e0f2fe' : '#ffe4e6'
              }; color: ${isNepalStation ? '#0369a1' : '#9f1239'}; padding: 2px 6px; border-radius: 4px; border: 1px solid ${
                isNepalStation ? '#bae6fd' : '#fecdd3'
              };">
                ${isNepalStation ? 'WEATHER & HYDROLOGICAL OBSERVATORY' : 'NEIGHBORING COUNTRY'}
              </span>
            </div>
            <strong style="color: #0f172a; font-size: 13px;">${station.name} (${country.name})</strong>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${station.region}</div>
            ${
              isNepalStation
                ? `<div style="font-size: 10px; color: #0284c7; background: #f0f9ff; padding: 3px 6px; border-radius: 4px; margin-top: 5px; border: 1px solid #bae6fd;">
                    ℹ️ Routine environmental monitoring station (distinct from flood impact sites).
                   </div>`
                : ''
            }
            <div style="font-size: 10px; color: #334155; margin-top: 6px; line-height: 1.3;">
              <strong>Cross-Border Context:</strong> ${station.borderContext}
            </div>
            ${
              isStationSelected && weatherData?.current
                ? `<div style="margin-top: 8px; padding: 6px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 11px;">
                    <div><strong>Temp:</strong> ${weatherData.current.temperature}°C (Feels ${weatherData.current.apparentTemperature}°C)</div>
                    <div><strong>Condition:</strong> ${weatherData.current.weatherCondition}</div>
                    <div><strong>Precipitation:</strong> ${weatherData.current.precipitation} mm/h</div>
                    <div><strong>Wind:</strong> ${weatherData.current.windSpeed} km/h ${weatherData.current.windDirectionCardinal}</div>
                   </div>`
                : ''
            }
          </div>
        `);
      });
    });

    // 3. Draw Transboundary Link Geodesic Lines from active country station to each connected NER State
    if (showConnections && selectedCountry) {
      const activeStation =
        selectedCountry.stations.find((s) => s.id === selectedStationId) ||
        selectedCountry.stations[0];

      selectedCountry.connectedNerStates.forEach((stateConn) => {
        const nerCoord = NER_STATE_COORDINATES[stateConn.state];
        if (!nerCoord) return;

        const latLngs: [number, number][] = [
          [activeStation.latitude, activeStation.longitude],
          [nerCoord.lat, nerCoord.lon],
        ];

        // Animated dashed polyline showing transboundary coupling
        const polyline = L.polyline(latLngs, {
          color: '#0284c7',
          weight: 2.5,
          opacity: 0.85,
          dashArray: '6, 8',
          lineCap: 'round',
        }).addTo(connGroup);

        polyline.bindTooltip(
          `Border: ${selectedCountry.name} ⟷ ${stateConn.state} (${stateConn.borderLengthKm} km)`,
          { sticky: true, className: 'leaflet-custom-tooltip' }
        );
      });
    }

    // 4. Dedicated Nepal Flood Impact / Disaster Event Layer (Rasuwa ➔ Trishuli River Hazard Corridor)
    if (selectedCountryId === 'nepal' && showNepalFloodLayer && floodGroup) {
      // 4a. Bhote Koshi → Trishuli River Downstream Hazard Corridor
      // Outer buffer ribbon
      L.polyline(NEPAL_TRISHULI_HAZARD_CORRIDOR_COORDINATES, {
        color: '#dc2626',
        weight: 9,
        opacity: 0.3,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(floodGroup);

      // Active pulsating flow corridor
      const corridorPolyline = L.polyline(NEPAL_TRISHULI_HAZARD_CORRIDOR_COORDINATES, {
        color: '#ea580c',
        weight: 3.5,
        opacity: 0.95,
        dashArray: '8, 8',
        lineCap: 'round',
      }).addTo(floodGroup);

      corridorPolyline.bindTooltip(
        `<div style="font-family: sans-serif; font-size: 11px; padding: 3px;">
          <strong style="color: #b91c1c; font-size: 12px;">⚡ Bhote Koshi → Trishuli Downstream Hazard Corridor</strong>
          <div style="color: #0f172a; margin-top: 2px;">
            Rasuwa (Primary Epicenter) ➔ Nuwakot ➔ Dhading ➔ Chitwan (Downstream Floodplain)
          </div>
          <div style="color: #64748b; font-size: 10px; margin-top: 3px;">
            Trishuli-Narayani Basin • Downstream cross-border disaster propagation route
          </div>
        </div>`,
        { sticky: true, className: 'leaflet-custom-tooltip' }
      );

      // Tributary feeder lines (Gorkha & Tanahun)
      NEPAL_TRIBUTARY_FEEDER_LINES.forEach((feeder) => {
        const feederLine = L.polyline(feeder.points, {
          color: '#f59e0b',
          weight: 2.5,
          opacity: 0.85,
          dashArray: '5, 6',
          lineCap: 'round',
        }).addTo(floodGroup);

        feederLine.bindTooltip(
          `<div style="font-family: sans-serif; font-size: 10px;">
            <strong style="color: #b45309;">Lateral Tributary Feeder:</strong> ${feeder.name}
          </div>`,
          { sticky: true }
        );
      });

      // Directional flow indicator waypoints
      const flowWaypoints = [
        { lat: 28.01, lon: 85.22, text: '↓ Debris Surge' },
        { lat: 27.84, lon: 85.02, text: '↓ Gorge Inundation' },
        { lat: 27.72, lon: 84.52, text: '↓ Narayani Flow' },
      ];
      flowWaypoints.forEach((wp) => {
        const arrowIcon = L.divIcon({
          className: 'nepal-corridor-flow-arrow',
          html: `
            <div style="
              background: rgba(15, 23, 42, 0.88);
              color: #fdba74;
              border: 1px solid #ea580c;
              border-radius: 9999px;
              padding: 1px 7px;
              font-size: 9px;
              font-weight: 700;
              white-space: nowrap;
              box-shadow: 0 2px 6px rgba(0,0,0,0.35);
              font-family: ui-sans-serif, system-ui, sans-serif;
            ">${wp.text}</div>
          `,
          iconSize: [88, 18],
          iconAnchor: [44, 9],
        });
        L.marker([wp.lat, wp.lon], { icon: arrowIcon, interactive: false }).addTo(floodGroup);
      });

      // 4b. 6 Dedicated Affected District Markers
      NEPAL_FLOOD_DISTRICTS.forEach((d) => {
        const isRasuwa = d.district === 'Rasuwa';
        const isHigh = d.severityLevel === 'high';

        // Rasuwa is PRIMARY / EXTREME: visually highest-priority marker on map
        const pinSize = isRasuwa ? 50 : isHigh ? 38 : 34;

        const floodIcon = L.divIcon({
          className: 'nepal-flood-event-marker',
          html: `
            <div style="
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
              width: ${pinSize}px;
              height: ${pinSize}px;
              cursor: pointer;
            ">
              ${
                isRasuwa
                  ? `
                    <div style="
                      position: absolute;
                      inset: -12px;
                      border-radius: 50%;
                      background: rgba(220, 38, 38, 0.4);
                      animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
                    "></div>
                    <div style="
                      position: absolute;
                      inset: -4px;
                      border-radius: 50%;
                      border: 2px dashed #facc15;
                      background: rgba(245, 158, 11, 0.25);
                    "></div>
                  `
                  : isHigh
                  ? `
                    <div style="
                      position: absolute;
                      inset: -5px;
                      border-radius: 50%;
                      background: rgba(234, 88, 12, 0.35);
                      animation: ping 2.2s cubic-bezier(0, 0, 0.2, 1) infinite;
                    "></div>
                  `
                  : ''
              }
              <div style="
                width: 100%;
                height: 100%;
                border-radius: ${isRasuwa ? '12px' : '9px'};
                background: ${
                  isRasuwa
                    ? 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)'
                    : isHigh
                    ? 'linear-gradient(135deg, #c2410c 0%, #9a3412 100%)'
                    : 'linear-gradient(135deg, #d97706 0%, #78350f 100%)'
                };
                border: ${isRasuwa ? '3px solid #facc15' : isHigh ? '2px solid #fdba74' : '2px solid #fef08a'};
                box-shadow: 0 4px 16px ${isRasuwa ? 'rgba(220, 38, 38, 0.75)' : 'rgba(0,0,0,0.4)'};
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${isRasuwa ? '22px' : isHigh ? '16px' : '14px'};
                color: #ffffff;
                transform: ${isRasuwa ? 'rotate(45deg)' : 'none'};
                transition: transform 0.2s ease;
              ">
                <div style="transform: ${isRasuwa ? 'rotate(-45deg)' : 'none'}; display: flex; align-items: center; justify-content: center;">
                  ${isRasuwa ? '🚨' : isHigh ? '⚠️' : '🌊'}
                </div>
              </div>

              <!-- District Name directly rendered on the map -->
              <div style="
                position: absolute;
                bottom: -22px;
                white-space: nowrap;
                background: ${isRasuwa ? '#450a0a' : isHigh ? '#431407' : '#1c1917'};
                color: ${isRasuwa ? '#fef08a' : isHigh ? '#fed7aa' : '#fef08a'};
                border: 1px solid ${isRasuwa ? '#ef4444' : isHigh ? '#ea580c' : '#d97706'};
                border-radius: 4px;
                padding: 1px 6px;
                font-size: ${isRasuwa ? '10px' : '9px'};
                font-weight: 800;
                letter-spacing: 0.025em;
                box-shadow: 0 2px 8px rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                gap: 3px;
                font-family: ui-sans-serif, system-ui, sans-serif;
              ">
                ${isRasuwa ? '<span style="color:#ef4444; font-size: 8px;">●</span>' : ''}
                <span>${d.district}</span>
                <span style="font-size: 8px; opacity: 0.9; color: ${isRasuwa ? '#f87171' : '#fdba74'};">
                  (${d.severityLevel === 'extreme' ? 'PRIMARY / EXTREME' : d.severityLevel.toUpperCase()})
                </span>
              </div>
            </div>
          `,
          iconSize: [pinSize, pinSize],
          iconAnchor: [pinSize / 2, pinSize / 2],
        });

        const floodMarker = L.marker([d.coordinates.lat, d.coordinates.lon], {
          icon: floodIcon,
          zIndexOffset: isRasuwa ? 1500 : isHigh ? 900 : 700,
        }).addTo(floodGroup);

        floodMarker.bindPopup(`
          <div style="font-family: ui-sans-serif, system-ui, sans-serif; min-width: 260px; max-width: 320px; padding: 4px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 16px;">🇳🇵</span>
                <strong style="color: #0f172a; font-size: 14px;">${d.district} District</strong>
              </div>
              <span style="
                background: ${isRasuwa ? '#fee2e2' : isHigh ? '#ffedd5' : '#fef9c3'};
                color: ${isRasuwa ? '#991b1b' : isHigh ? '#9a3412' : '#854d0e'};
                border: 1px solid ${isRasuwa ? '#f87171' : isHigh ? '#fb923c' : '#fde047'};
                font-size: 9px;
                font-weight: 800;
                padding: 2px 7px;
                border-radius: 9999px;
                text-transform: uppercase;
                white-space: nowrap;
              ">
                ${d.severity}
              </span>
            </div>

            <div style="font-size: 12px; font-weight: 700; color: #b91c1c; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
              <span>⚡</span>
              <span>Event: ${d.event}</span>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px; font-size: 11px; margin-bottom: 8px; display: flex; flex-direction: column; gap: 4px;">
              <div><strong style="color: #334155;">Country:</strong> ${d.country}</div>
              <div><strong style="color: #334155;">Severity:</strong> <span style="font-weight: 700; color: ${isRasuwa ? '#b91c1c' : '#c2410c'};">${d.severity}</span></div>
              <div><strong style="color: #334155;">Relevant River / Basin:</strong> ${d.riverBasin}</div>
              <div><strong style="color: #334155;">Event Date:</strong> ${d.eventDate}</div>
              <div><strong style="color: #334155;">Data / Source Status:</strong> <span style="color: #b45309; font-weight: 600;">${d.dataStatus}</span></div>
              <div style="border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 2px; color: #64748b; font-size: 10px;">
                <em>Exact measurements: Prototype event data / Data unavailable (no fabricated values)</em>
              </div>
            </div>

            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 6px 8px; font-size: 11px; color: #7f1d1d; line-height: 1.35; margin-bottom: 6px;">
              <strong>Downstream Hazard Risk:</strong> ${d.crossBorderHydrologyImpact}
            </div>

            <div style="font-size: 10px; color: #475569; line-height: 1.35;">
              ${d.summary}
            </div>
          </div>
        `);
      });
    }

    // Smooth Pan to active country station or Nepal corridor view
    if (selectedCountryId === 'nepal') {
      // Focus theater on the Trishuli hazard corridor (Rasuwa ➔ Chitwan) and surrounding observation stations
      mapInstanceRef.current.flyTo([27.92, 85.05], 7.6, { duration: 1.0 });
    } else {
      const activeStation =
        selectedCountry.stations.find((s) => s.id === selectedStationId) ||
        selectedCountry.stations[0];

      if (activeStation) {
        mapInstanceRef.current.flyTo(
          [activeStation.latitude, activeStation.longitude],
          6.5,
          { duration: 1.0 }
        );
      }
    }
  }, [selectedCountryId, selectedStationId, showConnections, showNepalFloodLayer, weatherData, onSelectCountry, onSelectStation]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetView = () => {
    mapInstanceRef.current?.flyTo([26.0, 91.8], 6, { duration: 1.0 });
  };

  return (
    <div className="relative w-full h-[380px] sm:h-[440px] md:h-[480px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900">
      {/* Map Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Floating Controls */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 pointer-events-auto">
        {/* Layer Selector */}
        <div className="inline-flex items-center rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1 shadow-lg text-xs">
          <button
            onClick={() => setMapLayer('carto')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              mapLayer === 'carto' ? 'bg-sky-500 text-white shadow-xs font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            Clean Map
          </button>
          <button
            onClick={() => setMapLayer('terrain')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              mapLayer === 'terrain' ? 'bg-sky-500 text-white shadow-xs font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            Topographic
          </button>
          <button
            onClick={() => setMapLayer('osm')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              mapLayer === 'osm' ? 'bg-sky-500 text-white shadow-xs font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            Street View
          </button>
        </div>

        {/* Toggle Border Connection Lines */}
        <button
          onClick={() => setShowConnections(!showConnections)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur-md transition-all shadow-md flex items-center gap-1.5 ${
            showConnections
              ? 'bg-sky-500/20 border-sky-400 text-sky-200'
              : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle transboundary border connection corridors"
        >
          <span className={`w-2 h-2 rounded-full ${showConnections ? 'bg-sky-400' : 'bg-slate-500'}`} />
          <span>Border Corridors</span>
        </button>

        {/* Toggle Nepal Flood Layer (Dedicated to Nepal portion) */}
        {selectedCountryId === 'nepal' && (
          <button
            onClick={() => setShowNepalFloodLayer(!showNepalFloodLayer)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur-md transition-all shadow-md flex items-center gap-1.5 ${
              showNepalFloodLayer
                ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Nepal Flood Impact & Disaster Event Layer"
          >
            <span className={`w-2 h-2 rounded-full ${showNepalFloodLayer ? 'bg-rose-500 animate-pulse' : 'bg-slate-500'}`} />
            <span>Nepal Flood Impact Layer</span>
          </button>
        )}
      </div>

      {/* Nepal Flood Hazard Corridor Information Card (Active on Nepal Layer) */}
      {selectedCountryId === 'nepal' && showNepalFloodLayer && (
        <div className="absolute top-14 left-3 z-10 max-w-[280px] sm:max-w-sm rounded-xl bg-slate-950/90 backdrop-blur-md border border-rose-500/40 p-2.5 shadow-xl text-xs text-slate-200 pointer-events-auto">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 font-bold text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>Downstream Hazard Corridor</span>
            </div>
            <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
              Bhote Koshi → Trishuli
            </span>
          </div>
          <div className="text-[11px] text-slate-200 font-medium">
            <span className="text-amber-300 font-bold">Rasuwa (Primary/Extreme)</span>
            <span className="text-slate-400"> ↓ </span>
            <span className="text-orange-300">Nuwakot</span>
            <span className="text-slate-400"> ↓ </span>
            <span className="text-orange-300">Dhading</span>
            <span className="text-slate-400"> ↓ </span>
            <span className="text-amber-200">Chitwan</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 leading-snug">
            Detected/recorded hazard in Nepal → downstream risk corridor → potential cross-border disaster monitoring
          </div>
        </div>
      )}

      {/* Top Right Zoom & Pan Tools */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 pointer-events-auto">
        <button
          onClick={handleZoomIn}
          aria-label="Zoom in"
          className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 shadow-md backdrop-blur-md transition-all"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          aria-label="Zoom out"
          className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 shadow-md backdrop-blur-md transition-all"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          aria-label="Reset theater view"
          className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 shadow-md backdrop-blur-md transition-all"
          title="Reset to Regional Cross-Border View"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Map Legend */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800/90 text-xs text-slate-300 pointer-events-auto shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-rose-600 border border-white inline-flex items-center justify-center text-[8px] font-bold text-white">
              ●
            </span>
            <span className="text-[11px] font-medium text-slate-200">5 Bordering Countries</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-sky-600 border border-white inline-flex items-center justify-center text-[7px] font-bold text-white">
              AS
            </span>
            <span className="text-[11px] font-medium text-slate-200">8 NER States of India</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-sky-400 inline-block" />
            <span className="text-[11px] font-medium text-sky-300">Geographic Connection</span>
          </div>
          {selectedCountryId === 'nepal' && showNepalFloodLayer && (
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-rose-600 border border-amber-300 inline-flex items-center justify-center text-[9px] font-bold text-white shadow-xs">
                🚨
              </span>
              <span className="text-[11px] font-bold text-rose-300">
                Nepal Flood Impact (Rasuwa ➔ Trishuli Corridor)
              </span>
            </div>
          )}
        </div>

        <div className="text-[10px] text-slate-400 font-mono">
          Only Countries Bordering the 8 NER States • Real Meteorological Feed
        </div>
      </div>
    </div>
  );
};
