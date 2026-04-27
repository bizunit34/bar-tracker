import { parseCsvObjects } from '../csv';
import {
  normalizeCatalogImportRecords,
  normalizeCategorySlug,
  normalizeName,
  parseBottleSizeMl,
  parseNullableNumber,
  parseNullableString,
} from '../normalize';
import { CatalogImportRecord, NormalizedCatalogImportRecord } from '../types';

type FlatPriceBookRow = {
  'ADA Number'?: string;
  'Base Price'?: string | number;
  'Bottle Size'?: string | number;
  'Brand Name - Final'?: string;
  'Case Size'?: string | number;
  'Licensee Price'?: string | number;
  'Liquor Code'?: string;
  'Liquor Type'?: string;
  'Minimum Shelf Price'?: string | number;
  Proof?: string | number;
  Status?: string;
};

export function mapFlatPriceBookRow(
  row: FlatPriceBookRow,
  sourceFile: string | null,
): CatalogImportRecord {
  const liquorTypeRaw = parseNullableString(row['Liquor Type']);
  const name = parseNullableString(row['Brand Name - Final']) ?? 'UNKNOWN ITEM';
  const proof = parseNullableNumber(row.Proof);
  const status = parseNullableString(row.Status);

  return {
    adaNumber: parseNullableString(row['ADA Number']),
    attributes: {},
    basePrice: parseNullableNumber(row['Base Price']),
    bottleSizeMl: parseBottleSizeMl(row['Bottle Size']),
    brand: null,
    caseSize: parseNullableNumber(row['Case Size']),
    category: normalizeCategorySlug(liquorTypeRaw),
    isActive: true,
    isNew: (status ?? '').toLowerCase().includes('new'),
    itemType: 'spirit',
    licenseePrice: parseNullableNumber(row['Licensee Price']),
    liquorCode: parseNullableString(row['Liquor Code']),
    liquorTypeRaw,
    minimumShelfPrice: parseNullableNumber(row['Minimum Shelf Price']),
    name,
    normalizedName: normalizeName(name),
    proof,
    source: 'mi_pricebook_flat_csv',
    sourceFile,
    status,
    subcategory: null,
  };
}

export function parseFlatPriceBookCsv(
  input: string,
  sourceFile: string | null = null,
): Array<NormalizedCatalogImportRecord> {
  const records = parseCsvObjects(input).map((row: Record<string, string>): CatalogImportRecord => {
    return mapFlatPriceBookRow(row, sourceFile);
  });

  return normalizeCatalogImportRecords(records, {
    source: 'mi_pricebook_flat_csv',
    sourceFile,
  });
}
