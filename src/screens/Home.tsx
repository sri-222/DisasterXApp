import React, { useEffect, useState } from 'react';

import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import {
  MapPin,
  ChevronRight,
  Radio,
  Activity,
  Hospital,
  Hotel,
  Megaphone,
  Siren,
  CloudSun,
  Utensils,
  Pill,
  Home as HomeIcon,
  MoreHorizontal,
} from 'lucide-react-native';
import BottomTabBar from '../component/BottomTabBar';
import AppHeader from './AppHeader';
import { useLocation } from './LocationContext';
import { getLiveAlerts, getOfficialAlerts, getWeather, LiveAlertEvent, OfficialAlert, WeatherData } from './api';
import { colors } from '../theme';

const SEVERITY_STYLE: Record<LiveAlertEvent['severity'], { color: string; bgColor: string }> = {
  Danger: { color: '#C62828', bgColor: '#FFEBEE' },
  Warning: { color: '#A66114', bgColor: '#FFF3E0' },
  Info: { color: '#0D47A1', bgColor: '#E3F2FD' },
  Safe: { color: '#2E7D32', bgColor: '#E8F5E9' },
};

// Opens Google Maps searching for a kind of place near the user.
function openNearby(query: string, latitude: number | null, longitude: number | null) {
  const near = latitude != null && longitude != null ? `/@${latitude},${longitude},14z` : '';
  Linking.openURL(`https://www.google.com/maps/search/${encodeURIComponent(query)}${near}`).catch(() => {});
}

function openPoint(lat?: number | null, lon?: number | null) {
  if (lat == null || lon == null) return;
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`).catch(() => {});
}

const AlertCard = ({
  type,
  title,
  desc,
  time,
  color,
  bgColor,
  icon: Icon,
  onMapPress,
}: any) => (
  <View style={[styles.alertCard, { backgroundColor: bgColor }]}>
    <View style={styles.alertHeader}>
      <View style={[styles.badge, { backgroundColor: color }]}>
        <Text style={styles.badgeText}>{type}</Text>
      </View>

      <Icon color={color} size={20} />
    </View>

    <Text style={[styles.alertTitle, { color }]}>{title}</Text>

    <Text style={styles.alertDesc}>{desc}</Text>

    <View style={styles.alertFooter}>
      <Text style={styles.updateText}>UPDATED {time}</Text>

      {onMapPress && (
        <TouchableOpacity
          style={[styles.smallMapBtn, { backgroundColor: color }]}
          onPress={onMapPress}
        >
          <MapPin size={12} color="#FFF" />
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const NEARBY_PLACES = [
  { label: 'Hospitals', query: 'hospital', icon: Hospital, color: '#1E88E5' },
  { label: 'Relief shelters', query: 'relief shelter', icon: Hotel, color: '#6D4C41' },
  { label: 'Police stations', query: 'police station', icon: Siren, color: '#C62828' },
];

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const {
    currentLocation,
    latitude,
    longitude,
    locationError,
    fetchLocation,
    isPermissionDenied,
    openLocationSettings,
  } = useLocation();

  const permissionBannerActive =
    isPermissionDenied || locationError?.toLowerCase().includes('permission');

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [alerts, setAlerts] = useState<LiveAlertEvent[]>([]);
  const [officialAlerts, setOfficialAlerts] = useState<OfficialAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  useEffect(() => {
    if (latitude == null || longitude == null) return;
    getWeather(latitude, longitude)
      .then(setWeather)
      .catch(() => setWeather(null));
  }, [latitude, longitude]);

  useEffect(() => {
    // Official broadcasts from the control room come first on Home.
    Promise.allSettled([getOfficialAlerts(2), getLiveAlerts(2)]).then(([official, quakes]) => {
      if (official.status === 'fulfilled') setOfficialAlerts(official.value);
      if (quakes.status === 'fulfilled') setAlerts(quakes.value);
      setAlertsLoading(false);
    });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundAlt} />

      <AppHeader
        showLogo
        showLocation
        showProfileBtn
        showSearchBtn
        onSearchPress={() => navigation.navigate('Alerts')} // Assuming search navigates to alerts
      />

      {permissionBannerActive && (
        <View style={styles.permissionBanner}>
          <Text style={styles.permissionText}>
            The app needs location access to keep alerts and weather updated for you.
          </Text>
          <View style={styles.permissionActions}>
            <TouchableOpacity onPress={fetchLocation} style={styles.permissionBtn}>
              <Text style={styles.permissionBtnText}>Ask Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openLocationSettings}
              style={styles.permissionBtn}>
              <Text style={styles.permissionBtnText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* WEATHER MINI CARD - Now inside ScrollView */}
        <TouchableOpacity
          style={styles.weatherCard}
          onPress={() => navigation.navigate('Weather')} // Navigate to WeatherScreen
          activeOpacity={0.8}>
          <View style={styles.weatherIconContainer}>
            <CloudSun size={24} color="#FFB300" />
          </View>
          <View style={styles.weatherInfo}>
            <Text style={styles.weatherTemp}>
              {weather?.temperature != null ? `${Math.round(weather.temperature)}°C` : '--°C'}
            </Text>
            <Text style={styles.weatherCondition}>
              {weather?.conditions || 'Tap for live conditions'}
            </Text>
          </View>
          {currentLocation &&
            currentLocation !== 'Permission Denied' &&
            currentLocation !== 'Location Unavailable' && (
              <View style={styles.weatherLocation}>
                <MapPin size={14} color="#666" />
                <Text style={styles.weatherLocationText}>
                  {currentLocation.split(',')[0]}
                </Text>
              </View>
            )}
        </TouchableOpacity>

          <View style={styles.sosCard}>
            <Text style={styles.sosTitle}>EMERGENCY{'\n'}ASSISTANCE</Text>

            <Text style={styles.sosSubtitle}>
              Tap SOS to open the emergency hub and send your GPS location to
              the rescue control room.
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.sosButtonContainer}
              onPress={() => navigation.navigate('SOS')}
            >
              <View style={styles.sosCircleInner}>
                <Radio color="#FFF" size={32} />

                <Text style={styles.sosBtnText}>SOS</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.monitoringBadge}>
              <View style={styles.dot} />

              <Text style={styles.monitoringText}>LIVE MONITORING ACTIVE</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Disaster Alerts</Text>

              <Text style={styles.sectionSubtitle}>
                Official alerts and major earthquakes
              </Text>
            </View>
          <TouchableOpacity onPress={() => navigation.navigate('Alerts')}>
              <Text style={styles.viewAllText}>View All →</Text>
            </TouchableOpacity>
          </View>

          {alertsLoading && (
            <Text style={styles.alertsLoadingText}>Loading live alerts…</Text>
          )}

          {!alertsLoading && alerts.length === 0 && officialAlerts.length === 0 && (
            <Text style={styles.alertsLoadingText}>No active events reported right now.</Text>
          )}

          {officialAlerts.map(alert => {
            const style = SEVERITY_STYLE[alert.severity] ?? SEVERITY_STYLE.Info;
            return (
              <AlertCard
                key={alert.id}
                type={`OFFICIAL · ${alert.severity.toUpperCase()}`}
                title={alert.title}
                desc={alert.message}
                time={alert.location !== 'Unknown' ? alert.location.toUpperCase() : 'FROM AUTHORITIES'}
                color={style.color}
                bgColor={style.bgColor}
                icon={Megaphone}
                onMapPress={alert.lat != null ? () => openPoint(alert.lat, alert.lon) : undefined}
              />
            );
          })}

          {alerts.map(event => {
            const style = SEVERITY_STYLE[event.severity] ?? SEVERITY_STYLE.Info;
            return (
              <AlertCard
                key={event.id}
                type={event.severity.toUpperCase()}
                title={`M${event.magnitude.toFixed(1)} Earthquake`}
                desc={event.detail}
                time={event.updated}
                color={style.color}
                bgColor={style.bgColor}
                icon={Activity}
                onMapPress={() => openPoint(event.lat, event.lon)}
              />
            );
          })}


          {/* REQUEST HELP SECTION */}
          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
            Need Assistance?
          </Text>
          <View style={styles.requestHelpGrid}>
            <TouchableOpacity
              style={styles.requestHelpItem}
              onPress={() => navigation.navigate('RequestHelp', { category: 'Food' })}
            >
              <Utensils size={28} color="#C62828" />
              <Text style={styles.requestHelpText}>Food</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.requestHelpItem}
              onPress={() => navigation.navigate('RequestHelp', { category: 'Medicine' })}
            >
              <Pill size={28} color="#0D47A1" />
              <Text style={styles.requestHelpText}>Medicine</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.requestHelpItem}
              onPress={() => navigation.navigate('RequestHelp', { category: 'Shelter' })}
            >
              <HomeIcon size={28} color="#A66114" />
              <Text style={styles.requestHelpText}>Shelter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.requestHelpItem}
              onPress={() => navigation.navigate('RequestHelp', { category: 'Other' })}
            >
              <MoreHorizontal size={28} color="#444" />
              <Text style={styles.requestHelpText}>Others</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
            Find Help Nearby
          </Text>

          <View style={styles.listCard}>
            {NEARBY_PLACES.map(place => (
              <TouchableOpacity
                key={place.query}
                style={styles.listItem}
                onPress={() => openNearby(place.query, latitude, longitude)}
              >
                <View style={styles.listIconBox}>
                  <place.icon size={20} color={place.color} />
                </View>
                <View style={styles.listContent}>
                  <Text style={styles.listName}>{place.label}</Text>
                  <Text style={styles.listDetail}>Opens Google Maps near you</Text>
                </View>
                <ChevronRight size={20} color="#BDBDBD" />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

      <BottomTabBar activeTab="HOME" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({ // Renamed safeArea to container
  container: {
    flex: 1, 
    backgroundColor: '#FAFAFA',
  },
  permissionBanner: {
    backgroundColor: '#FFF3E0',
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 14,
    marginTop: 10,
  },
  permissionText: {
    color: '#BF360C',
    fontSize: 13,
    marginBottom: 10,
    fontWeight: '500',
  },
  permissionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  permissionBtn: {
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#D84315',
    borderRadius: 12,
  },
  permissionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20, // Apply horizontal padding to all scrollable content
    paddingBottom: 110,
  },
  sosCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 25,
    alignItems: 'center',
    marginBottom: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  sosTitle: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 36,
  },
  sosSubtitle: {
    textAlign: 'center',
    color: '#757575',
    marginTop: 10,
    marginBottom: 30,
  },
  sosButtonContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#C62828',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 10,
    borderColor: '#FFEBEE',
  },
  sosCircleInner: {
    alignItems: 'center',
  },
  sosBtnText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 20,
    marginTop: 5,
  },
  monitoringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 30,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C62828',
    marginRight: 8,
  },
  monitoringText: {
    color: '#C62828',
    fontSize: 11,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  sectionTitleSpaced: {
    marginTop: 20,
    marginBottom: 15,
  },
  sectionSubtitle: {
    color: '#757575',
    fontSize: 13,
  },
  viewAllText: {
    color: '#C62828',
    fontWeight: '700',
  },
  alertCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
  },
  alertsLoadingText: {
    color: '#757575',
    fontSize: 13,
    marginBottom: 15,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },
  alertDesc: {
    color: '#555',
    fontSize: 13,
    marginTop: 5,
    lineHeight: 18,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    alignItems: 'center',
  },
  updateText: {
    fontSize: 10,
    fontWeight: '700',
    opacity: 0.6,
  },
  smallMapBtn: {
    padding: 6,
    borderRadius: 8,
  },
  listCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingVertical: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  listIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flex: 1,
    marginLeft: 15,
  },
  listName: {
    fontWeight: '700',
    fontSize: 15,
  },
  listDetail: {
    color: '#9E9E9E',
    fontSize: 12,
    marginTop: 2,
  },
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  weatherIconContainer: {
    backgroundColor: '#FFFDE7',
    padding: 10,
    borderRadius: 12,
    marginRight: 15,
  },
  weatherInfo: {
    flex: 1,
  },
  weatherTemp: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  weatherCondition: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    marginTop: 2,
  },
  weatherLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherLocationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  requestHelpGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  requestHelpItem: {
    width: '48%', // Roughly half width, accounting for spacing
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  requestHelpText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 10,
  },
});

export default HomeScreen;
