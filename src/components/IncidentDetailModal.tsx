import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  MapPin,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Hourglass,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Video as VideoIcon,
  Navigation,
  FileText,
  Loader2,
  ShieldCheck,
  Trash2,
  Maximize2,
} from 'lucide-react';
import { IncidentReportItem, IncidentStatus } from '../types/incident';
import { getWorkflowStatusStyle } from '../utils/commandCenterTheme';

interface IncidentDetailModalProps {
  incident: IncidentReportItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (reportId: string, status: IncidentStatus) => Promise<void>;
  onDeleteIncident?: (reportId: string) => Promise<void>;
  onCenterOnMap?: (lat: number, lon: number) => void;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incident,
  isOpen,
  onClose,
  onUpdateStatus,
  onDeleteIncident,
  onCenterOnMap,
}) => {
  const { t } = useTranslation();
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  if (!isOpen || !incident) return null;

  const currentStatusStyle = getWorkflowStatusStyle(incident.status);

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    if (newStatus === incident.status) return;
    setIsUpdating(true);
    setStatusFeedback(null);
    try {
      await onUpdateStatus(incident.reportId, newStatus);
      setStatusFeedback(t('incidentDetail.statusSuccess', 'Status successfully updated to {{status}}', { status: newStatus }));
      setTimeout(() => setStatusFeedback(null), 3500);
    } catch (err: any) {
      console.error('Failed to update status:', err);
      setStatusFeedback(t('incidentDetail.statusFailed', 'Failed to update status: {{msg}}', { msg: err.message || 'Error' }));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyCoordinates = () => {
    if (typeof incident.latitude === 'number' && typeof incident.longitude === 'number') {
      navigator.clipboard.writeText(`${incident.latitude}, ${incident.longitude}`);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
    }
  };

  const handleCopyReportId = () => {
    navigator.clipboard.writeText(incident.reportId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const photos = incident.photoUrls || [];
  const activePhoto = photos[activeImageIndex] || photos[0];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Tactical Header */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-slate-900 dark:bg-blue-950 text-blue-400 rounded-xl border border-slate-800 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-black text-sm sm:text-base text-slate-900 dark:text-slate-100 tracking-tight">
                    {incident.reportId}
                  </span>
                  <button
                    onClick={handleCopyReportId}
                    title={t('incidentDetail.copyId', 'Copy Report ID')}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {copiedId && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      {t('common.copied', 'Copied')}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${currentStatusStyle.badgeBg} ${currentStatusStyle.badgeText} ${currentStatusStyle.badgeBorder}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${currentStatusStyle.dotBg}`} />
                    {currentStatusStyle.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {incident.locationName || t('incidentDetail.geolocatedReport', 'Geolocated Report')} · {t('incidentDetail.registeredDb', 'Registered in MongoDB Atlas')}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1 text-slate-800 dark:text-slate-200">
            {/* Status Update Banner */}
            {statusFeedback && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                  statusFeedback.includes('Failed')
                    ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{statusFeedback}</span>
              </motion.div>
            )}

            {/* Tactical Workflow Status Action Bar */}
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('incidentDetail.workflowProgression', 'Authority Workflow Progression')}
                </span>
                {isUpdating && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-bold">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {t('incidentDetail.updatingDb', 'Updating Database...')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['SUBMITTED', 'UNDER REVIEW', 'VERIFIED', 'RESOLVED'] as IncidentStatus[]).map(
                  (st) => {
                    const isCurrent =
                      incident.status.replace(/_/g, ' ') === st.replace(/_/g, ' ');
                    const style = getWorkflowStatusStyle(st);

                    return (
                      <button
                        key={st}
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(st)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-extrabold transition-all text-center border cursor-pointer flex items-center justify-center gap-1.5 ${
                          isCurrent
                            ? `${style.badgeBg} ${style.badgeText} ${style.badgeBorder} ring-2 ring-blue-500/20 shadow-xs font-black`
                            : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {isCurrent && <span className={`w-1.5 h-1.5 rounded-full ${style.dotBg}`} />}
                        <span>{st}</span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Core Attributes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  {t('incidentDetail.classification', 'Incident Classification')}
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                  {incident.incidentType}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  {t('incidentDetail.timestamp', 'Submission Timestamp')}
                </span>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {new Date(incident.submittedAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  {t('incidentDetail.locationCoordinate', 'Location Coordinate')}
                </span>
                <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                  <span>
                    {incident.latitude.toFixed(4)}°, {incident.longitude.toFixed(4)}°
                  </span>
                  <button
                    onClick={handleCopyCoordinates}
                    className="p-1 hover:text-blue-600 transition-colors cursor-pointer"
                    title={t('incidentDetail.copyCoords', 'Copy Coordinates')}
                  >
                    <Copy className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Description / Field Narrative */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                {t('incidentDetail.fieldNarrative', 'Field Narrative & Citizen Notes')}
              </span>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-wrap">
                {incident.description || t('incidentDetail.noObservations', 'No detailed written observations provided.')}
              </p>
            </div>

            {/* Photographic & Video Evidence Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                  <span>{t('incidentDetail.evidenceTitle', 'Field Photographic & Video Evidence')}</span>
                  <span className="text-[10px] font-normal text-slate-400">
                    ({photos.length} {photos.length === 1 ? t('incidentDetail.photo', 'photo') : t('incidentDetail.photos', 'photos')}{incident.videoUrl ? `, 1 ${t('incidentDetail.video', 'video')}` : ''})
                  </span>
                </span>
              </div>

              {photos.length === 0 && !incident.videoUrl ? (
                <div className="p-6 text-center bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-medium">
                  {t('incidentDetail.noEvidence', 'No photographic or video evidence attached to this report.')}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Photo Main Preview */}
                  {photos.length > 0 && activePhoto && (
                    <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video max-h-80 flex items-center justify-center group">
                      <img
                        src={activePhoto}
                        alt="Incident Field Evidence"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain cursor-zoom-in"
                        onClick={() => setIsLightboxOpen(true)}
                      />
                      <button
                        onClick={() => setIsLightboxOpen(true)}
                        className="absolute bottom-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-xs font-bold"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>{t('incidentDetail.inspectFullRes', 'Inspect Full-Res')}</span>
                      </button>
                    </div>
                  )}

                  {/* Thumbnail Row */}
                  {photos.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {photos.map((url, idx) => (
                        <button
                          key={url}
                          onClick={() => setActiveImageIndex(idx)}
                          className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                            idx === activeImageIndex
                              ? 'border-blue-500 ring-2 ring-blue-500/20'
                              : 'border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={url}
                            alt={`Thumbnail ${idx + 1}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Video Player */}
                  {incident.videoUrl && (
                    <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                        <VideoIcon className="w-4 h-4 text-rose-400" />
                        <span>{t('incidentDetail.videoAttachment', 'Cloudinary Video Attachment')}</span>
                      </div>
                      <video
                        controls
                        src={incident.videoUrl}
                        className="w-full rounded-lg max-h-72 bg-black"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions Footer */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${incident.latitude},${incident.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5 text-blue-500" />
                  <span>{t('incidentDetail.externalMaps', 'External Maps')}</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>

                {onCenterOnMap && (
                  <button
                    onClick={() => {
                      onCenterOnMap(incident.latitude, incident.longitude);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{t('incidentDetail.focusGis', 'Focus GIS')}</span>
                  </button>
                )}
              </div>

              {onDeleteIncident && (
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={async () => {
                    if (window.confirm(t('incidentDetail.confirmDelete', 'Permanently remove incident {{id}} from MongoDB?', { id: incident.reportId }))) {
                      setIsDeleting(true);
                      try {
                        await onDeleteIncident(incident.reportId);
                      } finally {
                        setIsDeleting(false);
                      }
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? t('incidentDetail.deleting', 'Deleting...') : t('incidentDetail.deleteRecord', 'Delete Record')}</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Full-Screen Lightbox */}
      {isLightboxOpen && activePhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 bg-slate-900/80 text-white rounded-full hover:bg-slate-800"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={activePhoto}
            alt="Full size evidence"
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[92vh] object-contain rounded-lg"
          />
        </div>
      )}
    </AnimatePresence>
  );
};
