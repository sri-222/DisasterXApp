import { usableAddress } from '../LocationContext';

describe('usableAddress', () => {
  it('never sends a location status message as an address', () => {
    expect(usableAddress('Permission Denied')).toBeUndefined();
    expect(usableAddress('Location Unavailable')).toBeUndefined();
    expect(usableAddress(null)).toBeUndefined();
    expect(usableAddress('Chennai, Tamil Nadu')).toBe('Chennai, Tamil Nadu');
  });
});
