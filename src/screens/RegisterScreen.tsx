import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TextInputProps,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { 
  User, 
  Phone, 
  Mail, 
  Lock, 
  ArrowRight, 
  ShieldCheck,
  Eye,
  EyeOff 
} from 'lucide-react-native';

// 1. Import Navigation Hooks and Types
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigator/types'; // Adjust path based on your folder structure
import { signup } from './api';

// Reusable Input Field Component
interface InputFieldProps extends TextInputProps {
  label: string;
  icon: React.ReactNode;
  isPassword?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
}

const InputField: React.FC<InputFieldProps> = ({ 
  label, 
  icon, 
  isPassword, 
  showPassword, 
  onTogglePassword, 
  ...props 
}) => (
  <View style={styles.inputWrapper}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputContainer}>
      <View style={styles.iconContainer}>{icon}</View>
      <TextInput 
        style={styles.input} 
        placeholderTextColor="#9E9E9E"
        secureTextEntry={isPassword && !showPassword}
        {...props} 
      />
      {isPassword && (
        <TouchableOpacity onPress={onTogglePassword} style={styles.eyeIcon}>
          {showPassword ? (
            <Eye size={20} color="#9E9E9E" />
          ) : (
            <EyeOff size={20} color="#9E9E9E" />
          )}
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const RegisterScreen: React.FC = () => {
  // 2. Initialize Navigation
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setErrorMessage('Please fill out every required field.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      await signup({
        name,
        phone,
        email,
        password,
        role: 'responder',
      });

      setName('');
      setPhone('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');

      Alert.alert('Success', 'Account created. Please log in.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to register');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F7F7" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Enter your details to register as a responder.
            </Text>

            <InputField 
              label="FULL NAME" 
              icon={<User size={18} color="#9E9E9E" />} 
              placeholder="Your Name" 
              value={name}
              onChangeText={setName}
            />
            
            <InputField 
              label="PHONE NUMBER" 
              icon={<Phone size={18} color="#9E9E9E" />} 
              placeholder="+91" 
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            
            <InputField 
              label="EMAIL ADDRESS" 
              icon={<Mail size={18} color="#9E9E9E" />} 
              placeholder="your@example.com" 
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            
            <InputField 
              label="PASSWORD" 
              icon={<Lock size={18} color="#9E9E9E" />} 
              placeholder="••••••••" 
              isPassword={true}
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              value={password}
              onChangeText={setPassword}
            />
            
            <InputField 
              label="CONFIRM PASSWORD" 
              icon={<Lock size={18} color="#9E9E9E" />} 
              placeholder="••••••••" 
              isPassword={true}
              showPassword={showConfirmPassword}
              onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.registerButton, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.registerButtonText}>REGISTER</Text>
                  <ArrowRight color="#FFF" size={18} />
                </>
              )}
            </TouchableOpacity>

            {/* 3. Navigation Trigger added here */}
            <TouchableOpacity 
              style={styles.loginLink} 
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.footerText}>
                Already have an account? <Text style={styles.loginText}>Log in</Text>
              </Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.securityContainer}>
              <ShieldCheck color="#9E9E9E" size={16} />
              <Text style={styles.securityText}>
                ENCRYPTED & SECURE TACTICAL INFRASTRUCTURE
              </Text>
            </View>
          </View>

          <Text style={styles.copyrightText}>
            © 2026 DISASTERX OPERATIONAL COMMAND. ALL RIGHTS RESERVED.
          </Text>
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Styles remain unchanged
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 28,
    height: 28,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
    marginLeft: 10,
    letterSpacing: 1.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 24,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9E9E9E',
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
    borderRadius: 50, 
    paddingHorizontal: 16,
    height: 48,
  },
  iconContainer: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#212121',
  },
  eyeIcon: {
    padding: 4,
  },
  registerButton: {
    backgroundColor: '#000000',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    height: 54,
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    marginRight: 8,
    letterSpacing: 1,
  },
  errorText: {
    color: '#C62828',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  loginLink: {
    marginTop: 18,
    alignItems: 'center',
  },
  footerText: {
    color: '#757575',
    fontSize: 13,
  },
  loginText: {
    color: '#000000',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 25,
  },
  securityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityText: {
    fontSize: 9,
    color: '#9E9E9E',
    fontWeight: '800',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  copyrightText: {
    fontSize: 9,
    color: '#BDBDBD',
    textAlign: 'center',
    marginTop: 30,
    paddingBottom: 20,
    letterSpacing: 0.5,
  },
});

export default RegisterScreen;
