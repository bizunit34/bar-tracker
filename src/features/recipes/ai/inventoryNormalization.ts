import { BarInventoryIngredient, NormalizedInventoryIngredient } from './recipeAiTypes';

export function normalizeIngredientName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getAliases(ingredient: BarInventoryIngredient): Array<string> {
  const aliases = new Set<string>();

  if (ingredient.category) {
    aliases.add(normalizeIngredientName(ingredient.category));
  }

  return [...aliases].filter((alias: string): boolean => {
    return alias.length > 0;
  });
}

export function normalizeInventoryForRecipeGeneration(
  inventory: Array<BarInventoryIngredient>,
): Array<NormalizedInventoryIngredient> {
  return inventory.map((ingredient: BarInventoryIngredient): NormalizedInventoryIngredient => {
    return {
      aliases: getAliases(ingredient),
      amountAvailable: ingredient.quantity ?? null,
      category: ingredient.category ?? null,
      id: ingredient.id,
      isAlcoholic: ingredient.isAlcoholic,
      isAvailable: true,
      name: ingredient.name,
      normalizedName: normalizeIngredientName(ingredient.name),
      notes: ingredient.notes ?? null,
      unit: ingredient.unit ?? null,
    };
  });
}

export function findInventoryMatch(
  ingredientName: string,
  inventory: Array<NormalizedInventoryIngredient>,
): NormalizedInventoryIngredient | null {
  const normalizedIngredientName = normalizeIngredientName(ingredientName);

  return (
    inventory.find((ingredient: NormalizedInventoryIngredient): boolean => {
      return (
        ingredient.normalizedName === normalizedIngredientName ||
        ingredient.aliases.includes(normalizedIngredientName)
      );
    }) ?? null
  );
}
