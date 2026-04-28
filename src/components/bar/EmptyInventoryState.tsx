import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, componentTokens, spacing, typography } from '../../theme';

export type EmptyInventoryKind = 'noArchivedItems' | 'noInventory' | 'noSearchResults';

type EmptyInventoryStateProps = {
  kind: EmptyInventoryKind;
  onAddItem: () => void;
  onResetFilters: () => void;
  onViewActive: () => void;
};

function EmptyInventoryState({
  kind,
  onAddItem,
  onResetFilters,
  onViewActive,
}: EmptyInventoryStateProps): React.JSX.Element {
  const copy = getEmptyStateCopy(kind);

  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{copy.title}</Text>
      <Text style={styles.emptyCopy}>{copy.body}</Text>
      <View style={styles.actionRow}>
        {kind === 'noArchivedItems' ? (
          <ActionButton label="View Active Bar" onPress={onViewActive} />
        ) : (
          <>
            <ActionButton label="Add Item" onPress={onAddItem} />
            <ActionButton
              label={kind === 'noInventory' ? 'Import Inventory' : 'Reset Filters'}
              onPress={onResetFilters}
            />
          </>
        )}
      </View>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => {
        return [styles.actionButton, pressed ? styles.pressed : null];
      }}
    >
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

function getEmptyStateCopy(kind: EmptyInventoryKind): { body: string; title: string } {
  if (kind === 'noArchivedItems') {
    return {
      body: 'Archived items stay out of your active bar and can be restored whenever you need them.',
      title: 'No archived items',
    };
  }

  if (kind === 'noSearchResults') {
    return {
      body: 'No items match the current search and filters. Clear them or add this as a custom item.',
      title: 'No matching items',
    };
  }

  return {
    body: 'Add bottles, mixers, tools, and glassware so you can track what you have and share a guest-safe menu.',
    title: 'Build your bar',
  };
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    ...componentTokens.primaryButton,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionButtonText: {
    color: colors.textPrimary,
    ...typography.caption,
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  emptyCopy: {
    color: colors.textSecondary,
    ...typography.bodySmall,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    ...componentTokens.card,
    padding: spacing['2xl'],
  },
  emptyTitle: {
    color: colors.textPrimary,
    ...typography.cardTitle,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.78,
  },
});

export default EmptyInventoryState;
