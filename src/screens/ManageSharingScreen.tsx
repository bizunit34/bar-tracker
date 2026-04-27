import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

import { useBarInventoryItems } from '../data/barInventoryStore';
import {
  createDefaultShareSettings,
  resetBarShareSettings,
  saveBarShareSettings,
  useBarShareSettings,
} from '../data/barShareSettingsStore';
import { colors } from '../theme/colors';
import { InventoryCategory, InventoryItem } from '../types/inventory';
import { BarShareSettings } from '../types/sharing';

type ManageSharingScreenProps = {
  onPreview: () => void;
};

function ManageSharingScreen({ onPreview }: ManageSharingScreenProps): React.JSX.Element {
  const inventoryItems = useBarInventoryItems();
  const shareSettings = useBarShareSettings();
  const [draftSettings, setDraftSettings] = useState<BarShareSettings>(shareSettings);

  useEffect((): void => {
    setDraftSettings(shareSettings);
  }, [shareSettings]);
  const activeItems = useMemo((): Array<InventoryItem> => {
    return inventoryItems.filter((item: InventoryItem): boolean => {
      return !item.isArchived;
    });
  }, [inventoryItems]);
  const shareableItems = useMemo((): Array<InventoryItem> => {
    return activeItems.filter((item: InventoryItem): boolean => {
      return item.visibility === 'shared' || item.visibility === 'guest_visible';
    });
  }, [activeItems]);
  const availableCategories = useMemo((): Array<InventoryCategory> => {
    return Array.from(
      new Set(
        activeItems.map((item: InventoryItem): InventoryCategory => {
          return item.category;
        }),
      ),
    ).sort((left: InventoryCategory, right: InventoryCategory): number => {
      return formatLabel(left).localeCompare(formatLabel(right));
    });
  }, [activeItems]);

  const updateDraftSettings = (partialSettings: Partial<BarShareSettings>): void => {
    setDraftSettings((currentSettings: BarShareSettings): BarShareSettings => {
      return {
        ...currentSettings,
        ...partialSettings,
      };
    });
  };

  const toggleCategory = (category: InventoryCategory): void => {
    updateDraftSettings({
      includedCategories: draftSettings.includedCategories.includes(category)
        ? draftSettings.includedCategories.filter((currentCategory: InventoryCategory): boolean => {
            return currentCategory !== category;
          })
        : [...draftSettings.includedCategories, category],
    });
  };

  const toggleExcludedItem = (itemId: string): void => {
    updateDraftSettings({
      excludedItemIds: draftSettings.excludedItemIds.includes(itemId)
        ? draftSettings.excludedItemIds.filter((currentItemId: string): boolean => {
            return currentItemId !== itemId;
          })
        : [...draftSettings.excludedItemIds, itemId],
    });
  };

  const saveSettings = (): void => {
    saveBarShareSettings(draftSettings);
  };

  const resetSettings = (): void => {
    const nextSettings = createDefaultShareSettings(inventoryItems);

    resetBarShareSettings(inventoryItems);
    setDraftSettings(nextSettings);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Manage Sharing</Text>
      <Text style={styles.pageSubtitle}>
        Configure the local guest preview. This does not create a public link.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Share details</Text>
        <Text style={styles.formLabel}>Title</Text>
        <TextInput
          onChangeText={(title: string): void => {
            updateDraftSettings({ title });
          }}
          placeholder="My Bar"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          value={draftSettings.title}
        />
        <Text style={styles.formLabel}>Description</Text>
        <TextInput
          multiline
          onChangeText={(description: string): void => {
            updateDraftSettings({ description });
          }}
          placeholder="Optional guest-safe description"
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, styles.textArea]}
          value={draftSettings.description ?? ''}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Visibility</Text>
        <View style={styles.optionRow}>
          <ToggleChip
            isSelected={draftSettings.visibilityMode === 'guest_preview'}
            label="Guest preview"
            onPress={(): void => {
              updateDraftSettings({ visibilityMode: 'guest_preview' });
            }}
          />
          <ToggleChip
            isSelected={draftSettings.visibilityMode === 'private'}
            label="Private"
            onPress={(): void => {
              updateDraftSettings({ visibilityMode: 'private' });
            }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Included categories</Text>
        <Text style={styles.helperText}>Only active items are considered.</Text>
        <View style={styles.optionRow}>
          {availableCategories.map((category: InventoryCategory): React.JSX.Element => {
            return (
              <ToggleChip
                key={category}
                isSelected={draftSettings.includedCategories.includes(category)}
                label={formatLabel(category)}
                onPress={(): void => {
                  toggleCategory(category);
                }}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Guest fields</Text>
        <ToggleRow
          isSelected={draftSettings.includeBrand}
          label="Include brand"
          onPress={(): void => {
            updateDraftSettings({ includeBrand: !draftSettings.includeBrand });
          }}
        />
        <ToggleRow
          isSelected={draftSettings.includeTags}
          label="Include tags"
          onPress={(): void => {
            updateDraftSettings({ includeTags: !draftSettings.includeTags });
          }}
        />
        <ToggleRow
          isSelected={draftSettings.includePublicNotes}
          label="Include public notes"
          onPress={(): void => {
            updateDraftSettings({ includePublicNotes: !draftSettings.includePublicNotes });
          }}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Excluded items</Text>
        <Text style={styles.helperText}>
          Only active items marked shared or guest-visible can appear here.
        </Text>
        {shareableItems.length === 0 ? (
          <Text style={styles.emptyText}>No shareable items yet.</Text>
        ) : (
          shareableItems.map((item: InventoryItem): React.JSX.Element => {
            return (
              <ToggleRow
                key={item.id}
                isSelected={!draftSettings.excludedItemIds.includes(item.id)}
                label={item.name}
                meta={[item.brand, item.productType ?? formatLabel(item.category)]
                  .filter(Boolean)
                  .join(' · ')}
                onPress={(): void => {
                  toggleExcludedItem(item.id);
                }}
              />
            );
          })
        )}
      </View>

      <View style={styles.footerActions}>
        <Pressable
          accessibilityRole="button"
          onPress={resetSettings}
          style={({ pressed }): StyleProp<ViewStyle> => {
            return [styles.secondaryButton, pressed ? styles.controlPressed : null];
          }}
        >
          <Text style={styles.secondaryButtonText}>Reset</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={saveSettings}
          style={({ pressed }): StyleProp<ViewStyle> => {
            return [styles.secondaryButton, pressed ? styles.controlPressed : null];
          }}
        >
          <Text style={styles.secondaryButtonText}>Save</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={(): void => {
            saveSettings();
            onPreview();
          }}
          style={({ pressed }): StyleProp<ViewStyle> => {
            return [styles.primaryButton, pressed ? styles.controlPressed : null];
          }}
        >
          <Text style={styles.primaryButtonText}>Preview</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

type ToggleChipProps = {
  isSelected: boolean;
  label: string;
  onPress: () => void;
};

function ToggleChip({ isSelected, label, onPress }: ToggleChipProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => {
        return [
          styles.chip,
          isSelected ? styles.chipActive : null,
          pressed ? styles.controlPressed : null,
        ];
      }}
    >
      <Text style={[styles.chipText, isSelected ? styles.chipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

type ToggleRowProps = {
  isSelected: boolean;
  label: string;
  meta?: string;
  onPress: () => void;
};

function ToggleRow({ isSelected, label, meta, onPress }: ToggleRowProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => {
        return [styles.toggleRow, pressed ? styles.controlPressed : null];
      }}
    >
      <View style={[styles.checkbox, isSelected ? styles.checkboxSelected : null]}>
        <Text style={styles.checkboxText}>{isSelected ? 'x' : ''}</Text>
      </View>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {meta ? <Text style={styles.toggleMeta}>{meta}</Text> : null}
      </View>
    </Pressable>
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
  checkbox: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 4,
    borderWidth: 1,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  checkboxSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkboxText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '800',
  },
  chip: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.background,
  },
  container: {
    gap: 14,
    padding: 20,
  },
  controlPressed: {
    opacity: 0.75,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  footerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-end',
  },
  formLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 15,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  section: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  toggleCopy: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  toggleMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 40,
  },
});

export default ManageSharingScreen;
