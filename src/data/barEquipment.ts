import { InventoryCategory, InventoryItem } from '../types/inventory';
import { listItems, saveItem } from './barInventoryRepository';

export type AvailableBarTool = {
  available: boolean;
  id: string;
  name: string;
  normalizedName: string;
};

export type AvailableGlassware = {
  available: boolean;
  id: string;
  name: string;
  normalizedName: string;
};

type AvailableEquipment = AvailableBarTool | AvailableGlassware;

export const commonBarTools = [
  'shaker',
  'jigger',
  'bar spoon',
  'strainer',
  'muddler',
  'mixing glass',
  'citrus press',
  'blender',
  'fine mesh strainer',
  'peeler',
  'ice mold',
  'bottle opener',
  'corkscrew',
];

export const commonGlassware = [
  'rocks glass',
  'highball glass',
  'coupe',
  'martini glass',
  'Nick & Nora',
  'Collins glass',
  'wine glass',
  'champagne flute',
  'shot glass',
  'mule mug',
  'margarita glass',
];

export function normalizeEquipmentName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function createEquipmentId(
  category: InventoryCategory,
  name: string,
  items: Array<InventoryItem>,
): string {
  const baseId = `${category}-${normalizeEquipmentName(name).replace(/\s+/g, '-') || 'item'}`;
  const existingIds = new Set(
    items.map((item: InventoryItem): string => {
      return item.id;
    }),
  );

  if (!existingIds.has(baseId)) {
    return baseId;
  }

  let suffix = 2;

  while (existingIds.has(`${baseId}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseId}-${suffix}`;
}

function findEquipmentItem(
  category: InventoryCategory,
  name: string,
  items: Array<InventoryItem>,
): InventoryItem | null {
  const normalizedName = normalizeEquipmentName(name);

  return (
    items.find((item: InventoryItem): boolean => {
      return item.category === category && normalizeEquipmentName(item.name) === normalizedName;
    }) ?? null
  );
}

function buildAvailableEquipment(
  category: InventoryCategory,
  suggestions: Array<string>,
  items: Array<InventoryItem>,
): Array<AvailableEquipment> {
  const suggestionNames = new Set(
    suggestions.map((name: string): string => {
      return normalizeEquipmentName(name);
    }),
  );
  const rows = suggestions.map((name: string): AvailableEquipment => {
    const item = findEquipmentItem(category, name, items);

    return {
      available: Boolean(item && !item.isArchived),
      id: item?.id ?? `${category}-suggestion-${normalizeEquipmentName(name).replace(/\s+/g, '-')}`,
      name: item?.name ?? name,
      normalizedName: normalizeEquipmentName(item?.name ?? name),
    };
  });

  const customRows = items
    .filter((item: InventoryItem): boolean => {
      return item.category === category && !suggestionNames.has(normalizeEquipmentName(item.name));
    })
    .map((item: InventoryItem): AvailableEquipment => {
      return {
        available: !item.isArchived,
        id: item.id,
        name: item.name,
        normalizedName: normalizeEquipmentName(item.name),
      };
    });

  return [...rows, ...customRows].sort(
    (left: AvailableEquipment, right: AvailableEquipment): number => {
      if (left.available !== right.available) {
        return left.available ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    },
  );
}

async function ensureEquipmentItem(
  category: InventoryCategory,
  name: string,
): Promise<InventoryItem> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error('Equipment name is required.');
  }

  const items = await listItems();
  const existingItem = findEquipmentItem(category, trimmedName, items);

  if (existingItem) {
    return saveItem({
      ...existingItem,
      archivedAt: null,
      isArchived: false,
      quantity: Math.max(existingItem.quantity, 1),
      unit: 'count',
      updatedAt: new Date().toISOString(),
    });
  }

  return saveItem({
    category,
    id: createEquipmentId(category, trimmedName, items),
    isArchived: false,
    isOpen: false,
    minStock: 0,
    name: trimmedName,
    publicNotes: null,
    quantity: 1,
    tags: category === 'tool' ? ['bar tool'] : ['glassware'],
    unit: 'count',
    visibility: 'private',
  });
}

export function listAvailableTools(items: Array<InventoryItem>): Array<AvailableBarTool> {
  return buildAvailableEquipment('tool', commonBarTools, items) as Array<AvailableBarTool>;
}

export function listAvailableGlassware(items: Array<InventoryItem>): Array<AvailableGlassware> {
  return buildAvailableEquipment('glassware', commonGlassware, items) as Array<AvailableGlassware>;
}

export async function ensureToolItem(name: string): Promise<InventoryItem> {
  return ensureEquipmentItem('tool', name);
}

export async function ensureGlasswareItem(name: string): Promise<InventoryItem> {
  return ensureEquipmentItem('glassware', name);
}

export function isToolAvailable(name: string, items: Array<InventoryItem>): boolean {
  return Boolean(
    findEquipmentItem('tool', name, items) && !findEquipmentItem('tool', name, items)?.isArchived,
  );
}

export function isGlasswareAvailable(name: string, items: Array<InventoryItem>): boolean {
  return Boolean(
    findEquipmentItem('glassware', name, items) &&
    !findEquipmentItem('glassware', name, items)?.isArchived,
  );
}
