import { CurrentWeather, HourlyForecastItem, DailyForecastItem, WeatherAlert } from './weather';

export type NeighborCountryId = 'bangladesh' | 'bhutan' | 'china' | 'myanmar' | 'nepal';

export interface ConnectedNerState {
  state: string; // e.g., 'Assam', 'Meghalaya'
  borderLengthKm: number; // approximate length of international boundary
  sharedRiversBasins: string[]; // e.g., ['Surma-Kushiyara', 'Barak River']
  terrainType: string; // e.g., 'Subtropical Foothills & Escarpments'
  vulnerabilitySummary: string; // description of transboundary weather impacts
}

export interface BorderStation {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  isCapital?: boolean;
  borderContext: string; // Why this station matters to NER border
}

export interface BorderCountryMeta {
  id: NeighborCountryId;
  name: string;
  officialName: string;
  flag: string; // Emoji flag, e.g., 🇧🇩
  countryCode: string; // BD, BT, CN, MM, NP
  capital: string;
  totalNerBorderKm: number;
  connectedNerStates: ConnectedNerState[];
  primaryCoordinates: {
    latitude: number;
    longitude: number;
  };
  stations: BorderStation[];
  crossBorderHydrologyNote: string;
}

export type CrossBorderAlertLevel = 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

export interface CrossBorderAlert {
  id: string;
  countryId: NeighborCountryId;
  countryName: string;
  level: CrossBorderAlertLevel;
  event: string;
  severity: 'Advisory' | 'Watch' | 'Warning' | 'Severe';
  description: string;
  affectedBorderStates: string[];
  relevanceExplanation: string;
  detectedAt: string;
}

export interface CrossBorderWeatherData {
  country: BorderCountryMeta;
  activeStation: BorderStation;
  current: CurrentWeather;
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
  alerts: CrossBorderAlert[];
  crossBorderRelevanceScore: number; // 0 - 100
  crossBorderRelevanceLevel: CrossBorderAlertLevel;
  crossBorderRelevanceNote: string;
  upstreamRainfallStatus: 'Minimal' | 'Moderate' | 'Heavy' | 'Extreme';
  transboundaryWindImpact: string;
  lastUpdated: string;
}
