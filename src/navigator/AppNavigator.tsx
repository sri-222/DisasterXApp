import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';

// Import your screens
import SplashScreen from '../screens/SplashScreen'; // Added
import LoginScreen from '../screens/Login';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/Home';
import AlertsScreen from '../screens/AlertsScreen';
import VolunteerScreen from '../screens/VolunteerScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SosScreen from '../screens/SosScreen';
import WeatherScreen from '../screens/WeatherScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash" // Start with the Splash screen
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right', // Default animation for others
      }}
    >
      {/* Splash Screen - Uses fade for a smoother entrance */}
      <Stack.Screen 
        name="Splash" 
        component={SplashScreen} 
        options={{ animation: 'fade' }} 
      />

      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="SOS" component={SosScreen} options={{ animation: 'none' }} />
      <Stack.Screen name="Alerts" component={AlertsScreen} options={{ animation: 'none' }} />
      <Stack.Screen name="Volunteer" component={VolunteerScreen} options={{ animation: 'none' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ animation: 'none' }} />
      <Stack.Screen name="Weather" component={WeatherScreen} options={{ animation: 'none' }} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
