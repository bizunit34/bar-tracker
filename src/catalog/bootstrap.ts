import { countCatalogItems } from './db/catalogRepository';
import { initializeCatalogDatabase } from './db/client';
import { importCatalogRecords } from './seed/importCatalogRecords';
import { loadBundledCatalogSeed } from './seed/loadBundledCatalog';

let bootstrapPromise: Promise<number> | null = null;

export async function bootstrapCatalogDatabase(): Promise<number> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async (): Promise<number> => {
      const db = await initializeCatalogDatabase();
      const existingCount = await countCatalogItems(db);
      const records = loadBundledCatalogSeed();

      if (records.length === 0) {
        return existingCount;
      }

      await importCatalogRecords(records);

      return countCatalogItems(db);
    })();
  }

  return bootstrapPromise;
}
