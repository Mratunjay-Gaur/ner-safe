export interface LocationItem {
  id: string;
  name: string;
  state: string;
  stateCode: string;
  latitude: number;
  longitude: number;
  isNer: boolean;
  elevationMeters?: number;
}

export interface StateItem {
  name: string;
  code: string;
  isNer: boolean;
  capitalDistrict: string;
  districts: LocationItem[];
}

export interface CurrentWeather {
  temperature: number; // in °C
  apparentTemperature: number; // feels like in °C
  relativeHumidity: number; // in %
  windSpeed: number; // in km/h
  windDirection: number; // in degrees
  windDirectionCardinal: string; // N, NE, E, SE, etc.
  surfacePressure: number; // in hPa
  visibility: number; // in km or m
  cloudCover: number; // in %
  precipitation: number; // in mm
  uvIndex?: number;
  weatherCode: number;
  weatherCondition: string;
  isDay: boolean;
  updatedAt: string; // ISO string
  dataSource: string;
}

export interface HourlyForecastItem {
  time: string; // ISO or formatted
  timestamp: number;
  temperature: number; // °C
  precipitation: number; // mm
  precipitationProbability?: number; // %
  relativeHumidity: number; // %
  weatherCode: number;
  weatherCondition: string;
  windSpeed: number; // km/h
  isDay: boolean;
}

export interface DailyForecastItem {
  date: string; // YYYY-MM-DD
  dayName: string; // Mon, Tue, etc.
  temperatureMax: number; // °C
  temperatureMin: number; // °C
  precipitationSum: number; // mm
  precipitationProbabilityMax?: number; // %
  windSpeedMax: number; // km/h
  weatherCode: number;
  weatherCondition: string;
  sunrise?: string;
  sunset?: string;
  uvIndexMax?: number;
}

export interface WeatherAlert {
  id: string;
  severity: 'Advisory' | 'Watch' | 'Warning' | 'Severe';
  event: string;
  description: string;
  startTime: string;
  endTime: string;
  source: string;
  areaDesc?: string;
}

export interface ClimateHistoryPoint {
  time: string;
  dateStr: string;
  temperature: number;
  precipitation: number;
  humidity: number;
}

export interface WeatherResponse {
  location: {
    district: string;
    state: string;
    latitude: number;
    longitude: number;
    elevation?: number;
    isNer: boolean;
  };
  current: CurrentWeather;
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
  alerts: WeatherAlert[];
  history?: ClimateHistoryPoint[];
  status: {
    weatherApiConnected: boolean;
    provider: string;
    cached: boolean;
    isStale?: boolean;
    lastUpdated: string;
  };
}

export interface NerStateSummary {
  state: string;
  capitalDistrict: string;
  latitude: number;
  longitude: number;
  temperature: number | null;
  weatherCondition: string;
  weatherCode: number;
  hasAlert: boolean;
  alertCount: number;
  updatedAt: string;
  isCached?: boolean;
  isStale?: boolean;
}

export interface SystemStatusInfo {
  weatherApiStatus: 'Connected' | 'Degraded' | 'Unavailable';
  weatherProviderName: string;
  mapServiceStatus: 'Connected' | 'Degraded' | 'Unavailable';
  mapProviderName: string;
  databaseStatus?: 'Connected' | 'Pending Whitelist' | 'Unavailable' | string;
  databaseCluster?: string;
  activeDatasetDistrictsCount: number;
  activeNerStatesCount: number;
  lastUpdated: string;
  cacheStatus: string;
}
