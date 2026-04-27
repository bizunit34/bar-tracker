import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { useBarInventoryItems } from '../data/barInventoryStore';
import { useBarShareSettings } from '../data/barShareSettingsStore';
import { mapInventoryToGuestVisibleItems } from '../data/guestInventoryMapping';
import { colors } from '../theme/colors';
import { GuestVisibleBarItem, InventoryCategory } from '../types/inventory';

type SharePreviewScreenProps = {
  onManageSharing: () => void;
};

function SharePreviewScreen({ onManageSharing }: SharePreviewScreenProps): React.JSX.Element {
  const inventoryItems = useBarInventoryItems();
  const shareSettings = useBarShareSettings();
  const guestItems = useMemo((): Array<GuestVisibleBarItem> => {
    return mapInventoryToGuestVisibleItems(inventoryItems, shareSettings);
  }, [inventoryItems, shareSettings]);
  const categories = useMemo((): Array<InventoryCategory> => {
    return Array.from(
      new Set(
        guestItems.map((item: GuestVisibleBarItem): InventoryCategory => {
          return item.category;
        }),
      ),
    ).sort((left: InventoryCategory, right: InventoryCategory): number => {
      return formatLabel(left).localeCompare(formatLabel(right));
    });
  }, [guestItems]);
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | 'all'>('all');
  const visibleItems = useMemo((): Array<GuestVisibleBarItem> => {
    return guestItems.filter((item: GuestVisibleBarItem): boolean => {
      return selectedCategory === 'all' || item.category === selectedCategory;
    });
  }, [guestItems, selectedCategory]);
  const groupedItems = useMemo((): Array<[InventoryCategory, Array<GuestVisibleBarItem>]> => {
    const groups = new Map<InventoryCategory, Array<GuestVisibleBarItem>>();

    visibleItems.forEach((item: GuestVisibleBarItem): void => {
      groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
    });

    return [...groups.entries()].sort((left, right): number => {
      return formatLabel(left[0]).localeCompare(formatLabel(right[0]));
    });
  }, [visibleItems]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.pageTitle}>{shareSettings.title}</Text>
          {shareSettings.description ? (
            <Text style={styles.pageSubtitle}>{shareSettings.description}</Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onManageSharing}
          style={({ pressed }): StyleProp<ViewStyle> => {
            return [styles.manageButton, pressed ? styles.controlPressed : null];
          }}
        >
          <Text style={styles.manageButtonText}>Manage</Text>
        </Pressable>
      </View>
      <Text style={styles.pageSubtitle}>Local preview only. This is not a live public link.</Text>

      {guestItems.length > 0 ? (
        <View style={styles.filterRow}>
          <CategoryChip
            isSelected={selectedCategory === 'all'}
            label="All"
            onPress={(): void => {
              setSelectedCategory('all');
            }}
          />
          {categories.map((category: InventoryCategory): React.JSX.Element => {
            return (
              <CategoryChip
                key={category}
                isSelected={selectedCategory === category}
                label={formatLabel(category)}
                onPress={(): void => {
                  setSelectedCategory(category);
                }}
              />
            );
          })}
        </View>
      ) : null}

      {visibleItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No guest-visible items yet</Text>
          <Text style={styles.emptyCopy}>
            Use Manage Sharing to select categories and make sure items are marked shared or
            guest-visible.
          </Text>
        </View>
      ) : (
        groupedItems.map(([category, items]): React.JSX.Element => {
          return (
            <View key={category} style={styles.categorySection}>
              <Text style={styles.categorySectionTitle}>{formatLabel(category)}</Text>
              {items.map((item: GuestVisibleBarItem): React.JSX.Element => {
                return <GuestItemCard item={item} key={item.id} />;
              })}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

type CategoryChipProps = {
  isSelected: boolean;
  label: string;
  onPress: () => void;
};

function CategoryChip({ isSelected, label, onPress }: CategoryChipProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => {
        return [
          styles.categoryChip,
          isSelected ? styles.categoryChipActive : null,
          pressed ? styles.controlPressed : null,
        ];
      }}
    >
      <Text style={[styles.categoryChipText, isSelected ? styles.categoryChipTextActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

function GuestItemCard({ item }: { item: GuestVisibleBarItem }): React.JSX.Element {
  return (
    <View style={styles.itemCard}>
      <Text style={styles.itemName}>{item.name}</Text>
      <Text style={styles.itemMeta}>
        {[item.brand, item.subcategory, formatLabel(item.category)].filter(Boolean).join(' · ')}
      </Text>
      {item.publicNotes ? <Text style={styles.itemNotes}>{item.publicNotes}</Text> : null}
      {item.tags && item.tags.length > 0 ? (
        <Text style={styles.itemTags}>{item.tags.join(', ')}</Text>
      ) : null}
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
  categoryChip: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  categoryChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  categoryChipTextActive: {
    color: colors.background,
  },
  categorySection: {
    gap: 10,
  },
  categorySectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  container: {
    gap: 14,
    padding: 20,
  },
  controlPressed: {
    opacity: 0.75,
  },
  emptyCopy: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  itemCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  itemMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  itemName: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  itemNotes: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  itemTags: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  manageButton: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  manageButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  pageSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },
});

export default SharePreviewScreen;
