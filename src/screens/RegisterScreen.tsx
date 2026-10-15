import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
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
  EyeOff,
} from 'lucide-react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigator/types';
import { signup } from './api';
import { saveUserProfile } from '../services/userProfileStorage';
import { Button, Card, ScreenContainer, TextField } from '../components/ui';
import { colors, spacing, typography } from '../theme';

const RegisterScreen: React.FC = () => {
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
      await saveUserProfile({
        name,
        phone,
        email,
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
    <ScreenContainer backgroundColor={colors.backgroundAlt}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Image
              source={require('./assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>DISASTERX</Text>
          </View>

          <Card>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Enter your details to register as a responder.</Text>

            <TextField
              label="FULL NAME"
              icon={<User size={18} color={colors.textFaint} />}
              placeholder="Your Name"
              value={name}
              onChangeText={setName}
            />

            <TextField
              label="PHONE NUMBER"
              icon={<Phone size={18} color={colors.textFaint} />}
              placeholder="+91"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <TextField
              label="EMAIL ADDRESS"
              icon={<Mail size={18} color={colors.textFaint} />}
              placeholder="your@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <TextField
              label="PASSWORD"
              icon={<Lock size={18} color={colors.textFaint} />}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              rightAccessory={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <Eye size={20} color={colors.textFaint} />
                  ) : (
                    <EyeOff size={20} color={colors.textFaint} />
                  )}
                </TouchableOpacity>
              }
            />

            <TextField
              label="CONFIRM PASSWORD"
              icon={<Lock size={18} color={colors.textFaint} />}
              placeholder="••••••••"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              rightAccessory={
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? (
                    <Eye size={20} color={colors.textFaint} />
                  ) : (
                    <EyeOff size={20} color={colors.textFaint} />
                  )}
                </TouchableOpacity>
              }
            />

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <Button
              label="REGISTER"
              onPress={handleRegister}
              loading={isLoading}
              icon={<ArrowRight color={colors.white} size={18} style={styles.btnIcon} />}
            />

            <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerText}>
                Already have an account? <Text style={styles.loginText}>Log in</Text>
              </Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.securityContainer}>
              <ShieldCheck color={colors.textFaint} size={16} />
              <Text style={styles.securityText}>ENCRYPTED & SECURE TACTICAL INFRASTRUCTURE</Text>
            </View>
          </Card>

          <Text style={styles.copyrightText}>
            © 2026 DISASTERX OPERATIONAL COMMAND. ALL RIGHTS RESERVED.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoImage: {
    width: 28,
    height: 28,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    marginLeft: spacing.md,
    letterSpacing: 1.5,
  },
  title: {
    ...typography.display,
    fontSize: 26,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
  },
  btnIcon: {
    marginHorizontal: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  loginLink: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  loginText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xxxl,
  },
  securityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityText: {
    fontSize: 9,
    color: colors.textFaint,
    fontWeight: '800',
    marginLeft: spacing.sm,
    letterSpacing: 0.3,
  },
  copyrightText: {
    fontSize: 9,
    color: '#BDBDBD',
    textAlign: 'center',
    marginTop: spacing.xxxl,
    paddingBottom: spacing.xl,
    letterSpacing: 0.5,
  },
});

export default RegisterScreen;
