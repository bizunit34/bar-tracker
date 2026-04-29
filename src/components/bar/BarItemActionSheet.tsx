import React from 'react';
import { Modal, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, radii, shadows, spacing, typography } from '../../theme';
import { InventoryItem } from '../../types/inventory';
import Icon, { BarIconName } from './Icon';

export type BarItemActionHandlers = {
  onArchive: (itemId: string) => void;
  onDuplicate: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
  onRemove: (item: InventoryItem) => void;
  onRestore: (itemId: string) => void;
  onToggleOpen: (item: InventoryItem) => void;
  onToggleVisibility: (item: InventoryItem) => void;
};

type BarItemActionSheetProps = BarItemActionHandlers & {
  item: InventoryItem | null;
  onClose: () => void;
};

function BarItemActionSheet({
  item,
  onArchive,
  onClose,
  onDuplicate,
  onEdit,
  onRemove,
  onRestore,
  onToggleOpen,
  onToggleVisibility,
}: BarItemActionSheetProps): React.JSX.Element {
  const runAction = (action: () => void): void => {
    action();
    onClose();
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={item !== null}>
      <Pressable
        accessibilityLabel="Close item actions"
        accessibilityRole="button"
        onPress={onClose}
        style={styles.backdrop}
      >
        <Pressable style={styles.sheet}>
          {item ? (
            <>
              <View style={styles.header}>
                <View>
                  <Text style={styles.title}>{item.name}</Text>
                  <Text style={styles.subtitle}>Choose an action</Text>
                </View>
                <Pressable
                  accessibilityLabel="Close item actions"
                  accessibilityRole="button"
                  onPress={onClose}
                  style={({ pressed }): StyleProp<ViewStyle> => {
                    return [styles.closeButton, pressed ? styles.pressed : null];
                  }}
                >
                  <Icon name="close" />
                </Pressable>
              </View>

              {item.isArchived ? (
                <ActionRow
                  icon="restore"
                  label="Restore"
                  onPress={(): void => {
                    runAction((): void => {
                      onRestore(item.id);
                    });
                  }}
                />
              ) : (
                <ActionRow
                  icon="edit"
                  label="Edit"
                  onPress={(): void => {
                    runAction((): void => {
                      onEdit(item);
                    });
                  }}
                />
              )}
              <ActionRow
                icon="duplicate"
                label="Duplicate"
                onPress={(): void => {
                  runAction((): void => {
                    onDuplicate(item);
                  });
                }}
              />
              <ActionRow
                icon={item.isOpen ? 'stockIn' : 'stockLow'}
                label={item.isOpen ? 'Mark unopened' : 'Mark open'}
                onPress={(): void => {
                  runAction((): void => {
                    onToggleOpen(item);
                  });
                }}
              />
              <ActionRow
                icon="shared"
                label="Change visibility"
                onPress={(): void => {
                  runAction((): void => {
                    onToggleVisibility(item);
                  });
                }}
              />
              {item.isArchived ? null : (
                <ActionRow
                  icon="archive"
                  label="Archive"
                  onPress={(): void => {
                    runAction((): void => {
                      onArchive(item.id);
                    });
                  }}
                />
              )}
              <ActionRow
                destructive
                icon="trash"
                accessibilityLabel={`Delete ${item.name} permanently`}
                label="Delete"
                onPress={(): void => {
                  runAction((): void => {
                    onRemove(item);
                  });
                }}
              />
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ActionRow({
  destructive = false,
  icon,
  accessibilityLabel,
  label,
  onPress,
}: {
  accessibilityLabel?: string;
  destructive?: boolean;
  icon: BarIconName;
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => {
        return [styles.actionRow, pressed ? styles.pressed : null];
      }}
    >
      <View style={[styles.actionIcon, destructive ? styles.dangerIcon : null]}>
        <Icon name={icon} style={destructive ? styles.dangerText : null} />
      </View>
      <Text style={[styles.actionLabel, destructive ? styles.dangerText : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    height: 34,
    justifyContent: 'center',
    width: 46,
  },
  actionLabel: {
    color: colors.textPrimary,
    ...typography.bodyStrong,
    flex: 1,
  },
  actionRow: {
    alignItems: 'center',
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  backdrop: {
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: 'flex-end',
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: radii.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  dangerIcon: {
    backgroundColor: colors.background,
    borderColor: colors.danger,
    borderWidth: 1,
  },
  dangerText: {
    color: colors.danger,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingBottom: spacing.md,
  },
  pressed: {
    opacity: 0.78,
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    padding: spacing.lg,
    ...shadows.modal,
  },
  subtitle: {
    color: colors.textSecondary,
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    ...typography.sectionTitle,
    fontWeight: '900',
  },
});

export default BarItemActionSheet;
