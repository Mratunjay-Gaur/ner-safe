import React, { useState, useMemo } from 'react';
import {
  Calendar,
  MapPin,
  ChevronDown,
  ChevronUp,
  Filter,
  RotateCcw,
  Navigation,
  FileCheck,
  AlertOctagon,
} from 'lucide-react';
import { HistoricalLandslideRecord } from '../types/environmental';
import { VERIFIED_NER_HISTORICAL_LANDSLIDES } from '../data/historicalLandslides';

interface NerHistoricalLandslidesListProps {
  selectedDistrict: string;
  selectedState: string;
  records: HistoricalLandslideRecord[];
  selectedRecordId?: string | null;
  onSelectRecord?: (record: HistoricalLandslideRecord) => void;
}

/**
 * Safely parses and formats date string into prominent Year, Month Day, and Full Date
 */
function formatIncidentDate(dateStr?: string, yearNum?: number) {
  if (!dateStr) {
    return {
      year: yearNum ? String(yearNum) : 'Not available',
      monthDay: 'Not available',
      fullDate: 'Not available',
    };
  }

  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthFull = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    if (monthIndex >= 0 && monthIndex < 12 && !isNaN(day)) {
      return {
        year: year || (yearNum ? String(yearNum) : 'Not available'),
        monthDay: `${months[monthIndex]} ${day < 10 ? '0' + day : day}`,
        fullDate: `${monthFull[monthIndex]} ${day}, ${year}`,
      };
    }
  }

  return {
    year: yearNum ? String(yearNum) : 'Not available',
    monthDay: dateStr,
    fullDate: dateStr,
  };
}

export const NerHistoricalLandslidesList: React.FC<NerHistoricalLandslidesListProps> = ({
  selectedDistrict,
  selectedState,
  records,
  selectedRecordId,
  onSelectRecord,
}) => {
  // Pull all verified records for this state to allow comprehensive state-level and district filtering
  const stateRecords = useMemo(() => {
    const allState = VERIFIED_NER_HISTORICAL_LANDSLIDES.filter(
      (item) => item.state.toLowerCase().trim() === selectedState.toLowerCase().trim()
    );
    return allState.length > 0 ? allState : records;
  }, [selectedState, records]);

  // Filter states
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedTrigger, setSelectedTrigger] = useState<string>('ALL');
  const [districtFilter, setDistrictFilter] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(selectedRecordId || null);

  // Sync expanded ID with selected record from parent/map
  React.useEffect(() => {
    if (selectedRecordId) {
      setExpandedId(selectedRecordId);
    }
  }, [selectedRecordId]);

  // Extract unique filter options from actual state records
  const availableYears = useMemo<number[]>(() => {
    const rawYears = stateRecords.map((r) => Number(r.year)).filter((yr) => !isNaN(yr) && yr > 0);
    const uniqueYears = Array.from(new Set<number>(rawYears));
    return uniqueYears.sort((a, b) => b - a);
  }, [stateRecords]);

  const availableTriggers = useMemo<string[]>(() => {
    const trgs = stateRecords.map((r) => r.trigger).filter((t): t is string => Boolean(t));
    const uniqueTrgs = Array.from(new Set<string>(trgs));
    return uniqueTrgs.sort();
  }, [stateRecords]);

  const availableDistricts = useMemo<string[]>(() => {
    const dists = stateRecords.map((r) => r.district).filter((d): d is string => Boolean(d));
    const uniqueDists = Array.from(new Set<string>(dists));
    return uniqueDists.sort();
  }, [stateRecords]);

  // Apply active filters
  const filteredRecords = useMemo(() => {
    return stateRecords.filter((item) => {
      if (selectedYear !== 'ALL' && String(item.year) !== selectedYear) return false;
      if (selectedTrigger !== 'ALL' && item.trigger !== selectedTrigger) return false;
      if (districtFilter !== 'ALL' && item.district.toLowerCase() !== districtFilter.toLowerCase()) return false;
      return true;
    });
  }, [stateRecords, selectedYear, selectedTrigger, districtFilter]);

  const isFilterActive = selectedYear !== 'ALL' || selectedTrigger !== 'ALL' || districtFilter !== 'ALL';

  const handleResetFilters = () => {
    setSelectedYear('ALL');
    setSelectedTrigger('ALL');
    setDistrictFilter('ALL');
  };

  return (
    <div id="ner-historical-landslides-catalog" className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Section Header */}
      <div className="p-4 bg-slate-50/70 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded-lg shrink-0">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  Historical Landslide Records ({selectedState})
                </h3>
                <span className="bg-slate-200/80 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                  {filteredRecords.length} {filteredRecords.length === 1 ? 'Incident' : 'Incidents'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Verified ground incident archive compiled from Geological Survey of India (GSI NLSM) and NASA GLC.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto text-[11px] font-mono text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>HISTORICAL ARCHIVE</span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-3.5 pt-3 border-t border-slate-200/70 flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 text-slate-500 font-bold text-[11px] uppercase tracking-wider mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* District Filter Dropdown */}
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
          >
            <option value="ALL">All Districts ({availableDistricts.length})</option>
            {availableDistricts.map((dist) => (
              <option key={dist} value={dist}>
                {dist}
              </option>
            ))}
          </select>

          {/* Year Filter Dropdown */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
          >
            <option value="ALL">All Years ({availableYears.length})</option>
            {availableYears.map((yr) => (
              <option key={yr} value={String(yr)}>
                {yr}
              </option>
            ))}
          </select>

          {/* Trigger Filter Dropdown */}
          <select
            value={selectedTrigger}
            onChange={(e) => setSelectedTrigger(e.target.value)}
            className="bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
          >
            <option value="ALL">All Triggers ({availableTriggers.length})</option>
            {availableTriggers.map((trg) => (
              <option key={trg} value={trg}>
                {trg}
              </option>
            ))}
          </select>

          {/* Reset Filters */}
          {isFilterActive && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Incident List */}
      <div className="p-4 space-y-3">
        {filteredRecords.length === 0 ? (
          <div className="py-10 px-4 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <p className="text-xs font-bold text-slate-600">No historical landslide records match the selected filters.</p>
            <p className="text-[11px] text-slate-400 mt-1">Try resetting the Year, Trigger, or District filters above.</p>
            {isFilterActive && (
              <button
                onClick={handleResetFilters}
                className="mt-3 px-3 py-1.5 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-md shadow-2xs hover:bg-slate-50 cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          filteredRecords.map((item) => {
            const isExpanded = expandedId === item.id;
            const isSelectedDistrict = item.district.toLowerCase() === selectedDistrict.toLowerCase();
            const dateInfo = formatIncidentDate(item.date, item.year);

            return (
              <div
                key={item.id}
                className={`rounded-lg border transition-all ${
                  isExpanded
                    ? 'border-slate-400 bg-slate-50/40 shadow-xs'
                    : isSelectedDistrict
                    ? 'border-red-200/90 bg-red-50/15 hover:border-red-300'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Primary Card Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="p-3.5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Prominent DATE and YEAR Badge Block */}
                    <div className="shrink-0 w-18 text-center rounded-md overflow-hidden border border-slate-300 shadow-2xs">
                      <div className="bg-slate-900 text-white text-[11px] font-black py-0.5 tracking-wider font-mono">
                        {dateInfo.year}
                      </div>
                      <div className="bg-white text-slate-900 text-xs font-extrabold py-1 px-1 tracking-tight">
                        {dateInfo.monthDay}
                      </div>
                    </div>

                    {/* Location and Metadata Details */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                          {item.locationName || 'Not available'}
                        </span>
                        {isSelectedDistrict && (
                          <span className="bg-red-100 text-red-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase">
                            Selected District
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800">
                          {item.district || 'Not available'}, {item.state || 'Not available'}
                        </span>
                      </div>

                      {/* Compact Metadata Tags */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-0.5">
                        <div>
                          <strong className="text-slate-600 font-semibold">Trigger:</strong>{' '}
                          <span className="text-slate-800 font-medium">{item.trigger || 'Not available'}</span>
                        </div>
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <div>
                          <strong className="text-slate-600 font-semibold">Fatalities:</strong>{' '}
                          <span className={item.fatalities ? 'text-red-700 font-bold' : 'text-slate-800 font-medium'}>
                            {item.fatalities !== undefined && item.fatalities !== null ? item.fatalities : 'Not available'}
                          </span>
                        </div>
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <div>
                          <strong className="text-slate-600 font-semibold">Source:</strong>{' '}
                          <span className="text-slate-700">{item.catalogSource || 'Not available'}</span>
                        </div>
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <div className="font-mono text-slate-600">
                          <strong className="text-slate-600 font-sans font-semibold">Coordinates:</strong>{' '}
                          {item.latitude && item.longitude
                            ? `${item.latitude.toFixed(4)}°N, ${item.longitude.toFixed(4)}°E`
                            : 'Not available'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Expand Toggle */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {onSelectRecord && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRecord(item);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors cursor-pointer"
                        title="Locate incident on GIS map"
                      >
                        <Navigation className="w-3 h-3 text-slate-600" />
                        <span>Locate</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                      aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Technical Inspection Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-200/80 text-xs space-y-3">
                    {/* Impact Narrative */}
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1">
                        Verified Incident Impact Description
                      </span>
                      <p className="text-slate-800 bg-white p-3 rounded-md border border-slate-200 leading-relaxed font-normal">
                        {item.impactDescription || 'Not available'}
                      </p>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-white p-2.5 rounded-md border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Landslide Type</span>
                        <span className="font-bold text-slate-900 text-xs mt-0.5 block">{item.landslideType || 'Not available'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-md border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Exact Date</span>
                        <span className="font-bold text-slate-900 text-xs mt-0.5 block font-mono">{dateInfo.fullDate}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-md border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Casualties & Injuries</span>
                        <span className="font-bold text-slate-900 text-xs mt-0.5 block">
                          {item.fatalities !== undefined ? `${item.fatalities} Fatal` : 'Not available'}
                          {' / '}
                          {item.injuries !== undefined ? `${item.injuries} Injured` : 'Not available'}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-md border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Geographic Coordinates</span>
                        <span className="font-mono font-bold text-slate-900 text-xs mt-0.5 block">
                          {item.latitude && item.longitude
                            ? `${item.latitude.toFixed(4)}°N, ${item.longitude.toFixed(4)}°E`
                            : 'Not available'}
                        </span>
                      </div>
                    </div>

                    {/* Catalog Source Reference */}
                    <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-600 gap-1.5">
                      <div>
                        <strong className="font-bold text-slate-700">Catalog Source:</strong>{' '}
                        <span className="text-slate-800">{item.catalogSource || 'Not available'}</span>
                      </div>
                      <div>
                        <strong className="font-bold text-slate-700">Reference ID:</strong>{' '}
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {item.sourceReferenceId || 'Not available'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

