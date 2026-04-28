import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, componentTokens, radii, spacing, typography } from '../../theme';
import { InventoryItem } from '../../types/inventory';
import BarItemDetails from './BarItemDetails';
import Icon from './Icon';
import {
  BadgeRow,
  BarStockStatus,
  StockStatusBadge,
  TextBadge,
  VisibilityBadge,
} from './InventoryBadges';

type BarItemRowProps = {
  isExpanded: boolean;
  item: InventoryItem;
  onOpenActions: (item: InventoryItem) => void;
  onPrimaryAction: (item: InventoryItem) => void;
  onToggleExpanded: () => void;
  stockStatus: BarStockStatus;
};

function BarItemRow({
  isExpanded,
  item,
  onOpenActions,
  onPrimaryAction,
  onToggleExpanded,
  stockStatus,
}: BarItemRowProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityLabel={`${isExpanded ? 'Hide' : 'Show'} details for ${item.name}`}
        accessibilityRole="button"
        onPress={onToggleExpanded}
        style={({ pressed }): StyleProp<ViewStyle> => {
          return [styles.summary, pressed ? styles.pressed : null];
        }}
      >
        <View style={styles.chevron}>
          <Icon name={isExpanded ? 'chevronDown' : 'chevronRight'} />
        </View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.name}>
            {item.name}
          </Text>
          <Text numberOfLines={1} style={styles.meta}>
            {[item.brand, item.productType ?? formatLabel(item.category), item.subcategory]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <Text numberOfLines={1} style={styles.meta}>
            {`${item.quantity} ${item.unit}`} {item.isOpen ? '· Open' : '· Unopened'}
          </Text>
          <BadgeRow>
            <StockStatusBadge status={stockStatus} />
            <VisibilityBadge visibility={item.visibility} />
            {item.rating !== undefined ? (
              <TextBadge label={`${item.rating.toFixed(1)} / 5`} />
            ) : null}
            {item.isArchived ? <TextBadge label="Archived" tone="warning" /> : null}
          </BadgeRow>
        </View>
        <View style={styles.actions}>
          <Pressable
            accessibilityLabel={item.isArchived ? `Restore ${item.name}` : `Edit ${item.name}`}
            accessibilityRole="button"
            onPress={(): void => {
              onPrimaryAction(item);
            }}
            style={({ pressed }): StyleProp<ViewStyle> => {
              return [styles.primaryButton, pressed ? styles.pressed : null];
            }}
          >
            <Text style={styles.primaryButtonText}>{item.isArchived ? 'Restore' : 'Edit'}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={`More actions for ${item.name}`}
            accessibilityRole="button"
            onPress={(): void => {
              onOpenActions(item);
            }}
            style={({ pressed }): StyleProp<ViewStyle> => {
              return [styles.iconButton, pressed ? styles.pressed : null];
            }}
          >
            <Icon name="more" />
          </Pressable>
        </View>
      </Pressable>
      {isExpanded ? <BarItemDetails item={item} /> : null}
    </View>
  );
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (firstLetter: string): string => {
      return firstLetter.toUpperCase();
    });
}

const styles = StyleSheet.create({
  actions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  card: {
    ...componentTokens.card,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  chevron: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 18,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 48,
  },
  meta: {
    color: colors.textSecondary,
    ...typography.bodySmall,
  },
  name: {
    color: colors.textPrimary,
    ...typography.cardTitle,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.78,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accentMuted,
    borderRadius: radii.sm,
    minWidth: 68,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  primaryButtonText: {
    color: colors.textPrimary,
    ...typography.caption,
    fontWeight: '900',
  },
  summary: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
});

export default BarItemRow;
