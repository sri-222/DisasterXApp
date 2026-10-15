import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radii, shadow, spacing } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  padded?: boolean;
}

const Card: React.FC<CardProps> = ({ children, style, elevated = true, padded = true }) => (
  <View
    style={[
      styles.base,
      padded && styles.padded,
      elevated ? shadow.card : shadow.cardSmall,
      style,
    ]}
  >
    {children}
  </View>
);

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    width: '100%',
  },
  padded: {
    padding: spacing.xxl,
  },
});

export default Card;
