import React, { useState } from 'react';
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
  Navigation, 
  Battery, 
  Waves, 
  Flame, 
  PlusSquare, 
  Mountain, 
  Send, 
  PhoneCall,
  Asterisk
} from 'lucide-react-native';
import BottomTabBar from '../component/BottomTabBar';

const { width } = Dimensions.get('window');

// 1. Reusable Crisis Type Component
const CrisisItem = ({ title, desc, icon: Icon, selected, onPress }: any) => (
  <TouchableOpacity 
    onPress={onPress}
    activeOpacity={0.8} 
    style={[styles.crisisBox, selected && styles.crisisBoxSelected]}
  >
    <Icon size={28} color={selected ? "#C62828" : "#1A1A1A"} />
    <Text style={styles.crisisTitleText}>{title}</Text>
    <Text style={styles.crisisDescText}>{desc}</Text>
  </TouchableOpacity>
);

const SOSScreen: React.FC = () => {
  const [selectedCrisis, setSelectedCrisis] = useState('Flood');

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
              <Battery size={16} color="#000" />
              <Text style={styles.batteryValue}>84%</Text>
            </View>
          </View>
        </View>

        {/* LOCATION MAP CARD */}
        <View style={styles.mapCard}>
          <ImageBackground 
            source={{ uri: 'https://api.mapbox.com/styles/v1/mapbox/light-v10/static/-122.39,37.79,14,0/600x300?access_token=YOUR_TOKEN' }}
            style={styles.mapBg}
            imageStyle={{ borderRadius: 20 }}
          >
            <View style={styles.mapPinContainer}>
               <View style={styles.mapPinOuter}>
                  <View style={styles.mapPinInner} />
               </View>
            </View>
            
            <View style={styles.addressOverlay}>
              <View style={styles.addressIconBox}>
                <Navigation size={20} color="#0D47A1" />
              </View>
              <View style={styles.addressTextContent}>
                <Text style={styles.addressLabel}>ESTIMATED ADDRESS</Text>
                <Text style={styles.addressText}>350 Mission St, San Francisco, CA</Text>
              </View>
            </View>
          </ImageBackground>
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
           <TouchableOpacity activeOpacity={0.9} style={styles.sosCircle}>
              <Asterisk color="#FFF" size={40} strokeWidth={3} />
              <Text style={styles.sosCircleText}>SOS</Text>
           </TouchableOpacity>
           <Text style={styles.sosInstructions}>Hold SOS for 3 seconds or tap below</Text>
        </View>

        {/* ACTION BUTTONS */}
        <TouchableOpacity style={styles.confirmBtn}>
          <Text style={styles.confirmBtnText}>Send SOS Confirmation</Text>
          <Send size={18} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.directCallBtn}>
          <PhoneCall size={18} color="#5D4037" />
          <Text style={styles.directCallText}>Direct Call Emergency Services</Text>
        </TouchableOpacity>

      </ScrollView>

      <BottomTabBar activeTab="SOS" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  logo: {
    width: 24,
    height: 24,
  },
  systemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  systemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C62828',
    marginRight: 6,
  },
  systemText: {
    color: '#C62828',
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
    color: '#0D47A1',
    letterSpacing: 0.5,
  },
  mainHeading: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  batteryContainer: {
    alignItems: 'flex-end',
  },
  batteryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#757575',
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
  mapCard: {
    height: 200,
    marginBottom: 25,
  },
  mapBg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPinContainer: {
    marginBottom: 30,
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
    backgroundColor: '#C62828',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  addressOverlay: {
    position: 'absolute',
    bottom: 15,
    width: width - 70,
    backgroundColor: '#FFF',
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
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressTextContent: {
    marginLeft: 12,
  },
  addressLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9E9E9E',
  },
  addressText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#9E9E9E',
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
    width: (width - 55) / 2,
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  crisisBoxSelected: {
    borderWidth: 2,
    borderColor: '#C62828',
  },
  crisisTitleText: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
    color: '#1A1A1A',
  },
  crisisDescText: {
    fontSize: 11,
    color: '#757575',
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
    backgroundColor: '#C62828',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C62828',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  sosCircleText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 5,
  },
  sosInstructions: {
    fontSize: 13,
    color: '#757575',
    marginTop: 20,
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: '#1A1A1A',
    borderRadius: 30,
    height: 60,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    marginRight: 10,
  },
  directCallBtn: {
    backgroundColor: '#EBEBEB',
    borderRadius: 30,
    height: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  directCallText: {
    color: '#5D4037',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 10,
  },
});

export default SOSScreen;