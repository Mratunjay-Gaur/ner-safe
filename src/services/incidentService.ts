import { IncidentReportItem, IncidentReportResponse, IncidentStatus } from '../types/incident';
import { INITIAL_SEED_INCIDENTS } from '../data/seedIncidents';
import { safeFetchJson } from '../utils/safeFetch';

export interface IncidentFilters {
  status?: string;
  incidentType?: string;
  state?: string;
  district?: string;
  dateRange?: string;
  searchQuery?: string;
}

const LOCAL_STORAGE_INCIDENTS_KEY = 'ner_safe_local_incidents_cache';

function getCachedIncidents(): IncidentReportItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_INCIDENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore localStorage errors
  }
  return INITIAL_SEED_INCIDENTS;
}

function setCachedIncidents(items: IncidentReportItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_INCIDENTS_KEY, JSON.stringify(items));
  } catch {
    // Ignore localStorage errors
  }
}

export async function fetchIncidents(filters?: {
  status?: string;
  incidentType?: string;
  limit?: number;
}): Promise<IncidentReportItem[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'ALL') {
      params.append('status', filters.status);
    }
    if (filters?.incidentType && filters.incidentType !== 'ALL') {
      params.append('incidentType', filters.incidentType);
    }
    if (filters?.limit) {
      params.append('limit', String(filters.limit));
    }

    const url = `/api/incidents${params.toString() ? `?${params.toString()}` : ''}`;
    const { ok, data } = await safeFetchJson<any>(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (ok && data && Array.isArray(data.incidents)) {
      if (data.incidents.length > 0) {
        setCachedIncidents(data.incidents);
      }
      return data.incidents;
    }
  } catch (error: any) {
    console.warn('Backend incidents API unavailable or initializing, using resilient cache:', error?.message || error);
  }

  // Resilient fallback to cached/seed incidents
  let cached = getCachedIncidents();
  if (filters?.status && filters.status !== 'ALL') {
    const sNorm = filters.status.toUpperCase().replace(/_/g, ' ');
    cached = cached.filter((x) => (x.status || '').toUpperCase().replace(/_/g, ' ') === sNorm);
  }
  if (filters?.incidentType && filters.incidentType !== 'ALL') {
    cached = cached.filter((x) => (x.incidentType || '').toLowerCase() === filters.incidentType?.toLowerCase());
  }
  if (filters?.limit) {
    cached = cached.slice(0, filters.limit);
  }
  return cached;
}

export async function fetchIncidentById(id: string): Promise<IncidentReportItem> {
  try {
    const { ok, data } = await safeFetchJson<any>(`/api/incidents/${encodeURIComponent(id)}`, {
      headers: { Accept: 'application/json' },
    });
    if (ok && data) {
      return data;
    }
  } catch (err) {
    console.warn(`Direct fetch for incident ${id} failed, checking cache:`, err);
  }

  const cached = getCachedIncidents();
  const item = cached.find((x) => x.reportId === id || x.id === id);
  if (item) return item;
  throw new Error(`Incident ${id} not found.`);
}

export async function updateIncidentStatus(
  reportId: string,
  newStatus: IncidentStatus
): Promise<{ success: boolean; reportId: string; status: IncidentStatus }> {
  try {
    const { ok, data } = await safeFetchJson<any>(`/api/incidents/${encodeURIComponent(reportId)}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (ok && data) {
      // Update local storage cache
      const cached = getCachedIncidents();
      const updatedList = cached.map((item) =>
        item.reportId === reportId ? { ...item, status: newStatus, updatedAt: new Date().toISOString() } : item
      );
      setCachedIncidents(updatedList);
      return data;
    }
  } catch (err) {
    console.warn(`Remote update for ${reportId} failed, updating local storage:`, err);
  }

  // Update local cache
  const cached = getCachedIncidents();
  const updatedList = cached.map((item) =>
    item.reportId === reportId ? { ...item, status: newStatus, updatedAt: new Date().toISOString() } : item
  );
  setCachedIncidents(updatedList);

  return {
    success: true,
    reportId,
    status: newStatus,
  };
}
