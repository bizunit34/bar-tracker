import { SQLiteItem } from 'react-native-nitro-sqlite';

import { initializeCatalogDatabase } from '../catalog/db/client';
import { LocalShareLinkRecord } from '../types/shareLinks';

// TODO: These management records are device-local until account-backed share ownership exists.
type LocalShareLinkRow = SQLiteItem & {
  created_at: string;
  description?: string | null;
  disabled_at?: string | null;
  id: string;
  management_token: string;
  share_url: string;
  slug: string;
  title: string;
  updated_at: string;
};

function nullableSqlValue(value: string | null | undefined): string {
  return value ?? '';
}

function mapRowToRecord(row: LocalShareLinkRow): LocalShareLinkRecord {
  return {
    createdAt: row.created_at,
    description: row.description || null,
    disabledAt: row.disabled_at || null,
    id: row.id,
    managementToken: row.management_token,
    shareUrl: row.share_url,
    slug: row.slug,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

export async function listLocalShareLinks(): Promise<Array<LocalShareLinkRecord>> {
  const db = await initializeCatalogDatabase();
  const result = await db.executeAsync<LocalShareLinkRow>(
    'SELECT * FROM local_share_links ORDER BY updated_at DESC',
  );

  return (result.rows?._array ?? []).map(mapRowToRecord);
}

export async function saveLocalShareLink(
  record: LocalShareLinkRecord,
): Promise<LocalShareLinkRecord> {
  const db = await initializeCatalogDatabase();
  const normalizedRecord: LocalShareLinkRecord = {
    ...record,
    description: record.description?.trim() || null,
    disabledAt: record.disabledAt ?? null,
    title: record.title.trim() || 'Shared Bar',
    updatedAt: new Date().toISOString(),
  };

  await db.executeAsync(
    `INSERT INTO local_share_links (
      id,
      slug,
      share_url,
      title,
      description,
      management_token,
      created_at,
      updated_at,
      disabled_at
    ) VALUES (?, ?, ?, ?, NULLIF(?, ''), ?, ?, ?, NULLIF(?, ''))
    ON CONFLICT(slug) DO UPDATE SET
      share_url = excluded.share_url,
      title = excluded.title,
      description = excluded.description,
      management_token = excluded.management_token,
      updated_at = excluded.updated_at,
      disabled_at = excluded.disabled_at`,
    [
      normalizedRecord.id,
      normalizedRecord.slug,
      normalizedRecord.shareUrl,
      normalizedRecord.title,
      nullableSqlValue(normalizedRecord.description),
      normalizedRecord.managementToken,
      normalizedRecord.createdAt,
      normalizedRecord.updatedAt,
      nullableSqlValue(normalizedRecord.disabledAt),
    ],
  );

  return normalizedRecord;
}

export async function markLocalShareLinkDisabled(
  slug: string,
  disabledAt: string = new Date().toISOString(),
): Promise<LocalShareLinkRecord | null> {
  const db = await initializeCatalogDatabase();

  await db.executeAsync(
    `UPDATE local_share_links
      SET disabled_at = ?,
        updated_at = ?
      WHERE slug = ?`,
    [disabledAt, new Date().toISOString(), slug],
  );

  const result = await db.executeAsync<LocalShareLinkRow>(
    'SELECT * FROM local_share_links WHERE slug = ? LIMIT 1',
    [slug],
  );
  const row = result.rows?._array?.[0];

  return row ? mapRowToRecord(row) : null;
}
