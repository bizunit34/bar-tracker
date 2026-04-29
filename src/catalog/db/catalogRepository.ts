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

  if (Array.isArray(value)) {
    return 'array';
  }

  return typeof value;
}

function serializeAttributeValue(value: CatalogImportAttributeValue): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function nullableSqlValue(value: SQLiteValue | null): SQLiteValue {
  return value ?? '';
}

function sqliteInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (typeof value === 'string') {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

async function getNextCatalogItemId(db: SqlExecutor): Promise<number> {
  const result = await db.executeAsync<SQLiteItem>('SELECT MAX(id) AS max_id FROM catalog_items');
  const maxId = sqliteInteger(result.rows?._array[0]?.max_id);

  return (maxId ?? 0) + 1;
}

async function findCatalogItemId(db: SqlExecutor, externalKey: string): Promise<number> {
  const result = await db.executeAsync<SQLiteItem>(
    'SELECT id FROM catalog_items WHERE external_key = ? LIMIT 1',
    [externalKey],
  );
  const row = result.rows?._array[0];
  const id = sqliteInteger(row?.id);

  if (id === null) {
    throw new Error(`Catalog item upsert did not return an id for ${externalKey}.`);
  }

  return id;
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
    ) VALUES (?, ?, NULLIF(?, ''), ?, ?)`,
    [
      params.id,
      params.source,
      nullableSqlValue(params.sourceFile),
      params.recordCount,
      params.importedAt,
    ],
  );
}

export async function upsertCatalogImportRecord(
  db: SqlExecutor,
  record: NormalizedCatalogImportRecord,
  updatedAt: string,
): Promise<number> {
  const nextId = await getNextCatalogItemId(db);
  const values: Array<SQLiteValue> = [
    nextId,
    record.externalKey,
    record.source,
    nullableSqlValue(record.sourceFile),
    nullableSqlValue(record.importBatchId),
    record.itemType,
    nullableSqlValue(record.liquorTypeRaw),
    nullableSqlValue(record.category),
    nullableSqlValue(record.subcategory),
    nullableSqlValue(record.adaNumber),
    nullableSqlValue(record.liquorCode),
    nullableSqlValue(record.sku),
    record.name,
    record.normalizedName,
    nullableSqlValue(record.brand),
    nullableSqlValue(record.proof),
    nullableSqlValue(record.abv),
    nullableSqlValue(record.bottleSizeMl),
    nullableSqlValue(record.caseSize),
    nullableSqlValue(record.basePrice),
    nullableSqlValue(record.licenseePrice),
    nullableSqlValue(record.minimumShelfPrice),
    nullableSqlValue(record.status),
    boolToInt(record.isNew),
    boolToInt(record.isActive),
    updatedAt,
    updatedAt,
  ];

  await db.executeAsync(
    `INSERT INTO catalog_items (
      id,
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
    ) VALUES (
      ?,
      ?,
      ?,
      NULLIF(?, ''),
      NULLIF(?, ''),
      ?,
      NULLIF(?, ''),
      NULLIF(?, ''),
      NULLIF(?, ''),
      NULLIF(?, ''),
      NULLIF(?, ''),
      NULLIF(?, ''),
      ?,
      ?,
      NULLIF(?, ''),
      NULLIF(?, ''),
      NULLIF(?, ''),
      NULLIF(?, ''),
      NULLIF(?, ''),
      NULLIF(?, ''),
      NULLIF(?, ''),
      NULLIF(?, ''),
      NULLIF(?, ''),
      ?,
      ?,
      1,
      0,
      ?,
      ?
    )
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
      ) VALUES (?, ?, NULLIF(?, ''), ?, ?)
      ON CONFLICT(catalog_item_id, name) DO UPDATE SET
        value = excluded.value,
        value_type = excluded.value_type,
        updated_at = excluded.updated_at`,
      [
        catalogItemId,
        name,
        nullableSqlValue(serializeAttributeValue(value)),
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
