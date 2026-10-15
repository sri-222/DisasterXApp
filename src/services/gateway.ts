// The DisasterX offline gateway: an ESP32 + SX1278 LoRa board that runs its
// own Wi-Fi network ("DisasterX", 192.168.4.1) with no internet behind it.
// The phone talks to it over plain HTTP; the ESP32 relays over LoRa radio.
//
// What the current firmware can and cannot do:
// - GET  /health    answers when the phone is on the gateway's Wi-Fi.
// - POST /sos       takes a plain-text line and transmits it over LoRa.
//                   A 200 means the gateway accepted it, NOT that another
//                   radio received it: there is no LoRa acknowledgement yet.
// - GET  /messages  returns only the latest message the radio received,
//                   held in RAM (no history, lost on reboot).

export const GATEWAY_BASE_URL = 'http://192.168.4.1';
export const GATEWAY_SSID = 'DisasterX';

const HEALTH_TIMEOUT_MS = 2500;
const REQUEST_TIMEOUT_MS = 6000;
// LoRa packets are small; keep SOS lines well under the SX1278's 255 bytes.
export const MAX_LORA_TEXT = 200;

async function gatewayFetch(path: string, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${GATEWAY_BASE_URL}${path}`, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function checkGatewayHealth(): Promise<boolean> {
  try {
    const response = await gatewayFetch('/health', {}, HEALTH_TIMEOUT_MS);
    return response.ok;
  } catch {
    return false;
  }
}

export interface GatewaySosInput {
  deviceId: string;
  crisisType: string;
  latitude?: number | null;
  longitude?: number | null;
  clientId: string;
}

// Keeps the firmware's three-field format, TYPE|SENDER|MESSAGE, and puts the
// details in the message part with no extra "|" so existing receivers that
// split on "|" still read it, e.g.
//   SOS|MOB-4F2A|Flood. Need rescue at 13.08270,80.27070. Ref mg9x0abc-1a2b3c4d5e6f
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
    throw new Error(`The gateway refused the SOS (${response.status}).`);
  }
}

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
  if (!response.ok) {
    throw new Error(`The gateway did not answer (${response.status}).`);
  }
  return parseGatewayMessage(await response.text());
}
