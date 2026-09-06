export type IncidentType =
  | 'Landslide'
  | 'Ground Crack'
  | 'Slope Movement'
  | 'Rockfall'
  | 'Blocked Road'
  | 'Water Seepage'
  | 'Flash Flood'
  | 'Road Blockage'
  | 'Slope Cracking'
  | 'Mudslide'
  | 'Subsidence'
  | 'River Bank Erosion'
  | 'Other';

export type IncidentStatus = 'SUBMITTED' | 'UNDER REVIEW' | 'UNDER_REVIEW' | 'VERIFIED' | 'RESOLVED';

export interface IncidentReportSubmission {
  incidentType: IncidentType;
  latitude: number;
  longitude: number;
  locationName?: string;
  description: string;
  photo?: File | null;
  video?: File | null;
  submittedAt: string;
}

export interface IncidentReportItem {
  id?: string;
  reportId: string;
  incidentType: IncidentType | string;
  latitude: number;
  longitude: number;
  locationName: string;
  photoUrls: string[];
  videoUrl?: string;
  description: string;
  submittedAt: string;
  status: IncidentStatus;
  createdAt?: string;
  updatedAt?: string;
}

export type IIncidentReport = IncidentReportItem;

export interface IncidentReportResponse {
  success: boolean;
  reportId: string;
  incidentType: IncidentType | string;
  latitude: number;
  longitude: number;
  locationName: string;
  photoUrls: string[];
  videoUrl?: string;
  description: string;
  submittedAt: string;
  status: IncidentStatus;
  createdAt?: string;
  updatedAt?: string;
}

