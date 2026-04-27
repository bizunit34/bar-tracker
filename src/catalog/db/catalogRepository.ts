import { NitroSQLiteConnection, SQLiteItem, SQLiteValue } from 'react-native-nitro-sqlite';

import { CatalogImportAttributeValue, NormalizedCatalogImportRecord } from '../types';

type SqlExecutor = Pick<NitroSQLiteConnection, 'executeAsync'>;

function boolToInt(value: boolean): number {
  return value ? 1 : 0;
}

function attributeValueType(value: CatalogImportAttributeValue): string {
  if (value === null) {
    return 'null';
  }

  return typeof value;
}

function serializeAttributeValue(value: CatalogImportAttributeValue): string | null {
  if (value === null) {
    return null;
  }

  return String(value);
}

function sqlValue<T extends SQLiteValue | null>(value: T): Exclude<T, null> | undefined {
  return value === null ? undefined : (value as Exclude<T, null>);
}

async function findCatalogItemId(db: SqlExecutor, externalKey: string): Promise<number> {
  const result = await db.executeAsync<SQLiteItem>(
    'SELECT id FROM catalog_items WHERE external_key = ? LIMIT 1',
    [externalKey],
  );
  const row = result.rows?._array[0];

  if (!row || typeof row.id !== 'number') {
    throw new Error(`Catalog item upsert did not return an id for ${externalKey}.`);
  }

  return row.id;
}

export async function recordImportBatch(
  db: SqlExecutor,
  params: {
    id: string;
    importedAt: string;
    recordCount: number;
    source: string;
    sourceFile: string | null;
  },
): Promise<void> {
  await db.executeAsync(
    `INSERT OR REPLACE INTO import_batches (
      id,
      source,
      source_file,
      record_count,
      imported_at
    ) VALUES (?, ?, ?, ?, ?)`,
    [params.id, params.source, sqlValue(params.sourceFile), params.recordCount, params.importedAt],
  );
}

export async function upsertCatalogImportRecord(
  db: SqlExecutor,
  record: NormalizedCatalogImportRecord,
  updatedAt: string,
): Promise<number> {
  const values: Array<SQLiteValue> = [
    record.externalKey,
    record.source,
    sqlValue(record.sourceFile ?? null),
    sqlValue(record.importBatchId ?? null),
    record.itemType,
    sqlValue(record.liquorTypeRaw ?? null),
    sqlValue(record.category ?? null),
    sqlValue(record.subcategory ?? null),
    sqlValue(record.adaNumber ?? null),
    sqlValue(record.liquorCode ?? null),
    sqlValue(record.sku ?? null),
    record.name,
    record.normalizedName,
    sqlValue(record.brand ?? null),
    sqlValue(record.proof ?? null),
    sqlValue(record.abv ?? null),
    sqlValue(record.bottleSizeMl ?? null),
    sqlValue(record.caseSize ?? null),
    sqlValue(record.basePrice ?? null),
    sqlValue(record.licenseePrice ?? null),
    sqlValue(record.minimumShelfPrice ?? null),
    sqlValue(record.status ?? null),
    boolToInt(record.isNew),
    boolToInt(record.isActive),
    updatedAt,
    updatedAt,
  ];

  await db.executeAsync(
    `INSERT INTO catalog_items (
      external_key,
      source,
      source_file,
      import_batch_id,
      item_type,
      liquor_type_raw,
      category,
      subcategory,
      ada_number,
      liquor_code,
      sku,
      name,
      normalized_name,
      brand,
      proof,
      abv,
      bottle_size_ml,
      case_size,
      base_price,
      licensee_price,
      minimum_shelf_price,
      status,
      is_new,
      is_active,
      is_seeded,
      is_custom,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
    ON CONFLICT(external_key) DO UPDATE SET
      source = excluded.source,
      source_file = excluded.source_file,
      import_batch_id = excluded.import_batch_id,
      item_type = excluded.item_type,
      liquor_type_raw = excluded.liquor_type_raw,
      category = excluded.category,
      subcategory = excluded.subcategory,
      ada_number = excluded.ada_number,
      liquor_code = excluded.liquor_code,
      sku = excluded.sku,
      name = excluded.name,
      normalized_name = excluded.normalized_name,
      brand = excluded.brand,
      proof = excluded.proof,
      abv = excluded.abv,
      bottle_size_ml = excluded.bottle_size_ml,
      case_size = excluded.case_size,
      base_price = excluded.base_price,
      licensee_price = excluded.licensee_price,
      minimum_shelf_price = excluded.minimum_shelf_price,
      status = excluded.status,
      is_new = excluded.is_new,
      is_active = excluded.is_active,
      is_seeded = 1,
      updated_at = excluded.updated_at`,
    values,
  );

  const catalogItemId = await findCatalogItemId(db, record.externalKey);

  for (const [name, value] of Object.entries(record.attributes ?? {})) {
    await db.executeAsync(
      `INSERT INTO catalog_item_attributes (
        catalog_item_id,
        name,
        value,
        value_type,
        updated_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(catalog_item_id, name) DO UPDATE SET
        value = excluded.value,
        value_type = excluded.value_type,
        updated_at = excluded.updated_at`,
      [
        catalogItemId,
        name,
        sqlValue(serializeAttributeValue(value)),
        attributeValueType(value),
        updatedAt,
      ],
    );
  }

  return catalogItemId;
}

export async function countCatalogItems(db: SqlExecutor): Promise<number> {
  const result = await db.executeAsync<SQLiteItem>('SELECT COUNT(*) AS count FROM catalog_items');
  const count = result.rows?._array[0]?.count;

  return typeof count === 'number' ? count : Number(count ?? 0);
}
