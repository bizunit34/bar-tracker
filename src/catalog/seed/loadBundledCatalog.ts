import seedRecords from '../../generated/catalog.seed.json';
import { CatalogImportRecord } from '../types';

export function loadBundledCatalogSeed(): Array<CatalogImportRecord> {
  return seedRecords as Array<CatalogImportRecord>;
}
