import React, { useCallback, useState } from 'react';
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
  Battery,
  Waves,
  Flame,
  PlusSquare,
  Mountain,
  Send,
  PhoneCall,
  Asterisk,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import BottomTabBar from '../component/BottomTabBar';
import { useLocation } from './LocationContext';
import { submitSos, getMySosHistory, CrisisType, SosReport } from './api';
import { colors } from '../theme';
import { describeSosStatus, timeAgo } from '../services/sosStatus';

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
  const { currentLocation, latitude, longitude } = useLocation();
  const [latestSos, setLatestSos] = useState<SosReport | null>(null);

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
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitSos({
        crisisType: selectedCrisis,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        address: currentLocation ?? undefined,
      });
      Alert.alert(
        'SOS Sent',
        'Your emergency alert has been submitted with your current location. You will see here when a rescue team is on the way.'
      );
      refreshLatestSos();
    } catch (err: any) {
      Alert.alert(
        'Could not send SOS',
        err.message || 'Please check your connection and try again, or use Direct Call below.'
      );
    } finally {
      setSubmitting(false);
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
        <View style={styles.systemBadge}>
          <View style={styles.systemDot} />
          <Text style={styles.systemText}>SYSTEM ACTIVE</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* TOP STATUS BAR */}
        <View style={styles.statusRow}>
          <View>
            <Text style={styles.statusLabel}>YOUR CURRENT STATUS</Text>
            <Text style={styles.mainHeading}>Emergency Hub</Text>
          </View>
          <View style={styles.batteryContainer}>
            <Text style={styles.batteryLabel}>BATTERY</Text>
            <View style={styles.batteryRow}>
              <Battery size={16} color={colors.textPrimary} />
              <Text style={styles.batteryValue}>Device</Text>
            </View>
          </View>
        </View>

        {/* LOCATION CARD */}
        <View style={styles.locationCard}>
          <View style={styles.mapPinContainer}>
            <View style={styles.mapPinOuter}>
              <View style={styles.mapPinInner} />
            </View>
          </View>

          <View style={styles.addressOverlay}>
            <View style={styles.addressIconBox}>
              <Navigation size={20} color={colors.info} />
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
    backgroundColor: colors.dangerLight,
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
    color: colors.info,
    letterSpacing: 0.5,
  },
  mainHeading: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  batteryContainer: {
    alignItems: 'flex-end',
  },
  batteryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    marginBottom: 4,
  },
  batteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batteryValue: {
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 4,
  },
  locationCard: {
    height: 140,
    marginBottom: 25,
    backgroundColor: colors.infoLight,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPinContainer: {
    marginBottom: 10,
  },
  mapPinOuter: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(198, 40, 40, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPinInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.white,
  },
  addressOverlay: {
    width: '90%',
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
    backgroundColor: colors.infoLight,
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
