// The DisasterX offline gateway: an ESP32 + SX1278 LoRa board that runs its
// own Wi-Fi network ("DisasterX", 192.168.4.1) with no internet behind it.
// The phone talks to it over plain HTTP; the ESP32 relays over LoRa radio.
//
// Contract v2 (JSON, see docs/online-offline-sos.md):
// - GET  /health      {"status":"ok","mode":"offline-wifi","gateway":"DisasterX", radio?}
// - POST /api/sos     JSON SOS with a messageId; answers {eventId, duplicate, ...}.
//                     A 2xx means the GATEWAY stored it. It never means the
//                     DisasterX server or a rescuer received it.
// - GET  /api/events  event history held in the gateway's RAM.
//
// Firmware v1 (still supported, used only when a v2 endpoint answers 404):
// - POST /sos         plain text "SOS|MOB-XXXX|..." transmitted over LoRa.
// - GET  /messages    only the latest message the radio received.
//
// The deployed v2 firmware has not been inspected yet, so every response is
// read tolerantly: missing or extra fields are fine.

export const GATEWAY_BASE_URL = 'http://192.168.4.1';
export const GATEWAY_SSID = 'DisasterX';

const HEALTH_TIMEOUT_MS = 2500;
const REQUEST_TIMEOUT_MS = 6000;
// LoRa packets are small; keep v1 SOS lines well under the SX1278's 255 bytes.
export const MAX_LORA_TEXT = 200;
// The v2 firmware rejects bodies over 1024 bytes (413).
export const MAX_SOS_BODY_BYTES = 1024;

// ---------------------------------------------------------------------------
// Errors: the outbox treats each kind differently.

export type GatewayErrorKind = 'timeout' | 'network' | 'http' | 'malformed';

export class GatewayError extends Error {
  kind: GatewayErrorKind;
  constructor(kind: GatewayErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = 'GatewayError';
  }
}

// The request may or may not have reached the gateway: outcome unknown.
export class GatewayTimeoutError extends GatewayError {
  path: string;
  constructor(path: string) {
    super('timeout', `The gateway did not answer in time (${path}).`);
    this.path = path;
    this.name = 'GatewayTimeoutError';
  }
}

// Could not connect at all (not on the Wi-Fi, gateway off): not received.
export class GatewayNetworkError extends GatewayError {
  constructor(path: string) {
    super('network', `Could not reach the gateway (${path}). Check you are on the DisasterX Wi-Fi.`);
    this.name = 'GatewayNetworkError';
  }
}

// The gateway answered and said no.
export class GatewayHttpError extends GatewayError {
  status: number;
  constructor(status: number, detail?: string) {
    super('http', `The gateway refused the request (${status}${detail ? `: ${detail}` : ''}).`);
    this.status = status;
    this.name = 'GatewayHttpError';
  }
  // 400 invalid input / 413 too large: sending the same thing again won't help.
  get isDefiniteRefusal() {
    return this.status === 400 || this.status === 413;
  }
}

// The gateway answered 2xx but with a body we could not read.
export class GatewayMalformedError extends GatewayError {
  constructor(path: string) {
    super('malformed', `The gateway sent a reply this app could not read (${path}).`);
    this.name = 'GatewayMalformedError';
  }
}

async function gatewayFetch(path: string, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    return await fetch(`${GATEWAY_BASE_URL}${path}`, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (timedOut || err?.name === 'AbortError') throw new GatewayTimeoutError(path);
    throw new GatewayNetworkError(path);
  } finally {
    clearTimeout(timer);
  }
}

async function readText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function tryParseJson(text: string): { ok: true; value: any } | { ok: false } {
  const trimmed = text.trim();
  if (!trimmed || !(trimmed.startsWith('{') || trimmed.startsWith('['))) return { ok: false };
  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch {
    return { ok: false };
  }
}

const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : typeof value === 'number' ? String(value) : null;
const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

// ---------------------------------------------------------------------------
// Health

export interface GatewayRadio {
  available: boolean | null;
  status: string | null;
  acks: boolean;
}

export interface GatewayHealth {
  reachable: boolean;
  mode: string | null;
  gateway: string | null;
  firmware: string | null;
  radio: GatewayRadio | null;
}

const UNREACHABLE: GatewayHealth = { reachable: false, mode: null, gateway: null, firmware: null, radio: null };

let lastHealth: GatewayHealth = UNREACHABLE;
let lastCheckedAt: string | null = null;

// Any 200 counts as reachable unless it is JSON whose "status" is present and
// not "ok". A v1 board that answers plain "OK" is reachable too.
export function parseHealth(status: number, body: string): GatewayHealth {
  if (status < 200 || status >= 300) return UNREACHABLE;
  const parsed = tryParseJson(body);
  if (!parsed.ok || typeof parsed.value !== 'object' || parsed.value === null || Array.isArray(parsed.value)) {
    return { reachable: true, mode: null, gateway: null, firmware: null, radio: null };
  }
  const json = parsed.value;
  const statusText = str(json.status);
  const radio =
    json.radio && typeof json.radio === 'object'
      ? {
          available: typeof json.radio.available === 'boolean' ? json.radio.available : null,
          status: str(json.radio.status),
          acks: json.radio.acks === true,
        }
      : null;
  return {
    reachable: statusText == null || statusText.toLowerCase() === 'ok',
    mode: str(json.mode),
    gateway: str(json.gateway),
    firmware: str(json.firmware),
    radio,
  };
}

export async function checkGateway(): Promise<GatewayHealth> {
  let health: GatewayHealth;
  try {
    const response = await gatewayFetch('/health', {}, HEALTH_TIMEOUT_MS);
    health = parseHealth(response.status, await readText(response));
  } catch {
    health = UNREACHABLE;
  }
  lastHealth = health;
  lastCheckedAt = new Date().toISOString();
  return health;
}

// The last health result without asking the gateway again.
export function getGatewayStatus(): { health: GatewayHealth; checkedAt: string | null } {
  return { health: lastHealth, checkedAt: lastCheckedAt };
}

export async function checkGatewayHealth(): Promise<boolean> {
  return (await checkGateway()).reachable;
}

// ---------------------------------------------------------------------------
// Send an SOS

export interface GatewaySosPayload {
  // The outbox clientId: the same id on the gateway, over LoRa and on the server.
  messageId: string;
  emergencyType: string;
  message: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  deviceId: string;
  name?: string;
  phone?: string;
  // Defaults to "lat,lon" or "Location unavailable".
  location?: string;
}

export interface GatewaySosResult {
  eventId: string | null;
  duplicate: boolean;
  // 'sent_to_remote' only when the gateway itself reports a radio transmit.
  gatewayStatus: 'received_by_gateway' | 'sent_to_remote';
  api: 'v2' | 'v1';
}

export function locationText(latitude: number | null, longitude: number | null) {
  return latitude != null && longitude != null
    ? `${latitude.toFixed(5)},${longitude.toFixed(5)}`
    : 'Location unavailable';
}

const byteLength = (text: string) => {
  // UTF-8 length without Buffer/TextEncoder (Hermes has neither reliably).
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
};

// Shared event model; v1-compatible fields (type/details/location) included.
export function buildGatewaySosBody(payload: GatewaySosPayload): string {
  const body: Record<string, unknown> = {
    messageId: payload.messageId,
    kind: 'SOS',
    // v1 firmware reads "type" as the emergency type.
    type: payload.emergencyType,
    emergencyType: payload.emergencyType,
    name: (payload.name ?? '').slice(0, 60),
    phone: (payload.phone ?? '').slice(0, 20),
    message: payload.message,
    details: payload.message,
    location: payload.location ?? locationText(payload.latitude, payload.longitude),
    latitude: payload.latitude,
    longitude: payload.longitude,
    createdAt: payload.createdAt,
    transport: 'offline-wifi',
    deviceId: payload.deviceId,
  };
  let json = JSON.stringify(body);
  // Too big: shorten the free text first (it is sent twice), then the location.
  while (byteLength(json) > MAX_SOS_BODY_BYTES) {
    const message = String(body.message);
    const location = String(body.location);
    if (message.length > 20) {
      body.message = body.details = message.slice(0, Math.max(20, message.length - 50));
    } else if (location.length > 30) {
      body.location = location.slice(0, 30);
    } else {
      break;
    }
    json = JSON.stringify(body);
  }
  return json;
}

export function extractEventId(json: any): string | null {
  if (!json || typeof json !== 'object') return null;
  return str(json.eventId) ?? str(json.id) ?? str(json.event?.id) ?? str(json.event?.eventId) ?? null;
}

function errorDetail(text: string): string | undefined {
  const parsed = tryParseJson(text);
  if (parsed.ok && parsed.value && typeof parsed.value === 'object') {
    return str(parsed.value.error) ?? str(parsed.value.message) ?? undefined;
  }
  return text.trim().slice(0, 80) || undefined;
}

// POST /api/sos. Falls back to v1 POST /sos text only when /api/sos is 404.
// Throws GatewayTimeoutError / GatewayNetworkError / GatewayHttpError.
export async function sendSOS(payload: GatewaySosPayload): Promise<GatewaySosResult> {
  const response = await gatewayFetch('/api/sos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: buildGatewaySosBody(payload),
  });
  const text = await readText(response);

  if (response.status === 404) {
    await sendGatewaySos(
      formatGatewaySos({
        deviceId: payload.deviceId,
        crisisType: payload.emergencyType,
        latitude: payload.latitude,
        longitude: payload.longitude,
        clientId: payload.messageId,
      })
    );
    return { eventId: null, duplicate: false, gatewayStatus: 'received_by_gateway', api: 'v1' };
  }
  if (!response.ok) {
    throw new GatewayHttpError(response.status, errorDetail(text));
  }

  // Success is the 2xx itself. An unreadable body still means the gateway took
  // it; throwing here would make the app send the same SOS again.
  const parsed = tryParseJson(text);
  const json = parsed.ok ? parsed.value : null;
  const radioSent =
    json?.gatewayStatus === 'sent_to_remote' ||
    json?.radio?.status === 'sent' ||
    json?.radio?.transmitted === true ||
    json?.radio?.sent === true;
  return {
    eventId: extractEventId(json),
    duplicate: json?.duplicate === true,
    gatewayStatus: radioSent ? 'sent_to_remote' : 'received_by_gateway',
    api: 'v2',
  };
}

// ---------------------------------------------------------------------------
// Firmware v1 SOS text

export interface GatewaySosInput {
  deviceId: string;
  crisisType: string;
  latitude?: number | null;
  longitude?: number | null;
  clientId: string;
}

// Keeps the v1 firmware's three-field format, TYPE|SENDER|MESSAGE, and puts
// the details in the message part with no extra "|" so existing receivers that
// split on "|" still read it, e.g.
//   SOS|MOB-4F2A|Flood. Need rescue at 13.08270,80.27070. Ref DX-mg9x0abc-1a2b3c4d5e6f
export function formatGatewaySos(input: GatewaySosInput): string {
  const clean = (value: string) => value.replace(/[|\r\n]/g, ' ').trim();
  const where =
    input.latitude != null && input.longitude != null
      ? `at ${input.latitude.toFixed(5)},${input.longitude.toFixed(5)}`
      : 'location unknown';
  const text = `SOS|${clean(input.deviceId)}|${clean(input.crisisType)}. Need rescue ${where}. Ref ${input.clientId}`;
  return text.slice(0, MAX_LORA_TEXT);
}

export async function sendGatewaySos(text: string): Promise<void> {
  const response = await gatewayFetch('/sos', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: text,
  });
  if (!response.ok) {
    throw new GatewayHttpError(response.status, errorDetail(await readText(response)));
  }
}

// ---------------------------------------------------------------------------
// Events heard or stored by the gateway

export interface GatewayEvent {
  // Stable key for de-duplication: eventId, else messageId, else the raw text.
  key: string;
  eventId: string | null;
  messageId: string | null;
  name: string | null;
  phone: string | null;
  deviceId: string | null;
  emergencyType: string | null;
  message: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  // From the gateway when it has a real clock, otherwise when this phone first saw it.
  receivedAt: string;
  uptimeMs: number | null;
  source: string | null;
  rssi: number | null;
}

// An ESP32 with no internet often has no real clock: ignore 1970-era times.
function usableTime(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time) || time < Date.UTC(2020, 0, 1)) return null;
  return new Date(time).toISOString();
}

export function normalizeEvent(raw: any, seenAt: Date = new Date()): GatewayEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const eventId = str(raw.eventId) ?? str(raw.id);
  const messageId = str(raw.messageId);
  const message = str(raw.message) ?? str(raw.details) ?? str(raw.text);
  const emergencyType = str(raw.emergencyType) ?? str(raw.type);
  if (!eventId && !messageId && !message && !emergencyType) return null;
  const key = eventId ?? messageId ?? `${emergencyType ?? ''}|${message ?? ''}`;
  return {
    key,
    eventId,
    messageId,
    name: str(raw.name),
    phone: str(raw.phone),
    deviceId: str(raw.deviceId) ?? str(raw.sender) ?? str(raw.from),
    emergencyType,
    message,
    location: str(raw.location),
    latitude: num(raw.latitude),
    longitude: num(raw.longitude),
    receivedAt: usableTime(raw.receivedAt) ?? usableTime(raw.createdAt) ?? seenAt.toISOString(),
    uptimeMs: num(raw.uptimeMs),
    source: str(raw.source),
    rssi: num(raw.rssi),
  };
}

export function eventFromV1Message(message: GatewayMessage): GatewayEvent {
  return {
    key: message.raw,
    eventId: null,
    messageId: null,
    name: null,
    phone: null,
    deviceId: message.sender,
    emergencyType: message.type,
    message: message.text,
    location: null,
    latitude: null,
    longitude: null,
    receivedAt: message.receivedAt,
    uptimeMs: null,
    source: 'lora',
    rssi: message.rssi ?? null,
  };
}

// Accepts {events:[...]}, {data:[...]} or a bare array. Newest first.
export function parseEvents(body: string, seenAt: Date = new Date()): GatewayEvent[] {
  const parsed = tryParseJson(body);
  if (!parsed.ok) throw new GatewayMalformedError('/api/events');
  const value = parsed.value;
  const list = Array.isArray(value) ? value : Array.isArray(value?.events) ? value.events : value?.data;
  if (!Array.isArray(list)) throw new GatewayMalformedError('/api/events');
  return sortEvents(
    list.map(item => normalizeEvent(item, seenAt)).filter((item): item is GatewayEvent => item !== null)
  );
}

export function sortEvents(events: GatewayEvent[]): GatewayEvent[] {
  return [...events].sort((a, b) => {
    const byTime = new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
    if (byTime !== 0) return byTime;
    return (b.uptimeMs ?? 0) - (a.uptimeMs ?? 0);
  });
}

// GET /api/events, or the v1 GET /messages (latest only) when that is 404.
export async function getEvents(): Promise<GatewayEvent[]> {
  const response = await gatewayFetch('/api/events', { headers: { Accept: 'application/json' } });
  if (response.status === 404) {
    const latest = await getLatestGatewayMessage();
    return latest ? [eventFromV1Message(latest)] : [];
  }
  const text = await readText(response);
  if (!response.ok) throw new GatewayHttpError(response.status, errorDetail(text));
  return parseEvents(text);
}

// ---------------------------------------------------------------------------
// Firmware v1 /messages

export interface GatewayMessage {
  raw: string;
  type: string;
  sender: string;
  text: string;
  rssi?: number;
  // From the firmware if it sends one, otherwise when this phone first saw it.
  receivedAt: string;
}

// The firmware may answer with plain text ("SOS|NODE1|Need help") or a small
// JSON object; accept both and the pipe format inside either.
export function parseGatewayMessage(body: string, seenAt: Date = new Date()): GatewayMessage | null {
  const trimmed = body.trim();
  if (!trimmed) return null;

  let raw = trimmed;
  let rssi: number | undefined;
  let timestamp: string | undefined;
  let sender: string | undefined;
  if (trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed);
      raw = String(json.message ?? json.msg ?? json.text ?? json.data ?? json.last ?? '').trim();
      sender = json.sender ?? json.from ?? json.node ?? undefined;
      rssi = typeof json.rssi === 'number' ? json.rssi : undefined;
      const time = json.timestamp ?? json.time;
      if (time != null && !Number.isNaN(new Date(time).getTime()) && typeof time !== 'number') {
        timestamp = new Date(time).toISOString();
      }
    } catch {
      // Not JSON after all; treat as text.
    }
  }
  if (!raw || /^(no|none|empty)( messages?)?$/i.test(raw)) return null;

  const parts = raw.split('|');
  const receivedAt = timestamp ?? seenAt.toISOString();
  if (parts.length >= 3) {
    return {
      raw,
      type: parts[0].trim().toUpperCase() || 'MSG',
      sender: String(sender ?? (parts[1].trim() || 'Unknown')),
      text: parts.slice(2).join(' ').trim(),
      rssi,
      receivedAt,
    };
  }
  return { raw, type: 'MSG', sender: String(sender ?? 'Unknown'), text: raw, rssi, receivedAt };
}

export async function getLatestGatewayMessage(): Promise<GatewayMessage | null> {
  const response = await gatewayFetch('/messages');
  const text = await readText(response);
  if (!response.ok) {
    throw new GatewayHttpError(response.status, errorDetail(text));
  }
  return parseGatewayMessage(text);
}

// The names the gateway owner uses.
export const esp32Service = { checkGateway, getGatewayStatus, sendSOS, getEvents };

// For tests.
export function __resetGatewayForTests() {
  lastHealth = UNREACHABLE;
  lastCheckedAt = null;
}
