export const catalogSchemaStatements: Array<string> = [
  `CREATE TABLE IF NOT EXISTS import_batches (
    id TEXT PRIMARY KEY NOT NULL,
    source TEXT NOT NULL,
    source_file TEXT,
    record_count INTEGER NOT NULL DEFAULT 0,
    imported_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS catalog_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_key TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL,
    source_file TEXT,
    import_batch_id TEXT,
    item_type TEXT NOT NULL,
    liquor_type_raw TEXT,
    category TEXT,
    subcategory TEXT,
    ada_number TEXT,
    liquor_code TEXT,
    sku TEXT,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    brand TEXT,
    proof REAL,
    abv REAL,
    bottle_size_ml REAL,
    case_size REAL,
    base_price REAL,
    licensee_price REAL,
    minimum_shelf_price REAL,
    status TEXT,
    is_new INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    is_seeded INTEGER NOT NULL DEFAULT 0,
    is_custom INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (import_batch_id) REFERENCES import_batches(id)
  )`,
  `CREATE TABLE IF NOT EXISTS catalog_item_attributes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    catalog_item_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    value TEXT,
    value_type TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(catalog_item_id, name),
    FOREIGN KEY (catalog_item_id) REFERENCES catalog_items(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_catalog_items_normalized_name
    ON catalog_items(normalized_name)`,
  `CREATE INDEX IF NOT EXISTS idx_catalog_items_category
    ON catalog_items(category)`,
  `CREATE INDEX IF NOT EXISTS idx_catalog_items_liquor_code
    ON catalog_items(liquor_code)`,
];
