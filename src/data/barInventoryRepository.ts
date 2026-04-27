import { SQLiteItem } from 'react-native-nitro-sqlite';

import { initializeCatalogDatabase } from '../catalog/db/client';
import { InventoryCategory, InventoryItem, InventoryVisibility } from '../types/inventory';

type InventoryRow = SQLiteItem & {
  archived_at?: string;
  created_at: string;
  id: string;
  is_archived: number;
  item_json: string;
  updated_at: string;
  visibility: string;
};

function sqlValue<T extends string | number | boolean | null | undefined>(
  value: T,
): Exclude<T, null> | undefined {
  return value === null ? undefined : (value as Exclude<T, null>);
}

export type InventoryItemInput = Omit<InventoryItem, 'createdAt' | 'updatedAt'> & {
  createdAt?: string;
  updatedAt?: string;
};

function isCategory(value: unknown): value is InventoryCategory {
  return (
    value === 'spirit' ||
    value === 'liqueur' ||
    value === 'wine' ||
    value === 'beer' ||
    value === 'mixer' ||
    value === 'bitters' ||
    value === 'syrup' ||
    value === 'juice' ||
    value === 'garnish' ||
    value === 'tool' ||
    value === 'glassware' ||
    value === 'other'
  );
}

function normalizeCategory(value: unknown): InventoryCategory {
  if (value === 'bitter') {
    return 'bitters';
  }

  return isCategory(value) ? value : 'other';
}

function isVisibility(value: unknown): value is InventoryVisibility {
  return value === 'private' || value === 'shared' || value === 'guest_visible';
}

export function normalizeInventoryItem(input: InventoryItemInput): InventoryItem {
  const now = new Date().toISOString();
  const createdAt = input.createdAt ?? now;
  const updatedAt = input.updatedAt ?? now;
  const proof = input.proof ?? null;
  const abv = input.abv ?? (typeof proof === 'number' ? proof / 2 : undefined);

  return {
    ...input,
    abv,
    archivedAt: input.isArchived ? (input.archivedAt ?? updatedAt) : null,
    brand: input.brand?.trim() || null,
    category: normalizeCategory(input.category),
    createdAt,
    isArchived: Boolean(input.isArchived),
    isOpen: Boolean(input.isOpen),
    minStock: input.minStock ?? 0,
    proof,
    publicNotes: input.publicNotes?.trim() || null,
    size: input.size?.trim() || null,
    subcategory: input.subcategory?.trim() || null,
    tags: input.tags?.filter((tag: string): boolean => {
      return tag.trim().length > 0;
    }),
    updatedAt,
    visibility: isVisibility(input.visibility) ? input.visibility : 'private',
  };
}

function parseInventoryRow(row: InventoryRow): InventoryItem | null {
  try {
    const parsed = JSON.parse(row.item_json) as InventoryItemInput;

    return normalizeInventoryItem({
      ...parsed,
      archivedAt: row.archived_at ?? parsed.archivedAt,
      createdAt: row.created_at,
      id: row.id,
      isArchived: row.is_archived === 1,
      updatedAt: row.updated_at,
      visibility: isVisibility(row.visibility) ? row.visibility : parsed.visibility,
    });
  } catch {
    return null;
  }
}

async function upsertItem(item: InventoryItem): Promise<void> {
  const db = await initializeCatalogDatabase();

  await db.executeAsync(
    `INSERT INTO bar_inventory_items (
      id,
      item_json,
      is_archived,
      visibility,
      created_at,
      updated_at,
      archived_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      item_json = excluded.item_json,
      is_archived = excluded.is_archived,
      visibility = excluded.visibility,
      updated_at = excluded.updated_at,
      archived_at = excluded.archived_at`,
    [
      item.id,
      JSON.stringify(item),
      item.isArchived ? 1 : 0,
      item.visibility ?? 'private',
      item.createdAt ?? new Date().toISOString(),
      item.updatedAt ?? new Date().toISOString(),
      sqlValue(item.archivedAt ?? null),
    ],
  );
}

export async function listItems(): Promise<Array<InventoryItem>> {
  const db = await initializeCatalogDatabase();
  const result = await db.executeAsync<InventoryRow>(
    'SELECT * FROM bar_inventory_items ORDER BY updated_at DESC',
  );

  return (result.rows?._array ?? [])
    .map(parseInventoryRow)
    .filter((item): item is InventoryItem => {
      return item !== null;
    });
}

export async function getItemById(id: string): Promise<InventoryItem | null> {
  const db = await initializeCatalogDatabase();
  const result = await db.executeAsync<InventoryRow>(
    'SELECT * FROM bar_inventory_items WHERE id = ? LIMIT 1',
    [id],
  );
  const row = result.rows?._array?.[0];

  return row ? parseInventoryRow(row) : null;
}

export async function createItem(input: InventoryItemInput): Promise<InventoryItem> {
  const item = normalizeInventoryItem(input);

  await upsertItem(item);

  return item;
}

export async function updateItem(id: string, input: InventoryItemInput): Promise<InventoryItem> {
  const current = await getItemById(id);
  const item = normalizeInventoryItem({
    ...current,
    ...input,
    id,
    createdAt: current?.createdAt ?? input.createdAt,
    updatedAt: new Date().toISOString(),
  });

  await upsertItem(item);

  return item;
}

export async function saveItem(input: InventoryItemInput): Promise<InventoryItem> {
  const current = await getItemById(input.id);

  return current ? updateItem(input.id, input) : createItem(input);
}

export async function archiveItem(id: string): Promise<InventoryItem | null> {
  const current = await getItemById(id);

  if (!current) {
    return null;
  }

  const now = new Date().toISOString();
  const item = normalizeInventoryItem({
    ...current,
    archivedAt: now,
    isArchived: true,
    updatedAt: now,
  });

  await upsertItem(item);

  return item;
}

export async function restoreItem(id: string): Promise<InventoryItem | null> {
  const current = await getItemById(id);

  if (!current) {
    return null;
  }

  const item = normalizeInventoryItem({
    ...current,
    archivedAt: null,
    isArchived: false,
    updatedAt: new Date().toISOString(),
  });

  await upsertItem(item);

  return item;
}

export async function deleteItem(id: string): Promise<void> {
  const db = await initializeCatalogDatabase();

  await db.executeAsync('DELETE FROM bar_inventory_items WHERE id = ?', [id]);
}

export async function listActiveItems(): Promise<Array<InventoryItem>> {
  const items = await listItems();

  return items.filter((item: InventoryItem): boolean => {
    return !item.isArchived;
  });
}

export async function listArchivedItems(): Promise<Array<InventoryItem>> {
  const items = await listItems();

  return items.filter((item: InventoryItem): boolean => {
    return Boolean(item.isArchived);
  });
}

export async function listGuestVisibleItems(): Promise<Array<InventoryItem>> {
  const items = await listActiveItems();

  return items.filter((item: InventoryItem): boolean => {
    return item.visibility === 'shared' || item.visibility === 'guest_visible';
  });
}
