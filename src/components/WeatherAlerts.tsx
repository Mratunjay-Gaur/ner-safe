import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Clock } from 'lucide-react';
import { WeatherAlert } from '../types/weather';
import { formatTime } from '../utils/weatherUtils';

interface WeatherAlertsProps {
  alerts: WeatherAlert[];
  locationName: string;
}

export const WeatherAlerts: React.FC<WeatherAlertsProps> = ({ alerts, locationName }) => {
  return (
    <div id="weather-alerts-section">
      {alerts && alerts.length > 0 ? (
        <div className="space-y-2.5">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-4 rounded-xl bg-amber-50/90 border border-amber-200/90 text-amber-900 shadow-2xs transition-all"
            >
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>WEATHER ALERT • {alert.severity}</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-1.5">
                {alert.event}
              </h3>
              <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
                {alert.description}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-amber-800/80 mt-2 font-medium">
                <Clock className="w-3 h-3 text-amber-700" />
                <span>Valid: {formatTime(alert.startTime)} – {formatTime(alert.endTime)}</span>
                <span>• {alert.source}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <div>
              <span className="text-xs font-bold text-slate-800 block leading-tight">
                No active weather alerts
              </span>
              <span className="text-[11px] text-slate-400">
                Nominal seasonal parameters in {locationName}
              </span>
            </div>
          </div>
          <span className="text-[9px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Nominal
          </span>
        </div>
      )}
    </div>
  );
};
