import { DEV_API_URL, PROD_API_URL } from '@env';
import * as authSession from '../services/authSession';

export interface SignupPayload {
  name: string;
  phone?: string;
  email: string;
  password: string;
  role?: string;
}

export interface SignupResponse {
  success: boolean;
  userId: string;
  email: string;
  role: string;
}

export type VolunteerStatus = 'active' | 'inactive';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  createdAt?: string;
  volunteerStatus: VolunteerStatus;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  sessionId: string;
  expiresAt: string;
  ttlMs: number;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
  };
}

export interface MeResponse {
  success: boolean;
  user: UserProfile;
}

export interface LiveAlertEvent {
  id: string;
  place: string;
  magnitude: number;
  time: string | null;
  url?: string;
  lat: number;
  lon: number;
  depth: number;
  severity: 'Danger' | 'Warning' | 'Info' | 'Safe';
  detail: string;
  updated: string;
  isWater: boolean;
  type: string;
}

export interface WeatherData {
  location: string;
  temperature: number | null;
  feelsLike: number | null;
  humidity: number | null;
  conditions: string;
  icon?: string;
  wind: number | null;
  sunrise: string | null;
  sunset: string | null;
  updatedAt: string;
}

export type CrisisType = 'Flood' | 'Fire' | 'Medical' | 'Earthquake' | 'Other';

export interface SosPayload {
  crisisType: CrisisType;
  latitude?: number;
  longitude?: number;
  address?: string;
}

// Set by the control room: active -> acknowledged -> dispatched -> resolved.
export type SosStatus = 'active' | 'acknowledged' | 'dispatched' | 'resolved';

export interface SosReport {
  id: string;
  userId: string;
  crisisType: CrisisType;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  status: SosStatus | string;
  assignedTeam?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

// An alert broadcast by authorities from the control room.
export interface OfficialAlert {
  id: string;
  title: string;
  message: string;
  severity: 'Danger' | 'Warning' | 'Info' | 'Safe';
  location: string;
  lat: number | null;
  lon: number | null;
  source: string;
  timestamp: string;
}

export type HelpCategory = 'Food' | 'Medicine' | 'Shelter' | 'Other';

export interface HelpRequestPayload {
  category: HelpCategory;
  description: string;
  urgent?: boolean;
  latitude?: number;
  longitude?: number;
  address?: string;
}

export interface HelpRequest {
  id: string;
  userId: string;
  category: HelpCategory;
  description: string;
  urgent: boolean;
  status: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  createdAt: string;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeRole(role?: string) {
  const cleaned = role?.trim();
  return cleaned && cleaned.length ? cleaned : 'responder';
}

// The live backend. Hardcoded (not read from .env) so an installed release
// APK always has a working URL, with no dependency on Metro, adb reverse, or
// build-time env vars being present.
export const DEFAULT_API_BASE_URL = 'https://disasterx-backend.onrender.com';

// Pure and exported so dev/prod/override behavior can be unit tested
// without depending on __DEV__ or a real .env file.
export function resolveApiBaseUrl(options: {
  isDev: boolean;
  devUrl?: string;
  prodUrl?: string;
}): string {
  const { isDev, devUrl, prodUrl } = options;
  // DEV_API_URL (e.g. http://localhost:4000 over adb reverse) is an opt-in
  // override for debug builds only; release builds never consult it.
  const override = isDev ? devUrl || prodUrl : prodUrl;
  return (override || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
}

let cachedBaseUrl: string | undefined;
function getApiBaseUrl(): string {
  if (cachedBaseUrl === undefined) {
    cachedBaseUrl = resolveApiBaseUrl({
      isDev: __DEV__,
      devUrl: DEV_API_URL,
      prodUrl: PROD_API_URL,
    });
  }
  return cachedBaseUrl;
}

export function buildUrl(path: string): string {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

class ApiError extends Error {
  isAuthError: boolean;
  constructor(message: string, isAuthError = false) {
    super(message);
    this.isAuthError = isAuthError;
  }
}

async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<T> {
  const { method = 'GET', body, auth = false } = options;
  // Only declare a JSON content-type when there's actually a body - Fastify's
  // default JSON parser rejects Content-Type: application/json on a request
  // with no body at all (e.g. logout), which otherwise masks a real 400 as a
  // false "server unreachable" failure.
  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = await authSession.getToken();
    if (!token) {
      throw new ApiError('Not authenticated', true);
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (response.status === 401 && auth) {
    // The session is gone server-side (expired/invalidated) even though we
    // held a token locally - drop it so the app doesn't keep retrying with
    // dead credentials, and let callers route back to the login screen.
    await authSession.clearToken();
    throw new ApiError('Session expired. Please log in again.', true);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `Request failed (${response.status})` }));
    throw new ApiError(errorData.error || 'Request failed');
  }

  return response.json();
}

export async function login(payload: { email: string; password: string }): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email: payload.email, password: payload.password },
  });
}

export async function signup(payload: SignupPayload): Promise<SignupResponse> {
  return apiFetch<SignupResponse>('/auth/signup', {
    method: 'POST',
    body: {
      name: payload.name,
      email: payload.email,
      password: payload.password,
      ...(payload.phone ? { phone: payload.phone } : {}),
      role: payload.role,
    },
  });
}

export async function getMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>('/auth/me', { method: 'GET', auth: true });
}

export async function logout(): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>('/auth/logout', { method: 'POST', auth: true });
}

let restoreInFlight: Promise<UserProfile | null> | null = null;

// Validates the locally stored token against the server-side session (not
// just whether a token is present), so a token revoked while the app was
// closed doesn't get treated as a valid session on restart. Concurrent
// callers share one in-flight check instead of racing separate requests.
export async function restoreSession(): Promise<UserProfile | null> {
  if (restoreInFlight) {
    return restoreInFlight;
  }

  restoreInFlight = (async () => {
    const token = await authSession.getToken();
    if (!token) {
      return null;
    }
    try {
      const { user } = await getMe();
      return user;
    } catch {
      await authSession.clearToken();
      return null;
    }
  })();

  try {
    return await restoreInFlight;
  } finally {
    restoreInFlight = null;
  }
}

export async function getLiveAlerts(limit = 6): Promise<LiveAlertEvent[]> {
  const result = await apiFetch<{ success: boolean; data: LiveAlertEvent[] }>(
    `/alerts/live?limit=${limit}`
  );
  return result.data;
}

export async function getOfficialAlerts(limit = 20): Promise<OfficialAlert[]> {
  const result = await apiFetch<{ success: boolean; data: OfficialAlert[] }>(
    `/alerts?limit=${limit}`
  );
  return result.data;
}

export async function getWeather(lat: number, lon: number): Promise<WeatherData> {
  const result = await apiFetch<{ success: boolean; data: WeatherData }>(
    `/weather?lat=${lat}&lon=${lon}`
  );
  return result.data;
}

export async function submitSos(payload: SosPayload): Promise<{ success: boolean; id: string; createdAt: string }> {
  return apiFetch(`/sos`, { method: 'POST', body: payload, auth: true });
}

export async function getMySosHistory(): Promise<SosReport[]> {
  const result = await apiFetch<{ success: boolean; data: SosReport[] }>(`/sos/mine`, {
    method: 'GET',
    auth: true,
  });
  return result.data;
}

export async function getRequestsStats(): Promise<{ openCount: number }> {
  return apiFetch(`/requests/stats`, { method: 'GET' });
}

export async function joinVolunteer(): Promise<{ success: boolean; volunteerStatus: VolunteerStatus }> {
  return apiFetch(`/volunteer/join`, { method: 'POST', auth: true });
}

export async function leaveVolunteer(): Promise<{ success: boolean; volunteerStatus: VolunteerStatus }> {
  return apiFetch(`/volunteer/leave`, { method: 'POST', auth: true });
}

export async function createHelpRequest(
  payload: HelpRequestPayload
): Promise<{ success: boolean; id: string; createdAt: string }> {
  return apiFetch(`/requests`, { method: 'POST', body: payload, auth: true });
}

export async function getMyHelpRequests(): Promise<HelpRequest[]> {
  const result = await apiFetch<{ success: boolean; data: HelpRequest[] }>(`/requests/mine`, {
    method: 'GET',
    auth: true,
  });
  return result.data;
}

export { normalizeEmail, normalizeRole };
