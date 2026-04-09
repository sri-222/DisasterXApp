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
  Platform,
} from 'react-native';
import { 
  Settings, 
  Mail, 
  Phone, 
  HandHelping, 
  ArrowRight, 
  LogOut,
  Clock,
  Target,
  Bandage,
  Truck,
  Edit2
} from 'lucide-react-native';
import BottomTabBar from '../component/BottomTabBar';

const { width } = Dimensions.get('window');

const ProfileScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <Image source={require('./assets/logo.png')} style={styles.logo} />
        <TouchableOpacity style={styles.settingsBtn}>
          <Settings size={22} color="#455A64" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* PROFILE CARD */}
        <View style={styles.profileMainCard}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: 'https://i.pravatar.cc/300?img=12' }} // Replace with local image if needed
              style={styles.avatar} 
            />
            <TouchableOpacity style={styles.editBadge}>
              <Edit2 size={12} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.userName}>Marcus Thorne</Text>
          
          <View style={styles.contactRow}>
            <Mail size={16} color="#0D47A1" />
            <Text style={styles.contactText}>m.thorne@rescue.org</Text>
          </View>
          <View style={styles.contactRow}>
            <Phone size={16} color="#0D47A1" />
            <Text style={styles.contactText}>+1 (555) 012-3456</Text>
          </View>

          <View style={styles.verifiedBadge}>
            <View style={styles.dot} />
            <Text style={styles.verifiedText}>VERIFIED RESPONDER</Text>
          </View>
          <Text style={styles.memberSince}>Member since Oct 2023</Text>
        </View>

        {/* VOLUNTEER STATUS */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>VOLUNTEER STATUS</Text>
            <HandHelping size={20} color="#A66114" />
          </View>
          
          <View style={styles.assignmentBox}>
            <View style={styles.assignmentHeader}>
              <Text style={styles.assignmentLabel}>CURRENT ASSIGNMENT</Text>
              <Text style={styles.activeStatus}>ACTIVE</Text>
            </View>
            <Text style={styles.assignmentTitle}>Regional Logistics - Zone 4</Text>
          </View>

          <TouchableOpacity style={styles.updateBtn}>
            <Text style={styles.updateBtnText}>Update Availability</Text>
            <ArrowRight size={16} color="#444" />
          </TouchableOpacity>
        </View>

        {/* STATS ROW */}
        <View style={styles.statsRow}>
          <View style={[styles.statSquare, { backgroundColor: '#0D47A1' }]}>
            <Target size={24} color="#FFF" />
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabelMain}>MISSIONS{"\n"}COMPLETED</Text>
          </View>
          
          <View style={[styles.statSquare, { backgroundColor: '#8D4F00' }]}>
            <Clock size={24} color="#FFF" />
            <Text style={styles.statNumber}>148</Text>
            <Text style={styles.statLabelMain}>VOLUNTEER{"\n"}HOURS</Text>
          </View>
        </View>

        {/* MY REQUESTS SECTION */}
        <View style={styles.requestsHeader}>
          <Text style={styles.sectionTitle}>My Requests</Text>
          <TouchableOpacity>
            <Text style={styles.archiveLink}>View Archive ↺</Text>
          </TouchableOpacity>
        </View>

        {/* REQUEST 1 */}
        <View style={styles.requestItem}>
          <View style={[styles.indicatorBar, { backgroundColor: '#C62828' }]} />
          <View style={styles.requestIconBg}>
            <Bandage size={20} color="#C62828" />
          </View>
          <View style={styles.requestInfo}>
            <View style={styles.requestTitleRow}>
              <Text style={styles.requestTitle}>Emergen...</Text>
              <View style={styles.urgentBadge}><Text style={styles.urgentText}>URGENT</Text></View>
            </View>
            <Text style={styles.requestSub}>Deployment locatio...</Text>
          </View>
          <View style={styles.requestStatusCol}>
            <Text style={styles.statusPrimary}>Processing</Text>
            <Text style={styles.statusTime}>TODAY, 09:42</Text>
          </View>
        </View>

        {/* REQUEST 2 */}
        <View style={styles.requestItem}>
          <View style={[styles.indicatorBar, { backgroundColor: '#0D47A1' }]} />
          <View style={styles.requestIconBg}>
            <Truck size={20} color="#0D47A1" />
          </View>
          <View style={styles.requestInfo}>
            <View style={styles.requestTitleRow}>
              <Text style={styles.requestTitle}>Transpo...</Text>
              <View style={styles.standardBadge}><Text style={styles.standardText}>STANDARD</Text></View>
            </View>
            <Text style={styles.requestSub}>Authorization for...</Text>
          </View>
          <View style={styles.requestStatusCol}>
            <Text style={[styles.statusPrimary, { color: '#0D47A1' }]}>Approved</Text>
            <Text style={styles.statusTime}>YESTERDAY</Text>
          </View>
        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity style={styles.logoutBtn}>
          <View style={styles.logoutCircle}>
            <LogOut size={18} color="#444" />
          </View>
          <Text style={styles.logoutText}>LOGOUT SESSION</Text>
        </TouchableOpacity>

      </ScrollView>

      <BottomTabBar activeTab="PROFILE" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F4F4F4',
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
  settingsBtn: {
    padding: 5,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 110,
  },
  profileMainCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 0,
    backgroundColor: '#1A1A1A',
  },
  editBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#C62828',
    padding: 8,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  userName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  contactText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#444',
    fontWeight: '500',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C62828',
    marginRight: 8,
  },
  verifiedText: {
    color: '#C62828',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  memberSince: {
    fontSize: 12,
    color: '#9E9E9E',
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  assignmentBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  assignmentLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#757575',
  },
  activeStatus: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0D47A1',
  },
  assignmentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  updateBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
    padding: 12,
    borderRadius: 25,
  },
  updateBtnText: {
    fontWeight: '700',
    fontSize: 14,
    color: '#444',
    marginRight: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statSquare: {
    width: '48%',
    borderRadius: 20,
    padding: 20,
  },
  statNumber: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFF',
    marginVertical: 5,
  },
  statLabelMain: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
    opacity: 0.8,
  },
  requestsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  archiveLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C62828',
  },
  requestItem: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    flexDirection: 'row',
    height: 80,
    marginBottom: 12,
    overflow: 'hidden',
    alignItems: 'center',
  },
  indicatorBar: {
    width: 5,
    height: '100%',
  },
  requestIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  requestInfo: {
    flex: 1,
    marginLeft: 15,
  },
  requestTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  urgentBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  urgentText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#C62828',
  },
  standardBadge: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  standardText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#666',
  },
  requestSub: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  requestStatusCol: {
    paddingRight: 15,
    alignItems: 'flex-end',
  },
  statusPrimary: {
    fontSize: 12,
    fontWeight: '700',
    color: '#444',
  },
  statusTime: {
    fontSize: 9,
    fontWeight: '600',
    color: '#9E9E9E',
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  logoutCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#444',
    letterSpacing: 1,
  },
});

export default ProfileScreen;