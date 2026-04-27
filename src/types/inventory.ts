export type InventoryCategory = 'spirit' | 'liqueur' | 'mixer' | 'garnish' | 'bitter' | 'other';

export type InventoryUnit = 'bottle' | 'ml' | 'oz' | 'count';

export type InventoryItem = {
  abv?: number;
  id: string;
  name: string;
  category: InventoryCategory;
  description?: string;
  productType?: string;
  quantity: number;
  rating?: number;
  ratingComments?: string;
  unit: InventoryUnit;
  minStock: number;
  notes?: string;
};
