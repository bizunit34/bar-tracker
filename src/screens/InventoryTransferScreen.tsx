import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

import { refreshBarInventoryItems, useBarInventoryItems } from '../data/barInventoryStore';
import {
  buildInventoryExportCsv,
  buildInventoryExportJson,
  importInventoryItems,
  ImportInventorySummary,
  ParsedInventoryImport,
  parseInventoryCsv,
  parseInventoryExportJson,
} from '../data/inventoryTransfer';
import { colors } from '../theme/colors';

type ImportFormat = 'csv' | 'json';

function InventoryTransferScreen(): React.JSX.Element {
  const inventoryItems = useBarInventoryItems();
  const [importFormat, setImportFormat] = useState<ImportFormat>('json');
  const [rawImport, setRawImport] = useState<string>('');
  const [parsedImport, setParsedImport] = useState<ParsedInventoryImport | null>(null);
  const [importSummary, setImportSummary] = useState<ImportInventorySummary | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportSummary = useMemo((): string => {
    const activeCount = inventoryItems.filter((item) => {
      return !item.isArchived;
    }).length;
    const archivedCount = inventoryItems.length - activeCount;

    return `${inventoryItems.length} total items · ${activeCount} active · ${archivedCount} archived`;
  }, [inventoryItems]);

  const exportContent = async (format: ImportFormat): Promise<void> => {
    const content =
      format === 'json'
        ? buildInventoryExportJson(inventoryItems)
        : buildInventoryExportCsv(inventoryItems);
    const extension = format === 'json' ? 'json' : 'csv';

    setExportError(null);

    try {
      await Share.share({
        message: content,
        title: `bar-tracker-inventory.${extension}`,
      });
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Could not open native share sheet.');
    }
  };

  const previewImport = (): void => {
    const parsed =
      importFormat === 'json' ? parseInventoryExportJson(rawImport) : parseInventoryCsv(rawImport);

    setParsedImport(parsed);
    setImportSummary(null);
  };

  const applyImport = async (): Promise<void> => {
    const parsed =
      parsedImport ??
      (importFormat === 'json'
        ? parseInventoryExportJson(rawImport)
        : parseInventoryCsv(rawImport));

    if (parsed.items.length === 0) {
      setParsedImport(parsed);

      return;
    }

    setIsImporting(true);

    try {
      const summary = await importInventoryItems(parsed.items, {
        duplicateStrategy: 'skip',
        source: importFormat,
      });

      await refreshBarInventoryItems();
      setParsedImport(parsed);
      setImportSummary(summary);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Import / Export</Text>
      <Text style={styles.pageSubtitle}>
        Back up inventory locally or paste a Bar Tracker export to restore items.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export Inventory</Text>
        <Text style={styles.helperText}>{exportSummary}</Text>
        <Text style={styles.helperText}>
          JSON is best for restoring Bar Tracker data. CSV is best for spreadsheet review or
          cleanup.
        </Text>
        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={(): void => {
              exportContent('json').catch((error: unknown): void => {
                setExportError(error instanceof Error ? error.message : 'Could not export JSON.');
              });
            }}
            style={({ pressed }): StyleProp<ViewStyle> => {
              return [styles.primaryButton, pressed ? styles.controlPressed : null];
            }}
          >
            <Text style={styles.primaryButtonText}>Export JSON Backup</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={(): void => {
              exportContent('csv').catch((error: unknown): void => {
                setExportError(error instanceof Error ? error.message : 'Could not export CSV.');
              });
            }}
            style={({ pressed }): StyleProp<ViewStyle> => {
              return [styles.secondaryButton, pressed ? styles.controlPressed : null];
            }}
          >
            <Text style={styles.secondaryButtonText}>Export CSV Spreadsheet</Text>
          </Pressable>
        </View>
        <Text style={styles.todoText}>
          File picker/save integration TODO: replace share-sheet text export with platform file
          attachment once a document/file-system library is added.
        </Text>
        {exportError ? <Text style={styles.errorText}>{exportError}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Import Inventory</Text>
        <Text style={styles.helperText}>
          Paste JSON or CSV, preview the parsed rows, then confirm import. Duplicates are skipped by
          default to avoid repeated full-library imports.
        </Text>
        <View style={styles.actionRow}>
          <FormatChip
            isSelected={importFormat === 'json'}
            label="JSON"
            onPress={(): void => {
              setImportFormat('json');
              setParsedImport(null);
              setImportSummary(null);
            }}
          />
          <FormatChip
            isSelected={importFormat === 'csv'}
            label="CSV"
            onPress={(): void => {
              setImportFormat('csv');
              setParsedImport(null);
              setImportSummary(null);
            }}
          />
        </View>
        <TextInput
          multiline
          onChangeText={(value: string): void => {
            setRawImport(value);
            setParsedImport(null);
            setImportSummary(null);
          }}
          placeholder={
            importFormat === 'json'
              ? 'Paste Bar Tracker inventory JSON here'
              : 'Paste inventory CSV here'
          }
          placeholderTextColor={colors.textSecondary}
          style={styles.importInput}
          value={rawImport}
        />
        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={previewImport}
            style={({ pressed }): StyleProp<ViewStyle> => {
              return [styles.secondaryButton, pressed ? styles.controlPressed : null];
            }}
          >
            <Text style={styles.secondaryButtonText}>Preview Import</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isImporting}
            onPress={(): void => {
              applyImport().catch((error: unknown): void => {
                setImportSummary({
                  errors: [error instanceof Error ? error.message : 'Import failed.'],
                  imported: 0,
                  skipped: 0,
                  updated: 0,
                });
              });
            }}
            style={({ pressed }): StyleProp<ViewStyle> => {
              return [
                styles.primaryButton,
                pressed ? styles.controlPressed : null,
                isImporting ? styles.disabledButton : null,
              ];
            }}
          >
            <Text style={styles.primaryButtonText}>{isImporting ? 'Importing...' : 'Import'}</Text>
          </Pressable>
        </View>
        <Text style={styles.todoText}>
          File picker integration TODO: paste import is supported now; native document picker can
          feed file contents into this parser later.
        </Text>
      </View>

      {parsedImport ? <ImportPreview parsedImport={parsedImport} /> : null}
      {importSummary ? <ImportSummary summary={importSummary} /> : null}
    </ScrollView>
  );
}

type FormatChipProps = {
  isSelected: boolean;
  label: string;
  onPress: () => void;
};

function FormatChip({ isSelected, label, onPress }: FormatChipProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => {
        return [
          styles.formatChip,
          isSelected ? styles.formatChipActive : null,
          pressed ? styles.controlPressed : null,
        ];
      }}
    >
      <Text style={[styles.formatChipText, isSelected ? styles.formatChipTextActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ImportPreview({
  parsedImport,
}: {
  parsedImport: ParsedInventoryImport;
}): React.JSX.Element {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Import Preview</Text>
      <Text style={styles.helperText}>{parsedImport.items.length} valid items found.</Text>
      {parsedImport.items.slice(0, 8).map((item) => {
        return (
          <Text key={item.id} style={styles.previewItem}>
            {item.name} · {item.category}
          </Text>
        );
      })}
      {parsedImport.items.length > 8 ? (
        <Text style={styles.helperText}>+{parsedImport.items.length - 8} more</Text>
      ) : null}
      {parsedImport.errors.map((error) => {
        return (
          <Text key={error} style={styles.errorText}>
            {error}
          </Text>
        );
      })}
    </View>
  );
}

function ImportSummary({ summary }: { summary: ImportInventorySummary }): React.JSX.Element {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Import Summary</Text>
      <Text style={styles.helperText}>
        Imported {summary.imported} · Updated {summary.updated} · Skipped {summary.skipped}
      </Text>
      {summary.errors.map((error) => {
        return (
          <Text key={error} style={styles.errorText}>
            {error}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  container: {
    gap: 14,
    padding: 20,
  },
  controlPressed: {
    opacity: 0.75,
  },
  disabledButton: {
    opacity: 0.55,
  },
  errorText: {
    color: colors.dangerText,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  formatChip: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  formatChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  formatChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  formatChipTextActive: {
    color: colors.background,
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  importInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 13,
    minHeight: 180,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
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
  previewItem: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
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
  todoText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});

export default InventoryTransferScreen;
