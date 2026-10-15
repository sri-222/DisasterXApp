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
import Geolocation, {
  GeolocationError,
} from '@react-native-community/geolocation';

interface LocationContextType {
  currentLocation: string | null;
  latitude: number | null;
  longitude: number | null;
  locationLoading: boolean;
  locationError: string | null;
  fetchLocation: () => Promise<{latitude: number; longitude: number} | null>;
  isPermissionDenied: boolean;
  openLocationSettings: () => Promise<void>;
}

// currentLocation doubles as a status line ("Permission Denied", "Location
// Unavailable"); never send those to the control room as an address.
const STATUS_TEXTS = ['Permission Denied', 'Location Unavailable', 'Fetching location...'];
export function usableAddress(text: string | null | undefined): string | undefined {
  if (!text || STATUS_TEXTS.includes(text)) return undefined;
  return text;
}

const LocationContext = createContext<LocationContextType | undefined>(
  undefined,
);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
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

  const requestPosition = useCallback(
    (options: {enableHighAccuracy: boolean; timeout: number; maximumAge: number}) =>
      new Promise<
        {coords: {latitude: number; longitude: number}} | {error: GeolocationError}
      >(resolve => {
        Geolocation.getCurrentPosition(
          position =>
            resolve({
              coords: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              },
            }),
          error => resolve({error}),
          options,
        );
      }),
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
      return null;
    }

    let result = await requestPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000,
    });

    // A GPS-only fix (enableHighAccuracy) can time out or be unavailable
    // indoors / with a weak signal - fall back once to faster, less precise
    // network-based location instead of failing outright.
    if ('error' in result && (result.error.code === 2 || result.error.code === 3)) {
      result = await requestPosition({
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      });
    }

    if ('coords' in result) {
      const {latitude: lat, longitude: lon} = result.coords;
      setLatitude(lat);
      setLongitude(lon);
      setCurrentLocation(`Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`);
      reverseGeocode(lat, lon);
      setLocationLoading(false);
      return result.coords;
    }

    const {error} = result;
    const message = error?.message || 'Unable to determine your location right now.';
    console.error(`Error getting location (code ${error?.code ?? 'unknown'}): ${message}`);
    setLocationError(message);
    setCurrentLocation(error?.code === 1 ? 'Permission Denied' : 'Location Unavailable');
    if (error?.code === 1) {
      setIsPermissionDenied(true);
    }
    setLocationLoading(false);
    return null;
  }, [requestLocationPermission, requestPosition, reverseGeocode]);

  const openLocationSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (err) {
      console.warn('Unable to open settings:', err);
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  const value = {
    currentLocation,
    latitude,
    longitude,
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
