import { formatGatewaySos, parseGatewayMessage, MAX_LORA_TEXT } from '../gateway';
import { mergeMessage } from '../../component/GatewayInbox';

jest.mock('@react-navigation/native', () => ({ useFocusEffect: () => {} }));

describe('gateway SOS text', () => {
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

describe('gateway messages', () => {
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

  test('the inbox only adds a message when the gateway holds a new one', () => {
    const first = parseGatewayMessage('SOS|N1|A', seen)!;
    const list = mergeMessage([], first);
    expect(mergeMessage(list, parseGatewayMessage('SOS|N1|A', seen))).toBe(list);
    expect(mergeMessage(list, parseGatewayMessage('SOS|N2|B', seen))).toHaveLength(2);
  });
});
