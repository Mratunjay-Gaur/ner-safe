import { LocationItem } from './weather';
import { DataSourceType } from './environmental';

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface RiskFactorContribution {
  id: string;
  name: string;
  category: 'Terrain & Topography' | 'Hydrological & Soil' | 'Atmospheric Trigger' | 'Forecast Precipitation' | 'Historical Susceptibility' | 'Field Observations';
  measuredValue: string | number;
  unit: string;
  normalizedScore: number; // 0 to 100
  weightPercent: number; // e.g. 25
  weightedContributionPoints: number; // (normalizedScore * weightPercent) / 100
  sourceType: DataSourceType | 'DATABASE';
  isAvailable: boolean;
  statusText: string;
  driverDescription: string;
}

export interface RiskForecastWindow {
  windowId: 'current' | '6h' | '12h' | '24h';
  label: string;
  timeRange: string;
  riskScore: number;
  riskLevel: RiskLevel;
  expectedPrecipitationMm: number;
  precipitationProbabilityMax: number;
  projectedSoilSaturation: number;
  primaryDriver: string;
  status: 'ESTIMATED_FROM_ECMWF_FORECAST';
}

export interface DataCompletenessStatus {
  totalSourcesCount: number;
  availableSourcesCount: number;
  completenessPercent: number;
  missingSources: string[];
  confidenceLevel: 'HIGH CONFIDENCE' | 'MODERATE CONFIDENCE' | 'LIMITED CONFIDENCE (DATA GAPS)';
  uncertaintyNotes: string;
}

export interface CalculatedRiskAssessment {
  location: LocationItem;
  riskScore: number; // 0 to 100
  riskLevel: RiskLevel;
  assessmentStatement: string;
  safetyDisclaimer: string;
  factors: RiskFactorContribution[];
  forecastWindows: RiskForecastWindow[];
  dataCompleteness: DataCompletenessStatus;
  calculatedAt: string;
  calculationMethod: string;
}

export interface RiskAiExplanation {
  available: boolean;
  message?: string;
  summary?: string;
  riskReasoning?: string;
  topContributingFactors?: string[];
  uncertaintyNotes?: string;
  monitoringRecommendation?: string;
  modelUsed?: string;
  generatedAt?: string;
  error?: string;
}

export interface DistrictHeatmapPoint {
  districtId: string;
  districtName: string;
  state: string;
  stateCode: string;
  latitude: number;
  longitude: number;
  elevationMeters: number;
  riskScore: number | null;
  riskLevel: RiskLevel | 'UNAVAILABLE';
  assessmentStatement: string;
  lastUpdated: string | null;
  status: 'READY' | 'LOADING' | 'UNAVAILABLE';
  dataAvailabilityNotes?: string;
  slopeDegrees?: number;
  soilSaturationPercent?: number;
  currentPrecipitationMm?: number;
  forecastPrecipitationMm?: number;
  historicalLandslideCount?: number;
  fullAssessment?: CalculatedRiskAssessment | null;
}

export interface NerRiskHeatmapState {
  districts: DistrictHeatmapPoint[];
  isLoading: boolean;
  progress: number; // 0 to 100
  lastRefreshed: string | null;
  isLive: boolean;
  totalDistricts: number;
  loadedDistricts: number;
  stats: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
    unavailable: number;
  };
}

