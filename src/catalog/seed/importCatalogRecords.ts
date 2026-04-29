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
  const deduped = dedupeNormalizedCatalogRecords(normalized);

  await recordImportBatch(db, {
    id: batchId,
    importedAt,
    recordCount: deduped.length,
    source: 'catalog_seed_json',
    sourceFile: 'catalog.seed.json',
  });

  for (const record of deduped) {
    await upsertCatalogImportRecord(db, record, importedAt);
  }

  return deduped.length;
}

export async function importNormalizedCatalogRecords(
  records: Array<NormalizedCatalogImportRecord>,
): Promise<number> {
  const db = await initializeCatalogDatabase();
  const importedAt = new Date().toISOString();
  const source = records[0]?.source ?? 'catalog_import';
  const sourceFile = records[0]?.sourceFile ?? null;
  const batchId = `catalog-import-${importedAt}`;
  const deduped = dedupeNormalizedCatalogRecords(records);

  await recordImportBatch(db, {
    id: batchId,
    importedAt,
    recordCount: deduped.length,
    source,
    sourceFile,
  });

  for (const record of deduped) {
    await upsertCatalogImportRecord(db, { ...record, importBatchId: batchId }, importedAt);
  }

  return deduped.length;
}

function dedupeNormalizedCatalogRecords(
  records: Array<NormalizedCatalogImportRecord>,
): Array<NormalizedCatalogImportRecord> {
  const recordsByExternalKey = new Map<string, NormalizedCatalogImportRecord>();

  for (const record of records) {
    recordsByExternalKey.set(record.externalKey, record);
  }

  return [...recordsByExternalKey.values()];
}
