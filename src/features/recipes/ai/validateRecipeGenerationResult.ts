import { ALWAYS_ASSUMED_AVAILABLE_INGREDIENTS } from '../data/recipeConstants';
import { findInventoryMatch, normalizeIngredientName } from './inventoryNormalization';
import { recipeSatisfiesMissingIngredientPolicy } from './missingIngredientPolicy';
import {
  GeneratedCocktailRecipe,
  GeneratedRecipeIngredient,
  MissingIngredientPolicy,
  NormalizedInventoryIngredient,
  RecipeGenerationPreferences,
  RecipeGenerationResult,
} from './recipeAiTypes';

type ValidationContext = {
  inventory: Array<NormalizedInventoryIngredient>;
  missingIngredientPolicy: MissingIngredientPolicy;
  preferences: RecipeGenerationPreferences;
};

function assertString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid recipe generation result: ${fieldName} is required.`);
  }

  return value;
}

function assertStringArray(value: unknown, fieldName: string): Array<string> {
  if (
    !Array.isArray(value) ||
    !value.every((item: unknown): boolean => {
      return typeof item === 'string';
    })
  ) {
    throw new Error(`Invalid recipe generation result: ${fieldName} must be a string array.`);
  }

  return value.map((item: unknown): string => {
    return String(item);
  });
}

function isAlwaysAssumedIngredient(name: string): boolean {
  const normalizedName = normalizeIngredientName(name);

  return ALWAYS_ASSUMED_AVAILABLE_INGREDIENTS.some((ingredient: string): boolean => {
    return normalizeIngredientName(ingredient) === normalizedName;
  });
}

function validateIngredient(value: unknown, context: ValidationContext): GeneratedRecipeIngredient {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid recipe ingredient.');
  }

  const ingredient = value as Partial<GeneratedRecipeIngredient>;
  const name = assertString(ingredient.name, 'ingredient.name');
  const amount = assertString(ingredient.amount, 'ingredient.amount');
  const isInInventory = Boolean(findInventoryMatch(name, context.inventory));
  const isAssumed = isAlwaysAssumedIngredient(name);
  const shouldBeInBar = isInInventory || isAssumed;
  const excluded = context.preferences.excludeIngredients.some(
    (excludedIngredient: string): boolean => {
      return normalizeIngredientName(name).includes(normalizeIngredientName(excludedIngredient));
    },
  );

  if (excluded) {
    throw new Error(`Generated recipe included excluded ingredient: ${name}.`);
  }

  if (context.preferences.strengthPreference === 'non_alcoholic') {
    const match = findInventoryMatch(name, context.inventory);

    if (match?.isAlcoholic) {
      throw new Error(`Generated non-alcoholic recipe included alcohol: ${name}.`);
    }
  }

  return {
    amount,
    inBar: shouldBeInBar,
    name,
    notes: ingredient.notes ?? null,
    substitution: ingredient.substitution ?? null,
  };
}

function validateRecipe(value: unknown, context: ValidationContext): GeneratedCocktailRecipe {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid recipe generation result: recipe must be an object.');
  }

  const recipe = value as Partial<GeneratedCocktailRecipe>;
  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.map((ingredient: unknown): GeneratedRecipeIngredient => {
        return validateIngredient(ingredient, context);
      })
    : null;

  if (!ingredients || ingredients.length === 0) {
    throw new Error('Invalid recipe generation result: recipe ingredients are required.');
  }

  const missingIngredients = ingredients
    .filter((ingredient: GeneratedRecipeIngredient): boolean => {
      return !ingredient.inBar;
    })
    .map((ingredient: GeneratedRecipeIngredient): string => {
      return ingredient.name;
    });
  const candidate: GeneratedCocktailRecipe = {
    canMakeNow: missingIngredients.length === 0,
    description: assertString(recipe.description, 'recipe.description'),
    difficulty:
      recipe.difficulty === 'advanced' ||
      recipe.difficulty === 'easy' ||
      recipe.difficulty === 'medium'
        ? recipe.difficulty
        : 'medium',
    garnish: recipe.garnish ?? null,
    glassware: recipe.glassware ?? null,
    ingredients,
    inventoryMatchSummary:
      recipe.inventoryMatchSummary ?? `${missingIngredients.length} missing ingredient(s).`,
    missingIngredients,
    name: assertString(recipe.name, 'recipe.name'),
    steps: assertStringArray(recipe.steps, 'recipe.steps'),
    strength:
      recipe.strength === 'low' ||
      recipe.strength === 'medium' ||
      recipe.strength === 'non_alcoholic' ||
      recipe.strength === 'strong'
        ? recipe.strength
        : 'medium',
    tools: assertStringArray(recipe.tools ?? [], 'recipe.tools'),
    whyThisFits: assertString(recipe.whyThisFits, 'recipe.whyThisFits'),
  };

  if (!recipeSatisfiesMissingIngredientPolicy(candidate, context.missingIngredientPolicy)) {
    throw new Error(`Generated recipe exceeds missing ingredient policy: ${candidate.name}.`);
  }

  return candidate;
}

export function validateRecipeGenerationResult(
  result: unknown,
  context: ValidationContext,
): RecipeGenerationResult {
  if (!result || typeof result !== 'object') {
    throw new Error('Invalid recipe generation result: result must be an object.');
  }

  const candidate = result as Partial<RecipeGenerationResult>;

  return {
    secondaryRecipe: validateRecipe(candidate.secondaryRecipe, context),
    tertiaryRecipe: validateRecipe(candidate.tertiaryRecipe, context),
    topRecipe: validateRecipe(candidate.topRecipe, context),
  };
}
