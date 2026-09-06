import React from 'react';
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
  const metricCards = [
    {
      id: 'metric-temp',
      label: 'Temperature',
      value: `${current.temperature}°C`,
      subtext: `Feels like ${current.apparentTemperature}°C`,
      icon: <Thermometer className="w-4 h-4 text-rose-500" />,
      highlight: false,
    },
    {
      id: 'metric-humidity',
      label: 'Humidity',
      value: `${current.relativeHumidity}%`,
      subtext: current.relativeHumidity > 80 ? 'High Moisture' : 'Normal',
      icon: <Droplets className="w-4 h-4 text-blue-500" />,
      highlight: false,
    },
    {
      id: 'metric-wind-speed',
      label: 'Wind Speed',
      value: `${current.windSpeed} km/h`,
      subtext: current.windSpeed > 30 ? 'Gusty' : 'Gentle Breeze',
      icon: <Wind className="w-4 h-4 text-teal-600" />,
      highlight: false,
    },
    {
      id: 'metric-wind-dir',
      label: 'Wind Vector',
      value: `${current.windDirectionCardinal} (${current.windDirection}°)`,
      subtext: 'Azimuth Vector',
      icon: <Compass className="w-4 h-4 text-indigo-500" />,
      highlight: false,
    },
    {
      id: 'metric-precipitation',
      label: 'Precipitation',
      value: `${current.precipitation} mm`,
      subtext: current.precipitation > 0 ? 'Active Rain' : 'No Rain',
      icon: <CloudRain className="w-4 h-4 text-blue-600" />,
      highlight: current.precipitation > 0,
    },
    {
      id: 'metric-pressure',
      label: 'Barometric',
      value: `${current.surfacePressure} hPa`,
      subtext: 'Surface Pressure',
      icon: <Gauge className="w-4 h-4 text-slate-600" />,
      highlight: false,
    },
    {
      id: 'metric-visibility',
      label: 'Visibility',
      value: `${current.visibility} km`,
      subtext: current.visibility < 3 ? 'Low Visibility' : 'Clear Sight',
      icon: <Eye className="w-4 h-4 text-amber-600" />,
      highlight: false,
    },
    {
      id: 'metric-cloud-cover',
      label: 'Cloud Cover',
      value: `${current.cloudCover}%`,
      subtext: current.cloudCover > 70 ? 'Overcast' : 'Scattered',
      icon: <Cloud className="w-4 h-4 text-slate-500" />,
      highlight: false,
    },
  ];

  return (
    <div id="current-weather-details-section" className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Atmospheric Telemetry Grid
        </h3>
        <span className="text-[10px] text-slate-400 font-medium">
          Source: {current.dataSource}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {metricCards.map((card) => (
          <div
            key={card.id}
            id={card.id}
            className={`p-3 rounded-lg border transition-all ${
              card.highlight
                ? 'bg-blue-50/70 border-blue-200 shadow-2xs'
                : 'bg-slate-50/80 border-slate-100 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate">
                {card.label}
              </span>
              <div className="shrink-0">{card.icon}</div>
            </div>

            <div className="text-base font-extrabold text-slate-900 tracking-tight">
              {card.value}
            </div>

            <div className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">
              {card.subtext}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
