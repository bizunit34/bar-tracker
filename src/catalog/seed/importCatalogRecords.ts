import { recordImportBatch, upsertCatalogImportRecord } from '../db/catalogRepository';
import { initializeCatalogDatabase } from '../db/client';
import { normalizeJsonCatalogImport } from '../jsonImport';
import { CatalogImportRecord, NormalizedCatalogImportRecord } from '../types';

export async function importCatalogRecords(records: Array<CatalogImportRecord>): Promise<number> {
  const db = await initializeCatalogDatabase();
  const importedAt = new Date().toISOString();
  const batchId = `catalog-seed-${importedAt}`;
  const normalized = normalizeJsonCatalogImport(records, {
    importBatchId: batchId,
    source: 'catalog_seed_json',
    sourceFile: 'catalog.seed.json',
  });

  await recordImportBatch(db, {
    id: batchId,
    importedAt,
    recordCount: normalized.length,
    source: 'catalog_seed_json',
    sourceFile: 'catalog.seed.json',
  });

  for (const record of normalized) {
    await upsertCatalogImportRecord(db, record, importedAt);
  }

  return normalized.length;
}

export async function importNormalizedCatalogRecords(
  records: Array<NormalizedCatalogImportRecord>,
): Promise<number> {
  const db = await initializeCatalogDatabase();
  const importedAt = new Date().toISOString();
  const source = records[0]?.source ?? 'catalog_import';
  const sourceFile = records[0]?.sourceFile ?? null;
  const batchId = `catalog-import-${importedAt}`;

  await recordImportBatch(db, {
    id: batchId,
    importedAt,
    recordCount: records.length,
    source,
    sourceFile,
  });

  for (const record of records) {
    await upsertCatalogImportRecord(db, { ...record, importBatchId: batchId }, importedAt);
  }

  return records.length;
}
