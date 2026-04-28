import { palette } from './palette';

export const colors = {
  background: palette.neutral.espresso950,
  backgroundElevated: palette.neutral.espresso900,
  border: 'rgba(244, 239, 231, 0.12)',
  borderStrong: 'rgba(244, 239, 231, 0.22)',
  card: palette.neutral.espresso850,
  danger: palette.red[500],
  dangerBorder: palette.red[600],
  dangerMuted: 'rgba(198, 83, 73, 0.18)',
  dangerText: palette.red[300],
  divider: 'rgba(244, 239, 231, 0.10)',
  info: palette.blue[500],
  infoMuted: 'rgba(92, 142, 166, 0.18)',
  overlay: 'rgba(8, 6, 4, 0.72)',
  primary: palette.amber[500],
  primaryMuted: 'rgba(217, 149, 43, 0.16)',
  primaryPressed: palette.amber[600],
  secondary: palette.copper[500],
  secondaryMuted: 'rgba(185, 110, 69, 0.16)',
  success: palette.sage[500],
  successMuted: 'rgba(111, 148, 116, 0.18)',
  surface: palette.neutral.espresso900,
  surfacePressed: palette.neutral.espresso800,
  surfaceRaised: palette.neutral.espresso850,
  textInverse: palette.neutral.espresso950,
  textMuted: palette.neutral.sand500,
  textPrimary: palette.neutral.cream100,
  textSecondary: palette.neutral.sand300,
  warning: palette.gold[500],
  warningMuted: 'rgba(217, 170, 53, 0.18)',

  // Compatibility aliases for the existing app while screens migrate to semantic names.
  accent: palette.amber[500],
  accentMuted: 'rgba(217, 149, 43, 0.16)',
  highlight: palette.neutral.espresso800,
} as const;

export type AppColors = typeof colors;
