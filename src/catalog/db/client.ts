import { NitroSQLiteConnection, open } from 'react-native-nitro-sqlite';

import { catalogSchemaStatements } from './schema';

let catalogDatabase: NitroSQLiteConnection | null = null;

export function getCatalogDatabase(): NitroSQLiteConnection {
  if (!catalogDatabase) {
    catalogDatabase = open({ name: 'bar_tracker_catalog.db' });
  }

  return catalogDatabase;
}

export async function initializeCatalogDatabase(): Promise<NitroSQLiteConnection> {
  const db = getCatalogDatabase();

  await db.executeAsync('PRAGMA foreign_keys = ON');

  for (const statement of catalogSchemaStatements) {
    await db.executeAsync(statement);
  }

  return db;
}
