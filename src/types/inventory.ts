export type InventoryCategory =
  | 'spirit'
  | 'liqueur'
  | 'wine'
  | 'beer'
  | 'mixer'
  | 'bitters'
  | 'syrup'
  | 'juice'
  | 'garnish'
  | 'tool'
  | 'glassware'
  | 'other';

export type InventoryUnit = 'bottle' | 'ml' | 'oz' | 'count';

export type InventoryVisibility = 'guest_visible' | 'private' | 'shared';

export type InventoryHolding = {
  amount: number;
  id: string;
  label: string;
};

export type InventoryItem = {
  abv?: number;
  archivedAt?: string | null;
  brand?: string | null;
  category: InventoryCategory;
  createdAt?: string;
  description?: string;
  holdings?: Array<InventoryHolding>;
  id: string;
  imageUri?: string;
  isArchived?: boolean;
  isOpen?: boolean;
  minStock: number;
  name: string;
  notes?: string;
  productType?: string;
  proof?: number | null;
  publicNotes?: string | null;
  quantity: number;
  rating?: number;
  ratingComments?: string;
  size?: string | null;
  subcategory?: string | null;
  tags?: Array<string>;
  updatedAt?: string;
  unit: InventoryUnit;
  visibility?: InventoryVisibility;
};

export type GuestVisibleBarItem = {
  brand?: string | null;
  category: InventoryCategory;
  id: string;
  name: string;
  publicNotes?: string | null;
  subcategory?: string | null;
  tags?: Array<string>;
};
