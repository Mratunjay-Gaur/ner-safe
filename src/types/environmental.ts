import { LocationItem } from './weather';

export type DataSourceType = 'LIVE' | 'UPDATED' | 'STATIC' | 'HISTORICAL';

export interface DataSourceStatus {
  id: string;
  name: string;
  source: string;
  type: DataSourceType;
  frequency?: string;
  lastObservation: string;
  coverage: string;
  resolution: string;
  status: 'Connected' | 'Active' | 'Degraded' | 'Offline';
  latencyMs?: number;
  notes?: string;
}

export interface HistoricalLandslideRecord {
  id: string;
  district: string;
  state: string;
  locationName: string;
  latitude: number;
  longitude: number;
  date: string; // YYYY-MM-DD or date string
  year: number;
  trigger: 'Monsoon Heavy Rainfall' | 'Cloudburst' | 'Cyclonic Depression' | 'Flash Flood & Riverbank Erosion' | 'Road Cutting / Anthropogenic' | 'Continuous Rain';
  landslideType: 'Debris Flow' | 'Rockfall' | 'Mudslide' | 'Rotational Slide' | 'Complex Slide' | 'Slope Failure';
  fatalities?: number;
  injuries?: number;
  impactDescription: string;
  catalogSource: 'Geological Survey of India (GSI) NLSM' | 'NASA Global Landslide Catalog (GLC)' | 'ISRO Bhuvan Landslide Inventory' | 'State Disaster Management Authority (SDMA)';
  sourceReferenceId: string;
}

export interface SoilMoistureData {
  depth0to7cm: number; // m³/m³ volumetric
  depth7to28cm: number; // m³/m³ volumetric
  depth28to100cm: number; // m³/m³ volumetric
  depth100to255cm: number; // m³/m³ volumetric
  soilTemperature0to7cm: number; // °C
  evapotranspiration: number; // mm
  surfaceSaturationPercent: number; // 0 - 100 % calculated from porosity
  moistureClassification: 'Very Dry' | 'Low Moisture' | 'Moderate / Optimal' | 'High / Wet' | 'Saturated / Over-saturated';
  observationTimestamp: string;
  dataSource: string;
  sourceType: DataSourceType;
}

export interface TerrainSlopeData {
  elevationMeters: number;
  minElevationNearby: number;
  maxElevationNearby: number;
  elevationDifferential: number;
  calculatedSlopeDegrees: number;
  slopePercentage: number;
  aspectCardinal: string; // e.g. 'N', 'NE', 'SW'
  aspectDegrees: number;
  terrainCategory: 'Valley Plain' | 'Gentle Hill' | 'Moderate Slope' | 'Steep Slope' | 'Very Steep Escarpment' | 'High Alpine Ridge';
  demSource: string;
  spatialResolution: string;
  computationMethod: string;
}

export interface SatelliteObservationData {
  satelliteName: string;
  sensor: string;
  constellation: string;
  latestAcquisitionDate: string;
  revisitInterval: string;
  cloudCoverPercentage: number;
  spatialResolution: string;
  utmZone: string;
  granuleOrTileId: string;
  sourceType: DataSourceType;
  dataProvider: string;
  imageryLayerAvailable: boolean;
}

export interface DistrictEnvironmentalProfile {
  location: LocationItem;
  soilMoisture: SoilMoistureData | null;
  terrainSlope: TerrainSlopeData;
  satelliteObservation: SatelliteObservationData;
  historicalLandslides: HistoricalLandslideRecord[];
  nearbyLandslideCount: number;
  sourcesStatus: DataSourceStatus[];
  lastRefreshed: string;
}
