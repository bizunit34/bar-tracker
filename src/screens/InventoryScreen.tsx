import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import InventoryList from '../components/InventoryList';
import { sampleInventory } from '../data/sampleInventory';
import { colors } from '../theme/colors';
import { InventoryItem } from '../types/inventory';

function InventoryScreen(): React.JSX.Element {
  const [items] = React.useState<Array<InventoryItem>>(sampleInventory);

  const stats = React.useMemo(() => {
    const totalItems = items.length;
    const lowStockItems = items.filter((item: InventoryItem): boolean => {
      return item.quantity <= item.minStock;
    }).length;
    const stockedItems = totalItems - lowStockItems;
    const categories = Array.from(
      new Set(
        items.map((item: InventoryItem): string => {
          return item.category;
        })
      )
    ).length;

    return {
      totalItems,
      lowStockItems,
      stockedItems,
      categories
    };
  }, [items]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bar Tracker</Text>
        <Text style={styles.subtitle}>
          Keep every spirit, mixer, and garnish in check.
        </Text>
      </View>

      <View style={styles.statGrid}>
        <StatBlock label="Total items" value={stats.totalItems} />
        <StatBlock label="Stocked" value={stats.stockedItems} />
        <StatBlock
          label="Needs attention"
          value={stats.lowStockItems}
          tone="warning"
        />
        <StatBlock label="Categories" value={stats.categories} />
      </View>

      <Text style={styles.sectionTitle}>Inventory</Text>
      <InventoryList items={items} />
    </ScrollView>
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flexGrow: 1,
    padding: 20
  },
  header: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.4
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: 6
  },
  statGrid: {
    columnGap: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    rowGap: 12
  },
  statCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    width: '48%'
  },
  statBadge: {
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    width: '100%'
  },
  statBadgeDefault: {
    backgroundColor: colors.highlight
  },
  statBadgeWarning: {
    backgroundColor: colors.warning
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center'
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center'
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12
  }
});

export default InventoryScreen;
