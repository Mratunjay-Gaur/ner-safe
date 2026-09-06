import React from 'react';
import { X, CloudRain, MapPin, Compass, ShieldCheck } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div 
        id="about-dialog"
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">NER-SAFE: Project Overview</h3>
            <p className="text-xs text-slate-500 font-medium">
              SIH 2026 Problem Statement SIH26001
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4 text-sm text-slate-600 leading-relaxed max-h-[70vh] overflow-y-auto">
          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
            <span className="font-semibold text-blue-900 block text-xs uppercase tracking-wider mb-1">
              SIH26001 Prototype: Phase 1 & 2 Active
            </span>
            <p className="text-xs text-blue-800">
              NER-SAFE provides verified environmental, terrain slope, volumetric soil moisture, satellite observations, and authoritative historical landslide tracking across the 8 North Eastern Region (NER) states.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">Operational Data & Scientific Methods:</h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span><strong>8-State NER Hierarchy:</strong> Complete administrative coverage for Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, and Tripura.</span>
              </li>
              <li className="flex items-start gap-2">
                <Compass className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Real DEM & Slope:</strong> Copernicus 30m Global DEM (GLO-30) / SRTM with Horn finite-difference topographic gradient matrix computing slope angle (degrees), grade %, and aspect.</span>
              </li>
              <li className="flex items-start gap-2">
                <CloudRain className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <span><strong>ECMWF ERA5-Land Soil Moisture:</strong> Multi-layer volumetric moisture telemetry (0–7cm, 7–28cm, 28–100cm) and saturation indexing.</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span><strong>Verified Historical Landslides:</strong> Authoritative incident records cataloged from Geological Survey of India (GSI) NLSM and NASA Global Landslide Catalog.</span>
              </li>
            </ul>
          </div>

          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
            <p>
              Strict zero-mock policy: only verified scientific feeds and official catalogs are integrated.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};
