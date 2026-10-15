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
import { MapPin, ArrowRight, TrendingUp, Globe2, Megaphone } from 'lucide-react-native';
import AppHeader from './AppHeader';
import { useLocation } from './LocationContext';
import { getLiveAlerts, getOfficialAlerts, LiveAlertEvent, OfficialAlert } from './api';
import { timeAgo } from '../services/sosStatus';
import BottomTabBar from '../component/BottomTabBar';
import ErrorBoundary from '../component/ErrorBoundary';
import { colors, radii, spacing } from '../theme';

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

// Re-check while the screen is open so a new broadcast shows up without a pull.
const REFRESH_MS = 30_000;

const AlertsScreen: React.FC = () => {
  const {
    locationError,
    isPermissionDenied,
    fetchLocation,
    openLocationSettings,
  } = useLocation();

  const [alerts, setAlerts] = useState<LiveAlertEvent[]>([]);
  const [officialAlerts, setOfficialAlerts] = useState<OfficialAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const permissionBannerActive =
    isPermissionDenied || locationError?.toLowerCase().includes('permission');

  const loadAlerts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    // Load both feeds independently: one failing must not hide the other.
    const [quakes, official] = await Promise.allSettled([getLiveAlerts(12), getOfficialAlerts()]);
    if (official.status === 'fulfilled') setOfficialAlerts(official.value);
    if (quakes.status === 'fulfilled') {
      setAlerts(quakes.value);
    } else {
      setError(quakes.reason?.message || 'Unable to load live alerts right now.');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadAlerts();
    const timer = setInterval(() => {
      getOfficialAlerts()
        .then(setOfficialAlerts)
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
            <Text style={styles.lastUpdated}>Authorities and USGS live feeds</Text>
          </View>
        </View>

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
            <View style={styles.sectionHeader}>
              <Globe2 size={16} color={colors.textMuted} />
              <Text style={styles.sectionHeaderText}>EARTHQUAKES WORLDWIDE</Text>
            </View>
          </>
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
              <Text style={styles.vitalityTitle}>REGIONAL VITALITY</Text>
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
