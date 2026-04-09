import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';

// Import the navigator from your new folder
import AppNavigator from './src/navigator/AppNavigator';
import { LocationProvider } from './src/screens/LocationContext';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />
      
      {/* NavigationContainer must wrap the AppNavigator */}
      <LocationProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </LocationProvider>
      
    </SafeAreaProvider>
  );
}

export default App;
