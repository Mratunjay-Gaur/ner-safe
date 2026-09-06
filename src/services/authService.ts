import { safeFetchJson } from '../utils/safeFetch';

export interface UserProfileData {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  phoneNumber?: string;
  state: string;
  district: string;
  isVerified: boolean;
  emailVerified?: boolean;
  emailVerifiedAt?: string;
  phoneVerified?: boolean;
  phoneVerifiedAt?: string;
  verifiedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const TOKEN_KEY = 'ner_safe_session_token';
const PROFILE_KEY = 'ner_safe_verified_email_profile';
const AUTH_EVENT_NAME = 'ner_safe_auth_state_changed';

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    window.dispatchEvent(new CustomEvent(AUTH_EVENT_NAME, { detail: { token } }));
  } catch (err) {
    console.error('Failed to store session token:', err);
  }
}

export function getCachedProfile(): UserProfileData | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedProfile(profile: UserProfileData | null): void {
  try {
    if (profile) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(PROFILE_KEY);
    }
    window.dispatchEvent(new CustomEvent(AUTH_EVENT_NAME, { detail: { profile } }));
  } catch (err) {
    console.error('Failed to update cached profile:', err);
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PROFILE_KEY);
    window.dispatchEvent(new CustomEvent(AUTH_EVENT_NAME, { detail: { logout: true } }));
  } catch (err) {
    console.error('Failed to clear session:', err);
  }
}

/**
 * Restores and validates session with the backend against MongoDB (Source of Truth).
 * Overwrites stale cached data with authoritative MongoDB values.
 */
export async function restoreSession(): Promise<UserProfileData | null> {
  const token = getSessionToken();
  const cached = getCachedProfile();

  if (!token && !cached?.email) {
    return null;
  }

  try {
    // 1. If we have a session token, validate with /api/auth/me
    if (token) {
      const { ok, status, data } = await safeFetchJson<any>('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (ok && data && data.success && data.user) {
        const profile: UserProfileData = {
          id: data.user.id,
          name: data.user.name ?? cached?.name ?? '',
          email: data.user.email,
          phone: data.user.phone || data.user.phoneNumber || cached?.phone || cached?.phoneNumber || '',
          phoneNumber: data.user.phoneNumber || data.user.phone || cached?.phoneNumber || cached?.phone || '',
          state: data.user.state || cached?.state || 'Assam',
          district: data.user.district || cached?.district || 'Kamrup Metropolitan',
          isVerified: data.user.isVerified ?? true,
          emailVerified: data.user.emailVerified ?? true,
          emailVerifiedAt: data.user.emailVerifiedAt || cached?.emailVerifiedAt,
          phoneVerified: Boolean(data.user.phoneVerified),
          phoneVerifiedAt: data.user.phoneVerifiedAt || cached?.phoneVerifiedAt,
          verifiedAt: data.user.verifiedAt || cached?.verifiedAt,
          createdAt: data.user.createdAt || cached?.createdAt,
          updatedAt: data.user.updatedAt || cached?.updatedAt,
        };
        setCachedProfile(profile);
        return profile;
      } else if (status === 401) {
        // Token expired or invalid
        clearSession();
        return null;
      }
    }

    // 2. Fallback to /api/user/profile if cached email exists
    if (cached?.email) {
      const { ok, data } = await safeFetchJson<any>(`/api/user/profile?email=${encodeURIComponent(cached.email)}`);
      if (ok && data && data.success && data.user) {
        const profile: UserProfileData = {
          id: data.user.id,
          name: data.user.name ?? cached.name ?? '',
          email: data.user.email,
          phone: data.user.phone || data.user.phoneNumber || cached.phone || cached.phoneNumber || '',
          phoneNumber: data.user.phoneNumber || data.user.phone || cached.phoneNumber || cached.phone || '',
          state: data.user.state || cached.state || 'Assam',
          district: data.user.district || cached.district || 'Kamrup Metropolitan',
          isVerified: data.user.isVerified ?? true,
          emailVerified: data.user.emailVerified ?? true,
          emailVerifiedAt: data.user.emailVerifiedAt || cached.emailVerifiedAt,
          phoneVerified: Boolean(data.user.phoneVerified),
          phoneVerifiedAt: data.user.phoneVerifiedAt || cached.phoneVerifiedAt,
          verifiedAt: data.user.verifiedAt || cached.verifiedAt,
          createdAt: data.user.createdAt || cached.createdAt,
          updatedAt: data.user.updatedAt || cached.updatedAt,
        };
        setCachedProfile(profile);
        return profile;
      }
    }

    return cached || null;
  } catch (err) {
    console.warn('Session restoration background check failed:', err);
    return cached || null;
  }
}

/**
 * Explicit user logout
 */
export async function performLogout(): Promise<void> {
  const token = getSessionToken();
  try {
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    }
  } catch (e) {
    console.warn('Logout network call error:', e);
  } finally {
    clearSession();
  }
}

/**
 * Hook or subscription to listen for auth state changes
 */
export function onAuthStateChange(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(AUTH_EVENT_NAME, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(AUTH_EVENT_NAME, handler);
    window.removeEventListener('storage', handler);
  };
}
