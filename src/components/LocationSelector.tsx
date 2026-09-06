import React, { useState, useMemo } from 'react';
import { Search, MapPin, Navigation, ChevronDown, Check } from 'lucide-react';
import { INDIA_STATES_DATA, ALL_DISTRICTS } from '../data/indiaLocations';
import { LocationItem } from '../types/weather';

interface LocationSelectorProps {
  selectedLocation: LocationItem;
  onSelectLocation: (location: LocationItem) => void;
  isLoading: boolean;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedLocation,
  onSelectLocation,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Current selected state's object
  const currentStateObj = useMemo(() => {
    return (
      INDIA_STATES_DATA.find(
        (s) => s.name.toLowerCase() === selectedLocation.state?.toLowerCase()
      ) || INDIA_STATES_DATA[0]
    );
  }, [selectedLocation.state]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return ALL_DISTRICTS.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.state.toLowerCase().includes(q) ||
        d.stateCode.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [searchQuery]);

  // Handle State Change
  const handleStateChange = (stateName: string) => {
    const stateObj = INDIA_STATES_DATA.find(
      (s) => s.name.toLowerCase() === stateName.toLowerCase()
    );
    if (stateObj && stateObj.districts.length > 0) {
      // Pick first district of selected state
      onSelectLocation(stateObj.districts[0]);
    }
  };

  // Handle District Change
  const handleDistrictChange = (districtId: string) => {
    const dist =
      currentStateObj.districts.find((d) => d.id === districtId) ||
      ALL_DISTRICTS.find((d) => d.id === districtId);
    if (dist) {
      onSelectLocation(dist);
    }
  };

  // Geolocation detector
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setGeoLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocating(false);
        const { latitude, longitude } = pos.coords;

        // Find closest district in dataset
        let closest = ALL_DISTRICTS[0];
        let minDistance = Number.MAX_VALUE;

        ALL_DISTRICTS.forEach((d) => {
          const dist = Math.hypot(d.latitude - latitude, d.longitude - longitude);
          if (dist < minDistance) {
            minDistance = dist;
            closest = d;
          }
        });

        onSelectLocation(closest);
      },
      (err) => {
        setGeoLocating(false);
        setGeoError('Could not access current location. Please select manually.');
      },
      { timeout: 8000 }
    );
  };

  const quickNerLocations = [
    { name: 'Dibrugarh', state: 'Assam', id: 'as-dibrugarh' },
    { name: 'Guwahati', state: 'Assam', id: 'as-kamrup-metropolitan' },
    { name: 'Shillong', state: 'Meghalaya', id: 'ml-east-khasi-hills' },
    { name: 'Gangtok', state: 'Sikkim', id: 'sk-gangtok' },
    { name: 'Itanagar', state: 'Arunachal Pradesh', id: 'ar-itanagar-capital-complex' },
    { name: 'Kohima', state: 'Nagaland', id: 'nl-kohima' },
    { name: 'Aizawl', state: 'Mizoram', id: 'mz-aizawl' },
    { name: 'Agartala', state: 'Tripura', id: 'tr-west-tripura' },
  ];

  return (
    <section id="location-selector-section" className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs mb-4">
      {/* Top row: Select groups & Quick Search */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        {/* Three Sleek Select Groups */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
          {/* Country */}
          <div className="flex items-center bg-slate-50/70 border border-slate-200 rounded-lg px-3 h-10">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mr-2 shrink-0">
              Country
            </span>
            <span className="text-xs font-bold text-slate-800 truncate">
              India
            </span>
          </div>

          {/* State Selector */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 h-10 relative focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
            <label htmlFor="state-select-dropdown" className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mr-2 shrink-0">
              State
            </label>
            <select
              id="state-select-dropdown"
              value={selectedLocation.state}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-slate-800 border-none outline-hidden cursor-pointer appearance-none pr-4"
            >
              <optgroup label="✨ North Eastern Region (NER)">
                {INDIA_STATES_DATA.filter((s) => s.isNer).map((state) => (
                  <option key={state.code} value={state.name}>
                    {state.name} (NER)
                  </option>
                ))}
              </optgroup>
              <optgroup label="🇮🇳 Other States & UTs">
                {INDIA_STATES_DATA.filter((s) => !s.isNer).map((state) => (
                  <option key={state.code} value={state.name}>
                    {state.name}
                  </option>
                ))}
              </optgroup>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* District Selector */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 h-10 relative focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
            <label htmlFor="district-select-dropdown" className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mr-2 shrink-0">
              District
            </label>
            <select
              id="district-select-dropdown"
              value={selectedLocation.id}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-slate-800 border-none outline-hidden cursor-pointer appearance-none pr-4"
            >
              {currentStateObj.districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Global Search Box */}
        <div className="relative w-full lg:w-72">
          <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2.5 h-10 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
            <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
            <input
              id="district-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearching(true);
              }}
              onFocus={() => setIsSearching(true)}
              placeholder="Search district..."
              className="w-full bg-transparent text-xs text-slate-800 border-none outline-hidden placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setIsSearching(false);
                }}
                className="text-xs text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Dropdown Overlay */}
          {isSearching && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 z-40 max-h-60 overflow-y-auto">
              {searchResults.length > 0 ? (
                <ul className="py-1">
                  {searchResults.map((d) => (
                    <li key={d.id}>
                      <button
                        onClick={() => {
                          onSelectLocation(d);
                          setSearchQuery('');
                          setIsSearching(false);
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{d.name}</span>
                          <span className="text-slate-400 ml-1.5 font-normal">({d.state})</span>
                        </div>
                        {d.isNer && (
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                            NER
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-3 text-xs text-slate-400 text-center">
                  No matching district found.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar: Quick NER Hotspots & GPS Action */}
      <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Hubs:</span>
          {quickNerLocations.map((hub) => {
            const isCurrent = selectedLocation.name.toLowerCase().includes(hub.name.toLowerCase());
            return (
              <button
                key={hub.id}
                onClick={() => {
                  const target = ALL_DISTRICTS.find((d) => d.id === hub.id);
                  if (target) onSelectLocation(target);
                }}
                className={`text-[11px] px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {hub.name}
              </button>
            );
          })}
        </div>

        <button
          id="detect-gps-location-btn"
          onClick={handleDetectLocation}
          disabled={geoLocating || isLoading}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-0.5 rounded-md border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Navigation className={`w-3 h-3 ${geoLocating ? 'animate-spin text-blue-600' : ''}`} />
          <span>{geoLocating ? 'Locating...' : 'GPS'}</span>
        </button>
      </div>

      {geoError && (
        <div className="mt-2 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
          {geoError}
        </div>
      )}
    </section>
  );
};
