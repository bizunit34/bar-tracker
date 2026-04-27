import React, { useCallback } from 'react';
import {
  FlatList,
  ListRenderItemInfo,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { colors } from '../theme/colors';
import { InventoryItem } from '../types/inventory';
import InventoryListItem from './InventoryListItem';

type InventoryListProps = {
  contentContainerStyle?: StyleProp<ViewStyle>;
  items: Array<InventoryItem>;
  ListHeaderComponent?: React.ReactElement;
};

function InventoryList({
  contentContainerStyle,
  items,
  ListHeaderComponent,
}: InventoryListProps): React.JSX.Element {
  const renderItem = useCallback((info: ListRenderItemInfo<InventoryItem>): React.JSX.Element => {
    return <InventoryListItem item={info.item} />;
  }, []);

  const keyExtractor = useCallback((item: InventoryItem): string => {
    return item.id;
  }, []);

  const renderEmpty = useCallback((): React.JSX.Element => {
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
      contentContainerStyle={[styles.listContent, contentContainerStyle]}
      ItemSeparatorComponent={ItemSeparator}
      ListEmptyComponent={renderEmpty}
      ListHeaderComponent={ListHeaderComponent}
    />
  );
}

function ItemSeparator(): React.JSX.Element {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  emptyCopy: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  separator: {
    height: 12,
  },
});

export default InventoryList;
