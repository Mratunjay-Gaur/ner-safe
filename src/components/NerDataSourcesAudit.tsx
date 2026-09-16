import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  Database,
  Radio,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { DataSourceStatus, DataSourceType } from '../types/environmental';

interface NerDataSourcesAuditProps {
  sources: DataSourceStatus[];
}

export const NerDataSourcesAudit: React.FC<NerDataSourcesAuditProps> = ({ sources }) => {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getStatusBadge = (type: DataSourceType) => {
    switch (type) {
      case 'LIVE':
        return (
          <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            {t('audit.badgeLive', 'LIVE')}
          </span>
        );
      case 'UPDATED':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider">
            {t('audit.badgeUpdated', 'UPDATED')}
          </span>
        );
      case 'STATIC':
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider">
            {t('audit.badgeStatic', 'STATIC')}
          </span>
        );
      case 'HISTORICAL':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider">
            {t('audit.badgeHistorical', 'HISTORICAL')}
          </span>
        );
    }
  };

  const getConnectionBadge = (status: DataSourceStatus['status']) => {
    switch (status) {
      case 'Connected':
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {t('audit.statusConnected', status)}
          </span>
        );
      case 'Degraded':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            {t('audit.statusDegraded', 'Degraded')}
          </span>
        );
      case 'Offline':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            {t('audit.statusOffline', 'Offline / Reconnecting')}
          </span>
        );
    }
  };

  return (
    <div id="ner-data-sources-audit-table" className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-slate-50/70 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded-lg shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                {t('audit.title', 'Authoritative Data Sources & Frequency Audit')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('audit.subtitle', 'Full transparency registry of meteorological feeds, satellite grids, DEM topography, and historical catalogs.')}
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto text-[11px] text-slate-500 font-mono bg-white px-2.5 py-1 rounded border border-slate-200">
            SIH26001 Protocol
          </span>
        </div>

        {/* Clear Classification Legend / Taxonomy */}
        <div className="mt-3 pt-3 border-t border-slate-200/70 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          <div className="bg-white p-2 rounded border border-slate-200/80 flex items-start gap-2">
            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded text-[9px] font-extrabold shrink-0 mt-0.5">
              LIVE
            </span>
            <span className="text-slate-600 leading-tight">{t('audit.descLive', 'Real-time / near-real-time sensor stream')}</span>
          </div>

          <div className="bg-white p-2 rounded border border-slate-200/80 flex items-start gap-2">
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded text-[9px] font-extrabold shrink-0 mt-0.5">
              UPDATED
            </span>
            <span className="text-slate-600 leading-tight">{t('audit.descUpdated', 'Periodically refreshed numerical/physics cycle')}</span>
          </div>

          <div className="bg-white p-2 rounded border border-slate-200/80 flex items-start gap-2">
            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.2 rounded text-[9px] font-extrabold shrink-0 mt-0.5">
              STATIC
            </span>
            <span className="text-slate-600 leading-tight">{t('audit.descStatic', 'Geographic / terrain reference dataset')}</span>
          </div>

          <div className="bg-white p-2 rounded border border-slate-200/80 flex items-start gap-2">
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded text-[9px] font-extrabold shrink-0 mt-0.5">
              HISTORICAL
            </span>
            <span className="text-slate-600 leading-tight">{t('audit.descHistorical', 'Past-event geocoded ground incident archive')}</span>
          </div>
        </div>
      </div>

      {/* Responsive Desktop Table View (Hidden on Small Screens) */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/60 text-slate-600 font-extrabold text-[10px] uppercase tracking-wider border-b border-slate-200">
              <th className="py-3 px-3.5">{t('audit.colTelemetry', 'Telemetry / Dataset')}</th>
              <th className="py-3 px-3.5">{t('audit.colProvider', 'Data Provider')}</th>
              <th className="py-3 px-3">{t('audit.colType', 'Type')}</th>
              <th className="py-3 px-3.5">{t('audit.colFrequency', 'Frequency')}</th>
              <th className="py-3 px-3.5">{t('audit.colLastObs', 'Last Observation / Cycle')}</th>
              <th className="py-3 px-3.5">{t('audit.colCoverage', 'Coverage & Resolution')}</th>
              <th className="py-3 px-3.5">{t('audit.colStatus', 'Status')}</th>
              <th className="py-3 px-2 text-center">{t('common.details', 'Details')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sources.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <React.Fragment key={item.id}>
                  <tr
                    onClick={() => toggleExpand(item.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer select-none"
                  >
                    <td className="py-3 px-3.5 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{item.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 font-semibold text-slate-700">
                      {item.source}
                    </td>
                    <td className="py-3 px-3">
                      {getStatusBadge(item.type)}
                    </td>
                    <td className="py-3 px-3.5 text-slate-700 font-medium">
                      {item.frequency || t('audit.standardCycle', 'Standard Cycle')}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-[11px] text-slate-700">
                      {item.lastObservation}
                    </td>
                    <td className="py-3 px-3.5 text-slate-600">
                      <span className="block font-medium">{item.coverage}</span>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{item.resolution}</span>
                    </td>
                    <td className="py-3 px-3.5">
                      {getConnectionBadge(item.status)}
                    </td>
                    <td className="py-3 px-2 text-center text-slate-400">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 inline-block text-slate-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 inline-block text-slate-400" />
                      )}
                    </td>
                  </tr>

                  {/* Expandable Technical Specification Row */}
                  {isExpanded && (
                    <tr className="bg-slate-50/60 border-b border-slate-200">
                      <td colSpan={8} className="py-3 px-4 text-xs">
                        <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 text-[11px]">
                            <div>
                              <strong className="text-slate-700 font-bold">{t('audit.technicalId', 'Technical Dataset ID:')}</strong>{' '}
                              <span className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {item.id}
                              </span>
                            </div>
                            <div>
                              <strong className="text-slate-700 font-bold">{t('audit.classification', 'Data Classification:')}</strong>{' '}
                              <span className="text-slate-800 font-semibold">{item.type}</span>
                            </div>
                            <div>
                              <strong className="text-slate-700 font-bold">{t('audit.pipelineCadence', 'Pipeline Cadence:')}</strong>{' '}
                              <span className="text-slate-800 font-semibold">{item.frequency || t('audit.automated', 'Automated')}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                {t('audit.ingestionDetails', 'Ingestion & Architecture Details')}
                              </span>
                              <p className="text-slate-700 mt-0.5 leading-relaxed font-normal">
                                {item.notes || t('audit.defaultNotes', 'Direct API pipeline integration providing verified telemetry under SIH26001 standards.')}
                              </p>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                {t('audit.spatialSpecs', 'Spatial Grid & Resolution Specs')}
                              </span>
                              <p className="text-slate-700 mt-0.5 leading-relaxed font-normal">
                                {t('audit.coverageDesc', '{{resolution}} coverage spanning {{coverage}}.', { resolution: item.resolution, coverage: item.coverage })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Responsive Mobile / Tablet Card View (Shown on Small Screens) */}
      <div className="lg:hidden p-3 space-y-2.5">
        {sources.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <div
              key={item.id}
              className={`rounded-lg border transition-all ${
                isExpanded ? 'border-slate-400 bg-slate-50/60' : 'border-slate-200 bg-white'
              }`}
            >
              <div
                onClick={() => toggleExpand(item.id)}
                className="p-3 cursor-pointer flex flex-col gap-2 select-none"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 block">
                      {item.name}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600 block mt-0.5">
                      {item.source}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {getStatusBadge(item.type)}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">{t('audit.colFrequency', 'Frequency')}</span>
                    <span className="font-semibold text-slate-800">{item.frequency || t('audit.continuous', 'Continuous')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">{t('audit.lastUpdate', 'Last Update')}</span>
                    <span className="font-mono text-slate-800 text-[10px]">{item.lastObservation}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[10px]">{t('audit.colCoverage', 'Coverage & Resolution')}</span>
                    <span className="text-slate-700">{item.coverage} • {item.resolution}</span>
                  </div>
                </div>

                <div className="pt-1.5 flex items-center justify-between border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-mono">ID: {item.id}</span>
                  {getConnectionBadge(item.status)}
                </div>
              </div>

              {/* Mobile Expanded Specifications */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-slate-200 text-xs">
                  <div className="bg-white p-2.5 rounded border border-slate-200 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      {t('audit.mobileArchNotes', 'Architecture & Protocol Notes')}
                    </span>
                    <p className="text-slate-700 text-xs leading-relaxed">
                      {item.notes || t('audit.defaultMobileNotes', 'Verified data pipeline connected for NER environmental risk surveillance.')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Governance Protocol Notice */}
      <div className="p-3 bg-slate-50/90 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-600 gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-slate-700 shrink-0" />
          <span>
            {t('audit.governanceNotice', 'Strict zero-mock policy: only verified datasets from WMO, ECMWF, Copernicus, GSI, and NASA are integrated.')}
          </span>
        </div>
        <div className="text-[10px] text-slate-400 font-mono shrink-0">
          {t('audit.complianceTag', 'Audited under SIH26001 Compliance')}
        </div>
      </div>
    </div>
  );
};

