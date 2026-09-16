import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import {
  Search,
  MapPin,
  Compass,
  Crosshair,
  Filter,
  Layers,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  Radio,
  History,
  Route,
  ChevronDown,
  X,
  ExternalLink,
  Shield,
  Eye,
  SlidersHorizontal,
  Info,
  Globe,
  Map as MapIcon,
  Navigation,
} from 'lucide-react';
import { LocationItem } from '../types/weather';
import { IncidentReportItem, IncidentStatus } from '../types/incident';
import { fetchIncidents } from '../services/incidentService';
import { VERIFIED_NER_HISTORICAL_LANDSLIDES } from '../data/historicalLandslides';
import {
  ALL_DISTRICTS,
  INDIA_STATES_DATA,
  NER_STATE_REPRESENTATIVES,
} from '../data/indiaLocations';
import {
  NER_STATE_BOUNDARIES,
  STRATEGIC_MOUNTAIN_CORRIDORS,
  NER_WEATHER_STATIONS,
  GisWeatherStation,
  GisRoadCorridor,
} from '../data/gisInfrastructureData';
import { GisLayerControl, GisLayerVisibility } from './gis/GisLayerControl';
import { GisLegend } from './gis/GisLegend';
import { GisLiveSummary } from './gis/GisLiveSummary';
import { GisDetailDrawer, GisSelectedItem } from './gis/GisDetailDrawer';
import { HistoricalLandslideRecord } from '../types/environmental';

// 8 NER States list
const NER_STATES = [
  'All NER States',
  'Arunachal Pradesh',
  'Assam',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Sikkim',
  'Tripura',
];

const INCIDENT_TYPES = [
  'All Types',
  'Landslide',
  'Flash Flood',
  'Road Blockage',
  'Ground Crack',
  'Rockfall',
  'Slope Movement',
  'Mudflow',
  'Subsidence',
  'Riverbank Erosion',
];

const SEVERITIES = ['All Severities', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'];

const WORKFLOW_STATUSES = [
  'All Statuses',
  'VERIFIED',
  'SUBMITTED',
  'UNDER REVIEW',
  'RESOLVED',
];

const TIME_RANGES = [
  { label: 'All Time', days: 0 },
  { label: 'Last 24 Hours', days: 1 },
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
];

type BaseMapProvider = 'topo' | 'carto' | 'satellite' | 'osm';

interface GisMonitorViewProps {
  selectedLocation: LocationItem;
  onSelectLocation: (loc: LocationItem) => void;
}

export const GisMonitorView: React.FC<GisMonitorViewProps> = ({
  selectedLocation,
  onSelectLocation,
}) => {
  const { t } = useTranslation();
  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Live Data State
  const [incidents, setIncidents] = useState<IncidentReportItem[]>([]);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState<boolean>(true);
  const [incidentFetchError, setIncidentFetchError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Filters & Controls
  const [selectedState, setSelectedState] = useState<string>('All NER States');
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>('All Districts');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIncidentType, setSelectedIncidentType] = useState<string>('All Types');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All Severities');
  const [selectedStatus, setSelectedStatus] = useState<string>('All Statuses');
  const [selectedTimeRangeDays, setSelectedTimeRangeDays] = useState<number>(0);
  const [baseMap, setBaseMap] = useState<BaseMapProvider>('carto');
  const [viewScope, setViewScope] = useState<'NER' | 'INDIA'>('NER');

  // UI state
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState<boolean>(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);
  const [isBaseMapMenuOpen, setIsBaseMapMenuOpen] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<GisSelectedItem | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);

  // Active Layers
  const [layers, setLayers] = useState<GisLayerVisibility>({
    incidents: true,
    riskZones: true,
    historicalLandslides: true,
    weatherStations: true,
    roadCorridors: true,
    boundaries: true,
  });

  // Fetch real incidents from MongoDB via backend
  const loadIncidents = useCallback(async () => {
    setIsLoadingIncidents(true);
    setIncidentFetchError(null);
    try {
      const data = await fetchIncidents();
      setIncidents(data);
      setLastSyncTime(new Date());
    } catch (err: any) {
      console.error('[GIS] Error loading incidents:', err);
      setIncidentFetchError('Unable to load GIS data');
    } finally {
      setIsLoadingIncidents(false);
    }
  }, []);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  // Districts for current selected state
  const availableDistricts = useMemo(() => {
    if (selectedState === 'All NER States') {
      return ALL_DISTRICTS.filter((d) => d.isNer);
    }
    const stateObj = INDIA_STATES_DATA.find((s) => s.name === selectedState);
    return stateObj ? stateObj.districts : [];
  }, [selectedState]);

  // Filtered Incidents based on state, district, type, severity, status, and time range
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // State filter
      if (selectedState !== 'All NER States') {
        const incState = (inc as any).state || '';
        if (incState && incState.toLowerCase() !== selectedState.toLowerCase()) {
          return false;
        }
      }

      // District filter
      if (selectedDistrictName !== 'All Districts') {
        const incDistrict = (inc as any).district || '';
        if (incDistrict && incDistrict.toLowerCase() !== selectedDistrictName.toLowerCase()) {
          return false;
        }
      }

      // Type filter
      if (selectedIncidentType !== 'All Types') {
        if (
          !inc.incidentType ||
          inc.incidentType.toLowerCase() !== selectedIncidentType.toLowerCase()
        ) {
          return false;
        }
      }

      // Severity filter
      if (selectedSeverity !== 'All Severities') {
        const incSev = (inc as any).severity || '';
        if (incSev.toLowerCase() !== selectedSeverity.toLowerCase()) {
          return false;
        }
      }

      // Status filter
      if (selectedStatus !== 'All Statuses') {
        if (inc.status !== selectedStatus) {
          return false;
        }
      }

      // Time range filter
      if (selectedTimeRangeDays > 0) {
        const dateStr = inc.submittedAt || (inc as any).createdAt;
        if (dateStr) {
          const incDate = new Date(dateStr).getTime();
          const cutoff = Date.now() - selectedTimeRangeDays * 24 * 60 * 60 * 1000;
          if (incDate < cutoff) return false;
        }
      }

      // Search Query filter (reportId, locationName, description)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = inc.reportId.toLowerCase().includes(q);
        const matchesLoc = (inc.locationName || '').toLowerCase().includes(q);
        const matchesDesc = (inc.description || '').toLowerCase().includes(q);
        const matchesType = (inc.incidentType || '').toLowerCase().includes(q);
        if (!matchesId && !matchesLoc && !matchesDesc && !matchesType) {
          return false;
        }
      }

      return true;
    });
  }, [
    incidents,
    selectedState,
    selectedDistrictName,
    selectedIncidentType,
    selectedSeverity,
    selectedStatus,
    selectedTimeRangeDays,
    searchQuery,
  ]);

  // Filtered Historical Landslides
  const filteredHistoricalLandslides = useMemo(() => {
    return VERIFIED_NER_HISTORICAL_LANDSLIDES.filter((hist) => {
      if (selectedState !== 'All NER States') {
        if (hist.state.toLowerCase() !== selectedState.toLowerCase()) return false;
      }
      if (selectedDistrictName !== 'All Districts') {
        if (hist.district.toLowerCase() !== selectedDistrictName.toLowerCase()) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesLoc = hist.locationName.toLowerCase().includes(q);
        const matchesDist = hist.district.toLowerCase().includes(q);
        const matchesType = hist.landslideType.toLowerCase().includes(q);
        const matchesTrig = hist.trigger.toLowerCase().includes(q);
        if (!matchesLoc && !matchesDist && !matchesType && !matchesTrig) return false;
      }
      return true;
    });
  }, [selectedState, selectedDistrictName, searchQuery]);

  // Filtered Weather Stations
  const filteredWeatherStations = useMemo(() => {
    return NER_WEATHER_STATIONS.filter((ws) => {
      if (selectedState !== 'All NER States') {
        if (ws.state.toLowerCase() !== selectedState.toLowerCase()) return false;
      }
      if (selectedDistrictName !== 'All Districts') {
        if (ws.district.toLowerCase() !== selectedDistrictName.toLowerCase()) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          ws.name.toLowerCase().includes(q) ||
          ws.code.toLowerCase().includes(q) ||
          ws.district.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedState, selectedDistrictName, searchQuery]);

  // Evaluated district risk zones for NER (using real district locations & slope/elevation criteria)
  const evaluatedDistrictRiskZones = useMemo(() => {
    return availableDistricts.map((district) => {
      // Risk evaluation based on geographic elevation and susceptibility
      let riskScore = 45; // baseline moderate
      let riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' = 'MODERATE';

      const elevation = district.elevationMeters || 200;
      if (elevation > 1400 || district.name.includes('Khasi') || district.name.includes('Dima Hasao') || district.name.includes('Sikkim') || district.name.includes('Kohima')) {
        riskScore = 84;
        riskLevel = 'CRITICAL';
      } else if (elevation > 600 || district.name.includes('Kamrup') || district.name.includes('Papum') || district.name.includes('Aizawl')) {
        riskScore = 68;
        riskLevel = 'HIGH';
      } else if (elevation > 200) {
        riskScore = 52;
        riskLevel = 'MODERATE';
      } else {
        riskScore = 28;
        riskLevel = 'LOW';
      }

      return {
        district: district.name,
        state: district.state,
        latitude: district.latitude,
        longitude: district.longitude,
        elevation: district.elevationMeters,
        riskScore,
        riskLevel,
      };
    });
  }, [availableDistricts]);

  // Counts for summary widget & layers
  const summaryCounts = useMemo(() => {
    const activeIncidents = filteredIncidents.length;
    const criticalIncidents = filteredIncidents.filter(
      (i) => (i as any).severity === 'CRITICAL' || i.incidentType === 'Landslide'
    ).length;
    const criticalZones = evaluatedDistrictRiskZones.filter((z) => z.riskLevel === 'CRITICAL').length;
    const highRiskZones = evaluatedDistrictRiskZones.filter((z) => z.riskLevel === 'HIGH').length;
    const historicalCount = filteredHistoricalLandslides.length;
    const stationsCount = filteredWeatherStations.length;

    return {
      activeIncidents,
      critical: criticalIncidents + criticalZones,
      highRisk: highRiskZones,
      historicalEvents: historicalCount,
      monitoringStations: stationsCount,
    };
  }, [filteredIncidents, evaluatedDistrictRiskZones, filteredHistoricalLandslides, filteredWeatherStations]);

  // Basemap URLs
  const getTileUrl = (provider: BaseMapProvider) => {
    switch (provider) {
      case 'topo':
        return 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'osm':
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      case 'carto':
      default:
        return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    }
  };

  const getTileAttribution = (provider: BaseMapProvider) => {
    switch (provider) {
      case 'topo':
        return '&copy; OpenTopoMap &copy; OpenStreetMap contributors';
      case 'satellite':
        return 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
      case 'osm':
        return '&copy; OpenStreetMap contributors';
      case 'carto':
      default:
        return '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors';
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default view centered on North East Region (Assam / Meghalaya centroid)
      const map = L.map(mapContainerRef.current, {
        center: [26.2, 92.9],
        zoom: 7,
        minZoom: 4,
        maxZoom: 18,
        zoomControl: false,
      });

      // Scale bar
      L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

      // Custom zoom control in bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Initial Tile Layer
      const initialTileLayer = L.tileLayer(getTileUrl('carto'), {
        attribution: getTileAttribution('carto'),
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      tileLayerRef.current = initialTileLayer;

      // Feature Group for dynamic overlays
      const featureGroup = L.featureGroup().addTo(map);
      featureGroupRef.current = featureGroup;

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer when baseMap changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const newTileLayer = L.tileLayer(getTileUrl(baseMap), {
      attribution: getTileAttribution(baseMap),
      maxZoom: baseMap === 'topo' ? 17 : 19,
      subdomains: baseMap === 'carto' ? 'abcd' : 'abc',
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newTileLayer;
  }, [baseMap]);

  // Handle fly-to coordinates
  const handleFocusCoordinates = useCallback(
    (lat: number, lon: number, zoomLevel = 14) => {
      if (!mapInstanceRef.current) return;
      mapInstanceRef.current.flyTo([lat, lon], zoomLevel, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    },
    []
  );

  // Fly to selected State or All NER
  const handleStateChange = (stateName: string) => {
    setSelectedState(stateName);
    setSelectedDistrictName('All Districts');

    if (!mapInstanceRef.current) return;

    if (stateName === 'All NER States') {
      mapInstanceRef.current.flyTo([26.2, 92.9], 7, { duration: 1.2 });
    } else {
      const boundary = NER_STATE_BOUNDARIES[stateName];
      if (boundary) {
        mapInstanceRef.current.flyToBounds(boundary.bbox, {
          padding: [40, 40],
          duration: 1.2,
        });
      }
    }
  };

  // Fly to selected District
  const handleDistrictChange = (distName: string) => {
    setSelectedDistrictName(distName);
    if (distName === 'All Districts') return;

    const district = availableDistricts.find((d) => d.name === distName);
    if (district && mapInstanceRef.current) {
      onSelectLocation(district);
      mapInstanceRef.current.flyTo(
        [district.latitude, district.longitude],
        11,
        { duration: 1.2 }
      );
    }
  };

  // GPS Detect: High accuracy geolocation
  const handleGpsDetect = () => {
    setGpsError(null);
    setIsLocatingGps(true);

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      setIsLocatingGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setIsLocatingGps(false);

        if (!mapInstanceRef.current) return;

        // Remove previous user GPS marker if exists
        if (userMarkerRef.current) {
          mapInstanceRef.current.removeLayer(userMarkerRef.current);
        }

        // Custom pulsing GPS user icon
        const gpsIcon = L.divIcon({
          className: 'custom-gps-user-marker',
          html: `
            <div class="relative flex items-center justify-center">
              <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-cyan-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-5 w-5 bg-cyan-500 border-2 border-white shadow-lg"></span>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const newMarker = L.marker([latitude, longitude], { icon: gpsIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup(
            `<div class="text-xs p-1">
              <strong class="text-cyan-600 block mb-0.5">Your Current Location</strong>
              <div class="font-mono text-slate-700">${latitude.toFixed(5)}, ${longitude.toFixed(5)}</div>
            </div>`
          );

        userMarkerRef.current = newMarker;

        mapInstanceRef.current.flyTo([latitude, longitude], 13, {
          duration: 1.4,
        });
      },
      (error) => {
        setIsLocatingGps(false);
        console.warn('[GIS] GPS error:', error.message);
        setGpsError(`GPS Detection failed: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // Reset Map View to default NER bounds
  const handleResetView = () => {
    setSelectedState('All NER States');
    setSelectedDistrictName('All Districts');
    setSearchQuery('');
    setSelectedIncidentType('All Types');
    setSelectedSeverity('All Severities');
    setSelectedStatus('All Statuses');
    setSelectedTimeRangeDays(0);
    setViewScope('NER');

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([26.2, 92.9], 7, { duration: 1.0 });
    }
  };

  // Scope Toggle (NER vs All India)
  const handleToggleScope = (scope: 'NER' | 'INDIA') => {
    setViewScope(scope);
    if (!mapInstanceRef.current) return;

    if (scope === 'NER') {
      mapInstanceRef.current.flyTo([26.2, 92.9], 7, { duration: 1.2 });
    } else {
      mapInstanceRef.current.flyTo([22.5, 82.5], 5, { duration: 1.2 });
    }
  };

  // RENDER ALL ACTIVE GIS LAYERS ON THE MAP
  useEffect(() => {
    if (!mapInstanceRef.current || !featureGroupRef.current) return;

    const group = featureGroupRef.current;
    group.clearLayers();

    // 1. NER State Boundaries Layer
    if (layers.boundaries) {
      Object.entries(NER_STATE_BOUNDARIES).forEach(([stName, bound]) => {
        // If state is selected, highlight it; else show subtle boundary polygon
        const isSelected = selectedState === stName;

        const poly = L.polygon(bound.polygon, {
          color: isSelected ? '#0284c7' : '#0d9488',
          weight: isSelected ? 2.5 : 1.2,
          opacity: isSelected ? 0.9 : 0.45,
          dashArray: isSelected ? undefined : '4, 4',
          fillColor: isSelected ? '#38bdf8' : '#14b8a6',
          fillOpacity: isSelected ? 0.12 : 0.03,
        });

        poly.bindTooltip(
          `<div class="text-[11px] font-bold text-slate-900">${bound.name} (${bound.code})</div>`,
          { sticky: true }
        );

        poly.on('click', () => {
          handleStateChange(stName);
        });

        group.addLayer(poly);
      });
    }

    // 2. Strategic Mountain Lifeline Highway Corridors Layer
    if (layers.roadCorridors) {
      STRATEGIC_MOUNTAIN_CORRIDORS.forEach((corridor) => {
        const polyline = L.polyline(corridor.coordinates, {
          color:
            corridor.vulnerability === 'EXTREME'
              ? '#dc2626'
              : corridor.vulnerability === 'HIGH'
              ? '#ea580c'
              : '#4f46e5',
          weight: 3.5,
          opacity: 0.85,
        });

        polyline.bindTooltip(
          `<div class="text-xs p-1">
            <strong class="text-indigo-600 block">${corridor.highwayNumber}: ${corridor.name}</strong>
            <div class="text-[10px] text-slate-600">${corridor.significance}</div>
            <div class="text-[10px] text-rose-600 font-semibold">${corridor.vulnerability} Landslide Vulnerability</div>
          </div>`,
          { sticky: true }
        );

        polyline.on('click', () => {
          setSelectedItem({ type: 'ROAD_CORRIDOR', data: corridor });
        });

        group.addLayer(polyline);
      });
    }

    // 3. Risk Zones Heatmap Layer
    if (layers.riskZones) {
      evaluatedDistrictRiskZones.forEach((zone) => {
        let color = '#10b981';
        let radius = 12000; // 12km
        let fillOpacity = 0.15;

        if (zone.riskLevel === 'CRITICAL') {
          color = '#e11d48';
          radius = 24000;
          fillOpacity = 0.22;
        } else if (zone.riskLevel === 'HIGH') {
          color = '#f97316';
          radius = 18000;
          fillOpacity = 0.18;
        } else if (zone.riskLevel === 'MODERATE') {
          color = '#f59e0b';
          radius = 14000;
          fillOpacity = 0.12;
        }

        const circle = L.circle([zone.latitude, zone.longitude], {
          color,
          fillColor: color,
          fillOpacity,
          weight: 1.5,
          radius,
        });

        circle.bindTooltip(
          `<div class="text-xs p-1">
            <strong class="text-slate-900 block">${zone.district} District (${zone.state})</strong>
            <span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white mt-1" style="background-color: ${color}">
              ${zone.riskLevel} RISK (${zone.riskScore}/100)
            </span>
          </div>`,
          { sticky: true }
        );

        circle.on('click', () => {
          setSelectedItem({
            type: 'RISK_ZONE',
            data: {
              district: zone.district,
              state: zone.state,
              riskLevel: zone.riskLevel,
              riskScore: zone.riskScore,
              latitude: zone.latitude,
              longitude: zone.longitude,
            },
          });
        });

        group.addLayer(circle);
      });
    }

    // 4. Historical Landslides Layer (GSI / SDMA)
    if (layers.historicalLandslides) {
      filteredHistoricalLandslides.forEach((hist) => {
        const histIcon = L.divIcon({
          className: 'custom-historical-landslide-icon',
          html: `
            <div class="w-6 h-6 rounded-md bg-orange-600 border border-orange-200 text-white flex items-center justify-center font-bold text-[10px] shadow-md hover:scale-110 transition-transform cursor-pointer">
              ⚠
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([hist.latitude, hist.longitude], {
          icon: histIcon,
        });

        marker.bindTooltip(
          `<div class="text-xs p-1">
            <span class="text-[10px] font-mono text-orange-600 font-bold block">${hist.id}</span>
            <strong class="text-slate-900 block">${hist.locationName} (${hist.district})</strong>
            <div class="text-[10px] text-slate-600">${hist.landslideType} &bull; ${hist.date}</div>
            <div class="text-[10px] text-rose-600 font-semibold">${hist.fatalities || 0} Fatalities</div>
          </div>`,
          { sticky: true }
        );

        marker.on('click', () => {
          setSelectedItem({ type: 'HISTORICAL', data: hist });
        });

        group.addLayer(marker);
      });
    }

    // 5. IMD Weather & Telemetry Stations Layer
    if (layers.weatherStations) {
      filteredWeatherStations.forEach((station) => {
        const stationIcon = L.divIcon({
          className: 'custom-weather-station-icon',
          html: `
            <div class="w-5 h-5 rounded-full bg-cyan-500 border-2 border-white text-slate-900 flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer">
              <span class="w-1.5 h-1.5 rounded-full bg-slate-900"></span>
            </div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        const marker = L.marker([station.latitude, station.longitude], {
          icon: stationIcon,
        });

        marker.bindTooltip(
          `<div class="text-xs p-1">
            <strong class="text-cyan-700 block">${station.name}</strong>
            <div class="text-[10px] text-slate-600">${station.stationType} &bull; ${station.elevationMeters}m MSL</div>
            <div class="text-[10px] text-slate-500 font-mono">${station.code}</div>
          </div>`,
          { sticky: true }
        );

        marker.on('click', () => {
          setSelectedItem({ type: 'WEATHER_STATION', data: station });
        });

        group.addLayer(marker);
      });
    }

    // 6. Live Incidents Layer (Real MongoDB data)
    if (layers.incidents) {
      filteredIncidents.forEach((inc) => {
        const isCritical =
          (inc as any).severity === 'CRITICAL' ||
          inc.status === 'VERIFIED' ||
          inc.incidentType === 'Landslide';

        // Color coding by incident type
        let badgeBg = 'bg-rose-600';
        let badgeBorder = 'border-white';
        let glyph = '⚠';

        if (inc.incidentType === 'Flash Flood' || inc.incidentType === 'Riverbank Erosion') {
          badgeBg = 'bg-sky-600';
          glyph = '🌊';
        } else if (inc.incidentType === 'Road Blockage') {
          badgeBg = 'bg-amber-600';
          glyph = '🚧';
        } else if (inc.incidentType === 'Ground Crack' || inc.incidentType === 'Subsidence') {
          badgeBg = 'bg-orange-600';
          glyph = '⚡';
        } else if (inc.incidentType === 'Rockfall') {
          badgeBg = 'bg-stone-700';
          glyph = '🪨';
        }

        const incidentIcon = L.divIcon({
          className: 'custom-incident-marker',
          html: `
            <div class="relative flex items-center justify-center cursor-pointer group">
              ${
                isCritical
                  ? `<span class="animate-ping absolute inline-flex h-8 w-8 rounded-full ${badgeBg} opacity-60"></span>`
                  : ''
              }
              <div class="relative w-7 h-7 rounded-full ${badgeBg} ${badgeBorder} border-2 flex items-center justify-center text-white text-[11px] shadow-lg group-hover:scale-110 transition-transform">
                ${glyph}
              </div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([inc.latitude, inc.longitude], {
          icon: incidentIcon,
        });

        marker.bindTooltip(
          `<div class="text-xs p-1">
            <span class="text-[10px] font-mono font-bold text-rose-600 block">${inc.reportId}</span>
            <strong class="text-slate-900 block">${inc.incidentType || 'Hazard Incident'}</strong>
            <div class="text-[10px] text-slate-600">${inc.locationName || 'GPS Location'}</div>
            <div class="mt-1 flex items-center gap-1.5">
              <span class="px-1.5 py-0.2 rounded text-[9px] font-bold text-white ${badgeBg}">
                ${inc.status}
              </span>
              ${
                (inc as any).severity
                  ? `<span class="text-[9px] font-semibold text-rose-600">${(inc as any).severity}</span>`
                  : ''
              }
            </div>
          </div>`,
          { sticky: true }
        );

        marker.on('click', () => {
          setSelectedItem({
            type: 'INCIDENT',
            data: inc,
            riskScore: (inc as any).riskScore,
          });
        });

        group.addLayer(marker);
      });
    }
  }, [
    layers,
    selectedState,
    filteredIncidents,
    filteredHistoricalLandslides,
    filteredWeatherStations,
    evaluatedDistrictRiskZones,
  ]);

  return (
    <div
      id="gis-monitor-container"
      className="relative w-full h-[calc(100vh-140px)] min-h-[640px] rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-950 flex flex-col"
    >
      {/* =========================================================================
          TOP FLOATING COMMAND HUD (CONTROLS & SEARCH)
         ========================================================================= */}
      <div
        id="gis-top-command-hud"
        className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2.5 pointer-events-none"
      >
        {/* Left Section: Scope, State & District Filter HUD */}
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          {/* Scope Selector: NER vs All India */}
          <div className="flex items-center bg-slate-900/95 backdrop-blur-md p-0.5 rounded-lg border border-slate-700/80 shadow-lg">
            <button
              id="gis-scope-ner-btn"
              onClick={() => handleToggleScope('NER')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewScope === 'NER'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {t('gisMap.nerScope', 'NER 8-State')}
            </button>
            <button
              id="gis-scope-india-btn"
              onClick={() => handleToggleScope('INDIA')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewScope === 'INDIA'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {t('gisMap.indiaScope', 'All India')}
            </button>
          </div>

          {/* State Selector Dropdown */}
          <div className="relative">
            <select
              id="gis-state-selector"
              value={selectedState}
              onChange={(e) => handleStateChange(e.target.value)}
              aria-label={t('gisMap.selectState', 'Select State')}
              className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-slate-100 text-xs font-semibold rounded-lg px-3 py-1.5 pr-8 appearance-none focus:outline-hidden focus:border-blue-500 shadow-lg cursor-pointer hover:bg-slate-800 transition-colors"
            >
              {NER_STATES.map((state) => (
                <option key={state} value={state} className="bg-slate-900 text-slate-100">
                  {state === 'All NER States' ? t('gisMap.allNerStates', 'All NER States') : state}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* District Selector Dropdown */}
          <div className="relative hidden sm:block">
            <select
              id="gis-district-selector"
              value={selectedDistrictName}
              onChange={(e) => handleDistrictChange(e.target.value)}
              aria-label={t('gisMap.selectDistrict', 'Select District')}
              className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-slate-100 text-xs font-semibold rounded-lg px-3 py-1.5 pr-8 appearance-none focus:outline-hidden focus:border-blue-500 shadow-lg cursor-pointer hover:bg-slate-800 transition-colors max-w-[180px] truncate"
            >
              <option value="All Districts" className="bg-slate-900 text-slate-100">
                {t('gisMap.allDistricts', 'All Districts')} ({availableDistricts.length})
              </option>
              {availableDistricts.map((d) => (
                <option key={d.id} value={d.name} className="bg-slate-900 text-slate-100">
                  {d.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* GPS Auto-Detect Button */}
          <button
            id="gis-gps-detect-btn"
            onClick={handleGpsDetect}
            disabled={isLocatingGps}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-slate-200 hover:text-white hover:bg-slate-800 text-xs font-semibold shadow-lg transition-colors cursor-pointer disabled:opacity-50"
            title={t('gisMap.gpsDetectTitle', 'Detect My Location via Device GPS')}
          >
            <Crosshair
              className={`w-3.5 h-3.5 text-cyan-400 ${
                isLocatingGps ? 'animate-spin' : ''
              }`}
            />
            <span className="hidden md:inline">{t('gisMap.gpsDetect', 'GPS Detect')}</span>
          </button>

          {/* Reset Map View */}
          <button
            id="gis-reset-view-btn"
            onClick={handleResetView}
            className="p-2 rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 shadow-lg transition-colors cursor-pointer"
            title={t('gisMap.resetMapTitle', 'Reset Map to Full Region')}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Section: Search, Filters, Layer Manager, Basemap Switcher */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Instant Search Bar */}
          <div className="relative w-36 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
            <input
              id="gis-search-input"
              type="text"
              placeholder={t('gisMap.searchPlaceholder', 'Search districts, IDs, hazards...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 shadow-lg transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Advanced Filter Popover Toggle */}
          <div className="relative">
            <button
              id="gis-filter-toggle-btn"
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold backdrop-blur-md transition-all shadow-lg cursor-pointer ${
                isFilterPanelOpen ||
                selectedIncidentType !== 'All Types' ||
                selectedSeverity !== 'All Severities' ||
                selectedStatus !== 'All Statuses' ||
                selectedTimeRangeDays > 0
                  ? 'bg-blue-600 text-white border-blue-400 shadow-blue-500/20'
                  : 'bg-slate-900/95 text-slate-200 border-slate-700/80 hover:bg-slate-800 hover:text-white'
              }`}
              title={t('gisMap.filterTitle', 'Filter Incidents by Type, Severity & Status')}
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{t('gisMap.filters', 'Filters')}</span>
            </button>

            {/* Filter Dropdown Panel */}
            {isFilterPanelOpen && (
              <div
                id="gis-filter-panel"
                className="absolute top-10 right-0 w-72 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl p-3 z-[1000] text-slate-100 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold uppercase tracking-wider text-[11px] text-slate-300">
                    {t('gisMap.incidentFilters', 'Incident Filters')}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedIncidentType('All Types');
                      setSelectedSeverity('All Severities');
                      setSelectedStatus('All Statuses');
                      setSelectedTimeRangeDays(0);
                    }}
                    className="text-[10px] text-blue-400 hover:text-blue-300 underline cursor-pointer"
                  >
                    {t('gisMap.resetFilters', 'Reset Filters')}
                  </button>
                </div>

                {/* Incident Type */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-semibold">
                    {t('gisMap.incidentTypeLabel', 'Incident Type:')}
                  </label>
                  <select
                    value={selectedIncidentType}
                    onChange={(e) => setSelectedIncidentType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
                  >
                    {INCIDENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Severity */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-semibold">
                    {t('gisMap.severityLabel', 'Severity:')}
                  </label>
                  <select
                    value={selectedSeverity}
                    onChange={(e) => setSelectedSeverity(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
                  >
                    {SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Workflow Status */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-semibold">
                    {t('gisMap.workflowStatusLabel', 'Workflow Status:')}
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
                  >
                    {WORKFLOW_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Time Range */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-semibold">
                    {t('gisMap.reportedTimeframe', 'Reported Timeframe:')}
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    {TIME_RANGES.map((tr) => (
                      <button
                        key={tr.label}
                        onClick={() => setSelectedTimeRangeDays(tr.days)}
                        className={`p-1 rounded text-[10px] font-medium border text-center transition-colors cursor-pointer ${
                          selectedTimeRangeDays === tr.days
                            ? 'bg-blue-600 text-white border-blue-400'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {tr.days === 0
                          ? t('gisMap.allTime', 'All Time')
                          : tr.days === 1
                          ? t('gisMap.last24Hours', 'Last 24 Hours')
                          : tr.days === 7
                          ? t('gisMap.last7Days', 'Last 7 Days')
                          : t('gisMap.last30Days', 'Last 30 Days')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* GIS Layer Control Popover */}
          <GisLayerControl
            layers={layers}
            onToggleLayer={(key) =>
              setLayers((prev) => ({ ...prev, [key]: !prev[key] }))
            }
            counts={{
              incidents: filteredIncidents.length,
              riskZones: evaluatedDistrictRiskZones.length,
              historicalLandslides: filteredHistoricalLandslides.length,
              weatherStations: filteredWeatherStations.length,
              roadCorridors: STRATEGIC_MOUNTAIN_CORRIDORS.length,
            }}
            isOpen={isLayerPanelOpen}
            onToggleOpen={() => setIsLayerPanelOpen(!isLayerPanelOpen)}
          />

          {/* Basemap Switcher Popover */}
          <div className="relative">
            <button
              id="gis-basemap-switcher-btn"
              onClick={() => setIsBaseMapMenuOpen(!isBaseMapMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-slate-200 hover:text-white hover:bg-slate-800 text-xs font-semibold shadow-lg transition-colors cursor-pointer"
              title={t('gisMap.switchBasemap', 'Switch Basemap Provider')}
            >
              <MapIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline capitalize">{baseMap}</span>
            </button>

            {isBaseMapMenuOpen && (
              <div
                id="gis-basemap-menu"
                className="absolute top-10 right-0 w-48 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl p-2 z-[1000] text-slate-100 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-150"
              >
                <button
                  onClick={() => {
                    setBaseMap('carto');
                    setIsBaseMapMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer ${
                    baseMap === 'carto'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span>{t('gisMap.basemapCarto', 'Carto Voyager (Clean)')}</span>
                </button>
                <button
                  onClick={() => {
                    setBaseMap('topo');
                    setIsBaseMapMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer ${
                    baseMap === 'topo'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span>{t('gisMap.basemapTopo', 'OpenTopoMap (Terrain)')}</span>
                </button>
                <button
                  onClick={() => {
                    setBaseMap('satellite');
                    setIsBaseMapMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer ${
                    baseMap === 'satellite'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span>{t('gisMap.basemapSatellite', 'ESRI World Imagery (Satellite)')}</span>
                </button>
                <button
                  onClick={() => {
                    setBaseMap('osm');
                    setIsBaseMapMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer ${
                    baseMap === 'osm'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span>{t('gisMap.basemapOsm', 'OpenStreetMap Standard')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          ERROR / EMPTY STATE / GPS ALERTS BANNER
         ========================================================================= */}
      {incidentFetchError && (
        <div
          id="gis-error-banner"
          className="absolute top-16 left-3 right-3 z-[999] bg-rose-950/90 backdrop-blur-md border border-rose-500/60 text-rose-200 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-xl animate-in slide-in-from-top-2"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold">{incidentFetchError}</span>
            <span className="text-[11px] text-rose-300/80">
              {t('gisMap.checkMongoDb', 'Check database connectivity to MongoDB Atlas.')}
            </span>
          </div>
          <button
            onClick={loadIncidents}
            className="px-2.5 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded-md text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{t('gisMap.retryConnection', 'Retry Connection')}</span>
          </button>
        </div>
      )}

      {/* No live data notice if 0 incidents */}
      {!isLoadingIncidents && !incidentFetchError && incidents.length === 0 && (
        <div
          id="gis-no-data-notice"
          className="absolute top-16 left-3 z-[999] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-slate-300 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg"
        >
          <Info className="w-4 h-4 text-blue-400" />
          <span>{t('gisMap.noLiveData', 'No live GIS data available in database. Showing official reference layers.')}</span>
        </div>
      )}

      {gpsError && (
        <div
          id="gis-gps-error-banner"
          className="absolute top-28 left-3 z-[999] bg-amber-950/90 backdrop-blur-md border border-amber-500/60 text-amber-200 px-3.5 py-2 rounded-xl text-xs flex items-center justify-between gap-3 shadow-lg"
        >
          <span>{gpsError}</span>
          <button
            onClick={() => setGpsError(null)}
            className="text-amber-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* =========================================================================
          MAIN FULL-SCALE LEAFLET MAP CONTAINER
         ========================================================================= */}
      <div
        ref={mapContainerRef}
        id="gis-leaflet-canvas"
        className="w-full h-full z-0 cursor-grab active:cursor-grabbing bg-slate-950"
      />

      {/* =========================================================================
          BOTTOM-LEFT FLOATING ACTIVE LEGEND
         ========================================================================= */}
      <div className="absolute bottom-4 left-3 z-[1000] pointer-events-auto">
        <GisLegend layers={layers} />
      </div>

      {/* =========================================================================
          BOTTOM-RIGHT FLOATING TELEMETRY SUMMARY
         ========================================================================= */}
      <div className="absolute bottom-4 right-14 z-[1000] pointer-events-auto hidden md:block">
        <GisLiveSummary
          activeIncidentsCount={summaryCounts.activeIncidents}
          criticalCount={summaryCounts.critical}
          highRiskCount={summaryCounts.highRisk}
          historicalEventsCount={summaryCounts.historicalEvents}
          monitoringStationsCount={summaryCounts.monitoringStations}
          isSyncing={isLoadingIncidents}
          onRefresh={loadIncidents}
          lastUpdatedText={
            lastSyncTime
              ? lastSyncTime.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : null
          }
        />
      </div>

      {/* =========================================================================
          INTERACTIVE INSPECT DRAWER (FOR MARKERS & FEATURES)
         ========================================================================= */}
      <GisDetailDrawer
        selectedItem={selectedItem}
        onClose={() => setSelectedItem(null)}
        onFocusCoordinates={handleFocusCoordinates}
      />
    </div>
  );
};
