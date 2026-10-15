import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigator/types';

import { Mail, Lock, Eye, EyeOff, UserPlus, ArrowRight } from 'lucide-react-native';
import { login } from './api';
import { saveUserProfile } from '../services/userProfileStorage';
import { saveToken } from '../services/authSession';
import { Button, Card, ScreenContainer, TextField } from '../components/ui';
import { colors, spacing, typography } from '../theme';

const SignInScreen: React.FC = () => {
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
      const response = await login({ email, password });
      await saveToken(response.token);
      await saveUserProfile({
        name: response.user.name,
        // Pass through as-is: null/undefined here means "server didn't
        // return a phone", and saveUserProfile preserves whatever was
        // already cached in that case instead of overwriting it with ''.
        phone: response.user.phone ?? undefined,
        email: response.user.email,
      });
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
    <ScreenContainer backgroundColor={colors.background}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContainer}
        >
          <View style={styles.header}>
            <Image
              source={require('./assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>DISASTERX</Text>
            <Text style={styles.subtitle}>Crisis management for a safer tomorrow.</Text>
          </View>

          <Card>
            <Text style={styles.title}>Sign In</Text>

            <TextField
              label="EMAIL"
              placeholder="name@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              icon={<Mail size={20} color={colors.textFaint} />}
            />

            <View style={styles.passwordLabelRow}>
              <Text style={styles.passwordLabel}>PASSWORD</Text>
            </View>
            <TextField
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secureText}
              icon={<Lock size={20} color={colors.textFaint} />}
              rightAccessory={
                <TouchableOpacity onPress={() => setSecureText(!secureText)}>
                  {secureText ? (
                    <EyeOff size={20} color={colors.textFaint} />
                  ) : (
                    <Eye size={20} color={colors.textFaint} />
                  )}
                </TouchableOpacity>
              }
            />

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <Button
              label="Login"
              onPress={handleLogin}
              loading={isLoading}
              icon={<ArrowRight size={20} color={colors.white} style={styles.btnIcon} />}
              style={styles.loginButton}
            />

            <Text style={styles.orDivider}>OR</Text>

            <Button
              label="Create New Account"
              variant="outline"
              onPress={() => navigation.navigate('Register')}
              icon={<UserPlus size={18} color={colors.textPrimary} style={styles.btnIcon} />}
              iconPosition="left"
            />
          </Card>

          <View style={styles.footerLinksRow}>
            {/* Works without an account: anyone can still reach emergency services. */}
            <TouchableOpacity
              style={styles.footerLinkItem}
              onPress={() => Linking.openURL('tel:112').catch(() => {})}
            >
              <Text style={styles.footerLinkText}>EMERGENCY? CALL 112</Text>
            </TouchableOpacity>
          </View>
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
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: spacing.lg,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xxl,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passwordLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textFaint,
    marginBottom: spacing.sm,
    letterSpacing: 0.8,
  },
  forgotText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  loginButton: {
    marginTop: spacing.sm,
  },
  btnIcon: {
    marginHorizontal: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  orDivider: {
    textAlign: 'center',
    color: colors.textFaint,
    fontSize: 13,
    marginVertical: spacing.xl,
  },
  footerLinksRow: {
    flexDirection: 'row',
    marginTop: spacing.xxxl,
    justifyContent: 'center',
  },
  footerLinkItem: {
    paddingHorizontal: 15,
  },
  footerLinkText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});

export default SignInScreen;
