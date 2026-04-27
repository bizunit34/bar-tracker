import { InventoryCategory } from './inventory';

export type BarShareVisibilityMode = 'guest_preview' | 'private';

export type BarShareSettings = {
  createdAt: string;
  description?: string | null;
  excludedItemIds: Array<string>;
  id: string;
  includeBrand: boolean;
  includedCategories: Array<InventoryCategory>;
  includePublicNotes: boolean;
  includeTags: boolean;
  title: string;
  updatedAt: string;
  visibilityMode: BarShareVisibilityMode;
};
