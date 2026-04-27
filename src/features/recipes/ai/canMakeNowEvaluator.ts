import {
  ALWAYS_ASSUMED_AVAILABLE_INGREDIENTS,
  ASSUMED_KITCHEN_TOOLS,
} from '../data/recipeConstants';
import { Recipe, RecipeIngredient } from '../types';
import { findInventoryMatch, normalizeIngredientName } from './inventoryNormalization';
import { BarTool, NormalizedInventoryIngredient } from './recipeAiTypes';

export type RecipeAvailabilityEvaluation = {
  canMakeNow: boolean;
  missingIngredients: Array<string>;
  missingRequiredIngredients: Array<string>;
  missingTools: Array<string>;
  summary: string;
};

function isAlwaysAvailableIngredient(name: string): boolean {
  const normalizedName = normalizeIngredientName(name);

  return ALWAYS_ASSUMED_AVAILABLE_INGREDIENTS.some((ingredient: string): boolean => {
    return normalizeIngredientName(ingredient) === normalizedName;
  });
}

function isAssumedKitchenTool(name: string): boolean {
  const normalizedName = normalizeIngredientName(name);

  return ASSUMED_KITCHEN_TOOLS.some((tool: string): boolean => {
    return normalizeIngredientName(tool) === normalizedName;
  });
}

function hasAvailableBarTool(name: string, tools: Array<BarTool>): boolean {
  const normalizedName = normalizeIngredientName(name);

  return tools.some((tool: BarTool): boolean => {
    return tool.available && normalizeIngredientName(tool.name) === normalizedName;
  });
}

function getMissingIngredient(
  ingredient: RecipeIngredient,
  inventory: Array<NormalizedInventoryIngredient>,
): string | null {
  if (
    findInventoryMatch(ingredient.name, inventory) ||
    isAlwaysAvailableIngredient(ingredient.name)
  ) {
    return null;
  }

  return ingredient.name;
}

export function evaluateRecipeAvailability(
  recipe: Recipe,
  inventory: Array<NormalizedInventoryIngredient>,
  tools: Array<BarTool>,
): RecipeAvailabilityEvaluation {
  const missingIngredients = recipe.ingredients
    .map((ingredient: RecipeIngredient): { ingredient: RecipeIngredient; name: string | null } => {
      return {
        ingredient,
        name: getMissingIngredient(ingredient, inventory),
      };
    })
    .filter((missing): missing is { ingredient: RecipeIngredient; name: string } => {
      return missing.name !== null;
    });
  const missingRequiredIngredients = missingIngredients
    .filter((missing): boolean => {
      return !missing.ingredient.optional;
    })
    .map((missing): string => {
      return missing.name;
    });
  const missingTools = (recipe.tools ?? []).filter((toolName: string): boolean => {
    return !isAssumedKitchenTool(toolName) && !hasAvailableBarTool(toolName, tools);
  });
  const canMakeNow = missingRequiredIngredients.length === 0 && missingTools.length === 0;

  return {
    canMakeNow,
    missingIngredients: missingIngredients.map((missing): string => {
      return missing.name;
    }),
    missingRequiredIngredients,
    missingTools,
    summary: canMakeNow
      ? 'Can make now with current inventory and tools.'
      : `Missing ${missingRequiredIngredients.length} required ingredient(s) and ${missingTools.length} bar tool(s).`,
  };
}
