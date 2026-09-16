import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { IUserRecord } from './userService.ts';
import { IIncident } from '../models/Incident.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const INCIDENTS_FILE = path.join(DATA_DIR, 'incidents.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Zero dummy data: initialize with empty arrays strictly
const INITIAL_USERS: IUserRecord[] = [];
const INITIAL_INCIDENTS: IIncident[] = [];

// Initialize storage files if not existing
export function initLocalStore() {
  ensureDataDir();

  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }

  if (!fs.existsSync(INCIDENTS_FILE)) {
    fs.writeFileSync(INCIDENTS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

// -------------------------------------------------------------
// USER OPERATIONS
// -------------------------------------------------------------

export function readLocalUsers(): IUserRecord[] {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) {
    initLocalStore();
  }
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err: any) {
    console.warn('[LocalStore] Error reading users.json:', err.message);
    return INITIAL_USERS;
  }
}

export function writeLocalUsers(users: IUserRecord[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err: any) {
    console.error('[LocalStore] Error writing users.json:', err.message);
  }
}

export function findLocalUserByPhone(phone: string): IUserRecord | null {
  const cleanPhone = phone.replace(/\D/g, '').replace(/^0+/, '');
  const tenDigit = cleanPhone.length === 12 && cleanPhone.startsWith('91') ? cleanPhone.slice(2) : cleanPhone;
  const users = readLocalUsers();

  return (
    users.find((u) => {
      const uPhone = (u.phone || u.phoneNumber || '').replace(/\D/g, '').replace(/^0+/, '');
      const uTen = uPhone.length === 12 && uPhone.startsWith('91') ? uPhone.slice(2) : uPhone;
      return uTen === tenDigit || uPhone === cleanPhone;
    }) || null
  );
}

export function findLocalUserByEmail(email: string): IUserRecord | null {
  const norm = email.trim().toLowerCase();
  const users = readLocalUsers();
  return users.find((u) => (u.email || '').toLowerCase() === norm) || null;
}

export function findLocalUserById(id: string): IUserRecord | null {
  const users = readLocalUsers();
  return (
    users.find(
      (u) =>
        u.id === id ||
        u._id === id ||
        (u.email || '').toLowerCase() === id.toLowerCase()
    ) || null
  );
}

export function saveLocalUser(user: IUserRecord): IUserRecord {
  const users = readLocalUsers();
  const normEmail = (user.email || '').trim().toLowerCase();
  const existingIdx = users.findIndex(
    (u) =>
      (u.email || '').toLowerCase() === normEmail ||
      (user.id && u.id === user.id) ||
      (user._id && u._id === user._id)
  );

  const updatedRecord = {
    ...user,
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    users[existingIdx] = { ...users[existingIdx], ...updatedRecord };
  } else {
    users.push(updatedRecord);
  }

  writeLocalUsers(users);
  return updatedRecord;
}

export function updateLocalUserProfile(
  email: string,
  updateFields: {
    name?: string;
    phone?: string;
    phoneNumber?: string;
    state?: string;
    district?: string;
    preferredLanguage?: string;
  }
): IUserRecord | null {
  const normEmail = email.trim().toLowerCase();
  const users = readLocalUsers();
  const idx = users.findIndex((u) => (u.email || '').toLowerCase() === normEmail);
  if (idx < 0) return null;

  const current = users[idx];
  const rawPhone = updateFields.phone !== undefined ? updateFields.phone : updateFields.phoneNumber;
  const updated: IUserRecord = {
    ...current,
    name: updateFields.name !== undefined ? updateFields.name.trim() : current.name,
    phone: rawPhone !== undefined ? rawPhone.trim() : current.phone,
    phoneNumber: rawPhone !== undefined ? rawPhone.trim() : current.phoneNumber,
    state: updateFields.state !== undefined ? updateFields.state.trim() : current.state,
    district: updateFields.district !== undefined ? updateFields.district.trim() : current.district,
    preferredLanguage: updateFields.preferredLanguage !== undefined ? updateFields.preferredLanguage.trim().toLowerCase() : current.preferredLanguage,
    updatedAt: new Date().toISOString(),
    syncPending: true,
  };

  users[idx] = updated;
  writeLocalUsers(users);
  return updated;
}

// -------------------------------------------------------------
// INCIDENT OPERATIONS
// -------------------------------------------------------------

export function readLocalIncidents(): IIncident[] {
  ensureDataDir();
  if (!fs.existsSync(INCIDENTS_FILE)) {
    initLocalStore();
  }
  try {
    const raw = fs.readFileSync(INCIDENTS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err: any) {
    console.warn('[LocalStore] Error reading incidents.json:', err.message);
    return INITIAL_INCIDENTS;
  }
}

export function writeLocalIncidents(incidents: IIncident[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(INCIDENTS_FILE, JSON.stringify(incidents, null, 2), 'utf-8');
  } catch (err: any) {
    console.error('[LocalStore] Error writing incidents.json:', err.message);
  }
}

export function saveLocalIncident(incident: IIncident): IIncident {
  const incidents = readLocalIncidents();
  const existingIdx = incidents.findIndex(
    (inc) => inc.reportId === incident.reportId || (incident.id && inc.id === incident.id)
  );

  const record = {
    ...incident,
    id: incident.id || incident.reportId,
    createdAt: incident.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    incidents[existingIdx] = record;
  } else {
    incidents.unshift(record); // Prepend so newest appears first
  }

  writeLocalIncidents(incidents);
  return record;
}

export function updateLocalIncidentStatus(reportId: string, status: string): IIncident | null {
  const incidents = readLocalIncidents();
  const idx = incidents.findIndex((inc) => inc.reportId === reportId || inc.id === reportId);
  if (idx < 0) return null;

  incidents[idx].status = status;
  incidents[idx].updatedAt = new Date().toISOString();
  writeLocalIncidents(incidents);
  return incidents[idx];
}

export function findLocalIncidentById(id: string): IIncident | null {
  const incidents = readLocalIncidents();
  return incidents.find((inc) => inc.reportId === id || inc.id === id) || null;
}

export function deleteLocalIncident(id: string): boolean {
  const incidents = readLocalIncidents();
  const filtered = incidents.filter((inc) => inc.reportId !== id && inc.id !== id);
  if (filtered.length !== incidents.length) {
    writeLocalIncidents(filtered);
    return true;
  }
  return false;
}

// -------------------------------------------------------------
// ATLAS SYNCHRONIZATION
// -------------------------------------------------------------

/**
 * Automatically syncs local users and incidents to MongoDB Atlas once connected.
 */
export async function syncLocalDataToAtlas(): Promise<void> {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  try {
    const users = readLocalUsers();
    const User = mongoose.models.User;
    if (User && users.length > 0) {
      for (const u of users) {
        if (!u.email) continue;
        try {
          await User.findOneAndUpdate(
            { email: u.email.toLowerCase() },
            {
              $set: {
                name: u.name,
                email: u.email.toLowerCase(),
                phone: u.phone || u.phoneNumber || '',
                phoneNumber: u.phoneNumber || u.phone || '',
                state: u.state || 'Assam',
                district: u.district || 'Kamrup Metropolitan',
                isVerified: u.isVerified ?? true,
                emailVerified: u.emailVerified ?? true,
                phoneVerified: Boolean(u.phoneVerified),
                phoneVerifiedAt: u.phoneVerifiedAt ? new Date(u.phoneVerifiedAt) : new Date(),
                verifiedAt: u.verifiedAt ? new Date(u.verifiedAt) : new Date(),
                updatedAt: new Date(),
              },
              $setOnInsert: {
                createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
              },
            },
            { upsert: true }
          );
        } catch (uSyncErr: any) {
          console.warn(`[LocalStore -> Atlas] User sync notice for ${u.email}:`, uSyncErr.message);
        }
      }
      console.log(`[LocalStore -> Atlas] Synced ${users.length} users to MongoDB Atlas!`);
    }

    const incidents = readLocalIncidents();
    const Incident = mongoose.models.Incident;
    if (Incident && incidents.length > 0) {
      for (const inc of incidents) {
        if (!inc.reportId) continue;
        try {
          await Incident.findOneAndUpdate(
            { reportId: inc.reportId },
            {
              $set: {
                incidentType: inc.incidentType,
                latitude: inc.latitude,
                longitude: inc.longitude,
                locationName: inc.locationName,
                photoUrls: inc.photoUrls || [],
                videoUrl: inc.videoUrl || '',
                description: inc.description,
                submittedAt: inc.submittedAt ? new Date(inc.submittedAt) : new Date(),
                status: inc.status,
                updatedAt: new Date(),
              },
              $setOnInsert: {
                reportId: inc.reportId,
                createdAt: inc.createdAt ? new Date(inc.createdAt) : new Date(),
              },
            },
            { upsert: true }
          );
        } catch (incSyncErr: any) {
          console.warn(`[LocalStore -> Atlas] Incident sync notice for ${inc.reportId}:`, incSyncErr.message);
        }
      }
      console.log(`[LocalStore -> Atlas] Synced ${incidents.length} incidents to MongoDB Atlas!`);
    }
  } catch (syncErr: any) {
    console.warn('[LocalStore -> Atlas Sync Notice]:', syncErr.message);
  }
}
