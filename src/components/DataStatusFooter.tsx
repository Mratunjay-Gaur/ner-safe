import React from 'react';
import { Database, Server, CheckCircle2, AlertCircle, Shield, Globe2 } from 'lucide-react';
import { SystemStatusInfo } from '../types/weather';

interface DataStatusFooterProps {
  statusInfo: SystemStatusInfo | null;
  lastUpdatedTime?: string;
  isCached?: boolean;
}

export const DataStatusFooter: React.FC<DataStatusFooterProps> = ({
  statusInfo,
  lastUpdatedTime,
  isCached,
}) => {
  const isWeatherConnected = statusInfo?.weatherApiStatus === 'Connected';
  const isMapConnected = statusInfo?.mapServiceStatus === 'Connected';

  return (
    <footer id="data-status-footer" className="mt-8 pt-4 pb-8 border-t border-slate-200">
      <div className="bg-slate-900 rounded-xl p-4 sm:p-5 text-white shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-slate-100">NER-SAFE Telemetry Status</span>
              <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                Phase 1 Operational
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              SIH 2026 Problem Statement SIH26001 Baseline Meteorological Monitoring
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isWeatherConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-slate-300 font-medium">
                Weather API: <strong className={isWeatherConnected ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>{statusInfo?.weatherApiStatus || 'Connected'}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isMapConnected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              <span className="text-slate-300 font-medium">
                GIS: <strong className={isMapConnected ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>{statusInfo?.mapServiceStatus || 'Connected'}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo?.databaseStatus === 'Connected' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="text-slate-300 font-medium">
                MongoDB Atlas: <strong className={statusInfo?.databaseStatus === 'Connected' ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>{statusInfo?.databaseStatus || 'Pending Whitelist'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Technical Data Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 text-[11px]">
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-500 block">
              Data Source
            </span>
            <span className="text-slate-200 font-medium truncate block">
              {statusInfo?.weatherProviderName || 'WMO / ECMWF Global Meteorological'}
            </span>
          </div>

          <div>
            <span className="text-[9px] uppercase font-bold text-slate-500 block">
              GIS Layer
            </span>
            <span className="text-slate-200 font-medium truncate block">
              {statusInfo?.mapProviderName || 'CartoDB / OpenStreetMap'}
            </span>
          </div>

          <div>
            <span className="text-[9px] uppercase font-bold text-slate-500 block">
              Sync Time
            </span>
            <span className="text-slate-200 font-medium truncate block">
              {lastUpdatedTime || new Date().toLocaleTimeString()} {isCached && '(Cache)'}
            </span>
          </div>

          <div>
            <span className="text-[9px] uppercase font-bold text-slate-500 block">
              Scope
            </span>
            <span className="text-slate-200 font-medium truncate block">
              8 NER States + National India
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mt-3 px-1 text-[11px] text-slate-500">
        <p>© 2026 NER-SAFE • SIH26001 (Landslide & Weather Telemetry in NER)</p>
        <p>Phase 1: Live Meteorological Telemetry</p>
      </div>
    </footer>
  );
};
