import React, { useState, useEffect } from 'react';
import { Settings, Info, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { WEBSITE_LOGO_URL } from './NerSafeLogo';
import { LanguageSelector } from './LanguageSelector';
import {
  UserProfileData,
  getCachedProfile,
  restoreSession,
  onAuthStateChange,
} from '../services/authService';

export type AppTabType =
  | 'home'
  | 'live-monitor'
  | 'ner-hub'
  | 'risk-monitor'
  | 'cross-border'
  | 'atmospheric-gis'
  | 'incident-monitor'
  | 'report-incident'
  | 'send-alert'
  | 'account'
  | 'profile'
  | 'about';

interface HeaderProps {
  onRefresh?: () => void;
  isLoading?: boolean;
  lastUpdatedText?: string;
  activeTab: AppTabType;
  onTabChange: (tab: AppTabType) => void;
  onOpenMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenMobileSidebar,
  lastUpdatedText,
}) => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfileData | null>(() => getCachedProfile());

  useEffect(() => {
    restoreSession().then((user) => {
      if (user) setProfile(user);
    });

    const unsubscribe = onAuthStateChange(() => {
      setProfile(getCachedProfile());
    });

    return () => unsubscribe();
  }, []);

  // Compute first letter of user's name or email for circular avatar
  const userInitial = profile?.name?.trim()
    ? profile.name.trim().charAt(0).toUpperCase()
    : profile?.email?.trim()
    ? profile.email.trim().charAt(0).toUpperCase()
    : 'U';

  return (
    <header
      id="ner-safe-header"
      className="bg-white/80 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-30 shadow-[0_1px_12px_rgba(15,23,42,0.04)]"
    >
      <div className="w-full px-3 sm:px-5 lg:px-8 h-15 flex items-center justify-between gap-3">
        {/* Left Side: Hamburger (mobile), Premium NER-SAFE Brand & Mission */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Mobile/Tablet Drawer Hamburger Button */}
          <button
            id="mobile-sidebar-toggle-btn"
            onClick={onOpenMobileSidebar}
            className="lg:hidden inline-flex items-center justify-center p-2 rounded-xl text-slate-700 hover:text-slate-950 hover:bg-slate-100/90 border border-slate-200/90 transition-all btn-press cursor-pointer shrink-0"
            aria-label={t('header.openNavigation', 'Open navigation menu')}
            title={t('header.openNavigation', 'Open navigation menu')}
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>

          {/* Logo & Platform Name */}
          <button
            onClick={() => onTabChange('live-monitor')}
            className="flex items-center gap-3 text-left group cursor-pointer focus:outline-hidden select-none btn-press"
            title="NER-SAFE"
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
                className="w-11 h-11 sm:w-12 sm:h-12 object-contain rounded-xl p-1 bg-white border border-slate-200/90 shadow-xs group-hover:scale-105 transition-transform duration-200"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight leading-none group-hover:text-sky-900 transition-colors">
                  NER-SAFE
                </span>
                <span className="hidden xs:inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {t('common.liveOps', 'LIVE OPS')}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5 hidden sm:inline tracking-tight">
                {t('common.tagline', 'North Eastern Region Safety & Monitoring')}
              </span>
            </div>
          </button>
        </div>

        {/* Right Side: Language Selector, Docs, Settings, and User Circular Avatar */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Multilingual Selector */}
          <LanguageSelector />

          {/* About Navigation Button */}
          <button
            id="header-about-btn"
            onClick={() => onTabChange('about')}
            title={t('about.title', 'About NER-SAFE Platform')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all btn-press cursor-pointer ${
              activeTab === 'about'
                ? 'bg-sky-50 text-sky-900 border border-sky-200/90 shadow-xs'
                : 'text-slate-600 hover:text-slate-950 bg-white/90 hover:bg-slate-100/90 border border-slate-200/80 shadow-2xs'
            }`}
          >
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">{t('nav.platformDocs', 'Platform Docs')}</span>
          </button>

          {/* Settings Icon Button */}
          <button
            id="header-settings-btn"
            onClick={() => onTabChange('account')}
            title={profile?.email ? t('account.title', 'Account & System Settings') : t('header.signInSettings', 'Sign In / Account Settings')}
            className={`inline-flex items-center justify-center p-2 rounded-xl text-xs font-semibold transition-all btn-press cursor-pointer ${
              activeTab === 'account'
                ? 'bg-sky-50 text-sky-900 border border-sky-200/90 shadow-xs'
                : 'text-slate-600 hover:text-slate-950 bg-white/90 hover:bg-slate-100/90 border border-slate-200/80 shadow-2xs'
            }`}
            aria-label={t('nav.account', 'Settings')}
          >
            <Settings className="w-4 h-4 text-slate-600" />
          </button>

          {/* User Circular Avatar with First Letter (opens Profile/Account) */}
          <button
            id="header-user-avatar-btn"
            onClick={() => onTabChange(profile?.email ? 'profile' : 'account')}
            title={
              profile?.email
                ? `${profile.name || profile.email} — ${t('header.viewProfile', 'View Profile')}`
                : t('header.signInSettings', 'User Profile & Verification')
            }
            className={`flex items-center gap-2 p-1 rounded-full transition-all btn-press cursor-pointer group focus:outline-hidden ring-2 ${
              activeTab === 'profile'
                ? 'ring-sky-500 shadow-xs bg-sky-50/50'
                : 'ring-transparent hover:ring-slate-300/80'
            }`}
            aria-label={t('nav.profile', 'User Profile')}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-700 text-white font-bold text-xs flex items-center justify-center border border-slate-700/80 shadow-xs shrink-0 group-hover:scale-105 transition-transform">
              {userInitial}
            </div>
            {profile?.name && (
              <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-950 hidden lg:inline max-w-[120px] truncate pr-1">
                {profile.name.split(' ')[0]}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

