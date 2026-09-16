import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  MapPin,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Hourglass,
  Copy,
  Check,
  ExternalLink,
  Image as ImageIcon,
  Video as VideoIcon,
  Crosshair,
  Shield,
  Activity,
  History,
  Radio,
  Route,
  Maximize2,
} from 'lucide-react';
import { IncidentReportItem } from '../../types/incident';
import { HistoricalLandslideRecord } from '../../types/environmental';
import { GisWeatherStation, GisRoadCorridor } from '../../data/gisInfrastructureData';

export type GisSelectedItem =
  | { type: 'INCIDENT'; data: IncidentReportItem; riskScore?: number }
  | { type: 'HISTORICAL'; data: HistoricalLandslideRecord }
  | { type: 'WEATHER_STATION'; data: GisWeatherStation }
  | { type: 'ROAD_CORRIDOR'; data: GisRoadCorridor }
  | { type: 'RISK_ZONE'; data: { district: string; state: string; riskLevel: string; riskScore: number; latitude: number; longitude: number; factors?: string[] } };

interface GisDetailDrawerProps {
  selectedItem: GisSelectedItem | null;
  onClose: () => void;
  onFocusCoordinates: (lat: number, lon: number, zoom?: number) => void;
}

export const GisDetailDrawer: React.FC<GisDetailDrawerProps> = ({
  selectedItem,
  onClose,
  onFocusCoordinates,
}) => {
  const { t } = useTranslation();
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  if (!selectedItem) return null;

  const copyToClipboard = (text: string, isId: boolean) => {
    navigator.clipboard?.writeText(text);
    if (isId) {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
    }
  };

  const formatIST = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      }).format(d) + ' IST';
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <div
        id="gis-detail-drawer"
        className="absolute top-16 right-3 sm:right-4 w-[calc(100%-24px)] sm:w-96 max-h-[calc(100%-80px)] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl z-[1050] overflow-hidden flex flex-col text-slate-100 animate-in slide-in-from-right-4 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700/80 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {selectedItem.type === 'INCIDENT' && (
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            )}
            {selectedItem.type === 'HISTORICAL' && (
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            )}
            {selectedItem.type === 'WEATHER_STATION' && (
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            )}
            {selectedItem.type === 'ROAD_CORRIDOR' && (
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
            )}
            {selectedItem.type === 'RISK_ZONE' && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            )}
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 truncate">
              {selectedItem.type === 'INCIDENT' && t('gisMap.liveIncidentInspection', 'Live Incident Inspection')}
              {selectedItem.type === 'HISTORICAL' && t('gisMap.historicalLandslideGsi', 'Historical Landslide (GSI)')}
              {selectedItem.type === 'WEATHER_STATION' && t('gisMap.imdWeatherObservatory', 'IMD Weather Observatory')}
              {selectedItem.type === 'ROAD_CORRIDOR' && t('gisMap.mountainHighwayCorridor', 'Mountain Highway Corridor')}
              {selectedItem.type === 'RISK_ZONE' && t('gisMap.districtRiskZone', 'District Risk Zone')}
            </h2>
          </div>
          <button
            id="gis-detail-close-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/70 transition-colors cursor-pointer"
            title={t('common.close', 'Close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* =========================================================================
              1. REAL INCIDENT VIEW
             ========================================================================= */}
          {selectedItem.type === 'INCIDENT' && (
            <>
              {/* Type and Status Banner */}
              <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    {t('gisMap.incidentType', 'Incident Type')}
                  </div>
                  <div className="text-base font-bold text-white flex items-center gap-1.5 mt-0.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>{selectedItem.data.incidentType || t('gisMap.unspecifiedHazard', 'Unspecified Hazard')}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">
                    {t('gisMap.status', 'Status')}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      selectedItem.data.status === 'VERIFIED'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : selectedItem.data.status === 'RESOLVED'
                        ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                        : selectedItem.data.status === 'UNDER REVIEW' || selectedItem.data.status === 'UNDER_REVIEW'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {selectedItem.data.status}
                  </span>
                </div>
              </div>

              {/* Identification details */}
              <div className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">{t('gisMap.reportRef', 'Report Reference:')}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-200">
                      {selectedItem.data.reportId}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedItem.data.reportId, true)}
                      className="p-1 hover:text-white text-slate-400 cursor-pointer"
                      title={t('gisMap.copyReportId', 'Copy Report ID')}
                    >
                      {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start justify-between">
                  <span className="text-slate-400 font-medium">{t('gisMap.locationName', 'Location Name:')}</span>
                  <span className="font-semibold text-slate-200 text-right max-w-[180px]">
                    {selectedItem.data.locationName || t('gisMap.gpsCoordinateSite', 'GPS Coordinate Site')}
                  </span>
                </div>

                {/* State & District if present */}
                {(selectedItem.data as any).state && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">{t('gisMap.stateLabel', 'State:')}</span>
                    <span className="text-slate-200 font-medium">{(selectedItem.data as any).state}</span>
                  </div>
                )}
                {(selectedItem.data as any).district && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">{t('gisMap.districtLabel', 'District:')}</span>
                    <span className="text-slate-200 font-medium">{(selectedItem.data as any).district}</span>
                  </div>
                )}

                {/* Severity (if available) */}
                {(selectedItem.data as any).severity && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">{t('gisMap.severityLabel', 'Severity:')}</span>
                    <span className="font-bold text-rose-400 font-mono">
                      {(selectedItem.data as any).severity}
                    </span>
                  </div>
                )}

                {/* Risk Score (if available) */}
                {typeof selectedItem.riskScore === 'number' && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">{t('gisMap.calculatedRiskScore', 'Calculated Risk Score:')}</span>
                    <span className="font-bold text-amber-400 font-mono">
                      {selectedItem.riskScore}/100
                    </span>
                  </div>
                )}

                {/* Reported Time */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">{t('gisMap.reportedTime', 'Reported Time:')}</span>
                  <span className="text-slate-300 font-mono text-[11px]">
                    {formatIST(selectedItem.data.submittedAt || selectedItem.data.createdAt || '')}
                  </span>
                </div>

                {/* GPS Coordinates */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400 font-medium">{t('gisMap.gpsCoords', 'GPS Coordinates:')}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-cyan-300 font-medium">
                      {selectedItem.data.latitude.toFixed(5)}, {selectedItem.data.longitude.toFixed(5)}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${selectedItem.data.latitude}, ${selectedItem.data.longitude}`,
                          false
                        )
                      }
                      className="p-1 hover:text-white text-slate-400 cursor-pointer"
                      title={t('gisMap.copyCoordinates', 'Copy Coordinates')}
                    >
                      {copiedCoords ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedItem.data.description && (
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                    {t('gisMap.reporterDesc', 'Reporter Description / Ground Evidence')}
                  </span>
                  <p className="text-slate-200 leading-relaxed italic text-[11px] bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                    "{selectedItem.data.description}"
                  </p>
                </div>
              )}

              {/* Evidence Media (Photos & Video) */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                  {t('gisMap.evidenceMedia', 'Evidence Media')}
                </span>

                {/* Photos */}
                {selectedItem.data.photoUrls && selectedItem.data.photoUrls.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedItem.data.photoUrls.map((url, idx) => (
                      <div
                        key={idx}
                        onClick={() => setLightboxImage(url)}
                        className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-video cursor-pointer hover:border-blue-400 transition-all"
                      >
                        <img
                          src={url}
                          alt={`Evidence Photo ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Maximize2 className="w-4 h-4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-slate-500 text-[11px] flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-slate-600 shrink-0" />
                    <span>{t('gisMap.noPhotoEvidence', 'No photographic evidence submitted')}</span>
                  </div>
                )}

                {/* Video */}
                {selectedItem.data.videoUrl ? (
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-[11px]">
                      <VideoIcon className="w-4 h-4 text-blue-400" />
                      <span>{t('gisMap.videoRecordingAvailable', 'Video Recording Available')}</span>
                    </div>
                    <video
                      src={selectedItem.data.videoUrl}
                      controls
                      className="w-full rounded-lg max-h-48 bg-black"
                    />
                  </div>
                ) : null}
              </div>

              {/* Fly to marker button */}
              <button
                id="gis-focus-incident-btn"
                onClick={() =>
                  onFocusCoordinates(
                    selectedItem.data.latitude,
                    selectedItem.data.longitude,
                    15
                  )
                }
                className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-blue-500/20"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>{t('gisMap.centerAndZoom', 'Center & Zoom onto Incident (15x)')}</span>
              </button>
            </>
          )}

          {/* =========================================================================
              2. HISTORICAL LANDSLIDE VIEW (GSI/SDMA)
             ========================================================================= */}
          {selectedItem.type === 'HISTORICAL' && (
            <>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  {t('gisMap.cataloguedHazard', 'Catalogued Hazard')}
                </div>
                <div className="text-base font-bold text-orange-400 mt-0.5">
                  {selectedItem.data.landslideType}
                </div>
                <div className="text-[11px] text-slate-300 mt-1">
                  {selectedItem.data.locationName}, {selectedItem.data.district}, {selectedItem.data.state}
                </div>
              </div>

              <div className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{t('gisMap.dateOfOccurrence', 'Date of Occurrence:')}</span>
                  <span className="font-mono text-slate-200 font-semibold">{selectedItem.data.date} ({selectedItem.data.year})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{t('gisMap.triggerMechanism', 'Trigger Mechanism:')}</span>
                  <span className="text-slate-200 font-medium">{selectedItem.data.trigger}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{t('gisMap.casualtiesReported', 'Casualties Reported:')}</span>
                  <span className="font-bold text-rose-400">
                    {selectedItem.data.fatalities || 0} {t('gisMap.fatalities', 'Fatalities')}, {selectedItem.data.injuries || 0} {t('gisMap.injuries', 'Injuries')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{t('gisMap.catalogSource', 'Catalog Source:')}</span>
                  <span className="text-slate-300 font-mono text-[10px]">{selectedItem.data.catalogSource}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{t('gisMap.referenceId', 'Reference ID:')}</span>
                  <span className="font-mono text-slate-400 text-[10px]">{selectedItem.data.sourceReferenceId}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">{t('gisMap.coordinates', 'Coordinates:')}</span>
                  <span className="font-mono text-cyan-300">
                    {selectedItem.data.latitude.toFixed(4)}, {selectedItem.data.longitude.toFixed(4)}
                  </span>
                </div>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                  {t('gisMap.historicalImpact', 'Historical Impact & Damage Assessment')}
                </span>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {selectedItem.data.impactDescription}
                </p>
              </div>

              <button
                onClick={() =>
                  onFocusCoordinates(
                    selectedItem.data.latitude,
                    selectedItem.data.longitude,
                    14
                  )
                }
                className="w-full py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>{t('gisMap.centerOnHistorical', 'Center & Zoom onto Historical Site')}</span>
              </button>
            </>
          )}

          {/* =========================================================================
              3. IMD WEATHER STATION VIEW
             ========================================================================= */}
          {selectedItem.type === 'WEATHER_STATION' && (
            <>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  {t('gisMap.observatoryStation', 'Observatory Station')}
                </div>
                <div className="text-sm font-bold text-cyan-400 mt-0.5">
                  {selectedItem.data.name}
                </div>
                <div className="text-[11px] text-slate-300 mt-1">
                  {selectedItem.data.district}, {selectedItem.data.state}
                </div>
              </div>

              <div className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{t('gisMap.stationCode', 'Station Code:')}</span>
                  <span className="font-mono text-cyan-300 font-bold">{selectedItem.data.code}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{t('gisMap.stationType', 'Station Type:')}</span>
                  <span className="text-slate-200 font-semibold">{selectedItem.data.stationType}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{t('gisMap.operatingAgency', 'Operating Agency:')}</span>
                  <span className="text-slate-300">{selectedItem.data.agency}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{t('gisMap.elevation', 'Elevation:')}</span>
                  <span className="font-mono text-emerald-400">{selectedItem.data.elevationMeters} {t('gisMap.metersMsl', 'meters MSL')}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">{t('gisMap.coordinates', 'Coordinates:')}</span>
                  <span className="font-mono text-slate-300">
                    {selectedItem.data.latitude.toFixed(4)}, {selectedItem.data.longitude.toFixed(4)}
                  </span>
                </div>
              </div>

              <button
                onClick={() =>
                  onFocusCoordinates(
                    selectedItem.data.latitude,
                    selectedItem.data.longitude,
                    14
                  )
                }
                className="w-full py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>{t('gisMap.centerOnObservatory', 'Center on Observatory Station')}</span>
              </button>
            </>
          )}

          {/* =========================================================================
              4. MOUNTAIN ROAD CORRIDOR VIEW
             ========================================================================= */}
          {selectedItem.type === 'ROAD_CORRIDOR' && (
            <>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="px-2 py-0.5 bg-indigo-500/20 border border-indigo-400/40 rounded text-[10px] font-mono font-bold text-indigo-300">
                    {selectedItem.data.highwayNumber}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedItem.data.vulnerability === 'EXTREME'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : selectedItem.data.vulnerability === 'HIGH'
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {selectedItem.data.vulnerability} {t('gisMap.vulnerability', 'VULNERABILITY')}
                  </span>
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  {selectedItem.data.name}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {t('gisMap.statesLabel', 'States:')} {selectedItem.data.states.join(', ')}
                </div>
              </div>

              <div className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">
                    {t('gisMap.strategicSignificance', 'Strategic Significance')}
                  </span>
                  <span className="text-slate-200 font-semibold">{selectedItem.data.significance}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">
                    {t('gisMap.corridorDesc', 'Corridor Description')}
                  </span>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    {selectedItem.data.description}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">{t('gisMap.waypoints', 'Waypoints:')}</span>
                  <span className="font-mono text-indigo-300">{selectedItem.data.coordinates.length} {t('gisMap.mountainCheckposts', 'mountain checkposts')}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  const mid = selectedItem.data.coordinates[Math.floor(selectedItem.data.coordinates.length / 2)];
                  onFocusCoordinates(mid[0], mid[1], 10);
                }}
                className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>{t('gisMap.centerOnHighway', 'Center on Highway Corridor')}</span>
              </button>
            </>
          )}

          {/* =========================================================================
              5. DISTRICT RISK ZONE VIEW
             ========================================================================= */}
          {selectedItem.type === 'RISK_ZONE' && (
            <>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    {t('gisMap.evaluatedRisk', 'Evaluated Landslide Risk')}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedItem.data.riskLevel === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : selectedItem.data.riskLevel === 'HIGH'
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                        : selectedItem.data.riskLevel === 'MODERATE'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {selectedItem.data.riskLevel}
                  </span>
                </div>
                <div className="text-base font-bold text-white mt-1">
                  {selectedItem.data.district} {t('gisMap.district', 'District')}
                </div>
                <div className="text-[11px] text-slate-400">
                  {selectedItem.data.state} (NER)
                </div>
              </div>

              <div className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{t('gisMap.riskScoreLabel', 'Risk Score:')}</span>
                  <span className="font-mono text-base font-bold text-amber-400">{selectedItem.data.riskScore}/100</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">{t('gisMap.districtCentroid', 'District Centroid:')}</span>
                  <span className="font-mono text-cyan-300">
                    {selectedItem.data.latitude.toFixed(4)}, {selectedItem.data.longitude.toFixed(4)}
                  </span>
                </div>
              </div>

              <button
                onClick={() =>
                  onFocusCoordinates(
                    selectedItem.data.latitude,
                    selectedItem.data.longitude,
                    12
                  )
                }
                className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>{t('gisMap.centerOnRiskBuffer', 'Center & Inspect Risk Buffer')}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Fullscreen Lightbox Modal for Evidence Photo */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-slate-800 text-white hover:bg-slate-700 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxImage}
              alt="Incident Ground Evidence Full Size"
              className="max-h-[85vh] max-w-full rounded-xl object-contain border border-slate-700 shadow-2xl"
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
};
