import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from './AppHeader';
import SkyBackground, { SkyTone } from '../component/SkyBackground';
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  RefreshCw,
  ShieldAlert,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Wind,
} from 'lucide-react-native';
import { useLocation } from './LocationContext';
import { getWeather, WeatherData } from './api';
import { safetyTips, SafetyTip, weatherMood, WeatherMood } from '../services/weatherAdvice';
import { colors, radii, shadow, spacing } from '../theme';

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '--:--';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// The sky and the icon follow the live conditions.
const MOOD_STYLE: Record<WeatherMood, { tone: SkyTone; Icon: typeof Sun }> = {
  clear: { tone: 'clear', Icon: Sun },
  cloudy: { tone: 'cloudy', Icon: CloudSun },
  rain: { tone: 'rain', Icon: CloudRain },
  storm: { tone: 'storm', Icon: CloudLightning },
  fog: { tone: 'cloudy', Icon: CloudFog },
  snow: { tone: 'rain', Icon: CloudSnow },
  unknown: { tone: 'clear', Icon: Cloud },
};

const TIP_STYLE: Record<SafetyTip['level'], { color: string; background: string }> = {
  danger: { color: colors.danger, background: colors.dangerLight },
  warning: { color: colors.warning, background: colors.warningLight },
  info: { color: colors.info, background: colors.infoLight },
};

const round = (value: number | null | undefined, unit: string) =>
  value != null ? `${Math.round(value)}${unit}` : '--';

const WeatherScreen: React.FC = () => {
  const { currentLocation, latitude, longitude, locationLoading } = useLocation();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (latitude == null || longitude == null) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setWeather(await getWeather(latitude, longitude));
      } catch (err: any) {
        setError(err?.message || 'Unable to load live weather data.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [latitude, longitude],
  );

  useEffect(() => {
    load();
  }, [load]);

  const waitingForLocation = latitude == null || longitude == null;
  const mood = MOOD_STYLE[weatherMood(weather?.conditions)];
  const MoodIcon = mood.Icon;
  const tips = weather ? safetyTips(weather) : [];

  return (
    <SafeAreaView style={styles.container}>
      <SkyBackground tone={mood.tone} />
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <AppHeader showLogo={false} showLocation showProfileBtn showBackButton variant="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.white} colors={[colors.info]} />
        }
      >
        <Text style={styles.kicker}>LIVE WEATHER</Text>
        <Text style={styles.title} numberOfLines={1}>
          {currentLocation || weather?.location || 'Your location'}
        </Text>

        {!weather && (
          <View style={[styles.card, styles.stateCard]}>
            {(loading || locationLoading) && (
              <>
                <ActivityIndicator color={colors.info} />
                <Text style={styles.stateText}>Fetching live conditions…</Text>
              </>
            )}
            {!loading && !locationLoading && waitingForLocation && (
              <Text style={styles.stateText}>
                Waiting for your location. Allow location access to see the weather where you are.
              </Text>
            )}
            {!loading && error && (
              <>
                <Cloud size={32} color={colors.textFaint} />
                <Text style={styles.stateText}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
                  <RefreshCw size={16} color={colors.white} />
                  <Text style={styles.retryText}>Try again</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {weather && (
          <>
            <View style={styles.hero}>
              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.heroTemp}>{round(weather.temperature, '°')}</Text>
                  <Text style={styles.heroConditions}>{weather.conditions}</Text>
                  <Text style={styles.heroFeels}>
                    Feels like {round(weather.feelsLike, '°C')}
                  </Text>
                </View>
                <View style={styles.heroIcon}>
                  <MoodIcon size={64} color={colors.white} />
                </View>
              </View>
              {error && <Text style={styles.heroNote}>Showing the last reading. {error}</Text>}
            </View>

            <View style={styles.metricsRow}>
              <View style={[styles.card, styles.metric]}>
                <Thermometer size={20} color="#E64A19" />
                <Text style={styles.metricValue}>{round(weather.feelsLike, '°C')}</Text>
                <Text style={styles.metricLabel}>Feels like</Text>
              </View>
              <View style={[styles.card, styles.metric]}>
                <Droplets size={20} color="#0288D1" />
                <Text style={styles.metricValue}>{round(weather.humidity, '%')}</Text>
                <Text style={styles.metricLabel}>Humidity</Text>
              </View>
              <View style={[styles.card, styles.metric]}>
                <Wind size={20} color="#5C6BC0" />
                <Text style={styles.metricValue}>
                  {weather.wind != null ? `${weather.wind.toFixed(1)}` : '--'}
                </Text>
                <Text style={styles.metricLabel}>Wind m/s</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <ShieldAlert size={18} color={colors.danger} />
                <Text style={styles.sectionTitle}>Stay safe</Text>
              </View>
              {tips.map(tip => (
                <View
                  key={tip.title}
                  style={[styles.tip, { backgroundColor: TIP_STYLE[tip.level].background }]}
                >
                  <Text style={[styles.tipTitle, { color: TIP_STYLE[tip.level].color }]}>{tip.title}</Text>
                  <Text style={styles.tipDetail}>{tip.detail}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.card, styles.sunRow]}>
              <View style={styles.sunItem}>
                <Sunrise size={24} color="#FFA000" />
                <Text style={styles.sunLabel}>Sunrise</Text>
                <Text style={styles.sunValue}>{formatTime(weather.sunrise)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.sunItem}>
                <Sunset size={24} color="#E64A19" />
                <Text style={styles.sunLabel}>Sunset</Text>
                <Text style={styles.sunValue}>{formatTime(weather.sunset)}</Text>
              </View>
            </View>

            <Text style={styles.footer}>
              Updated {formatTime(weather.updatedAt)} · {weather.source === 'met.no' ? 'MET Norway' : 'Open-Meteo'} ·
              pull down to refresh
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2F80ED',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 40,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.white,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  card: {
    // Frosted white so the sky shows through a little.
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.cardSmall,
  },
  stateCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  stateText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing.md,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.info,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
    marginTop: spacing.lg,
  },
  retryText: {
    color: colors.white,
    fontWeight: '700',
  },
  hero: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTemp: {
    color: colors.white,
    fontSize: 64,
    fontWeight: '900',
    lineHeight: 70,
  },
  heroConditions: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  heroFeels: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  heroIcon: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroNote: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  tip: {
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  tipDetail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  sunRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sunItem: {
    flex: 1,
    alignItems: 'center',
  },
  sunLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  sunValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
  footer: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default WeatherScreen;
