import mongoose, { Schema, Document } from 'mongoose';

export interface IIncident {
  id?: string;
  reportId: string;
  incidentType: string;
  latitude: number;
  longitude: number;
  locationName: string;
  photoUrls: string[];
  videoUrl: string;
  description: string;
  submittedAt: Date | string;
  status: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IIncidentDoc extends Document {
  reportId: string;
  incidentType: string;
  latitude: number;
  longitude: number;
  locationName: string;
  photoUrls: string[];
  videoUrl: string;
  description: string;
  submittedAt: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const IncidentSchema = new Schema<any>(
  {
    reportId: { type: String, index: true },
    incidentType: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    locationName: { type: String, default: 'Not specified' },
    photoUrls: [{ type: String }],
    videoUrl: { type: String, default: '' },
    description: { type: String },
    submittedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      default: 'SUBMITTED',
    },
  },
  { timestamps: true, collection: 'incidents', strict: false }
);

export const Incident =
  (mongoose.models.Incident as mongoose.Model<any>) ||
  mongoose.model<any>('Incident', IncidentSchema, 'incidents');

export default Incident;
