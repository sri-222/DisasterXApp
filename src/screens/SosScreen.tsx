import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Navigation,
  Waves,
  Flame,
  PlusSquare,
  Mountain,
  Send,
  PhoneCall,
  Asterisk,
  RefreshCw,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import BottomTabBar from '../component/BottomTabBar';
import { useLocation, usableAddress } from './LocationContext';
import { getMySosHistory, CrisisType, SosReport } from './api';
import { colors } from '../theme';
import { describeOutboxItem, describeSosStatus, timeAgo } from '../services/sosStatus';
import LocationMap from '../component/LocationMap';
import { CONNECTION_COPY, useConnection } from '../services/ConnectionContext';
import { OutboxItem, retryPendingMessages, sendSOS, subscribeOutbox } from '../services/sosOutbox';

const MODE_COLOR = {
  checking: colors.textFaint,
  online: colors.success,
  gateway: colors.warning,
  offline: colors.danger,
};

// How often to re-check the latest SOS while this screen is open, so the
// person sees the control room acknowledge and dispatch without reopening it.
const STATUS_REFRESH_MS = 15_000;

const EMERGENCY_DIAL_NUMBER = '112';

// 1. Reusable Crisis Type Component
const CrisisItem = ({ title, desc, icon: Icon, selected, onPress }: any) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    style={[styles.crisisBox, selected && styles.crisisBoxSelected]}
  >
    <Icon size={28} color={selected ? colors.danger : colors.textPrimary} />
    <Text style={styles.crisisTitleText}>{title}</Text>
    <Text style={styles.crisisDescText}>{desc}</Text>
  </TouchableOpacity>
);

const SOSScreen: React.FC = () => {
  const [selectedCrisis, setSelectedCrisis] = useState<CrisisType>('Flood');
  const [submitting, setSubmitting] = useState(false);
  const { currentLocation, latitude, longitude, fetchLocation } = useLocation();
  const [latestSos, setLatestSos] = useState<SosReport | null>(null);
  const { mode, gatewayReachable, gateway, refresh: refreshConnection } = useConnection();
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);
  const [retrying, setRetrying] = useState(false);
  // State updates land after a render, so two quick taps could both pass a
  // state check; this ref blocks the second one synchronously.
  const sendingRef = useRef(false);

  useEffect(() => subscribeOutbox(setOutbox), []);
  // SOS that haven't reached the control room yet, newest first.
  const unsent = outbox.filter(item => item.state !== 'delivered');

  const refreshLatestSos = useCallback(() => {
    getMySosHistory()
      .then(reports => setLatestSos(reports[0] ?? null))
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshLatestSos();
      const timer = setInterval(refreshLatestSos, STATUS_REFRESH_MS);
      return () => clearInterval(timer);
    }, [refreshLatestSos])
  );

  const handleSendSos = async () => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSubmitting(true);
    try {
      // Try once for a GPS fix if we don't have one yet, but never hold the
      // SOS back because of location.
      let coords = latitude != null && longitude != null ? { latitude, longitude } : null;
      if (!coords) {
        coords = await fetchLocation().catch(() => null);
      }
      const item = await sendSOS(
        {
          crisisType: selectedCrisis,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
          address: coords ? usableAddress(currentLocation) : undefined,
        },
        mode === 'checking' ? undefined : mode
      );
      const outcome = describeOutboxItem(item);
      const noLocation = coords
        ? ''
        : '\n\nYour location could not be found. Turn on location, or call 112 below.';
      const eventId = item.gatewayEventId ? `\n\nGateway event ID: ${item.gatewayEventId}` : '';
      Alert.alert(outcome.label, outcome.detail + eventId + noLocation);
      refreshLatestSos();
      refreshConnection();
    } catch (err: any) {
      // Only reached if the phone could not even save the SOS.
      Alert.alert(
        'Could not send SOS',
        err?.message || 'Please call 112 using Direct Call below.'
      );
    } finally {
      sendingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await retryPendingMessages(await refreshConnection());
    } finally {
      setRetrying(false);
      refreshLatestSos();
    }
  };

  const handleDirectCall = () => {
    Linking.openURL(`tel:${EMERGENCY_DIAL_NUMBER}`).catch(() => {
      Alert.alert('Unable to start call', `Please dial ${EMERGENCY_DIAL_NUMBER} manually.`);
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <Image source={require('./assets/logo.png')} style={styles.logo} />
        <TouchableOpacity
          style={[styles.systemBadge, { borderColor: MODE_COLOR[mode] }]}
          onPress={() => Alert.alert(CONNECTION_COPY[mode].label, CONNECTION_COPY[mode].detail)}
        >
          <View style={[styles.systemDot, { backgroundColor: MODE_COLOR[mode] }]} />
          <Text style={[styles.systemText, { color: MODE_COLOR[mode] }]}>
            {CONNECTION_COPY[mode].label.toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* TOP STATUS BAR */}
        <View style={styles.statusRow}>
          <View>
            <Text style={styles.statusLabel}>YOUR CURRENT STATUS</Text>
            <Text style={styles.mainHeading}>Emergency Hub</Text>
          </View>
        </View>

        {/* LOCATION CARD */}
        <Text style={styles.modeHint}>{CONNECTION_COPY[mode].detail}</Text>
        <Text style={styles.gatewayHint}>
          {gatewayReachable
            ? `DisasterX gateway: reachable${gateway?.mode ? ` (${gateway.mode})` : ''}${
                gateway?.radio?.status ? ` · radio ${gateway.radio.status}` : ''
              }`
            : 'DisasterX gateway: not reachable'}
        </Text>

        <View style={styles.locationCard}>
          <LocationMap latitude={latitude} longitude={longitude} />

          <View style={styles.addressOverlay}>
            <View style={styles.addressIconBox}>
              <Navigation size={20} color={colors.danger} />
            </View>
            <View style={styles.addressTextContent}>
              <Text style={styles.addressLabel}>YOUR LOCATION</Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {currentLocation || 'Resolving your location…'}
              </Text>
            </View>
          </View>
        </View>

        {/* CRISIS SELECTION GRID */}
        <Text style={styles.sectionLabel}>SELECT CRISIS TYPE</Text>
        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <CrisisItem
              title="Flood"
              desc="Rising waters, entrapment"
              icon={Waves}
              selected={selectedCrisis === 'Flood'}
              onPress={() => setSelectedCrisis('Flood')}
            />
            <CrisisItem
              title="Fire"
              desc="Wildfire, smoke, structural"
              icon={Flame}
              selected={selectedCrisis === 'Fire'}
              onPress={() => setSelectedCrisis('Fire')}
            />
          </View>
          <View style={styles.gridRow}>
            <CrisisItem
              title="Medical"
              desc="Injury, heart, trauma"
              icon={PlusSquare}
              selected={selectedCrisis === 'Medical'}
              onPress={() => setSelectedCrisis('Medical')}
            />
            <CrisisItem
              title="Earthquake"
              desc="Quake, collapse, tremor"
              icon={Mountain}
              selected={selectedCrisis === 'Earthquake'}
              onPress={() => setSelectedCrisis('Earthquake')}
            />
          </View>
        </View>

        {/* LARGE SOS BUTTON TRIGGER */}
        <View style={styles.sosTriggerArea}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.sosCircle}
            onPress={handleSendSos}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} size="large" />
            ) : (
              <>
                <Asterisk color={colors.white} size={40} strokeWidth={3} />
                <Text style={styles.sosCircleText}>SOS</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.sosInstructions}>Tap SOS to broadcast your location and crisis type</Text>
        </View>

        {/* SOS SAVED ON THIS PHONE THAT HAVEN'T REACHED THE CONTROL ROOM */}
        {unsent.map(item => {
          const outcome = describeOutboxItem(item);
          return (
            <View key={item.clientId} style={[styles.statusCard, { borderLeftColor: outcome.color }]}>
              <Text style={styles.statusCardLabel}>
                {`SOS ON THIS PHONE · ${item.crisisType.toUpperCase()} · ${timeAgo(item.createdAt)}`}
              </Text>
              <Text style={[styles.statusCardTitle, { color: outcome.color }]}>{outcome.label}</Text>
              <Text style={styles.statusCardDetail}>{outcome.detail}</Text>
              {item.gatewayEventId ? (
                <Text style={styles.statusCardDetail}>{`Gateway event ID: ${item.gatewayEventId}`}</Text>
              ) : null}
              {item.lastError ? <Text style={styles.statusCardError}>{item.lastError}</Text> : null}
              <TouchableOpacity style={styles.retryBtn} onPress={handleRetry} disabled={retrying}>
                {retrying ? (
                  <ActivityIndicator size="small" color={colors.danger} />
                ) : (
                  <RefreshCw size={14} color={colors.danger} />
                )}
                <Text style={styles.retryText}>{retrying ? 'Trying…' : 'Try sending now'}</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* LATEST SOS STATUS FROM THE CONTROL ROOM */}
        {latestSos && (() => {
          const status = describeSosStatus(latestSos);
          return (
            <View style={[styles.statusCard, { borderLeftColor: status.color }]}>
              <Text style={styles.statusCardLabel}>
                {`YOUR LAST SOS · ${latestSos.crisisType.toUpperCase()} · ${timeAgo(latestSos.createdAt)}`}
              </Text>
              <Text style={[styles.statusCardTitle, { color: status.color }]}>{status.label}</Text>
              <Text style={styles.statusCardDetail}>{status.detail}</Text>
            </View>
          );
        })()}

        {/* ACTION BUTTONS */}
        <TouchableOpacity style={styles.confirmBtn} onPress={handleSendSos} disabled={submitting}>
          <Text style={styles.confirmBtnText}>
            {submitting ? 'Sending…' : 'Send SOS Confirmation'}
          </Text>
          {!submitting && <Send size={18} color={colors.white} />}
        </TouchableOpacity>

        <TouchableOpacity style={styles.directCallBtn} onPress={handleDirectCall}>
          <PhoneCall size={18} color={colors.warning} />
          <Text style={styles.directCallText}>Direct Call Emergency Services</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomTabBar activeTab="SOS" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  statusCardLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textFaint,
    letterSpacing: 0.5,
  },
  statusCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 6,
  },
  statusCardError: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 6,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.dangerLight,
  },
  retryText: {
    color: colors.danger,
    fontWeight: '800',
    fontSize: 12,
  },
  gatewayHint: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textFaint,
    marginTop: -8,
    marginBottom: 14,
  },
  modeHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: -8,
    marginBottom: 14,
    lineHeight: 17,
  },
  statusCardDetail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  logo: {
    width: 24,
    height: 24,
  },
  systemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  systemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
    marginRight: 6,
  },
  systemText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '900',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 110,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.danger,
    letterSpacing: 0.5,
  },
  mainHeading: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  locationCard: {
    marginBottom: 25,
  },
  addressOverlay: {
    marginTop: -28,
    marginHorizontal: 12,
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
  },
  addressIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressTextContent: {
    marginLeft: 12,
    flex: 1,
  },
  addressLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textFaint,
  },
  addressText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.textFaint,
    letterSpacing: 1,
    marginBottom: 15,
  },
  grid: {
    marginBottom: 30,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  crisisBox: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 18,
    elevation: 2,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  crisisBoxSelected: {
    borderWidth: 2,
    borderColor: colors.danger,
  },
  crisisTitleText: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
    color: colors.textPrimary,
  },
  crisisDescText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 15,
  },
  sosTriggerArea: {
    alignItems: 'center',
    marginBottom: 30,
  },
  sosCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  sosCircleText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 5,
  },
  sosInstructions: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmBtn: {
    backgroundColor: colors.textPrimary,
    borderRadius: 30,
    height: 60,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    marginRight: 10,
  },
  directCallBtn: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 30,
    height: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  directCallText: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 10,
  },
});

export default SOSScreen;
