import Clipboard from '@react-native-clipboard/clipboard';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import {
  archiveBarInventoryItem,
  saveBarInventoryItem,
  useBarInventoryItems,
} from '../data/barInventoryStore';
import { useBarShareSettings } from '../data/barShareSettingsStore';
import { mapInventoryToGuestVisibleItems } from '../data/guestInventoryMapping';
import { useLocalShareLinks } from '../data/localShareLinkStore';
import { colors } from '../theme/colors';
import { InventoryCategory, InventoryItem } from '../types/inventory';
import { LocalShareLinkRecord } from '../types/shareLinks';

type InventoryScreenProps = {
  onAddItem: () => void;
  onEditItem: (itemId: string) => void;
  onImportExport: () => void;
  onManageEquipment: () => void;
  onManageSharing: () => void;
  onPreviewShare: () => void;
  onSelectCategory: (category: InventoryCategory) => void;
};

type CategoryCount = {
  category: InventoryCategory;
  count: number;
};

function InventoryScreen({
  onAddItem,
  onEditItem,
  onImportExport,
  onManageEquipment,
  onManageSharing,
  onPreviewShare,
  onSelectCategory,
}: InventoryScreenProps): React.JSX.Element {
  const items = useBarInventoryItems();
  const shareSettings = useBarShareSettings();
  const shareLinks = useLocalShareLinks();
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const activeItems = useMemo((): Array<InventoryItem> => {
    return items.filter((item: InventoryItem): boolean => {
      return !item.isArchived;
    });
  }, [items]);
  const guestVisibleItems = useMemo(() => {
    return mapInventoryToGuestVisibleItems(items, shareSettings);
  }, [items, shareSettings]);
  const latestShareLink = useMemo((): LocalShareLinkRecord | null => {
    return (
      shareLinks
        .filter((link: LocalShareLinkRecord): boolean => {
          return !link.disabledAt;
        })
        .sort((left: LocalShareLinkRecord, right: LocalShareLinkRecord): number => {
          return parseDateValue(right.updatedAt) - parseDateValue(left.updatedAt);
        })[0] ?? null
    );
  }, [shareLinks]);
  const categoryCounts = useMemo((): Array<CategoryCount> => {
    const counts = new Map<InventoryCategory, number>();

    activeItems.forEach((item: InventoryItem): void => {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    });

    return [...counts.entries()]
      .map(([category, count]): CategoryCount => {
        return { category, count };
      })
      .sort((left: CategoryCount, right: CategoryCount): number => {
        return formatLabel(left.category).localeCompare(formatLabel(right.category));
      });
  }, [activeItems]);
  const recentItems = useMemo((): Array<InventoryItem> => {
    return [...activeItems]
      .sort((left: InventoryItem, right: InventoryItem): number => {
        return (
          parseDateValue(right.updatedAt ?? right.createdAt) -
          parseDateValue(left.updatedAt ?? left.createdAt)
        );
      })
      .slice(0, 4);
  }, [activeItems]);
  const stats = useMemo(() => {
    const spirits = activeItems.filter((item: InventoryItem): boolean => {
      return item.category === 'spirit' || item.category === 'liqueur';
    }).length;
    const mixersAndGarnishes = activeItems.filter((item: InventoryItem): boolean => {
      return ['mixer', 'bitters', 'syrup', 'juice', 'garnish'].includes(item.category);
    }).length;
    const equipment = activeItems.filter((item: InventoryItem): boolean => {
      return item.category === 'tool' || item.category === 'glassware';
    }).length;

    return {
      equipment,
      guestVisible: guestVisibleItems.length,
      mixersAndGarnishes,
      spirits,
      total: activeItems.length,
    };
  }, [activeItems, guestVisibleItems.length]);

  const copyLatestLink = (): void => {
    if (!latestShareLink) {
      return;
    }

    Clipboard.setString(latestShareLink.shareUrl);
    setCopyMessage('Latest link copied.');
  };

  const toggleOpen = (item: InventoryItem): void => {
    saveBarInventoryItem({
      ...item,
      isOpen: !item.isOpen,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Home Bar Command Center</Text>
        <Text style={styles.subtitle}>
          Track stock, prep your guest view, and jump into common tasks.
        </Text>
      </View>

      {activeItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Set up your bar</Text>
          <Text style={styles.emptyCopy}>
            Add your first bottle, import an existing list, or start with tools and glassware.
          </Text>
          <View style={styles.actionGrid}>
            <ActionCard label="Add First Item" onPress={onAddItem} />
            <ActionCard label="Import Inventory" onPress={onImportExport} />
            <ActionCard label="Tools & Glassware" onPress={onManageEquipment} />
          </View>
        </View>
      ) : null}

      <View style={styles.actionGrid}>
        <ActionCard label="Add Item" onPress={onAddItem} />
        <ActionCard label="Share My Bar" onPress={onPreviewShare} />
        <ActionCard label="Tools & Glassware" onPress={onManageEquipment} />
        <ActionCard label="Import / Export" onPress={onImportExport} />
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Active Items" value={stats.total} />
        <StatCard label="Spirits" value={stats.spirits} />
        <StatCard label="Mixers & Garnish" value={stats.mixersAndGarnishes} />
        <StatCard label="Tools & Glassware" value={stats.equipment} />
        <StatCard label="Guest Visible" value={stats.guestVisible} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Guest Sharing</Text>
          <Text style={styles.statusText}>{stats.guestVisible} item(s)</Text>
        </View>
        <Text style={styles.helperText}>
          {shareSettings.title} {latestShareLink ? `· Latest link: ${latestShareLink.title}` : ''}
        </Text>
        <View style={styles.actionRow}>
          <SmallButton label="Preview Guest View" onPress={onPreviewShare} />
          <SmallButton label="Manage Sharing" onPress={onManageSharing} />
          {latestShareLink ? (
            <SmallButton label="Copy Latest Link" onPress={copyLatestLink} />
          ) : null}
        </View>
        {copyMessage ? <Text style={styles.successText}>{copyMessage}</Text> : null}
      </View>

      {recentItems.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Updated</Text>
          <View style={styles.recentList}>
            {recentItems.map((item: InventoryItem): React.JSX.Element => {
              return (
                <RecentItem
                  item={item}
                  key={item.id}
                  onArchive={(): void => {
                    archiveBarInventoryItem(item.id);
                  }}
                  onEdit={(): void => {
                    onEditItem(item.id);
                  }}
                  onToggleOpen={(): void => {
                    toggleOpen(item);
                  }}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {categoryCounts.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Counts</Text>
          <View style={styles.categoryGrid}>
            {categoryCounts.map((categoryCount: CategoryCount): React.JSX.Element => {
              return (
                <Pressable
                  accessibilityRole="button"
                  key={categoryCount.category}
                  onPress={(): void => {
                    onSelectCategory(categoryCount.category);
                  }}
                  style={({ pressed }): StyleProp<ViewStyle> => {
                    return [styles.categoryPill, pressed ? styles.pressed : null];
                  }}
                >
                  <Text style={styles.categoryPillText}>
                    {formatLabel(categoryCount.category)} ({categoryCount.count})
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function ActionCard({ label, onPress }: { label: string; onPress: () => void }): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => {
        return [styles.actionCard, pressed ? styles.pressed : null];
      }}
    >
      <Text style={styles.actionCardText}>{label}</Text>
    </Pressable>
  );
}

function StatCard({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SmallButton({
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
        return [styles.smallButton, pressed ? styles.pressed : null];
      }}
    >
      <Text style={styles.smallButtonText}>{label}</Text>
    </Pressable>
  );
}

function RecentItem({
  item,
  onArchive,
  onEdit,
  onToggleOpen,
}: {
  item: InventoryItem;
  onArchive: () => void;
  onEdit: () => void;
  onToggleOpen: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.recentItem}>
      <View style={styles.recentItemCopy}>
        <Text style={styles.recentItemName}>{item.name}</Text>
        <Text style={styles.recentItemMeta}>
          {[item.brand, formatLabel(item.category), formatLabel(item.visibility ?? 'private')]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
      <View style={styles.recentActions}>
        <SmallButton label={item.isOpen ? 'Unopen' : 'Open'} onPress={onToggleOpen} />
        <SmallButton label="Edit" onPress={onEdit} />
        <SmallButton label="Archive" onPress={onArchive} />
      </View>
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
  actionCard: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    width: '48%',
  },
  actionCardText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '900',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
    gap: 16,
    padding: 20,
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
    gap: 12,
    padding: 16,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  header: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.75,
  },
  recentActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-end',
  },
  recentItem: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  recentItemCopy: {
    gap: 3,
  },
  recentItemMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  recentItemName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  recentList: {
    gap: 8,
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  smallButton: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  smallButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  statCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    width: '31%',
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
  },
  successText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '800',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
  },
});

export default InventoryScreen;
