import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  History,
  Radio,
  RefreshCw,
  Database,
} from 'lucide-react';

interface GisLiveSummaryProps {
  activeIncidentsCount: number;
  criticalCount: number;
  highRiskCount: number;
  historicalEventsCount: number;
  monitoringStationsCount: number;
  isSyncing: boolean;
  onRefresh: () => void;
  lastUpdatedText: string | null;
}

export const GisLiveSummary: React.FC<GisLiveSummaryProps> = ({
  activeIncidentsCount,
  criticalCount,
  highRiskCount,
  historicalEventsCount,
  monitoringStationsCount,
  isSyncing,
  onRefresh,
  lastUpdatedText,
}) => {
  const { t } = useTranslation();

  return (
    <div
      id="gis-live-summary-badge"
      className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-xl p-3 text-slate-100 text-xs w-64 sm:w-72"
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-bold text-[11px] uppercase tracking-wider text-slate-200">
            {t('gisMap.liveGisTelemetry', 'Live GIS Telemetry')}
          </span>
        </div>
        <button
          onClick={onRefresh}
          disabled={isSyncing}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          title={t('gisMap.refreshFeeds', 'Refresh GIS Feeds')}
        >
          <RefreshCw
            className={`w-3 h-3 ${isSyncing ? 'animate-spin text-blue-400' : ''}`}
          />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        {/* Active Incidents */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2 flex flex-col">
          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-0.5">
            <span>{t('gisMap.incidents', 'Incidents')}</span>
            <Activity className="w-3 h-3 text-rose-400" />
          </div>
          <span className="text-base font-bold font-mono text-rose-400">
            {activeIncidentsCount}
          </span>
          <span className="text-[9px] text-slate-500 font-medium">
            MongoDB Atlas
          </span>
        </div>

        {/* Critical Locations */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2 flex flex-col">
          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-0.5">
            <span>{t('gisMap.critical', 'Critical')}</span>
            <AlertOctagon className="w-3 h-3 text-rose-500" />
          </div>
          <span className="text-base font-bold font-mono text-rose-500">
            {criticalCount}
          </span>
          <span className="text-[9px] text-slate-500 font-medium">
            {t('gisMap.highSeverity', 'High Severity')}
          </span>
        </div>

        {/* High-Risk Locations */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2 flex flex-col">
          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-0.5">
            <span>{t('gisMap.highRisk', 'High Risk')}</span>
            <AlertTriangle className="w-3 h-3 text-amber-400" />
          </div>
          <span className="text-base font-bold font-mono text-amber-400">
            {highRiskCount}
          </span>
          <span className="text-[9px] text-slate-500 font-medium">
            {t('gisMap.susceptibleSlopes', 'Susceptible Slopes')}
          </span>
        </div>

        {/* Historical Events */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2 flex flex-col">
          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-0.5">
            <span>{t('gisMap.historical', 'Historical')}</span>
            <History className="w-3 h-3 text-orange-400" />
          </div>
          <span className="text-base font-bold font-mono text-orange-400">
            {historicalEventsCount}
          </span>
          <span className="text-[9px] text-slate-500 font-medium">
            GSI NLSM Catalog
          </span>
        </div>
      </div>

      {/* Monitoring Stations Single Full Row */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Radio className="w-3.5 h-3.5 text-cyan-400" />
          <span>{t('gisMap.imdStations', 'IMD Stations:')}</span>
        </div>
        <span className="font-bold font-mono text-cyan-400">
          {monitoringStationsCount} {t('gisMap.active', 'Active')}
        </span>
      </div>

      {lastUpdatedText && (
        <div className="mt-2 text-[9px] text-slate-500 text-center font-mono">
          {t('gisMap.lastSynchronized', 'Last synchronized')} {lastUpdatedText}
        </div>
      )}
    </div>
  );
};
