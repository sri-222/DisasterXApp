import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from './AppHeader';
import {
  Cloud,
  CloudLightning,
  Droplets,
  Sun,
  ChartLine,
  Thermometer,
  Wind,
} from 'lucide-react-native';
import { useLocation } from './LocationContext';

type ForecastItem = {
  label: string;
  temp: string;
  icon: React.ComponentType<any>;
  accent: string;
};

const hourly: ForecastItem[] = [
  { label: '12:00', temp: '20°', icon: Sun, accent: '#FFC107' },
  { label: '13:00', temp: '23°', icon: Cloud, accent: '#90CAF9' },
  { label: '14:00', temp: '25°', icon: CloudLightning, accent: '#FDD835' },
  { label: '15:00', temp: '23°', icon: Droplets, accent: '#4FC3F7' },
  { label: '16:00', temp: '22°', icon: Cloud, accent: '#80DEEA' },
  { label: '17:00', temp: '19°', icon: Sun, accent: '#FFD54F' },
];

const nearby = [
  { city: 'Rangpur', note: 'Clear Sky', temp: '15°', icon: Sun },
  { city: 'Dhaka', note: 'Light Rain', temp: '17°', icon: Droplets },
];

const WeatherScreen: React.FC = () => {
  const { currentLocation } = useLocation();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <AppHeader
        showLogo={false}
        showLocation={true}
        showProfileBtn={true}
        showSearchBtn={false}
        showFilterBtn={false}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <View style={styles.locationRow}>
            <Text style={styles.locationLabel}>{currentLocation || 'Current location'}</Text>
            <Text style={styles.statusText}>Updating</Text>
          </View>
          <View style={styles.tempGraphic}>
            <View style={styles.cloudWrapper}>
              <Cloud size={70} color="#FFF" />
              <CloudLightning size={42} color="#FFEB3B" style={styles.lightning} />
            </View>
            <Text style={styles.mainTemp}>23°</Text>
            <Text style={styles.description}>Thunderclouds · Friday, 12 Feb</Text>
          </View>
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Thermometer size={18} color="#FF8A65" />
              <Text style={styles.metricLabel}>Real Feel</Text>
              <Text style={styles.metricValue}>22.6°</Text>
            </View>
            <View style={styles.metric}>
              <Wind size={18} color="#82B1FF" />
              <Text style={styles.metricLabel}>Wind</Text>
              <Text style={styles.metricValue}>7 km/h</Text>
            </View>
            <View style={styles.metric}>
              <Droplets size={18} color="#4FC3F7" />
              <Text style={styles.metricLabel}>Rain</Text>
              <Text style={styles.metricValue}>65%</Text>
            </View>
          </View>
        </View>

        <View style={styles.forecastCard}>
          <View style={styles.forecastHeader}>
            <Text style={styles.forecastTitle}>Forecast</Text>
            <View style={styles.toggleRow}>
              <View style={styles.toggleButton}>
                <Text style={styles.toggleTextActive}>Day</Text>
              </View>
              <Text style={styles.toggleText}>Month</Text>
            </View>
          </View>

          <View style={styles.forecastList}>
            {hourly.map(item => (
              <View style={styles.forecastItem} key={item.label}>
                <Text style={styles.forecastLabel}>{item.label}</Text>
                <item.icon size={24} color={item.accent} />
                <Text style={styles.forecastTemp}>{item.temp}</Text>
              </View>
            ))}
          </View>

          <View style={styles.graph}>
            <ChartLine color="#FFF" size={120} />
            <Text style={styles.graphValue}>16.3 km/h</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Nearby Locations</Text>
        {nearby.map(place => (
          <View style={styles.nearbyCard} key={place.city}>
            <View>
              <Text style={styles.nearbyCity}>{place.city}</Text>
              <Text style={styles.nearbyNote}>{place.note}</Text>
            </View>
            <View style={styles.nearbyMeta}>
              <place.icon size={28} color="#FFD54F" />
              <Text style={styles.nearbyTemp}>{place.temp}</Text>
            </View>
          </View>
        ))}

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
  },
  statusText: {
    color: '#FFB74D',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    position: 'relative',
  },
  lightning: {
    position: 'absolute',
    bottom: 12,
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
  forecastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  forecastTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleButton: {
    backgroundColor: '#272727',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 6,
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  toggleText: {
    color: '#666',
    fontSize: 13,
  },
  forecastList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  forecastItem: {
    alignItems: 'center',
  },
  forecastLabel: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 6,
  },
  forecastTemp: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  graph: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  graphValue: {
    color: '#fff',
    fontSize: 13,
    marginTop: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  nearbyCard: {
    backgroundColor: '#101010',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: '#1f1f1f',
    borderWidth: 1,
  },
  nearbyCity: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  nearbyNote: {
    color: '#888',
    fontSize: 12,
  },
  nearbyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nearbyTemp: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    marginLeft: 10,
  },
});

export default WeatherScreen;
