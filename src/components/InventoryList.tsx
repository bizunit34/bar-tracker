import React from 'react';
import {
  FlatList,
  ListRenderItemInfo,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { colors } from '../theme/colors';
import { InventoryItem } from '../types/inventory';

import InventoryListItem from './InventoryListItem';

type InventoryListProps = {
  items: Array<InventoryItem>;
};

function InventoryList({ items }: InventoryListProps): React.JSX.Element {
  const renderItem = React.useCallback(
    (info: ListRenderItemInfo<InventoryItem>): React.JSX.Element => {
      return <InventoryListItem item={info.item} />;
    },
    []
  );

  const keyExtractor = React.useCallback((item: InventoryItem): string => {
    return item.id;
  }, []);

  const renderEmpty = React.useCallback((): React.JSX.Element => {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Nothing tracked yet</Text>
        <Text style={styles.emptyCopy}>
          Add bottles, mixers, and garnish to keep your bar in sync.
        </Text>
      </View>
    );
  }, []);

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={ItemSeparator}
      ListEmptyComponent={renderEmpty}
    />
  );
}

function ItemSeparator(): React.JSX.Element {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  listContent: {
    gap: 12,
    paddingBottom: 24
  },
  separator: {
    height: 12
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 24
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700'
  },
  emptyCopy: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center'
  }
});

export default InventoryList;
