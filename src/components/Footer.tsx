import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WEBSITE_LOGO_URL } from './NerSafeLogo';
import { AppTabType } from './Header';
import {
  Home,
  Activity,
  Globe2,
  ShieldAlert,
  Compass,
  ShieldCheck,
  AlertOctagon,
  Radio,
  User,
  Settings,
  Info,
  ChevronRight,
} from 'lucide-react';

export const GLOBAL_MOUNTAIN_BG_URL =
  'https://i.pinimg.com/736x/65/98/0c/65980cd2b517b517f6c275a25304bf52.jpg';

interface FooterProps {
  activeTab?: AppTabType;
  onNavigate: (tab: AppTabType) => void;
  statusInfo?: any;
  lastUpdatedText?: string;
}

export const Footer: React.FC<FooterProps> = ({
  activeTab,
  onNavigate,
  lastUpdatedText,
}) => {
  const { t } = useTranslation();
  const [bgImage, setBgImage] = useState<string>(GLOBAL_MOUNTAIN_BG_URL);

  const handleLinkClick = (tab: AppTabType) => {
    onNavigate(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer
      id="ner-safe-main-footer"
      className="relative w-full border-t border-slate-700/80 mt-auto overflow-hidden text-slate-200 select-none"
    >
      {/* Mountain Banner Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 ease-out pointer-events-none scale-[1.02]"
        style={{
          backgroundImage: `url('${bgImage}')`,
          backgroundPosition: 'center 45%',
          backgroundSize: 'cover',
        }}
        role="presentation"
      >
        {/* Invisible image element to handle loading fallback gracefully */}
        <img
          src={bgImage}
          alt=""
          className="hidden"
          referrerPolicy="no-referrer"
          onError={() => {
            if (bgImage !== '/mountain-bg-himalayan.jpg') {
              setBgImage('/mountain-bg-himalayan.jpg');
            }
          }}
        />
      </div>

      {/* Subtle Dark Navy / Slate Overlay: Retains vibrant mountain scenery while maintaining crisp readability */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#0B1320]/88 via-[#0F172A]/78 to-[#0B1320]/92 backdrop-blur-[1.5px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Ambient Top Glow Line */}
      <div
        className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Footer Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Brand & Platform Identity (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
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
                className="w-10 h-10 object-contain rounded-xl p-1 bg-white/95 border border-white/20 shadow-md backdrop-blur-xs shrink-0"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg text-white tracking-tight drop-shadow-sm">
                    NER-SAFE
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
                    SIH26001
                  </span>
                </div>
                <p className="text-[11px] text-slate-300/90 font-medium leading-tight mt-0.5">
                  {t('common.tagline', 'North Eastern Region Safety & Monitoring')}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-normal max-w-sm">
              {t('footer.description', 'AI-powered early warning and monitoring platform for the North Eastern Region.')}
            </p>
          </div>

          {/* Column 2: Platform (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              {t('footer.platform', 'Platform')}
            </h3>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => handleLinkClick('home')}
                  className={`w-full text-left py-1 px-2 rounded-lg transition-colors flex items-center justify-between group cursor-pointer ${
                    activeTab === 'home'
                      ? 'text-sky-300 font-semibold bg-white/10'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Home className="w-3 h-3 text-slate-400 group-hover:text-sky-300 transition-colors" />
                    {t('nav.home', 'Home')}
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleLinkClick('live-monitor')}
                  className={`w-full text-left py-1 px-2 rounded-lg transition-colors flex items-center justify-between group cursor-pointer ${
                    activeTab === 'live-monitor'
                      ? 'text-sky-300 font-semibold bg-white/10'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Activity className="w-3 h-3 text-slate-400 group-hover:text-sky-300 transition-colors" />
                    {t('nav.liveMonitor', 'Live Monitor')}
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleLinkClick('ner-hub')}
                  className={`w-full text-left py-1 px-2 rounded-lg transition-colors flex items-center justify-between group cursor-pointer ${
                    activeTab === 'ner-hub'
                      ? 'text-sky-300 font-semibold bg-white/10'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Globe2 className="w-3 h-3 text-slate-400 group-hover:text-emerald-300 transition-colors" />
                    {t('nav.nerHub', '8-State NER Hub')}
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleLinkClick('risk-monitor')}
                  className={`w-full text-left py-1 px-2 rounded-lg transition-colors flex items-center justify-between group cursor-pointer ${
                    activeTab === 'risk-monitor'
                      ? 'text-amber-300 font-semibold bg-white/10'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ShieldAlert className="w-3 h-3 text-slate-400 group-hover:text-amber-300 transition-colors" />
                    {t('nav.riskMonitor', 'Risk Monitor')}
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleLinkClick('atmospheric-gis')}
                  className={`w-full text-left py-1 px-2 rounded-lg transition-colors flex items-center justify-between group cursor-pointer ${
                    activeTab === 'atmospheric-gis'
                      ? 'text-teal-300 font-semibold bg-white/10'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Compass className="w-3 h-3 text-slate-400 group-hover:text-teal-300 transition-colors" />
                    {t('nav.gisMonitor', 'Monitor (GIS)')}
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleLinkClick('incident-monitor')}
                  className={`w-full text-left py-1 px-2 rounded-lg transition-colors flex items-center justify-between group cursor-pointer ${
                    activeTab === 'incident-monitor'
                      ? 'text-indigo-300 font-semibold bg-white/10'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3 text-slate-400 group-hover:text-indigo-300 transition-colors" />
                    {t('nav.incidentMonitor', 'Authority Incident Monitor')}
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Operations (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
              {t('footer.operations', 'Operations')}
            </h3>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => handleLinkClick('report-incident')}
                  className={`w-full text-left py-1 px-2 rounded-lg transition-colors flex items-center justify-between group cursor-pointer ${
                    activeTab === 'report-incident'
                      ? 'text-rose-300 font-semibold bg-white/10'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <AlertOctagon className="w-3 h-3 text-rose-400" />
                    {t('nav.reportIncident', 'Report Incident')}
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleLinkClick('send-alert')}
                  className={`w-full text-left py-1 px-2 rounded-lg transition-colors flex items-center justify-between group cursor-pointer ${
                    activeTab === 'send-alert'
                      ? 'text-orange-300 font-semibold bg-white/10'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Radio className="w-3 h-3 text-orange-400" />
                    {t('nav.sendAlert', 'Send Alert')}
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: System (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-cyan-400" />
              {t('footer.system', 'System')}
            </h3>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => handleLinkClick('profile')}
                  className={`w-full text-left py-1 px-2 rounded-lg transition-colors flex items-center justify-between group cursor-pointer ${
                    activeTab === 'profile'
                      ? 'text-cyan-300 font-semibold bg-white/10'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <User className="w-3 h-3 text-slate-400 group-hover:text-cyan-300 transition-colors" />
                    {t('nav.profile', 'Profile')}
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleLinkClick('account')}
                  className={`w-full text-left py-1 px-2 rounded-lg transition-colors flex items-center justify-between group cursor-pointer ${
                    activeTab === 'account'
                      ? 'text-sky-300 font-semibold bg-white/10'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Settings className="w-3 h-3 text-slate-400 group-hover:text-sky-300 transition-colors" />
                    {t('nav.account', 'Account & Settings')}
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleLinkClick('about')}
                  className={`w-full text-left py-1 px-2 rounded-lg transition-colors flex items-center justify-between group cursor-pointer ${
                    activeTab === 'about'
                      ? 'text-blue-300 font-semibold bg-white/10'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Info className="w-3 h-3 text-slate-400 group-hover:text-blue-300 transition-colors" />
                    {t('nav.about', 'About')}
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="mt-8 sm:mt-10 pt-5 border-t border-slate-700/60 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px]">
            <span className="font-bold text-white tracking-wide">NER-SAFE</span>
            <span className="text-slate-500">•</span>
            <span>© {currentYear}</span>
          </div>

          <p className="text-[11px] text-slate-300/80 text-center md:text-right max-w-xl leading-relaxed">
            {t('footer.disclaimer', 'Official early warning & disaster intelligence advisory platform for the North Eastern Region. In life-threatening situations, immediately alert local district disaster authorities (112 / 1070).')}
          </p>
        </div>
      </div>
    </footer>
  );
};
