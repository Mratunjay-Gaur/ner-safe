import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Clock } from 'lucide-react';
import { WeatherAlert } from '../types/weather';
import { formatTime } from '../utils/weatherUtils';

interface WeatherAlertsProps {
  alerts: WeatherAlert[];
  locationName: string;
}

export const WeatherAlerts: React.FC<WeatherAlertsProps> = ({ alerts, locationName }) => {
  const { t } = useTranslation();
  return (
    <div id="weather-alerts-section">
      {alerts && alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 backdrop-blur-md border border-amber-200/90 text-amber-950 shadow-xs transition-all"
            >
              <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                <span className="p-1 rounded-md bg-amber-100 text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </span>
                <span>{t('weather.bulletin', 'METEOROLOGICAL BULLETIN')} • {alert.severity}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-2">
                {alert.event}
              </h3>
              <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
                {alert.description}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-amber-800/80 mt-3 font-medium font-mono">
                <Clock className="w-3 h-3 text-amber-700" />
                <span>{t('weather.valid', 'Valid')}: {formatTime(alert.startTime)} – {formatTime(alert.endTime)}</span>
                <span>• {alert.source}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-3 h-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block leading-tight">
                {t('weather.noActiveWarnings', 'No active meteorological warnings')}
              </span>
              <span className="text-[11px] text-slate-400">
                {t('weather.nominalParameters', 'Nominal atmospheric parameters recorded in')} {locationName}
              </span>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80 font-mono">
            {t('weather.nominal', 'Nominal')}
          </span>
        </div>
      )}
    </div>
  );
};
