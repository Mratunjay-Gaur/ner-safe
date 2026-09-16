import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { WEBSITE_LOGO_URL } from './NerSafeLogo';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export const HERO_HOME_BG_URL =
  'https://static2.tripoto.com/media/travel-story/5615880929_a407ab7957_b.jpg';

interface HomeIntroScreenProps {
  onEnter: () => void;
}

export const HomeIntroScreen: React.FC<HomeIntroScreenProps> = ({ onEnter }) => {
  const { t } = useTranslation();
  const [bgSrc, setBgSrc] = useState<string>(HERO_HOME_BG_URL);

  return (
    <motion.div
      id="ner-safe-home-intro"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      onClick={onEnter}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          onEnter();
        }
      }}
      className="fixed inset-0 z-[100] w-screen h-screen overflow-y-auto flex flex-col justify-between select-none cursor-pointer bg-slate-950 focus:outline-hidden"
      aria-label="Welcome to NER-SAFE. Click anywhere to continue to the main application."
    >
      {/* Full-viewport Background Image Container */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none">
        <img
          src={bgSrc}
          alt="Himalayan Mountain Range Landscape"
          referrerPolicy="no-referrer"
          onError={() => {
            if (bgSrc !== '/mountain-bg-himalayan.jpg') {
              setBgSrc('/mountain-bg-himalayan.jpg');
            }
          }}
          className="w-full h-full object-cover object-center transition-transform duration-1000 ease-out"
        />

        {/* Subtle, cinematic multi-stop dark vignette & gradient overlay for maximum readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/94 via-slate-950/70 to-slate-950/80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_15%,_rgba(2,6,23,0.78)_100%)]" />
      </div>

      {/* Top Header / Branding Bar */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-5 sm:px-8 pt-6 sm:pt-8 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3.5">
          <img
            src={WEBSITE_LOGO_URL}
            alt="NER-SAFE Logo"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.endsWith('/nersafe-symbol.png')) {
                target.src = '/nersafe-symbol.png';
              }
            }}
            className="w-11 h-11 sm:w-12 sm:h-12 object-contain rounded-xl p-1 bg-white/95 border border-white/20 shadow-xl backdrop-blur-xs"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white drop-shadow-md">
                NER-SAFE
              </span>
            </div>
            <p className="text-xs text-slate-300/80 font-medium tracking-wide">
              {t('common.tagline', 'North Eastern Region Safety & Monitoring')}
            </p>
          </div>
        </div>

        {/* Top Unified Pill */}
        <div className="flex items-center gap-2.5 pointer-events-auto">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-xs text-slate-200">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>{t('home.heroPill', 'Unified Telemetry & Early Warning System')}</span>
          </div>
        </div>
      </div>

      {/* Centered Minimal & Cinematic Hero Composition */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-5 sm:px-6 py-6 sm:py-8 flex flex-col items-center text-center my-auto">
        {/* Subtle pill badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/20 border border-sky-400/30 backdrop-blur-md text-sky-200 text-xs font-semibold tracking-wide mb-4 pointer-events-none"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>{t('home.heroPill', 'Unified Telemetry & Early Warning System')}</span>
        </motion.div>

        {/* Website Name */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight leading-tight drop-shadow-2xl pointer-events-none"
        >
          NER-SAFE
        </motion.h1>

        {/* Professional Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-2 sm:mt-3 text-base sm:text-xl md:text-2xl font-medium text-sky-100/90 tracking-normal drop-shadow-md max-w-2xl pointer-events-none"
        >
          {t('home.heroSub', 'Live Weather, Terrain & Landslide Monitoring Platform')}
        </motion.p>

        {/* Short Professional Introduction */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-3 text-xs sm:text-sm md:text-base text-slate-200/90 font-normal leading-relaxed max-w-2xl drop-shadow-md pointer-events-none"
        >
          {t('home.heroDesc', 'Real-time meteorological telemetry, high-resolution slope stability modeling, and community hazard notifications safeguarding communities across all eight North Eastern states of India.')}
        </motion.p>

        {/* Subtle Regional Scope Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-300 pointer-events-none"
        >
          <span className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 backdrop-blur-xs">
            {t('home.badge1', '8 NER States')}
          </span>
          <span className="text-slate-500">•</span>
          <span className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 backdrop-blur-xs">
            {t('home.badge2', 'Rainfall Threshold Analysis')}
          </span>
          <span className="text-slate-500">•</span>
          <span className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 backdrop-blur-xs">
            {t('home.badge3', 'GIS Multi-Hazard Mapping')}
          </span>
          <span className="text-slate-500">•</span>
          <span className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 backdrop-blur-xs">
            {t('home.badge4', 'Instant Community Alerts')}
          </span>
        </motion.div>
      </div>

      {/* Bottom Action Prompt: "Click anywhere to continue" */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="relative z-10 w-full max-w-4xl mx-auto px-6 pb-6 sm:pb-8 flex flex-col items-center text-center"
      >
        <button
          type="button"
          onClick={onEnter}
          className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs sm:text-sm font-bold tracking-wide shadow-2xl transition-all btn-press cursor-pointer hover:scale-105"
        >
          <span>{t('home.clickToContinue', 'Enter Operational Console')}</span>
          <ArrowRight className="w-4 h-4 text-slate-950" />
        </button>
        <p className="mt-2 text-[11px] text-slate-400 font-mono tracking-wider uppercase pointer-events-none">
          {t('home.pressKey', 'Tap screen or press any key to enter operational console')}
        </p>
      </motion.div>
    </motion.div>
  );
};

