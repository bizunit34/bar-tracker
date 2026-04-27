import { BarTool } from '../ai/recipeAiTypes';

export const ALWAYS_ASSUMED_AVAILABLE_INGREDIENTS: Array<string> = ['ice', 'water'];

export const ASSUMED_KITCHEN_TOOLS: Array<string> = [
  'knife',
  'cutting board',
  'measuring spoons',
  'cup',
  'spoon',
  'small saucepan',
  'refrigerator',
  'freezer',
];

export const NEVER_ASSUME_INGREDIENTS: Array<string> = [
  'lemon',
  'lemons',
  'lime',
  'limes',
  'lemon juice',
  'lime juice',
  'simple syrup',
  'bitters',
  'angostura bitters',
  'orange bitters',
  'tonic water',
  'soda water',
  'club soda',
  'ginger beer',
  'ginger ale',
  'vermouth',
  'sweet vermouth',
  'dry vermouth',
  'orange juice',
  'cranberry juice',
  'pineapple juice',
  'cream',
  'egg white',
  'mint',
  'salt',
  'sugar',
];

export const assumedKitchenTools = ASSUMED_KITCHEN_TOOLS;

export const knownBarTools: Array<BarTool> = [
  { available: false, id: 'shaker', name: 'Shaker' },
  { available: false, id: 'jigger', name: 'Jigger' },
  { available: false, id: 'bar-spoon', name: 'Bar spoon' },
  { available: false, id: 'strainer', name: 'Strainer' },
  { available: false, id: 'muddler', name: 'Muddler' },
  { available: false, id: 'mixing-glass', name: 'Mixing glass' },
  { available: false, id: 'citrus-press', name: 'Citrus press' },
  { available: false, id: 'blender', name: 'Blender' },
  { available: false, id: 'ice-mold', name: 'Ice mold' },
  { available: false, id: 'peeler', name: 'Peeler' },
  { available: false, id: 'fine-mesh-strainer', name: 'Fine mesh strainer' },
];
