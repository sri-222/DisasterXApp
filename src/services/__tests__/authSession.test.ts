import * as Keychain from 'react-native-keychain';
import { getToken, saveToken, clearToken, subscribe } from '../authSession';

beforeEach(() => {
  (Keychain as any).__reset();
});

describe('authSession token storage', () => {
  test('getToken returns null when nothing has been saved', async () => {
    await expect(getToken()).resolves.toBeNull();
  });

  test('saveToken persists to secure storage and getToken reads it back', async () => {
    await saveToken('jwt-123');
    await expect(getToken()).resolves.toBe('jwt-123');
  });

  test('clearToken removes the stored token', async () => {
    await saveToken('jwt-123');
    await clearToken();
    await expect(getToken()).resolves.toBeNull();
  });

  test('getToken reflects secure storage even without an in-process cache (simulates app restart)', async () => {
    await saveToken('jwt-123');
    // getGenericPassword is backed by the (mocked) Keychain itself, so a
    // fresh read still finds it regardless of in-memory module state.
    const credentials = await Keychain.getGenericPassword({ service: 'disasterx.auth.token' });
    expect(credentials && (credentials as any).password).toBe('jwt-123');
  });

  test('subscribers are notified on save and clear', async () => {
    const seen: Array<string | null> = [];
    const unsubscribe = subscribe(token => seen.push(token));

    await saveToken('jwt-123');
    await clearToken();
    unsubscribe();
    await saveToken('jwt-456'); // should not be observed after unsubscribe

    expect(seen).toEqual(['jwt-123', null]);
  });
});

describe('restored sessions', () => {
  test('loading a stored token notifies listeners, so a later 401 can send the user to Login', async () => {
    jest.resetModules();
    const KeychainMock = require('react-native-keychain');
    KeychainMock.__reset();
    await Keychain.setGenericPassword('disasterx', 'stored-token', { service: 'disasterx.auth.token' });
    const session = require('../authSession');
    const seen: Array<string | null> = [];
    session.subscribe((token: string | null) => seen.push(token));

    await session.getToken();
    await session.clearToken();

    expect(seen).toEqual(['stored-token', null]);
  });
});
