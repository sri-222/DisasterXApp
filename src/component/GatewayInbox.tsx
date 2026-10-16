import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { RadioTower } from 'lucide-react-native';
import { GatewayEvent, eventFromV1Message, getEvents, sortEvents } from '../services/gateway';
import { useConnection } from '../services/ConnectionContext';
import { timeAgo } from '../services/sosStatus';
import { colors, radii, spacing } from '../theme';

// Events held by the offline gateway (GET /api/events; the v1 firmware's
// GET /messages, latest only, when that is missing). The gateway keeps them
// in RAM, so this phone also remembers each one it has seen.
// Polls only while the screen is open and the phone is on the gateway Wi-Fi.

const POLL_MS = 5000;
const KEEP = 50;
const STORE_KEY = 'disasterx_radio_messages';

// Adds new events, keeps the ones already seen (by eventId / messageId / text),
// newest first. Returns the same list when nothing changed.
export function mergeEvents(list: GatewayEvent[], incoming: GatewayEvent[]): GatewayEvent[] {
  const known = new Set(list.map(event => event.key));
  const fresh = incoming.filter(event => !known.has(event.key));
  if (!fresh.length) return list;
  return sortEvents([...fresh, ...list]).slice(0, KEEP);
}

// Saved by this or an earlier app version (which stored v1 messages).
export function readStoredEvents(raw: string | null): GatewayEvent[] {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item: any) =>
        item && typeof item.key === 'string'
          ? (item as GatewayEvent)
          : item && typeof item.raw === 'string'
          ? eventFromV1Message(item)
          : null
      )
      .filter((item): item is GatewayEvent => item !== null);
  } catch {
    return [];
  }
}

const GatewayInbox: React.FC = () => {
  const { gatewayReachable } = useConnection();
  const [events, setEvents] = useState<GatewayEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORE_KEY)
      .then(raw => setEvents(current => mergeEvents(current, readStoredEvents(raw))))
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!gatewayReachable) return undefined;
      let cancelled = false;
      const poll = async () => {
        try {
          const latest = await getEvents();
          if (cancelled) return;
          setError(null);
          setEvents(current => {
            const merged = mergeEvents(current, latest);
            if (merged !== current) AsyncStorage.setItem(STORE_KEY, JSON.stringify(merged)).catch(() => {});
            return merged;
          });
        } catch (err: any) {
          if (cancelled) return;
          setError(
            err?.kind === 'malformed'
              ? 'The gateway answered with something this app could not read.'
              : 'The gateway is not answering. Check you are on the DisasterX Wi-Fi.'
          );
        }
      };
      poll();
      const timer = setInterval(poll, POLL_MS);
      return () => {
        cancelled = true;
        clearInterval(timer);
      };
    }, [gatewayReachable])
  );

  if (!gatewayReachable && events.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <RadioTower size={16} color={colors.warning} />
        <Text style={styles.title}>RADIO MESSAGES (OFFLINE GATEWAY)</Text>
      </View>
      <Text style={styles.status}>
        {gatewayReachable ? '● Gateway connected' : '○ Gateway not reachable. Showing messages saved earlier.'}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {events.length === 0 ? (
        <Text style={styles.empty}>No messages on the gateway yet. New ones appear here within a few seconds.</Text>
      ) : (
        events.map(event => (
          <View key={event.key} style={styles.message}>
            <Text style={styles.messageHead}>
              {`${event.emergencyType ?? 'Message'} · from ${event.name ?? event.deviceId ?? 'Unknown'} · ${timeAgo(
                event.receivedAt
              )}`}
              {event.source ? ` · via ${event.source}` : ''}
              {event.rssi != null ? ` · signal ${event.rssi} dBm` : ''}
            </Text>
            {event.message ? <Text style={styles.messageText}>{event.message}</Text> : null}
            {event.location ? <Text style={styles.messageMeta}>{event.location}</Text> : null}
            {event.eventId ? <Text style={styles.messageMeta}>{`Event ${event.eventId}`}</Text> : null}
          </View>
        ))
      )}
      <Text style={styles.note}>
        These are held by the offline gateway, not the internet. The control room may not have seen them, so call
        112 if someone needs help and you can.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.warningLight,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 11, fontWeight: '900', letterSpacing: 1, color: colors.warning },
  status: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.sm },
  error: { fontSize: 12, color: colors.danger, marginTop: spacing.xs },
  empty: { fontSize: 13, color: colors.textMuted, marginTop: spacing.md },
  message: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  messageHead: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
  messageText: { fontSize: 14, color: colors.textPrimary, marginTop: 4, lineHeight: 19 },
  messageMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  note: { fontSize: 11, color: colors.textSecondary, marginTop: spacing.md, lineHeight: 16 },
});

export default GatewayInbox;
