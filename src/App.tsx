import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Header, AppTabType } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LocationSelector } from './components/LocationSelector';
import { MainWeatherSummary } from './components/MainWeatherSummary';
import { CurrentWeatherDetails } from './components/CurrentWeatherDetails';
import { HourlyForecast } from './components/HourlyForecast';
import { DailyForecast } from './components/DailyForecast';
import { WeatherAlerts } from './components/WeatherAlerts';
import { IndiaNerMap } from './components/IndiaNerMap';
import { GisMonitorView } from './components/GisMonitorView';
import { NerQuickOverview } from './components/NerQuickOverview';
import { ClimateTrendChart } from './components/ClimateTrendChart';
import { Footer } from './components/Footer';
import { NerHubView } from './components/NerHubView';
import { RiskMonitorView } from './components/RiskMonitorView';
import { CrossBorderWeatherView } from './components/CrossBorderWeatherView';
import { ReportIncidentView } from './components/ReportIncidentView';
import { IncidentMonitoringConsole } from './components/IncidentMonitoringConsole';
import { AboutView } from './components/AboutView';
import { LiveMonitorCommandCenter } from './components/LiveMonitorCommandCenter';
import { SendAlertView } from './components/SendAlertView';
import { UserAccountConsole } from './components/UserAccountConsole';
import { UserProfileView } from './components/UserProfileView';
import { DEFAULT_DISTRICT, ALL_DISTRICTS } from './data/indiaLocations';
import {
  fetchDistrictWeather,
  fetchNerStateSummary,
  fetchSystemStatus,
} from './services/weatherService';
import {
  LocationItem,
  WeatherResponse,
  NerStateSummary,
  SystemStatusInfo,
} from './types/weather';
import { AlertCircle, RefreshCw, Loader2, Compass, Shield, CloudSun, CloudOff } from 'lucide-react';
import { formatTime, formatSyncTime } from './utils/weatherUtils';
import { restoreSession } from './services/authService';
import { OperationalBackgroundLayer } from './components/OperationalBackgroundLayer';
import { HomeIntroScreen } from './components/HomeIntroScreen';
import { AnimatePresence } from 'motion/react';

// Operational and disaster monitoring sections that receive the subtle mountain background
const OPERATIONAL_TABS: AppTabType[] = [
  'live-monitor',
  'ner-hub',
  'risk-monitor',
  'cross-border',
  'atmospheric-gis',
  'incident-monitor',
  'report-incident',
  'send-alert',
];

export default function App() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AppTabType>('home');
  const [previousTab, setPreviousTab] = useState<AppTabType>('live-monitor');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [monitorSubView, setMonitorSubView] = useState<'incidents' | 'weather'>('incidents');
  const [selectedLocation, setSelectedLocation] = useState<LocationItem>(DEFAULT_DISTRICT);
  const [weatherData, setWeatherData] = useState<WeatherResponse | null>(null);
  const [nerSummaries, setNerSummaries] = useState<NerStateSummary[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatusInfo | null>(null);
  
  // Initialize with persisted last successful sync timestamp if available
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => {
    try {
      const saved = localStorage.getItem('ner_safe_last_successful_sync_iso');
      if (saved) {
        const d = new Date(saved);
        return isNaN(d.getTime()) ? null : d;
      }
      return null;
    } catch {
      return null;
    }
  });
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Restore authenticated session from MongoDB on app mount
  useEffect(() => {
    restoreSession().catch((err) => {
      console.warn('Initial session restore check:', err);
    });
  }, []);

  // Fetch Weather for selected district
  const loadWeatherData = useCallback(async (location: LocationItem) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await fetchDistrictWeather(location);
      setWeatherData(data);
      // Genuinely record the exact moment the live data API successfully returned
      const now = new Date();
      setLastSyncTime(now);
      try {
        localStorage.setItem('ner_safe_last_successful_sync_iso', now.toISOString());
      } catch (storageErr) {
        console.warn('Could not persist last sync time to storage:', storageErr);
      }
    } catch (err: any) {
      console.error('Failed to load weather:', err);
      setErrorMessage(err.message || 'Live weather temporarily unavailable');
      // On failure, lastSyncTime is untouched (keeps previous successful sync time)
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch NER 8-state overview & system status
  const loadAuxiliaryData = useCallback(async () => {
    try {
      const [nerData, statusData] = await Promise.all([
        fetchNerStateSummary().catch(() => []),
        fetchSystemStatus().catch(() => null),
      ]);
      setNerSummaries(nerData);
      if (statusData) setSystemStatus(statusData);
    } catch (e) {
      console.warn('Auxiliary telemetry fetch error:', e);
    }
  }, []);

  // Initial load and periodic auto-refresh
  useEffect(() => {
    loadWeatherData(selectedLocation);
    loadAuxiliaryData();

    // Auto-refresh weather every 3 minutes (180,000ms)
    const timer = setInterval(() => {
      loadWeatherData(selectedLocation);
      loadAuxiliaryData();
    }, 180000);

    return () => clearInterval(timer);
  }, [selectedLocation, loadWeatherData, loadAuxiliaryData]);

  // Handle location selection
  const handleSelectLocation = (location: LocationItem) => {
    setSelectedLocation(location);
  };

  // Handle manual refresh
  const handleRefresh = () => {
    loadWeatherData(selectedLocation);
    loadAuxiliaryData();
  };

  const handleTabChange = (tab: AppTabType) => {
    if (activeTab !== 'home') {
      setPreviousTab(activeTab);
    }
    setActiveTab(tab);
  };

  const handleEnterApp = () => {
    setActiveTab(previousTab === 'home' ? 'live-monitor' : previousTab);
  };

  const currentDisplayTab = activeTab === 'home' ? previousTab : activeTab;
  const isOperationalTab = OPERATIONAL_TABS.includes(currentDisplayTab);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col lg:flex-row font-sans selection:bg-sky-100 selection:text-sky-900 antialiased relative">
      {/* Full-Screen Home / Intro Landing Screen (first screen on initial visit or when clicking Home) */}
      <AnimatePresence>
        {activeTab === 'home' && (
          <HomeIntroScreen onEnter={handleEnterApp} />
        )}
      </AnimatePresence>

      {/* Global Subtle Himalayan Mountain Background Layer (Applied strictly to Operational & Monitoring tabs) */}
      <OperationalBackgroundLayer isVisible={isOperationalTab} />

      {/* Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onSelectMonitorSubView={(view) => setMonitorSubView(view)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Streamlined Clean Header */}
        <Header
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onRefresh={handleRefresh}
          isLoading={isLoading}
          lastUpdatedText={lastSyncTime ? formatSyncTime(lastSyncTime) : undefined}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Error Notification State */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold text-xs block leading-tight">{t('common.serviceNotice', 'Service Notice')}</span>
                <span className="text-xs text-amber-800">{errorMessage}</span>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-amber-300 rounded-md text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              {t('common.retry', 'Retry')}
            </button>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && !weatherData && (
          <div className="py-20 text-center flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 p-8 shadow-2xs my-4">
            <Loader2 className="w-7 h-7 text-blue-600 animate-spin mb-3" />
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">{t('weather.connectingFeed', 'Connecting to Meteorological Feed...')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('weather.retrievingObs', 'Retrieving observations for {{name}}', { name: selectedLocation.name })}</p>
          </div>
        )}

        {/* TAB 1: 8-State NER Hub View (Phase 2 Environmental & Land Monitor) */}
        {currentDisplayTab === 'ner-hub' && (
          <NerHubView
            selectedLocation={selectedLocation}
            onSelectLocation={handleSelectLocation}
            weatherData={weatherData}
          />
        )}

        {/* TAB: Risk Monitor View (SIH26001 Transparent Multi-Factor Landslide Risk Engine + Gemini Interpretation) */}
        {currentDisplayTab === 'risk-monitor' && (
          <RiskMonitorView
            selectedLocation={selectedLocation}
            onSelectLocation={handleSelectLocation}
            weatherData={weatherData}
          />
        )}

        {/* TAB: Cross-Border Weather & Transboundary Early Warning (Strictly 5 Bordering Countries) */}
        {currentDisplayTab === 'cross-border' && (
          <CrossBorderWeatherView />
        )}

        {/* TAB 2: Live Monitor View (National Disaster Command Center Home View) */}
        {currentDisplayTab === 'live-monitor' && (
          <LiveMonitorCommandCenter
            selectedLocation={selectedLocation}
            onSelectLocation={handleSelectLocation}
            weatherData={weatherData}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            nerSummaries={nerSummaries}
            onNavigateTab={(tab) => handleTabChange(tab as AppTabType)}
          />
        )}

        {/* TAB 3: Geographic Information System (GIS) Intelligence Module */}
        {currentDisplayTab === 'atmospheric-gis' && (
          <div className="space-y-3">
            <GisMonitorView
              selectedLocation={selectedLocation}
              onSelectLocation={handleSelectLocation}
            />
          </div>
        )}

        {/* TAB: Authority Incident Operations / Incident Monitor */}
        {currentDisplayTab === 'incident-monitor' && (
          <IncidentMonitoringConsole />
        )}

        {/* TAB 4: Report Ground & Slope Incident */}
        {currentDisplayTab === 'report-incident' && (
          <ReportIncidentView />
        )}

        {/* TAB: Send Alert Prototype Dispatch Console (SIH26001 Demo Testing) */}
        {currentDisplayTab === 'send-alert' && (
          <SendAlertView
            initialLocation={selectedLocation}
            weatherData={weatherData}
            onNavigateToAccount={() => handleTabChange('account')}
          />
        )}

        {/* TAB 5: User Sign Up, Verification & Notification Profile */}
        {currentDisplayTab === 'account' && (
          <UserAccountConsole
            onNavigateToRisk={(district) => {
              if (district) {
                const found = ALL_DISTRICTS.find(
                  (d) => d.name.toLowerCase() === district.toLowerCase()
                );
                if (found) {
                  setSelectedLocation(found);
                }
              }
              handleTabChange('risk-monitor');
            }}
          />
        )}

        {/* TAB 6: User Profile Section */}
        {currentDisplayTab === 'profile' && (
          <UserProfileView
            onNavigateToAccount={() => handleTabChange('account')}
            onNavigateToRisk={(district) => {
              if (district) {
                const found = ALL_DISTRICTS.find(
                  (d) => d.name.toLowerCase() === district.toLowerCase()
                );
                if (found) {
                  setSelectedLocation(found);
                }
              }
              handleTabChange('risk-monitor');
            }}
          />
        )}

        {/* TAB: About View (Standalone Overview & Platform Documentation) */}
        {currentDisplayTab === 'about' && (
          <AboutView onNavigateTab={(tab) => handleTabChange(tab)} />
        )}

        </main>

        {/* Global Professional Footer with Mountain Landscape Banner */}
        <Footer
          activeTab={activeTab}
          onNavigate={handleTabChange}
          lastUpdatedText={lastSyncTime ? formatSyncTime(lastSyncTime) : undefined}
          statusInfo={systemStatus}
        />
      </div>
    </div>
  );
}
