import React, { useEffect } from 'react';

import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import {
  User,
  MapPin,
  ChevronRight,
  Radio,
  Droplets,
  Bandage,
  Hotel,
  CloudSun, // Added for weather icon
  RefreshCw, // Added
  History, // Added for disaster history
  Utensils, // Added for food request
  Pill, // Added for medicine request
  Home as HomeIcon, // Renamed to avoid conflict with screen name
  MoreHorizontal, // Added for other requests
} from 'lucide-react-native';
import BottomTabBar from '../component/BottomTabBar';
import AppHeader from './AppHeader';
import { useLocation } from './LocationContext';

const { width } = Dimensions.get('window');

const AlertCard = ({
  type,
  title,
  desc,
  time,
  color,
  bgColor,
  icon: Icon,
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

      <TouchableOpacity
        style={[styles.smallMapBtn, { backgroundColor: color }]}
      >
        <MapPin size={12} color="#FFF" />
      </TouchableOpacity>
    </View>
  </View>
);

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const {
    currentLocation,
    locationLoading,
    locationError,
    fetchLocation,
    isPermissionDenied,
    openLocationSettings,
  } = useLocation();

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  const permissionBannerActive =
    isPermissionDenied || locationError?.toLowerCase().includes('permission');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

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
            <Text style={styles.weatherTemp}>28°C</Text>
            <Text style={styles.weatherCondition}>Partly Cloudy</Text>
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
              Press and hold the SOS button for 3 seconds to broadcast your GPS
              location.
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.sosButtonContainer}
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
                Critical events in your vicinity
              </Text>
            </View>
          <TouchableOpacity onPress={() => navigation.navigate('Alerts')}>
              <Text style={styles.viewAllText}>View All →</Text>
            </TouchableOpacity>
          </View>

          <AlertCard
            type="EXTREME"
            title="Flash Flood Warning"
            desc="Downtown Basin Area. Seek higher ground immediately. Duration: 6 hours."
            time="2M AGO"
            color="#C62828"
            bgColor="#FFEBEE"
            icon={Droplets}
          />

          <AlertCard
            type="SEVERE"
            title="Wildfire Advisory"
            desc="North Ridge Sector. Evacuation standby for Zone A-4. High winds."
            time="14M AGO"
            color="#A66114"
            bgColor="#FFF3E0"
            icon={Radio}
          />

          {/* DISASTER HISTORY CARD */}
          <View style={styles.historyCard}>
            <View style={styles.historyIconContainer}>
              <History size={24} color="#0D47A1" />
            </View>
            <View style={styles.historyInfo}>
              <Text style={styles.historyTitle}>Disaster History</Text>
              <Text style={styles.historySubtitle}>View past events and recovery efforts</Text>
            </View>
            <TouchableOpacity style={styles.historyViewBtn}>
              <Text style={styles.historyViewBtnText}>VIEW</Text>
            </TouchableOpacity>
          </View>

          {/* REQUEST HELP SECTION */}
          <Text
            style={[styles.sectionTitle, { marginTop: 20, marginBottom: 15 }]}
          >
            Need Assistance?
          </Text>
          <View style={styles.requestHelpGrid}>
            <TouchableOpacity style={styles.requestHelpItem}>
              <Utensils size={28} color="#C62828" />
              <Text style={styles.requestHelpText}>Food</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.requestHelpItem}>
              <Pill size={28} color="#0D47A1" />
              <Text style={styles.requestHelpText}>Medicine</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.requestHelpItem}>
              <HomeIcon size={28} color="#A66114" />
              <Text style={styles.requestHelpText}>Shelter</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.requestHelpItem}>
              <MoreHorizontal size={28} color="#444" />
              <Text style={styles.requestHelpText}>Others</Text>
            </TouchableOpacity>
          </View>

          <Text
            style={[styles.sectionTitle, { marginTop: 20, marginBottom: 15 }]}
          >
            Nearby Help Centers
          </Text>

          <View style={styles.listCard}>
            <TouchableOpacity style={styles.listItem}>
              <View style={styles.listIconBox}>
                <Bandage size={20} color="#1E88E5" />
              </View>

              <View style={styles.listContent}>
                <Text style={styles.listName}>St. Jude Medical Point</Text>

                <Text style={styles.listDetail}>
                  0.8 miles away • Open 24/7
                </Text>
              </View>

              <ChevronRight size={20} color="#BDBDBD" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.listItem}>
              <View style={styles.listIconBox}>
                <Hotel size={20} color="#6D4C41" />
              </View>

              <View style={styles.listContent}>
                <Text style={styles.listName}>Community Shelter #4</Text>

                <Text style={styles.listDetail}>
                  1.5 miles away • Capacity: 65%
                </Text>
              </View>

              <ChevronRight size={20} color="#BDBDBD" />
            </TouchableOpacity>
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
  historyCard: {
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
  historyIconContainer: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 12,
    marginRight: 15,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  historySubtitle: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginTop: 2,
  },
  historyViewBtn: {
    backgroundColor: '#0D47A1',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 12,
  },
  historyViewBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
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
