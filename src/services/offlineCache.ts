import AsyncStorage from '@react-native-async-storage/async-storage';

// Keeps the last good copy of a feed so screens still have something useful
// to show with no internet, clearly marked with when it was saved.

const PREFIX = 'disasterx_cache_';

export interface Cached<T> {
  data: T;
  savedAt: string;
}

export async function saveCache<T>(key: string, data: T): Promise<void> {
  const entry: Cached<T> = { data, savedAt: new Date().toISOString() };
  await AsyncStorage.setItem(PREFIX + key, JSON.stringify(entry)).catch(() => {});
}

export async function loadCache<T>(key: string): Promise<Cached<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    return entry && typeof entry.savedAt === 'string' && 'data' in entry ? entry : null;
  } catch {
    return null;
  }
}

// Fetches fresh data and saves it; on failure falls back to the saved copy.
// Throws only when there is neither.
export async function withOfflineCache<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<{ data: T; savedAt: string | null }> {
  try {
    const data = await fetcher();
    await saveCache(key, data);
    return { data, savedAt: null };
  } catch (err) {
    const cached = await loadCache<T>(key);
    if (cached) return { data: cached.data, savedAt: cached.savedAt };
    throw err;
  }
}
