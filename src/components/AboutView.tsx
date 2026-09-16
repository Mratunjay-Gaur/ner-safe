import React from 'react';
import { useTranslation } from 'react-i18next';
import { WEBSITE_LOGO_URL } from './NerSafeLogo';
import {
  ShieldCheck,
  MapPin,
  Compass,
  CloudRain,
  Radio,
  FileCheck,
  Layers,
  Users,
} from 'lucide-react';
import { NER_STATES } from '../data/indiaLocations';

export const AboutView: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div id="about-page-view" className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <img
            src={WEBSITE_LOGO_URL}
            alt="NER-SAFE Mountain Silhouette Logo"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.endsWith('/nersafe-symbol.png')) {
                target.src = '/nersafe-symbol.png';
              }
            }}
            className="w-16 h-16 object-contain shrink-0 rounded-2xl bg-white border border-slate-200 p-2 shadow-xs"
          />
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {t('about.title', 'About NER-SAFE')}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
              {t('about.subtitle', 'Integrated Landslide & Weather Early Warning System for the 8 North Eastern Region (NER) States of India.')}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Platform Purpose */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-sky-700 font-bold text-xs uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>{t('about.mission', 'Platform Mission')}</span>
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-2">
            {t('about.protectingTitle', 'Protecting Lives & Terrain Infrastructure')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {t('about.missionDesc', 'The North Eastern Region of India experiences some of the highest precipitation levels globally, rendering steep hill slopes vulnerable to catastrophic slope failures and flash floods. NER-SAFE bridges telemetry gaps by delivering real-time localized weather monitoring, multi-factor landslide risk computation, citizen incident crowdsourcing, and emergency early alerts to both residents and disaster management authorities.')}
          </p>
        </div>
      </div>

      {/* 3. Core Capabilities */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
          {t('about.keyCapabilities', 'Key Capabilities')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center mb-3">
              <CloudRain className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 mb-1">{t('about.liveFeed', 'Live Meteorological Feed')}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t('about.liveFeedDesc', 'Real-time precipitation rates, humidity, wind velocity, and multi-day district weather forecasting.')}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
              <Compass className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 mb-1">{t('about.riskEngine', 'Multi-Factor Risk Engine')}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t('about.riskEngineDesc', 'Synthesizes rainfall intensity, slope gradient, soil moisture, and historic landslide proximity into transparent hazard scores.')}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center mb-3">
              <FileCheck className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 mb-1">{t('about.reporting', 'Ground Incident Reporting')}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t('about.reportingDesc', 'Crowdsourced reporting enabling residents and field workers to submit geolocated hazard reports with photo and video evidence.')}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
              <Radio className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-900 mb-1">{t('about.alerts', 'Emergency Alert Dispatch')}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t('about.alertsDesc', 'Targeted emergency notification system delivering multi-channel SMS and email warnings directly to affected district residents.')}
            </p>
          </div>
        </div>
      </div>

      {/* 4. North Eastern Region Coverage */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-sky-700" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            {t('about.nerCoverage', 'North Eastern Region (NER) Coverage')}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
          {t('about.nerCoverageDesc', 'Comprehensive administrative coverage spanning all 8 North Eastern States and their respective revenue districts:')}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {NER_STATES.map((stateName) => (
            <div
              key={stateName}
              className="p-3 bg-slate-50 hover:bg-sky-50/60 border border-slate-200 rounded-xl transition-colors"
            >
              <span className="text-xs font-bold text-slate-800 block">{stateName}</span>
              <span className="text-[11px] text-slate-500">{t('about.activeMonitoring', 'Active Monitoring')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Scientific Data Sources & Methodology */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-sky-700" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            {t('about.sources', 'Scientific Data Sources & Architecture')}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-1">{t('about.atmo', 'Atmospheric & Precipitation')}</h3>
            <p className="text-slate-600 leading-relaxed">
              {t('about.atmoDesc', 'Global and regional meteorological assimilation models providing hourly precipitation, temperature, humidity, and atmospheric pressure.')}
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-1">{t('about.topo', 'Topographic & Hydrological')}</h3>
            <p className="text-slate-600 leading-relaxed">
              {t('about.topoDesc', 'High-resolution digital elevation models (DEM) for slope gradient analysis, combined with volumetric soil moisture saturation estimates.')}
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-1">{t('about.geo', 'Geological Catalogs')}</h3>
            <p className="text-slate-600 leading-relaxed">
              {t('about.geoDesc', 'Authoritative historical landslide event databases mapping known landslide vulnerability zones and fault line corridors across the region.')}
            </p>
          </div>
        </div>
      </div>

      {/* 6. Project & Team Information */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-sky-700" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            {t('about.initiative', 'Project Initiative')}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          {t('about.initiativeDesc', 'Developed as part of the Smart India Hackathon 2026 initiative for disaster resilience and public safety. NER-SAFE is designed to support state disaster management authorities (SDMA), district administrations (DDMA), first responders, and local communities across Northeast India.')}
        </p>
      </div>
    </div>
  );
};
