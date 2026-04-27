export const recipeRecommendationResponseShape = {
  secondaryRecipe: {
    canMakeNow: 'boolean',
    description: 'string',
    difficulty: 'easy | medium | advanced',
    garnish: 'string | null',
    glassware: 'string | null',
    ingredients: [
      {
        amount: 'string',
        inBar: 'boolean',
        name: 'string',
        notes: 'brief string | null',
        substitution: 'string | null',
      },
    ],
    missingIngredients: ['string'],
    name: 'string',
    steps: ['string, max 6'],
    strength: 'non_alcoholic | low | medium | strong',
    tools: ['string'],
    whyThisFits: 'string',
  },
  tertiaryRecipe: 'GeneratedCocktailRecipe',
  topRecipe: 'GeneratedCocktailRecipe',
};

export const recipeRecommendationJsonShape = JSON.stringify(
  recipeRecommendationResponseShape,
  null,
  2,
);
