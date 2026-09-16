import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown, Sparkles } from 'lucide-react';
import { SUPPORTED_LANGUAGES_META, SupportedLanguageCode } from '../i18n';

interface LanguageSelectorProps {
  compact?: boolean;
  className?: string;
  showBadge?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  compact = false,
  className = '',
  showBadge = true,
}) => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLangCode = (i18n.language || 'en').slice(0, 3) as SupportedLanguageCode;
  const currentMeta =
    SUPPORTED_LANGUAGES_META.find((l) => l.code === currentLangCode) ||
    SUPPORTED_LANGUAGES_META.find((l) => i18n.language.startsWith(l.code)) ||
    SUPPORTED_LANGUAGES_META[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`} id="language-selector-container">
      <button
        id="language-selector-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={t('header.switchLanguage', 'Switch Language (8 Languages Available)')}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-950 bg-white/95 hover:bg-slate-100/90 border border-slate-200/80 shadow-2xs transition-all btn-press cursor-pointer group"
      >
        <Globe className="w-3.5 h-3.5 text-sky-600 shrink-0 group-hover:rotate-12 transition-transform duration-200" />
        
        {showBadge && (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-sky-100 text-sky-800 text-[10px] font-bold border border-sky-200/60 font-mono">
            8-Lang
          </span>
        )}

        <span className="font-semibold text-slate-800 flex items-center gap-1">
          <span className="text-xs">{currentMeta.flag}</span>
          <span className="truncate max-w-[70px] sm:max-w-none">{currentMeta.nativeName}</span>
        </span>

        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          id="language-dropdown-menu"
          className="absolute right-0 mt-2 w-72 rounded-2xl bg-white/98 backdrop-blur-xl border border-slate-200 shadow-xl py-2.5 z-50 animate-in fade-in zoom-in-95 duration-150"
          role="listbox"
          aria-label={t('header.switchLanguage', 'Switch Language')}
        >
          <div className="px-3.5 py-2 border-b border-slate-100 mb-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-sky-600" />
                <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">
                  8 Regional Languages
                </span>
              </div>
              <span className="text-[10px] bg-sky-50 text-sky-700 font-bold px-1.5 py-0.5 rounded-full border border-sky-200/60 font-mono">
                8 Locales
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 leading-tight">
              Full native translations for North East India & National emergency ops
            </p>
          </div>

          <div className="max-h-[340px] overflow-y-auto px-1.5 py-0.5 space-y-1">
            {SUPPORTED_LANGUAGES_META.map((lang) => {
              const isSelected = currentMeta.code === lang.code;
              return (
                <button
                  key={lang.code}
                  id={`lang-opt-${lang.code}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50 text-sky-950 font-bold border border-sky-200 shadow-2xs'
                      : 'text-slate-700 hover:text-slate-950 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm shrink-0">{lang.flag}</span>
                      <span className="font-bold text-slate-900 truncate">
                        {lang.nativeName}
                      </span>
                      {lang.nativeName !== lang.name && (
                        <span className="text-[11px] text-slate-400 font-normal truncate">
                          ({lang.name})
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium pl-6 truncate">
                      {lang.region}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Responsive 8-Language Quick Switcher Pill Strip for the Nav Bar
 */
export const EightLangPillStrip: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { i18n } = useTranslation();
  const currentLangCode = (i18n.language || 'en').slice(0, 3);

  return (
    <div
      id="eight-lang-navbar-pill-strip"
      className={`inline-flex items-center gap-1 p-1 bg-slate-100/90 border border-slate-200/90 rounded-xl shadow-2xs ${className}`}
      title="8 Regional Languages Quick Switcher"
    >
      <div className="flex items-center gap-1 pl-1 pr-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 border-r border-slate-200">
        <Globe className="w-3 h-3 text-sky-600 shrink-0" />
        <span className="font-mono text-sky-700">8-Lang</span>
      </div>

      <div className="flex items-center gap-0.5">
        {SUPPORTED_LANGUAGES_META.map((lang) => {
          const isSelected = currentLangCode === lang.code || i18n.language.startsWith(lang.code);
          return (
            <button
              key={lang.code}
              id={`quick-lang-btn-${lang.code}`}
              type="button"
              onClick={() => i18n.changeLanguage(lang.code)}
              title={`${lang.nativeName} (${lang.name}) — ${lang.region}`}
              className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                isSelected
                  ? 'bg-sky-600 text-white shadow-xs scale-105'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <span className="text-[10px]">{lang.flag}</span>
              <span className="uppercase tracking-tight">{lang.code}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * 8-Language Grid Display for Home and Navigation Sidebar
 */
export const EightLangGrid: React.FC<{
  variant?: 'light' | 'dark' | 'glass';
  onSelect?: (code: string) => void;
  className?: string;
}> = ({ variant = 'light', onSelect, className = '' }) => {
  const { i18n, t } = useTranslation();
  const currentLangCode = (i18n.language || 'en').slice(0, 3);

  const handleChoose = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    i18n.changeLanguage(code);
    if (onSelect) onSelect(code);
  };

  const isDark = variant === 'dark';
  const isGlass = variant === 'glass';

  return (
    <div
      id="eight-lang-grid-component"
      className={`w-full rounded-2xl p-3 sm:p-4 ${
        isGlass
          ? 'bg-black/40 border border-white/20 backdrop-blur-md text-white'
          : isDark
          ? 'bg-slate-900/90 border border-slate-800 text-white'
          : 'bg-white border border-slate-200 shadow-xs text-slate-900'
      } ${className}`}
    >
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 border-slate-200/60">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-sky-500/20 text-sky-400">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold tracking-tight">
                {t('common.regionalLocales', '8 Regional Languages')}
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
                <Sparkles className="w-2.5 h-2.5" />
                8-LANG LIVE
              </span>
            </div>
            <p className={`text-[10px] sm:text-[11px] mt-0.5 ${isDark || isGlass ? 'text-slate-300/80' : 'text-slate-500'}`}>
              Assam, Meghalaya, Manipur, Mizoram, Tripura, Sikkim, Hills & National
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SUPPORTED_LANGUAGES_META.map((lang) => {
          const isSelected = currentLangCode === lang.code || i18n.language.startsWith(lang.code);
          return (
            <button
              key={lang.code}
              id={`eight-lang-card-${lang.code}`}
              type="button"
              onClick={(e) => handleChoose(lang.code, e)}
              className={`flex flex-col items-start p-2.5 rounded-xl text-left transition-all cursor-pointer btn-press border ${
                isSelected
                  ? isGlass
                    ? 'bg-sky-500/30 border-sky-400 text-white shadow-lg ring-1 ring-sky-400'
                    : isDark
                    ? 'bg-sky-500/20 border-sky-400 text-white shadow-xs'
                    : 'bg-sky-50 border-sky-300 text-sky-950 shadow-xs'
                  : isGlass
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200 hover:text-white'
                  : isDark
                  ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-300 hover:text-white'
                  : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/80 text-slate-700 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-base">{lang.flag}</span>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                    isSelected
                      ? 'bg-sky-500 text-white'
                      : isDark || isGlass
                      ? 'bg-white/10 text-slate-300'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {lang.code}
                </span>
              </div>

              <span className="text-xs sm:text-sm font-bold tracking-tight truncate w-full">
                {lang.nativeName}
              </span>

              <span
                className={`text-[10px] truncate w-full ${
                  isSelected
                    ? isGlass ? 'text-sky-200' : 'text-sky-800 font-semibold'
                    : isDark || isGlass ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {lang.name}
              </span>

              <span
                className={`text-[9px] mt-1 truncate w-full ${
                  isSelected
                    ? isGlass ? 'text-sky-300' : 'text-sky-600 font-medium'
                    : isDark || isGlass ? 'text-slate-400/80' : 'text-slate-400'
                }`}
              >
                {lang.region}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

