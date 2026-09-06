import React from 'react';
import { MapPin, Navigation, Compass } from 'lucide-react';
import { LocationItem } from '../types/weather';
import { INDIA_STATES_DATA, NER_STATES, ALL_DISTRICTS } from '../data/indiaLocations';

interface NerStateDistrictSelectorProps {
  selectedLocation: LocationItem;
  onSelectLocation: (location: LocationItem) => void;
  isLoading: boolean;
}

export const NerStateDistrictSelector: React.FC<NerStateDistrictSelectorProps> = ({
  selectedLocation,
  onSelectLocation,
  isLoading,
}) => {
  // Filter only the 8 NER states
  const nerStatesData = INDIA_STATES_DATA.filter((s) => NER_STATES.includes(s.name));

  const currentStateObj = nerStatesData.find(
    (s) => s.name.toLowerCase() === selectedLocation.state.toLowerCase()
  ) || nerStatesData[0];

  const currentDistricts = currentStateObj ? currentStateObj.districts : [];

  const handleStateChange = (stateName: string) => {
    const stateObj = nerStatesData.find((s) => s.name === stateName);
    if (stateObj && stateObj.districts.length > 0) {
      onSelectLocation(stateObj.districts[0]);
    }
  };

  const handleDistrictChange = (districtId: string) => {
    const dist = ALL_DISTRICTS.find((d) => d.id === districtId);
    if (dist) {
      onSelectLocation(dist);
    }
  };

  // Quick NER Critical Terrain Hotspots
  const hotSpotDistricts = [
    { name: 'Dibrugarh', state: 'Assam', id: 'as-dibrugarh' },
    { name: 'Dima Hasao', state: 'Assam', id: 'as-dima-hasao' },
    { name: 'Tawang', state: 'Arunachal Pradesh', id: 'ar-tawang' },
    { name: 'Papum Pare', state: 'Arunachal Pradesh', id: 'ar-papum-pare' },
    { name: 'East Khasi Hills', state: 'Meghalaya', id: 'ml-east-khasi-hills' },
    { name: 'Aizawl', state: 'Mizoram', id: 'mz-aizawl' },
    { name: 'Noney', state: 'Manipur', id: 'mn-noney' },
    { name: 'Kohima', state: 'Nagaland', id: 'nl-kohima' },
    { name: 'Mangan', state: 'Sikkim', id: 'sk-mangan' },
    { name: 'South Tripura', state: 'Tripura', id: 'tr-south-tripura' },
  ];

  return (
    <div id="ner-state-district-selector" className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider">
              8-State NER Hub
            </span>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
              North Eastern Environmental & Terrain Observatory
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Select an NER state and district to inspect real terrain DEM, calculated slope, ECMWF soil moisture, and verified GSI historical landslides.
          </p>
        </div>

        {/* Selected Coordinates & Elevation Badge */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono shrink-0">
          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="text-slate-700 font-semibold">{selectedLocation.name}, {selectedLocation.state}</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-600">{selectedLocation.latitude.toFixed(3)}°N, {selectedLocation.longitude.toFixed(3)}°E</span>
          <span className="text-slate-400">|</span>
          <span className="text-emerald-700 font-bold">{selectedLocation.elevationMeters}m MSL</span>
        </div>
      </div>

      {/* State & District Dropdown Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 mt-3">
        {/* 1. State Selector */}
        <div className="lg:col-span-4">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
            1. Select NER State (8 States)
          </label>
          <select
            value={selectedLocation.state}
            onChange={(e) => handleStateChange(e.target.value)}
            disabled={isLoading}
            className="w-full bg-slate-50 border border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:bg-white text-slate-900 text-xs font-bold rounded-lg px-3 py-2 outline-hidden transition-all cursor-pointer"
          >
            {nerStatesData.map((st) => (
              <option key={st.name} value={st.name}>
                {st.name} ({st.districts.length} Districts)
              </option>
            ))}
          </select>
        </div>

        {/* 2. District Selector */}
        <div className="lg:col-span-4">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
            2. Select District ({currentDistricts.length} Available)
          </label>
          <select
            value={selectedLocation.id}
            onChange={(e) => handleDistrictChange(e.target.value)}
            disabled={isLoading}
            className="w-full bg-slate-50 border border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:bg-white text-slate-900 text-xs font-bold rounded-lg px-3 py-2 outline-hidden transition-all cursor-pointer"
          >
            {currentDistricts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} • {d.elevationMeters}m MSL
              </option>
            ))}
          </select>
        </div>

        {/* 3. Quick Hotspot Jump */}
        <div className="lg:col-span-4">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
            Critical NER Observation Corridors
          </label>
          <div className="flex flex-wrap gap-1.5">
            {hotSpotDistricts.slice(0, 6).map((hs) => {
              const isSelected = selectedLocation.id === hs.id;
              return (
                <button
                  key={hs.id}
                  onClick={() => {
                    const match = ALL_DISTRICTS.find((d) => d.id === hs.id);
                    if (match) onSelectLocation(match);
                  }}
                  className={`text-[11px] font-semibold px-2 py-1 rounded-md border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {hs.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
