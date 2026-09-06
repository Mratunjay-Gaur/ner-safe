import React, { useState, useEffect } from 'react';
import {
  Activity,
  Globe2,
  ShieldAlert,
  Compass,
  AlertOctagon,
  Bell,
  Siren,
  User,
  Settings,
  LogOut,
  CheckCircle2,
  ChevronRight,
  X,
  UserPlus,
  Radio,
} from 'lucide-react';
import { AppTabType } from './Header';
import {
  UserProfileData,
  getCachedProfile,
  restoreSession,
  onAuthStateChange,
  performLogout,
} from '../services/authService';

interface SidebarProps {
  activeTab: AppTabType;
  onTabChange: (tab: AppTabType) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onSelectMonitorSubView?: (view: 'incidents' | 'weather') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isOpenMobile,
  onCloseMobile,
  onSelectMonitorSubView,
}) => {
  const [profile, setProfile] = useState<UserProfileData | null>(() => getCachedProfile());

  useEffect(() => {
    // Check and sync session
    restoreSession().then((user) => {
      if (user) setProfile(user);
    });

    const unsubscribe = onAuthStateChange(() => {
      setProfile(getCachedProfile());
    });

    return () => unsubscribe();
  }, []);

  const handleNavClick = (tab: AppTabType) => {
    onTabChange(tab);
    onCloseMobile();
  };

  const handleSignOut = async () => {
    await performLogout();
    setProfile(null);
    onTabChange('account');
    onCloseMobile();
  };

  const isMainActive = (tab: AppTabType) => activeTab === tab;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="ner-safe-left-sidebar"
        className={`fixed md:sticky top-0 left-0 z-50 md:z-20 h-screen w-64 md:w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 shrink-0 transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top: Brand Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <button
            onClick={() => handleNavClick('live-monitor')}
            className="flex items-start gap-2.5 text-left group cursor-pointer"
          >
            <div className="bg-emerald-500 text-slate-950 font-black text-xs px-2 py-1 rounded-md tracking-wider shrink-0 mt-0.5 shadow-xs">
              NER
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base text-white tracking-tight leading-none">
                  NER-SAFE
                </span>
                <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium leading-tight mt-1">
                Live Weather & Land Monitor
              </p>
            </div>
          </button>

          {/* Close button on mobile */}
          <button
            onClick={onCloseMobile}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Card Section (Directly Below Brand) */}
        <div className="p-3 border-b border-slate-800/80 shrink-0">
          {profile && profile.email ? (
            <div
              onClick={() => handleNavClick('profile')}
              className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 transition-all cursor-pointer group"
              title="Click to view verified resident profile"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                    {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                      {profile.name || 'Verified Resident'}
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                  Verified
                </span>
              </div>
              <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                <span>{profile.state || 'Assam'}</span>
                <span>•</span>
                <span className="text-slate-300 font-medium">{profile.district || 'Kamrup Metropolitan'}</span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => handleNavClick('account')}
              className="w-full p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 text-left transition-all cursor-pointer group flex items-center justify-between"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-slate-700 text-slate-300 flex items-center justify-center shrink-0">
                  <UserPlus className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
                    Sign In / Create Account
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Activate Emergency SMS & Alerts
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors shrink-0" />
            </button>
          )}
        </div>

        {/* Scrollable Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5 custom-scrollbar text-xs">
          {/* SECTION 1: MAIN */}
          <div>
            <div className="px-2.5 mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              MAIN
            </div>
            <div className="space-y-0.5">
              <button
                id="sidebar-nav-live-monitor"
                onClick={() => handleNavClick('live-monitor')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-semibold transition-colors cursor-pointer text-left ${
                  isMainActive('live-monitor')
                    ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Activity className={`w-4 h-4 ${isMainActive('live-monitor') ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>Live Monitor</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  FEED
                </span>
              </button>

              <button
                id="sidebar-nav-ner-hub"
                onClick={() => handleNavClick('ner-hub')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-semibold transition-colors cursor-pointer text-left ${
                  isMainActive('ner-hub')
                    ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Globe2 className={`w-4 h-4 ${isMainActive('ner-hub') ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>8-State NER Hub</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  8 STATES
                </span>
              </button>

              <button
                id="sidebar-nav-risk-monitor"
                onClick={() => handleNavClick('risk-monitor')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-semibold transition-colors cursor-pointer text-left ${
                  isMainActive('risk-monitor')
                    ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className={`w-4 h-4 ${isMainActive('risk-monitor') ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>Risk Monitor</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  AI RISK
                </span>
              </button>

              <button
                id="sidebar-nav-monitor"
                onClick={() => handleNavClick('atmospheric-gis')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-semibold transition-colors cursor-pointer text-left ${
                  isMainActive('atmospheric-gis')
                    ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Compass className={`w-4 h-4 ${isMainActive('atmospheric-gis') ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>Monitor (GIS)</span>
                </div>
              </button>

              <button
                id="sidebar-nav-report-incident"
                onClick={() => handleNavClick('report-incident')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-semibold transition-colors cursor-pointer text-left ${
                  isMainActive('report-incident')
                    ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <AlertOctagon className={`w-4 h-4 ${isMainActive('report-incident') ? 'text-emerald-400' : 'text-rose-400'}`} />
                  <span>Report Incident</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  NEW
                </span>
              </button>
            </div>
          </div>

          {/* SECTION 2: ALERTS & RESPONSE */}
          <div>
            <div className="px-2.5 mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              ALERTS & RESPONSE
            </div>
            <div className="space-y-0.5">
              <button
                id="sidebar-nav-weather-alerts"
                onClick={() => {
                  onTabChange('live-monitor');
                  if (onSelectMonitorSubView) onSelectMonitorSubView('weather');
                  onCloseMobile();
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-semibold text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-slate-400" />
                  <span>Weather Alerts</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                  IMD
                </span>
              </button>

              <button
                id="sidebar-nav-emergency-priority"
                onClick={() => {
                  onTabChange('live-monitor');
                  if (onSelectMonitorSubView) onSelectMonitorSubView('incidents');
                  onCloseMobile();
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-semibold text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Siren className="w-4 h-4 text-amber-400" />
                  <span>Emergency Priority</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                  NDMA
                </span>
              </button>

              <button
                id="sidebar-nav-send-alert"
                onClick={() => handleNavClick('send-alert')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-semibold transition-colors cursor-pointer text-left ${
                  isMainActive('send-alert')
                    ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Radio className={`w-4 h-4 ${isMainActive('send-alert') ? 'text-emerald-400' : 'text-sky-400'}`} />
                  <span>Send Alert</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  DEMO
                </span>
              </button>
            </div>
          </div>

          {/* SECTION 3: ACCOUNT */}
          <div>
            <div className="px-2.5 mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              ACCOUNT
            </div>
            <div className="space-y-0.5">
              <button
                id="sidebar-nav-profile"
                onClick={() => handleNavClick('profile')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-semibold transition-colors cursor-pointer text-left ${
                  isMainActive('profile')
                    ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <User className={`w-4 h-4 ${isMainActive('profile') ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>Profile</span>
                </div>
                {profile?.isVerified && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                    ACTIVE
                  </span>
                )}
              </button>

              <button
                id="sidebar-nav-settings"
                onClick={() => handleNavClick('account')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-semibold transition-colors cursor-pointer text-left ${
                  isMainActive('account')
                    ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Settings className={`w-4 h-4 ${isMainActive('account') ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{profile?.email ? 'Account & Settings' : 'Sign In / Sign Up'}</span>
                </div>
                {!profile?.email && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300">
                    OTP AUTH
                  </span>
                )}
              </button>

              {profile && profile.email && (
                <button
                  id="sidebar-nav-sign-out"
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg font-semibold text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 border border-transparent transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>Sign Out</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* Footer info tag */}
        <div className="p-3 border-t border-slate-800/80 text-[10px] text-slate-500 flex items-center justify-between shrink-0">
          <span>NER-SAFE v2.4</span>
          <span className="font-mono text-emerald-500">SYSTEM READY</span>
        </div>
      </aside>
    </>
  );
};
