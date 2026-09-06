import React, { useState } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Hourglass,
  Check,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Video as VideoIcon,
  Navigation,
  FileText,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { IncidentReportItem, IncidentStatus } from '../types/incident';

interface IncidentDetailModalProps {
  incident: IncidentReportItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (reportId: string, status: IncidentStatus) => Promise<void>;
  onCenterOnMap?: (lat: number, lon: number) => void;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incident,
  isOpen,
  onClose,
  onUpdateStatus,
  onCenterOnMap,
}) => {
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  if (!isOpen || !incident) return null;

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    if (newStatus === incident.status) return;
    setIsUpdating(true);
    setStatusFeedback(null);
    try {
      await onUpdateStatus(incident.reportId, newStatus);
      setStatusFeedback(`Status successfully updated to ${newStatus}`);
      setTimeout(() => setStatusFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to update status:', err);
      setStatusFeedback(`Failed to update status: ${err.message || 'Error'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyCoordinates = () => {
    if (typeof incident.latitude === 'number' && typeof incident.longitude === 'number') {
      navigator.clipboard.writeText(`${incident.latitude}, ${incident.longitude}`);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2500);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase().replace(/_/g, ' ');
    switch (s) {
      case 'RESOLVED':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
          label: 'RESOLVED',
        };
      case 'VERIFIED':
        return {
          bg: 'bg-purple-50 text-purple-800 border-purple-300',
          icon: <ShieldCheck className="w-4 h-4 text-purple-600" />,
          label: 'VERIFIED',
        };
      case 'UNDER REVIEW':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-300',
          icon: <Hourglass className="w-4 h-4 text-blue-600" />,
          label: 'UNDER REVIEW',
        };
      default:
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
          label: 'SUBMITTED',
        };
    }
  };

  const currentStatusBadge = getStatusBadge(incident.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                  {incident.reportId}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${currentStatusBadge.bg}`}
                >
                  {currentStatusBadge.icon}
                  {currentStatusBadge.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Official Disaster & Slope Incident Record
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Status Feedback alert */}
          {statusFeedback && (
            <div
              className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                statusFeedback.includes('Failed')
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusFeedback}</span>
            </div>
          )}

          {/* Workflow Status Action Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Authority Workflow Status
              </span>
              {isUpdating && (
                <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-semibold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Updating in MongoDB...
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['SUBMITTED', 'UNDER REVIEW', 'VERIFIED', 'RESOLVED'] as IncidentStatus[]).map(
                (st) => {
                  const isCurrent =
                    incident.status.replace(/_/g, ' ') === st.replace(/_/g, ' ');
                  return (
                    <button
                      key={st}
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange(st)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all text-center border cursor-pointer ${
                        isCurrent
                          ? st === 'RESOLVED'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : st === 'VERIFIED'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : st === 'UNDER REVIEW'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Primary Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Incident Type */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5">
              <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                Incident Category
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-slate-900">
                  {incident.incidentType}
                </span>
              </div>
            </div>

            {/* Submission Timestamp */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5">
              <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                Reported Timestamp
              </span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {new Date(incident.submittedAt).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
            </div>

            {/* Coordinates & Location */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] uppercase font-bold text-slate-400">
                  Location & GPS Coordinates
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCoordinates}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    {copiedCoords ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCoords ? 'Copied' : 'Copy GPS'}</span>
                  </button>
                  {onCenterOnMap && (
                    <button
                      onClick={() => {
                        onCenterOnMap(incident.latitude, incident.longitude);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      <Navigation className="w-3 h-3 text-blue-600" />
                      <span>View on GIS Map</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="text-xs font-bold text-slate-900 mb-1">
                📍 {incident.locationName}
              </div>
              <div className="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-200/80 inline-block">
                {incident.latitude.toFixed(6)}°N, {incident.longitude.toFixed(6)}°E
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5">
            <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1.5">
              Incident Description & Field Notes
            </span>
            <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
              {incident.description || 'No detailed text description provided.'}
            </p>
          </div>

          {/* Evidence Media Section */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3">
            <span className="text-[11px] uppercase font-bold text-slate-400 block">
              Verified Media Evidence (Cloudinary)
            </span>

            {/* Photos */}
            {incident.photoUrls && incident.photoUrls.length > 0 ? (
              <div>
                <div className="flex items-center gap-1 text-xs font-bold text-slate-700 mb-2">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                  <span>Submitted Photos ({incident.photoUrls.length})</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {incident.photoUrls.map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedImage(url)}
                      className="group relative aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200 cursor-pointer"
                    >
                      <img
                        src={url}
                        alt={`Evidence ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                        Click to Expand
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Video */}
            {incident.videoUrl ? (
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1 text-xs font-bold text-slate-700 mb-2">
                  <VideoIcon className="w-3.5 h-3.5 text-rose-600" />
                  <span>Submitted Incident Video</span>
                </div>
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-black aspect-video max-h-[300px]">
                  <video
                    src={incident.videoUrl}
                    controls
                    className="w-full h-full object-contain"
                    preload="metadata"
                  >
                    Your browser does not support HTML5 video playback.
                  </video>
                </div>
              </div>
            ) : null}

            {(!incident.photoUrls || incident.photoUrls.length === 0) && !incident.videoUrl && (
              <p className="text-xs text-slate-400 italic">
                No photo or video evidence was attached to this report.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-mono">
            DB ID: {incident.id || incident.reportId}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>

      {/* Full Size Image Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={selectedImage}
              alt="Full preview"
              className="max-w-full max-h-[85vh] rounded-lg object-contain"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full hover:bg-black transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
