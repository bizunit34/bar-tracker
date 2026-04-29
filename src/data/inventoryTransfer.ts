import {
  InventoryCategory,
  InventoryItem,
  InventoryUnit,
  InventoryVisibility,
} from '../types/inventory';
import { listItems, saveItem } from './barInventoryRepository';

export type InventoryExportV1 = {
  exportVersion: 1;
  appName: 'Bar Tracker';
  exportedAt: string;
  items: Array<InventoryItem>;
};

export type ImportDuplicateStrategy = 'skip';

export type ImportInventoryOptions = {
  source: 'csv' | 'json';
  duplicateStrategy?: ImportDuplicateStrategy;
};

export type ImportInventorySummary = {
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<string>;
};

export type ParsedInventoryImport = {
  items: Array<InventoryItem>;
  errors: Array<string>;
};

const csvColumns = [
  'id',
  'name',
  'category',
  'subcategory',
  'brand',
  'size',
  'proof',
  'abv',
  'quantity',
  'unit',
  'isOpen',
  'rating',
  'visibility',
  'tags',
  'publicNotes',
  'notes',
  'isArchived',
  'createdAt',
  'updatedAt',
  'archivedAt',
] as const;

const inventoryCategories: Array<InventoryCategory> = [
  'spirit',
  'liqueur',
  'wine',
  'beer',
  'mixer',
  'bitters',
  'syrup',
  'juice',
  'garnish',
  'tool',
  'glassware',
  'other',
];

const inventoryUnits: Array<InventoryUnit> = ['bottle', 'ml', 'oz', 'count'];
const inventoryVisibilities: Array<InventoryVisibility> = ['private', 'shared', 'guest_visible'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function optionalString(value: unknown): string | null {
  const stringValue = asString(value)?.trim();

  return stringValue ? stringValue : null;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function nonNegativeNumberValue(value: unknown): number | undefined {
  const parsed = numberValue(value);

  return parsed === undefined ? undefined : Math.max(0, parsed);
}

function booleanValue(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }

  return false;
}

function normalizeCategory(value: unknown): InventoryCategory {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  if (normalized === 'bitter') {
    return 'bitters';
  }

  return inventoryCategories.includes(normalized as InventoryCategory)
    ? (normalized as InventoryCategory)
    : 'other';
}

function normalizeUnit(value: unknown): InventoryUnit {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  return inventoryUnits.includes(normalized as InventoryUnit)
    ? (normalized as InventoryUnit)
    : 'bottle';
}

function normalizeVisibility(value: unknown): InventoryVisibility {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  return inventoryVisibilities.includes(normalized as InventoryVisibility)
    ? (normalized as InventoryVisibility)
    : 'private';
}

function normalizeTags(value: unknown): Array<string> {
  if (Array.isArray(value)) {
    return value
      .filter((tag): tag is string => {
        return typeof tag === 'string';
      })
      .map((tag) => {
        return tag.trim();
      })
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[|,]/)
      .map((tag) => {
        return tag.trim();
      })
      .filter(Boolean);
  }

  return [];
}

function normalizeDuplicateKey(item: InventoryItem): string {
  return [item.name, item.brand ?? '', item.category]
    .map((value) => {
      return value.trim().toLowerCase();
    })
    .join('|');
}

function createImportId(index: number): string {
  return `import-${Date.now()}-${index}`;
}

export function buildInventoryExport(items: Array<InventoryItem>): InventoryExportV1 {
  return {
    appName: 'Bar Tracker',
    exportedAt: new Date().toISOString(),
    exportVersion: 1,
    items,
  };
}

function csvEscape(value: unknown): string {
  const stringValue = value === null || value === undefined ? '' : String(value);

  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function buildInventoryExportJson(items: Array<InventoryItem>): string {
  return JSON.stringify(buildInventoryExport(items), null, 2);
}

export function buildInventoryExportCsv(items: Array<InventoryItem>): string {
  const rows = items.map((item) => {
    const values = csvColumns.map((column) => {
      if (column === 'tags') {
        return csvEscape(item.tags?.join('|') ?? '');
      }

      return csvEscape(item[column as keyof InventoryItem]);
    });

    return values.join(',');
  });

  return [csvColumns.join(','), ...rows].join('\n');
}

export function validateImportedBarItem(raw: unknown): Array<string> {
  if (!isRecord(raw)) {
    return ['Item is not an object.'];
  }

  const errors: Array<string> = [];

  if (!asString(raw.name)?.trim()) {
    errors.push('Item name is required.');
  }

  return errors;
}

export function normalizeImportedBarItem(raw: unknown, index = 0): InventoryItem | null {
  if (!isRecord(raw) || validateImportedBarItem(raw).length > 0) {
    return null;
  }

  const now = new Date().toISOString();
  const proof = numberValue(raw.proof);
  const abv = numberValue(raw.abv) ?? (typeof proof === 'number' ? proof / 2 : undefined);
  const id = optionalString(raw.id) ?? createImportId(index);
  const createdAt = optionalString(raw.createdAt) ?? now;
  const updatedAt = optionalString(raw.updatedAt) ?? now;
  const isArchived = booleanValue(raw.isArchived);

  return {
    abv,
    archivedAt: isArchived ? (optionalString(raw.archivedAt) ?? updatedAt) : null,
    brand: optionalString(raw.brand),
    category: normalizeCategory(raw.category),
    createdAt,
    id,
    isArchived,
    isOpen: booleanValue(raw.isOpen),
    minStock: nonNegativeNumberValue(raw.minStock) ?? 0,
    name: asString(raw.name)?.trim() ?? '',
    notes: asString(raw.notes),
    proof: proof ?? null,
    publicNotes: optionalString(raw.publicNotes),
    quantity: nonNegativeNumberValue(raw.quantity) ?? 0,
    rating: numberValue(raw.rating),
    size: optionalString(raw.size),
    subcategory: optionalString(raw.subcategory),
    tags: normalizeTags(raw.tags),
    unit: normalizeUnit(raw.unit),
    updatedAt,
    visibility: normalizeVisibility(raw.visibility),
  };
}

export function parseInventoryExportJson(raw: string): ParsedInventoryImport {
  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isRecord(parsed)) {
      return { errors: ['Import file must contain a JSON object.'], items: [] };
    }

    if (parsed.exportVersion !== 1) {
      return { errors: ['Unsupported inventory export version.'], items: [] };
    }

    if (!Array.isArray(parsed.items)) {
      return { errors: ['Inventory export is missing an items array.'], items: [] };
    }

    return parseRawItems(parsed.items);
  } catch {
    return { errors: ['Could not parse JSON inventory export.'], items: [] };
  }
}

function parseCsvRows(raw: string): { errors: Array<string>; rows: Array<Array<string>> } {
  const rows: Array<Array<string>> = [];
  let current = '';
  let row: Array<string> = [];
  let isQuoted = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    const nextChar = raw[index + 1];

    if (char === '"' && isQuoted && nextChar === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      isQuoted = !isQuoted;
    } else if (char === ',' && !isQuoted) {
      row.push(current);
      current = '';
    } else if ((char === '\n' || char === '\r') && !isQuoted) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }

      row.push(current);
      rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return {
    errors: isQuoted ? ['CSV import has an unclosed quoted field.'] : [],
    rows: rows.filter((csvRow) => {
      return csvRow.some((value) => {
        return value.trim().length > 0;
      });
    }),
  };
}

export function parseInventoryCsv(raw: string): ParsedInventoryImport {
  const { errors, rows } = parseCsvRows(raw);

  if (errors.length > 0) {
    return { errors, items: [] };
  }

  if (rows.length === 0) {
    return { errors: ['CSV import is empty.'], items: [] };
  }

  const headers = rows[0].map((header) => {
    return header.trim();
  });
  const rawItems = rows.slice(1).map((row) => {
    return headers.reduce<Record<string, string>>((item, header, index) => {
      item[header] = row[index] ?? '';

      return item;
    }, {});
  });

  return parseRawItems(rawItems);
}

function parseRawItems(rawItems: Array<unknown>): ParsedInventoryImport {
  const errors: Array<string> = [];
  const items: Array<InventoryItem> = [];

  rawItems.forEach((rawItem, index) => {
    const itemErrors = validateImportedBarItem(rawItem);

    if (itemErrors.length > 0) {
      errors.push(`Row ${index + 1}: ${itemErrors.join(' ')}`);

      return;
    }

    const item = normalizeImportedBarItem(rawItem, index);

    if (!item) {
      errors.push(`Row ${index + 1}: Could not normalize item.`);

      return;
    }

    items.push(item);
  });

  return { errors, items };
}

export async function importInventoryItems(
  items: Array<InventoryItem>,
  options: ImportInventoryOptions,
): Promise<ImportInventorySummary> {
  const existingItems = await listItems();
  const existingIds = new Set(
    existingItems.map((item) => {
      return item.id;
    }),
  );
  const existingDuplicateKeys = new Set(existingItems.map(normalizeDuplicateKey));
  const seenImportIds = new Set<string>();
  const seenImportDuplicateKeys = new Set<string>();
  const summary: ImportInventorySummary = {
    errors: [],
    imported: 0,
    skipped: 0,
    updated: 0,
  };

  for (const item of items) {
    const duplicateKey = normalizeDuplicateKey(item);
    const isDuplicate =
      existingIds.has(item.id) ||
      seenImportIds.has(item.id) ||
      (options.source === 'csv' &&
        (existingDuplicateKeys.has(duplicateKey) || seenImportDuplicateKeys.has(duplicateKey)));

    if (isDuplicate) {
      summary.skipped += 1;
      summary.errors.push(`Skipped duplicate item: ${item.name}`);
      continue;
    }

    try {
      await saveItem(item);
      existingIds.add(item.id);
      existingDuplicateKeys.add(duplicateKey);
      seenImportIds.add(item.id);
      seenImportDuplicateKeys.add(duplicateKey);
      summary.imported += 1;
    } catch (error) {
      summary.skipped += 1;
      summary.errors.push(
        error instanceof Error ? `Failed to import ${item.name}: ${error.message}` : item.name,
      );
    }
  }

  return summary;
}
