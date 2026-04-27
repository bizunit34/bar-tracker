import { normalizeIngredientName } from './inventoryNormalization';
import { FavoriteRecipeSummary, TasteProfile } from './recipeAiTypes';

const baseSpiritNames = [
  'vodka',
  'gin',
  'rum',
  'tequila',
  'mezcal',
  'whiskey',
  'whisky',
  'bourbon',
  'rye',
  'scotch',
  'brandy',
  'cognac',
  'liqueur',
];

function topCounts(values: Array<string>, limit = 8): Array<string> {
  const counts = new Map<string, number>();

  values.forEach((value: string): void => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return [...counts.entries()]
    .sort((left, right): number => {
      return right[1] - left[1];
    })
    .slice(0, limit)
    .map(([value]): string => {
      return value;
    });
}

export function buildTasteProfileFromFavorites(
  favoriteRecipes: Array<FavoriteRecipeSummary>,
): TasteProfile {
  const ingredients = favoriteRecipes.flatMap((recipe: FavoriteRecipeSummary): Array<string> => {
    return recipe.ingredients.map(normalizeIngredientName);
  });
  const tags = favoriteRecipes.flatMap((recipe: FavoriteRecipeSummary): Array<string> => {
    return recipe.tags ?? [];
  });
  const preferredBaseSpirits = baseSpiritNames.filter((spirit: string): boolean => {
    return ingredients.some((ingredient: string): boolean => {
      return ingredient.includes(spirit);
    });
  });
  const strengthTags = tags.filter((tag: string): boolean => {
    return ['low', 'medium', 'non_alcoholic', 'strong'].includes(tag);
  });

  return {
    avoidedIngredients: [],
    averagePreferredStrength:
      (topCounts(strengthTags, 1)[0] as TasteProfile['averagePreferredStrength']) ?? null,
    commonIngredients: topCounts(ingredients),
    preferredBaseSpirits,
    preferredFlavorTags: topCounts(tags),
    preferredStyles: topCounts(tags),
  };
}
