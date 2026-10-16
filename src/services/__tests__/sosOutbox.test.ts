import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveUserProfile } from '../userProfileStorage';

jest.mock('../../screens/api', () => {
  const actual = jest.requireActual('../../screens/api');
  return { ...actual, submitSos: jest.fn(), checkBackendHealth: jest.fn() };
});
jest.mock('../gateway', () => {
  const actual = jest.requireActual('../gateway');
  return { ...actual, sendSOS: jest.fn(), checkGatewayHealth: jest.fn() };
});

const api = require('../../screens/api');
const gateway = require('../gateway');
const outbox = require('../sosOutbox');

function routes(server: boolean, gw: boolean) {
  (api.checkBackendHealth as jest.Mock).mockResolvedValue(server);
  (gateway.checkGatewayHealth as jest.Mock).mockResolvedValue(gw);
}

const SOS = { crisisType: 'Flood', latitude: 13.08, longitude: 80.27 };

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  outbox.__resetOutboxForTests();
  (api.submitSos as jest.Mock).mockResolvedValue({ success: true, id: 'srv-1', createdAt: 'now' });
  (gateway.sendSOS as jest.Mock).mockResolvedValue({
    eventId: 'EVT-7',
    duplicate: false,
    gatewayStatus: 'received_by_gateway',
    api: 'v2',
  });
});

test('online: goes to the server once, with a clientId, and not to the gateway', async () => {
  routes(true, true);
  const item = await outbox.sendSOS(SOS);
  expect(item.state).toBe('delivered');
  expect(item.clientId).toMatch(/^DX-[0-9a-z]+-[0-9a-f]{12}$/);
  expect(api.submitSos).toHaveBeenCalledTimes(1);
  expect(api.submitSos.mock.calls[0][0]).toMatchObject({ crisisType: 'Flood', clientId: item.clientId, channel: 'app' });
  expect(gateway.sendSOS).not.toHaveBeenCalled();
});

test('no internet but on the gateway: accepted by the gateway, delivery unconfirmed, never delivered', async () => {
  routes(false, true);
  await saveUserProfile({ name: 'Priya', phone: '+911234567890' });
  const item = await outbox.sendSOS(SOS);
  expect(item.state).toBe('delivery_unconfirmed');
  expect(item.gatewayStatus).toBe('received_by_gateway');
  expect(item.gatewayEventId).toBe('EVT-7');
  expect(gateway.sendSOS).toHaveBeenCalledWith({
    messageId: item.clientId,
    emergencyType: 'Flood',
    message: 'Emergency assistance required',
    latitude: 13.08,
    longitude: 80.27,
    createdAt: item.createdAt,
    deviceId: expect.stringMatching(/^MOB-[0-9A-F]{4}$/),
    name: 'Priya',
    phone: '+911234567890',
  });
  expect(api.submitSos).not.toHaveBeenCalled();
});

test('no profile and no GPS: empty name/phone and null coordinates', async () => {
  routes(false, true);
  await outbox.sendSOS({ crisisType: 'Medical' });
  expect(gateway.sendSOS.mock.calls[0][0]).toMatchObject({
    emergencyType: 'Medical Emergency',
    name: '',
    phone: '',
    latitude: null,
    longitude: null,
  });
});

test('gateway accept -> delivery_unconfirmed, later server upload -> delivered with the same clientId', async () => {
  routes(false, true);
  const item = await outbox.sendSOS(SOS);
  expect(item.state).toBe('delivery_unconfirmed');
  routes(true, true);
  await outbox.retryPendingMessages();
  const saved: any[] = [];
  outbox.subscribeOutbox((items: any[]) => saved.push(items));
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(saved[0][0]).toMatchObject({ clientId: item.clientId, state: 'delivered', serverId: 'srv-1' });
  expect(api.submitSos.mock.calls[0][0]).toMatchObject({ clientId: item.clientId, channel: 'lora' });
});

test('a gateway timeout stays pending (unknown) and is not sent to the server as a new SOS', async () => {
  routes(false, true);
  (gateway.sendSOS as jest.Mock).mockRejectedValueOnce(new gateway.GatewayTimeoutError('/api/sos'));
  const item = await outbox.sendSOS(SOS);
  expect(item.state).toBe('pending');
  expect(item.gatewayStatus).toBe('unknown');
  expect(item.lastError).toMatch(/may have received/);
  expect(api.submitSos).not.toHaveBeenCalled();

  // Back online: one upload with the same clientId (server de-duplicates) and
  // marked lora because the gateway may hold it. No new SOS, no new id.
  routes(true, true);
  await outbox.retryPendingMessages();
  await outbox.retryPendingMessages();
  expect(api.submitSos).toHaveBeenCalledTimes(1);
  expect(api.submitSos.mock.calls[0][0]).toMatchObject({ clientId: item.clientId, channel: 'lora' });
  expect(gateway.sendSOS).toHaveBeenCalledTimes(1);
});

test('after a v2 timeout the gateway retry reuses the same messageId; a v1 timeout is never resent', async () => {
  routes(false, true);
  (gateway.sendSOS as jest.Mock).mockRejectedValueOnce(new gateway.GatewayTimeoutError('/api/sos'));
  const v2 = await outbox.sendSOS(SOS);
  await outbox.retryPendingMessages();
  expect(gateway.sendSOS.mock.calls.map((call: any[]) => call[0].messageId)).toEqual([v2.clientId, v2.clientId]);

  (gateway.sendSOS as jest.Mock).mockClear();
  (gateway.sendSOS as jest.Mock).mockRejectedValueOnce(new gateway.GatewayTimeoutError('/sos'));
  const v1 = await outbox.sendSOS(SOS);
  expect(v1.gatewayStatus).toBe('unknown');
  await outbox.retryPendingMessages();
  expect(gateway.sendSOS).toHaveBeenCalledTimes(1);
});

test('a definite gateway refusal (400) is failed, not resent to the gateway, and still uploaded later', async () => {
  routes(false, true);
  (gateway.sendSOS as jest.Mock).mockRejectedValueOnce(new gateway.GatewayHttpError(400, 'bad input'));
  const item = await outbox.sendSOS(SOS);
  expect(item.state).toBe('failed');
  await outbox.retryPendingMessages();
  expect(gateway.sendSOS).toHaveBeenCalledTimes(1);
  routes(true, true);
  await outbox.retryPendingMessages();
  expect(api.submitSos.mock.calls[0][0]).toMatchObject({ clientId: item.clientId, channel: 'app' });
  expect(await outbox.getPendingCount()).toBe(0);
});

test('a network error at the gateway leaves it pending and retryable', async () => {
  routes(false, true);
  (gateway.sendSOS as jest.Mock).mockRejectedValueOnce(new gateway.GatewayNetworkError('/api/sos'));
  const item = await outbox.sendSOS(SOS);
  expect(item.state).toBe('pending');
  expect(item.gatewayStatus).toBeUndefined();
  await outbox.retryPendingMessages();
  expect((await new Promise<any[]>(resolve => outbox.subscribeOutbox(resolve)))[0].state).toBe('delivery_unconfirmed');
});

test('items saved by the previous app version load with the new states', async () => {
  await AsyncStorage.setItem(
    'disasterx_sos_outbox',
    JSON.stringify([
      { clientId: 'mg1-aaaaaaaaaaaa', state: 'queued', attempts: 0, createdAt: new Date().toISOString() },
      { clientId: 'mg2-bbbbbbbbbbbb', state: 'gateway_accepted', attempts: 1, createdAt: new Date().toISOString() },
      {
        clientId: 'mg3-cccccccccccc',
        state: 'server_accepted',
        attempts: 1,
        createdAt: new Date().toISOString(),
        serverAt: new Date().toISOString(),
      },
    ])
  );
  const loaded = await new Promise<any[]>(resolve => outbox.subscribeOutbox(resolve));
  expect(loaded.map(item => [item.state, item.gatewayStatus])).toEqual([
    ['pending', undefined],
    ['delivery_unconfirmed', 'received_by_gateway'],
    ['delivered', undefined],
  ]);
  expect(await outbox.getPendingCount()).toBe(2);
  // The old gateway-accepted item is never sent over the gateway again.
  routes(false, true);
  await outbox.retryPendingMessages();
  expect(gateway.sendSOS).toHaveBeenCalledTimes(1);
  expect(gateway.sendSOS.mock.calls[0][0].messageId).toBe('mg1-aaaaaaaaaaaa');
});

test('nothing reachable: saved on the phone, then sent when the internet returns', async () => {
  routes(false, false);
  const item = await outbox.sendSOS(SOS);
  expect(item.state).toBe('pending');
  expect(await outbox.getPendingCount()).toBe(1);

  routes(true, false);
  await outbox.retryPendingMessages();
  expect(api.submitSos).toHaveBeenCalledTimes(1);
  expect(await outbox.getPendingCount()).toBe(0);
});

test('after LoRa, the server upload reuses the same clientId and the radio is not sent again', async () => {
  routes(false, true);
  const item = await outbox.sendSOS(SOS);
  routes(true, true);
  await outbox.retryPendingMessages();
  await outbox.retryPendingMessages();
  expect(gateway.sendSOS).toHaveBeenCalledTimes(1);
  expect(api.submitSos).toHaveBeenCalledTimes(1);
  expect(api.submitSos.mock.calls[0][0]).toMatchObject({ clientId: item.clientId, channel: 'lora' });
});

test('a failed server attempt keeps the SOS and retries with the same clientId', async () => {
  routes(true, false);
  (api.submitSos as jest.Mock).mockRejectedValueOnce(new Error('The server is taking too long to respond.'));
  const item = await outbox.sendSOS(SOS);
  expect(item.state).toBe('pending');
  expect(item.lastError).toMatch(/too long/);
  await outbox.retryPendingMessages();
  expect(api.submitSos.mock.calls.map((call: any[]) => call[0].clientId)).toEqual([item.clientId, item.clientId]);
  expect(await outbox.getPendingCount()).toBe(0);
});

test('server down but on the gateway: falls back to LoRa in the same tap', async () => {
  routes(true, true);
  (api.submitSos as jest.Mock).mockRejectedValueOnce(new Error('No internet connection.'));
  const item = await outbox.sendSOS(SOS, 'online');
  expect(item.state).toBe('delivery_unconfirmed');
});

test('concurrent retries share one run, so nothing is sent twice', async () => {
  routes(false, false);
  await outbox.sendSOS(SOS);
  routes(true, false);
  await Promise.all([outbox.retryPendingMessages(), outbox.retryPendingMessages(), outbox.retryPendingMessages()]);
  expect(api.submitSos).toHaveBeenCalledTimes(1);
});

test('the outbox survives an app restart', async () => {
  routes(false, false);
  const item = await outbox.sendSOS(SOS);
  outbox.__resetOutboxForTests();
  const seen: any[] = [];
  outbox.subscribeOutbox((items: any[]) => seen.push(items));
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(seen[0][0].clientId).toBe(item.clientId);
});
