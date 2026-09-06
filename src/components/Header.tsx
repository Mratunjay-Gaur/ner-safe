import React, { useState } from 'react';
import { Info, RefreshCw, Menu } from 'lucide-react';
import { AboutModal } from './AboutModal';

export type AppTabType =
  | 'live-monitor'
  | 'ner-hub'
  | 'risk-monitor'
  | 'atmospheric-gis'
  | 'report-incident'
  | 'send-alert'
  | 'account'
  | 'profile';

interface HeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  lastUpdatedText?: string;
  activeTab: AppTabType;
  onTabChange: (tab: AppTabType) => void;
  onOpenMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  isLoading,
  lastUpdatedText,
  activeTab,
  onTabChange,
  onOpenMobileSidebar,
}) => {
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  return (
    <>
      <header id="ner-safe-header" className="bg-white/95 backdrop-blur-xs border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="w-full px-3 sm:px-5 lg:px-6 h-14 flex items-center justify-between gap-3">
          {/* Left: Mobile Drawer Toggle & Minimal Identity */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              id="mobile-sidebar-toggle-btn"
              onClick={onOpenMobileSidebar}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Mobile-only brand */}
            <div className="flex md:hidden items-center gap-1.5">
              <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                NER-SAFE
              </span>
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </span>
            </div>

            {/* Desktop breadcrumb / system indicator */}
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="font-semibold text-slate-800">NER Disaster Management & Early Warning Platform</span>
              <span>•</span>
              <span className="text-slate-500 font-mono text-[11px]">8 Northeast Region States</span>
            </div>
          </div>

          {/* Right: Sync Status & Actions & Utilities */}
          <div className="flex items-center gap-2 shrink-0">
            {lastUpdatedText && (
              <span className="text-[11px] text-slate-600 font-mono inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="hidden sm:inline">Last successful data sync:</span>
                <span className="sm:hidden">Sync:</span>
                <strong className="text-slate-800 font-semibold">{lastUpdatedText}</strong>
              </span>
            )}

            <button
              id="refresh-weather-btn"
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh live telemetry and risk data"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-600' : 'text-slate-500'}`}
              />
              <span className="hidden sm:inline">{isLoading ? 'Syncing...' : 'Refresh'}</span>
            </button>

            <button
              id="open-about-modal-btn"
              onClick={() => setIsAboutOpen(true)}
              title="About NER-SAFE platform"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">About</span>
            </button>
          </div>
        </div>
      </header>

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </>
  );
};

