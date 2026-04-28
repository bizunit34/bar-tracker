import React from 'react';
import { Image, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, componentTokens, radii, spacing, typography } from '../../theme';
import { InventoryItem } from '../../types/inventory';
import Icon from './Icon';
import {
  BadgeRow,
  BarStockStatus,
  StockStatusBadge,
  TextBadge,
  VisibilityBadge,
} from './InventoryBadges';

type BarItemCardProps = {
  item: InventoryItem;
  onOpenActions: (item: InventoryItem) => void;
  onPrimaryAction: (item: InventoryItem) => void;
  stockStatus: BarStockStatus;
};

function BarItemCard({
  item,
  onOpenActions,
  onPrimaryAction,
  stockStatus,
}: BarItemCardProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      <View style={styles.media}>
        {item.imageUri ? (
          <Image
            accessibilityIgnoresInvertColors
            source={{ uri: item.imageUri }}
            style={styles.image}
          />
        ) : (
          <View style={styles.placeholder}>
            <Icon
              name={item.category === 'tool' || item.category === 'glassware' ? 'image' : 'stockIn'}
            />
          </View>
        )}
        <Pressable
          accessibilityLabel={`More actions for ${item.name}`}
          accessibilityRole="button"
          onPress={(): void => {
            onOpenActions(item);
          }}
          style={({ pressed }): StyleProp<ViewStyle> => {
            return [styles.moreButton, pressed ? styles.pressed : null];
          }}
        >
          <Icon name="more" />
        </Pressable>
      </View>
      <Text numberOfLines={2} style={styles.name}>
        {item.name}
      </Text>
      <Text numberOfLines={1} style={styles.meta}>
        {[item.brand, item.productType ?? formatLabel(item.category)].filter(Boolean).join(' · ')}
      </Text>
      <Text style={styles.quantity}>
        {item.quantity} {item.unit} {item.isOpen ? '· Open' : ''}
      </Text>
      <BadgeRow>
        <StockStatusBadge status={stockStatus} />
        <VisibilityBadge visibility={item.visibility} />
        {item.rating !== undefined ? <TextBadge label={`${item.rating.toFixed(1)} / 5`} /> : null}
        {item.isArchived ? <TextBadge label="Archived" tone="warning" /> : null}
      </BadgeRow>
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
  card: {
    ...componentTokens.card,
    flex: 1,
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  media: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    height: 118,
    overflow: 'hidden',
  },
  meta: {
    color: colors.textSecondary,
    ...typography.bodySmall,
  },
  moreButton: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    top: 8,
    width: 48,
  },
  name: {
    color: colors.textPrimary,
    ...typography.bodyStrong,
    fontWeight: '900',
    minHeight: 38,
  },
  placeholder: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.78,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accentMuted,
    borderRadius: radii.sm,
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  primaryButtonText: {
    color: colors.textPrimary,
    ...typography.caption,
    fontWeight: '900',
  },
  quantity: {
    color: colors.textSecondary,
    ...typography.caption,
    fontWeight: '700',
  },
});

export default BarItemCard;
