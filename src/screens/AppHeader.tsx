import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { ArrowLeft, MapPin, RefreshCw, User, Search } from 'lucide-react-native';
import { useLocation } from './LocationContext';
import { colors, radii, spacing } from '../theme';

interface AppHeaderProps {
  showLogo?: boolean;
  showLocation?: boolean;
  showProfileBtn?: boolean;
  showSearchBtn?: boolean;
  showBackButton?: boolean;
  onBackPress?: () => void;
  onSearchPress?: () => void;
  /** 'dark' is for screens with a dark/black background (e.g. Weather). */
  variant?: 'light' | 'dark';
  // onLocationPress is handled internally by useLocation's fetchLocation
  // onProfilePress is handled internally by navigation
}

const AppHeader: React.FC<AppHeaderProps> = ({
  showLogo = true,
  showLocation = true,
  showProfileBtn = true,
  showSearchBtn = false,
  showBackButton = false,
  onBackPress,
  onSearchPress,
  variant = 'light',
}) => {
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const { currentLocation, locationLoading, locationError, fetchLocation } = useLocation();
  const isDark = variant === 'dark';

  const handleProfilePress = () => {
    navigation.navigate('Profile', undefined, { pop: true });
  };

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const iconColor = isDark ? colors.white : colors.textSecondary;
  const chipBackground = isDark ? 'rgba(255,255,255,0.12)' : colors.background;
  const chipTextColor = isDark ? colors.white : colors.textSecondary;

  return (
    <View style={[styles.header, isDark && styles.headerDark]}>
      {showBackButton && (
        <TouchableOpacity
          style={[styles.iconBtn, styles.backBtn, { backgroundColor: chipBackground }]}
          onPress={handleBackPress}
        >
          <ArrowLeft size={20} color={iconColor} />
        </TouchableOpacity>
      )}

      {showLogo && (
        <View style={styles.headerLeft}>
          <Image source={require('../screens/assets/logo.png')} style={styles.logo} />
        </View>
      )}

      {showLocation && (
        <View style={styles.headerCenter}>
          {locationLoading ? (
            <ActivityIndicator size="small" color={iconColor} />
          ) : (
            <TouchableOpacity
              onPress={fetchLocation}
              style={[styles.locationDisplay, { backgroundColor: chipBackground }]}
            >
              <MapPin size={16} color={iconColor} />
              <Text style={[styles.locationTextHeader, { color: chipTextColor }]} numberOfLines={1}>
                {currentLocation || 'Tap to get location'}
              </Text>
              {locationError && (
                <RefreshCw size={16} color={colors.danger} style={styles.refreshIcon} />
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.headerRight}>
        {showSearchBtn && (
          <TouchableOpacity style={styles.iconBtn} onPress={onSearchPress}>
            <Search size={22} color={iconColor} />
          </TouchableOpacity>
        )}
        {showProfileBtn && (
          <TouchableOpacity
            style={[styles.profileBtn, { backgroundColor: chipBackground }]}
            onPress={handleProfilePress}
          >
            <User size={20} color={iconColor} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg - 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  headerDark: {
    backgroundColor: 'transparent',
  },
  backBtn: {
    marginLeft: 0,
    marginRight: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: spacing.md - 2,
  },
  logo: {
    width: 32,
    height: 32,
  },
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    maxWidth: '100%',
  },
  locationTextHeader: {
    marginLeft: spacing.sm,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  refreshIcon: {
    marginLeft: spacing.xs + 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    marginLeft: spacing.lg - 1,
  },
  profileBtn: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: radii.lg,
    marginLeft: spacing.lg - 1,
  },
});

export default AppHeader;
