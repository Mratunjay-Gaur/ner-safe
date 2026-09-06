import React, { useState, useEffect, useCallback } from 'react';
import { Header, AppTabType } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LocationSelector } from './components/LocationSelector';
import { MainWeatherSummary } from './components/MainWeatherSummary';
import { CurrentWeatherDetails } from './components/CurrentWeatherDetails';
import { HourlyForecast } from './components/HourlyForecast';
import { DailyForecast } from './components/DailyForecast';
import { WeatherAlerts } from './components/WeatherAlerts';
import { IndiaNerMap } from './components/IndiaNerMap';
import { NerQuickOverview } from './components/NerQuickOverview';
import { ClimateTrendChart } from './components/ClimateTrendChart';
import { DataStatusFooter } from './components/DataStatusFooter';
import { NerHubView } from './components/NerHubView';
import { RiskMonitorView } from './components/RiskMonitorView';
import { ReportIncidentView } from './components/ReportIncidentView';
import { IncidentMonitoringConsole } from './components/IncidentMonitoringConsole';
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

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTabType>('live-monitor');
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row font-sans selection:bg-emerald-100 selection:text-emerald-900 antialiased">
      {/* Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onSelectMonitorSubView={(view) => setMonitorSubView(view)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Streamlined Header */}
        <Header
          onRefresh={handleRefresh}
          isLoading={isLoading}
          lastUpdatedText={lastSyncTime ? formatSyncTime(lastSyncTime) : undefined}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Error Notification State */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold text-xs block leading-tight">Service Notice</span>
                <span className="text-xs text-amber-800">{errorMessage}</span>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-amber-300 rounded-md text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && !weatherData && (
          <div className="py-20 text-center flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 p-8 shadow-2xs my-4">
            <Loader2 className="w-7 h-7 text-blue-600 animate-spin mb-3" />
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Connecting to Meteorological Feed...</p>
            <p className="text-xs text-slate-400 mt-1">Retrieving observations for {selectedLocation.name}</p>
          </div>
        )}

        {/* TAB 1: 8-State NER Hub View (Phase 2 Environmental & Land Monitor) */}
        {activeTab === 'ner-hub' && (
          <NerHubView
            selectedLocation={selectedLocation}
            onSelectLocation={handleSelectLocation}
            weatherData={weatherData}
          />
        )}

        {/* TAB: Risk Monitor View (SIH26001 Transparent Multi-Factor Landslide Risk Engine + Gemini Interpretation) */}
        {activeTab === 'risk-monitor' && (
          <RiskMonitorView
            selectedLocation={selectedLocation}
            onSelectLocation={handleSelectLocation}
            weatherData={weatherData}
          />
        )}

        {/* TAB 2: Live Monitor View (Incident Monitoring for Authorities + Atmospheric Telemetry) */}
        {activeTab === 'live-monitor' && (
          <div className="space-y-4">
            {/* Monitor Sub-Navigation Mode Switcher */}
            <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setMonitorSubView('incidents')}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    monitorSubView === 'incidents'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Authority Incident Monitor</span>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                      monitorSubView === 'incidents'
                        ? 'bg-blue-800 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    LIVE MONGODB
                  </span>
                </button>

                <button
                  onClick={() => setMonitorSubView('weather')}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    monitorSubView === 'weather'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <CloudSun className="w-3.5 h-3.5" />
                  <span>Live Weather Telemetry</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-500 font-medium px-2 hidden sm:block">
                {monitorSubView === 'incidents' ? (
                  <span>Geospatial ground disaster verification & dispatch</span>
                ) : (
                  <span>Observation station: <strong>{selectedLocation.name}, {selectedLocation.state}</strong></span>
                )}
              </div>
            </div>

            {/* View A: Incident Monitoring Console for Authorities */}
            {monitorSubView === 'incidents' && (
              <IncidentMonitoringConsole />
            )}

            {/* View B: Phase 1 Atmospheric Weather Telemetry View */}
            {monitorSubView === 'weather' && (
              <div className="space-y-4">
                {/* 1. Location Hierarchy Selector */}
                <LocationSelector
                  selectedLocation={selectedLocation}
                  onSelectLocation={handleSelectLocation}
                  isLoading={isLoading}
                />

                {/* Active Weather Telemetry View */}
                {weatherData ? (
                  <div className="space-y-4">
                    {/* Top Row: Main Summary + Map & Alerts */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      {/* Left Column: Main Weather Summary Card */}
                      <div className="lg:col-span-5 flex flex-col">
                        <MainWeatherSummary
                          location={selectedLocation}
                          current={weatherData.current}
                          isLoading={isLoading}
                          isCached={weatherData.status?.cached}
                          isStale={weatherData.status?.isStale}
                        />
                      </div>

                      {/* Right Column: GIS Map + Alerts */}
                      <div className="lg:col-span-7 flex flex-col gap-4">
                        <IndiaNerMap
                          selectedLocation={selectedLocation}
                          onSelectLocation={handleSelectLocation}
                        />
                        <WeatherAlerts
                          alerts={weatherData.alerts}
                          locationName={selectedLocation.name}
                        />
                      </div>
                    </div>

                    {/* Middle Section: Hourly Forecast & Daily Forecast */}
                    <div className="grid grid-cols-1 gap-4">
                      <HourlyForecast hourly={weatherData.hourly} />
                      <DailyForecast daily={weatherData.daily} />
                    </div>

                    {/* Multi-State NER Hubs & Telemetry Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      <div className="lg:col-span-6">
                        <NerQuickOverview
                          nerSummaries={nerSummaries}
                          selectedLocation={selectedLocation}
                          onSelectLocation={(loc) => {
                            handleSelectLocation(loc);
                          }}
                          isLoading={isLoading}
                        />
                      </div>
                      <div className="lg:col-span-6">
                        <ClimateTrendChart
                          history={weatherData.history}
                          districtName={selectedLocation.name}
                        />
                      </div>
                    </div>

                    {/* Current Atmospheric Detail Grid */}
                    <CurrentWeatherDetails current={weatherData.current} />
                  </div>
                ) : !isLoading && (
                  <div className="bg-white rounded-xl p-8 border border-slate-200 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                      <CloudOff className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800">Weather data unavailable</h3>
                      <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                        Real meteorological telemetry for {selectedLocation.name}, {selectedLocation.state} could not be retrieved from the meteorological stations.
                      </p>
                    </div>
                    <button
                      onClick={handleRefresh}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Retry Fetch
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Atmospheric GIS Full Map View */}
        {activeTab === 'atmospheric-gis' && (
          <div className="space-y-4">
            <LocationSelector
              selectedLocation={selectedLocation}
              onSelectLocation={handleSelectLocation}
              isLoading={isLoading}
            />
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Full-Scale Atmospheric & Geographic Information System (GIS)
                  </h2>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {selectedLocation.name}, {selectedLocation.state}
                </span>
              </div>
              <IndiaNerMap
                selectedLocation={selectedLocation}
                onSelectLocation={handleSelectLocation}
              />
            </div>
          </div>
        )}

        {/* TAB 4: Report Ground & Slope Incident */}
        {activeTab === 'report-incident' && (
          <ReportIncidentView />
        )}

        {/* TAB: Send Alert Prototype Dispatch Console (SIH26001 Demo Testing) */}
        {activeTab === 'send-alert' && (
          <SendAlertView
            initialLocation={selectedLocation}
            weatherData={weatherData}
            onNavigateToAccount={() => setActiveTab('account')}
          />
        )}

        {/* TAB 5: User Sign Up, Verification & Notification Profile */}
        {activeTab === 'account' && (
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
              setActiveTab('risk-monitor');
            }}
          />
        )}

        {/* TAB 6: User Profile Section */}
        {activeTab === 'profile' && (
          <UserProfileView
            onNavigateToAccount={() => setActiveTab('account')}
            onNavigateToRisk={(district) => {
              if (district) {
                const found = ALL_DISTRICTS.find(
                  (d) => d.name.toLowerCase() === district.toLowerCase()
                );
                if (found) {
                  setSelectedLocation(found);
                }
              }
              setActiveTab('risk-monitor');
            }}
          />
        )}

        {/* Technical & Data Status Footer */}
        <DataStatusFooter
          statusInfo={systemStatus}
          lastUpdatedTime={lastSyncTime ? formatSyncTime(lastSyncTime) : undefined}
          isCached={weatherData?.status?.cached}
        />
      </main>
      </div>
    </div>
  );
}
