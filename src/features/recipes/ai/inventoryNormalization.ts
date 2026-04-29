import { BarInventoryIngredient, NormalizedInventoryIngredient } from './recipeAiTypes';

const ingredientAliases: Record<string, Array<string>> = {
  'angostura bitters': ['aromatic bitters', 'ango bitters'],
  'aromatic bitters': ['angostura bitters', 'ango bitters'],
  'club soda': ['soda water', 'sparkling water'],
  'cocktail cherry': ['maraschino cherry', 'brandied cherry'],
  'dry vermouth': ['french vermouth', 'white vermouth'],
  'ginger beer': ['spicy ginger beer'],
  'lemon juice': ['fresh lemon juice', 'juice of lemon'],
  'lemon peel': ['lemon twist', 'lemon zest'],
  'lime juice': ['fresh lime juice', 'juice of lime'],
  'orange peel': ['orange twist', 'orange zest'],
  'rich simple syrup': ['2:1 syrup', 'rich syrup'],
  'simple syrup': ['sugar syrup', '1:1 syrup'],
  'sweet vermouth': ['red vermouth', 'rosso vermouth'],
  'triple sec': ['orange liqueur', 'curacao', 'curaçao'],
};

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
  const normalizedName = normalizeIngredientName(ingredient.name);

  if (ingredient.category) {
    aliases.add(normalizeIngredientName(ingredient.category));
  }

  for (const alias of ingredientAliases[normalizedName] ?? []) {
    aliases.add(normalizeIngredientName(alias));
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
