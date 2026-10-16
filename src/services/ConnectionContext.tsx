import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { checkRoutes, ConnectionMode, getPendingCount, modeFor, retryPendingMessages } from './sosOutbox';
import { GatewayHealth, getGatewayStatus } from './gateway';

// One app-wide loop that works out which route is usable right now and
// retries any SOS still waiting in the outbox. It lives at the app root so
// navigating between screens never starts a second loop.

const CHECK_EVERY_MS = 15_000;

interface ConnectionState {
  mode: ConnectionMode | 'checking';
  // The phone is on the DisasterX gateway's Wi-Fi (true even when online).
  gatewayReachable: boolean;
  // What the gateway's /health said last time (mode, radio), if anything.
  gateway: GatewayHealth | null;
  lastCheckedAt: Date | null;
  refresh: () => Promise<ConnectionMode>;
}

const ConnectionContext = createContext<ConnectionState>({
  mode: 'checking',
  gatewayReachable: false,
  gateway: null,
  lastCheckedAt: null,
  refresh: async () => 'offline',
});

export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ConnectionState['mode']>('checking');
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [gatewayReachable, setGatewayReachable] = useState(false);
  const [gateway, setGateway] = useState<GatewayHealth | null>(null);
  const inFlight = useRef<Promise<ConnectionMode> | null>(null);

  const refresh = useCallback(() => {
    if (inFlight.current) return inFlight.current;
    inFlight.current = (async () => {
      const routes = await checkRoutes();
      const next = modeFor(routes);
      setMode(next);
      setGatewayReachable(routes.gateway);
      setGateway(routes.gateway ? getGatewayStatus().health : null);
      setLastCheckedAt(new Date());
      if (next !== 'offline' && (await getPendingCount()) > 0) {
        retryPendingMessages(next).catch(() => {});
      }
      return next;
    })().finally(() => {
      inFlight.current = null;
    });
    return inFlight.current;
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      refresh();
      timer = setInterval(refresh, CHECK_EVERY_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    start();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      stop();
      subscription.remove();
    };
  }, [refresh]);

  return (
    <ConnectionContext.Provider value={{ mode, gatewayReachable, gateway, lastCheckedAt, refresh }}>
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = () => useContext(ConnectionContext);

export const CONNECTION_COPY: Record<ConnectionState['mode'], { label: string; detail: string }> = {
  checking: { label: 'Checking connection', detail: 'Looking for the internet and the DisasterX gateway.' },
  online: { label: 'Online', detail: 'SOS goes straight to the DisasterX control room.' },
  gateway: {
    label: 'Offline gateway',
    detail:
      'No internet. SOS goes to the DisasterX gateway, which can relay it over LoRa radio. It is confirmed only once the internet is back.',
  },
  offline: {
    label: 'No connection',
    detail: 'SOS will be saved on this phone and sent when the internet or the DisasterX Wi-Fi is back.',
  },
};
