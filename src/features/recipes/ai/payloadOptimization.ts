import {
  FavoriteRecipeSummary,
  NormalizedInventoryIngredient,
  RecipeGenerationRequest,
} from './recipeAiTypes';

export const RECIPE_AI_PAYLOAD_LIMITS = {
  excludeIngredients: 20,
  favoriteRecipes: 20,
  guidelineLength: 300,
  includeIngredients: 10,
  inventoryItems: 80,
};

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactStrings(values: Array<string>, limit: number): Array<string> {
  const seen = new Set<string>();
  const compact: Array<string> = [];

  values.forEach((value: string): void => {
    const trimmed = value.trim();
    const key = normalize(trimmed);

    if (!trimmed || !key || seen.has(key) || compact.length >= limit) {
      return;
    }

    seen.add(key);
    compact.push(trimmed);
  });

  return compact;
}

function inventoryPriority(
  item: NormalizedInventoryIngredient,
  includeIngredients: Array<string>,
): number {
  const name = normalize(item.name);
  const category = normalize(item.category ?? '');
  const searchable = `${name} ${category}`;

  if (
    includeIngredients.some((ingredient: string): boolean => {
      return name.includes(normalize(ingredient));
    })
  ) {
    return 0;
  }

  if (
    item.isAlcoholic ||
    /whiskey|whisky|bourbon|rye|scotch|vodka|gin|rum|tequila|mezcal|brandy|cognac/.test(searchable)
  ) {
    return 1;
  }

  if (/liqueur|amaro|cordial/.test(searchable)) {
    return 2;
  }

  if (/bitter/.test(searchable)) {
    return 3;
  }

  if (/soda|tonic|ginger beer|ginger ale|mixer|cola/.test(searchable)) {
    return 4;
  }

  if (/syrup|orgeat|grenadine/.test(searchable)) {
    return 5;
  }

  if (/juice|lemon|lime|orange|cranberry|pineapple/.test(searchable)) {
    return 6;
  }

  if (/garnish|mint|peel|cherry|olive/.test(searchable)) {
    return 7;
  }

  return 8;
}

function compactInventory(
  inventory: Array<NormalizedInventoryIngredient>,
  includeIngredients: Array<string>,
): Array<NormalizedInventoryIngredient> {
  return [...inventory]
    .sort((left: NormalizedInventoryIngredient, right: NormalizedInventoryIngredient): number => {
      return (
        inventoryPriority(left, includeIngredients) - inventoryPriority(right, includeIngredients)
      );
    })
    .slice(0, RECIPE_AI_PAYLOAD_LIMITS.inventoryItems)
    .map((item: NormalizedInventoryIngredient): NormalizedInventoryIngredient => {
      return {
        aliases: compactStrings(item.aliases, 4).filter((alias: string): boolean => {
          return normalize(alias) !== item.normalizedName;
        }),
        amountAvailable: item.amountAvailable ?? null,
        category: item.category ?? null,
        id: item.id,
        isAlcoholic: item.isAlcoholic,
        isAvailable: item.isAvailable,
        name: item.name,
        normalizedName: item.normalizedName,
        unit: item.unit ?? null,
      };
    });
}

function compactFavorite(recipe: FavoriteRecipeSummary): FavoriteRecipeSummary {
  return {
    id: recipe.id,
    ingredients: compactStrings(recipe.ingredients, 12),
    name: recipe.name,
    rating: recipe.rating ?? null,
    tags: recipe.tags ? compactStrings(recipe.tags, 8) : undefined,
  };
}

export function optimizeRecipeGenerationRequest(
  request: RecipeGenerationRequest,
): RecipeGenerationRequest {
  const includeIngredients = compactStrings(
    request.preferences.includeIngredients,
    RECIPE_AI_PAYLOAD_LIMITS.includeIngredients,
  );
  const excludeIngredients = compactStrings(
    request.preferences.excludeIngredients,
    RECIPE_AI_PAYLOAD_LIMITS.excludeIngredients,
  );

  return {
    ...request,
    favoriteRecipes:
      request.mode === 'favorites'
        ? request.favoriteRecipes
            ?.slice(0, RECIPE_AI_PAYLOAD_LIMITS.favoriteRecipes)
            .map(compactFavorite)
        : undefined,
    normalizedInventory: compactInventory(request.normalizedInventory, includeIngredients),
    preferences: {
      ...request.preferences,
      additionalGuidelines: request.preferences.additionalGuidelines
        ?.trim()
        .slice(0, RECIPE_AI_PAYLOAD_LIMITS.guidelineLength),
      excludeIngredients,
      includeIngredients,
    },
  };
}
