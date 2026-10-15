import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../../screens/api', () => {
  const actual = jest.requireActual('../../screens/api');
  return { ...actual, submitSos: jest.fn(), checkBackendHealth: jest.fn() };
});
jest.mock('../gateway', () => {
  const actual = jest.requireActual('../gateway');
  return { ...actual, sendGatewaySos: jest.fn(), checkGatewayHealth: jest.fn() };
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
  (gateway.sendGatewaySos as jest.Mock).mockResolvedValue(undefined);
});

test('online: goes to the server once, with a clientId, and not to the gateway', async () => {
  routes(true, true);
  const item = await outbox.sendSOS(SOS);
  expect(item.state).toBe('server_accepted');
  expect(api.submitSos).toHaveBeenCalledTimes(1);
  expect(api.submitSos.mock.calls[0][0]).toMatchObject({ crisisType: 'Flood', clientId: item.clientId, channel: 'app' });
  expect(gateway.sendGatewaySos).not.toHaveBeenCalled();
});

test('no internet but on the gateway: handed to LoRa, never called delivered', async () => {
  routes(false, true);
  const item = await outbox.sendSOS(SOS);
  expect(item.state).toBe('gateway_accepted');
  expect(gateway.sendGatewaySos).toHaveBeenCalledWith(expect.stringMatching(/^SOS\|MOB-[0-9A-F]{4}\|Flood\. /));
  expect(api.submitSos).not.toHaveBeenCalled();
});

test('nothing reachable: saved on the phone, then sent when the internet returns', async () => {
  routes(false, false);
  const item = await outbox.sendSOS(SOS);
  expect(item.state).toBe('queued');
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
  expect(gateway.sendGatewaySos).toHaveBeenCalledTimes(1);
  expect(api.submitSos).toHaveBeenCalledTimes(1);
  expect(api.submitSos.mock.calls[0][0]).toMatchObject({ clientId: item.clientId, channel: 'lora' });
});

test('a failed server attempt keeps the SOS and retries with the same clientId', async () => {
  routes(true, false);
  (api.submitSos as jest.Mock).mockRejectedValueOnce(new Error('The server is taking too long to respond.'));
  const item = await outbox.sendSOS(SOS);
  expect(item.state).toBe('queued');
  expect(item.lastError).toMatch(/too long/);
  await outbox.retryPendingMessages();
  expect(api.submitSos.mock.calls.map((call: any[]) => call[0].clientId)).toEqual([item.clientId, item.clientId]);
  expect(await outbox.getPendingCount()).toBe(0);
});

test('server down but on the gateway: falls back to LoRa in the same tap', async () => {
  routes(true, true);
  (api.submitSos as jest.Mock).mockRejectedValueOnce(new Error('No internet connection.'));
  const item = await outbox.sendSOS(SOS, 'online');
  expect(item.state).toBe('gateway_accepted');
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
