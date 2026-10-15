import * as Keychain from 'react-native-keychain';
import {
  DEFAULT_API_BASE_URL,
  resolveApiBaseUrl,
  buildUrl,
  login,
  signup,
  getMe,
  logout,
  restoreSession,
  getOfficialAlerts,
  getMySosHistory,
  getQuakes,
  describeQuakeFeed,
} from '../api';
import * as authSession from '../../services/authSession';

function jsonResponse(status: number, body: unknown) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

beforeEach(async () => {
  (Keychain as any).__reset();
  jest.resetAllMocks();
  // authSession keeps an in-memory cache alongside Keychain; clear both so
  // no token leaks from one test into the next.
  await authSession.clearToken();
});

describe('resolveApiBaseUrl', () => {
  test('the built-in default is the live Render backend over HTTPS', () => {
    expect(DEFAULT_API_BASE_URL).toBe('https://disasterx-backend.onrender.com');
  });

  test('release builds use the Render backend when no env vars are configured', () => {
    const url = resolveApiBaseUrl({ isDev: false });
    expect(url).toBe('https://disasterx-backend.onrender.com');
  });

  test('release builds never use DEV_API_URL (no localhost / adb reverse in an installed APK)', () => {
    const url = resolveApiBaseUrl({ isDev: false, devUrl: 'http://localhost:4000' });
    expect(url).toBe('https://disasterx-backend.onrender.com');
  });

  test('release builds use PROD_API_URL when configured', () => {
    const url = resolveApiBaseUrl({ isDev: false, prodUrl: 'https://api.disasterx.in/' });
    expect(url).toBe('https://api.disasterx.in'); // trailing slash stripped
  });

  test('dev builds use the Render backend when DEV_API_URL is unset', () => {
    const url = resolveApiBaseUrl({ isDev: true, devUrl: undefined });
    expect(url).toBe('https://disasterx-backend.onrender.com');
  });

  test('dev builds use DEV_API_URL when set (opt-in adb reverse / local backend)', () => {
    const url = resolveApiBaseUrl({ isDev: true, devUrl: 'http://localhost:4000' });
    expect(url).toBe('http://localhost:4000');
  });
});

describe('buildUrl', () => {
  test('joins base and path with exactly one slash regardless of leading slash', () => {
    expect(buildUrl('/auth/login')).toMatch(/\/auth\/login$/);
    expect(buildUrl('auth/login')).toMatch(/\/auth\/login$/);
    // never a double slash before the path
    expect(buildUrl('/auth/login')).not.toMatch(/[^:]\/\/auth/);
  });
});

describe('authenticated requests', () => {
  test('attaches Authorization: Bearer <token> for auth-required calls', async () => {
    await authSession.saveToken('abc123');
    global.fetch = jest.fn(() => jsonResponse(200, { success: true, user: { id: '1' } })) as any;

    await getMe();

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer abc123');
  });

  test('never attaches a token to public endpoints like login/signup', async () => {
    await authSession.saveToken('abc123');
    global.fetch = jest.fn(() => jsonResponse(200, { success: true })) as any;

    await login({ email: 'a@b.com', password: 'password123' });

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  test('throws without calling the network if no token is stored for an auth-required call', async () => {
    global.fetch = jest.fn() as any;

    await expect(getMe()).rejects.toThrow(/not authenticated/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('a 401 on an authenticated call clears the stored token', async () => {
    await authSession.saveToken('stale-token');
    global.fetch = jest.fn(() => jsonResponse(401, { success: false, error: 'Session expired' })) as any;

    await expect(getMe()).rejects.toThrow();
    await expect(authSession.getToken()).resolves.toBeNull();
  });

  test('logout posts to /auth/logout with the bearer token', async () => {
    await authSession.saveToken('abc123');
    global.fetch = jest.fn(() => jsonResponse(200, { success: true })) as any;

    await logout();

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/auth\/logout$/);
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer abc123');
  });

  test('requests with no body never send Content-Type: application/json (regression: Fastify 400s on an empty JSON body)', async () => {
    await authSession.saveToken('abc123');
    global.fetch = jest.fn(() => jsonResponse(200, { success: true })) as any;

    await logout();

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.body).toBeUndefined();
    expect(options.headers['Content-Type']).toBeUndefined();
  });

  test('requests with a body still send Content-Type: application/json', async () => {
    global.fetch = jest.fn(() => jsonResponse(200, { success: true })) as any;

    await login({ email: 'a@b.com', password: 'password123' });

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers['Content-Type']).toBe('application/json');
  });
});

describe('signup/login error propagation', () => {
  test('login surfaces the server error message on failure', async () => {
    global.fetch = jest.fn(() => jsonResponse(401, { error: 'Invalid credentials' })) as any;
    await expect(login({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow('Invalid credentials');
  });

  test('signup surfaces the server error message on failure', async () => {
    global.fetch = jest.fn(() => jsonResponse(409, { error: 'Email already registered' })) as any;
    await expect(
      signup({ name: 'A', email: 'a@b.com', password: 'password123' }),
    ).rejects.toThrow('Email already registered');
  });
});

describe('restoreSession', () => {
  test('returns null immediately when there is no stored token (no network call)', async () => {
    global.fetch = jest.fn() as any;
    const user = await restoreSession();
    expect(user).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('returns the profile when the stored token is still valid server-side', async () => {
    await authSession.saveToken('good-token');
    const profile = { id: '1', name: 'Ada', email: 'a@b.com', phone: null, role: 'responder', status: 'active' };
    global.fetch = jest.fn(() => jsonResponse(200, { success: true, user: profile })) as any;

    const user = await restoreSession();
    expect(user).toEqual(profile);
  });

  test('clears the token and returns null when the stored token is invalid/expired', async () => {
    await authSession.saveToken('dead-token');
    global.fetch = jest.fn(() => jsonResponse(401, { success: false, error: 'Session expired' })) as any;

    const user = await restoreSession();
    expect(user).toBeNull();
    await expect(authSession.getToken()).resolves.toBeNull();
  });

  test('keeps the token when the server is unreachable, so a cold start does not log the user out', async () => {
    await authSession.saveToken('good-token');
    global.fetch = jest.fn(() => Promise.reject(new Error('Network request failed'))) as any;

    await expect(restoreSession()).rejects.toThrow(/No internet connection/);
    await expect(authSession.getToken()).resolves.toBe('good-token');
  });

  test('concurrent calls at startup share one in-flight check instead of racing', async () => {
    await authSession.saveToken('good-token');
    const profile = { id: '1', name: 'Ada', email: 'a@b.com', phone: null, role: 'responder', status: 'active' };
    global.fetch = jest.fn(() => jsonResponse(200, { success: true, user: profile })) as any;

    const [a, b] = await Promise.all([restoreSession(), restoreSession()]);

    expect(a).toEqual(profile);
    expect(b).toEqual(profile);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('control room data', () => {
  it('getOfficialAlerts reads broadcast alerts without needing a login', async () => {
    const alert = { id: 'a1', title: 'Flood warning', message: 'Move to higher ground', severity: 'Danger' };
    global.fetch = jest.fn(() => jsonResponse(200, { success: true, data: [alert] })) as any;
    const [received] = await getOfficialAlerts(5);
    expect(received).toMatchObject(alert);
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe(`${DEFAULT_API_BASE_URL}/alerts?limit=5`);
    expect(options.headers?.Authorization).toBeUndefined();
  });

  it('getOfficialAlerts reshapes alerts left by the old backend instead of passing them through', async () => {
    const legacy = [
      { deviceId: 'sensor-1', value: 91, message: 'High value', severity: 'Danger', timestamp: { _seconds: 1760000000, _nanoseconds: 0 } },
      { title: 'No severity', message: 'x' },
      null,
    ];
    global.fetch = jest.fn(() => jsonResponse(200, { success: true, data: legacy })) as any;
    const alerts = await getOfficialAlerts();
    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toMatchObject({ id: 'alert-0', title: 'Alert', severity: 'Danger', timestamp: new Date(1760000000 * 1000).toISOString() });
    expect(alerts[1]).toMatchObject({ id: 'alert-1', severity: 'Info', timestamp: '' });
  });

  it('getOfficialAlerts returns an empty list when data is not an array', async () => {
    global.fetch = jest.fn(() => jsonResponse(200, { success: true, data: { oops: true } })) as any;
    await expect(getOfficialAlerts()).resolves.toEqual([]);
  });

  it('getMySosHistory passes through the dispatch status and team', async () => {
    await authSession.saveToken('tok');
    const report = { id: 's1', crisisType: 'Flood', status: 'dispatched', assignedTeam: 'NDRF Team 4' };
    global.fetch = jest.fn(() => jsonResponse(200, { success: true, data: [report] })) as any;
    const [first] = await getMySosHistory();
    expect(first.status).toBe('dispatched');
    expect(first.assignedTeam).toBe('NDRF Team 4');
  });
});

describe('login input', () => {
  test('trims and lowercases the email before sending it', async () => {
    global.fetch = jest.fn(() => jsonResponse(200, { success: true })) as any;
    await login({ email: '  Sri@Example.com ', password: 'password123' });
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(options.body).email).toBe('sri@example.com');
  });
});

describe('request timeout', () => {
  test('a request that never answers fails with a clear message instead of hanging', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn(
      (_url: string, options: any) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => reject(new Error('Aborted')));
        }),
    ) as any;
    const pending = getOfficialAlerts();
    jest.advanceTimersByTime(60_000);
    await expect(pending).rejects.toThrow(/taking too long/);
    jest.useRealTimers();
  });
});

describe('earthquake feed', () => {
  test('asks for quakes near the user and reports the nearby scope', async () => {
    global.fetch = jest.fn(() =>
      jsonResponse(200, { success: true, scope: 'nearby', radiusKm: 1000, days: 30, data: [{ id: 'q1', distanceKm: 420 }] }),
    ) as any;
    const feed = await getQuakes(5, 13.0827, 80.2707);
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe(`${DEFAULT_API_BASE_URL}/alerts/live?limit=5&lat=13.083&lon=80.271`);
    expect(feed.scope).toBe('nearby');
    expect(feed.events[0].distanceKm).toBe(420);
    expect(describeQuakeFeed(feed)).toBe('Earthquakes within 1000 km of you, last 30 days');
  });

  test('without a location, or from an older backend, the feed is worldwide', async () => {
    global.fetch = jest.fn(() => jsonResponse(200, { success: true, data: [] })) as any;
    const feed = await getQuakes(5);
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe(`${DEFAULT_API_BASE_URL}/alerts/live?limit=5`);
    expect(feed.scope).toBe('worldwide');
    expect(describeQuakeFeed(feed)).toBe('Largest earthquakes worldwide today');
  });
});
