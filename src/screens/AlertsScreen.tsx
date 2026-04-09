import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ImageBackground,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import {
  Search,
  SlidersHorizontal,
  RefreshCw, // Added
  MapPin,
  ArrowRight,
  TrendingUp,
} from 'lucide-react-native';
import AppHeader from './AppHeader';
import { useLocation } from './LocationContext';
import BottomTabBar from '../component/BottomTabBar';

const { width } = Dimensions.get('window');

// 1. Reusable Alert Component
const SituationAlert = ({ severity, type, title, time, location, description, color }: any) => (
  <TouchableOpacity activeOpacity={0.9} style={styles.alertCard}>
    <View style={[styles.severityBar, { backgroundColor: color }]} />
    <View style={styles.alertContent}>
      <View style={styles.alertHeaderRow}>
        <View style={[styles.severityBadge, { backgroundColor: `${color}15` }]}>
          <Text style={[styles.severityText, { color }]}>{type}</Text>
        </View>
        <Text style={styles.timeText}>{time} • TODAY</Text>
      </View>
      
      <Text style={styles.alertTitle}>{title}</Text>
      <Text style={styles.alertDescription} numberOfLines={2}>
        {description}
      </Text>
      
      <View style={styles.alertFooter}>
        <View style={styles.locationContainer}>
          <MapPin size={14} color="#666" />
          <Text style={styles.locationText}>{location}</Text>
        </View>
        <ArrowRight size={18} color={color} />
      </View>
    </View>
  </TouchableOpacity>
);

const AlertsScreen: React.FC = () => {
  const {
    locationError,
    isPermissionDenied,
    fetchLocation,
    openLocationSettings,
  } = useLocation();

  const permissionBannerActive =
    isPermissionDenied || locationError?.toLowerCase().includes('permission');

  const handleSearchPress = () => {
    console.log('Search pressed on Alerts screen');
  };

  const handleFilterPress = () => {
    console.log('Filter pressed on Alerts screen');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <AppHeader
        showLogo
        showLocation
        showProfileBtn
        showSearchBtn
        onSearchPress={handleSearchPress}
      />
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
      >

        {/* TITLE SECTION */}
        <View style={styles.titleSection}>
          <Text style={styles.situationReport}>LIVE SITUATION REPORT</Text>
          <Text style={styles.mainTitle}>Active Alerts</Text>
          <View style={styles.statsRow}>
            <View style={styles.criticalBadge}>
              <View style={styles.dot} />
              <Text style={styles.criticalText}>2 CRITICAL</Text>
            </View>
            <Text style={styles.lastUpdated}>Last updated: 2 mins ago</Text>
          </View>
        </View>

        {/* ALERT 1: CRITICAL */}
        <SituationAlert
          type="CRITICAL SEVERITY"
          title="Flash Flood Warning: Downtown District"
          time="12:45 PM"
          location="Coastal Region A-12"
          description="Immediate evacuation recommended for residents near the harbor and low-lying..."
          color="#C62828"
        />

        {/* SPATIAL CONTEXT MAP CARD */}
        <TouchableOpacity activeOpacity={0.9} style={styles.mapCard}>
          <ImageBackground
            source={{
              uri:
                'https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/-73.98,40.75,12,0/600x300?access_token=YOUR_TOKEN',
            }}
            style={styles.mapBackground}
            imageStyle={{ borderRadius: 24 }}
          >
            <View style={styles.mapOverlay}>
              <View>
                <Text style={styles.mapSubtitle}>SPATIAL CONTEXT</Text>
                <Text style={styles.mapTitle}>Alert Proximity{"\n"}Map</Text>
              </View>
              <View style={styles.mapBtn}>
                <Text style={styles.mapBtnText}>OPEN INTERACTIVE MAP</Text>
              </View>
            </View>
          </ImageBackground>
        </TouchableOpacity>

        {/* ALERT 2: HIGH */}
        <SituationAlert
          type="HIGH SEVERITY"
          title="Wildfire Watch: Northern Forest Path"
          time="11:20 AM"
          location="Ridge Summit Estates"
          description="High winds increasing risk of fire spread. All hiking trails closed. Residents stay on..."
          color="#A66114"
        />

        {/* ALERT 3: MODERATE */}
        <SituationAlert
          type="MODERATE SEVERITY"
          title="Air Quality Advisory: Industrial Zone"
          time="09:05 AM"
          location="East Port Industrial"
          description="Particulate matter levels elevated. Sensitive groups should limit outdoor activity until..."
          color="#0D47A1"
        />

        {/* REGIONAL VITALITY CARD */}
        <View style={styles.vitalityCard}>
          <View style={styles.vitalityHeader}>
            <Text style={styles.vitalityTitle}>REGIONAL VITALITY</Text>
            <TrendingUp size={20} color="#C62828" />
          </View>
          <View style={styles.statsGrid}>
            <View>
              <Text style={styles.statValue}>84%</Text>
              <Text style={styles.statLabel}>SHELTER CAPACITY</Text>
            </View>
            <View>
              <Text style={styles.statValue}>12.4</Text>
              <Text style={styles.statLabel}>RESPONSE TIME (M)</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      <BottomTabBar activeTab="ALERTS" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F5F5F5',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  permissionBanner: {
    backgroundColor: '#FFF3E0',
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 14,
    marginTop: 10,
    marginBottom: 20, // Add margin bottom to separate from content
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
    paddingHorizontal: 20, // Use horizontal padding for consistency
    paddingTop: 20, // Add padding top to separate from header/banner
    paddingBottom: 110,
  },
  titleSection: {
    marginBottom: 25,
  },
  situationReport: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0D47A1',
    letterSpacing: 0.5,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A1A',
    marginVertical: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  criticalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C62828',
    marginRight: 6,
  },
  criticalText: {
    color: '#C62828',
    fontSize: 10,
    fontWeight: '900',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#666',
  },
  alertCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    flexDirection: 'row',
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
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
    color: '#666',
    fontWeight: '600',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  alertDescription: {
    fontSize: 14,
    color: '#444',
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
  },
  locationText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    marginLeft: 6,
  },
  mapCard: {
    height: 200,
    marginBottom: 16,
  },
  mapBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  mapOverlay: { 
    padding: 20, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    borderRadius: 24, 
    flex: 1, 
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  mapSubtitle: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  mapTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  mapBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  mapBtnText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
  vitalityCard: {
    backgroundColor: '#EEEEEE',
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
    color: '#444',
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#666',
    marginTop: 4,
  },
});

export default AlertsScreen;
