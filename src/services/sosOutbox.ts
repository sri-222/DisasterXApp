import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError, CrisisType, checkBackendHealth, submitSos } from '../screens/api';
import { checkGatewayHealth, formatGatewaySos, sendGatewaySos } from './gateway';

// Every SOS goes through this outbox. It is saved on the phone first, so an
// emergency is never lost when there is no signal, then sent by the best
// route available:
//
//   1. The DisasterX server, when it answers. This is the only route with a
//      real receipt (the server stores it and the control room sees it).
//   2. The offline LoRa gateway, when the server can't be reached but the
//      phone is on the gateway's Wi-Fi. The gateway accepting it only means
//      it was handed to the radio; nobody confirms reception yet.
//   3. Otherwise it waits here and is retried when either route comes back.
//
// An SOS that went out over LoRa is still uploaded to the server later, with
// the same clientId, so the control room gets a record. The server treats a
// repeated clientId as the same SOS, so retries never create duplicates.

export type OutboxState =
  | 'queued' // saved on this phone, not sent anywhere yet
  | 'gateway_accepted' // handed to the LoRa gateway, server upload pending
  | 'server_accepted'; // stored by the DisasterX server

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

export function newClientId(now = Date.now()) {
  return `${now.toString(36)}-${randomHex(12)}`;
}

export async function getDeviceId(): Promise<string> {
  const saved = await AsyncStorage.getItem(DEVICE_ID_KEY).catch(() => null);
  if (saved) return saved;
  const id = `MOB-${randomHex(4).toUpperCase()}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, id).catch(() => {});
  return id;
}

async function load(): Promise<OutboxItem[]> {
  if (items) return items;
  try {
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    items = Array.isArray(parsed) ? parsed : [];
  } catch {
    items = [];
  }
  return items;
}

async function save(next: OutboxItem[]) {
  const cutoff = Date.now() - KEEP_DELIVERED_MS;
  items = next.filter(
    item => item.state !== 'server_accepted' || new Date(item.serverAt ?? item.createdAt).getTime() > cutoff
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
  return (await load()).filter(item => item.state !== 'server_accepted').length;
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
          channel: item.state === 'gateway_accepted' ? 'lora' : 'app',
        },
        { timeoutMs: SERVER_TIMEOUT_MS }
      );
      await update(item.clientId, {
        ...attempt,
        state: 'server_accepted',
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
      if (item.state !== 'queued' || !(await checkGatewayHealth())) return;
    }
  }

  // Send over LoRa only once per SOS: the gateway has no way to tell repeats
  // apart, so each resend would reach rescuers as a new emergency.
  if (item.state === 'queued' && (mode === 'gateway' || mode === 'online')) {
    try {
      await sendGatewaySos(
        formatGatewaySos({
          deviceId: item.deviceId,
          crisisType: item.crisisType,
          latitude: item.latitude,
          longitude: item.longitude,
          clientId: item.clientId,
        })
      );
      await update(item.clientId, {
        ...attempt,
        state: 'gateway_accepted',
        gatewayAt: new Date().toISOString(),
        lastError: undefined,
      });
    } catch (err: any) {
      await update(item.clientId, {
        ...attempt,
        lastError: err?.message || 'The gateway did not accept the SOS.',
      });
    }
  }
}

// Sends every SOS that hasn't reached the server yet. Safe to call from
// anywhere at any time: concurrent calls share one run.
export function retryPendingMessages(knownMode?: ConnectionMode): Promise<void> {
  if (running) return running;
  running = (async () => {
    const pending = (await load()).filter(item => item.state !== 'server_accepted');
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
    state: 'queued',
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
