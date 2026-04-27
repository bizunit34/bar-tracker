import { normalizeCatalogImportRecords } from './normalize';
import { CatalogImportRecord, NormalizedCatalogImportRecord } from './types';

export function normalizeJsonCatalogImport(
  records: Array<CatalogImportRecord>,
  defaults: Partial<CatalogImportRecord> = {},
): Array<NormalizedCatalogImportRecord> {
  return normalizeCatalogImportRecords(records, {
    source: 'json_seed',
    ...defaults,
  });
}
