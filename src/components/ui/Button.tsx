import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';
import { colors, radii, spacing } from '../../theme';

type ButtonVariant = 'primary' | 'danger' | 'outline';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
}

const Button: React.FC<ButtonProps> = ({
  label,
  variant = 'primary',
  loading = false,
  icon,
  iconPosition = 'right',
  style,
  disabled,
  ...touchableProps
}) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      style={[
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'danger' && styles.danger,
        variant === 'outline' && styles.outline,
        isDisabled && styles.disabled,
        style,
      ]}
      {...touchableProps}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.textPrimary : colors.white} />
      ) : (
        <>
          {icon && iconPosition === 'left' ? icon : null}
          <Text
            style={[
              styles.label,
              variant === 'outline' ? styles.labelOutline : styles.labelSolid,
              icon ? styles.labelWithIcon : null,
            ]}
          >
            {label}
          </Text>
          {icon && iconPosition === 'right' ? icon : null}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
  },
  primary: {
    backgroundColor: colors.textPrimary,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  labelSolid: {
    color: colors.white,
  },
  labelOutline: {
    color: colors.textPrimary,
  },
  labelWithIcon: {
    marginHorizontal: spacing.sm,
  },
});

export default Button;
