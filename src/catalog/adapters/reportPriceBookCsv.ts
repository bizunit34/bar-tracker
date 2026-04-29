import { parseCsvRows } from '../csv';
import {
  normalizeCatalogImportRecords,
  normalizeCategorySlug,
  normalizeName,
  parseNullableNumber,
  parseNullableString,
} from '../normalize';
import { CatalogImportRecord, NormalizedCatalogImportRecord } from '../types';

type ReportPriceBookRow = {
  adaNumber: string | null;
  basePrice: number | null;
  bottleSizeMl: number | null;
  caseSize: number | null;
  isNew: boolean;
  licenseePrice: number | null;
  liquorCode: string | null;
  liquorTypeRaw: string | null;
  minimumShelfPrice: number | null;
  name: string | null;
  proof: number | null;
};

function inferMlccItemType(liquorTypeRaw: string | null, name: string): 'spirit' | 'liqueur' {
  const text = `${liquorTypeRaw ?? ''} ${name}`.toLowerCase();

  return /liqueur|cordial|schnapps|amaretto|creme|cr[eè]me/.test(text) ? 'liqueur' : 'spirit';
}

function mlccExternalKey(liquorCode: string | null, name: string): string {
  return liquorCode ? `mlcc:${liquorCode}` : `mlcc:${normalizeName(name).replace(/\s+/g, '-')}`;
}

export function extractReportPriceBookRows(rows: Array<Array<string>>): Array<ReportPriceBookRow> {
  const records: Array<ReportPriceBookRow> = [];
  let currentLiquorType: string | null = null;

  for (const rawRow of rows) {
    const row = rawRow.map((value: string): string => {
      return value.trim();
    });
    const first = row[0] ?? '';
    const second = row[1] ?? '';
    const third = row[2] ?? '';
    const fifth = row[4] ?? '';
    const isSectionHeader = first.length > 0 && !second && !third && !fifth;

    if (isSectionHeader) {
      currentLiquorType = first.replace(/\(CONTINUED\)/gi, '').trim();
      continue;
    }

    if (!/^\d+$/.test(third) || fifth.length === 0) {
      continue;
    }

    records.push({
      adaNumber: parseNullableString(row[1]),
      basePrice: parseNullableNumber(row[8]),
      bottleSizeMl: parseNullableNumber(row[6]),
      caseSize: parseNullableNumber(row[7]),
      isNew: (parseNullableString(row[11]) ?? '').toLowerCase().includes('new'),
      licenseePrice: parseNullableNumber(row[9]),
      liquorCode: parseNullableString(row[2]),
      liquorTypeRaw: currentLiquorType,
      minimumShelfPrice: parseNullableNumber(row[10]),
      name: parseNullableString(row[4]),
      proof: parseNullableNumber(row[5]),
    });
  }

  return records;
}

export function mapReportPriceBookRow(
  row: ReportPriceBookRow,
  sourceFile: string | null,
): CatalogImportRecord {
  const name = row.name ?? 'UNKNOWN ITEM';

  return {
    adaNumber: row.adaNumber,
    attributes: {
      adaNumber: row.adaNumber,
      basePrice: row.basePrice,
      bottleSizeMl: row.bottleSizeMl,
      caseSize: row.caseSize,
      licenseePrice: row.licenseePrice,
      liquorCode: row.liquorCode,
      liquorType: row.liquorTypeRaw,
      minimumShelfPrice: row.minimumShelfPrice,
      sourcePriceBookDate: null,
      vendor: null,
    },
    basePrice: row.basePrice,
    bottleSizeMl: row.bottleSizeMl,
    brand: null,
    caseSize: row.caseSize,
    category: normalizeCategorySlug(row.liquorTypeRaw),
    externalKey: mlccExternalKey(row.liquorCode, name),
    isActive: true,
    isNew: row.isNew,
    itemType: inferMlccItemType(row.liquorTypeRaw, name),
    licenseePrice: row.licenseePrice,
    liquorCode: row.liquorCode,
    liquorTypeRaw: row.liquorTypeRaw,
    minimumShelfPrice: row.minimumShelfPrice,
    name,
    normalizedName: normalizeName(name),
    proof: row.proof,
    source: 'mlcc',
    sourceFile,
    status: row.isNew ? 'NEW' : null,
    subcategory: null,
  };
}

export function parseReportPriceBookCsv(
  input: string,
  sourceFile: string | null = null,
): Array<NormalizedCatalogImportRecord> {
  const records = extractReportPriceBookRows(parseCsvRows(input)).map(
    (row: ReportPriceBookRow): CatalogImportRecord => {
      return mapReportPriceBookRow(row, sourceFile);
    },
  );

  return normalizeCatalogImportRecords(records, {
    source: 'mlcc',
    sourceFile,
  });
}
