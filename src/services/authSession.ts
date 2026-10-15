import * as Keychain from 'react-native-keychain';

const KEYCHAIN_SERVICE = 'disasterx.auth.token';

// undefined = not loaded from Keychain yet this process; null = loaded, no token
let cachedToken: string | null | undefined;
const listeners = new Set<(token: string | null) => void>();

function notify(token: string | null) {
  listeners.forEach(listener => listener(token));
}

export function subscribe(listener: (token: string | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function getToken(): Promise<string | null> {
  if (cachedToken !== undefined) {
    return cachedToken;
  }
  try {
    const credentials = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
    cachedToken = credentials ? credentials.password : null;
  } catch (err) {
    console.warn('Unable to read auth token from secure storage:', err);
    cachedToken = null;
  }
  // Let App know a session was restored from storage, so a later 401 on that
  // restored token still sends the user back to Login.
  notify(cachedToken);
  return cachedToken;
}

export async function saveToken(token: string): Promise<void> {
  cachedToken = token;
  try {
    await Keychain.setGenericPassword('disasterx', token, { service: KEYCHAIN_SERVICE });
  } catch (err) {
    console.warn('Unable to persist auth token to secure storage:', err);
  }
  notify(cachedToken);
}

export async function clearToken(): Promise<void> {
  cachedToken = null;
  try {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
  } catch (err) {
    console.warn('Unable to clear auth token from secure storage:', err);
  }
  notify(null);
}
