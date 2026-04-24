export type InventoryCategory = 'spirit' | 'liqueur' | 'mixer' | 'garnish' | 'bitter' | 'other';

export type InventoryUnit = 'bottle' | 'ml' | 'oz' | 'count';

export type InventoryItem = {
  id: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: InventoryUnit;
  minStock: number;
  notes?: string;
};
