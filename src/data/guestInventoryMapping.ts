import { GuestVisibleBarItem, InventoryItem } from '../types/inventory';
import { BarShareSettings } from '../types/sharing';

export function mapInventoryItemToGuestVisibleItem(
  item: InventoryItem,
  settings?: BarShareSettings,
): GuestVisibleBarItem | null {
  if (item.isArchived || (item.visibility !== 'shared' && item.visibility !== 'guest_visible')) {
    return null;
  }

  if (settings) {
    if (settings.visibilityMode !== 'guest_preview') {
      return null;
    }

    if (!settings.includedCategories.includes(item.category)) {
      return null;
    }

    if (settings.excludedItemIds.includes(item.id)) {
      return null;
    }
  }

  return {
    brand: settings?.includeBrand === false ? null : (item.brand ?? null),
    category: item.category,
    id: item.id,
    name: item.name,
    publicNotes: settings?.includePublicNotes ? (item.publicNotes ?? null) : null,
    subcategory: item.subcategory ?? item.productType ?? null,
    tags: settings?.includeTags === false ? [] : (item.tags ?? []),
  };
}

export function mapInventoryToGuestVisibleItems(
  items: Array<InventoryItem>,
  settings?: BarShareSettings,
): Array<GuestVisibleBarItem> {
  return items
    .map((item: InventoryItem): GuestVisibleBarItem | null => {
      return mapInventoryItemToGuestVisibleItem(item, settings);
    })
    .filter((item): item is GuestVisibleBarItem => {
      return item !== null;
    });
}
