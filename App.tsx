import React, { useEffect, useRef } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';

// Import the navigator from your new folder
import AppNavigator from './src/navigator/AppNavigator';
import { LocationProvider } from './src/screens/LocationContext';
import { navigationRef, resetToLogin } from './src/navigator/navigationRef';
import { subscribe } from './src/services/authSession';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  // Tracks whether we were previously holding a token so we only force a
  // redirect to Login on a genuine logged-in -> logged-out transition (e.g.
  // a 401 from an expired/invalidated session), not during normal startup
  // before a session has been restored yet.
  const hadTokenRef = useRef(false);
  useEffect(() => {
    const unsubscribe = subscribe(token => {
      const wasLoggedIn = hadTokenRef.current;
      hadTokenRef.current = !!token;
      if (wasLoggedIn && !token) {
        resetToLogin();
      }
    });
    return unsubscribe;
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />

      {/* NavigationContainer must wrap the AppNavigator */}
      <LocationProvider>
        <NavigationContainer ref={navigationRef}>
          <AppNavigator />
        </NavigationContainer>
      </LocationProvider>

    </SafeAreaProvider>
  );
}

export default App;
