import { Platform, TextStyle } from 'react-native';

export const fontFamilies = {
  sans: Platform.select({
    android: 'Roboto',
    default: 'System',
    ios: 'System',
  }),
} as const;

export const typography = {
  body: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  bodyStrong: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  button: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  caption: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  display: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 38,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 34,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
} satisfies Record<string, TextStyle>;

export type Typography = typeof typography;
export type TypographyRole = keyof Typography;
