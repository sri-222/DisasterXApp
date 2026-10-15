import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Utensils, Pill, Home as HomeIcon, MoreHorizontal } from 'lucide-react-native';
import { RootStackParamList } from '../navigator/types';
import { ScreenContainer, Card, Button } from '../components/ui';
import { useLocation, usableAddress } from './LocationContext';
import { createHelpRequest, HelpCategory } from './api';
import { colors, radii, spacing, typography } from '../theme';

const CATEGORY_META: Record<HelpCategory, { icon: typeof Utensils; blurb: string }> = {
  Food: { icon: Utensils, blurb: 'Request a meal delivery, ration kit, or clean drinking water.' },
  Medicine: { icon: Pill, blurb: 'Request medication, first aid supplies, or medical attention.' },
  Shelter: { icon: HomeIcon, blurb: 'Request emergency shelter or temporary housing.' },
  Other: { icon: MoreHorizontal, blurb: 'Request any other kind of assistance not listed above.' },
};

type RequestHelpRouteProp = RouteProp<RootStackParamList, 'RequestHelp'>;

const RequestHelpScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RequestHelpRouteProp>();
  const { category } = route.params;
  const { currentLocation, latitude, longitude } = useLocation();

  const [description, setDescription] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const meta = CATEGORY_META[category];
  const Icon = meta.icon;

  const handleSubmit = async () => {
    if (submitting) return;
    if (description.trim().length < 3) {
      Alert.alert('Tell us more', 'Please describe what you need (at least 3 characters).');
      return;
    }

    setSubmitting(true);
    try {
      await createHelpRequest({
        category,
        description: description.trim(),
        urgent,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        address: latitude != null ? usableAddress(currentLocation) : undefined,
      });
      Alert.alert('Request Sent', 'Your assistance request has been submitted.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Could not send request', err.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer backgroundColor={colors.background}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{category === 'Other' ? 'Request Assistance' : `Request ${category} Assistance`}</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <Card>
            <View style={styles.iconBadge}>
              <Icon size={28} color={colors.info} />
            </View>
            <Text style={styles.blurb}>{meta.blurb}</Text>

            <Text style={styles.label}>WHAT DO YOU NEED?</Text>
            <TextInput
              style={styles.textarea}
              placeholder={`Describe the ${category.toLowerCase()} assistance you need...`}
              placeholderTextColor={colors.textFaint}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={300}
            />

            <Text style={styles.label}>YOUR LOCATION</Text>
            <View style={styles.locationBox}>
              <Text style={styles.locationText} numberOfLines={2}>
                {currentLocation || 'Resolving your location…'}
              </Text>
            </View>

            <View style={styles.urgencyRow}>
              <TouchableOpacity
                style={[styles.urgencyOption, !urgent && styles.urgencyOptionActive]}
                onPress={() => setUrgent(false)}
              >
                <Text style={[styles.urgencyText, !urgent && styles.urgencyTextActive]}>Standard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.urgencyOption, urgent && styles.urgencyOptionUrgent]}
                onPress={() => setUrgent(true)}
              >
                <Text style={[styles.urgencyText, urgent && styles.urgencyTextUrgent]}>Urgent</Text>
              </TouchableOpacity>
            </View>

            <Button
              label={submitting ? 'Sending…' : 'Submit Request'}
              onPress={handleSubmit}
              loading={submitting}
              variant="danger"
              style={styles.submitBtn}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  backBtn: {
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
    marginRight: spacing.lg,
  },
  headerTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  blurb: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textFaint,
    marginBottom: spacing.sm,
    letterSpacing: 0.8,
  },
  textarea: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.lg,
    fontSize: 15,
    color: colors.textPrimary,
    minHeight: 120,
    marginBottom: spacing.lg,
  },
  locationBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  urgencyRow: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
  },
  urgencyOption: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    marginRight: spacing.sm,
  },
  urgencyOptionActive: {
    backgroundColor: colors.info,
  },
  urgencyOptionUrgent: {
    backgroundColor: colors.danger,
  },
  urgencyText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  urgencyTextActive: {
    color: colors.white,
  },
  urgencyTextUrgent: {
    color: colors.white,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
});

export default RequestHelpScreen;
