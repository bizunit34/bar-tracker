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

function inferMlccItemType(liquorTypeRaw: string | null, name: string): 'spirit' | 'liqueur' {
  const text = `${liquorTypeRaw ?? ''} ${name}`.toLowerCase();

  return /liqueur|cordial|schnapps|amaretto|creme|cr[eè]me/.test(text) ? 'liqueur' : 'spirit';
}

function mlccExternalKey(liquorCode: string | null, name: string): string {
  return liquorCode ? `mlcc:${liquorCode}` : `mlcc:${normalizeName(name).replace(/\s+/g, '-')}`;
}

export function mapFlatPriceBookRow(
  row: FlatPriceBookRow,
  sourceFile: string | null,
): CatalogImportRecord {
  const liquorTypeRaw = parseNullableString(row['Liquor Type']);
  const name = parseNullableString(row['Brand Name - Final']) ?? 'UNKNOWN ITEM';
  const proof = parseNullableNumber(row.Proof);
  const status = parseNullableString(row.Status);
  const adaNumber = parseNullableString(row['ADA Number']);
  const basePrice = parseNullableNumber(row['Base Price']);
  const bottleSizeMl = parseBottleSizeMl(row['Bottle Size']);
  const caseSize = parseNullableNumber(row['Case Size']);
  const licenseePrice = parseNullableNumber(row['Licensee Price']);
  const liquorCode = parseNullableString(row['Liquor Code']);
  const minimumShelfPrice = parseNullableNumber(row['Minimum Shelf Price']);

  return {
    adaNumber,
    attributes: {
      adaNumber,
      basePrice,
      bottleSizeMl,
      caseSize,
      licenseePrice,
      liquorCode,
      liquorType: liquorTypeRaw,
      minimumShelfPrice,
      sourcePriceBookDate: null,
      vendor: null,
    },
    basePrice,
    bottleSizeMl,
    brand: null,
    caseSize,
    category: normalizeCategorySlug(liquorTypeRaw),
    externalKey: mlccExternalKey(liquorCode, name),
    isActive: true,
    isNew: (status ?? '').toLowerCase().includes('new'),
    itemType: inferMlccItemType(liquorTypeRaw, name),
    licenseePrice,
    liquorCode,
    liquorTypeRaw,
    minimumShelfPrice,
    name,
    normalizedName: normalizeName(name),
    proof,
    source: 'mlcc',
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
    source: 'mlcc',
    sourceFile,
  });
}
