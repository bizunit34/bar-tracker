import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { useBarInventoryItems } from '../data/barInventoryStore';
import { useBarShareSettings } from '../data/barShareSettingsStore';
import { mapInventoryToGuestVisibleItems } from '../data/guestInventoryMapping';
import {
  createShareLink,
  CreateShareLinkResult,
  disableShareLink,
} from '../services/shareLinkService';
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
  const [shareLink, setShareLink] = useState<CreateShareLinkResult | null>(null);
  const [shareLinkError, setShareLinkError] = useState<string | null>(null);
  const [isCreatingShareLink, setIsCreatingShareLink] = useState<boolean>(false);
  const [isDisablingShareLink, setIsDisablingShareLink] = useState<boolean>(false);
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

  const createPublicShareLink = async (): Promise<void> => {
    const title = shareSettings.title.trim();

    if (!title) {
      setShareLinkError('Add a share title before creating a link.');

      return;
    }

    if (guestItems.length === 0) {
      setShareLinkError('Add at least one guest-visible item before creating a link.');

      return;
    }

    setIsCreatingShareLink(true);
    setShareLinkError(null);

    try {
      const result = await createShareLink({
        description: shareSettings.description?.trim() || null,
        items: guestItems,
        title,
      });

      setShareLink(result);
    } catch (error) {
      setShareLinkError(
        error instanceof Error ? error.message : 'Could not create the share link.',
      );
    } finally {
      setIsCreatingShareLink(false);
    }
  };

  const sharePublicLink = async (): Promise<void> => {
    if (!shareLink) {
      return;
    }

    await Share.share({
      message: shareLink.shareUrl,
      url: shareLink.shareUrl,
    });
  };

  const disablePublicShareLink = async (): Promise<void> => {
    if (!shareLink) {
      return;
    }

    setIsDisablingShareLink(true);
    setShareLinkError(null);

    try {
      await disableShareLink(shareLink.snapshot.slug);
      setShareLink(null);
    } catch (error) {
      setShareLinkError(
        error instanceof Error ? error.message : 'Could not disable the share link.',
      );
    } finally {
      setIsDisablingShareLink(false);
    }
  };

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

      <View style={styles.linkPanel}>
        <View style={styles.linkPanelCopy}>
          <Text style={styles.linkPanelTitle}>Public share link</Text>
          <Text style={styles.pageSubtitle}>
            Creates a guest-safe link from this sanitized preview only.
          </Text>
        </View>
        {shareLink ? (
          <View style={styles.linkResult}>
            <Text selectable style={styles.linkText}>
              {shareLink.shareUrl}
            </Text>
            <View style={styles.linkActions}>
              <Pressable
                accessibilityRole="button"
                onPress={(): void => {
                  sharePublicLink().catch((error: unknown): void => {
                    setShareLinkError(
                      error instanceof Error ? error.message : 'Could not share the link.',
                    );
                  });
                }}
                style={({ pressed }): StyleProp<ViewStyle> => {
                  return [styles.secondaryButton, pressed ? styles.controlPressed : null];
                }}
              >
                <Text style={styles.secondaryButtonText}>Share</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isDisablingShareLink}
                onPress={(): void => {
                  disablePublicShareLink().catch((error: unknown): void => {
                    setShareLinkError(
                      error instanceof Error ? error.message : 'Could not disable the share link.',
                    );
                  });
                }}
                style={({ pressed }): StyleProp<ViewStyle> => {
                  return [
                    styles.dangerButton,
                    pressed ? styles.controlPressed : null,
                    isDisablingShareLink ? styles.disabledButton : null,
                  ];
                }}
              >
                <Text style={styles.dangerButtonText}>
                  {isDisablingShareLink ? 'Disabling...' : 'Disable'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={isCreatingShareLink || guestItems.length === 0}
            onPress={(): void => {
              createPublicShareLink().catch((error: unknown): void => {
                setShareLinkError(
                  error instanceof Error ? error.message : 'Could not create the share link.',
                );
              });
            }}
            style={({ pressed }): StyleProp<ViewStyle> => {
              return [
                styles.primaryButton,
                pressed ? styles.controlPressed : null,
                isCreatingShareLink || guestItems.length === 0 ? styles.disabledButton : null,
              ];
            }}
          >
            <Text style={styles.primaryButtonText}>
              {isCreatingShareLink ? 'Creating...' : 'Create Share Link'}
            </Text>
          </Pressable>
        )}
        {shareLinkError ? <Text style={styles.errorText}>{shareLinkError}</Text> : null}
      </View>

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
  dangerButton: {
    alignItems: 'center',
    borderColor: colors.dangerBorder,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  dangerButtonText: {
    color: colors.dangerText,
    fontSize: 13,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.55,
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
  errorText: {
    color: colors.dangerText,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
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
  linkActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  linkPanel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  linkPanelCopy: {
    gap: 4,
  },
  linkPanelTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  linkResult: {
    gap: 10,
  },
  linkText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
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
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
});

export default SharePreviewScreen;
