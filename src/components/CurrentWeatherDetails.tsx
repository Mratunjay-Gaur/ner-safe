import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Thermometer,
  Droplets,
  Wind,
  Compass,
  Gauge,
  Eye,
  Cloud,
  CloudRain,
} from 'lucide-react';
import { CurrentWeather } from '../types/weather';

interface CurrentWeatherDetailsProps {
  current: CurrentWeather;
}

export const CurrentWeatherDetails: React.FC<CurrentWeatherDetailsProps> = ({ current }) => {
  const { t } = useTranslation();
  const metricCards = [
    {
      id: 'metric-temp',
      label: t('weather.temperature', 'Temperature'),
      value: `${current.temperature}°C`,
      subtext: `${t('weather.feelsLike', 'Feels like')} ${current.apparentTemperature}°C`,
      icon: <Thermometer className="w-4 h-4 text-rose-500" />,
      highlight: false,
    },
    {
      id: 'metric-humidity',
      label: t('weather.humidity', 'Humidity'),
      value: `${current.relativeHumidity}%`,
      subtext: current.relativeHumidity > 80 ? t('weather.highMoisture', 'High Moisture') : t('weather.nominalLevel', 'Normal'),
      icon: <Droplets className="w-4 h-4 text-blue-500" />,
      highlight: false,
    },
    {
      id: 'metric-wind-speed',
      label: t('weather.windSpeed', 'Wind Speed'),
      value: `${current.windSpeed} km/h`,
      subtext: current.windSpeed > 30 ? t('weather.gusty', 'Gusty') : t('weather.gentleBreeze', 'Gentle Breeze'),
      icon: <Wind className="w-4 h-4 text-teal-600" />,
      highlight: false,
    },
    {
      id: 'metric-wind-dir',
      label: t('weather.windVector', 'Wind Vector'),
      value: `${current.windDirectionCardinal} (${current.windDirection}°)`,
      subtext: t('weather.azimuthVector', 'Azimuth Vector'),
      icon: <Compass className="w-4 h-4 text-indigo-500" />,
      highlight: false,
    },
    {
      id: 'metric-precipitation',
      label: t('weather.precipitation', 'Precipitation'),
      value: `${current.precipitation} mm`,
      subtext: current.precipitation > 0 ? t('weather.activeRain', 'Active Rain') : t('weather.noRain', 'No Rain'),
      icon: <CloudRain className="w-4 h-4 text-blue-600" />,
      highlight: current.precipitation > 0,
    },
    {
      id: 'metric-pressure',
      label: t('weather.barometric', 'Barometric'),
      value: `${current.surfacePressure} hPa`,
      subtext: t('weather.pressure', 'Surface Pressure'),
      icon: <Gauge className="w-4 h-4 text-slate-600" />,
      highlight: false,
    },
    {
      id: 'metric-visibility',
      label: t('weather.visibility', 'Visibility'),
      value: `${current.visibility} km`,
      subtext: current.visibility < 3 ? t('weather.lowVisibility', 'Low Visibility') : t('weather.clearSight', 'Clear Sight'),
      icon: <Eye className="w-4 h-4 text-amber-600" />,
      highlight: false,
    },
    {
      id: 'metric-cloud-cover',
      label: t('weather.cloudCover', 'Cloud Cover'),
      value: `${current.cloudCover}%`,
      subtext: current.cloudCover > 70 ? t('weather.overcast', 'Overcast') : t('weather.scattered', 'Scattered'),
      icon: <Cloud className="w-4 h-4 text-slate-500" />,
      highlight: false,
    },
  ];

  return (
    <div id="current-weather-details-section">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {t('weather.telemetryChannels', 'Telemetry Channels')}
        </span>
        <span className="text-[10px] text-slate-400 font-mono font-medium">
          {t('weather.source', 'Source')}: {current.dataSource}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {metricCards.map((card) => (
          <div
            key={card.id}
            id={card.id}
            className={`p-3 rounded-xl border transition-all ${
              card.highlight
                ? 'bg-sky-50/80 border-sky-200/90 shadow-2xs'
                : 'bg-slate-50/70 border-slate-200/60 hover:bg-white hover:shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                {card.label}
              </span>
              <div className="shrink-0">{card.icon}</div>
            </div>

            <div className="text-sm font-extrabold text-slate-900 tracking-tight font-mono">
              {card.value}
            </div>

            <div className="text-[10px] font-medium text-slate-500 mt-1 truncate">
              {card.subtext}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
