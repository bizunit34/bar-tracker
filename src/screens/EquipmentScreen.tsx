import React, { useMemo, useState } from 'react';
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

import {
  AvailableBarTool,
  AvailableGlassware,
  ensureGlasswareItem,
  ensureToolItem,
  listAvailableGlassware,
  listAvailableTools,
} from '../data/barEquipment';
import {
  archiveBarInventoryItem,
  refreshBarInventoryItems,
  useBarInventoryItems,
} from '../data/barInventoryStore';
import { colors } from '../theme/colors';

type EquipmentMode = 'tools' | 'glassware';

type EquipmentRow = AvailableBarTool | AvailableGlassware;

function EquipmentScreen(): React.JSX.Element {
  const inventoryItems = useBarInventoryItems();
  const [mode, setMode] = useState<EquipmentMode>('tools');
  const [customName, setCustomName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState<string | null>(null);

  const tools = useMemo((): Array<AvailableBarTool> => {
    return listAvailableTools(inventoryItems);
  }, [inventoryItems]);

  const glassware = useMemo((): Array<AvailableGlassware> => {
    return listAvailableGlassware(inventoryItems);
  }, [inventoryItems]);

  const rows = mode === 'tools' ? tools : glassware;
  const availableCount = rows.filter((row: EquipmentRow): boolean => {
    return row.available;
  }).length;

  const enableEquipment = async (name: string): Promise<void> => {
    setPendingName(name);

    try {
      if (mode === 'tools') {
        await ensureToolItem(name);
      } else {
        await ensureGlasswareItem(name);
      }

      await refreshBarInventoryItems();
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update equipment.');
    } finally {
      setPendingName(null);
    }
  };

  const disableEquipment = async (row: EquipmentRow): Promise<void> => {
    setPendingName(row.name);
    archiveBarInventoryItem(row.id);
    await refreshBarInventoryItems();
    setPendingName(null);
  };

  const toggleEquipment = (row: EquipmentRow): void => {
    if (row.available) {
      disableEquipment(row).catch((error: unknown): void => {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to archive equipment.');
        setPendingName(null);
      });

      return;
    }

    enableEquipment(row.name).catch((error: unknown): void => {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update equipment.');
      setPendingName(null);
    });
  };

  const addCustomEquipment = (): void => {
    const name = customName.trim();

    if (!name) {
      setErrorMessage('Enter a name first.');

      return;
    }

    enableEquipment(name)
      .then((): void => {
        setCustomName('');
      })
      .catch((error: unknown): void => {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to add equipment.');
      });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tools & Glassware</Text>
        <Text style={styles.subtitle}>
          Track the equipment your bar can use without filling inventory until you mark it owned.
        </Text>
        <Text style={styles.subtitle}>
          Tools and glassware help future recipe suggestions and guest planning.
        </Text>
      </View>

      <View style={styles.segmentedControl}>
        <SegmentButton
          isActive={mode === 'tools'}
          label="Tools"
          onPress={(): void => {
            setMode('tools');
            setErrorMessage(null);
          }}
        />
        <SegmentButton
          isActive={mode === 'glassware'}
          label="Glassware"
          onPress={(): void => {
            setMode('glassware');
            setErrorMessage(null);
          }}
        />
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryValue}>{availableCount}</Text>
        <Text style={styles.summaryText}>
          {mode === 'tools' ? 'available bar tool(s)' : 'available glassware item(s)'}
        </Text>
      </View>

      <View style={styles.customRow}>
        <TextInput
          autoCapitalize="words"
          onChangeText={setCustomName}
          placeholder={mode === 'tools' ? 'Add custom tool' : 'Add custom glassware'}
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          value={customName}
        />
        <Pressable
          accessibilityLabel={mode === 'tools' ? 'Add custom tool' : 'Add custom glassware'}
          accessibilityRole="button"
          onPress={addCustomEquipment}
          style={({ pressed }): StyleProp<ViewStyle> => {
            return [styles.addButton, pressed ? styles.pressed : null];
          }}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <View style={styles.list}>
        {rows.map((row: EquipmentRow): React.JSX.Element => {
          const isPending = pendingName === row.name;

          return (
            <EquipmentOption
              isPending={isPending}
              key={row.normalizedName}
              row={row}
              onToggle={(): void => {
                toggleEquipment(row);
              }}
            />
          );
        })}
      </View>
    </ScrollView>
  );
}

type SegmentButtonProps = {
  isActive: boolean;
  label: string;
  onPress: () => void;
};

function SegmentButton({ isActive, label, onPress }: SegmentButtonProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => {
        return [
          styles.segmentButton,
          isActive ? styles.segmentButtonActive : null,
          pressed ? styles.pressed : null,
        ];
      }}
    >
      <Text style={[styles.segmentButtonText, isActive ? styles.segmentButtonTextActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

type EquipmentOptionProps = {
  isPending: boolean;
  onToggle: () => void;
  row: EquipmentRow;
};

function EquipmentOption({ isPending, onToggle, row }: EquipmentOptionProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityLabel={`${row.available ? 'Archive' : 'Add'} ${row.name}`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: row.available, disabled: isPending }}
      disabled={isPending}
      onPress={onToggle}
      style={({ pressed }): StyleProp<ViewStyle> => {
        return [
          styles.option,
          row.available ? styles.optionAvailable : null,
          pressed ? styles.pressed : null,
        ];
      }}
    >
      <View style={[styles.checkbox, row.available ? styles.checkboxSelected : null]}>
        <Text style={styles.checkboxText}>{row.available ? 'x' : ''}</Text>
      </View>
      <View style={styles.optionTextGroup}>
        <Text style={styles.optionTitle}>{row.name}</Text>
        <Text style={styles.optionMeta}>
          {isPending ? 'Updating' : row.available ? 'Available' : 'Not in inventory'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
  },
  addButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '800',
  },
  checkbox: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  checkboxSelected: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkboxText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '900',
  },
  container: {
    backgroundColor: colors.background,
    flexGrow: 1,
    padding: 20,
  },
  customRow: {
    columnGap: 10,
    flexDirection: 'row',
    marginTop: 16,
  },
  errorText: {
    color: colors.dangerText,
    fontSize: 14,
    marginTop: 12,
  },
  header: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.textPrimary,
    flex: 1,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  list: {
    marginTop: 16,
    rowGap: 10,
  },
  option: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    columnGap: 12,
    flexDirection: 'row',
    padding: 14,
  },
  optionAvailable: {
    borderColor: colors.success,
  },
  optionMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  optionTextGroup: {
    flex: 1,
  },
  optionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    paddingVertical: 10,
  },
  segmentButtonActive: {
    backgroundColor: colors.highlight,
  },
  segmentButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  segmentButtonTextActive: {
    color: colors.textPrimary,
  },
  segmentedControl: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    columnGap: 8,
    flexDirection: 'row',
    marginTop: 16,
    padding: 6,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
  },
  summaryRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    columnGap: 10,
    flexDirection: 'row',
    marginTop: 16,
    padding: 14,
  },
  summaryText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 14,
  },
  summaryValue: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: '900',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
  },
});

export default EquipmentScreen;
