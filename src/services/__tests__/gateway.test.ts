import {
  GatewayHttpError,
  GatewayMalformedError,
  GatewayNetworkError,
  GatewayTimeoutError,
  MAX_SOS_BODY_BYTES,
  MAX_LORA_TEXT,
  __resetGatewayForTests,
  buildGatewaySosBody,
  checkGateway,
  esp32Service,
  extractEventId,
  formatGatewaySos,
  getEvents,
  getGatewayStatus,
  parseEvents,
  parseGatewayMessage,
  sendSOS,
} from '../gateway';
import { mergeEvents, readStoredEvents } from '../../component/GatewayInbox';

jest.mock('@react-navigation/native', () => ({ useFocusEffect: () => {} }));

type Reply = { status: number; body?: string } | Error;
const fetchMock = jest.fn();
const realFetch = global.fetch;

// Answers each path with the next queued reply for it.
function serve(routes: Record<string, Reply[]>) {
  fetchMock.mockImplementation(async (url: string) => {
    const path = url.replace('http://192.168.4.1', '');
    const reply = routes[path]?.shift();
    if (!reply) throw new Error(`unexpected request ${path}`);
    if (reply instanceof Error) throw reply;
    return {
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      text: async () => reply.body ?? '',
    };
  });
}

const abortError = () => Object.assign(new Error('Aborted'), { name: 'AbortError' });

const PAYLOAD = {
  messageId: 'DX-mg9x0abc-1a2b3c4d5e6f',
  emergencyType: 'Medical Emergency',
  message: 'Emergency assistance required',
  latitude: 13.0827,
  longitude: 80.2707,
  createdAt: '2026-10-16T10:00:00.000Z',
  deviceId: 'MOB-4F2A',
  name: 'Priya',
  phone: '+911234567890',
};

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as any;
  __resetGatewayForTests();
});
afterAll(() => {
  global.fetch = realFetch;
});

describe('health', () => {
  test('reads the v2 JSON health and caches it', async () => {
    serve({
      '/health': [
        {
          status: 200,
          body: '{"status":"ok","mode":"offline-wifi","gateway":"DisasterX","radio":{"available":true,"status":"ready","acks":false}}',
        },
      ],
    });
    const health = await checkGateway();
    expect(health).toEqual({
      reachable: true,
      mode: 'offline-wifi',
      gateway: 'DisasterX',
      firmware: null,
      radio: { available: true, status: 'ready', acks: false },
    });
    expect(getGatewayStatus().health).toEqual(health);
    expect(getGatewayStatus().checkedAt).not.toBeNull();
    expect(esp32Service.checkGateway).toBe(checkGateway);
  });

  test('a v1 plain-text 200 is reachable; JSON status other than ok is not; errors are unreachable', async () => {
    serve({
      '/health': [{ status: 200, body: 'OK' }, { status: 200, body: '{"status":"error"}' }, { status: 500 }, abortError()],
    });
    expect((await checkGateway()).reachable).toBe(true);
    expect((await checkGateway()).reachable).toBe(false);
    expect((await checkGateway()).reachable).toBe(false);
    expect((await checkGateway()).reachable).toBe(false);
  });
});

describe('sendSOS', () => {
  test('posts the shared event model as JSON to /api/sos and returns the eventId', async () => {
    serve({
      '/api/sos': [
        {
          status: 201,
          body: '{"ok":true,"eventId":"EVT-42","messageId":"DX-mg9x0abc-1a2b3c4d5e6f","duplicate":false,"gatewayStatus":"received_by_gateway","remoteDeliveryStatus":"unconfirmed"}',
        },
      ],
    });
    const result = await sendSOS({ ...PAYLOAD });
    expect(result).toEqual({ eventId: 'EVT-42', duplicate: false, gatewayStatus: 'received_by_gateway', api: 'v2' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://192.168.4.1/api/sos');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({
      messageId: 'DX-mg9x0abc-1a2b3c4d5e6f',
      kind: 'SOS',
      type: 'Medical Emergency',
      emergencyType: 'Medical Emergency',
      name: 'Priya',
      phone: '+911234567890',
      message: 'Emergency assistance required',
      details: 'Emergency assistance required',
      location: '13.08270,80.27070',
      latitude: 13.0827,
      longitude: 80.2707,
      createdAt: '2026-10-16T10:00:00.000Z',
      transport: 'offline-wifi',
      deviceId: 'MOB-4F2A',
    });
  });

  test('no location: null coordinates, never invented', () => {
    const body = JSON.parse(buildGatewaySosBody({ ...PAYLOAD, latitude: null, longitude: null, name: undefined }));
    expect(body.latitude).toBeNull();
    expect(body.longitude).toBeNull();
    expect(body.location).toBe('Location unavailable');
    expect(body.name).toBe('');
  });

  test('keeps the body within the firmware limit', () => {
    const body = buildGatewaySosBody({ ...PAYLOAD, message: 'x'.repeat(3000) });
    expect(body.length).toBeLessThanOrEqual(MAX_SOS_BODY_BYTES);
    expect(JSON.parse(body).messageId).toBe(PAYLOAD.messageId);
  });

  test('extracts the eventId from the shapes the contract allows', () => {
    expect(extractEventId({ eventId: 'EVT-1' })).toBe('EVT-1');
    expect(extractEventId({ id: 7 })).toBe('7');
    expect(extractEventId({ event: { id: 'EVT-3' } })).toBe('EVT-3');
    expect(extractEventId({ ok: true })).toBeNull();
    expect(extractEventId(null)).toBeNull();
  });

  test('a duplicate and a radio transmit are reported, still not as delivered', async () => {
    serve({ '/api/sos': [{ status: 200, body: '{"id":"EVT-9","duplicate":true,"radio":{"status":"sent"}}' }] });
    expect(await sendSOS(PAYLOAD)).toEqual({
      eventId: 'EVT-9',
      duplicate: true,
      gatewayStatus: 'sent_to_remote',
      api: 'v2',
    });
  });

  test('a 2xx with an unreadable body is still accepted (no resend), with no eventId', async () => {
    serve({ '/api/sos': [{ status: 200, body: 'OK' }] });
    expect(await sendSOS(PAYLOAD)).toMatchObject({ eventId: null, gatewayStatus: 'received_by_gateway' });
  });

  test('falls back to the v1 text endpoint only on 404', async () => {
    serve({ '/api/sos': [{ status: 404, body: 'Not found' }], '/sos': [{ status: 200, body: 'OK' }] });
    expect(await sendSOS(PAYLOAD)).toEqual({
      eventId: null,
      duplicate: false,
      gatewayStatus: 'received_by_gateway',
      api: 'v1',
    });
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('http://192.168.4.1/sos');
    expect(init.headers['Content-Type']).toBe('text/plain');
    expect(init.body).toBe(
      'SOS|MOB-4F2A|Medical Emergency. Need rescue at 13.08270,80.27070. Ref DX-mg9x0abc-1a2b3c4d5e6f'
    );
  });

  test('a 400 is a definite refusal and does not fall back', async () => {
    serve({ '/api/sos': [{ status: 400, body: '{"ok":false,"error":"missing messageId"}' }] });
    const error = await sendSOS(PAYLOAD).catch(err => err);
    expect(error).toBeInstanceOf(GatewayHttpError);
    expect(error.status).toBe(400);
    expect(error.isDefiniteRefusal).toBe(true);
    expect(error.message).toMatch(/missing messageId/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('503 storage full is a refusal that can be retried', async () => {
    serve({ '/api/sos': [{ status: 503, body: '{"ok":false,"error":"storage full"}' }] });
    const error = await sendSOS(PAYLOAD).catch(err => err);
    expect(error).toBeInstanceOf(GatewayHttpError);
    expect(error.isDefiniteRefusal).toBe(false);
  });

  test('a timeout is a GatewayTimeoutError (outcome unknown)', async () => {
    jest.useFakeTimers();
    try {
      fetchMock.mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(abortError())))
      );
      const pending = sendSOS(PAYLOAD).catch(err => err);
      jest.advanceTimersByTime(10_000);
      const error = await pending;
      expect(error).toBeInstanceOf(GatewayTimeoutError);
      expect(error.kind).toBe('timeout');
      expect(error.path).toBe('/api/sos');
    } finally {
      jest.useRealTimers();
    }
  });

  test('a connection failure is a GatewayNetworkError', async () => {
    serve({ '/api/sos': [new TypeError('Network request failed')] });
    const error = await sendSOS(PAYLOAD).catch(err => err);
    expect(error).toBeInstanceOf(GatewayNetworkError);
    expect(error.kind).toBe('network');
  });
});

describe('events', () => {
  const seen = new Date('2026-10-16T10:00:00Z');

  test('reads /api/events, normalises fields and sorts newest first', async () => {
    serve({
      '/api/events': [
        {
          status: 200,
          body: JSON.stringify({
            events: [
              { eventId: 'EVT-1', messageId: 'DX-a', type: 'Flood', details: 'old', receivedAt: '2026-10-16T09:00:00Z', source: 'wifi' },
              { eventId: 'EVT-2', emergencyType: 'Fire', message: 'new', location: '13.1,80.2', latitude: 13.1, longitude: 80.2, createdAt: '2026-10-16T09:30:00Z', source: 'lora' },
            ],
            count: 2,
          }),
        },
      ],
    });
    const events = await getEvents();
    expect(events.map(event => event.eventId)).toEqual(['EVT-2', 'EVT-1']);
    expect(events[0]).toMatchObject({ emergencyType: 'Fire', message: 'new', latitude: 13.1, source: 'lora' });
    expect(events[1]).toMatchObject({ emergencyType: 'Flood', message: 'old', messageId: 'DX-a' });
  });

  test('accepts a bare array and ignores a 1970 clock', () => {
    const events = parseEvents('[{"id":"E1","type":"SOS","receivedAt":"1970-01-01T00:00:05Z","uptimeMs":5000}]', seen);
    expect(events).toHaveLength(1);
    expect(events[0].receivedAt).toBe(seen.toISOString());
    expect(events[0].uptimeMs).toBe(5000);
  });

  test('malformed JSON is a GatewayMalformedError', async () => {
    serve({ '/api/events': [{ status: 200, body: '<html>oops' }, { status: 200, body: '{"foo":1}' }] });
    await expect(getEvents()).rejects.toBeInstanceOf(GatewayMalformedError);
    await expect(getEvents()).rejects.toBeInstanceOf(GatewayMalformedError);
  });

  test('falls back to v1 /messages on 404', async () => {
    serve({ '/api/events': [{ status: 404 }], '/messages': [{ status: 200, body: 'SOS|NODE1|Need help' }] });
    const events = await getEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ emergencyType: 'SOS', deviceId: 'NODE1', message: 'Need help', eventId: null });
  });

  test('the inbox adds only new events and keeps ones seen before', () => {
    const first = parseEvents('[{"eventId":"E1","message":"a","createdAt":"2026-10-16T09:00:00Z"}]', seen);
    const list = mergeEvents([], first);
    expect(mergeEvents(list, first)).toBe(list);
    const next = parseEvents('[{"eventId":"E2","message":"b","createdAt":"2026-10-16T09:05:00Z"}]', seen);
    expect(mergeEvents(list, next).map(event => event.eventId)).toEqual(['E2', 'E1']);
  });

  test('messages saved by the previous app version still load', () => {
    const old = JSON.stringify([parseGatewayMessage('SOS|N1|Trapped', seen)]);
    expect(readStoredEvents(old)[0]).toMatchObject({ deviceId: 'N1', message: 'Trapped', key: 'SOS|N1|Trapped' });
    expect(readStoredEvents('not json')).toEqual([]);
  });
});

describe('v1 SOS text', () => {
  test('keeps the firmware TYPE|SENDER|MESSAGE format with no extra pipes', () => {
    const text = formatGatewaySos({
      deviceId: 'MOB-4F2A',
      crisisType: 'Flood',
      latitude: 13.0827,
      longitude: 80.2707,
      clientId: 'abcdef123456',
    });
    expect(text).toBe('SOS|MOB-4F2A|Flood. Need rescue at 13.08270,80.27070. Ref abcdef123456');
    expect(text.split('|')).toHaveLength(3);
  });

  test('says so when there is no location, and strips pipes from inputs', () => {
    const text = formatGatewaySos({ deviceId: 'A|B', crisisType: 'Fire', clientId: '12345678' });
    expect(text).toBe('SOS|A B|Fire. Need rescue location unknown. Ref 12345678');
    expect(text.length).toBeLessThanOrEqual(MAX_LORA_TEXT);
  });
});

describe('v1 messages', () => {
  const seen = new Date('2026-10-15T10:00:00Z');

  test('reads the plain-text pipe format', () => {
    expect(parseGatewayMessage('SOS|NODE1|Need help near bridge', seen)).toEqual({
      raw: 'SOS|NODE1|Need help near bridge',
      type: 'SOS',
      sender: 'NODE1',
      text: 'Need help near bridge',
      rssi: undefined,
      receivedAt: '2026-10-15T10:00:00.000Z',
    });
  });

  test('reads a JSON reply and its signal strength', () => {
    const parsed = parseGatewayMessage('{"message":"SOS|NODE2|Trapped","rssi":-87}', seen);
    expect(parsed).toMatchObject({ type: 'SOS', sender: 'NODE2', text: 'Trapped', rssi: -87 });
  });

  test('treats an empty gateway as no message', () => {
    expect(parseGatewayMessage('', seen)).toBeNull();
    expect(parseGatewayMessage('No messages', seen)).toBeNull();
    expect(parseGatewayMessage('{"message":""}', seen)).toBeNull();
  });

  test('free text without pipes is kept whole', () => {
    expect(parseGatewayMessage('hello from node', seen)).toMatchObject({ type: 'MSG', text: 'hello from node' });
  });
});
