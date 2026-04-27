import catalogSeed from '../generated/catalog.seed.json';
import { InventoryCategory, InventoryItem } from '../types/inventory';
import { CatalogImportRecord } from './types';

function mapCatalogCategory(record: CatalogImportRecord): InventoryCategory {
  const searchableCategory = [record.category, record.liquorTypeRaw, record.itemType]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (searchableCategory.includes('bitter')) {
    return 'bitter';
  }

  if (
    searchableCategory.includes('cordial') ||
    searchableCategory.includes('cream') ||
    searchableCategory.includes('liqueur')
  ) {
    return 'liqueur';
  }

  if (searchableCategory.includes('mixer') || searchableCategory.includes('syrup')) {
    return 'mixer';
  }

  if (searchableCategory.includes('garnish')) {
    return 'garnish';
  }

  if (record.itemType === 'spirit') {
    return 'spirit';
  }

  return 'other';
}

function formatCatalogLabel(value: string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter: string): string => {
      return letter.toUpperCase();
    });
}

function buildCatalogDescription(record: CatalogImportRecord): string | undefined {
  const details = [
    record.proof !== null && record.proof !== undefined ? `${record.proof} proof` : null,
    record.abv !== null && record.abv !== undefined ? `${record.abv}% ABV` : null,
    record.bottleSizeMl !== null && record.bottleSizeMl !== undefined
      ? `${record.bottleSizeMl} ml`
      : null,
    record.minimumShelfPrice !== null && record.minimumShelfPrice !== undefined
      ? `Minimum shelf price $${record.minimumShelfPrice.toFixed(2)}`
      : null,
  ].filter(Boolean);

  return details.length > 0 ? details.join(' · ') : undefined;
}

export const catalogInventoryItems: Array<InventoryItem> = (
  catalogSeed as Array<CatalogImportRecord>
).map((record: CatalogImportRecord): InventoryItem => {
  const category = mapCatalogCategory(record);

  return {
    abv: record.abv ?? undefined,
    category,
    description: buildCatalogDescription(record),
    id: record.externalKey ?? record.normalizedName ?? record.name,
    minStock: 0,
    name: record.name,
    notes: record.liquorCode ? `Liquor code ${record.liquorCode}` : undefined,
    productType:
      formatCatalogLabel(record.liquorTypeRaw ?? record.category) ?? formatCatalogLabel(category),
    quantity: 1,
    unit: 'bottle',
  };
});
