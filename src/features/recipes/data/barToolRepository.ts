import { SQLiteItem } from 'react-native-nitro-sqlite';

import { initializeCatalogDatabase } from '../../../catalog/db/client';
import { BarTool } from '../ai/recipeAiTypes';
import { knownBarTools } from './recipeConstants';

type BarToolRow = SQLiteItem & {
  available?: number;
  id?: string;
  name?: string;
};

function mapRowToBarTool(row: BarToolRow): BarTool | null {
  if (!row.id || !row.name) {
    return null;
  }

  return {
    available: row.available === 1,
    id: row.id,
    name: row.name,
  };
}

async function ensureDefaultBarTools(): Promise<void> {
  const db = await initializeCatalogDatabase();
  const updatedAt = new Date().toISOString();

  for (const tool of knownBarTools) {
    await db.executeAsync(
      `INSERT OR IGNORE INTO bar_tools (
        id,
        name,
        available,
        updated_at
      ) VALUES (?, ?, ?, ?)`,
      [tool.id, tool.name, tool.available ? 1 : 0, updatedAt],
    );
  }
}

export async function listBarTools(): Promise<Array<BarTool>> {
  await ensureDefaultBarTools();

  const db = await initializeCatalogDatabase();
  const result = await db.executeAsync<BarToolRow>('SELECT * FROM bar_tools ORDER BY name ASC');

  return (result.rows?._array ?? [])
    .map((row: BarToolRow): BarTool | null => {
      return mapRowToBarTool(row);
    })
    .filter((tool: BarTool | null): tool is BarTool => {
      return tool !== null;
    });
}

export async function setBarToolAvailability(id: string, available: boolean): Promise<void> {
  await ensureDefaultBarTools();

  const db = await initializeCatalogDatabase();

  await db.executeAsync(
    `UPDATE bar_tools
      SET available = ?,
        updated_at = ?
      WHERE id = ?`,
    [available ? 1 : 0, new Date().toISOString(), id],
  );
}
