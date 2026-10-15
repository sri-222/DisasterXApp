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
  // Only on nearby results: how far the quake was from the user.
  distanceKm?: number;
}

export interface QuakeFeed {
  // nearby: quakes around the user's location; worldwide: largest quakes today.
  scope: 'nearby' | 'worldwide';
  radiusKm?: number;
  days?: number;
  events: LiveAlertEvent[];
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
  // Which upstream answered: open-meteo, or met.no when Open-Meteo is rate limited.
  source?: string;
}

export type CrisisType = 'Flood' | 'Fire' | 'Medical' | 'Earthquake' | 'Other';

export interface SosPayload {
  crisisType: CrisisType;
  latitude?: number;
  longitude?: number;
  address?: string;
  // Makes the request idempotent: the backend returns the existing SOS
  // instead of creating a second one when the same clientId comes again.
  clientId?: string;
  // 'lora' when the SOS already went out over the offline gateway first.
  channel?: 'app' | 'lora';
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

// Long enough for a Render free-tier cold start (30-60 s).
const REQUEST_TIMEOUT_MS = 60_000;

export class ApiError extends Error {
  isAuthError: boolean;
  constructor(message: string, isAuthError = false) {
    super(message);
    this.isAuthError = isAuthError;
  }
}

async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean; timeoutMs?: number } = {}
): Promise<T> {
  const { method = 'GET', body, auth = false, timeoutMs = REQUEST_TIMEOUT_MS } = options;
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

  // fetch has no timeout of its own; without one a sleeping Render instance
  // leaves screens spinning forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers,
      signal: controller.signal,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (err: any) {
    if (controller.signal.aborted) {
      throw new ApiError('The server is taking too long to respond. Please try again.');
    }
    throw new ApiError(err?.message === 'Network request failed' ? 'No internet connection. Please try again.' : err?.message || 'Request failed');
  } finally {
    clearTimeout(timer);
  }

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
    body: { email: normalizeEmail(payload.email), password: payload.password },
  });
}

export async function signup(payload: SignupPayload): Promise<SignupResponse> {
  return apiFetch<SignupResponse>('/auth/signup', {
    method: 'POST',
    body: {
      name: payload.name,
      email: normalizeEmail(payload.email),
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
      const { user } = await apiFetch<MeResponse>('/auth/me', { auth: true, timeoutMs: 15_000 });
      return user;
    } catch (err) {
      // Only a rejected session logs the user out. A slow or offline server
      // must not: the caller keeps the token and carries on.
      if (err instanceof ApiError && err.isAuthError) {
        await authSession.clearToken();
        return null;
      }
      throw err;
    }
  })();

  try {
    return await restoreInFlight;
  } finally {
    restoreInFlight = null;
  }
}

export async function getLiveAlerts(limit = 6): Promise<LiveAlertEvent[]> {
  return (await getQuakes(limit)).events;
}

// Earthquakes near the user when a location is known, otherwise worldwide.
export async function getQuakes(
  limit = 6,
  latitude?: number | null,
  longitude?: number | null,
): Promise<QuakeFeed> {
  const near =
    latitude != null && longitude != null
      ? `&lat=${latitude.toFixed(3)}&lon=${longitude.toFixed(3)}`
      : '';
  const result = await apiFetch<{
    success: boolean;
    scope?: QuakeFeed['scope'];
    radiusKm?: number;
    days?: number;
    data: LiveAlertEvent[];
  }>(`/alerts/live?limit=${limit}${near}`);
  return {
    // An older backend sends no scope: its feed is the worldwide one.
    scope: result.scope === 'nearby' ? 'nearby' : 'worldwide',
    radiusKm: result.radiusKm,
    days: result.days,
    events: Array.isArray(result.data) ? result.data : [],
  };
}

export function describeQuakeFeed(feed: Pick<QuakeFeed, 'scope' | 'radiusKm' | 'days'>): string {
  return feed.scope === 'nearby'
    ? `Earthquakes within ${feed.radiusKm ?? 1000} km of you, last ${feed.days ?? 30} days`
    : 'Largest earthquakes worldwide today';
}

const OFFICIAL_SEVERITIES: OfficialAlert['severity'][] = ['Danger', 'Warning', 'Info', 'Safe'];

function readTimestamp(value: unknown): string {
  if (typeof value === 'string') return value;
  const seconds = (value as any)?._seconds ?? (value as any)?.seconds;
  return typeof seconds === 'number' ? new Date(seconds * 1000).toISOString() : '';
}

// Older alerts in the database can be missing fields or carry a raw Firestore
// timestamp. Rendering those as-is crashed the Alerts screen, so coerce every
// alert into the shape the UI expects and drop anything that isn't an object.
export function normalizeOfficialAlert(raw: any, index: number): OfficialAlert | null {
  if (!raw || typeof raw !== 'object') return null;
  const str = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback);
  return {
    id: str(raw.id, `alert-${index}`),
    title: str(raw.title, 'Alert'),
    message: str(raw.message, ''),
    severity: OFFICIAL_SEVERITIES.includes(raw.severity) ? raw.severity : 'Info',
    location: str(raw.location, 'Unknown'),
    lat: typeof raw.lat === 'number' ? raw.lat : null,
    lon: typeof raw.lon === 'number' ? raw.lon : null,
    source: str(raw.source, 'manual'),
    timestamp: readTimestamp(raw.timestamp),
  };
}

export async function getOfficialAlerts(limit = 20): Promise<OfficialAlert[]> {
  const result = await apiFetch<{ success: boolean; data: unknown }>(
    `/alerts?limit=${limit}`
  );
  if (!Array.isArray(result?.data)) return [];
  return result.data
    .map(normalizeOfficialAlert)
    .filter((alert): alert is OfficialAlert => alert !== null);
}

export async function getWeather(lat: number, lon: number): Promise<WeatherData> {
  const result = await apiFetch<{ success: boolean; data: WeatherData }>(
    `/weather?lat=${lat}&lon=${lon}`
  );
  return result.data;
}

export async function submitSos(
  payload: SosPayload,
  options: { timeoutMs?: number } = {}
): Promise<{ success: boolean; id: string; createdAt: string; duplicate?: boolean }> {
  return apiFetch(`/sos`, { method: 'POST', body: payload, auth: true, timeoutMs: options.timeoutMs });
}

export async function registerPushToken(token: string, platform: 'android' | 'ios'): Promise<{ success: boolean }> {
  return apiFetch(`/me/push-token`, { method: 'POST', body: { token, platform }, auth: true });
}

export async function unregisterPushToken(token: string): Promise<{ success: boolean }> {
  return apiFetch(`/me/push-token`, { method: 'DELETE', body: { token }, auth: true });
}

// Asks the backend itself rather than trusting the phone's "connected" flag:
// on the gateway's Wi-Fi Android reports a connection with no internet.
const HEALTH_TIMEOUT_MS = 8000;
export async function checkBackendHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const response = await fetch(buildUrl('/health'), { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
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
