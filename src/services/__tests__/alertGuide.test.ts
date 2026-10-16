import { quakeMeaning, severityGuide } from '../alertGuide';
import { tilesFor } from '../../component/LocationMap';
import { describeOutboxItem } from '../sosStatus';

test('every severity has a plain meaning and an action, unknown falls back to Info', () => {
  expect(severityGuide('Danger').action).toMatch(/^Act now/);
  expect(severityGuide('Whatever')).toBe(severityGuide('Info'));
});

test('quake magnitudes read in plain words', () => {
  expect(quakeMeaning(3.1)).toMatch(/^Minor/);
  expect(quakeMeaning(5.4)).toMatch(/^Moderate/);
  expect(quakeMeaning(7.2)).toMatch(/^Major/);
});

test('the gateway state never claims the SOS was received', () => {
  const unconfirmed = describeOutboxItem({ state: 'delivery_unconfirmed' });
  expect(unconfirmed.label).toBe('Received by the gateway · not yet confirmed by DisasterX');
  expect(unconfirmed.detail).toMatch(/cannot confirm/);
  expect(describeOutboxItem({ state: 'delivery_unconfirmed', gatewayStatus: 'sent_to_remote' }).detail).toMatch(
    /nothing confirms/
  );
  expect(describeOutboxItem({ state: 'pending' }).label).toBe('Saved on this phone');
  expect(describeOutboxItem({ state: 'pending', gatewayStatus: 'unknown' }).label).toMatch(/did not answer/);
  expect(describeOutboxItem({ state: 'failed' }).label).toMatch(/refused/);
  for (const state of ['pending', 'delivery_unconfirmed', 'failed'] as const) {
    expect(describeOutboxItem({ state }).label).not.toMatch(/received by DisasterX|delivered/i);
  }
});

test('map tiles cover the box and centre the location', () => {
  const tiles = tilesFor(13.0827, 80.2707, 340, 170);
  expect(tiles.length).toBeGreaterThanOrEqual(2);
  expect(tiles.every(tile => tile.uri.startsWith('https://tile.openstreetmap.org/16/'))).toBe(true);
  // Some tile must cover the centre point of the box.
  expect(tiles.some(t => t.left <= 170 && t.left + 256 > 170 && t.top <= 85 && t.top + 256 > 85)).toBe(true);
});
