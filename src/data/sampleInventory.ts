import { InventoryItem } from '../types/inventory';

export const sampleInventory: Array<InventoryItem> = [
  {
    id: 'gin-london-dry',
    name: 'London Dry Gin',
    category: 'spirit',
    quantity: 2,
    unit: 'bottle',
    minStock: 1,
    notes: 'Great for martinis and gin & tonics.'
  },
  {
    id: 'rye-whiskey',
    name: 'Rye Whiskey',
    category: 'spirit',
    quantity: 1,
    unit: 'bottle',
    minStock: 1,
    notes: 'Base for Manhattans and Old Fashioneds.'
  },
  {
    id: 'vermouth-dry',
    name: 'Dry Vermouth',
    category: 'liqueur',
    quantity: 1,
    unit: 'bottle',
    minStock: 1
  },
  {
    id: 'vermouth-sweet',
    name: 'Sweet Vermouth',
    category: 'liqueur',
    quantity: 1,
    unit: 'bottle',
    minStock: 1
  },
  {
    id: 'orange-bitters',
    name: 'Orange Bitters',
    category: 'bitter',
    quantity: 60,
    unit: 'ml',
    minStock: 30
  },
  {
    id: 'angostura-bitters',
    name: 'Aromatic Bitters',
    category: 'bitter',
    quantity: 100,
    unit: 'ml',
    minStock: 60
  },
  {
    id: 'simple-syrup',
    name: 'Simple Syrup',
    category: 'mixer',
    quantity: 300,
    unit: 'ml',
    minStock: 150,
    notes: 'House-made; keep chilled.'
  },
  {
    id: 'lime-juice',
    name: 'Fresh Lime Juice',
    category: 'mixer',
    quantity: 6,
    unit: 'oz',
    minStock: 8,
    notes: 'Press fresh daily.'
  },
  {
    id: 'lemon-juice',
    name: 'Fresh Lemon Juice',
    category: 'mixer',
    quantity: 10,
    unit: 'oz',
    minStock: 8
  },
  {
    id: 'maraschino-cherries',
    name: 'Luxardo Maraschino Cherries',
    category: 'garnish',
    quantity: 1,
    unit: 'bottle',
    minStock: 1
  },
  {
    id: 'olives',
    name: 'Castelvetrano Olives',
    category: 'garnish',
    quantity: 0,
    unit: 'bottle',
    minStock: 1
  },
  {
    id: 'large-ice',
    name: 'Large Clear Ice',
    category: 'other',
    quantity: 8,
    unit: 'count',
    minStock: 12,
    notes: '2x2 cubes.'
  }
];
