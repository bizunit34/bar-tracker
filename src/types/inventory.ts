export type InventoryCategory = 'spirit' | 'liqueur' | 'mixer' | 'garnish' | 'bitter' | 'other';

export type InventoryUnit = 'bottle' | 'ml' | 'oz' | 'count';

export type InventoryHolding = {
  amount: number;
  id: string;
  label: string;
};

export type InventoryItem = {
  abv?: number;
  category: InventoryCategory;
  description?: string;
  holdings?: Array<InventoryHolding>;
  id: string;
  imageUri?: string;
  isArchived?: boolean;
  minStock: number;
  name: string;
  notes?: string;
  productType?: string;
  quantity: number;
  rating?: number;
  ratingComments?: string;
  unit: InventoryUnit;
};
