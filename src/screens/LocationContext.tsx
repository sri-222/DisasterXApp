import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from 'react';
import {
  Platform,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';

interface LocationContextType {
  currentLocation: string | null;
  locationLoading: boolean;
  locationError: string | null;
  fetchLocation: () => Promise<void>;
  isPermissionDenied: boolean;
  openLocationSettings: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(
  undefined,
);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);

  const requestLocationPermission = useCallback(async () => {
    if (Platform.OS === 'ios') {
      Geolocation.requestAuthorization();
      setIsPermissionDenied(false);
      return true;
    }
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message:
            'This app needs access to your location to show relevant information.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        setIsPermissionDenied(false);
        return true;
      } else {
        setIsPermissionDenied(true);
        return false;
      }
    } catch (err) {
      console.warn(err);
      setIsPermissionDenied(true);
      return false;
    }
  }, []);

  const reverseGeocode = useCallback(
    async (latitude: number, longitude: number) => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          {
            headers: {
              'User-Agent': 'DisasterXApp/1.0 (support@disasterx.app)',
            },
          },
        );

        if (!response.ok) {
          throw new Error('Reverse geocoding failed');
        }

        const data = (await response.json()) as {
          display_name?: string;
          address?: any;
        };
        let conciseLocation = '';

        if (data.address) {
          const address = data.address;
          if (address.city) conciseLocation = address.city;
          else if (address.town) conciseLocation = address.town;
          else if (address.village) conciseLocation = address.village;
          else if (address.county) conciseLocation = address.county;

          if (conciseLocation && (address.state || address.country)) {
            conciseLocation += `, ${address.state || address.country}`;
          } else if (!conciseLocation && address.state) {
            conciseLocation = address.state;
          } else if (!conciseLocation && address.country) {
            conciseLocation = address.country;
          }
        }

        if (!conciseLocation && data.display_name) {
          const parts = data.display_name.split(',');
          conciseLocation = parts
            .slice(0, Math.min(parts.length, 3))
            .map(s => s.trim())
            .join(', ');
        }

        setCurrentLocation(
          conciseLocation ||
            `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`,
        );
        setLocationError(null);
      } catch (err) {
        console.error('Error reverse geocoding:', err);
        setLocationError('Unable to resolve address.');
        setCurrentLocation(
          `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`,
        );
      }
    },
    [],
  );

  const fetchLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);
    const hasPermission = await requestLocationPermission();

    if (!hasPermission) {
      setLocationError('Location permission denied.');
      setCurrentLocation('Permission Denied');
      setLocationLoading(false);
      return;
    }

    Geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation(
          `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`,
        ); // Set raw coords first
        reverseGeocode(latitude, longitude); // Then reverse geocode
        setLocationLoading(false);
      },
      error => {
        console.error('Error getting location:', error);
        setLocationError(`Error: ${error.message}`);
        setCurrentLocation('Location Unavailable');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  }, [requestLocationPermission, reverseGeocode]);

  const openLocationSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (err) {
      console.warn('Unable to open settings:', err);
    }
  }, []);

  // Fetch location only once when the provider mounts
  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  const value = {
    currentLocation,
    locationLoading,
    locationError,
    fetchLocation,
    isPermissionDenied,
    openLocationSettings,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
