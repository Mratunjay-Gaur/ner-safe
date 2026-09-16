import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import { Layers, ZoomIn, ZoomOut, Maximize2, MapPin, Eye, Radio, Compass, Flame, AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import { IncidentReportItem } from '../types/incident';
import { EmergencyPriorityItem, EmergencyPriorityLevel } from '../types/emergencyPriority';

interface IncidentGisMapProps {
  incidents: IncidentReportItem[];
  selectedIncident: IncidentReportItem | null;
  onSelectIncident: (incident: IncidentReportItem) => void;
  priorityItems?: EmergencyPriorityItem[];
  selectedPriorityItem?: EmergencyPriorityItem | null;
  onSelectPriorityItem?: (item: EmergencyPriorityItem) => void;
}

export const IncidentGisMap: React.FC<IncidentGisMapProps> = ({
  incidents,
  selectedIncident,
  onSelectIncident,
  priorityItems = [],
  selectedPriorityItem,
  onSelectPriorityItem,
}) => {
  const { t } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapLayer, setMapLayer] = useState<'carto' | 'terrain' | 'satellite'>('carto');
  const [displayMode, setDisplayMode] = useState<'PRIORITY' | 'INCIDENTS'>('PRIORITY');

  // NER Default Center
  const NER_CENTER: [number, number] = [26.2006, 92.9376];

  const TILE_URLS = {
    carto: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  };

  // Helper to get marker color and icon for incident type
  const getTypeConfig = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('landslide')) {
      return { bg: '#dc2626', border: '#991b1b', label: 'Landslide', iconText: '⛰️' };
    }
    if (t.includes('flood') || t.includes('water') || t.includes('seepage') || t.includes('river')) {
      return { bg: '#0284c7', border: '#0369a1', label: 'Water Hazard', iconText: '🌊' };
    }
    if (t.includes('crack') || t.includes('subsidence')) {
      return { bg: '#d97706', border: '#b45309', label: 'Ground Crack', iconText: '⚡' };
    }
    if (t.includes('road') || t.includes('blocked')) {
      return { bg: '#ea580c', border: '#c2410c', label: 'Road Block', iconText: '🚧' };
    }
    if (t.includes('rockfall')) {
      return { bg: '#7c2d12', border: '#451a03', label: 'Rockfall', iconText: '🪨' };
    }
    if (t.includes('slope') || t.includes('movement') || t.includes('mudslide')) {
      return { bg: '#c2410c', border: '#9a3412', label: 'Slope/Mudslide', iconText: '⚠️' };
    }
    return { bg: '#475569', border: '#334155', label: 'Incident', iconText: '📍' };
  };

  // Helper for priority color config
  const getPriorityConfig = (level: EmergencyPriorityLevel) => {
    switch (level) {
      case 'CRITICAL':
        return { bg: '#e11d48', glow: 'rgba(225, 29, 72, 0.35)', label: 'CRITICAL', ring: '#9f1239' };
      case 'HIGH':
        return { bg: '#f97316', glow: 'rgba(249, 115, 22, 0.3)', label: 'HIGH', ring: '#c2410c' };
      case 'MEDIUM':
        return { bg: '#eab308', glow: 'rgba(234, 179, 8, 0.25)', label: 'MEDIUM', ring: '#a16207' };
      case 'LOW':
      default:
        return { bg: '#2563eb', glow: 'rgba(37, 99, 235, 0.2)', label: 'LOW', ring: '#1d4ed8' };
    }
  };

  // Helper for status badge styling
  const getStatusColor = (status: string) => {
    const s = (status || '').toUpperCase().replace(/_/g, ' ');
    if (s === 'VERIFIED') return '#059669';
    if (s === 'RESOLVED') return '#10b981';
    if (s === 'UNDER REVIEW') return '#2563eb';
    return '#f59e0b'; // SUBMITTED
  };

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: NER_CENTER,
        zoom: 7,
        zoomControl: false,
        attributionControl: false,
      });

      const tileLayer = L.tileLayer(TILE_URLS[mapLayer], {
        maxZoom: 18,
        attribution: '&copy; CartoDB & OpenStreetMap',
      }).addTo(map);
      tileLayerRef.current = tileLayer;

      const markersGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = markersGroup;

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Update Tile Layer
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const newTileLayer = L.tileLayer(TILE_URLS[mapLayer], {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap',
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newTileLayer;
  }, [mapLayer]);

  // 3. Render Map Markers (Priority Mode or Incident Mode)
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;
    const markersGroup = markersGroupRef.current;
    markersGroup.clearLayers();

    if (displayMode === 'PRIORITY' && priorityItems.length > 0) {
      // Render Priority Markers
      priorityItems.forEach((pItem, idx) => {
        if (typeof pItem.latitude !== 'number' || typeof pItem.longitude !== 'number') return;
        if (isNaN(pItem.latitude) || isNaN(pItem.longitude)) return;

        const isSelected = selectedPriorityItem?.id === pItem.id;
        const pCfg = getPriorityConfig(pItem.priorityLevel);
        const isCritical = pItem.priorityLevel === 'CRITICAL';

        const customDivIcon = L.divIcon({
          className: 'emergency-priority-gis-marker',
          html: `
            <div style="
              position: relative;
              cursor: pointer;
              transform: translate(-50%, -50%);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              ${isCritical || isSelected ? `
                <div style="
                  position: absolute;
                  width: ${isSelected ? '50px' : '42px'};
                  height: ${isSelected ? '50px' : '42px'};
                  border-radius: 50%;
                  background: ${pCfg.glow};
                  border: 2px solid ${pCfg.bg};
                  animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
                "></div>
              ` : ''}
              <div style="
                min-width: 32px;
                height: 32px;
                padding: 0 6px;
                border-radius: 16px;
                background: ${pCfg.bg};
                border: 2px solid #ffffff;
                box-shadow: 0 4px 10px rgba(0,0,0,0.35);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 3px;
                color: #ffffff;
                font-family: system-ui, sans-serif;
                font-size: 11px;
                font-weight: 900;
                letter-spacing: -0.02em;
                transition: all 0.2s ease;
              ">
                <span>#${idx + 1}</span>
                <span style="font-size: 9px; opacity: 0.9; text-transform: uppercase;">${pItem.priorityLevel[0]}</span>
              </div>
            </div>
          `,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });

        const marker = L.marker([pItem.latitude, pItem.longitude], {
          icon: customDivIcon,
          title: `Priority #${idx + 1}: ${pItem.priorityLevel} - ${pItem.locationName}`,
        });

        const popupHtml = `
          <div style="font-family: system-ui, sans-serif; min-width: 250px; max-width: 310px; padding: 2px; color: #0f172a;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b;">
                Rank #${idx + 1} Emergency Target
              </span>
              <span style="
                font-size: 9px;
                font-weight: 900;
                padding: 2px 7px;
                border-radius: 4px;
                text-transform: uppercase;
                background: ${pCfg.bg};
                color: #ffffff;
              ">
                ${pItem.priorityLevel} PRIORITY
              </span>
            </div>

            <div style="font-size: 14px; font-weight: 800; color: #0f172a; line-height: 1.25; margin-bottom: 4px;">
              ${pItem.locationName}
            </div>

            <div style="display: flex; align-items: baseline; gap: 6px; margin-bottom: 6px;">
              <span style="font-size: 18px; font-weight: 900; color: ${pCfg.bg};">
                ${pItem.riskScore}
              </span>
              <span style="font-size: 11px; font-weight: 700; color: #64748b;">
                / 100 Risk Score (${pItem.riskLevel})
              </span>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; font-size: 11px; margin-bottom: 6px;">
              <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 2px;">
                Main Priority Reason:
              </div>
              <div style="color: #1e293b; font-weight: 600; line-height: 1.35;">
                ${pItem.mainReason}
              </div>
            </div>

            <div style="font-size: 10px; color: #475569; margin-bottom: 4px;">
              🛣️ <strong>Road:</strong> ${pItem.affectedRoads.join(', ')}
            </div>

            ${pItem.nearbyInfrastructureOrVillage ? `
              <div style="font-size: 10px; color: #475569; margin-bottom: 6px;">
                🏢 <strong>Infrastructure:</strong> ${pItem.nearbyInfrastructureOrVillage}
              </div>
            ` : ''}

            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 9px; color: #64748b; margin-bottom: 8px;">
              <span>Status: <strong>${pItem.status.replace(/_/g, ' ')}</strong></span>
              <span>${new Date(pItem.lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST</span>
            </div>

            <button id="prio-focus-${pItem.id}" style="
              width: 100%;
              background: #0f172a;
              color: #ffffff;
              font-size: 11px;
              font-weight: 700;
              padding: 6px 0;
              border-radius: 6px;
              border: none;
              cursor: pointer;
            ">
              Inspect Priority Details →
            </button>
          </div>
        `;

        marker.bindPopup(popupHtml, {
          closeButton: true,
          offset: [0, -10],
        });

        marker.on('popupopen', () => {
          const btn = document.getElementById(`prio-focus-${pItem.id}`);
          if (btn) {
            btn.onclick = () => {
              if (onSelectPriorityItem) onSelectPriorityItem(pItem);
              if (pItem.sourceIncident) onSelectIncident(pItem.sourceIncident);
              mapInstanceRef.current?.closePopup();
            };
          }
        });

        marker.on('click', () => {
          if (onSelectPriorityItem) onSelectPriorityItem(pItem);
          if (pItem.sourceIncident) onSelectIncident(pItem.sourceIncident);
        });

        markersGroup.addLayer(marker);
      });
    } else {
      // Fallback: Standard Incident Markers
      incidents.forEach((inc) => {
        if (typeof inc.latitude !== 'number' || typeof inc.longitude !== 'number') return;
        if (isNaN(inc.latitude) || isNaN(inc.longitude)) return;

        const isSelected = selectedIncident?.reportId === inc.reportId;
        const typeCfg = getTypeConfig(inc.incidentType);
        const statusColor = getStatusColor(inc.status);

        const customDivIcon = L.divIcon({
          className: 'incident-gis-marker',
          html: `
            <div style="
              position: relative;
              cursor: pointer;
              transform: translate(-50%, -50%);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              ${isSelected ? `
                <div style="
                  position: absolute;
                  width: 44px;
                  height: 44px;
                  border-radius: 50%;
                  background: rgba(37, 99, 235, 0.25);
                  animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
                "></div>
              ` : ''}
              <div style="
                width: ${isSelected ? '36px' : '28px'};
                height: ${isSelected ? '36px' : '28px'};
                border-radius: 50%;
                background: ${typeCfg.bg};
                border: 2px solid #ffffff;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${isSelected ? '16px' : '13px'};
                transition: all 0.2s ease;
              ">
                <span>${typeCfg.iconText}</span>
              </div>
              <div style="
                position: absolute;
                bottom: -2px;
                right: -2px;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: ${statusColor};
                border: 1.5px solid #ffffff;
              "></div>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([inc.latitude, inc.longitude], {
          icon: customDivIcon,
          title: `${inc.incidentType} - ${inc.reportId}`,
        });

        const popupHtml = `
          <div style="font-family: system-ui, sans-serif; min-width: 190px; padding: 4px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
              <span style="font-weight: 800; font-size: 11px; color: #0f172a;">${inc.reportId}</span>
              <span style="font-size: 9px; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: ${statusColor}15; color: ${statusColor}; border: 1px solid ${statusColor}40;">
                ${inc.status.replace(/_/g, ' ')}
              </span>
            </div>
            <div style="font-weight: 700; font-size: 12px; color: ${typeCfg.bg}; margin-bottom: 2px;">
              ${inc.incidentType}
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
              📍 ${inc.locationName || 'GPS Location'}
            </div>
            <div style="font-size: 10px; color: #64748b; margin-bottom: 6px;">
              🕒 ${new Date(inc.submittedAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
            <button id="view-inc-${inc.reportId}" style="
              width: 100%;
              background: #2563eb;
              color: #ffffff;
              font-size: 11px;
              font-weight: 700;
              padding: 5px 0;
              border-radius: 6px;
              border: none;
              cursor: pointer;
            ">
              View & Update Status
            </button>
          </div>
        `;

        marker.bindPopup(popupHtml, {
          closeButton: true,
          offset: [0, -10],
        });

        marker.on('popupopen', () => {
          const btn = document.getElementById(`view-inc-${inc.reportId}`);
          if (btn) {
            btn.onclick = () => {
              onSelectIncident(inc);
              mapInstanceRef.current?.closePopup();
            };
          }
        });

        marker.on('click', () => {
          onSelectIncident(inc);
        });

        markersGroup.addLayer(marker);
      });
    }

    // Pan to selected priority item or selected incident
    if (selectedPriorityItem && typeof selectedPriorityItem.latitude === 'number' && typeof selectedPriorityItem.longitude === 'number') {
      mapInstanceRef.current.flyTo([selectedPriorityItem.latitude, selectedPriorityItem.longitude], 12, {
        duration: 1.2,
      });
    } else if (selectedIncident && typeof selectedIncident.latitude === 'number' && typeof selectedIncident.longitude === 'number') {
      mapInstanceRef.current.flyTo([selectedIncident.latitude, selectedIncident.longitude], 12, {
        duration: 1.2,
      });
    }
  }, [displayMode, priorityItems, incidents, selectedPriorityItem, selectedIncident, onSelectIncident, onSelectPriorityItem]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  const handleFitAll = () => {
    if (!mapInstanceRef.current) return;
    const points = displayMode === 'PRIORITY' && priorityItems.length > 0 ? priorityItems : incidents;
    const valid = points.filter((i) => typeof i.latitude === 'number' && typeof i.longitude === 'number');
    if (valid.length === 0) {
      mapInstanceRef.current.setView(NER_CENTER, 7);
      return;
    }
    const bounds = L.latLngBounds(valid.map((i) => [i.latitude, i.longitude]));
    mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  };

  return (
    <div className="relative w-full h-[440px] sm:h-[500px] rounded-xl overflow-hidden border border-slate-200 shadow-2xs bg-slate-100">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Left: Layer Selector & Priority Mode Switch */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5 bg-white/95 backdrop-blur-xs p-1.5 rounded-lg border border-slate-200/80 shadow-xs text-xs font-semibold text-slate-700">
        <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 hidden sm:inline">{t('gisMap.mode', 'Mode:')}</span>
        <button
          onClick={() => setDisplayMode('PRIORITY')}
          className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer flex items-center gap-1 ${
            displayMode === 'PRIORITY' ? 'bg-rose-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          <Flame className="w-3 h-3" />
          <span>{t('gisMap.priorityRanks', 'Priority Ranks')} ({priorityItems.length})</span>
        </button>
        <button
          onClick={() => setDisplayMode('INCIDENTS')}
          className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
            displayMode === 'INCIDENTS' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          {t('gisMap.rawIncidents', 'Raw Incidents')} ({incidents.length})
        </button>

        <span className="text-slate-300 mx-1">|</span>

        <button
          onClick={() => setMapLayer('carto')}
          className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
            mapLayer === 'carto' ? 'bg-slate-800 text-white font-bold' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          {t('gisMap.carto', 'Carto')}
        </button>
        <button
          onClick={() => setMapLayer('terrain')}
          className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
            mapLayer === 'terrain' ? 'bg-slate-800 text-white font-bold' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          {t('gisMap.topo', 'Topo')}
        </button>
        <button
          onClick={() => setMapLayer('satellite')}
          className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
            mapLayer === 'satellite' ? 'bg-slate-800 text-white font-bold' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          {t('gisMap.sat', 'Sat')}
        </button>
      </div>

      {/* Top Right: Zoom & Center Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        <button
          onClick={handleZoomIn}
          title={t('gisMap.zoomIn', 'Zoom In')}
          className="p-2 bg-white/95 hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200/80 shadow-xs transition-colors cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title={t('gisMap.zoomOut', 'Zoom Out')}
          className="p-2 bg-white/95 hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200/80 shadow-xs transition-colors cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleFitAll}
          title={t('gisMap.fitAll', 'Fit All Markers')}
          className="p-2 bg-white/95 hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200/80 shadow-xs transition-colors cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Map Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-xs p-2.5 rounded-lg border border-slate-200/80 shadow-xs text-[11px] text-slate-600 hidden md:block max-w-xs">
        <div className="font-bold text-slate-900 text-xs mb-1.5 flex items-center justify-between">
          <span>{displayMode === 'PRIORITY' ? t('gisMap.legendPriority', 'Emergency Response Priority') : t('gisMap.legendIncidents', 'GIS Incident Types')}</span>
          <span className="text-[10px] font-normal text-slate-500">
            {displayMode === 'PRIORITY' ? `${priorityItems.length} ${t('gisMap.targets', 'targets')}` : `${incidents.length} ${t('gisMap.onMap', 'on map')}`}
          </span>
        </div>
        {displayMode === 'PRIORITY' ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
              <span className="font-bold text-slate-800">{t('priority.criticalTarget', 'CRITICAL Target')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
              <span className="font-bold text-slate-800">{t('priority.highTarget', 'HIGH Target')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="text-slate-700">{t('priority.mediumTarget', 'MEDIUM Target')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span className="text-slate-700">{t('priority.lowTarget', 'LOW Target')}</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
              <span>{t('incidentTypes.landslideRock', 'Landslide / Rock')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>{t('incidentTypes.groundCrack', 'Ground Crack')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span>
              <span>{t('incidentTypes.waterHazard', 'Water Hazard')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span>
              <span>{t('incidentTypes.roadBlock', 'Road Block')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
