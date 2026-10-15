import React, { useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  StatusBar, 
  Dimensions, 
  Animated, 
  Easing // Added for smoother motion
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigator/types';
import { restoreSession } from './api';

const { width } = Dimensions.get('window');

const SplashScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  // 1. Animated values for Fade, Scale, and Position
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current; // Start slightly smaller
  const slideAnim = useRef(new Animated.Value(20)).current;  // Start 20 units lower

  useEffect(() => {
    // 2. Run animations in parallel for a "Pop & Fade" effect
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800, // Faster fade
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.back(1.5)), // Adds a slight "bounce" effect
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();

    // 3. Quick Navigation: Reduced delay to 1.8s total
    // This allows the animation to finish (1s) + 800ms of "brand settle" time.
    // In parallel, validate any stored token against the server-side session
    // so a restart lands straight on Home when still logged in, or Login
    // when the token is missing/expired/invalidated.
    let cancelled = false;
    const minDelay = new Promise<void>(resolve => setTimeout(resolve, 1800));

    Promise.all([minDelay, restoreSession()]).then(([, user]) => {
      if (cancelled) return;
      navigation.replace(user ? 'Home' : 'Login');
    });

    return () => {
      cancelled = true;
    };
  }, [fadeAnim, scaleAnim, slideAnim, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <Animated.Image 
        source={require('./assets/logo.png')} 
        style={[
          styles.logo,
          { 
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim }
            ] 
          }
        ]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: width * 0.5,
    height: width * 0.5,
  },
});

export default SplashScreen;