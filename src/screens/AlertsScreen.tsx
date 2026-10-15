import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, ArrowRight, TrendingUp, Globe2, Megaphone, HelpCircle, ChevronDown, ChevronUp, WifiOff } from 'lucide-react-native';
import AppHeader from './AppHeader';
import { useLocation } from './LocationContext';
import { describeQuakeFeed, getOfficialAlerts, getQuakes, LiveAlertEvent, OfficialAlert, QuakeFeed } from './api';
import { timeAgo } from '../services/sosStatus';
import BottomTabBar from '../component/BottomTabBar';
import ErrorBoundary from '../component/ErrorBoundary';
import { colors, radii, spacing } from '../theme';
import GatewayInbox from '../component/GatewayInbox';
import { quakeMeaning, severityGuide, SEVERITY_GUIDE, Severity } from '../services/alertGuide';
import { withOfflineCache } from '../services/offlineCache';

const SEVERITY_COLOR: Record<LiveAlertEvent['severity'], string> = {
  Danger: colors.danger,
  Warning: colors.warning,
  Info: colors.info,
  Safe: colors.success,
};

const SituationAlert = ({ event }: { event: LiveAlertEvent }) => {
  const color = SEVERITY_COLOR[event.severity] ?? colors.info;
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.alertCard}
      onPress={() => event.url && Linking.openURL(event.url).catch(() => {})}
      disabled={!event.url}
    >
      <View style={[styles.severityBar, { backgroundColor: color }]} />
      <View style={styles.alertContent}>
        <View style={styles.alertHeaderRow}>
          <View style={[styles.severityBadge, { backgroundColor: `${color}15` }]}>
            <Text style={[styles.severityText, { color }]}>{event.severity.toUpperCase()}</Text>
          </View>
          <Text style={styles.timeText}>{event.updated}</Text>
        </View>

        <Text style={styles.alertTitle}>{`M${event.magnitude.toFixed(1)} Earthquake`}</Text>
        <Text style={styles.alertDescription} numberOfLines={2}>
          {event.detail}
        </Text>
        <Text style={styles.meaningText}>{quakeMeaning(event.magnitude)}</Text>

        <View style={styles.alertFooter}>
          <View style={styles.locationContainer}>
            <MapPin size={14} color={colors.textMuted} />
            <Text style={styles.locationText} numberOfLines={1}>
              {event.place}
            </Text>
          </View>
          <ArrowRight size={18} color={color} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Official alerts are broadcast by authorities from the control room.
const OfficialAlertCard = ({ alert }: { alert: OfficialAlert }) => {
  const color = SEVERITY_COLOR[alert.severity] ?? colors.info;
  return (
    <View style={[styles.alertCard, styles.officialCard]}>
      <View style={[styles.severityBar, { backgroundColor: color }]} />
      <View style={styles.alertContent}>
        <View style={styles.alertHeaderRow}>
          <View style={[styles.severityBadge, { backgroundColor: `${color}15` }]}>
            <Text style={[styles.severityText, { color }]}>{`OFFICIAL · ${alert.severity.toUpperCase()}`}</Text>
          </View>
          <Text style={styles.timeText}>{timeAgo(alert.timestamp)}</Text>
        </View>
        <Text style={styles.alertTitle}>{alert.title}</Text>
        <Text style={styles.alertDescription}>{alert.message}</Text>
        <Text style={[styles.actionText, { color }]}>{severityGuide(alert.severity).action}</Text>
        {alert.location && alert.location !== 'Unknown' ? (
          <View style={styles.alertFooter}>
            <View style={styles.locationContainer}>
              <MapPin size={14} color={colors.textMuted} />
              <Text style={styles.locationText} numberOfLines={1}>
                {alert.location}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
};

// Explains, in plain words, where alerts come from and what each colour means.
const HowToRead = () => {
  const [open, setOpen] = useState(false);
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <View style={styles.guideCard}>
      <TouchableOpacity style={styles.guideHeader} onPress={() => setOpen(!open)} activeOpacity={0.8}>
        <HelpCircle size={18} color={colors.textPrimary} />
        <Text style={styles.guideTitle}>How to read this page</Text>
        <Chevron size={18} color={colors.textMuted} />
      </TouchableOpacity>
      {open && (
        <>
          <Text style={styles.guideHeading}>Where alerts come from</Text>
          <Text style={styles.guideLine}>
            <Text style={styles.guideBold}>From authorities: </Text>
            warnings published by the DisasterX control room, and automatic alerts from our flood and water-level
            sensors.
          </Text>
          <Text style={styles.guideLine}>
            <Text style={styles.guideBold}>Earthquakes: </Text>
            official readings from the US Geological Survey (USGS) near your location. Tap one for the full report.
          </Text>
          <Text style={styles.guideLine}>
            <Text style={styles.guideBold}>Radio messages: </Text>
            SOS calls heard by the DisasterX offline gateway over LoRa radio, shown when you are on its Wi-Fi.
          </Text>
          <Text style={styles.guideHeading}>What the colours mean</Text>
          {(Object.keys(SEVERITY_GUIDE) as Severity[]).map(level => (
            <View key={level} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: SEVERITY_COLOR[level] }]} />
              <Text style={styles.legendText}>
                <Text style={[styles.guideBold, { color: SEVERITY_COLOR[level] }]}>{`${level}: `}</Text>
                {`${SEVERITY_GUIDE[level].meaning} ${SEVERITY_GUIDE[level].action}`}
              </Text>
            </View>
          ))}
          <Text style={styles.guideHeading}>Notifications</Text>
          <Text style={styles.guideLine}>
            Allow notifications and new official alerts reach you even when the app is closed. In danger, use the SOS
            tab or call 112.
          </Text>
        </>
      )}
    </View>
  );
};

// Re-check while the screen is open so a new broadcast shows up without a pull.
const REFRESH_MS = 30_000;

const AlertsScreen: React.FC = () => {
  const {
    latitude,
    longitude,
    locationError,
    isPermissionDenied,
    fetchLocation,
    openLocationSettings,
  } = useLocation();

  const [alerts, setAlerts] = useState<LiveAlertEvent[]>([]);
  const [officialAlerts, setOfficialAlerts] = useState<OfficialAlert[]>([]);
  const [quakeScope, setQuakeScope] = useState<Pick<QuakeFeed, 'scope' | 'radiusKm' | 'days'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the internet is down and we are showing the last saved copy.
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const permissionBannerActive =
    isPermissionDenied || locationError?.toLowerCase().includes('permission');

  const loadAlerts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    // Load both feeds independently: one failing must not hide the other.
    const [quakes, official] = await Promise.allSettled([
      withOfflineCache('quakes', () => getQuakes(12, latitude, longitude)),
      withOfflineCache('official_alerts', () => getOfficialAlerts()),
    ]);
    if (official.status === 'fulfilled') setOfficialAlerts(official.value.data);
    const stale = [quakes, official]
      .map(result => (result.status === 'fulfilled' ? result.value.savedAt : null))
      .filter((at): at is string => !!at)
      .sort()[0];
    setSavedAt(stale ?? null);
    if (quakes.status === 'fulfilled') {
      setAlerts(quakes.value.data.events);
      setQuakeScope(quakes.value.data);
    } else {
      setError(quakes.reason?.message || 'Unable to load live alerts right now.');
    }
    setLoading(false);
    setRefreshing(false);
  }, [latitude, longitude]);

  useEffect(() => {
    loadAlerts();
    const timer = setInterval(() => {
      withOfflineCache('official_alerts', () => getOfficialAlerts())
        .then(result => setOfficialAlerts(result.data))
        .catch(() => {});
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadAlerts]);

  const criticalCount =
    alerts.filter(a => a.severity === 'Danger').length +
    officialAlerts.filter(a => a.severity === 'Danger').length;
  const largestMagnitude = alerts.reduce((max, a) => Math.max(max, a.magnitude), 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <AppHeader showLogo showLocation showProfileBtn />
      {permissionBannerActive && (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionText}>
            The app needs location access to show relevant alerts.
          </Text>
          <View style={styles.permissionActions}>
            <TouchableOpacity onPress={fetchLocation} style={styles.permissionBtn}>
              <Text style={styles.permissionBtnText}>Ask Again</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={openLocationSettings} style={styles.permissionBtn}>
              <Text style={styles.permissionBtnText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadAlerts(true)} tintColor={colors.danger} />
        }
      >
        {/* TITLE SECTION */}
        <View style={styles.titleSection}>
          <Text style={styles.situationReport}>LIVE SITUATION REPORT</Text>
          <Text style={styles.mainTitle}>Active Alerts</Text>
          <View style={styles.statsRow}>
            <View style={styles.criticalBadge}>
              <View style={styles.dot} />
              <Text style={styles.criticalText}>{criticalCount} CRITICAL</Text>
            </View>
            <Text style={styles.lastUpdated}>From authorities, sensors and USGS</Text>
          </View>
        </View>

        {savedAt && (
          <View style={styles.offlineBanner}>
            <WifiOff size={16} color={colors.warning} />
            <Text style={styles.offlineText}>
              {`No internet. Showing alerts saved ${timeAgo(savedAt) || 'earlier'}. Pull down to try again.`}
            </Text>
          </View>
        )}

        <HowToRead />
        <GatewayInbox />

        {officialAlerts.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Megaphone size={16} color={colors.danger} />
              <Text style={styles.sectionHeaderText}>FROM AUTHORITIES</Text>
            </View>
            <ErrorBoundary message="Could not show the official alerts.">
              {officialAlerts.map(alert => (
                <OfficialAlertCard key={alert.id} alert={alert} />
              ))}
            </ErrorBoundary>
          </>
        )}

        {quakeScope && (
          <View style={styles.sectionHeader}>
            <Globe2 size={16} color={colors.textMuted} />
            <Text style={styles.sectionHeaderText}>{describeQuakeFeed(quakeScope).toUpperCase()}</Text>
          </View>
        )}

        {loading && (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.danger} />
            <Text style={styles.centerStateText}>Loading live alerts…</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.centerState}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!loading && !error && alerts.length === 0 && (
          <View style={styles.centerState}>
            <Globe2 size={28} color={colors.textFaint} />
            <Text style={styles.centerStateText}>No active events reported right now.</Text>
          </View>
        )}

        <ErrorBoundary message="Could not show the earthquake feed.">
          {alerts.map(event => (
            <SituationAlert key={event.id} event={event} />
          ))}
        </ErrorBoundary>

        {alerts.length > 0 && (
          <View style={styles.vitalityCard}>
            <View style={styles.vitalityHeader}>
              <Text style={styles.vitalityTitle}>EARTHQUAKE SUMMARY</Text>
              <TrendingUp size={20} color={colors.danger} />
            </View>
            <View style={styles.statsGrid}>
              <View>
                <Text style={styles.statValue}>{alerts.length}</Text>
                <Text style={styles.statLabel}>EVENTS TRACKED</Text>
              </View>
              <View>
                <Text style={styles.statValue}>{largestMagnitude.toFixed(1)}</Text>
                <Text style={styles.statLabel}>LARGEST MAGNITUDE</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <BottomTabBar activeTab="ALERTS" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  permissionBanner: {
    backgroundColor: colors.warningLight,
    borderRadius: radii.lg,
    marginHorizontal: spacing.xl,
    padding: spacing.lg - 2,
    marginTop: spacing.md - 2,
    marginBottom: spacing.xl,
  },
  permissionText: {
    color: '#BF360C',
    fontSize: 13,
    marginBottom: spacing.md - 2,
    fontWeight: '500',
  },
  permissionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  permissionBtn: {
    marginLeft: spacing.md - 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    backgroundColor: '#D84315',
    borderRadius: radii.sm + 4,
  },
  permissionBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 110,
  },
  titleSection: {
    marginBottom: 25,
  },
  situationReport: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.info,
    letterSpacing: 0.5,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    marginVertical: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  criticalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radii.lg,
    marginRight: spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
    marginRight: spacing.sm - 2,
  },
  criticalText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '900',
  },
  lastUpdated: {
    fontSize: 12,
    color: colors.textMuted,
    flexShrink: 1,
  },
  centerState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  centerStateText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    color: colors.textMuted,
  },
  officialCard: {
    borderWidth: 1,
    borderColor: colors.dangerLight,
  },
  alertCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    flexDirection: 'row',
    marginBottom: spacing.lg,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  severityBar: {
    width: 6,
  },
  alertContent: {
    flex: 1,
    padding: 20,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '900',
  },
  timeText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  alertDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 15,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  locationText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
    marginLeft: 6,
    flexShrink: 1,
  },
  meaningText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: -8,
    marginBottom: 12,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: -6,
    marginBottom: 12,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningLight,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  offlineText: { flex: 1, fontSize: 12, color: colors.textSecondary },
  guideCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  guideHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  guideTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  guideHeading: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  guideLine: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginTop: spacing.xs },
  guideBold: { fontWeight: '800', color: colors.textPrimary },
  legendRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  legendText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  vitalityCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 24,
    padding: 25,
    marginTop: 10,
  },
  vitalityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  vitalityTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    marginTop: 4,
  },
});

export default AlertsScreen;
