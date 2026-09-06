import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  RefreshCw,
  Filter,
  Search,
  MapPin,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Hourglass,
  Eye,
  Camera,
  Video,
  Layers,
  ChevronRight,
  Loader2,
  FileText,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { IncidentReportItem, IncidentStatus } from '../types/incident';
import { fetchIncidents, updateIncidentStatus } from '../services/incidentService';
import { IncidentGisMap } from './IncidentGisMap';
import { IncidentDetailModal } from './IncidentDetailModal';
import { ALL_DISTRICTS } from '../data/indiaLocations';
import { EmergencyResponsePrioritySection } from './EmergencyResponsePrioritySection';
import { buildEmergencyPriorityList } from '../services/emergencyPriorityService';
import { DistrictHeatmapPoint } from '../types/risk';
import { EmergencyPriorityItem } from '../types/emergencyPriority';
import { loadAllNerDistrictsProgressive } from '../services/nerRiskHeatmapService';

const NER_STATES = [
  'All States',
  'Assam',
  'Arunachal Pradesh',
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
  'Ground Crack',
  'Slope Movement',
  'Rockfall',
  'Blocked Road',
  'Water Seepage',
  'Flash Flood',
  'Road Blockage',
  'Slope Cracking',
  'Mudslide',
  'Subsidence',
  'River Bank Erosion',
  'Other',
];

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'All Statuses', value: 'ALL' },
  { label: 'Submitted (Pending)', value: 'SUBMITTED' },
  { label: 'Under Review', value: 'UNDER REVIEW' },
  { label: 'Verified', value: 'VERIFIED' },
  { label: 'Resolved', value: 'RESOLVED' },
];

export const IncidentMonitoringConsole: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentReportItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected incident for detail view modal
  const [selectedIncident, setSelectedIncident] = useState<IncidentReportItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // District environmental points for priority risk calculation
  const [districtPoints, setDistrictPoints] = useState<DistrictHeatmapPoint[]>([]);
  const [selectedPriorityItem, setSelectedPriorityItem] = useState<EmergencyPriorityItem | null>(null);

  // Filter States
  const [selectedType, setSelectedType] = useState<string>('All Types');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedState, setSelectedState] = useState<string>('All States');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All Districts');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Available districts based on selected state
  const availableDistricts = useMemo(() => {
    if (selectedState === 'All States') {
      return ['All Districts'];
    }
    const filtered = ALL_DISTRICTS.filter((d) => d.state.toLowerCase() === selectedState.toLowerCase());
    return ['All Districts', ...filtered.map((d) => d.name)];
  }, [selectedState]);

  // Load real incident data from MongoDB API
  const loadIncidents = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const data = await fetchIncidents({ limit: 200 });
      setIncidents(data);
    } catch (err: any) {
      console.error('Failed to load incident reports from backend:', err);
      setErrorMessage(err.message || 'Failed to load live incident reports from MongoDB.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Load district environmental telemetry points for priority calculations
  useEffect(() => {
    let isMounted = true;
    loadAllNerDistrictsProgressive((updated) => {
      if (isMounted) {
        setDistrictPoints(updated);
      }
    }).catch((err) => {
      console.warn('Telemetry loading notice:', err);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Initial load & 60-second auto-poll
  useEffect(() => {
    loadIncidents();
    const interval = setInterval(() => {
      loadIncidents(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [loadIncidents]);

  // Build emergency response priority summary
  const prioritySummary = useMemo(() => {
    return buildEmergencyPriorityList(incidents, districtPoints);
  }, [incidents, districtPoints]);

  const allDistrictNames = useMemo(() => {
    const names = new Set<string>();
    ALL_DISTRICTS.filter((d) => d.isNer).forEach((d) => names.add(d.name));
    return Array.from(names).sort();
  }, []);

  // Handle status update
  const handleUpdateStatus = async (reportId: string, newStatus: IncidentStatus) => {
    await updateIncidentStatus(reportId, newStatus);
    // Update locally in state
    setIncidents((prev) =>
      prev.map((item) =>
        item.reportId === reportId
          ? { ...item, status: newStatus, updatedAt: new Date().toISOString() }
          : item
      )
    );
    // Update selected incident if open
    setSelectedIncident((prev) =>
      prev && prev.reportId === reportId ? { ...prev, status: newStatus } : prev
    );
  };

  // Open Details Modal for an incident
  const handleOpenDetails = (inc: IncidentReportItem) => {
    setSelectedIncident(inc);
    setIsDetailModalOpen(true);
  };

  // Filter Logic
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // 1. Type filter
      if (selectedType !== 'All Types') {
        if ((inc.incidentType || '').toLowerCase() !== selectedType.toLowerCase()) {
          return false;
        }
      }

      // 2. Status filter
      if (selectedStatus !== 'ALL') {
        const normIncStatus = (inc.status || '').toUpperCase().replace(/_/g, ' ');
        const normFilterStatus = selectedStatus.toUpperCase().replace(/_/g, ' ');
        if (normIncStatus !== normFilterStatus) {
          return false;
        }
      }

      // 3. State filter
      if (selectedState !== 'All States') {
        const loc = (inc.locationName || '').toLowerCase();
        if (!loc.includes(selectedState.toLowerCase())) {
          return false;
        }
      }

      // 4. District filter
      if (selectedDistrict !== 'All Districts') {
        const loc = (inc.locationName || '').toLowerCase();
        if (!loc.includes(selectedDistrict.toLowerCase())) {
          return false;
        }
      }

      // 5. Date filter
      if (dateFilter !== 'ALL') {
        const incDate = new Date(inc.submittedAt || inc.createdAt || 0).getTime();
        const now = Date.now();
        if (dateFilter === 'TODAY') {
          const oneDay = 24 * 60 * 60 * 1000;
          if (now - incDate > oneDay) return false;
        } else if (dateFilter === '7DAYS') {
          const sevenDays = 7 * 24 * 60 * 60 * 1000;
          if (now - incDate > sevenDays) return false;
        } else if (dateFilter === '30DAYS') {
          const thirtyDays = 30 * 24 * 60 * 60 * 1000;
          if (now - incDate > thirtyDays) return false;
        }
      }

      // 6. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = (inc.reportId || '').toLowerCase().includes(q);
        const matchesLoc = (inc.locationName || '').toLowerCase().includes(q);
        const matchesDesc = (inc.description || '').toLowerCase().includes(q);
        const matchesType = (inc.incidentType || '').toLowerCase().includes(q);
        if (!matchesId && !matchesLoc && !matchesDesc && !matchesType) {
          return false;
        }
      }

      return true;
    });
  }, [incidents, selectedType, selectedStatus, selectedState, selectedDistrict, dateFilter, searchQuery]);

  // Summary Metrics Counts
  const metrics = useMemo(() => {
    const total = incidents.length;
    let submitted = 0;
    let underReview = 0;
    let verified = 0;
    let resolved = 0;

    incidents.forEach((inc) => {
      const s = (inc.status || '').toUpperCase().replace(/_/g, ' ');
      if (s === 'RESOLVED') resolved++;
      else if (s === 'VERIFIED') verified++;
      else if (s === 'UNDER REVIEW') underReview++;
      else submitted++;
    });

    return { total, submitted, underReview, verified, resolved };
  }, [incidents]);

  const handleResetFilters = () => {
    setSelectedType('All Types');
    setSelectedStatus('ALL');
    setSelectedState('All States');
    setSelectedDistrict('All Districts');
    setDateFilter('ALL');
    setSearchQuery('');
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase().replace(/_/g, ' ');
    switch (s) {
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            RESOLVED
          </span>
        );
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 border border-purple-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
            <ShieldCheck className="w-3 h-3 text-purple-600" />
            VERIFIED
          </span>
        );
      case 'UNDER REVIEW':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
            <Hourglass className="w-3 h-3 text-blue-600" />
            UNDER REVIEW
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            SUBMITTED
          </span>
        );
    }
  };

  return (
    <div id="incident-monitoring-console" className="space-y-4">
      {/* 1. Header & Controls Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded-lg">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Authority Incident Monitoring Console
                </h2>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  LIVE MONGODB FEED
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time disaster reports, GPS verification, field evidence, and status workflow dispatch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadIncidents(false)}
              disabled={isLoading || isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isLoading ? 'animate-spin text-blue-600' : ''}`} />
              <span>{isRefreshing || isLoading ? 'Fetching...' : 'Refresh Records'}</span>
            </button>
          </div>
        </div>

        {/* 2. Metrics Counter Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-3">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Incidents
            </span>
            <span className="text-lg font-black text-slate-900">{metrics.total}</span>
          </div>
          <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-2.5 text-center">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
              Submitted
            </span>
            <span className="text-lg font-black text-amber-800">{metrics.submitted}</span>
          </div>
          <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-2.5 text-center">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
              Under Review
            </span>
            <span className="text-lg font-black text-blue-800">{metrics.underReview}</span>
          </div>
          <div className="bg-purple-50/70 border border-purple-200 rounded-lg p-2.5 text-center">
            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
              Verified
            </span>
            <span className="text-lg font-black text-purple-800">{metrics.verified}</span>
          </div>
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-2.5 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
              Resolved
            </span>
            <span className="text-lg font-black text-emerald-800">{metrics.resolved}</span>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Filter Incident Records</span>
            <span className="text-slate-400 font-normal text-[11px]">
              ({filteredIncidents.length} matching of {incidents.length})
            </span>
          </div>
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          {/* Filter: Incident Type */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Incident Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {INCIDENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Filter: Status */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Workflow Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filter: State */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              State
            </label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedDistrict('All Districts');
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {NER_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Filter: District */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              District
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {availableDistricts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Filter: Date Range */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Date Range
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Last 24 Hours</option>
              <option value="7DAYS">Last 7 Days</option>
              <option value="30DAYS">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Report ID, Location, Description, or Keywords..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 4. Emergency Response Priority Section */}
      <EmergencyResponsePrioritySection
        priorityItems={prioritySummary.items}
        selectedItem={selectedPriorityItem}
        onSelectItem={(item) => {
          setSelectedPriorityItem(item);
          if (item.sourceIncident) {
            setSelectedIncident(item.sourceIncident);
          }
        }}
        onOpenIncidentDetail={(inc) => {
          setSelectedIncident(inc);
          setIsDetailModalOpen(true);
        }}
        allDistricts={allDistrictNames}
      />

      {/* 5. GIS Map Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              GIS Geospatial Priority & Incident Distribution
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {prioritySummary.items.length} prioritized target{prioritySummary.items.length === 1 ? '' : 's'} · {filteredIncidents.length} raw incident{filteredIncidents.length === 1 ? '' : 's'}
          </span>
        </div>

        <IncidentGisMap
          incidents={filteredIncidents}
          selectedIncident={selectedIncident}
          onSelectIncident={(inc) => {
            setSelectedIncident(inc);
            setIsDetailModalOpen(true);
          }}
          priorityItems={prioritySummary.items}
          selectedPriorityItem={selectedPriorityItem}
          onSelectPriorityItem={(item) => {
            setSelectedPriorityItem(item);
            if (item.sourceIncident) {
              setSelectedIncident(item.sourceIncident);
            }
          }}
        />
      </div>

      {/* 6. Incidents List & Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Incident Incident Registry ({filteredIncidents.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Click any row to review details and change workflow status
          </span>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-12 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin mb-2" />
            <p className="text-xs font-bold text-slate-700">Loading Incident Reports from Database...</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <div className="p-6 text-center text-rose-800 bg-rose-50 m-4 rounded-xl border border-rose-200">
            <AlertTriangle className="w-6 h-6 text-rose-600 mx-auto mb-2" />
            <p className="text-xs font-bold">{errorMessage}</p>
            <button
              onClick={() => loadIncidents(false)}
              className="mt-3 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !errorMessage && filteredIncidents.length === 0 && (
          <div className="py-16 text-center px-4">
            <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-800">No Incidents Found</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {incidents.length === 0
                ? 'No incident reports have been submitted to the database yet.'
                : 'No incidents match the active filter criteria. Try adjusting or resetting the filters.'}
            </p>
            {incidents.length > 0 && (
              <button
                onClick={handleResetFilters}
                className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* Desktop Table View */}
        {!isLoading && !errorMessage && filteredIncidents.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/75 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Report ID</th>
                  <th className="py-2.5 px-4">Incident Type</th>
                  <th className="py-2.5 px-4">Location / GPS</th>
                  <th className="py-2.5 px-4">Reported At</th>
                  <th className="py-2.5 px-4">Evidence</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIncidents.map((inc) => {
                  const hasPhoto = inc.photoUrls && inc.photoUrls.length > 0;
                  const hasVideo = Boolean(inc.videoUrl);
                  const isSelected = selectedIncident?.reportId === inc.reportId;

                  return (
                    <tr
                      key={inc.reportId}
                      onClick={() => handleOpenDetails(inc)}
                      className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-50/80 font-medium' : ''
                      }`}
                    >
                      {/* Report ID */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {inc.reportId}
                      </td>

                      {/* Incident Type */}
                      <td className="py-3 px-4">
                        <span className="inline-block bg-slate-100 text-slate-800 font-semibold px-2 py-0.5 rounded text-[11px]">
                          {inc.incidentType}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 line-clamp-1">
                          {inc.locationName || 'GPS Location'}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {inc.latitude.toFixed(4)}°N, {inc.longitude.toFixed(4)}°E
                        </div>
                      </td>

                      {/* Date / Time */}
                      <td className="py-3 px-4 text-slate-600">
                        <div className="font-medium text-slate-800">
                          {new Date(inc.submittedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(inc.submittedAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Evidence Indicators */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {hasPhoto && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold"
                              title={`${inc.photoUrls.length} photo(s)`}
                            >
                              <Camera className="w-3 h-3" />
                              <span>{inc.photoUrls.length}</span>
                            </span>
                          )}
                          {hasVideo && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded text-[10px] font-semibold"
                              title="Video attached"
                            >
                              <Video className="w-3 h-3" />
                              <span>1</span>
                            </span>
                          )}
                          {!hasPhoto && !hasVideo && (
                            <span className="text-[10px] text-slate-400 italic">None</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {getStatusBadge(inc.status)}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetails(inc);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-md text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                        >
                          <span>Review</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Incident Detail & Workflow Status Modal */}
      <IncidentDetailModal
        incident={selectedIncident}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onUpdateStatus={handleUpdateStatus}
        onCenterOnMap={(lat, lon) => {
          // Centering handled by GIS map component
        }}
      />
    </div>
  );
};
