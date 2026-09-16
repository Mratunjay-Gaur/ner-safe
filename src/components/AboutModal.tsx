import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, CloudRain, MapPin, Compass, ShieldCheck } from 'lucide-react';
import { WEBSITE_LOGO_URL } from './NerSafeLogo';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div 
        id="about-dialog"
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <img
              src={WEBSITE_LOGO_URL}
              alt="NER-SAFE"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/nersafe-symbol.png')) {
                  target.src = '/nersafe-symbol.png';
                }
              }}
              className="w-10 h-10 object-contain rounded-xl p-1 bg-white border border-slate-200 shadow-xs shrink-0"
            />
            <div>
              <h3 className="text-lg font-bold text-slate-900">{t('about.modalTitle', 'NER-SAFE: Project Overview')}</h3>
              <p className="text-xs text-slate-500 font-medium">
                {t('about.sihStatement', 'SIH 2026 Problem Statement SIH26001')}
              </p>
            </div>
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
              {t('about.prototypeActive', 'SIH26001 Prototype: Phase 1 & 2 Active')}
            </span>
            <p className="text-xs text-blue-800">
              {t('about.modalMissionDesc', 'NER-SAFE provides verified environmental, terrain slope, volumetric soil moisture, satellite observations, and authoritative historical landslide tracking across the 8 North Eastern Region (NER) states.')}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
              {t('about.methodsHeader', 'Operational Data & Scientific Methods:')}
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span><strong>{t('about.hierarchyTitle', '8-State NER Hierarchy:')}</strong> {t('about.hierarchyDesc', 'Complete administrative coverage for Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, and Tripura.')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Compass className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>{t('about.demTitle', 'Real DEM & Slope:')}</strong> {t('about.demDesc', 'Copernicus 30m Global DEM (GLO-30) / SRTM with Horn finite-difference topographic gradient matrix computing slope angle (degrees), grade %, and aspect.')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CloudRain className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <span><strong>{t('about.ecmwfTitle', 'ECMWF ERA5-Land Soil Moisture:')}</strong> {t('about.ecmwfDesc', 'Multi-layer volumetric moisture telemetry (0–7cm, 7–28cm, 28–100cm) and saturation indexing.')}</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span><strong>{t('about.landslidesTitle', 'Verified Historical Landslides:')}</strong> {t('about.landslidesDesc', 'Authoritative incident records cataloged from Geological Survey of India (GSI) NLSM and NASA Global Landslide Catalog.')}</span>
              </li>
            </ul>
          </div>

          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
            <p>
              {t('about.modalFooter', 'Strict zero-mock policy: only verified scientific feeds and official catalogs are integrated.')}
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {t('common.close', 'Close Overview')}
          </button>
        </div>
      </div>
    </div>
  );
};
