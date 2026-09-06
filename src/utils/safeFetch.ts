/**
 * Safe JSON fetch utility to prevent "Unexpected token '<', '<!doctype '... is not valid JSON"
 * errors when endpoints return HTML (e.g. 404 SPA fallback, reverse proxy errors, or server restarts).
 */

export interface SafeFetchResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
  isHtml?: boolean;
}

/**
 * Safely parses a Response object as JSON.
 * If the response is HTML, it will NOT throw "Unexpected token '<', '<!doctype '...",
 * but will instead return a structured result with ok: false and isHtml: true.
 */
export async function safeParseResponse<T = any>(
  response: Response,
  fallback?: T
): Promise<SafeFetchResult<T>> {
  try {
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    const trimmed = text.trim();

    // Check if the response is HTML
    if (
      contentType.includes('text/html') ||
      trimmed.startsWith('<!doctype') ||
      trimmed.startsWith('<!DOCTYPE') ||
      trimmed.startsWith('<html') ||
      trimmed.startsWith('<head') ||
      trimmed.startsWith('<?xml')
    ) {
      console.warn(`[safeFetch] Expected JSON but received HTML/XML from ${response.url || 'request'} (status: ${response.status})`);
      return {
        ok: false,
        status: response.status,
        data: fallback ?? null,
        error: `Server responded with HTML page (HTTP ${response.status}) instead of JSON data.`,
        isHtml: true,
      };
    }

    if (!trimmed) {
      return {
        ok: response.ok,
        status: response.status,
        data: fallback ?? null,
      };
    }

    try {
      const parsed = JSON.parse(trimmed) as T;
      return {
        ok: response.ok,
        status: response.status,
        data: parsed,
      };
    } catch (jsonErr: any) {
      console.warn(`[safeFetch] JSON parse failure for ${response.url || 'request'}:`, jsonErr);
      return {
        ok: false,
        status: response.status,
        data: fallback ?? null,
        error: jsonErr.message || 'Malformed JSON response from server.',
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      status: response.status || 500,
      data: fallback ?? null,
      error: err.message || 'Failed to read response body.',
    };
  }
}

/**
 * Wraps native fetch() and safely parses the JSON response.
 * Completely immune to "Unexpected token '<', '<!doctype '... is not valid JSON" crashes.
 */
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallback?: T
): Promise<SafeFetchResult<T>> {
  try {
    const res = await fetch(input, init);
    return await safeParseResponse<T>(res, fallback);
  } catch (netErr: any) {
    return {
      ok: false,
      status: 0,
      data: fallback ?? null,
      error: netErr.message || 'Network request failed',
    };
  }
}
