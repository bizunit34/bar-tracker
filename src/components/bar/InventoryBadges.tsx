import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  componentTokens,
  getStockStatusTone,
  getVisibilityTone,
  toneColors,
  typography,
} from '../../theme';
import { InventoryVisibility } from '../../types/inventory';

export type BarStockStatus = 'inStock' | 'lowStock' | 'outOfStock';

type StockStatusBadgeProps = {
  status: BarStockStatus;
};

type VisibilityBadgeProps = {
  visibility?: InventoryVisibility;
};

type TextBadgeProps = {
  label: string;
  tone?: 'default' | 'strong' | 'warning';
};

function StockStatusBadge({ status }: StockStatusBadgeProps): React.JSX.Element {
  const label = status === 'outOfStock' ? 'Out' : status === 'lowStock' ? 'Low stock' : 'In stock';
  const tone = toneColors[getStockStatusTone(status)];

  return (
    <Text
      style={[
        styles.badge,
        {
          backgroundColor: tone.backgroundColor,
          borderColor: tone.borderColor,
          color: tone.textColor,
        },
      ]}
    >
      {label}
    </Text>
  );
}

function VisibilityBadge({ visibility = 'private' }: VisibilityBadgeProps): React.JSX.Element {
  const label =
    visibility === 'guest_visible'
      ? 'Guest Visible'
      : visibility === 'shared'
        ? 'Shared'
        : 'Private';
  const tone = toneColors[getVisibilityTone(visibility)];

  return (
    <Text
      style={[
        styles.badge,
        {
          backgroundColor: tone.backgroundColor,
          borderColor: tone.borderColor,
          color: tone.textColor,
        },
      ]}
    >
      {label}
    </Text>
  );
}

function TextBadge({ label, tone = 'default' }: TextBadgeProps): React.JSX.Element {
  const semanticTone =
    tone === 'strong' ? toneColors.primary : tone === 'warning' ? toneColors.warning : null;

  return (
    <Text
      style={[
        styles.badge,
        semanticTone
          ? {
              backgroundColor: semanticTone.backgroundColor,
              borderColor: semanticTone.borderColor,
              color: semanticTone.textColor,
            }
          : null,
      ]}
    >
      {label}
    </Text>
  );
}

function BadgeRow({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <View style={styles.badgeRow}>{children}</View>;
}

const styles = StyleSheet.create({
  badge: {
    ...componentTokens.badge,
    ...typography.caption,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
});

export { BadgeRow, StockStatusBadge, TextBadge, VisibilityBadge };
