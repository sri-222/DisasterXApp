import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError, CrisisType, checkBackendHealth, submitSos } from '../screens/api';
import { GatewayHttpError, GatewayTimeoutError, checkGatewayHealth, sendSOS as sendToGateway } from './gateway';
import { getUserProfile } from './userProfileStorage';

// Every SOS goes through this outbox. It is saved on the phone first, so an
// emergency is never lost when there is no signal, then sent by the best
// route available:
//
//   1. The DisasterX server, when it answers. This is the only route with a
//      real receipt (the server stores it and the control room sees it).
//   2. The offline ESP32 gateway, when the server can't be reached but the
//      phone is on the gateway's Wi-Fi. The gateway accepting it only means
//      the gateway stored it (and may have put it on LoRa radio); nothing
//      confirms that DisasterX or a rescuer received it.
//   3. Otherwise it waits here and is retried when either route comes back.
//
// An SOS that went to the gateway is still uploaded to the server later, with
// the same clientId (the gateway's messageId), so the control room gets a
// record. The server treats a repeated clientId as the same SOS, so retries
// never create duplicates.

// Overall state, as honest as we can be (see docs/online-offline-sos.md):
export type OutboxState =
  | 'pending' // saved on this phone; not accepted anywhere yet (or outcome unknown)
  | 'delivery_unconfirmed' // the gateway accepted it; no server receipt yet
  | 'delivered' // stored by the DisasterX server (the only "delivered")
  | 'failed'; // the gateway definitely refused it (400/413); still uploaded to the server later

// What the gateway said about this SOS.
export type GatewayDeliveryStatus =
  | 'received_by_gateway' // gateway answered 2xx
  | 'sent_to_remote' // gateway reported a radio transmit (no acknowledgement)
  | 'unknown'; // the gateway timed out: it may or may not have it

export interface OutboxItem {
  clientId: string;
  deviceId: string;
  crisisType: CrisisType;
  latitude: number | null;
  longitude: number | null;
  address?: string;
  createdAt: string;
  state: OutboxState;
  serverId?: string;
  gatewayAt?: string;
  gatewayStatus?: GatewayDeliveryStatus;
  gatewayEventId?: string | null;
  // Set when a gateway timeout happened on the v2 JSON endpoint, which
  // de-duplicates by messageId, so trying the gateway again is safe.
  gatewayRetryable?: boolean;
  serverAt?: string;
  attempts: number;
  lastAttemptAt?: string;
  lastError?: string;
}

export type ConnectionMode = 'online' | 'gateway' | 'offline';

const OUTBOX_KEY = 'disasterx_sos_outbox';
const DEVICE_ID_KEY = 'disasterx_device_id';
// Delivered items stay visible for a day, then drop out of the outbox.
const KEEP_DELIVERED_MS = 24 * 60 * 60 * 1000;
const SERVER_TIMEOUT_MS = 20_000;

let items: OutboxItem[] | null = null;
const listeners = new Set<(items: OutboxItem[]) => void>();
let running: Promise<void> | null = null;

function randomHex(length: number) {
  let out = '';
  while (out.length < length) out += Math.floor(Math.random() * 16).toString(16);
  return out;
}

// Also the gateway's messageId: "DX-<base36 time>-<12 hex>". Fits the
// backend's clientId pattern ^[A-Za-z0-9_-]{8,64}$.
export function newClientId(now = Date.now()) {
  return `DX-${now.toString(36)}-${randomHex(12)}`;
}

export async function getDeviceId(): Promise<string> {
  const saved = await AsyncStorage.getItem(DEVICE_ID_KEY).catch(() => null);
  if (saved) return saved;
  const id = `MOB-${randomHex(4).toUpperCase()}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, id).catch(() => {});
  return id;
}

// Items saved by earlier app versions used queued / gateway_accepted /
// server_accepted; read them as the new states.
export function migrateItem(item: any): OutboxItem {
  switch (item?.state) {
    case 'queued':
      return { ...item, state: 'pending' };
    case 'gateway_accepted':
      return { ...item, state: 'delivery_unconfirmed', gatewayStatus: item.gatewayStatus ?? 'received_by_gateway' };
    case 'server_accepted':
      return { ...item, state: 'delivered' };
    case 'pending':
    case 'delivery_unconfirmed':
    case 'delivered':
    case 'failed':
      return item;
    default:
      return { ...item, state: 'pending' };
  }
}

async function load(): Promise<OutboxItem[]> {
  if (items) return items;
  try {
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    items = Array.isArray(parsed)
      ? parsed.filter(item => item && typeof item.clientId === 'string').map(migrateItem)
      : [];
  } catch {
    items = [];
  }
  return items;
}

async function save(next: OutboxItem[]) {
  const cutoff = Date.now() - KEEP_DELIVERED_MS;
  items = next.filter(
    item => item.state !== 'delivered' || new Date(item.serverAt ?? item.createdAt).getTime() > cutoff
  );
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(items)).catch(() => {});
  const snapshot = [...items];
  listeners.forEach(listener => listener(snapshot));
}

async function update(clientId: string, patch: Partial<OutboxItem>) {
  const current = await load();
  await save(current.map(item => (item.clientId === clientId ? { ...item, ...patch } : item)));
}

export function subscribeOutbox(listener: (items: OutboxItem[]) => void): () => void {
  listeners.add(listener);
  load().then(current => listener([...current]));
  return () => listeners.delete(listener);
}

export async function getPendingCount(): Promise<number> {
  return (await load()).filter(item => item.state !== 'delivered').length;
}

export async function checkRoutes(): Promise<{ server: boolean; gateway: boolean }> {
  const [server, gateway] = await Promise.all([checkBackendHealth(), checkGatewayHealth()]);
  return { server, gateway };
}

export function modeFor(routes: { server: boolean; gateway: boolean }): ConnectionMode {
  if (routes.server) return 'online';
  if (routes.gateway) return 'gateway';
  return 'offline';
}

export async function getConnectionMode(): Promise<ConnectionMode> {
  return modeFor(await checkRoutes());
}

// Whether this item may be handed to the gateway now. Never after the gateway
// accepted or refused it. After a timeout only when that was the v2 endpoint,
// which de-duplicates by messageId; the v1 text endpoint cannot tell repeats
// apart, so a resend would reach rescuers as a new emergency.
export function canSendToGateway(item: OutboxItem) {
  if (item.state !== 'pending') return false;
  if (item.gatewayStatus == null) return true;
  return item.gatewayStatus === 'unknown' && item.gatewayRetryable === true;
}

// The gateway may hold it (accepted, or timed out with unknown outcome).
function mayHaveGoneOverGateway(item: OutboxItem) {
  return item.gatewayStatus != null;
}

const GATEWAY_EMERGENCY_TYPE: Record<string, string> = { Medical: 'Medical Emergency' };

async function deliverToGateway(item: OutboxItem, attempt: Partial<OutboxItem>) {
  // Name and phone from the saved profile, empty if there is none. Never logged.
  const profile = await getUserProfile().catch(() => null);
  try {
    const result = await sendToGateway({
      messageId: item.clientId,
      emergencyType: GATEWAY_EMERGENCY_TYPE[item.crisisType] ?? item.crisisType,
      message: item.address
        ? `Emergency assistance required near ${item.address}`
        : 'Emergency assistance required',
      latitude: item.latitude,
      longitude: item.longitude,
      createdAt: item.createdAt,
      deviceId: item.deviceId,
      name: profile?.name ?? '',
      phone: profile?.phone ?? '',
    });
    await update(item.clientId, {
      ...attempt,
      state: 'delivery_unconfirmed',
      gatewayStatus: result.gatewayStatus,
      gatewayEventId: result.eventId,
      gatewayRetryable: undefined,
      gatewayAt: new Date().toISOString(),
      lastError: undefined,
    });
  } catch (err: any) {
    if (err instanceof GatewayTimeoutError) {
      // Unknown outcome. Do not try another route as a new SOS; the server
      // upload later uses the same clientId and is de-duplicated there.
      await update(item.clientId, {
        ...attempt,
        gatewayStatus: 'unknown',
        gatewayRetryable: err.path === '/api/sos',
        lastError: 'The gateway did not answer in time. It may have received this SOS.',
      });
    } else if (err instanceof GatewayHttpError && err.isDefiniteRefusal) {
      await update(item.clientId, { ...attempt, state: 'failed', lastError: err.message });
    } else {
      // Network error, 5xx, storage full: not received; try again later.
      await update(item.clientId, {
        ...attempt,
        lastError: err?.message || 'The gateway did not accept the SOS.',
      });
    }
  }
}

// Tries the item once on the best route. Never throws: the outcome is stored
// on the item so the screen can show it.
async function deliver(item: OutboxItem, mode: ConnectionMode) {
  const attempt = { attempts: item.attempts + 1, lastAttemptAt: new Date().toISOString() };

  if (mode === 'online') {
    try {
      const result = await submitSos(
        {
          crisisType: item.crisisType,
          latitude: item.latitude ?? undefined,
          longitude: item.longitude ?? undefined,
          address: item.address,
          clientId: item.clientId,
          channel: mayHaveGoneOverGateway(item) ? 'lora' : 'app',
        },
        { timeoutMs: SERVER_TIMEOUT_MS }
      );
      await update(item.clientId, {
        ...attempt,
        state: 'delivered',
        serverId: result.id,
        serverAt: new Date().toISOString(),
        lastError: undefined,
      });
      return;
    } catch (err: any) {
      const message =
        err instanceof ApiError && err.isAuthError
          ? 'Log in again so this SOS can reach the control room.'
          : err?.message || 'The server did not accept the SOS.';
      await update(item.clientId, { ...attempt, lastError: message });
      // Fall through to the gateway if the phone is also on its Wi-Fi.
      if (!canSendToGateway(item) || !(await checkGatewayHealth())) return;
    }
  }

  if (canSendToGateway(item) && (mode === 'gateway' || mode === 'online')) {
    await deliverToGateway(item, attempt);
  }
}

// Sends every SOS that hasn't reached the server yet. Safe to call from
// anywhere at any time: concurrent calls share one run.
export function retryPendingMessages(knownMode?: ConnectionMode): Promise<void> {
  if (running) return running;
  running = (async () => {
    const pending = (await load()).filter(item => item.state !== 'delivered');
    if (!pending.length) return;
    const mode = knownMode ?? (await getConnectionMode());
    if (mode === 'offline') return;
    for (const item of pending) {
      await deliver(item, mode);
    }
  })().finally(() => {
    running = null;
  });
  return running;
}

export interface SendSosInput {
  crisisType: CrisisType;
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
}

// Saves the SOS on the phone, then tries to send it straight away. Returns
// the item as it stands after that first attempt.
export async function sendSOS(input: SendSosInput, knownMode?: ConnectionMode): Promise<OutboxItem> {
  const item: OutboxItem = {
    clientId: newClientId(),
    deviceId: await getDeviceId(),
    crisisType: input.crisisType,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    address: input.address,
    createdAt: new Date().toISOString(),
    state: 'pending',
    attempts: 0,
  };
  await save([item, ...(await load())]);
  // Wait for any retry already in flight, then send this one with the rest.
  if (running) await running.catch(() => {});
  await retryPendingMessages(knownMode);
  return (await load()).find(saved => saved.clientId === item.clientId) ?? item;
}

// For tests.
export function __resetOutboxForTests() {
  items = null;
  running = null;
  listeners.clear();
}
