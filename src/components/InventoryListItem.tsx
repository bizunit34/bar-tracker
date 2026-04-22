import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { InventoryItem } from '../types/inventory';

type InventoryListItemProps = {
  item: InventoryItem;
};

function InventoryListItem({ item }: InventoryListItemProps): React.JSX.Element {
  const isLowStock = item.quantity <= item.minStock;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{item.name}</Text>
        <View
          style={[styles.badge, isLowStock ? styles.badgeWarning : styles.badgeOk]}
        >
          <Text style={styles.badgeText}>{isLowStock ? 'Restock' : 'Ready'}</Text>
        </View>
      </View>

      <Text style={styles.category}>{item.category.toUpperCase()}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>
          {item.quantity} {item.unit}
        </Text>
        <Text style={styles.meta}>Min: {item.minStock}</Text>
      </View>

      {item.notes ? (
        <Text style={styles.notes}>{item.notes}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  category: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 14
  },
  notes: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 10
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700'
  },
  badgeOk: {
    backgroundColor: colors.success
  },
  badgeWarning: {
    backgroundColor: colors.warning
  }
});

export default InventoryListItem;
