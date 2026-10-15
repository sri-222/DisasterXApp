import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from './AppHeader';
import {
  Cloud,
  Droplets,
  Sunrise,
  Sunset,
  Thermometer,
  Wind,
} from 'lucide-react-native';
import { useLocation } from './LocationContext';
import { getWeather, WeatherData } from './api';
import { colors } from '../theme';

function formatTime(iso: string | null): string {
  if (!iso) return '--:--';
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const WeatherScreen: React.FC = () => {
  const { currentLocation, latitude, longitude, locationLoading } = useLocation();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (latitude == null || longitude == null) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getWeather(latitude, longitude)
      .then(data => {
        if (!cancelled) setWeather(data);
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Unable to load live weather data.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  const showWaitingForLocation = latitude == null && longitude == null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <AppHeader
        showLogo={false}
        showLocation={true}
        showProfileBtn={true}
        showSearchBtn={false}
        showBackButton
        variant="dark"
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <View style={styles.locationRow}>
            <Text style={styles.locationLabel} numberOfLines={1}>
              {currentLocation || weather?.location || 'Current location'}
            </Text>
            <Text style={styles.statusText}>{loading ? 'Updating' : 'Live'}</Text>
          </View>

          {(loading || locationLoading) && !weather && (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.white} />
              <Text style={styles.centerStateText}>Fetching live conditions…</Text>
            </View>
          )}

          {showWaitingForLocation && !loading && !locationLoading && (
            <View style={styles.centerState}>
              <Text style={styles.centerStateText}>
                Waiting for your device location to request live weather.
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.centerState}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {weather && (
            <>
              <View style={styles.tempGraphic}>
                <View style={styles.cloudWrapper}>
                  <Cloud size={70} color="#FFF" />
                </View>
                <Text style={styles.mainTemp}>
                  {weather.temperature != null ? `${Math.round(weather.temperature)}°` : '--°'}
                </Text>
                <Text style={styles.description}>{weather.conditions}</Text>
              </View>
              <View style={styles.metricsRow}>
                <View style={styles.metric}>
                  <Thermometer size={18} color="#FF8A65" />
                  <Text style={styles.metricLabel}>Real Feel</Text>
                  <Text style={styles.metricValue}>
                    {weather.feelsLike != null ? `${Math.round(weather.feelsLike)}°` : '--'}
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Wind size={18} color="#82B1FF" />
                  <Text style={styles.metricLabel}>Wind</Text>
                  <Text style={styles.metricValue}>
                    {weather.wind != null ? `${weather.wind} m/s` : '--'}
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Droplets size={18} color="#4FC3F7" />
                  <Text style={styles.metricLabel}>Humidity</Text>
                  <Text style={styles.metricValue}>
                    {weather.humidity != null ? `${weather.humidity}%` : '--'}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {weather && (
          <View style={styles.forecastCard}>
            <Text style={styles.forecastTitle}>Live Conditions</Text>
            <View style={styles.conditionsGrid}>
              <View style={styles.conditionItem}>
                <Sunrise size={22} color="#FFD54F" />
                <Text style={styles.conditionLabel}>Sunrise</Text>
                <Text style={styles.conditionValue}>{formatTime(weather.sunrise)}</Text>
              </View>
              <View style={styles.conditionItem}>
                <Sunset size={22} color="#FF8A65" />
                <Text style={styles.conditionLabel}>Sunset</Text>
                <Text style={styles.conditionValue}>{formatTime(weather.sunset)}</Text>
              </View>
            </View>
            <Text style={styles.updatedAtText}>
              Last updated {formatTime(weather.updatedAt)} · source: Open-Meteo
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080808',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#101010',
    borderRadius: 30,
    padding: 20,
    marginBottom: 20,
    borderColor: '#1e1e1e',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 10 },
    minHeight: 200,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  locationLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
    flexShrink: 1,
    marginRight: 10,
  },
  statusText: {
    color: '#FFB74D',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  centerStateText: {
    color: '#BBBBBB',
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },
  tempGraphic: {
    alignItems: 'center',
    marginVertical: 10,
  },
  cloudWrapper: {
    width: 120,
    height: 120,
    borderRadius: 70,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  mainTemp: {
    color: '#FFFFFF',
    fontSize: 64,
    fontWeight: '900',
    marginTop: -10,
  },
  description: {
    color: '#BBBBBB',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    marginTop: 4,
    color: '#888',
    fontSize: 12,
  },
  metricValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  forecastCard: {
    backgroundColor: '#101010',
    borderRadius: 30,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    marginBottom: 20,
  },
  forecastTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 15,
  },
  conditionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  conditionItem: {
    alignItems: 'center',
  },
  conditionLabel: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 6,
  },
  conditionValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  updatedAtText: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
  },
});

export default WeatherScreen;
