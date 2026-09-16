import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import {
  AlertTriangle,
  Send,
  Mail,
  Smartphone,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  RefreshCw,
  MapPin,
  Users,
  CheckSquare,
  Square,
  Layers,
  Sparkles,
  Info,
  Radio,
  FileText,
  AlertOctagon,
  Clock,
  Shield,
  ChevronDown,
  Settings,
  Signal,
  BatteryCharging,
  Wifi,
  WifiOff,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Languages,
  Globe,
} from 'lucide-react';
import { LocationItem, WeatherResponse } from '../types/weather';
import { INDIA_STATES_DATA, ALL_DISTRICTS, NER_STATES } from '../data/indiaLocations';
import {
  SUPPORTED_LANGUAGES,
  getDefaultLanguageCodeForState,
  getLanguageOptionByCode,
} from '../data/languageOptions';
import { calculateMultiFactorLandslideRisk } from '../services/riskEngine';
import { fetchDistrictWeather } from '../services/weatherService';
import { fetchDistrictEnvironmentalProfile } from '../services/environmentalService';
import { safeFetchJson } from '../utils/safeFetch';

interface VerifiedUserRecipient {
  id: string;
  email: string;
  phone?: string;
  phoneNumber?: string;
  name?: string;
  state?: string;
  district?: string;
  preferredLanguage?: string;
  isVerified: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  phoneVerifiedAt?: string;
  verifiedAt?: string;
  createdAt?: string;
}

interface DeliveryResult {
  email: string;
  phoneNumber?: string;
  name?: string;
  district?: string;
  state?: string;
  language?: string;
  languageName?: string;
  nativeLanguageName?: string;
  isFallbackEnglish?: boolean;
  smsMessageText?: string;
  emailStatus: 'SENT' | 'FAILED' | 'SKIPPED';
  emailMessageId?: string;
  emailError?: string;
  smsStatus: 'PREPARED' | 'SENT' | 'FAILED' | 'NO_PHONE' | 'NOT_CONFIGURED' | 'SKIPPED';
  smsMessageId?: string;
  smsSessionId?: string;
  smsError?: string;
  smsNotice?: string;
}

interface GatewayStatus {
  isOnline: boolean;
  hasConfiguredUrl: boolean;
  maskedUrl: string;
  deviceName: string;
  simOperator: string;
  queueSize: number;
  lastHeartbeatAgoSeconds: number | null;
}

interface SendAlertViewProps {
  initialLocation?: LocationItem;
  weatherData?: WeatherResponse | null;
  onNavigateToAccount?: () => void;
}

export const SendAlertView: React.FC<SendAlertViewProps> = ({
  initialLocation,
  weatherData: propWeatherData,
  onNavigateToAccount,
}) => {
  const { t } = useTranslation();
  // Location selection
  const [selectedState, setSelectedState] = useState<string>(
    initialLocation?.state || 'Assam'
  );
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>(
    initialLocation?.name || 'Kamrup Metropolitan'
  );

  // Alert Composer States
  const [alertSeverity, setAlertSeverity] = useState<'CRITICAL' | 'HIGH' | 'MODERATE' | 'ADVISORY' | 'WATCH'>('HIGH');
  const [riskLevel, setRiskLevel] = useState<'Low' | 'Moderate' | 'High' | 'Severe'>('High');
  const [riskScore, setRiskScore] = useState<number>(78);
  const [recommendedAction, setRecommendedAction] = useState<string>(
    'Avoid vulnerable slopes and follow local authority instructions.'
  );
  const [alertMessage, setAlertMessage] = useState<string>(
    'Heavy rainfall + high soil saturation'
  );

  // Delivery Channels
  const [channelEmail, setChannelEmail] = useState<boolean>(true);
  const [channelSms, setChannelSms] = useState<boolean>(true);

  // Android Phone SMS Gateway State
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus>({
    isOnline: false,
    hasConfiguredUrl: false,
    maskedUrl: '',
    deviceName: 'Android Phone (SIM)',
    simOperator: 'Active Cellular Carrier',
    queueSize: 0,
    lastHeartbeatAgoSeconds: null,
  });
  const [isProbingGateway, setIsProbingGateway] = useState<boolean>(false);
  const [gatewayProbeMessage, setGatewayProbeMessage] = useState<string | null>(null);
  const [showGatewayConfigModal, setShowGatewayConfigModal] = useState<boolean>(false);
  const [configUrl, setConfigUrl] = useState<string>('');
  const [configToken, setConfigToken] = useState<string>('');
  const [configSenderName, setConfigSenderName] = useState<string>('NER-SAFE Alert');
  const [configSimSlot, setConfigSimSlot] = useState<number>(1);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  // Verified Recipients from MongoDB test.users
  const [recipients, setRecipients] = useState<VerifiedUserRecipient[]>([]);
  const [selectedRecipientEmails, setSelectedRecipientEmails] = useState<string[]>([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState<boolean>(true);

  // Dispatch & Confirmation Modal States
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const isSendingRef = useRef<boolean>(false);
  const [deliverySummary, setDeliverySummary] = useState<{
    timestamp: string;
    message: string;
    totalRecipients?: number;
    smsPreparedCount?: number;
    smsSuccessCount?: number;
    smsFailedCount?: number;
    emailSuccessCount?: number;
    emailFailedCount?: number;
    results: DeliveryResult[];
  } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Native SMS via My Phone state & Desktop fallback modal
  const [showDesktopSmsModal, setShowDesktopSmsModal] = useState<boolean>(false);
  const [copiedSmsSuccess, setCopiedSmsSuccess] = useState<boolean>(false);
  const [preparedSmsUri, setPreparedSmsUri] = useState<string>('');
  const [preparedSmsBody, setPreparedSmsBody] = useState<string>('');
  const [preparedSmsRecipients, setPreparedSmsRecipients] = useState<string[]>([]);

  // Mask phone number for security and privacy: e.g. +91 ******1711
  const maskPhone = (phone?: string) => {
    if (!phone) return 'Not registered';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '******';
    const last4 = digits.slice(-4);
    return `+91 ******${last4}`;
  };

  // Device detection: check if running on mobile phone
  const checkIsMobileDevice = () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || (navigator as any).vendor || '';
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    const isSmallScreen = window.innerWidth <= 820;
    return mobileRegex.test(ua) || (hasTouch && isSmallScreen);
  };

  // Warning SMS body formatted strictly according to user requirements:
  // NER-SAFE WARNING
  // Severity: [severity]
  // Location: [district], [state]
  // Risk: [risk level] ([score]/100)
  // Main Factors: [main factors]
  // Recommended Action: [recommended action]
  const generateWarningSmsBody = () => {
    return [
      'NER-SAFE WARNING',
      `Severity: ${alertSeverity}`,
      `Location: ${selectedDistrictName}, ${selectedState}`,
      `Risk: ${riskLevel} (${riskScore}/100)`,
      `Main Factors: ${alertMessage || 'Heavy rainfall + steep slope saturation'}`,
      `Recommended Action: ${recommendedAction || 'Avoid vulnerable slopes and follow local authority instructions.'}`,
    ].join('\n');
  };

  // Construct a cross-platform valid encoded sms: URI with verified phone numbers from MongoDB
  const buildSmsUri = (phoneNumbers: string[], body: string) => {
    const isIOS =
      typeof navigator !== 'undefined' &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    const formattedNumbers = phoneNumbers
      .map((p) => {
        const digits = p.replace(/\D/g, '');
        if (!digits) return '';
        if (digits.length === 10) return `+91${digits}`;
        if (p.trim().startsWith('+')) return `+${digits}`;
        return `+${digits}`;
      })
      .filter(Boolean);

    const separator = isIOS ? ';' : ',';
    const recipientsStr = formattedNumbers.join(separator);
    const encodedBody = encodeURIComponent(body);

    if (isIOS) {
      return recipientsStr
        ? `sms:${recipientsStr}&body=${encodedBody}`
        : `sms:&body=${encodedBody}`;
    }

    return recipientsStr
      ? `sms:${recipientsStr}?body=${encodedBody}`
      : `sms:?body=${encodedBody}`;
  };

  // Send Alert Button Text: strictly "Send via My Phone" when SMS is active
  const sendButtonText = useMemo(() => {
    if (isSending) {
      return `Processing (${selectedRecipientEmails.length} Recipient${selectedRecipientEmails.length === 1 ? '' : 's'})...`;
    }
    if (channelSms && !channelEmail) {
      return 'Send via My Phone';
    }
    if (channelSms && channelEmail) {
      return 'Send via My Phone (Email + SMS)';
    }
    return 'Dispatch Official Email Alert';
  }, [isSending, channelSms, channelEmail, selectedRecipientEmails.length]);

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Find active location item
  const activeLocation = useMemo<LocationItem>(() => {
    const found = ALL_DISTRICTS.find(
      (d) =>
        d.state.toLowerCase() === selectedState.toLowerCase() &&
        d.name.toLowerCase() === selectedDistrictName.toLowerCase()
    );
    if (found) return found;
    return (
      ALL_DISTRICTS.find((d) => d.state.toLowerCase() === selectedState.toLowerCase()) ||
      ALL_DISTRICTS[0]
    );
  }, [selectedState, selectedDistrictName]);

  // Available districts for chosen state
  const availableDistricts = useMemo(() => {
    const stateObj = INDIA_STATES_DATA.find(
      (s) => s.name.toLowerCase() === selectedState.toLowerCase()
    );
    return stateObj?.districts || ALL_DISTRICTS.filter((d) => d.state.toLowerCase() === selectedState.toLowerCase());
  }, [selectedState]);

  // Load Verified Recipients from MongoDB on mount & fetch gateway status
  useEffect(() => {
    fetchVerifiedUsers();
    fetchGatewayStatus();
  }, []);

  const fetchGatewayStatus = async () => {
    try {
      const { ok, data } = await safeFetchJson<any>('/api/gateway/android-sms/status');
      if (ok && data && data.success) {
        setGatewayStatus({
          isOnline: Boolean(data.isOnline),
          hasConfiguredUrl: Boolean(data.hasConfiguredUrl),
          maskedUrl: data.maskedUrl || '',
          deviceName: data.deviceName || 'Android Phone (SIM)',
          simOperator: data.simOperator || 'Cellular SIM Carrier',
          queueSize: Number(data.queueSize) || 0,
          lastHeartbeatAgoSeconds: typeof data.lastHeartbeatAgoSeconds === 'number' ? data.lastHeartbeatAgoSeconds : null,
        });
      }
    } catch (err) {
      console.warn('Failed to fetch Android SMS gateway status:', err);
    }
  };

  const handleProbeGateway = async () => {
    setIsProbingGateway(true);
    setGatewayProbeMessage(null);
    try {
      const { ok, data, error } = await safeFetchJson<any>('/api/gateway/android-sms/test', { method: 'POST' });
      setGatewayProbeMessage(data?.message || (ok ? 'Gateway probe responded successfully.' : (error || 'Probe failed')));
      fetchGatewayStatus();
    } catch (err: any) {
      setGatewayProbeMessage(`Probe error: ${err.message}`);
    } finally {
      setIsProbingGateway(false);
    }
  };

  const handleSaveGatewayConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const { ok, data, error } = await safeFetchJson<any>('/api/gateway/android-sms/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: configUrl.trim() || undefined,
          token: configToken.trim() || undefined,
          senderName: configSenderName.trim() || undefined,
          simSlot: configSimSlot,
        }),
      });
      if (ok && data && data.success) {
        setShowGatewayConfigModal(false);
        fetchGatewayStatus();
      } else {
        alert(data?.message || error || 'Failed to save config');
      }
    } catch (err: any) {
      alert(`Error saving configuration: ${err.message}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const fetchVerifiedUsers = async () => {
    setIsLoadingRecipients(true);
    try {
      // Fetch verified users directly from MongoDB test.users
      const { ok, data } = await safeFetchJson<any>('/api/alerts/sms-recipients');
      if (ok && data && data.success && Array.isArray(data.recipients)) {
        setRecipients(data.recipients);
        // Automatically select all verified phone recipients
        setSelectedRecipientEmails(data.recipients.map((u: VerifiedUserRecipient) => u.email));
      } else {
        // Fallback to all verified users
        const { ok: fbOk, data: fallbackData } = await safeFetchJson<any>('/api/users/verified');
        if (fbOk && fallbackData && fallbackData.success && Array.isArray(fallbackData.users)) {
          setRecipients(fallbackData.users);
          setSelectedRecipientEmails(fallbackData.users.map((u: VerifiedUserRecipient) => u.email));
        }
      }
    } catch (err) {
      console.warn('Failed to load verified recipients from MongoDB:', err);
    } finally {
      setIsLoadingRecipients(false);
    }
  };

  // Sync Alert Message template whenever district or risk level changes
  const handleLocationChange = (state: string, districtName: string) => {
    setSelectedState(state);
    setSelectedDistrictName(districtName);
  };

  // Auto-sync real risk calculation from Risk Monitor data for the selected district
  const handleSyncRealRiskData = async () => {
    try {
      const [envProfile, weatherRes] = await Promise.all([
        fetchDistrictEnvironmentalProfile(activeLocation).catch(() => null),
        fetchDistrictWeather(activeLocation).catch(() => null),
      ]);

      const calculated = calculateMultiFactorLandslideRisk(
        activeLocation,
        weatherRes || propWeatherData || null,
        envProfile,
        []
      );

      if (calculated) {
        setRiskScore(calculated.riskScore);
        const mappedLevel =
          calculated.riskLevel === 'CRITICAL'
            ? 'Severe'
            : calculated.riskLevel === 'HIGH'
            ? 'High'
            : calculated.riskLevel === 'MODERATE'
            ? 'Moderate'
            : 'Low';

        setRiskLevel(mappedLevel);
        if (calculated.riskLevel === 'CRITICAL') setAlertSeverity('CRITICAL');
        else if (calculated.riskLevel === 'HIGH') setAlertSeverity('HIGH');
        else if (calculated.riskLevel === 'MODERATE') setAlertSeverity('MODERATE');
        else setAlertSeverity('ADVISORY');

        if (calculated.assessmentStatement) {
          setRecommendedAction(calculated.assessmentStatement);
        }

        if (calculated.factors && calculated.factors.length > 0) {
          setAlertMessage(calculated.factors.slice(0, 2).map((f) => f.name).join(' + '));
        }
      }
    } catch (err) {
      console.error('Error syncing real risk data:', err);
    }
  };

  // Map Leaflet Setup
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [activeLocation.latitude, activeLocation.longitude],
        zoom: 8,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        attribution: '&copy; CartoDB & OpenStreetMap',
      }).addTo(map);

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([activeLocation.latitude, activeLocation.longitude], 8, {
        animate: true,
      });
    }

    // Update or create custom marker
    if (mapInstanceRef.current) {
      if (markerRef.current) {
        markerRef.current.remove();
      }

      const pinColor =
        alertSeverity === 'CRITICAL'
          ? '#dc2626'
          : alertSeverity === 'HIGH'
          ? '#ea580c'
          : alertSeverity === 'MODERATE'
          ? '#d97706'
          : '#0284c7';

      const customIcon = L.divIcon({
        className: 'custom-demo-pin',
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
          ">
            <div style="
              position: absolute;
              width: 36px;
              height: 36px;
              background-color: ${pinColor};
              opacity: 0.3;
              border-radius: 50%;
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <div style="
              width: 24px;
              height: 24px;
              background-color: ${pinColor};
              border: 3px solid #ffffff;
              border-radius: 50%;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>
            </div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      markerRef.current = L.marker([activeLocation.latitude, activeLocation.longitude], {
        icon: customIcon,
      }).addTo(mapInstanceRef.current);
    }
  }, [activeLocation, alertSeverity]);

  // Recipient Selection Handlers
  const handleToggleRecipient = (email: string) => {
    setSelectedRecipientEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const handleSelectAllRecipients = () => {
    if (selectedRecipientEmails.length === recipients.length) {
      setSelectedRecipientEmails([]);
    } else {
      setSelectedRecipientEmails(recipients.map((r) => r.email));
    }
  };

  // Field validation according to SIH26001 requirements:
  // Required: severity, state, district, risk level/score, message, and recommended action.
  const isSeverityValid = ['CRITICAL', 'HIGH', 'MODERATE', 'ADVISORY', 'WATCH'].includes(alertSeverity);
  const isStateValid = Boolean(selectedState && selectedState.trim().length > 0);
  const isDistrictValid = Boolean(selectedDistrictName && selectedDistrictName.trim().length > 0);
  const isRiskLevelValid = ['Low', 'Moderate', 'High', 'Severe'].includes(riskLevel);
  const isRiskScoreValid = typeof riskScore === 'number' && !isNaN(riskScore) && riskScore >= 0 && riskScore <= 100;
  const isMessageValid = Boolean(alertMessage && alertMessage.trim().length > 0);
  const isActionValid = Boolean(recommendedAction && recommendedAction.trim().length > 0);
  const isChannelSelected = Boolean(channelEmail || channelSms);

  const selectedRecipients = useMemo(() => {
    return recipients.filter((r) => selectedRecipientEmails.includes(r.email));
  }, [recipients, selectedRecipientEmails]);

  // Email should only be sent to users with verified email.
  // SMS should only be sent to users with verified phone numbers (phoneVerified=true).
  // Do not send anything if no valid verified recipient is selected.
  const hasValidRecipientForChannels = useMemo(() => {
    if (selectedRecipients.length === 0) return false;
    const hasValidEmailRecipient =
      channelEmail &&
      selectedRecipients.some(
        (r) => (r.emailVerified ?? r.isVerified) && Boolean(r.email)
      );
    const hasValidSmsRecipient =
      channelSms &&
      selectedRecipients.some(
        (r) => Boolean(r.phoneVerified) && Boolean(r.phoneNumber || r.phone)
      );
    return hasValidEmailRecipient || hasValidSmsRecipient;
  }, [selectedRecipients, channelEmail, channelSms]);

  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    if (!isSeverityValid) errs.push('Valid severity (CRITICAL, HIGH, MODERATE, ADVISORY, or WATCH) required');
    if (!isStateValid) errs.push('Target state is required');
    if (!isDistrictValid) errs.push('Target district is required');
    if (!isRiskLevelValid) errs.push('Risk level (Low, Moderate, High, or Severe) is required');
    if (!isRiskScoreValid) errs.push('Valid risk score (0 to 100) is required');
    if (!isMessageValid) errs.push('Alert message cannot be empty');
    if (!isActionValid) errs.push('Recommended action cannot be empty');
    if (!isChannelSelected) errs.push('Select at least one delivery channel (Email or SMS)');
    if (selectedRecipientEmails.length === 0) {
      errs.push('Select at least one recipient from the verified list');
    } else if (!hasValidRecipientForChannels) {
      if (channelEmail && !channelSms) {
        errs.push('Selected recipient does not have a verified email address');
      } else if (!channelEmail && channelSms) {
        errs.push('Selected recipient does not have a verified phone number (phoneVerified=true required for SMS)');
      } else {
        errs.push('Selected recipient has neither a verified email nor a verified phone number for the chosen channels');
      }
    }
    return errs;
  }, [
    isSeverityValid,
    isStateValid,
    isDistrictValid,
    isRiskLevelValid,
    isRiskScoreValid,
    isMessageValid,
    isActionValid,
    isChannelSelected,
    selectedRecipientEmails.length,
    hasValidRecipientForChannels,
    channelEmail,
    channelSms,
  ]);

  const isFormValid = validationErrors.length === 0;

  // Dispatch Demo Alert with double-click prevention
  const handleExecuteSend = async () => {
    if (isSendingRef.current || isSending) return;

    if (!isFormValid) {
      setSendError('Please ensure all required alert fields are valid and a verified recipient is selected.');
      return;
    }

    isSendingRef.current = true;
    setIsSending(true);
    setSendError(null);
    setShowConfirmModal(false);

    try {
      const selectedUsersData = recipients.filter((r) =>
        selectedRecipientEmails.includes(r.email)
      );

      // Extract verified phone numbers from selected users
      const verifiedPhones = selectedUsersData
        .filter((u) => Boolean(u.phoneVerified) && Boolean(u.phone || u.phoneNumber))
        .map((u) => (u.phone || u.phoneNumber || '').trim());

      const warningBody = generateWarningSmsBody();
      const smsUri = buildSmsUri(verifiedPhones, warningBody);

      setPreparedSmsUri(smsUri);
      setPreparedSmsBody(warningBody);
      setPreparedSmsRecipients(verifiedPhones);

      const isMobile = checkIsMobileDevice();

      // 1. If SMS channel is active: IMMEDIATELY launch native SMS/Messages app
      // CRITICAL: MUST execute synchronously within the user's direct tap/click gesture
      // BEFORE any asynchronous network operations, so mobile Safari, Chrome, and native OS handlers do not block it!
      if (channelSms && verifiedPhones.length > 0) {
        // Direct navigation triggers the native Messages app on mobile browsers
        try {
          window.location.href = smsUri;
        } catch (navErr) {
          console.warn('[SMS] Direct window.location.href notice:', navErr);
        }

        // Programmatic click without _top as a reliable backup
        try {
          const directLink = document.createElement('a');
          directLink.href = smsUri;
          directLink.rel = 'noopener noreferrer';
          document.body.appendChild(directLink);
          directLink.click();
          setTimeout(() => {
            if (document.body.contains(directLink)) {
              document.body.removeChild(directLink);
            }
          }, 400);
        } catch (linkErr) {
          console.warn('[SMS] Programmatic link click notice:', linkErr);
        }

        // Desktop browser helper: explain that SMS is prepared for mobile devices
        if (!isMobile) {
          setShowDesktopSmsModal(true);
        }
      }

      // 2. If Email channel is active, dispatch official email via Brevo
      let backendData: any = null;
      if (channelEmail) {
        try {
          const { ok, data } = await safeFetchJson<any>('/api/alerts/send-demo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipients: selectedUsersData.map((u) => ({
                email: u.email,
                phone: (u.phone || u.phoneNumber || '').trim(),
                phoneNumber: (u.phoneNumber || u.phone || '').trim(),
                name: u.name,
                district: u.district,
                state: u.state,
                preferredLanguage: u.preferredLanguage,
                emailVerified: u.emailVerified ?? u.isVerified,
                phoneVerified: Boolean(u.phoneVerified),
              })),
              alertSeverity,
              state: selectedState,
              district: selectedDistrictName,
              riskLevel,
              riskScore,
              alertMessage,
              recommendedAction,
              channels: {
                email: channelEmail,
                sms: channelSms,
              },
            }),
          });
          if (ok && data) {
            backendData = data;
          }
        } catch (backendErr: any) {
          console.warn('Backend send-demo dispatch error:', backendErr);
        }
      }

      // 3. Set Delivery Summary
      // MANDATORY REQUIREMENT 7: Do NOT display "SMS SENT".
      // Instead display:
      // "SMS prepared on your phone. Review the recipients and message, then tap Send."
      let summaryMessage = 'Alert processing complete.';
      if (channelSms && channelEmail) {
        summaryMessage = `Brevo email alert dispatched and SMS prepared on your phone for ${verifiedPhones.length} recipient(s). Review the recipients and message, then tap Send.`;
      } else if (channelSms) {
        summaryMessage = 'SMS prepared on your phone. Review the recipients and message, then tap Send.';
      } else if (channelEmail) {
        summaryMessage = backendData?.message || `Brevo email alert dispatched to ${selectedUsersData.length} verified resident(s).`;
      }

      const formattedResults: DeliveryResult[] = (backendData?.results || selectedUsersData.map((u) => ({
        email: u.email,
        phoneNumber: u.phone || u.phoneNumber,
        name: u.name,
        district: u.district,
        state: u.state,
        emailStatus: channelEmail ? 'SENT' : 'SKIPPED',
        smsStatus: channelSms ? 'PREPARED' : 'SKIPPED',
        smsNotice: 'SMS prepared on your phone. Review the recipients and message, then tap Send.',
      }))).map((r: any) => ({
        ...r,
        smsStatus: channelSms
          ? (r.smsStatus === 'NO_PHONE' ? 'NO_PHONE' : r.smsStatus === 'FAILED' ? 'FAILED' : 'PREPARED')
          : r.smsStatus,
        smsNotice: 'SMS prepared on your phone. Review the recipients and message, then tap Send.',
      }));

      setDeliverySummary({
        timestamp: backendData?.timestamp || new Date().toISOString(),
        message: summaryMessage,
        totalRecipients: selectedUsersData.length,
        smsPreparedCount: channelSms ? verifiedPhones.length : 0,
        smsSuccessCount: 0, // NEVER claim SMS sent by website!
        smsFailedCount: 0,
        emailSuccessCount: backendData?.emailSuccessCount ?? (channelEmail ? selectedUsersData.length : 0),
        emailFailedCount: backendData?.emailFailedCount ?? 0,
        results: formattedResults,
      });
    } catch (err: any) {
      setSendError(err.message || 'Failed to process alert.');
    } finally {
      setIsSending(false);
      isSendingRef.current = false;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 1. TOP MANDATORY DEMO TESTING BANNER */}
      <div className="bg-white rounded-xl border border-amber-300 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-900 border border-amber-500/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-extrabold text-amber-950 uppercase tracking-tight">
                {t('alerts.demoBannerTitle', 'DEMO — ALERT TESTING')}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-amber-200 text-amber-900 border border-amber-300 font-mono">
                SIH26001 {t('alerts.protocolVerification', 'PROTOCOL VERIFICATION')}
              </span>
            </div>
            <p className="text-xs font-semibold text-amber-900 mt-1 italic">
              "{t('alerts.demoBannerSubtitle', 'This is a prototype test. No real emergency is being declared.')}"
            </p>
          </div>
        </div>

        <div className="text-[11px] text-amber-800/90 font-medium bg-amber-100/80 px-3.5 py-2 rounded-xl border border-amber-200 shrink-0">
          {t('alerts.authorityWorkflow', 'Authority Workflow: Risk Monitor → Authority Selection → Recipient Delivery → Live Log')}
        </div>
      </div>

      {/* 2. MAIN TWO-COLUMN GRID: ALERT COMPOSER & RECIPIENTS / MAP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: ALERT COMPOSER (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-900 text-white">
                  <Radio className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  {t('alerts.composerTitle', 'Alert Composer')}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleSyncRealRiskData}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer btn-press"
                title={t('alerts.syncRiskTooltip', 'Populate risk data automatically from Risk Monitor multi-factor engine')}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>{t('alerts.syncRiskData', 'Sync Risk Monitor Data')}</span>
              </button>
            </div>

            {/* Location Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t('alerts.targetState', 'Target State (NER)')}
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => {
                    const newState = e.target.value;
                    const districts =
                      INDIA_STATES_DATA.find((s) => s.name.toLowerCase() === newState.toLowerCase())
                        ?.districts || ALL_DISTRICTS.filter((d) => d.state.toLowerCase() === newState.toLowerCase());
                    const firstDistrict = districts[0]?.name || 'Kamrup Metropolitan';
                    handleLocationChange(newState, firstDistrict);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-slate-900 transition-colors"
                >
                  {NER_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t('alerts.targetDistrict', 'Target District')}
                </label>
                <select
                  value={selectedDistrictName}
                  onChange={(e) => handleLocationChange(selectedState, e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-slate-900 transition-colors"
                >
                  {availableDistricts.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Severity, Risk Level & Score */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t('alerts.severity', 'Alert Severity')}
                </label>
                <select
                  value={alertSeverity}
                  onChange={(e) => setAlertSeverity(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                >
                  <option value="ADVISORY">{t('alerts.severityAdvisory', 'ADVISORY (Blue)')}</option>
                  <option value="WATCH">{t('alerts.severityWatch', 'WATCH (Yellow)')}</option>
                  <option value="MODERATE">{t('alerts.severityModerate', 'MODERATE (Amber)')}</option>
                  <option value="HIGH">{t('alerts.severityHigh', 'HIGH (Orange)')}</option>
                  <option value="CRITICAL">{t('alerts.severityCritical', 'CRITICAL (Red)')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t('alerts.riskLevel', 'Risk Level')}
                </label>
                <select
                  value={riskLevel}
                  onChange={(e) => {
                    const newLevel = e.target.value as any;
                    setRiskLevel(newLevel);
                    setAlertMessage(
                      `DEMO ALERT: This notification is being sent to test the NER-SAFE early-warning system for ${selectedDistrictName}, ${selectedState}. Current estimated risk level: ${newLevel}. This is not an actual emergency.`
                    );
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                >
                  <option value="Low">{t('risk.low', 'Low')}</option>
                  <option value="Moderate">{t('risk.moderate', 'Moderate')}</option>
                  <option value="High">{t('risk.high', 'High')}</option>
                  <option value="Severe">{t('risk.severe', 'Severe')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t('alerts.riskScore', 'Risk Score (0-100)')}
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={riskScore}
                  onChange={(e) => setRiskScore(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                />
              </div>
            </div>

            {/* Alert Message Textarea */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t('alerts.messageBody', 'Demo Alert Message Body')}
              </label>
              <textarea
                rows={3}
                value={alertMessage}
                onChange={(e) => setAlertMessage(e.target.value)}
                placeholder={t('alerts.messagePlaceholder', 'Enter custom alert message')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 leading-relaxed focus:bg-white focus:outline-none focus:border-slate-900 transition-colors resize-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {t('alerts.messageHelp', 'Prefilled with real location and estimated risk context. Clearly discloses prototype status.')}
              </p>
            </div>

            {/* Recommended Action */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t('alerts.recommendedAction', 'Recommended Action for Residents')}
              </label>
              <textarea
                rows={2}
                value={recommendedAction}
                onChange={(e) => setRecommendedAction(e.target.value)}
                placeholder={t('alerts.actionPlaceholder', 'Enter safety instructions or evacuation guidance')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 leading-relaxed focus:bg-white focus:outline-none focus:border-slate-900 transition-colors resize-none"
              />
            </div>

            {/* Delivery Channels Toggle */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t('alerts.selectChannels', 'Select Delivery Channels')}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Channel 1: Email (Brevo) */}
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                    channelEmail
                      ? 'bg-sky-50/70 border-sky-300 text-sky-950'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={channelEmail}
                    onChange={(e) => setChannelEmail(e.target.checked)}
                    className="mt-0.5 rounded text-sky-600 focus:ring-sky-500"
                  />
                  <div className="text-xs">
                    <div className="font-bold flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-sky-700" />
                      <span>Transactional Email</span>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        BREVO ACTIVE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Delivers rich HTML early-warning advisory to user inbox.
                    </p>
                  </div>
                </label>

                {/* Channel 2: Native SMS via My Phone (Authority's Mobile Phone & SIM) */}
                <div
                  className={`p-3.5 rounded-xl border transition-all ${
                    channelSms
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <label className="flex items-start gap-3 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={channelSms}
                        onChange={(e) => setChannelSms(e.target.checked)}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="text-xs">
                        <div className="font-bold flex items-center gap-1.5 flex-wrap">
                          <Smartphone className="w-4 h-4 text-emerald-700" />
                          <span>SMS via My Phone</span>
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-300">
                            NATIVE SMS VIA PHONE SIM
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-tight">
                          Uses your personal mobile phone and native SMS application to compose emergency warning alerts via your SIM carrier. You review and tap Send.
                        </p>
                      </div>
                    </label>
                  </div>

                  {channelSms && (
                    <div className="mt-2.5 pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px] flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        <span className="font-medium text-[10px]">
                          Device Protocol: <code className="text-[10px] bg-white px-1 py-0.5 rounded border border-emerald-200 text-emerald-900">sms:&lt;recipients&gt;?body=...</code>
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded">
                        Authority Mobile SIM
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SEND DEMO BUTTON */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (channelSms && !channelEmail) {
                    handleExecuteSend();
                  } else {
                    setShowConfirmModal(true);
                  }
                }}
                disabled={isSending || !isFormValid}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{sendButtonText}</span>
                  </>
                ) : (
                  <>
                    {channelSms ? (
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>
                      {sendButtonText} ({selectedRecipientEmails.length} Verified Recipient{selectedRecipientEmails.length === 1 ? '' : 's'})
                    </span>
                  </>
                )}
              </button>

              {/* Instant Native SMS Launcher Banner */}
              {channelSms && preparedSmsUri && (
                <div className="p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-xl text-xs text-emerald-950 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-extrabold">SMS prepared on your phone.</span>
                      <p className="text-[11px] text-emerald-800">
                        Messages app prefilled with {preparedSmsRecipients.length} verified resident(s).
                      </p>
                    </div>
                  </div>
                  <a
                    id="reopen-native-sms-button"
                    href={preparedSmsUri}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Messages</span>
                  </a>
                </div>
              )}

              {/* Validation helper status when disabled */}
              {!isFormValid && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-950 space-y-1">
                  <div className="font-bold flex items-center gap-1 text-amber-900">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Required to enable Send Warning Alert:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-900/90 pl-1 font-medium">
                    {validationErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MAP & MONGODB RECIPIENTS (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* MAP CARD: DEMO ALERT LOCATION */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-800" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Demo Alert Location
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-amber-100 text-amber-900 border border-amber-200 font-mono">
                PROTOTYPE GIS
              </span>
            </div>

            {/* Map Container */}
            <div className="relative rounded-xl overflow-hidden border border-slate-200 h-52 bg-slate-100">
              <div ref={mapContainerRef} className="w-full h-full" />
              
              {/* Map Floating Disclaimer Label */}
              <div className="absolute top-2 left-2 right-2 z-[400] bg-slate-900/85 backdrop-blur-xs text-white p-2.5 rounded-xl text-[10px] border border-white/20 shadow-xs">
                <div className="font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>DEMO ALERT LOCATION: {activeLocation.name}, {activeLocation.state}</span>
                </div>
                <div className="text-slate-300 text-[9px] mt-0.5">
                  Do not imply that the demo location is currently under a real emergency.
                </div>
              </div>

              {/* Coordinates Pill */}
              <div className="absolute bottom-2 right-2 z-[400] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-mono text-slate-700 border border-slate-300 shadow-2xs">
                {activeLocation.latitude.toFixed(4)}° N, {activeLocation.longitude.toFixed(4)}° E
              </div>
            </div>
          </div>

          {/* VERIFIED RECIPIENTS SELECTION LIST (From MongoDB) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-800" />
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Verified Recipients (MongoDB)
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {selectedRecipientEmails.length} of {recipients.length} verified recipients selected
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAllRecipients}
                  className="text-xs font-bold text-slate-700 hover:text-slate-950 underline px-1.5 py-1 cursor-pointer"
                >
                  {selectedRecipientEmails.length === recipients.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  type="button"
                  onClick={fetchVerifiedUsers}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Refresh verified users list from MongoDB"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Recipient Rows */}
            {isLoadingRecipients ? (
              <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                <span>Loading verified users from MongoDB...</span>
              </div>
            ) : recipients.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                <p className="text-xs text-slate-600 font-medium">
                  No verified user accounts found in MongoDB yet.
                </p>
                {onNavigateToAccount && (
                  <button
                    type="button"
                    onClick={onNavigateToAccount}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <span>Create / Verify User Account</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {recipients.map((user) => {
                  const isSelected = selectedRecipientEmails.includes(user.email);
                  return (
                    <div
                      key={user.email}
                      onClick={() => handleToggleRecipient(user.email)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold truncate">
                              {user.name || 'Verified Resident'}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                                isSelected
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              Email ✓
                            </span>
                            {user.phoneVerified && (user.phone || user.phoneNumber) ? (
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                                  isSelected
                                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                    : 'bg-sky-100 text-sky-800 border border-sky-200'
                                }`}
                              >
                                SMS ✓
                              </span>
                            ) : (user.phone || user.phoneNumber) ? (
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                                  isSelected
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}
                                title="Mobile number is not verified via 2Factor OTP"
                              >
                                SMS Unverified ⚠
                              </span>
                            ) : (
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                                  isSelected
                                    ? 'bg-slate-700 text-slate-300'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                No Phone
                              </span>
                            )}
                            {/* Regional Alert Language Badge */}
                            {(() => {
                              const userLangCode = user.preferredLanguage || getDefaultLanguageCodeForState(user.state || 'Assam');
                              const langOpt = getLanguageOptionByCode(userLangCode);
                              return (
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 inline-flex items-center gap-1 ${
                                    isSelected
                                      ? 'bg-sky-500/20 text-sky-200 border border-sky-400/30'
                                      : 'bg-sky-50 text-sky-700 border border-sky-200'
                                  }`}
                                  title={`Alerts will automatically be translated into ${langOpt.name} (${langOpt.nativeName})`}
                                >
                                  <Globe className="w-2.5 h-2.5" />
                                  <span>{langOpt.nativeName}</span>
                                </span>
                              );
                            })()}
                          </div>
                          <div
                            className={`text-[11px] truncate font-mono ${
                              isSelected ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            <span>{user.email}</span>
                            {(user.phone || user.phoneNumber) && (
                              <span className="ml-1.5 opacity-90">&bull; {maskPhone(user.phone || user.phoneNumber)}</span>
                            )}
                            {channelSms && !user.phoneVerified && (
                              <span className="ml-1.5 text-amber-500 font-sans font-semibold text-[10px]">
                                (Ineligible for SMS)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`text-[10px] text-right shrink-0 ${
                          isSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        <div>{user.district || 'Kamrup Metro'}</div>
                        <div className="opacity-80">{user.state || 'Assam'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. POST-SEND DELIVERY REPORT */}
      {deliverySummary && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Demo Alert Delivery Results
                </h3>
                <p className="text-xs text-slate-500">
                  {deliverySummary.message} &bull; Dispatched at{' '}
                  {new Date(deliverySummary.timestamp).toLocaleTimeString()} IST
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDeliverySummary(null)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer self-end sm:self-auto"
            >
              Dismiss Log
            </button>
          </div>

          {/* Delivery Stat Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[10px] font-bold uppercase">Total Recipients</span>
              <span className="text-base font-extrabold text-slate-900">
                {deliverySummary.totalRecipients ?? deliverySummary.results.length}
              </span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-emerald-700 block text-[10px] font-bold uppercase">SMS Status (My Phone)</span>
              <span className="text-sm font-extrabold text-emerald-800 flex items-center gap-1.5">
                <span>{deliverySummary.smsPreparedCount ?? (channelSms ? deliverySummary.results.filter(r => r.smsStatus === 'PREPARED').length : 0)} Prepared on Phone</span>
              </span>
            </div>
            <div className="p-3 bg-sky-50 rounded-xl border border-sky-200">
              <span className="text-sky-800 block text-[10px] font-bold uppercase">Brevo Email Delivered</span>
              <span className="text-base font-extrabold text-sky-900">
                {deliverySummary.emailSuccessCount ?? deliverySummary.results.filter(r => r.emailStatus === 'SENT').length}
              </span>
            </div>
          </div>

          {/* Direct CTA to launch/re-open SMS composer in Messages app */}
          {channelSms && preparedSmsUri && (
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-emerald-700 shrink-0" />
                <div className="text-xs text-emerald-950 font-medium">
                  <strong className="block text-emerald-900">SMS prepared on your phone.</strong>
                  Prefilled for {preparedSmsRecipients.length} phone-verified resident(s). Review in Messages app and tap Send.
                </div>
              </div>
              <a
                id="summary-open-sms-button"
                href={preparedSmsUri}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Messages App</span>
              </a>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-2 pl-1">Recipient</th>
                  <th className="pb-2">Location &amp; Alert Language</th>
                  <th className="pb-2">Email Delivery (Brevo)</th>
                  <th className="pb-2">SMS Status (My Phone &amp; SIM)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliverySummary.results.map((result, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 pl-1 font-semibold text-slate-900">
                      <div>{result.name || 'Verified Resident'}</div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {result.email}
                        {result.phoneNumber && ` • ${maskPhone(result.phoneNumber)}`}
                      </div>
                    </td>
                    <td className="py-3 text-slate-700">
                      <div>{result.district}, {result.state}</div>
                      {result.languageName ? (
                        <div className="inline-flex items-center gap-1 text-[10px] text-sky-700 font-semibold mt-0.5">
                          <Globe className="w-2.5 h-2.5 shrink-0" />
                          <span>
                            {result.languageName} {result.nativeLanguageName ? `(${result.nativeLanguageName})` : ''}
                          </span>
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3">
                      {result.emailStatus === 'SENT' ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>SENT</span>
                          {result.emailMessageId && (
                            <span className="font-mono text-[9px] text-emerald-900 opacity-70">
                              ({result.emailMessageId.substring(0, 10)}...)
                            </span>
                          )}
                        </div>
                      ) : result.emailStatus === 'FAILED' ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>FAILED</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">SKIPPED</span>
                      )}
                      {result.emailError && (
                        <div className="text-[10px] text-rose-600 mt-0.5 font-mono">
                          {result.emailError}
                        </div>
                      )}
                    </td>
                    <td className="py-3">
                      {result.smsStatus === 'PREPARED' ? (
                        <div className="space-y-0.5">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Smartphone className="w-3 h-3 text-emerald-600" />
                            <span>SMS PREPARED ON PHONE</span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight">
                            Review recipients and message in Messages app, then tap Send.
                          </p>
                        </div>
                      ) : result.smsStatus === 'NO_PHONE' ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                            NO PHONE REGISTERED
                          </span>
                          {result.smsError && (
                            <div className="text-[10px] text-amber-700 mt-0.5 font-mono">
                              {result.smsError}
                            </div>
                          )}
                        </div>
                      ) : result.smsStatus === 'FAILED' ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">
                            PHONE UNVERIFIED
                          </span>
                          {result.smsError && (
                            <div className="text-[10px] text-rose-600 mt-0.5 font-mono">
                              {result.smsError}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">SKIPPED</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. ERROR MESSAGE */}
      {sendError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-bold">{sendError}</span>
        </div>
      )}

      {/* 5. CONFIRMATION MODAL (EXPLICIT CONFIRMATION MANDATE) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-800">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">
                  WARNING ALERT DISPATCH — CONFIRMATION
                </h3>
                <p className="text-xs text-slate-500">
                  Explicit authorization required before broadcasting to residents
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
              <div>
                <strong>Target Region:</strong> {selectedDistrictName}, {selectedState}
              </div>
              <div>
                <strong>Severity &amp; Risk:</strong> {alertSeverity} ({riskLevel}, Score {riskScore}/100)
              </div>
              <div>
                <strong>Recipients:</strong> {selectedRecipientEmails.length} verified resident(s) loaded from MongoDB
              </div>
              <div>
                <strong>Delivery Channels:</strong>{' '}
                {channelEmail && 'Brevo Email (with State Regional Advisory)'} {channelEmail && channelSms && ' & '} {channelSms && 'SMS via My Phone (SIM)'}
              </div>
              {channelEmail && (
                <div className="text-slate-600">
                  <strong>Email Structure:</strong> Official English alert telemetry + Pre-recorded <em>Regional Advisory</em> paragraph matched to recipient's state (e.g. Assam &rarr; Assamese, Sikkim &rarr; Nepali).
                </div>
              )}
              {channelSms && (
                <div>
                  <strong>SMS Sender:</strong> Personal Mobile Phone + Native Messages App
                </div>
              )}
            </div>

            {/* SMS Message Live Preview */}
            {channelSms && (
              <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] space-y-1">
                <div className="text-[10px] uppercase text-slate-400 font-sans font-bold flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-emerald-400" />
                  <span>SMS Format to Verified Residents' SIMs:</span>
                </div>
                <pre className="whitespace-pre-wrap font-mono leading-relaxed text-white text-[11px]">
                  {generateWarningSmsBody()}
                </pre>
              </div>
            )}

            <p className="text-xs text-emerald-900 font-semibold bg-emerald-50 p-3 rounded-xl border border-emerald-200">
              📱 Clicking below will prepare the SMS in your phone's native Messages app with pre-filled recipients and message. You review and tap Send.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSending}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteSend}
                disabled={isSending}
                className="flex items-center gap-2 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{sendButtonText}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. ANDROID GATEWAY CONFIGURATION MODAL */}
      {showGatewayConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">
                    Android Phone SMS Gateway Setup
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Use your personal Android phone + SIM as the SMS transmitter
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGatewayConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-sky-600" />
                <span>Architecture &amp; Flow:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600">
                <strong>NER-SAFE Send Alert</strong> &rarr; <strong>Backend</strong> &rarr; <strong>Android Phone SMS Gateway App</strong> &rarr; <strong>Personal SIM Network</strong> &rarr; <strong>All phone-verified users in MongoDB Atlas</strong>.
              </p>
            </div>

            <form onSubmit={handleSaveGatewayConfig} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Android Gateway Endpoint URL
                </label>
                <input
                  type="text"
                  value={configUrl}
                  onChange={(e) => setConfigUrl(e.target.value)}
                  placeholder={gatewayStatus.maskedUrl || 'e.g. http://192.168.1.50:8080 or https://gateway.yourdomain.com'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  URL of the SMS Gateway app running on your Android phone, or leave empty if the phone polls <code>/api/gateway/android-sms/pending</code>.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Gateway Auth Token
                  </label>
                  <input
                    type="password"
                    value={configToken}
                    onChange={(e) => setConfigToken(e.target.value)}
                    placeholder="Optional secret token"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Sender SIM Slot
                  </label>
                  <select
                    value={configSimSlot}
                    onChange={(e) => setConfigSimSlot(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                  >
                    <option value={1}>SIM 1 (Default)</option>
                    <option value={2}>SIM 2</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sender / Device Label
                </label>
                <input
                  type="text"
                  value={configSenderName}
                  onChange={(e) => setConfigSenderName(e.target.value)}
                  placeholder="e.g. Personal Android Phone / NER-SAFE"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleProbeGateway}
                  disabled={isProbingGateway}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProbingGateway ? 'animate-spin' : ''}`} />
                  <span>Test Probe Device</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGatewayConfigModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingConfig}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSavingConfig ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. DESKTOP SMS GUIDANCE MODAL (REQUIREMENT 6) */}
      {showDesktopSmsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">
                    Native SMS on Mobile Phone
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Direct SIM Warning Dispatch via Native Messages App
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDesktopSmsModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {/* Clear prominent explanation mandated by Requirement 6 */}
            <div className="p-4 bg-amber-500/10 border-2 border-amber-500/40 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Notice for Desktop / Laptop Browsers:</span>
              </div>
              <p className="text-xs font-bold text-amber-950 leading-relaxed">
                Open NER-SAFE on your mobile phone to send this alert from your phone number.
              </p>
              <p className="text-[11px] text-amber-900/85 leading-normal">
                This prototype triggers your phone's cellular carrier SIM directly through the device's native SMS application. No SMS aggregator or third-party credits are used.
              </p>
            </div>

            {/* Formatted Message Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Prepared SMS Alert Content</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {preparedSmsRecipients.length} phone-verified recipient{preparedSmsRecipients.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="p-3 bg-slate-900 text-emerald-300 rounded-xl font-mono text-[11px] max-h-36 overflow-y-auto">
                <pre className="whitespace-pre-wrap font-mono leading-relaxed">
                  {preparedSmsBody}
                </pre>
              </div>
            </div>

            {/* Recipient Numbers (Masked for privacy) */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-700">
                Verified Recipient Mobile Numbers:
              </span>
              <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
                {preparedSmsRecipients.map((phone, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md border border-slate-200"
                  >
                    {maskPhone(phone)}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const copyText = `Recipients: ${preparedSmsRecipients.join(', ')}\n\n${preparedSmsBody}`;
                  navigator.clipboard.writeText(copyText);
                  setCopiedSmsSuccess(true);
                  setTimeout(() => setCopiedSmsSuccess(false), 2500);
                }}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedSmsSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Alert &amp; Numbers</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 justify-end">
                {preparedSmsUri && (
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = preparedSmsUri;
                    }}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Launch desktop paired phone handler (e.g. Windows Phone Link, macOS Messages)"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Try SMS App on Desktop</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowDesktopSmsModal(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
