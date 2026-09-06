import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  AlertTriangle,
  MapPin,
  Camera,
  Video,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Crosshair,
  FileText,
  UploadCloud,
  Layers,
  ChevronRight,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';
import { IncidentType, IncidentReportResponse } from '../types/incident';

const INCIDENT_TYPES: { type: IncidentType; label: string; desc: string }[] = [
  { type: 'Landslide', label: 'Landslide', desc: 'Mass earth/debris flow or slope failure' },
  { type: 'Ground Crack', label: 'Ground Crack', desc: 'Tension fissure or deep surface displacement' },
  { type: 'Slope Movement', label: 'Slope Movement', desc: 'Active creeping soil or unstable embankment' },
  { type: 'Rockfall', label: 'Rockfall', desc: 'Detached boulders or falling rock debris' },
  { type: 'Blocked Road', label: 'Blocked Road', desc: 'Corridor or highway blocked by debris' },
  { type: 'Water Seepage', label: 'Water Seepage', desc: 'Abnormal spring burst or heavy slope saturation' },
  { type: 'Other', label: 'Other Hazard', desc: 'Other geological, soil, or runoff hazard' },
];

export const ReportIncidentView: React.FC = () => {
  // Form State
  const [incidentType, setIncidentType] = useState<IncidentType>('Landslide');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [geoStatus, setGeoStatus] = useState<
    'idle' | 'locating' | 'success' | 'denied' | 'error' | 'manual'
  >('idle');
  const [geoErrorMessage, setGeoErrorMessage] = useState<string>('');

  // Media
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  // Text & Submission Time
  const [description, setDescription] = useState<string>('');
  const [submissionTimestamp, setSubmissionTimestamp] = useState<string>(new Date().toISOString());

  // UI state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successReport, setSuccessReport] = useState<IncidentReportResponse | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Live timestamp clock updater
  useEffect(() => {
    const timer = setInterval(() => {
      if (!successReport) {
        setSubmissionTimestamp(new Date().toISOString());
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [successReport]);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize interactive Leaflet map for location adjustment
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default to central NER coordinates (e.g. Shillong / Guwahati centroid: 26.14, 91.73)
      const initialLat = latitude || 26.1445;
      const initialLon = longitude || 91.7362;
      const initialZoom = latitude && longitude ? 13 : 7;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLon],
        zoom: initialZoom,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors & CartoDB',
        maxZoom: 19,
      }).addTo(map);

      // Create Custom Map Pin Marker
      const customPinIcon = L.divIcon({
        className: 'custom-incident-pin',
        html: `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;background:#e11d48;color:white;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      });

      if (latitude && longitude) {
        const marker = L.marker([latitude, longitude], {
          icon: customPinIcon,
          draggable: true,
        }).addTo(map);

        marker.on('dragend', (e) => {
          const newPos = (e.target as L.Marker).getLatLng();
          setLatitude(parseFloat(newPos.lat.toFixed(6)));
          setLongitude(parseFloat(newPos.lng.toFixed(6)));
          setGeoStatus('manual');
        });

        markerRef.current = marker;
      }

      // Allow click anywhere on map to set/adjust coordinate
      map.on('click', (e: L.LeafletMouseEvent) => {
        const clickedLat = parseFloat(e.latlng.lat.toFixed(6));
        const clickedLng = parseFloat(e.latlng.lng.toFixed(6));

        setLatitude(clickedLat);
        setLongitude(clickedLng);
        setGeoStatus('manual');

        if (markerRef.current) {
          markerRef.current.setLatLng([clickedLat, clickedLng]);
        } else {
          const marker = L.marker([clickedLat, clickedLng], {
            icon: customPinIcon,
            draggable: true,
          }).addTo(map);

          marker.on('dragend', (ev) => {
            const newPos = (ev.target as L.Marker).getLatLng();
            setLatitude(parseFloat(newPos.lat.toFixed(6)));
            setLongitude(parseFloat(newPos.lng.toFixed(6)));
            setGeoStatus('manual');
          });

          markerRef.current = marker;
        }
      });

      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup on unmount
    };
  }, []);

  // Update map and marker when latitude/longitude change externally
  useEffect(() => {
    if (mapInstanceRef.current && latitude && longitude) {
      const map = mapInstanceRef.current;
      map.setView([latitude, longitude], Math.max(map.getZoom(), 12), { animate: true });

      const customPinIcon = L.divIcon({
        className: 'custom-incident-pin',
        html: `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;background:#e11d48;color:white;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      });

      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      } else {
        const marker = L.marker([latitude, longitude], {
          icon: customPinIcon,
          draggable: true,
        }).addTo(map);

        marker.on('dragend', (ev) => {
          const newPos = (ev.target as L.Marker).getLatLng();
          setLatitude(parseFloat(newPos.lat.toFixed(6)));
          setLongitude(parseFloat(newPos.lng.toFixed(6)));
          setGeoStatus('manual');
        });

        markerRef.current = marker;
      }
    }
  }, [latitude, longitude]);

  // Use Device Geolocation
  const handleCaptureCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoStatus('error');
      setGeoErrorMessage('Geolocation is not supported by your browser or device.');
      return;
    }

    setGeoStatus('locating');
    setGeoErrorMessage('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lon = parseFloat(position.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lon);
        setGeoStatus('success');
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGeoStatus('denied');
          setGeoErrorMessage('Location permission was denied. You can tap the map or type coordinates manually.');
        } else {
          setGeoStatus('error');
          setGeoErrorMessage(error.message || 'Unable to retrieve your current location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Photo handlers
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid photo file (JPEG, PNG, WEBP).');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setFormError('Photo file size exceeds the 20MB limit.');
      return;
    }

    setFormError(null);
    setPhotoFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  // Video handlers
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setFormError('Please select a valid video file (MP4, WEBM, MOV).');
      return;
    }

    if (file.size > 35 * 1024 * 1024) {
      setFormError('Video file size exceeds the 35MB limit.');
      return;
    }

    setFormError(null);
    setVideoFile(file);

    const url = URL.createObjectURL(file);
    setVideoPreview(url);
  };

  const handleRemoveVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Check offline status
    if (!navigator.onLine) {
      setFormError('Offline — connection unavailable. Please reconnect to submit.');
      return;
    }

    // Validations
    if (!latitude || !longitude) {
      setFormError('Please provide GPS coordinates using "Current Location" or by tapping on the map.');
      return;
    }

    if (!description.trim()) {
      setFormError('Please provide a brief description of the observed hazard.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('incidentType', incidentType);
      formData.append('latitude', String(latitude));
      formData.append('longitude', String(longitude));
      formData.append('locationName', locationName.trim() || 'Detected GPS Coordinate');
      formData.append('description', description.trim());
      formData.append('submittedAt', submissionTimestamp);

      if (photoFile) {
        formData.append('photo', photoFile);
      }
      if (videoFile) {
        formData.append('video', videoFile);
      }

      const response = await fetch('/api/incidents', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Server responded with status ${response.status}`);
      }

      setSuccessReport(result);
    } catch (err: any) {
      console.error('Submission failed:', err);
      setFormError(err.message || 'Failed to submit incident report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setIncidentType('Landslide');
    setLatitude(null);
    setLongitude(null);
    setLocationName('');
    setGeoStatus('idle');
    setGeoErrorMessage('');
    handleRemovePhoto();
    handleRemoveVideo();
    setDescription('');
    setSuccessReport(null);
    setFormError(null);
  };

  // Format date readable
  const formattedDate = new Date(submissionTimestamp).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  return (
    <div id="report-incident-container" className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      {/* Offline Alert Bar */}
      {isOffline && (
        <div className="mb-4 bg-amber-50 border border-amber-300 p-3.5 rounded-xl flex items-center gap-2.5 text-amber-900 text-xs font-bold shadow-2xs">
          <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Offline — connection unavailable. Network connectivity is required to upload media and submit reports.</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Report Ground & Slope Incident
                </h1>
                <span className="bg-rose-100 text-rose-800 text-[10px] font-extrabold px-2 py-0.5 rounded">
                  SIH26001
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Submit field observations with live GPS coordinates and photo/video evidence to MongoDB Atlas & Cloudinary.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-mono text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* SUCCESS CONFIRMATION VIEW */}
      {successReport ? (
        <div className="bg-white rounded-xl border border-emerald-200 p-6 shadow-xs space-y-6 animate-in fade-in duration-300">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full mb-1">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black text-slate-900">
              Incident Report Submitted Successfully
            </h2>
            <p className="text-xs text-slate-500">
              Your field report has been securely registered in the primary disaster database.
            </p>
          </div>

          {/* Submission Receipt Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Official Report ID
                </span>
                <span className="text-sm font-mono font-black text-slate-900">
                  {successReport.reportId}
                </span>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-md border border-emerald-200">
                STATUS: {successReport.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Incident Type</span>
                <span className="font-bold text-slate-800 text-xs mt-0.5 block">{successReport.incidentType}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Submission Time</span>
                <span className="font-mono text-slate-800 text-xs mt-0.5 block">
                  {new Date(successReport.submittedAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">GPS Coordinates</span>
                <span className="font-mono font-bold text-slate-800 text-xs mt-0.5 block">
                  {successReport.latitude.toFixed(6)}°N, {successReport.longitude.toFixed(6)}°E
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Location / Area</span>
                <span className="font-medium text-slate-800 text-xs mt-0.5 block">{successReport.locationName}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">User Observation</span>
              <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 mt-1 leading-relaxed">
                {successReport.description}
              </p>
            </div>

            {/* Media Upload Verification */}
            {(successReport.photoUrls?.length > 0 || successReport.videoUrl) && (
              <div className="pt-2 border-t border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                  Stored Media Assets (Cloudinary)
                </span>
                <div className="flex flex-wrap gap-2">
                  {successReport.photoUrls?.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative block w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-900"
                    >
                      <img src={url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                    </a>
                  ))}
                  {successReport.videoUrl && (
                    <a
                      href={successReport.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-bold text-blue-600 hover:bg-slate-50"
                    >
                      <Video className="w-4 h-4" />
                      <span>View Uploaded Video</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleResetForm}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-extrabold rounded-lg shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Submit Another Report</span>
            </button>
          </div>
        </div>
      ) : (
        /* INCIDENT REPORTING FORM */
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Banner */}
          {formError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{formError}</div>
              <button
                type="button"
                onClick={() => setFormError(null)}
                className="text-rose-400 hover:text-rose-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Section 1: Incident Type */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-3">
            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
                1. Select Incident Type <span className="text-rose-600">*</span>
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Choose the primary hazard or geomorphological failure observed.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {INCIDENT_TYPES.map((item) => {
                const isSelected = incidentType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setIncidentType(item.type)}
                    className={`p-3 text-left rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                    }`}
                  >
                    <div className="text-xs font-extrabold">{item.label}</div>
                    <div
                      className={`text-[10px] mt-0.5 leading-tight line-clamp-2 ${
                        isSelected ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {item.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Location & Interactive Pinning */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
                  2. Incident Location <span className="text-rose-600">*</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Capture your current GPS position or click/drag the pin on the map to specify the exact point.
                </p>
              </div>

              {/* Geolocation Button */}
              <button
                type="button"
                onClick={handleCaptureCurrentLocation}
                disabled={geoStatus === 'locating'}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer self-start sm:self-auto shrink-0"
              >
                <Crosshair className={`w-3.5 h-3.5 ${geoStatus === 'locating' ? 'animate-spin' : ''}`} />
                <span>{geoStatus === 'locating' ? 'Detecting GPS...' : 'Use Current Location'}</span>
              </button>
            </div>

            {/* Geolocation Feedback Message */}
            {geoStatus === 'denied' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Location Permission Denied:</strong> {geoErrorMessage} Tap anywhere on the map below to place the pin manually.
                </div>
              </div>
            )}
            {geoStatus === 'error' && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Location Error:</strong> {geoErrorMessage}
                </div>
              </div>
            )}

            {/* Coordinates & Location Label Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Latitude (°N) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={latitude !== null ? latitude : ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setLatitude(isNaN(val) ? null : val);
                    setGeoStatus('manual');
                  }}
                  placeholder="e.g. 27.0980"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Longitude (°E) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={longitude !== null ? longitude : ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setLongitude(isNaN(val) ? null : val);
                    setGeoStatus('manual');
                  }}
                  placeholder="e.g. 93.6320"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Location / Route / Landmark
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. NH-415 near Naharlagun"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* Interactive Mini-Map */}
            <div className="relative rounded-lg overflow-hidden border border-slate-300 h-64 bg-slate-100">
              <div ref={mapContainerRef} className="w-full h-full" />
              <div className="absolute top-2 left-2 z-1000 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded text-[10px] font-bold text-slate-700 border border-slate-200 shadow-2xs">
                Tap map to place/adjust pin
              </div>
            </div>
          </div>

          {/* Section 3 & 4: Photo & Video Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Photo Capture & Upload */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-3">
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
                  3. Incident Photo Evidence
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Take or upload a clear photo of the landslide/crack (max 20MB).
                </p>
              </div>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoSelect}
                className="hidden"
                id="photo-upload-input"
              />

              {photoPreview ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-300 bg-slate-900 h-44 group">
                  <img src={photoPreview} alt="Incident preview" className="w-full h-full object-contain" />
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="px-2 py-1 bg-slate-900/80 hover:bg-slate-900 text-white text-[10px] font-bold rounded cursor-pointer"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="p-1 bg-rose-600 text-white rounded hover:bg-rose-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full h-36 border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-slate-700 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Camera className="w-6 h-6 text-slate-400" />
                  <div className="text-center">
                    <span className="text-xs font-bold block">Take Photo / Upload Image</span>
                    <span className="text-[10px] text-slate-400">JPG, PNG, WEBP</span>
                  </div>
                </button>
              )}
            </div>

            {/* Video Capture & Upload */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-3">
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
                  4. Incident Video Evidence
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Record or upload a short clip of slope or road condition (max 35MB).
                </p>
              </div>

              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                capture="environment"
                onChange={handleVideoSelect}
                className="hidden"
                id="video-upload-input"
              />

              {videoPreview ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-300 bg-slate-900 h-44">
                  <video src={videoPreview} controls className="w-full h-full object-contain" />
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      className="px-2 py-1 bg-slate-900/80 hover:bg-slate-900 text-white text-[10px] font-bold rounded cursor-pointer"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveVideo}
                      className="p-1 bg-rose-600 text-white rounded hover:bg-rose-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="w-full h-36 border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-slate-700 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Video className="w-6 h-6 text-slate-400" />
                  <div className="text-center">
                    <span className="text-xs font-bold block">Record Video / Upload Clip</span>
                    <span className="text-[10px] text-slate-400">MP4, WEBM, MOV</span>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Section 5 & 6: Description & Automatic Date */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
                5. Incident Description & Field Notes <span className="text-rose-600">*</span>
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Describe the extent of the failure, affected road stretches, or immediate dangers.
              </p>
            </div>

            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Major debris blockage spanning 30 meters on the uphill lane. Active soil sliding observed during heavy rainfall."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 leading-relaxed"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Automatic Submission Timestamp: <strong>{formattedDate}</strong></span>
              </div>
              <span className="font-mono text-slate-400">Target: MongoDB Atlas + Cloudinary</span>
            </div>
          </div>

          {/* Section 7: Submit Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Report will be cataloged with verified GPS coordinates and immutable timestamp.</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isOffline}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-extrabold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Uploading Media & Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Incident Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
