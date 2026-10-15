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
  Edit2,
  Utensils,
  Pill,
  Home as HomeIcon,
  MoreHorizontal,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigator/types';
import BottomTabBar from '../component/BottomTabBar';
import { Card } from '../components/ui';
import { colors, radii, spacing } from '../theme';
import {
  getMe,
  getMyHelpRequests,
  getMySosHistory,
  HelpCategory,
  HelpRequest,
  joinVolunteer,
  leaveVolunteer,
  logout,
  UserProfile,
} from './api';
import { clearToken } from '../services/authSession';
import { clearUserProfile } from '../services/userProfileStorage';

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function formatMemberSince(createdAt?: string | null): string {
  if (!createdAt) return 'Member';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return 'Member';
  return `Member since ${date.toLocaleString('en-US', { month: 'short', year: 'numeric' })}`;
}

const REQUEST_ICON: Record<HelpCategory, typeof Bandage> = {
  Food: Utensils,
  Medicine: Pill,
  Shelter: HomeIcon,
  Other: MoreHorizontal,
};

function formatRequestTime(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [myRequests, setMyRequests] = useState<HelpRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [sosCount, setSosCount] = useState<number | null>(null);
  const [isTogglingVolunteer, setIsTogglingVolunteer] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then(res => {
        if (!cancelled) setProfile(res.user);
      })
      .catch(err => {
        if (!cancelled) setProfileError(err.message || 'Unable to load your profile.');
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getMyHelpRequests()
      .then(data => {
        if (!cancelled) setMyRequests(data);
      })
      .catch(() => {
        if (!cancelled) setMyRequests([]);
      })
      .finally(() => {
        if (!cancelled) setRequestsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getMySosHistory()
      .then(data => {
        if (!cancelled) setSosCount(data.length);
      })
      .catch(() => {
        if (!cancelled) setSosCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleVolunteer = async () => {
    if (isTogglingVolunteer || !profile) return;
    setIsTogglingVolunteer(true);
    const isActive = profile.volunteerStatus === 'active';
    try {
      const res = isActive ? await leaveVolunteer() : await joinVolunteer();
      setProfile({ ...profile, volunteerStatus: res.volunteerStatus });
    } catch (err: any) {
      Alert.alert('Could not update status', err.message || 'Please try again.');
    } finally {
      setIsTogglingVolunteer(false);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    let serverConfirmed = false;
    try {
      await logout();
      serverConfirmed = true;
    } catch (err) {
      // Network/server failure (or no live session) should never block a
      // local logout - the user still gets signed out on this device.
      console.warn('Server-side logout could not be confirmed:', err);
    }

    await clearToken();
    await clearUserProfile();
    setIsLoggingOut(false);

    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });

    if (!serverConfirmed) {
      Alert.alert(
        'Logged out on this device',
        "We couldn't confirm the server closed your session, but you're signed out here. The session will expire on its own.",
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <Image source={require('./assets/logo.png')} style={styles.logo} />
        <TouchableOpacity style={styles.settingsBtn}>
          <Settings size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* PROFILE CARD */}
        <Card style={styles.profileMainCard}>
          {profileLoading ? (
            <ActivityIndicator color={colors.danger} style={styles.profileLoadingIndicator} />
          ) : (
            <>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarInitials}>{initials(profile?.name || '?')}</Text>
                </View>
                <TouchableOpacity style={styles.editBadge}>
                  <Edit2 size={12} color={colors.white} />
                </TouchableOpacity>
              </View>

              <Text style={styles.userName}>{profile?.name || 'Unknown Responder'}</Text>

              {profileError ? (
                <Text style={styles.profileErrorText}>{profileError}</Text>
              ) : (
                <>
                  <View style={styles.contactRow}>
                    <Mail size={16} color={colors.info} />
                    <Text style={styles.contactText}>{profile?.email}</Text>
                  </View>
                  <View style={styles.contactRow}>
                    <Phone size={16} color={colors.info} />
                    <Text style={styles.contactText}>{profile?.phone || 'No phone on file'}</Text>
                  </View>

                  <View style={styles.verifiedBadge}>
                    <View style={styles.dot} />
                    <Text style={styles.verifiedText}>
                      {(profile?.role || 'RESPONDER').toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.memberSince}>{formatMemberSince(profile?.createdAt)}</Text>
                </>
              )}
            </>
          )}
        </Card>

        {/* VOLUNTEER STATUS */}
        <Card style={styles.sectionCard} padded={false}>
          <View style={styles.sectionCardInner}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>VOLUNTEER STATUS</Text>
              <HandHelping size={20} color={colors.warning} />
            </View>

            <View style={styles.assignmentBox}>
              <View style={styles.assignmentHeader}>
                <Text style={styles.assignmentLabel}>CURRENT STATUS</Text>
                <Text
                  style={[
                    styles.activeStatus,
                    profile?.volunteerStatus !== 'active' && styles.inactiveStatus,
                  ]}
                >
                  {(profile?.volunteerStatus || 'inactive').toUpperCase()}
                </Text>
              </View>
              <Text style={styles.assignmentTitle}>
                {profile?.volunteerStatus === 'active'
                  ? "You're listed as an active volunteer"
                  : 'Not currently volunteering'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.updateBtn}
              onPress={handleToggleVolunteer}
              disabled={isTogglingVolunteer || !profile}
            >
              {isTogglingVolunteer ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <>
                  <Text style={styles.updateBtnText}>
                    {profile?.volunteerStatus === 'active' ? 'Stop Volunteering' : 'Join as Volunteer'}
                  </Text>
                  <ArrowRight size={16} color={colors.textSecondary} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </Card>

        {/* STATS ROW */}
        <View style={styles.statsRow}>
          <View style={[styles.statSquare, styles.statSquareBlue]}>
            <Target size={24} color={colors.white} />
            <Text style={styles.statNumber}>{myRequests.length}</Text>
            <Text style={styles.statLabelMain}>REQUESTS{'\n'}SUBMITTED</Text>
          </View>

          <View style={[styles.statSquare, styles.statSquareAmber]}>
            <Clock size={24} color={colors.white} />
            <Text style={styles.statNumber}>{sosCount ?? '--'}</Text>
            <Text style={styles.statLabelMain}>SOS{'\n'}REPORTS FILED</Text>
          </View>
        </View>

        {/* MY REQUESTS SECTION */}
        <View style={styles.requestsHeader}>
          <Text style={styles.sectionTitle}>My Requests</Text>
          <Text style={styles.requestsCount}>{myRequests.length} total</Text>
        </View>

        {requestsLoading && (
          <ActivityIndicator color={colors.danger} style={styles.requestsLoadingIndicator} />
        )}

        {!requestsLoading && myRequests.length === 0 && (
          <Text style={styles.noRequestsText}>
            You haven't submitted any assistance requests yet.
          </Text>
        )}

        {myRequests.map(item => {
          const Icon = REQUEST_ICON[item.category] ?? Bandage;
          return (
            <View style={styles.requestItem} key={item.id}>
              <View
                style={[
                  styles.indicatorBar,
                  { backgroundColor: item.urgent ? colors.danger : colors.info },
                ]}
              />
              <View style={styles.requestIconBg}>
                <Icon size={20} color={item.urgent ? colors.danger : colors.info} />
              </View>
              <View style={styles.requestInfo}>
                <View style={styles.requestTitleRow}>
                  <Text style={styles.requestTitle}>{item.category}</Text>
                  <View style={item.urgent ? styles.urgentBadge : styles.standardBadge}>
                    <Text style={item.urgent ? styles.urgentText : styles.standardText}>
                      {item.urgent ? 'URGENT' : 'STANDARD'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.requestSub} numberOfLines={1}>
                  {item.description}
                </Text>
              </View>
              <View style={styles.requestStatusCol}>
                <Text style={[styles.statusPrimary, item.urgent && { color: colors.danger }]}>
                  {item.status}
                </Text>
                <Text style={styles.statusTime}>{formatRequestTime(item.createdAt)}</Text>
              </View>
            </View>
          );
        })}

        {/* LOGOUT BUTTON */}
        <TouchableOpacity
          style={[styles.logoutBtn, isLoggingOut && styles.logoutBtnDisabled]}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          <View style={styles.logoutCircle}>
            {isLoggingOut ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <LogOut size={18} color={colors.textSecondary} />
            )}
          </View>
          <Text style={styles.logoutText}>{isLoggingOut ? 'LOGGING OUT...' : 'LOGOUT SESSION'}</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomTabBar activeTab="PROFILE" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  logo: {
    width: 24,
    height: 24,
  },
  settingsBtn: {
    padding: spacing.xs + 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: 110,
  },
  profileMainCard: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: radii.sm,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: colors.white,
    fontSize: 40,
    fontWeight: '800',
  },
  profileLoadingIndicator: {
    paddingVertical: spacing.xxxl,
  },
  profileErrorText: {
    color: colors.danger,
    fontSize: 13,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: colors.danger,
    padding: spacing.sm,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: colors.white,
  },
  userName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  contactText: {
    marginLeft: spacing.sm,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 15,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
    marginRight: spacing.sm,
  },
  verifiedText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  memberSince: {
    fontSize: 12,
    color: colors.textFaint,
    fontWeight: '600',
  },
  sectionCard: {
    marginBottom: spacing.lg,
  },
  sectionCardInner: {
    padding: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  assignmentBox: {
    backgroundColor: colors.background,
    borderRadius: radii.sm + 4,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  assignmentLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
  },
  activeStatus: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.info,
  },
  inactiveStatus: {
    color: colors.textFaint,
  },
  assignmentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  updateBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
    padding: spacing.md,
    borderRadius: 25,
  },
  updateBtnText: {
    fontWeight: '700',
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xxl,
  },
  statSquare: {
    width: '48%',
    borderRadius: radii.lg,
    padding: spacing.xl,
  },
  statSquareBlue: {
    backgroundColor: colors.info,
  },
  statSquareAmber: {
    backgroundColor: '#8D4F00',
  },
  statNumber: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.white,
    marginVertical: 5,
  },
  statLabelMain: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.white,
    opacity: 0.8,
  },
  requestsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  requestsCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  requestsLoadingIndicator: {
    marginBottom: spacing.lg,
  },
  noRequestsText: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  requestItem: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm + 7,
    flexDirection: 'row',
    height: 80,
    marginBottom: spacing.md,
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
    backgroundColor: colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.lg,
  },
  requestInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  requestTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  urgentBadge: {
    backgroundColor: colors.dangerLight,
    paddingHorizontal: spacing.sm - 2,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: spacing.sm,
  },
  urgentText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.danger,
  },
  standardBadge: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: spacing.sm - 2,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: spacing.sm,
  },
  standardText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.textMuted,
  },
  requestSub: {
    fontSize: 12,
    color: colors.textFaint,
  },
  requestStatusCol: {
    paddingRight: spacing.lg,
    alignItems: 'flex-end',
  },
  statusPrimary: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  statusTime: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textFaint,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  logoutBtnDisabled: {
    opacity: 0.6,
  },
  logoutCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
});

export default ProfileScreen;
