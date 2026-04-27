import { GeneratedCocktailRecipe, MissingIngredientPolicy } from './recipeAiTypes';

export const DEFAULT_MISSING_INGREDIENT_POLICY: MissingIngredientPolicy = {
  allowMissingCommonMixers: false,
  allowMissingCoreAlcohol: false,
  allowMissingGarnish: false,
  maxMissingIngredients: 0,
};

export function countMissingIngredients(recipe: GeneratedCocktailRecipe): number {
  return recipe.ingredients.filter((ingredient): boolean => {
    return !ingredient.inBar;
  }).length;
}

export function recipeSatisfiesMissingIngredientPolicy(
  recipe: GeneratedCocktailRecipe,
  policy: MissingIngredientPolicy,
): boolean {
  return countMissingIngredients(recipe) <= policy.maxMissingIngredients;
}
