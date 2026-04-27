import { initializeCatalogDatabase } from '../catalog/db/client';
import { InventoryCategory, InventoryItem } from '../types/inventory';
import { BarShareSettings } from '../types/sharing';

const SHARE_SETTINGS_ID = 'local-default';

type ShareSettingsRow = {
  id: string;
  settings_json: string;
  updated_at: string;
};

function isInventoryCategory(value: unknown): value is InventoryCategory {
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

function getDefaultIncludedCategories(items: Array<InventoryItem>): Array<InventoryCategory> {
  return Array.from(
    new Set(
      items
        .filter((item: InventoryItem): boolean => {
          return (
            !item.isArchived &&
            (item.visibility === 'shared' || item.visibility === 'guest_visible')
          );
        })
        .map((item: InventoryItem): InventoryCategory => {
          return item.category;
        }),
    ),
  );
}

export function createDefaultShareSettings(items: Array<InventoryItem> = []): BarShareSettings {
  const now = new Date().toISOString();

  return {
    createdAt: now,
    description: null,
    excludedItemIds: [],
    id: SHARE_SETTINGS_ID,
    includeBrand: true,
    includedCategories: getDefaultIncludedCategories(items),
    includePublicNotes: false,
    includeTags: true,
    title: 'My Bar',
    updatedAt: now,
    visibilityMode: 'guest_preview',
  };
}

function normalizeShareSettings(
  value: unknown,
  fallbackItems: Array<InventoryItem>,
): BarShareSettings {
  const fallback = createDefaultShareSettings(fallbackItems);

  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const settings = value as Partial<BarShareSettings>;

  return {
    createdAt: typeof settings.createdAt === 'string' ? settings.createdAt : fallback.createdAt,
    description:
      typeof settings.description === 'string' && settings.description.trim().length > 0
        ? settings.description
        : null,
    excludedItemIds: Array.isArray(settings.excludedItemIds)
      ? settings.excludedItemIds.filter((id: unknown): id is string => {
          return typeof id === 'string';
        })
      : [],
    id: SHARE_SETTINGS_ID,
    includeBrand:
      typeof settings.includeBrand === 'boolean' ? settings.includeBrand : fallback.includeBrand,
    includedCategories: Array.isArray(settings.includedCategories)
      ? settings.includedCategories.filter(isInventoryCategory)
      : fallback.includedCategories,
    includePublicNotes:
      typeof settings.includePublicNotes === 'boolean'
        ? settings.includePublicNotes
        : fallback.includePublicNotes,
    includeTags:
      typeof settings.includeTags === 'boolean' ? settings.includeTags : fallback.includeTags,
    title:
      typeof settings.title === 'string' && settings.title.trim().length > 0
        ? settings.title
        : fallback.title,
    updatedAt: typeof settings.updatedAt === 'string' ? settings.updatedAt : fallback.updatedAt,
    visibilityMode:
      settings.visibilityMode === 'private' || settings.visibilityMode === 'guest_preview'
        ? settings.visibilityMode
        : fallback.visibilityMode,
  };
}

export async function getShareSettings(
  fallbackItems: Array<InventoryItem> = [],
): Promise<BarShareSettings> {
  const db = await initializeCatalogDatabase();
  const result = await db.executeAsync<ShareSettingsRow>(
    'SELECT * FROM bar_share_settings WHERE id = ? LIMIT 1',
    [SHARE_SETTINGS_ID],
  );
  const row = result.rows?._array?.[0];

  if (!row) {
    return createDefaultShareSettings(fallbackItems);
  }

  try {
    return normalizeShareSettings(JSON.parse(row.settings_json), fallbackItems);
  } catch {
    return createDefaultShareSettings(fallbackItems);
  }
}

export async function saveShareSettings(settings: BarShareSettings): Promise<BarShareSettings> {
  const db = await initializeCatalogDatabase();
  const normalizedSettings = normalizeShareSettings(
    {
      ...settings,
      id: SHARE_SETTINGS_ID,
      updatedAt: new Date().toISOString(),
    },
    [],
  );

  await db.executeAsync(
    `INSERT INTO bar_share_settings (
      id,
      settings_json,
      updated_at
    ) VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      settings_json = excluded.settings_json,
      updated_at = excluded.updated_at`,
    [normalizedSettings.id, JSON.stringify(normalizedSettings), normalizedSettings.updatedAt],
  );

  return normalizedSettings;
}

export async function resetShareSettings(
  fallbackItems: Array<InventoryItem> = [],
): Promise<BarShareSettings> {
  const settings = createDefaultShareSettings(fallbackItems);

  return saveShareSettings(settings);
}
