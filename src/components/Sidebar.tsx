import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { WEBSITE_LOGO_URL } from './NerSafeLogo';
import {
  Home,
  Activity,
  Globe2,
  ShieldAlert,
  Compass,
  AlertOctagon,
  ShieldCheck,
  User,
  Settings,
  LogOut,
  ChevronRight,
  X,
  UserPlus,
  Radio,
  Info,
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
}) => {
  const { t, i18n } = useTranslation();
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
      {/* Smooth Mobile/Tablet Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300 ease-in-out ${
          isOpenMobile ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      {/* Sidebar Container: Deep obsidian luxury slate theme with refined active pill indicators */}
      <aside
        id="ner-safe-left-sidebar"
        className={`fixed lg:sticky top-0 left-0 z-50 lg:z-20 h-screen w-64 lg:w-68 bg-gradient-to-b from-[#0f172a] via-[#131d33] to-[#0f172a] text-slate-100 flex flex-col border-r border-slate-800/90 shrink-0 transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top: Brand Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between shrink-0 gap-2">
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-3 text-left group cursor-pointer btn-press"
            title={t('nav.home', 'Home')}
          >
            <div className="relative shrink-0">
              <img
                src={WEBSITE_LOGO_URL}
                alt="NER-SAFE"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith('/nersafe-symbol.png')) {
                    target.src = '/nersafe-symbol.png';
                  }
                }}
                className="w-11 h-11 sm:w-12 sm:h-12 object-contain rounded-xl p-1 bg-white border border-slate-700/60 shadow-xs group-hover:scale-105 transition-transform"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-white tracking-tight leading-none group-hover:text-sky-300 transition-colors">
                  NER-SAFE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium leading-tight mt-1 tracking-tight">
                {t('common.tagline', 'North Eastern Region Safety & Monitoring')}
              </p>
            </div>
          </button>

          {/* Close (X) button at top-right of open mobile sidebar */}
          <button
            id="sidebar-close-btn"
            onClick={onCloseMobile}
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 focus:outline-hidden focus:ring-2 focus:ring-sky-400 transition-all btn-press cursor-pointer shrink-0"
            aria-label={t('common.close', 'Close navigation sidebar')}
            title={t('common.close', 'Close navigation sidebar')}
          >
            <X className="w-4 h-4 text-white" strokeWidth={2.5} />
          </button>
        </div>

        {/* Profile Card Section */}
        <div className="p-3 border-b border-slate-800/80 shrink-0">
          {profile && profile.email ? (
            <div
              onClick={() => handleNavClick('profile')}
              className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:bg-slate-800/90 hover:border-slate-600/80 transition-all cursor-pointer group shadow-2xs"
              title={t('header.viewProfile', 'Click to view profile')}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7.5 h-7.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
                      {profile.name || 'Resident User'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 truncate flex items-center gap-1 pl-0.5">
                <span>{profile.state || 'Assam'}</span>
                <span>•</span>
                <span className="text-slate-300 font-medium">{profile.district || 'Kamrup Metropolitan'}</span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => handleNavClick('account')}
              className="w-full p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/60 hover:border-slate-600/80 text-left transition-all cursor-pointer group flex items-center justify-between btn-press shadow-2xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7.5 h-7.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-100 group-hover:text-white transition-colors">
                    {t('account.signInTab', 'Sign In')} / {t('account.signUpTab', 'Register')}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {t('home.welcomeBadge', 'Early Warning Access')}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors shrink-0" />
            </button>
          )}
        </div>

        {/* Scrollable Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4 custom-scrollbar text-xs">
          {/* SECTION 1: MONITORING & OPERATIONS */}
          <div>
            <div className="px-2.5 mb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              {t('nav.navigationTitle', 'OPERATIONS & MONITORING')}
            </div>
            <div className="space-y-1">
              <button
                id="sidebar-nav-home"
                onClick={() => handleNavClick('home')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer text-left group ${
                  isMainActive('home')
                    ? 'bg-sky-500/15 text-white font-bold border border-sky-500/40 shadow-[0_0_16px_rgba(14,165,233,0.18)]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded-lg ${isMainActive('home') ? 'bg-sky-500 text-white' : 'bg-slate-800/80 text-sky-400 group-hover:bg-slate-800'}`}>
                    <Home className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs">{t('nav.home', 'Home')}</span>
                </div>
                {isMainActive('home') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                )}
              </button>

              <button
                id="sidebar-nav-live-monitor"
                onClick={() => handleNavClick('live-monitor')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer text-left group ${
                  isMainActive('live-monitor')
                    ? 'bg-sky-500/15 text-white font-bold border border-sky-500/40 shadow-[0_0_16px_rgba(14,165,233,0.18)]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded-lg ${isMainActive('live-monitor') ? 'bg-sky-500 text-white' : 'bg-slate-800/80 text-sky-400 group-hover:bg-slate-800'}`}>
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs">{t('nav.liveMonitor', 'Live Monitor')}</span>
                </div>
                {isMainActive('live-monitor') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                )}
              </button>

              <button
                id="sidebar-nav-ner-hub"
                onClick={() => handleNavClick('ner-hub')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer text-left group ${
                  isMainActive('ner-hub')
                    ? 'bg-emerald-500/15 text-white font-bold border border-emerald-500/40 shadow-[0_0_16px_rgba(16,185,129,0.18)]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded-lg ${isMainActive('ner-hub') ? 'bg-emerald-500 text-white' : 'bg-slate-800/80 text-emerald-400 group-hover:bg-slate-800'}`}>
                    <Globe2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs">{t('nav.nerHub', '8-State NER Hub')}</span>
                </div>
                {isMainActive('ner-hub') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>

              <button
                id="sidebar-nav-risk-monitor"
                onClick={() => handleNavClick('risk-monitor')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer text-left group ${
                  isMainActive('risk-monitor')
                    ? 'bg-amber-500/15 text-white font-bold border border-amber-500/40 shadow-[0_0_16px_rgba(245,158,11,0.18)]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded-lg ${isMainActive('risk-monitor') ? 'bg-amber-500 text-white' : 'bg-slate-800/80 text-amber-400 group-hover:bg-slate-800'}`}>
                    <ShieldAlert className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs">{t('nav.riskMonitor', 'Risk Monitor')}</span>
                </div>
                {isMainActive('risk-monitor') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </button>

              <button
                id="sidebar-nav-monitor"
                onClick={() => handleNavClick('atmospheric-gis')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer text-left group ${
                  isMainActive('atmospheric-gis')
                    ? 'bg-teal-500/15 text-white font-bold border border-teal-500/40 shadow-[0_0_16px_rgba(20,184,166,0.18)]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded-lg ${isMainActive('atmospheric-gis') ? 'bg-teal-500 text-white' : 'bg-slate-800/80 text-teal-400 group-hover:bg-slate-800'}`}>
                    <Compass className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs">{t('nav.gisMonitor', 'Monitor (GIS)')}</span>
                </div>
                {isMainActive('atmospheric-gis') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                )}
              </button>

              <button
                id="sidebar-nav-incident-monitor"
                onClick={() => handleNavClick('incident-monitor')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer text-left group ${
                  isMainActive('incident-monitor')
                    ? 'bg-indigo-500/15 text-white font-bold border border-indigo-500/40 shadow-[0_0_16px_rgba(99,102,241,0.18)]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded-lg ${isMainActive('incident-monitor') ? 'bg-indigo-500 text-white' : 'bg-slate-800/80 text-indigo-400 group-hover:bg-slate-800'}`}>
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs">{t('nav.incidentMonitor', 'Authority Incident Monitor')}</span>
                </div>
                {isMainActive('incident-monitor') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                )}
              </button>

              <button
                id="sidebar-nav-report-incident"
                onClick={() => handleNavClick('report-incident')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer text-left group ${
                  isMainActive('report-incident')
                    ? 'bg-rose-500/15 text-white font-bold border border-rose-500/40 shadow-[0_0_16px_rgba(244,63,94,0.18)]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded-lg ${isMainActive('report-incident') ? 'bg-rose-500 text-white' : 'bg-slate-800/80 text-rose-400 group-hover:bg-slate-800'}`}>
                    <AlertOctagon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs">{t('nav.reportIncident', 'Report Incident')}</span>
                </div>
                {isMainActive('report-incident') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                )}
              </button>

              <button
                id="sidebar-nav-send-alert"
                onClick={() => handleNavClick('send-alert')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer text-left group ${
                  isMainActive('send-alert')
                    ? 'bg-orange-500/15 text-white font-bold border border-orange-500/40 shadow-[0_0_16px_rgba(249,115,22,0.18)]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded-lg ${isMainActive('send-alert') ? 'bg-orange-500 text-white' : 'bg-slate-800/80 text-orange-400 group-hover:bg-slate-800'}`}>
                    <Radio className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs">{t('nav.sendAlert', 'Send Alert')}</span>
                </div>
                {isMainActive('send-alert') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                )}
              </button>
            </div>
          </div>

          {/* SECTION 2: SYSTEM & ACCOUNT */}
          <div>
            <div className="px-2.5 mb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              {t('nav.systemTitle', 'ACCOUNT & SYSTEM')}
            </div>
            <div className="space-y-1">
              <button
                id="sidebar-nav-profile"
                onClick={() => handleNavClick('profile')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer text-left group ${
                  isMainActive('profile')
                    ? 'bg-cyan-500/15 text-white font-bold border border-cyan-500/40 shadow-[0_0_16px_rgba(6,182,212,0.18)]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded-lg ${isMainActive('profile') ? 'bg-cyan-500 text-white' : 'bg-slate-800/80 text-cyan-400 group-hover:bg-slate-800'}`}>
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs">{t('nav.profile', 'Profile')}</span>
                </div>
                {isMainActive('profile') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                )}
              </button>

              <button
                id="sidebar-nav-settings"
                onClick={() => handleNavClick('account')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer text-left group ${
                  isMainActive('account')
                    ? 'bg-sky-500/15 text-white font-bold border border-sky-500/40 shadow-[0_0_16px_rgba(14,165,233,0.18)]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded-lg ${isMainActive('account') ? 'bg-slate-700 text-white' : 'bg-slate-800/80 text-slate-400 group-hover:bg-slate-800'}`}>
                    <Settings className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs">{profile?.email ? t('nav.account', 'Account & Settings') : `${t('account.signInTab', 'Sign In')} / ${t('account.signUpTab', 'Sign Up')}`}</span>
                </div>
                {isMainActive('account') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                )}
              </button>

              <button
                id="sidebar-nav-about"
                onClick={() => handleNavClick('about')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all cursor-pointer text-left group ${
                  isMainActive('about')
                    ? 'bg-blue-500/15 text-white font-bold border border-blue-500/40 shadow-[0_0_16px_rgba(59,130,246,0.18)]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded-lg ${isMainActive('about') ? 'bg-blue-500 text-white' : 'bg-slate-800/80 text-blue-400 group-hover:bg-slate-800'}`}>
                    <Info className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs">{t('nav.about', 'About')}</span>
                </div>
                {isMainActive('about') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                )}
              </button>

              {profile && profile.email && (
                <button
                  id="sidebar-nav-sign-out"
                  onClick={handleSignOut}
                  className="w-full flex items-center px-3 py-2.5 rounded-xl font-medium text-rose-300 hover:text-rose-100 hover:bg-rose-500/15 border border-transparent transition-all cursor-pointer text-left mt-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1 rounded-lg bg-rose-500/20 text-rose-400">
                      <LogOut className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs">{t('profile.logoutBtn', 'Sign Out')}</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* Clear Mobile Close Button on Small Screens */}
        <div className="p-3 border-t border-slate-800/80 lg:hidden shrink-0">
          <button
            id="sidebar-bottom-close-btn"
            onClick={onCloseMobile}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs btn-press"
          >
            <X className="w-4 h-4 text-white" />
            <span>{t('common.close', 'Close Menu')}</span>
          </button>
        </div>

        {/* Footer info tag */}
        <div className="p-3.5 border-t border-slate-800/80 text-[10px] text-slate-500 flex items-center justify-between shrink-0">
          <span>NER-SAFE © 2026</span>
        </div>
      </aside>
    </>
  );
};
