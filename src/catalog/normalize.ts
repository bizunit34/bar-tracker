import { CatalogImportRecord, NormalizedCatalogImportRecord } from './types';

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeName(value: string): string {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();

  return text.length > 0 ? text : null;
}

export function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const cleaned = String(value)
    .replace(/[,$\s]/g, '')
    .trim();

  if (cleaned.length === 0) {
    return null;
  }

  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : null;
}

export function parseBottleSizeMl(value: unknown): number | null {
  const text = parseNullableString(value);

  if (!text) {
    return null;
  }

  const lower = text.toLowerCase();
  const ml = lower.match(/(\d+(?:\.\d+)?)\s*ml/);

  if (ml) {
    return Math.round(Number(ml[1]));
  }

  const liter = lower.match(/(\d+(?:\.\d+)?)\s*l/);

  if (liter) {
    return Math.round(Number(liter[1]) * 1000);
  }

  const numeric = parseNullableNumber(text);

  if (numeric && numeric > 10) {
    return Math.round(numeric);
  }

  return null;
}

export function normalizeCategorySlug(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value
    .replace(/^\s*\d+\s*-\s*/, '')
    .replace(/\(CONTINUED\)/gi, '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function buildExternalKey(
  liquorCode: string | null | undefined,
  fallbackName: string,
): string {
  if (liquorCode) {
    return `mlcc:${liquorCode}`;
  }

  return `mlcc:${normalizeName(fallbackName).replace(/\s+/g, '-')}`;
}

export function normalizeCatalogImportRecord(
  record: CatalogImportRecord,
  defaults: Partial<CatalogImportRecord> = {},
): NormalizedCatalogImportRecord {
  const name = normalizeWhitespace(record.name);
  const liquorCode = parseNullableString(record.liquorCode);
  const proof = record.proof ?? null;

  if (!name) {
    throw new Error('Catalog import record requires a name.');
  }

  return {
    abv: record.abv ?? (proof !== null ? proof / 2 : null),
    adaNumber: record.adaNumber ?? null,
    attributes: record.attributes ?? {},
    basePrice: record.basePrice ?? null,
    bottleSizeMl: record.bottleSizeMl ?? null,
    brand: record.brand ?? null,
    caseSize: record.caseSize ?? null,
    category: record.category ?? normalizeCategorySlug(record.liquorTypeRaw),
    externalKey: record.externalKey ?? buildExternalKey(liquorCode, name),
    importBatchId: record.importBatchId ?? defaults.importBatchId ?? null,
    isActive: record.isActive ?? true,
    isNew: record.isNew ?? false,
    itemType: record.itemType ?? defaults.itemType ?? 'spirit',
    licenseePrice: record.licenseePrice ?? null,
    liquorCode,
    liquorTypeRaw: record.liquorTypeRaw ?? null,
    minimumShelfPrice: record.minimumShelfPrice ?? null,
    name,
    normalizedName: record.normalizedName ?? normalizeName(name),
    proof,
    sku: record.sku ?? null,
    source: record.source ?? defaults.source ?? 'json_seed',
    sourceFile: record.sourceFile ?? defaults.sourceFile ?? null,
    status: record.status ?? null,
    subcategory: record.subcategory ?? null,
  };
}

export function normalizeCatalogImportRecords(
  records: Array<CatalogImportRecord>,
  defaults: Partial<CatalogImportRecord> = {},
): Array<NormalizedCatalogImportRecord> {
  return records.map((record: CatalogImportRecord): NormalizedCatalogImportRecord => {
    return normalizeCatalogImportRecord(record, defaults);
  });
}
