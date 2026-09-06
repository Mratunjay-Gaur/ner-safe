import { IncidentReportItem, IncidentStatus } from './incident';
import { RiskLevel } from './risk';

export type EmergencyPriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface EmergencyPriorityItem {
  id: string;
  sourceType: 'INCIDENT_REPORT' | 'HIGH_RISK_DISTRICT' | 'HISTORICAL_HOTSPOT';
  priorityLevel: EmergencyPriorityLevel;
  priorityScore: number; // 0 to 100 composite emergency priority score
  riskScore: number; // 0 to 100 multi-factor environmental risk score
  riskLevel: RiskLevel;
  locationName: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  incidentType?: string;
  affectedRoads: string[];
  nearbyInfrastructureOrVillage?: string;
  mainReason: string;
  status: IncidentStatus | 'ACTIVE MONITORING' | 'EVALUATING';
  lastUpdated: string;
  sourceIncident?: IncidentReportItem;
  telemetryDetails?: {
    currentPrecipitationMm?: number;
    soilSaturationPercent?: number;
    slopeDegrees?: number;
    historicalLandslideCount?: number;
  };
}

export interface EmergencyPrioritySummary {
  totalMonitored: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  topPriorityItem: EmergencyPriorityItem | null;
  items: EmergencyPriorityItem[];
}
