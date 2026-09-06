import React, { useState, useMemo } from 'react';
import {
  AlertOctagon,
  ShieldAlert,
  AlertTriangle,
  Info,
  Clock,
  MapPin,
  Route,
  Building2,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Search,
  Sparkles,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { EmergencyPriorityItem, EmergencyPriorityLevel } from '../types/emergencyPriority';
import { IncidentReportItem } from '../types/incident';

interface EmergencyResponsePrioritySectionProps {
  priorityItems: EmergencyPriorityItem[];
  selectedItem: EmergencyPriorityItem | null;
  onSelectItem: (item: EmergencyPriorityItem) => void;
  onOpenIncidentDetail: (incident: IncidentReportItem) => void;
  allDistricts: string[];
}

export const EmergencyResponsePrioritySection: React.FC<EmergencyResponsePrioritySectionProps> = ({
  priorityItems,
  selectedItem,
  onSelectItem,
  onOpenIncidentDetail,
  allDistricts,
}) => {
  // Filter States
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [districtFilter, setDistrictFilter] = useState<string>('All Districts');
  const [incidentTypeFilter, setIncidentTypeFilter] = useState<string>('All Types');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract unique incident types from items
  const incidentTypes = useMemo(() => {
    const types = new Set<string>();
    priorityItems.forEach((it) => {
      if (it.incidentType) types.add(it.incidentType);
    });
    return ['All Types', ...Array.from(types)];
  }, [priorityItems]);

  // Filtered priority list
  const filteredItems = useMemo(() => {
    return priorityItems.filter((item) => {
      // 1. Priority Filter
      if (priorityFilter !== 'ALL' && item.priorityLevel !== priorityFilter) {
        return false;
      }

      // 2. District Filter
      if (districtFilter !== 'All Districts') {
        const dLower = item.district.toLowerCase();
        const fLower = districtFilter.toLowerCase();
        if (!dLower.includes(fLower) && !fLower.includes(dLower)) {
          return false;
        }
      }

      // 3. Incident Type Filter
      if (incidentTypeFilter !== 'All Types') {
        if ((item.incidentType || '').toLowerCase() !== incidentTypeFilter.toLowerCase()) {
          return false;
        }
      }

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchLoc = item.locationName.toLowerCase().includes(q);
        const matchReason = item.mainReason.toLowerCase().includes(q);
        const matchRoad = item.affectedRoads.some((r) => r.toLowerCase().includes(q));
        const matchInfra = (item.nearbyInfrastructureOrVillage || '').toLowerCase().includes(q);
        const matchType = (item.incidentType || '').toLowerCase().includes(q);
        if (!matchLoc && !matchReason && !matchRoad && !matchInfra && !matchType) {
          return false;
        }
      }

      return true;
    });
  }, [priorityItems, priorityFilter, districtFilter, incidentTypeFilter, searchQuery]);

  // Style helper for priority badges
  const getPriorityStyle = (level: EmergencyPriorityLevel) => {
    switch (level) {
      case 'CRITICAL':
        return {
          badgeBg: 'bg-rose-600 text-white',
          cardBorder: 'border-rose-300 bg-rose-50/40 hover:bg-rose-50/80',
          indicator: 'bg-rose-600 animate-pulse',
          textColor: 'text-rose-700',
          icon: <Flame className="w-3.5 h-3.5" />,
        };
      case 'HIGH':
        return {
          badgeBg: 'bg-orange-500 text-white',
          cardBorder: 'border-orange-200 bg-orange-50/30 hover:bg-orange-50/70',
          indicator: 'bg-orange-500',
          textColor: 'text-orange-700',
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
        };
      case 'MEDIUM':
        return {
          badgeBg: 'bg-amber-500 text-white',
          cardBorder: 'border-amber-200 bg-amber-50/20 hover:bg-amber-50/60',
          indicator: 'bg-amber-500',
          textColor: 'text-amber-700',
          icon: <AlertOctagon className="w-3.5 h-3.5" />,
        };
      case 'LOW':
      default:
        return {
          badgeBg: 'bg-blue-600 text-white',
          cardBorder: 'border-blue-200 bg-blue-50/20 hover:bg-blue-50/50',
          indicator: 'bg-blue-500',
          textColor: 'text-blue-700',
          icon: <Info className="w-3.5 h-3.5" />,
        };
    }
  };

  const topItem = priorityItems.length > 0 ? priorityItems[0] : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* 1. Header Banner */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-600 rounded-lg text-white shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold tracking-wider uppercase">
                  Emergency Response Priority
                </h2>
                <span className="bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                  FIRST ATTENTION RANKING
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Ranks locations authorities should inspect <strong>FIRST</strong> based on real AI risk scores, verified field reports, terrain slope, and lifeline roads.
              </p>
            </div>
          </div>

          {/* Quick Authority Directive Box */}
          {topItem && (
            <div className="bg-slate-800/90 border border-rose-500/40 rounded-lg px-3 py-2 text-xs flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
              <div>
                <span className="text-[10px] text-rose-300 font-bold uppercase tracking-wider block">
                  Top Priority Target (Action First)
                </span>
                <span className="font-bold text-white line-clamp-1">
                  {topItem.locationName} ({topItem.priorityLevel})
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Controls & Filters */}
      <div className="p-3 bg-slate-50 border-b border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          {/* Filter: Priority */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Priority Filter
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Priorities ({priorityItems.length})</option>
              <option value="CRITICAL">🔴 CRITICAL Priority</option>
              <option value="HIGH">🟠 HIGH Priority</option>
              <option value="MEDIUM">🟡 MEDIUM Priority</option>
              <option value="LOW">🔵 LOW Priority</option>
            </select>
          </div>

          {/* Filter: District */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              District Filter
            </label>
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="All Districts">All NER Districts</option>
              {allDistricts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Filter: Incident Type */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Hazard / Incident Type
            </label>
            <select
              value={incidentTypeFilter}
              onChange={(e) => setIncidentTypeFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {incidentTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Search Roads / Location
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="NH-29, Haflong, bypass..."
                className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Priority Ranked List */}
      <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs">
            No emergency response priority items match the current filters.
          </div>
        ) : (
          filteredItems.map((item, index) => {
            const style = getPriorityStyle(item.priorityLevel);
            const isSelected = selectedItem?.id === item.id;

            return (
              <div
                key={item.id}
                onClick={() => {
                  onSelectItem(item);
                  if (item.sourceIncident) {
                    onOpenIncidentDetail(item.sourceIncident);
                  }
                }}
                className={`p-3.5 transition-all cursor-pointer border-l-4 ${
                  isSelected ? 'bg-blue-50/80 border-l-blue-600 shadow-2xs' : `hover:bg-slate-50 ${
                    item.priorityLevel === 'CRITICAL'
                      ? 'border-l-rose-600'
                      : item.priorityLevel === 'HIGH'
                      ? 'border-l-orange-500'
                      : item.priorityLevel === 'MEDIUM'
                      ? 'border-l-amber-500'
                      : 'border-l-blue-400'
                  }`
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                  {/* Left Column: Priority Rank + Location + Reason */}
                  <div className="flex-1 space-y-1.5">
                    {/* Top Row: Rank Badge + Level + Status + Updated */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-black text-slate-500">
                        #{index + 1}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${style.badgeBg}`}
                      >
                        {style.icon}
                        <span>{item.priorityLevel} PRIORITY</span>
                      </span>

                      {item.incidentType && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.incidentType}
                        </span>
                      )}

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        Status: <strong className="text-slate-900">{item.status.replace(/_/g, ' ')}</strong>
                      </span>

                      <span className="text-[10px] text-slate-400 flex items-center gap-1 ml-auto sm:ml-0">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(item.lastUpdated).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })} IST
                        </span>
                      </span>
                    </div>

                    {/* Location Name */}
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{item.locationName}</span>
                      <span className="text-slate-400 font-normal">
                        ({item.district}, {item.state})
                      </span>
                    </div>

                    {/* Main Reason (Which location should authorities look at FIRST and WHY) */}
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <span className="text-[10px] font-black uppercase text-slate-500 block mb-0.5">
                        Priority Rationale (Why Authorities Should Inspect):
                      </span>
                      <p className="text-slate-800 font-medium leading-relaxed">
                        {item.mainReason}
                      </p>
                    </div>

                    {/* Infrastructure & Roads Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-0.5">
                      {/* Affected Roads */}
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Route className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        <span className="font-semibold">Affected Road(s):</span>
                        <span className="font-mono text-slate-900">
                          {item.affectedRoads.join(', ')}
                        </span>
                      </div>

                      {/* Nearby Infrastructure / Village */}
                      {item.nearbyInfrastructureOrVillage && (
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Building2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span className="font-semibold">Infrastructure:</span>
                          <span className="text-slate-900 line-clamp-1">
                            {item.nearbyInfrastructureOrVillage}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Risk Score & Action Button */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Risk Score
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-slate-900">
                          {item.riskScore}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          / 100 ({item.riskLevel})
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectItem(item);
                        if (item.sourceIncident) {
                          onOpenIncidentDetail(item.sourceIncident);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                    >
                      <span>Inspect Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Footer Note */}
      <div className="p-2.5 bg-slate-100 text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-200">
        <span>
          Showing {filteredItems.length} priority-ranked response targets across 8 NER states
        </span>
        <span className="font-semibold text-slate-600">
          Ranked strictly by combined hazard severity, verification status, and lifeline exposure
        </span>
      </div>
    </div>
  );
};
