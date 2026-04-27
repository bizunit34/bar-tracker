import { findInventoryMatch } from './inventoryNormalization';
import {
  GeneratedCocktailRecipe,
  GeneratedRecipeIngredient,
  NormalizedInventoryIngredient,
  RecipeGenerationRequest,
  RecipeGenerationResult,
} from './recipeAiTypes';

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function isExcluded(name: string, excluded: Array<string>): boolean {
  const normalizedName = normalize(name);

  return excluded.some((ingredient: string): boolean => {
    return normalizedName.includes(normalize(ingredient));
  });
}

function pickInventoryIngredients(
  request: RecipeGenerationRequest,
): Array<NormalizedInventoryIngredient> {
  return request.normalizedInventory.filter(
    (ingredient: NormalizedInventoryIngredient): boolean => {
      if (request.preferences.strengthPreference === 'non_alcoholic' && ingredient.isAlcoholic) {
        return false;
      }

      return !isExcluded(ingredient.name, request.preferences.excludeIngredients);
    },
  );
}

function ingredientFromInventory(
  ingredient: NormalizedInventoryIngredient,
  amount: string,
): GeneratedRecipeIngredient {
  return {
    amount,
    inBar: true,
    name: ingredient.name,
    notes: ingredient.amountAvailable
      ? `In bar: ${ingredient.amountAvailable} ${ingredient.unit ?? ''}`
      : null,
    substitution: null,
  };
}

function missingIngredient(name: string, amount: string): GeneratedRecipeIngredient {
  return {
    amount,
    inBar: false,
    name,
    notes: 'Missing from bar inventory.',
    substitution: null,
  };
}

function assumedIngredient(name: string, amount: string): GeneratedRecipeIngredient {
  return {
    amount,
    inBar: true,
    name,
    notes: 'Always assumed available.',
    substitution: null,
  };
}

function allowedMissing(
  request: RecipeGenerationRequest,
  candidates: Array<string>,
): Array<string> {
  return candidates
    .filter((ingredient: string): boolean => {
      return !isExcluded(ingredient, request.preferences.excludeIngredients);
    })
    .slice(0, request.preferences.missingIngredientPolicy.maxMissingIngredients);
}

function getRecipeStrength(request: RecipeGenerationRequest): GeneratedCocktailRecipe['strength'] {
  if (request.preferences.strengthPreference === 'non_alcoholic') {
    return 'non_alcoholic';
  }

  if (request.preferences.strengthPreference === 'strong') {
    return 'strong';
  }

  if (request.preferences.strengthPreference === 'weak') {
    return 'low';
  }

  return 'medium';
}

function buildRecipe(
  request: RecipeGenerationRequest,
  params: {
    description: string;
    difficulty: GeneratedCocktailRecipe['difficulty'];
    fallbackMissing: Array<string>;
    garnish: string | null;
    glassware: string;
    name: string;
    primaryAmount: string;
    secondaryAmount: string;
    slot: 'secondary' | 'tertiary' | 'top';
    tools: Array<string>;
    why: string;
  },
): GeneratedCocktailRecipe {
  const availableIngredients = pickInventoryIngredients(request);
  const primary = availableIngredients[0];
  const secondary = availableIngredients[1] ?? availableIngredients[0];
  const missing = allowedMissing(request, params.fallbackMissing);
  const ingredients: Array<GeneratedRecipeIngredient> = [];

  if (primary) {
    ingredients.push(ingredientFromInventory(primary, params.primaryAmount));
  }

  if (secondary && secondary.id !== primary?.id) {
    ingredients.push(ingredientFromInventory(secondary, params.secondaryAmount));
  }

  request.preferences.includeIngredients.forEach((ingredient: string): void => {
    const alreadyIncluded = ingredients.some((current: GeneratedRecipeIngredient): boolean => {
      return normalize(current.name) === normalize(ingredient);
    });
    const inventoryMatch = findInventoryMatch(ingredient, request.normalizedInventory);
    const missingCount = ingredients.filter((current: GeneratedRecipeIngredient): boolean => {
      return !current.inBar;
    }).length;

    if (alreadyIncluded || isExcluded(ingredient, request.preferences.excludeIngredients)) {
      return;
    }

    if (inventoryMatch) {
      ingredients.push(ingredientFromInventory(inventoryMatch, 'as desired'));
    } else if (missingCount < request.preferences.missingIngredientPolicy.maxMissingIngredients) {
      ingredients.push(missingIngredient(ingredient, 'as desired'));
    }
  });

  missing.forEach((ingredient: string): void => {
    ingredients.push(missingIngredient(ingredient, 'to taste'));
  });

  if (ingredients.length === 0) {
    ingredients.push(assumedIngredient('ice', 'as needed'));
    ingredients.push(assumedIngredient('water', 'as needed'));
  }

  const missingIngredients = ingredients
    .filter((ingredient: GeneratedRecipeIngredient): boolean => {
      return !ingredient.inBar;
    })
    .map((ingredient: GeneratedRecipeIngredient): string => {
      return ingredient.name;
    });
  const canMakeNow = missingIngredients.length === 0;

  return {
    canMakeNow,
    description: params.description,
    difficulty: params.difficulty,
    garnish: params.garnish,
    glassware: params.glassware,
    ingredients,
    inventoryMatchSummary: canMakeNow
      ? 'All listed cocktail ingredients are currently in your bar.'
      : `${missingIngredients.length} ingredient(s) would need to be added or substituted.`,
    missingIngredients,
    name: params.name,
    steps: [
      'Chill the glass if the drink is served up or over a large cube.',
      'Measure the ingredients and combine using the listed tools.',
      'Taste and adjust dilution, sweetness, or acidity before serving.',
      'Garnish and serve immediately.',
    ],
    strength: getRecipeStrength(request),
    tools: params.tools,
    whyThisFits: params.why,
  };
}

export async function mockGenerateRecipeRecommendations(
  request: RecipeGenerationRequest,
): Promise<RecipeGenerationResult> {
  await Promise.resolve();

  const style = request.quizAnswers?.drinkStyle ?? 'bar-driven';
  const flavor = request.quizAnswers?.flavorDirection ?? 'balanced';

  return {
    secondaryRecipe: buildRecipe(request, {
      description: `A ${flavor} variation that keeps the build practical for the ingredients on hand.`,
      difficulty: 'medium',
      fallbackMissing: ['fresh lemon juice', 'simple syrup'],
      garnish: 'Citrus peel if available',
      glassware: 'Coupe or rocks glass',
      name: 'Inventory Sour',
      primaryAmount: '2 oz',
      secondaryAmount: '3/4 oz',
      slot: 'secondary',
      tools: ['Shaker', 'Strainer'],
      why: `This leans into the requested ${style} direction while keeping missing ingredients within the selected limit.`,
    }),
    tertiaryRecipe: buildRecipe(request, {
      description: 'A lower-effort highball-style option for a flexible home-bar pour.',
      difficulty: 'easy',
      fallbackMissing: ['soda water', 'fresh lime'],
      garnish: 'Lime wheel if available',
      glassware: 'Highball',
      name: 'Bar Shelf Highball',
      primaryAmount: '1 1/2 oz',
      secondaryAmount: 'Top with',
      slot: 'tertiary',
      tools: ['Bar spoon'],
      why: 'It is simple, adaptable, and uses the current bar inventory as the starting point.',
    }),
    topRecipe: buildRecipe(request, {
      description: 'A focused recommendation built from the strongest matches in the current bar.',
      difficulty: 'easy',
      fallbackMissing: ['aromatic bitters', 'orange peel'],
      garnish: 'Orange peel if available',
      glassware: 'Rocks glass',
      name: 'Best Fit Old Fashioned',
      primaryAmount: '2 oz',
      secondaryAmount: '1/4 oz',
      slot: 'top',
      tools: ['Jigger', 'Bar spoon'],
      why: 'It prioritizes ingredients already in the bar and respects the final restrictions.',
    }),
  };
}
