import { InventoryItem } from '../../../types/inventory';
import { BarInventoryIngredient } from '../ai/recipeAiTypes';

export function normalizeIngredientTokens(value: string): Array<string> {
  return value
    .split(',')
    .map((token: string): string => {
      return token.trim().toLowerCase();
    })
    .filter((token: string): boolean => {
      return token.length > 0;
    });
}

export function mapInventoryToRecipeIngredients(
  items: Array<InventoryItem>,
): Array<BarInventoryIngredient> {
  return items
    .filter((item: InventoryItem): boolean => {
      return !item.isArchived;
    })
    .map((item: InventoryItem): BarInventoryIngredient => {
      return {
        category: item.category,
        id: item.id,
        isAlcoholic: item.category === 'spirit' || item.category === 'liqueur' || Boolean(item.abv),
        name: item.name,
        notes: item.notes ?? null,
        quantity: item.quantity,
        unit: item.unit,
      };
    });
}
