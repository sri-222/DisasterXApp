import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { RadioTower } from 'lucide-react-native';
import { GatewayMessage, getLatestGatewayMessage } from '../services/gateway';
import { useConnection } from '../services/ConnectionContext';
import { timeAgo } from '../services/sosStatus';
import { colors, radii, spacing } from '../theme';

// Messages heard by the offline LoRa gateway. The gateway only keeps the
// latest one in memory, so this phone remembers each new one it sees.
// Polls only while the screen is open and the phone is on the gateway Wi-Fi.

const POLL_MS = 5000;
const KEEP = 20;
const STORE_KEY = 'disasterx_radio_messages';

export function mergeMessage(list: GatewayMessage[], next: GatewayMessage | null): GatewayMessage[] {
  if (!next) return list;
  // Same text as the newest one we have = the gateway still holds it.
  if (list[0]?.raw === next.raw) return list;
  return [next, ...list].slice(0, KEEP);
}

const GatewayInbox: React.FC = () => {
  const { gatewayReachable } = useConnection();
  const [messages, setMessages] = useState<GatewayMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORE_KEY)
      .then(raw => raw && setMessages(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!gatewayReachable) return undefined;
      let cancelled = false;
      const poll = async () => {
        try {
          const latest = await getLatestGatewayMessage();
          if (cancelled) return;
          setError(null);
          setMessages(current => {
            const merged = mergeMessage(current, latest);
            if (merged !== current) AsyncStorage.setItem(STORE_KEY, JSON.stringify(merged)).catch(() => {});
            return merged;
          });
        } catch {
          if (!cancelled) setError('The gateway is not answering. Check you are on the DisasterX Wi-Fi.');
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

  if (!gatewayReachable && messages.length === 0) return null;

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
      {messages.length === 0 ? (
        <Text style={styles.empty}>No radio messages heard yet. New ones appear here within a few seconds.</Text>
      ) : (
        messages.map(message => (
          <View key={`${message.receivedAt}-${message.raw}`} style={styles.message}>
            <Text style={styles.messageHead}>
              {`${message.type} · from ${message.sender} · ${timeAgo(message.receivedAt)}`}
              {message.rssi != null ? ` · signal ${message.rssi} dBm` : ''}
            </Text>
            <Text style={styles.messageText}>{message.text}</Text>
          </View>
        ))
      )}
      <Text style={styles.note}>
        These came over LoRa radio, not the internet. The control room may not have seen them, so call 112 if
        someone needs help and you can.
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
  note: { fontSize: 11, color: colors.textSecondary, marginTop: spacing.md, lineHeight: 16 },
});

export default GatewayInbox;
