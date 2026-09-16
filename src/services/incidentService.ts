import { IncidentReportItem, IncidentStatus } from '../types/incident';
import { safeFetchJson } from '../utils/safeFetch';

export interface IncidentFilters {
  status?: string;
  incidentType?: string;
  state?: string;
  district?: string;
  dateRange?: string;
  searchQuery?: string;
}

// In-memory cache of incidents from MongoDB to survive transient network drops or server restarts
let cachedIncidents: IncidentReportItem[] | null = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Loads incident reports exclusively from backend API (/api/incidents) connected to MongoDB.
 * Implements retry with backoff and in-memory cache to prevent transient network failures.
 */
export async function fetchIncidents(filters?: {
  status?: string;
  incidentType?: string;
  limit?: number;
}): Promise<IncidentReportItem[]> {
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

  let lastErrorMsg = '';

  // Retry up to 2 times for transient network/startup glitches
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await sleep(attempt * 300);
    }

    try {
      const { ok, data, error, status, isHtml } = await safeFetchJson<any>(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (ok && data && Array.isArray(data.incidents)) {
        cachedIncidents = data.incidents;
        return data.incidents;
      }

      lastErrorMsg = isHtml
        ? `Backend returned HTML (HTTP ${status}) instead of JSON. Server may be starting.`
        : data?.message || data?.error || error || `HTTP ${status} loading incidents`;
    } catch (fetchErr: any) {
      lastErrorMsg = fetchErr?.message || 'Network request failed';
    }
  }

  console.warn('[incidentService] Notice loading incidents from /api/incidents:', lastErrorMsg);

  throw new Error(lastErrorMsg || 'Unable to fetch live data from MongoDB.');
}

/**
 * Fetches an individual incident report by ID directly from MongoDB via backend API.
 */
export async function fetchIncidentById(id: string): Promise<IncidentReportItem> {
  const { ok, data, error, status } = await safeFetchJson<any>(`/api/incidents/${encodeURIComponent(id)}`, {
    headers: { Accept: 'application/json' },
  });

  if (ok && data && (data.reportId || data.id)) {
    return data;
  }

  const msg = data?.message || data?.error || error || `Incident '${id}' not found (HTTP ${status}).`;
  console.error('[incidentService] Failed to load incident by ID:', id, msg);
  throw new Error(msg);
}

/**
 * Updates an incident workflow status directly via backend API in MongoDB.
 */
export async function updateIncidentStatus(
  reportId: string,
  newStatus: IncidentStatus
): Promise<{ success: boolean; reportId: string; status: IncidentStatus }> {
  const { ok, data, error, status } = await safeFetchJson<any>(`/api/incidents/${encodeURIComponent(reportId)}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ status: newStatus }),
  });

  if (!ok || !data?.success) {
    const msg = data?.message || data?.error || error || `Failed to update status (HTTP ${status})`;
    console.warn(`[incidentService] Failed to update incident ${reportId}:`, msg);
    throw new Error(msg);
  }

  if (cachedIncidents) {
    cachedIncidents = cachedIncidents.map((inc) =>
      inc.reportId === reportId || inc.id === reportId
        ? { ...inc, status: newStatus }
        : inc
    );
  }

  return data;
}

/**
 * Deletes an incident report directly from MongoDB via backend API.
 */
export async function deleteIncident(
  reportId: string
): Promise<{ success: boolean; message: string; reportId: string }> {
  const { ok, data, error, status } = await safeFetchJson<any>(`/api/incidents/${encodeURIComponent(reportId)}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!ok || !data?.success) {
    const msg = data?.message || data?.error || error || `Failed to delete incident (HTTP ${status})`;
    console.warn(`[incidentService] Failed to delete incident ${reportId}:`, msg);
    throw new Error(msg);
  }

  if (cachedIncidents) {
    cachedIncidents = cachedIncidents.filter(
      (inc) => inc.reportId !== reportId && inc.id !== reportId
    );
  }

  return data;
}

