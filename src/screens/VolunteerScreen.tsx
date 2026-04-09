import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  StatusBar,
  Dimensions,
  ImageBackground,
  Platform,
} from 'react-native';
import { 
  X, 
  ShieldCheck, 
  Truck, 
  Users, 
  Info,
} from 'lucide-react-native';
import BottomTabBar from '../component/BottomTabBar';

const { width } = Dimensions.get('window');

// Reusable Benefit Row Component
const BenefitRow = ({ icon: Icon, title, desc }: any) => (
  <View style={styles.benefitRow}>
    <View style={styles.benefitIconBox}>
      <Icon size={22} color="#0D47A1" />
    </View>
    <View style={styles.benefitContent}>
      <Text style={styles.benefitTitle}>{title}</Text>
      <Text style={styles.benefitDesc}>{desc}</Text>
    </View>
  </View>
);

const VolunteerScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <Image source={require('./assets/logo.png')} style={styles.logo} />
        <TouchableOpacity style={styles.closeBtn}>
          <X size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* MOBILIZATION BADGE */}
        <View style={styles.topBadgeContainer}>
          <View style={styles.mobilizationBadge}>
            <Text style={styles.mobilizationText}>COMMUNITY MOBILIZATION</Text>
          </View>
        </View>

        {/* HERO TEXT */}
        <Text style={styles.heroTitle}>
          Become a <Text style={styles.blueText}>Shield</Text>{"\n"}for Your Community
        </Text>
        
        <Text style={styles.heroSubtitle}>
          Join our elite network of responders and logistics experts. Your skills can save lives during critical window periods.
        </Text>

        {/* HERO IMAGE WITH OVERLAY */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=800' }} 
            style={styles.heroImage} 
          />
          <View style={styles.opsFloatingBadge}>
            <View style={styles.orangeDot} />
            <Text style={styles.opsText}>12 Active Operations Nearby</Text>
          </View>
        </View>

        {/* WHY VOLUNTEER CARD */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Why Volunteer?</Text>
          
          <BenefitRow 
            icon={ShieldCheck}
            title="Certified Impact"
            desc="Gain specialized training and official disaster responder certifications."
          />
          
          <BenefitRow 
            icon={Truck}
            title="Logistics Power"
            desc="Help distribute supplies to unreachable zones with your vehicle."
          />
          
          <BenefitRow 
            icon={Users}
            title="Force Multiplier"
            desc="Our tech matches your specific skills with the most urgent needs."
          />
        </View>

        {/* NOTE SECTION */}
        <View style={styles.noteBox}>
          <View style={styles.noteHeader}>
            <Info size={18} color="#FFF" />
            <Text style={styles.noteTitle}>NOTE</Text>
          </View>
          <Text style={styles.noteDesc}>
            Background checks are required for all "Critical Response" tiers. Ensure your ID is ready for the next step.
          </Text>
        </View>

      </ScrollView>

      <BottomTabBar activeTab="VOLUNTEER" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F9F9F9',
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
  closeBtn: {
    padding: 5,
  },
  scrollContent: {
    padding: 25,
    paddingBottom: 110,
  },
  topBadgeContainer: {
    marginBottom: 15,
  },
  mobilizationBadge: {
    backgroundColor: '#D1E3FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  mobilizationText: {
    color: '#0D47A1',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1A1A1A',
    lineHeight: 42,
    marginBottom: 15,
  },
  blueText: {
    color: '#0D47A1',
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 25,
  },
  imageContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 25,
    elevation: 4,
  },
  heroImage: {
    width: '100%',
    height: 200,
  },
  opsFloatingBadge: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    backgroundColor: 'rgba(255,255,255,0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  orangeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A66114',
    marginRight: 8,
  },
  opsText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 25,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0D47A1',
    marginBottom: 20,
  },
  benefitRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  benefitIconBox: {
    width: 40,
    alignItems: 'center',
  },
  benefitContent: {
    flex: 1,
    marginLeft: 10,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  benefitDesc: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  noteBox: {
    backgroundColor: '#A66114',
    borderRadius: 20,
    padding: 20,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  noteTitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 8,
    letterSpacing: 1,
  },
  noteDesc: {
    color: '#FFF',
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.9,
    fontWeight: '500',
  },
});

export default VolunteerScreen;