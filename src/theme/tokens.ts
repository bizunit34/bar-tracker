import { InventoryCategory, InventoryVisibility } from '../types/inventory';
import { colors } from './colors';
import { palette } from './palette';
import { radii } from './radii';
import { shadows } from './shadows';
import { spacing } from './spacing';
import { typography } from './typography';

export type Tone = 'danger' | 'info' | 'neutral' | 'primary' | 'success' | 'warning';

export const componentTokens = {
  badge: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  card: {
    ...shadows.card,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  chip: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  dangerButton: {
    backgroundColor: colors.dangerMuted,
    borderColor: colors.danger,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.textPrimary,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
  },
  screen: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  secondaryButton: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
  },
} as const;

export const toneColors: Record<
  Tone,
  { backgroundColor: string; borderColor: string; textColor: string }
> = {
  danger: {
    backgroundColor: colors.dangerMuted,
    borderColor: colors.danger,
    textColor: colors.dangerText,
  },
  info: {
    backgroundColor: colors.infoMuted,
    borderColor: colors.info,
    textColor: palette.blue[300],
  },
  neutral: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    textColor: colors.textSecondary,
  },
  primary: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
    textColor: palette.amber[300],
  },
  success: {
    backgroundColor: colors.successMuted,
    borderColor: colors.success,
    textColor: palette.sage[300],
  },
  warning: {
    backgroundColor: colors.warningMuted,
    borderColor: colors.warning,
    textColor: palette.gold[300],
  },
};

export function getStockStatusTone(status: 'inStock' | 'lowStock' | 'outOfStock'): Tone {
  if (status === 'outOfStock') {
    return 'danger';
  }

  if (status === 'lowStock') {
    return 'warning';
  }

  return 'success';
}

export function getVisibilityTone(visibility: InventoryVisibility | undefined): Tone {
  if (visibility === 'guest_visible') {
    return 'primary';
  }

  if (visibility === 'shared') {
    return 'info';
  }

  return 'neutral';
}

export function getInventoryCategoryTone(category: InventoryCategory): Tone {
  if (category === 'tool' || category === 'glassware' || category === 'mixer') {
    return 'info';
  }

  if (category === 'garnish') {
    return 'success';
  }

  if (category === 'wine') {
    return 'danger';
  }

  if (category === 'bitters' || category === 'beer' || category === 'juice') {
    return 'warning';
  }

  if (category === 'liqueur' || category === 'syrup') {
    return 'primary';
  }

  return 'neutral';
}

export const tokens = {
  colors,
  componentTokens,
  palette,
  radii,
  shadows,
  spacing,
  toneColors,
  typography,
} as const;
