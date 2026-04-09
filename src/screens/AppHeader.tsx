import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { MapPin, RefreshCw, User, Search, SlidersHorizontal } from 'lucide-react-native';
import { useLocation } from './LocationContext'; // Import the hook

interface AppHeaderProps {
  showLogo?: boolean;
  showLocation?: boolean;
  showProfileBtn?: boolean;
  showSearchBtn?: boolean;
  showFilterBtn?: boolean;
  onSearchPress?: () => void;
  onFilterPress?: () => void;
  // onLocationPress is handled internally by useLocation's fetchLocation
  // onProfilePress is handled internally by navigation
}

const AppHeader: React.FC<AppHeaderProps> = ({
  showLogo = true,
  showLocation = true,
  showProfileBtn = true,
  showSearchBtn = false,
  showFilterBtn = false,
  onSearchPress,
  onFilterPress,
}) => {
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const { currentLocation, locationLoading, locationError, fetchLocation } = useLocation();

  const handleProfilePress = () => {
    navigation.navigate('Profile'); // Assuming 'Profile' is a valid route name
  };

  return (
    <View style={styles.header}>
      {showLogo && (
        <View style={styles.headerLeft}>
          <Image source={require('../screens/assets/logo.png')} style={styles.logo} />
        </View>
      )}

      {showLocation && (
        <View style={styles.headerCenter}>
          {locationLoading ? (
            <ActivityIndicator size="small" color="#455A64" />
          ) : (
            <TouchableOpacity onPress={fetchLocation} style={styles.locationDisplay}>
              <MapPin size={16} color="#455A64" />
              <Text style={styles.locationTextHeader}>
                {currentLocation || 'Tap to get location'}
              </Text>
              {locationError && <RefreshCw size={16} color="#C62828" style={{ marginLeft: 5 }} />}
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.headerRight}>
        {showSearchBtn && (
          <TouchableOpacity style={styles.iconBtn} onPress={onSearchPress}>
            <Search size={22} color="#455A64" />
          </TouchableOpacity>
        )}
        {showProfileBtn && (
          <TouchableOpacity style={styles.profileBtn} onPress={handleProfilePress}>
            <User size={20} color="#000" />
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  logo: {
    width: 32, // Increased logo size
    height: 32, // Increased logo size
  },
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  locationTextHeader: {
    marginLeft: 8,
    color: '#455A64',
    fontSize: 13,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    marginLeft: 15,
  },
  profileBtn: {
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 20,
    marginLeft: 15, // Add margin for spacing if other buttons are present
  },
});

export default AppHeader;
