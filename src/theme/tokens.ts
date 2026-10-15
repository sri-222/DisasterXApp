// Shared design tokens for DisasterXApp. Values here were extracted from the
// colors/spacing/radii already in use across the app's screens (red SOS
// accent, navy info blue, neutrals) rather than invented from scratch, so
// adopting them is a consolidation, not a visual reset.

export const colors = {
  // Brand / emergency accent
  danger: '#C62828',
  dangerDark: '#8E1C1C',
  dangerLight: '#FFEBEE',
  warning: '#A66114',
  warningLight: '#FFF3E0',
  info: '#0D47A1',
  infoLight: '#E3F2FD',
  success: '#2E7D32',
  successLight: '#E8F5E9',

  // Neutrals
  textPrimary: '#1A1A1A',
  textSecondary: '#444444',
  textMuted: '#757575',
  textFaint: '#9E9E9E',

  background: '#F5F5F5',
  backgroundAlt: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F1F1',
  border: '#EEEEEE',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.4)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 32, fontWeight: '800' as const },
  title: { fontSize: 22, fontWeight: '700' as const },
  subtitle: { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodySmall: { fontSize: 13, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.5 },
  caption: { fontSize: 11, fontWeight: '600' as const },
} as const;

export const shadow = {
  card: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  cardSmall: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
} as const;
