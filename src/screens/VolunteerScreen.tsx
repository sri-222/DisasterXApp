import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  X,
  ShieldCheck,
  Truck,
  Users,
  Info,
} from 'lucide-react-native';
import BottomTabBar from '../component/BottomTabBar';
import { getMe, getRequestsStats, joinVolunteer, leaveVolunteer, VolunteerStatus } from './api';
import { colors } from '../theme';

// Reusable Benefit Row Component
const BenefitRow = ({ icon: Icon, title, desc }: any) => (
  <View style={styles.benefitRow}>
    <View style={styles.benefitIconBox}>
      <Icon size={22} color={colors.info} />
    </View>
    <View style={styles.benefitContent}>
      <Text style={styles.benefitTitle}>{title}</Text>
      <Text style={styles.benefitDesc}>{desc}</Text>
    </View>
  </View>
);

const VolunteerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [volunteerStatus, setVolunteerStatus] = useState<VolunteerStatus | null>(null);
  const [openCount, setOpenCount] = useState<number | null>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    getMe()
      .then(res => setVolunteerStatus(res.user.volunteerStatus))
      // If the status can't load, still let them try to join; the join call
      // reports its own error.
      .catch(() => setVolunteerStatus('inactive'));
    getRequestsStats()
      .then(res => setOpenCount(res.openCount))
      .catch(() => setOpenCount(null));
  }, []);

  const isActive = volunteerStatus === 'active';

  const handleToggle = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      const res = isActive ? await leaveVolunteer() : await joinVolunteer();
      setVolunteerStatus(res.volunteerStatus);
      Alert.alert(
        isActive ? 'No longer volunteering' : "You're in!",
        isActive
          ? "You've been removed from the active volunteer list."
          : "You're now listed as an active volunteer. Thank you."
      );
    } catch (err: any) {
      Alert.alert('Could not update status', err.message || 'Please try again.');
    } finally {
      setToggling(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <Image source={require('./assets/logo.png')} style={styles.logo} />
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.navigate('Home', undefined, { pop: true })}>
          <X size={24} color={colors.black} />
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
          Join local volunteers who help their community during disasters. Your skills can save lives.
        </Text>

        {/* HERO IMAGE WITH OVERLAY */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=800' }} 
            style={styles.heroImage} 
          />
          <View style={styles.opsFloatingBadge}>
            <View style={styles.orangeDot} />
            <Text style={styles.opsText}>
              {openCount == null ? 'Loading open requests…' : `${openCount} Open Assistance Requests`}
            </Text>
          </View>
        </View>

        {/* VOLUNTEER STATUS CTA */}
        <TouchableOpacity
          style={[styles.statusCta, isActive && styles.statusCtaActive]}
          onPress={handleToggle}
          disabled={toggling || volunteerStatus === null}
          activeOpacity={0.85}
        >
          {toggling || volunteerStatus === null ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.statusCtaText}>
              {isActive ? 'Stop Volunteering' : 'Join as a Volunteer'}
            </Text>
          )}
        </TouchableOpacity>
        {isActive && (
          <View style={styles.activeStatusBadge}>
            <View style={styles.orangeDot} />
            <Text style={styles.activeStatusText}>YOU ARE AN ACTIVE VOLUNTEER</Text>
          </View>
        )}

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
            Once you join, the control room sees you as an available volunteer and can contact you when help is needed nearby.
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
    backgroundColor: colors.backgroundAlt,
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
  statusCta: {
    backgroundColor: '#0D47A1',
    borderRadius: 30,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusCtaActive: {
    backgroundColor: colors.danger,
  },
  statusCtaText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  activeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  activeStatusText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
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