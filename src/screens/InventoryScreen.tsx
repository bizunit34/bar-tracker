import React, { useMemo } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import InventoryList from '../components/InventoryList';
import { useBarInventoryItems } from '../data/barInventoryStore';
import { colors } from '../theme/colors';
import { InventoryCategory, InventoryItem } from '../types/inventory';

type InventoryScreenProps = {
  onManageEquipment?: () => void;
};

function InventoryScreen({ onManageEquipment }: InventoryScreenProps): React.JSX.Element {
  const items = useBarInventoryItems();
  const visibleItems = useMemo((): Array<InventoryItem> => {
    return items.filter((item: InventoryItem): boolean => {
      return !item.isArchived;
    });
  }, [items]);

  const stats = useMemo(() => {
    const totalItems = visibleItems.length;
    const lowStockItems = visibleItems.filter((item: InventoryItem): boolean => {
      return item.quantity <= item.minStock;
    }).length;
    const stockedItems = totalItems - lowStockItems;
    const categories = Array.from(
      new Set(
        visibleItems.map((item: InventoryItem): string => {
          return item.category;
        }),
      ),
    ).length;

    return {
      totalItems,
      lowStockItems,
      stockedItems,
      categories,
    };
  }, [visibleItems]);
  const recentItems = useMemo((): Array<InventoryItem> => {
    return [...visibleItems]
      .sort((left: InventoryItem, right: InventoryItem): number => {
        return (
          parseDateValue(right.updatedAt ?? right.createdAt) -
          parseDateValue(left.updatedAt ?? left.createdAt)
        );
      })
      .slice(0, 3);
  }, [visibleItems]);
  const categoryCounts = useMemo((): Array<CategoryCount> => {
    const counts = new Map<InventoryCategory, number>();

    visibleItems.forEach((item: InventoryItem): void => {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    });

    return [...counts.entries()]
      .map(([category, count]): CategoryCount => {
        return { category, count };
      })
      .sort((left: CategoryCount, right: CategoryCount): number => {
        return formatLabel(left.category).localeCompare(formatLabel(right.category));
      });
  }, [visibleItems]);

  return (
    <InventoryList
      items={visibleItems}
      contentContainerStyle={styles.container}
      ListHeaderComponent={
        <InventoryHeader
          categoryCounts={categoryCounts}
          onManageEquipment={onManageEquipment}
          recentItems={recentItems}
          stats={stats}
        />
      }
    />
  );
}

type CategoryCount = {
  category: InventoryCategory;
  count: number;
};

type InventoryStats = {
  categories: number;
  lowStockItems: number;
  stockedItems: number;
  totalItems: number;
};

type InventoryHeaderProps = {
  categoryCounts: Array<CategoryCount>;
  onManageEquipment?: () => void;
  recentItems: Array<InventoryItem>;
  stats: InventoryStats;
};

function InventoryHeader({
  categoryCounts,
  onManageEquipment,
  recentItems,
  stats,
}: InventoryHeaderProps): React.JSX.Element {
  return (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Bar Tracker</Text>
        <Text style={styles.subtitle}>Keep every spirit, mixer, and garnish in check.</Text>
      </View>

      <View style={styles.statGrid}>
        <StatBlock label="Total items" value={stats.totalItems} />
        <StatBlock label="Stocked" value={stats.stockedItems} />
        <StatBlock label="Needs attention" value={stats.lowStockItems} tone="warning" />
        <StatBlock label="Categories" value={stats.categories} />
      </View>

      {onManageEquipment ? (
        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={onManageEquipment}
            style={({ pressed }): StyleProp<ViewStyle> => {
              return [styles.actionButton, pressed ? styles.actionButtonPressed : null];
            }}
          >
            <Text style={styles.actionButtonText}>Tools & Glassware</Text>
          </Pressable>
        </View>
      ) : null}

      {categoryCounts.length > 0 ? (
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Category Counts</Text>
          <View style={styles.categoryGrid}>
            {categoryCounts.map((categoryCount: CategoryCount): React.JSX.Element => {
              return (
                <View key={categoryCount.category} style={styles.categoryPill}>
                  <Text style={styles.categoryPillText}>
                    {formatLabel(categoryCount.category)} ({categoryCount.count})
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {recentItems.length > 0 ? (
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Recently Updated</Text>
          <View style={styles.recentList}>
            {recentItems.map((item: InventoryItem): React.JSX.Element => {
              return <RecentItem item={item} key={item.id} />;
            })}
          </View>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Inventory</Text>
    </>
  );
}

type StatBlockProps = {
  label: string;
  value: number;
  tone?: 'default' | 'warning';
};

function StatBlock({ label, value, tone = 'default' }: StatBlockProps): React.JSX.Element {
  const badgeStyle = tone === 'warning' ? styles.statBadgeWarning : styles.statBadgeDefault;

  return (
    <View style={styles.statCard}>
      <View style={[styles.statBadge, badgeStyle]}>
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function RecentItem({ item }: { item: InventoryItem }): React.JSX.Element {
  return (
    <View style={styles.recentItem}>
      <View style={styles.recentItemCopy}>
        <Text style={styles.recentItemName}>{item.name}</Text>
        <Text style={styles.recentItemMeta}>
          {[item.brand, formatLabel(item.category)].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text style={styles.recentItemStatus}>{formatLabel(item.visibility ?? 'private')}</Text>
    </View>
  );
}

function parseDateValue(value: string | undefined): number {
  const parsed = Date.parse(value ?? '');

  return Number.isFinite(parsed) ? parsed : 0;
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
  actionButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 8,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionButtonPressed: {
    opacity: 0.75,
  },
  actionButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    backgroundColor: colors.highlight,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  categoryPillText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  container: {
    backgroundColor: colors.background,
    flexGrow: 1,
    padding: 20,
  },
  header: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  recentItem: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  recentItemCopy: {
    flex: 1,
    gap: 3,
  },
  recentItemMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  recentItemName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  recentItemStatus: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 10,
  },
  recentList: {
    gap: 8,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 20,
  },
  statBadge: {
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    width: '100%',
  },
  statBadgeDefault: {
    backgroundColor: colors.highlight,
  },
  statBadgeWarning: {
    backgroundColor: colors.warning,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    width: '48%',
  },
  statGrid: {
    columnGap: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    rowGap: 12,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: 6,
  },
  summarySection: {
    gap: 10,
    marginTop: 18,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});

export default InventoryScreen;
