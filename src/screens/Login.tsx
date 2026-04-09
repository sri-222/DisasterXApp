import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
// 1. Import Navigation hooks and your types
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigator/types'; 

import { Mail, Lock, Eye, EyeOff, UserPlus, ArrowRight } from 'lucide-react-native';
import { login } from './api';

const SignInScreen: React.FC = () => {
  // 2. Initialize the navigation hook
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      await login({ email, password });
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f4f4" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          <View style={styles.header}>
            <Image
              source={require('./assets/logo.png')} // Path updated to look in parent assets folder
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>DISASTERX</Text>
            <Text style={styles.subtitle}>
              Crisis management for a safer tomorrow.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Sign In</Text>

            <Text style={styles.inputLabel}>EMAIL OR PHONE</Text>
            <View style={styles.inputContainer}>
              <Mail size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.passwordLabelRow}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <TouchableOpacity>
                <Text style={styles.forgotText}>FORGOT?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <Lock size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secureText}
              />
              <TouchableOpacity onPress={() => setSecureText(!secureText)}>
                {secureText ? <EyeOff size={20} color="#999" /> : <Eye size={20} color="#999" />}
              </TouchableOpacity>
            </View>

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              activeOpacity={0.8}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Login</Text>
                  <ArrowRight size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.orDivider}>OR</Text>

            {/* 3. Added navigation.navigate('Register') here */}
            <TouchableOpacity 
              style={styles.createAccountButton}
              onPress={() => navigation.navigate('Register')}
            >
              <UserPlus size={18} color="#000" style={styles.createIcon} />
              <Text style={styles.createAccountText}>Create New Account</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerLinksRow}>
            <TouchableOpacity style={styles.footerLinkItem}>
              <Text style={styles.footerLinkText}>HELP CENTER</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerLinkItem}>
              <Text style={styles.footerLinkText}>EMERGENCY OFFLINE</Text>
            </TouchableOpacity>
          </View>
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 30,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 1,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#000',
    fontSize: 15,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotText: {
    fontSize: 12,
    color: '#444',
    fontWeight: '600',
  },
  loginButton: {
    flexDirection: 'row',
    backgroundColor: '#000',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  errorText: {
    color: '#C62828',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  orDivider: {
    textAlign: 'center',
    color: '#999',
    fontSize: 13,
    marginVertical: 20,
  },
  createAccountButton: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createAccountText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
  },
  createIcon: {
    marginRight: 8,
  },
  footerLinksRow: {
    flexDirection: 'row',
    marginTop: 30,
    justifyContent: 'center',
  },
  footerLinkItem: {
    paddingHorizontal: 15,
  },
  footerLinkText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default SignInScreen;
