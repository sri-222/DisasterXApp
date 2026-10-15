import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radii, spacing } from '../../theme';

interface TextFieldProps extends TextInputProps {
  label?: string;
  icon?: React.ReactNode;
  rightAccessory?: React.ReactNode;
}

const TextField: React.FC<TextFieldProps> = ({ label, icon, rightAccessory, style, ...inputProps }) => (
  <View style={styles.wrapper}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <View style={styles.inputContainer}>
      {icon}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.textFaint}
        {...inputProps}
      />
      {rightAccessory}
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textFaint,
    marginBottom: spacing.sm,
    letterSpacing: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
});

export default TextField;
