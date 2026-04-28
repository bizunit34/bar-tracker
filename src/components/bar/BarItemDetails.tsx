import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';
import { InventoryHolding, InventoryItem } from '../../types/inventory';

type BarItemDetailsProps = {
  item: InventoryItem;
};

function BarItemDetails({ item }: BarItemDetailsProps): React.JSX.Element {
  return (
    <View style={styles.details}>
      <DetailLine label="Stock" value={`${item.quantity} ${item.unit} available`} />
      {item.brand ? <DetailLine label="Brand" value={item.brand} /> : null}
      {item.subcategory ? <DetailLine label="Subcategory" value={item.subcategory} /> : null}
      {item.size ? <DetailLine label="Size" value={item.size} /> : null}
      {item.proof !== null && item.proof !== undefined ? (
        <DetailLine label="Proof" value={`${item.proof}`} />
      ) : null}
      <DetailLine label="Open" value={item.isOpen ? 'Yes' : 'No'} />
      {item.tags && item.tags.length > 0 ? (
        <DetailLine label="Tags" value={item.tags.join(', ')} />
      ) : null}
      {item.holdings?.map((holding: InventoryHolding): React.JSX.Element => {
        return (
          <DetailLine
            key={holding.id}
            label={holding.label}
            value={`${holding.amount} ${item.unit}`}
          />
        );
      })}
      {item.abv !== undefined ? <DetailLine label="ABV" value={`${item.abv}%`} /> : null}
      {item.description ? <DetailBlock label="Description" value={item.description} /> : null}
      {item.ratingComments ? (
        <DetailBlock label="Rating notes" value={item.ratingComments} />
      ) : null}
      {item.notes ? <DetailBlock label="Private notes" value={item.notes} /> : null}
      {item.publicNotes ? (
        <DetailBlock label="Guest-facing notes" value={item.publicNotes} />
      ) : null}
    </View>
  );
}

function DetailLine({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailCopy}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  detailBlock: {
    marginTop: spacing.md,
  },
  detailCopy: {
    color: colors.textSecondary,
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
  detailLabel: {
    color: colors.accent,
    ...typography.label,
  },
  detailLine: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailValue: {
    color: colors.textPrimary,
    ...typography.bodySmall,
    fontWeight: '700',
  },
  details: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
});

export default BarItemDetails;
