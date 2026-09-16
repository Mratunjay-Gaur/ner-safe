import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { WEBSITE_LOGO_URL } from './NerSafeLogo';
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
  Database,
  Radio,
  SlidersHorizontal,
  X,
  Copy,
} from 'lucide-react';
import { IncidentReportItem, IncidentStatus } from '../types/incident';
import { fetchIncidents, updateIncidentStatus, deleteIncident } from '../services/incidentService';
import { IncidentGisMap } from './IncidentGisMap';
import { IncidentDetailModal } from './IncidentDetailModal';
import { ALL_DISTRICTS } from '../data/indiaLocations';
import { EmergencyResponsePrioritySection } from './EmergencyResponsePrioritySection';
import { buildEmergencyPriorityList } from '../services/emergencyPriorityService';
import { DistrictHeatmapPoint } from '../types/risk';
import { EmergencyPriorityItem } from '../types/emergencyPriority';
import { loadAllNerDistrictsProgressive } from '../services/nerRiskHeatmapService';
import { getWorkflowStatusStyle } from '../utils/commandCenterTheme';

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
  const { t } = useTranslation();
  const [incidents, setIncidents] = useState<IncidentReportItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

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
  const [showFiltersMobile, setShowFiltersMobile] = useState<boolean>(false);

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

    try {
      const data = await fetchIncidents({ limit: 200 });
      setIncidents(data);
      setErrorMessage(null);
      setLastSyncTime(new Date());
    } catch (err: any) {
      console.warn('Incident load notice:', err.message);
      setErrorMessage(err.message || 'Database is currently unavailable. Failed to load incident reports from MongoDB.');
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
    setIncidents((prev) =>
      prev.map((item) =>
        item.reportId === reportId
          ? { ...item, status: newStatus, updatedAt: new Date().toISOString() }
          : item
      )
    );
    setSelectedIncident((prev) =>
      prev && prev.reportId === reportId ? { ...prev, status: newStatus } : prev
    );
  };

  // Handle delete incident directly from MongoDB
  const handleDeleteIncident = async (reportId: string) => {
    await deleteIncident(reportId);
    setIncidents((prev) => prev.filter((item) => item.reportId !== reportId));
    if (selectedIncident?.reportId === reportId) {
      setSelectedIncident(null);
      setIsDetailModalOpen(false);
    }
  };

  // Open Details Modal for an incident
  const handleOpenDetails = (inc: IncidentReportItem) => {
    setSelectedIncident(inc);
    setIsDetailModalOpen(true);
  };

  // Filter Logic
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (selectedType !== 'All Types') {
        if ((inc.incidentType || '').toLowerCase() !== selectedType.toLowerCase()) {
          return false;
        }
      }

      if (selectedStatus !== 'ALL') {
        const normIncStatus = (inc.status || '').toUpperCase().replace(/_/g, ' ');
        const normFilterStatus = selectedStatus.toUpperCase().replace(/_/g, ' ');
        if (normIncStatus !== normFilterStatus) {
          return false;
        }
      }

      if (selectedState !== 'All States') {
        const loc = (inc.locationName || '').toLowerCase();
        if (!loc.includes(selectedState.toLowerCase())) {
          return false;
        }
      }

      if (selectedDistrict !== 'All Districts') {
        const loc = (inc.locationName || '').toLowerCase();
        if (!loc.includes(selectedDistrict.toLowerCase())) {
          return false;
        }
      }

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
    if (errorMessage) {
      return { total: '-', submitted: '-', underReview: '-', verified: '-', resolved: '-' };
    }
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
  }, [incidents, errorMessage]);

  const handleResetFilters = () => {
    setSelectedType('All Types');
    setSelectedStatus('ALL');
    setSelectedState('All States');
    setSelectedDistrict('All Districts');
    setDateFilter('ALL');
    setSearchQuery('');
  };

  const hasActiveFilters =
    selectedType !== 'All Types' ||
    selectedStatus !== 'ALL' ||
    selectedState !== 'All States' ||
    selectedDistrict !== 'All Districts' ||
    dateFilter !== 'ALL' ||
    searchQuery.trim() !== '';

  return (
    <div id="incident-monitoring-console" className="space-y-4">
      {/* 1. Tactical Command Header & Live Status */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs relative overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <img
              src={WEBSITE_LOGO_URL}
              alt="NER-SAFE Mountain Silhouette Logo"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/nersafe-symbol.png')) {
                  target.src = '/nersafe-symbol.png';
                }
              }}
              className="w-11 h-11 sm:w-12 sm:h-12 object-contain shrink-0 rounded-xl bg-white border border-slate-200 p-1 mt-0.5 sm:mt-0 shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                  {t('incidentMonitor.title', 'Authority Incident Monitor')}
                </h1>
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  {t('incidentMonitor.liveFeedBadge', 'Live Incident Feed')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
                {t('incidentMonitor.subtitle', 'Operational disaster reports, GPS verification, multimedia evidence review, and emergency triage dispatch.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center">
            <button
              onClick={() => loadIncidents(false)}
              disabled={isLoading || isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isLoading ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
              <span>{isRefreshing || isLoading ? t('common.refreshing', 'Refreshing...') : t('incidentMonitor.refreshBtn', 'Refresh Incidents')}</span>
            </button>
          </div>
        </div>

        {/* Tactical Metrics Counter Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-4 mt-4 border-t border-sky-100/90">
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
              {t('incidentMonitor.totalReports', 'Total Reports')}
            </span>
            <span className="text-2xl font-black text-slate-900">{metrics.total}</span>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center relative">
            {metrics.submitted > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-0.5">
              {t('incidentMonitor.submittedPending', 'Submitted (Pending)')}
            </span>
            <span className="text-2xl font-black text-amber-900">{metrics.submitted}</span>
          </div>

          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-center">
            <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block mb-0.5">
              {t('incidentMonitor.underReview', 'Under Review')}
            </span>
            <span className="text-2xl font-black text-sky-900">{metrics.underReview}</span>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
            <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block mb-0.5">
              {t('incidentMonitor.verified', 'Verified')}
            </span>
            <span className="text-2xl font-black text-purple-900">{metrics.verified}</span>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-0.5">
              {t('incidentMonitor.resolved', 'Resolved')}
            </span>
            <span className="text-2xl font-black text-emerald-900">{metrics.resolved}</span>
          </div>
        </div>
      </motion.div>

      {/* 2. Tactical Filter & Query Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-sky-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {t('incidentMonitor.filterTitle', 'Filter Operational Records')}
            </h3>
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              {filteredIncidents.length} {t('incidentMonitor.ofCount', 'of')} {incidents.length} {t('incidentMonitor.shown', 'shown')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{t('incidentMonitor.resetFilters', 'Reset Filters')}</span>
              </button>
            )}

            <button
              onClick={() => setShowFiltersMobile(!showFiltersMobile)}
              className="sm:hidden p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs ${showFiltersMobile ? 'block' : 'hidden sm:grid'}`}>
          {/* Incident Type */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              {t('incidentMonitor.hazardType', 'Hazard Type')}
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
            >
              {INCIDENT_TYPES.map((tItem) => (
                <option key={tItem} value={tItem}>
                  {tItem === 'All Types' ? t('incidentMonitor.allTypes', 'All Types') : tItem}
                </option>
              ))}
            </select>
          </div>

          {/* Workflow Status */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              {t('incidentMonitor.workflowStatus', 'Workflow Status')}
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.value === 'ALL' ? t('incidentMonitor.allStatuses', 'All Statuses') : st.label}
                </option>
              ))}
            </select>
          </div>

          {/* State */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              {t('incidentMonitor.stateJurisdiction', 'State Jurisdiction')}
            </label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedDistrict('All Districts');
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
            >
              {NER_STATES.map((s) => (
                <option key={s} value={s}>
                  {s === 'All States' ? t('incidentMonitor.allStates', 'All States') : s}
                </option>
              ))}
            </select>
          </div>

          {/* District */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              {t('location.district', 'District')}
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
            >
              {availableDistricts.map((d) => (
                <option key={d} value={d}>
                  {d === 'All Districts' ? t('incidentMonitor.allDistricts', 'All Districts') : d}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              {t('incidentMonitor.timeWindow', 'Time Window')}
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">{t('incidentMonitor.allTime', 'All Time')}</option>
              <option value="TODAY">{t('incidentMonitor.last24Hours', 'Last 24 Hours')}</option>
              <option value="7DAYS">{t('incidentMonitor.last7Days', 'Last 7 Days')}</option>
              <option value="30DAYS">{t('incidentMonitor.last30Days', 'Last 30 Days')}</option>
            </select>
          </div>
        </div>

        {/* Full-Text Query Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('incidentMonitor.searchPlaceholder', 'Search by Report ID (NER-INC-...), District, Keyword, or Narrative Description...')}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Priority Response Matrix */}
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

      {/* 4. GIS Geospatial Priority & Incident Map Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-sky-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {t('incidentMonitor.gisSectionTitle', 'GIS Operational Spatial Distribution')}
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-bold">
            {prioritySummary.items.length} {t('incidentMonitor.prioritizedTargets', 'prioritized target(s)')} · {filteredIncidents.length} {t('incidentMonitor.rawIncidents', 'raw incident(s)')}
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

      {/* 5. Dense Operational Incidents Table & List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {t('incidentMonitor.registryFeed', 'Incident Registry Feed')} ({filteredIncidents.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
            {t('incidentMonitor.registryHint', 'Select any record to view evidence or advance triage status')}
          </span>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-16 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-sky-600 animate-spin mb-3" />
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {t('incidentMonitor.readingMongo', 'Reading Incidents from MongoDB Atlas...')}
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <div className="p-6 text-center text-rose-800 bg-rose-50 m-4 rounded-xl border border-rose-200">
            <AlertTriangle className="w-7 h-7 text-rose-600 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-rose-900 uppercase tracking-wider mb-1">
              {t('incidentMonitor.unableToFetch', 'Unable to fetch live data.')}
            </h4>
            <p className="text-xs font-medium text-rose-700 max-w-md mx-auto">{errorMessage}</p>
            <button
              onClick={() => loadIncidents(false)}
              className="mt-3 px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer hover:bg-rose-700 transition-colors"
            >
              {t('incidentMonitor.retryConnection', 'Retry Connection')}
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !errorMessage && filteredIncidents.length === 0 && (
          <div className="py-16 text-center px-4">
            <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              {t('incidentMonitor.noLiveData', 'No live data available.')}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {incidents.length === 0
                ? t('incidentMonitor.noMongoRecords', 'No live incident records found in MongoDB.')
                : t('incidentMonitor.noMatchCriteria', 'No incidents match the active filter criteria. Adjust your search or reset the filters.')}
            </p>
            {incidents.length > 0 && (
              <button
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {t('incidentMonitor.clearAllFilters', 'Clear All Filters')}
              </button>
            )}
          </div>
        )}

        {/* Desktop Table View */}
        {!isLoading && !errorMessage && filteredIncidents.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">{t('incidentMonitor.thReportId', 'Report ID')}</th>
                  <th className="py-3 px-4">{t('incidentMonitor.thClassification', 'Classification')}</th>
                  <th className="py-3 px-4">{t('incidentMonitor.thLocation', 'Location / Coordinates')}</th>
                  <th className="py-3 px-4">{t('incidentMonitor.thReported', 'Reported')}</th>
                  <th className="py-3 px-4">{t('incidentMonitor.thEvidence', 'Evidence')}</th>
                  <th className="py-3 px-4">{t('incidentMonitor.thStatus', 'Workflow Status')}</th>
                  <th className="py-3 px-4 text-right">{t('incidentMonitor.thAction', 'Operational Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIncidents.map((inc) => {
                  const hasPhoto = inc.photoUrls && inc.photoUrls.length > 0;
                  const hasVideo = Boolean(inc.videoUrl);
                  const isSelected = selectedIncident?.reportId === inc.reportId;
                  const statusStyle = getWorkflowStatusStyle(inc.status);

                  return (
                    <tr
                      key={inc.reportId}
                      onClick={() => handleOpenDetails(inc)}
                      className={`hover:bg-sky-50/60 transition-colors cursor-pointer ${
                        isSelected ? 'bg-sky-50/80' : ''
                      }`}
                    >
                      {/* Report ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {inc.reportId}
                      </td>

                      {/* Incident Type */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-[11px]">
                          {inc.incidentType}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 line-clamp-1">
                          {inc.locationName || t('incidentMonitor.geolocatedPoint', 'Geolocated Point')}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {inc.latitude.toFixed(4)}°N, {inc.longitude.toFixed(4)}°E
                        </div>
                      </td>

                      {/* Date / Time */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="font-bold text-slate-800">
                          {new Date(inc.submittedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </div>
                        <div className="text-[10px]">
                          {new Date(inc.submittedAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Evidence Indicators */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {hasPhoto && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 rounded text-[10px] font-bold"
                              title={`${inc.photoUrls.length} photo(s)`}
                            >
                              <Camera className="w-3 h-3 text-sky-700" />
                              <span>{inc.photoUrls.length}</span>
                            </span>
                          )}
                          {hasVideo && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded text-[10px] font-bold"
                              title="Video attached"
                            >
                              <Video className="w-3 h-3 text-rose-600" />
                              <span>1</span>
                            </span>
                          )}
                          {!hasPhoto && !hasVideo && (
                            <span className="text-[10px] text-slate-400 italic">{t('incidentMonitor.none', 'None')}</span>
                          )}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${statusStyle.badgeBg} ${statusStyle.badgeText} ${statusStyle.badgeBorder}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dotBg}`} />
                          {statusStyle.label}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetails(inc);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-50 hover:bg-sky-600 hover:text-white rounded-lg text-xs font-bold text-sky-900 border border-sky-200/80 transition-colors cursor-pointer"
                        >
                          <span>{t('incidentMonitor.reviewBtn', 'Review')}</span>
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
        onDeleteIncident={handleDeleteIncident}
      />
    </div>
  );
};
