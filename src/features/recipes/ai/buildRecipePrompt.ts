import { RecipeGenerationRequest } from './recipeAiTypes';
import { recipeRecommendationJsonShape } from './recipeRecommendationSchema';

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function buildRecipePrompt(request: RecipeGenerationRequest): string {
  const nonAlcoholicRule =
    request.preferences.strengthPreference === 'non_alcoholic'
      ? '- Non-alcoholic preference is selected. Do not recommend alcoholic ingredients or alcoholic substitutions.'
      : '- Match the selected strength preference.';
  const missingRule =
    request.preferences.missingIngredientAllowance === 0
      ? '- All cocktail ingredients must be in the user inventory unless they are water or ice.'
      : `- Missing cocktail ingredients must not exceed ${request.preferences.missingIngredientAllowance}.`;

  return [
    'SYSTEM/ROLE:',
    'You are an expert cocktail recipe assistant for a home bar inventory app.',
    '',
    'TASK:',
    'Return exactly three cocktail recipe recommendations using the user inventory and preferences.',
    '',
    'STRICT RULES:',
    '- Return valid JSON only.',
    '- No markdown.',
    '- Do not include prose outside JSON.',
    '- Respect excluded ingredients.',
    nonAlcoholicRule,
    '- Prefer recipes where all ingredients are available in inventory.',
    missingRule,
    '- Do not assume specialized bar tools unless listed as available.',
    '- Normal kitchen tools are assumed available.',
    '- If a recipe requires a missing bar tool, suggest a reasonable kitchen workaround or choose another recipe.',
    '- Provide practical home-bar instructions.',
    '- Clearly identify missing ingredients and substitutions.',
    '- Keep description under 140 characters.',
    '- Keep whyThisFits under 180 characters.',
    '- Use no more than 6 steps per recipe.',
    '- Keep ingredient notes brief or omit them.',
    '',
    'STRICT INVENTORY RULES:',
    '- Do not claim the user has an ingredient unless it appears in the normalized inventory list or in the always-assumed available ingredients list.',
    '- If an ingredient is not in inventory and is not always-assumed, it must be listed in missingIngredients.',
    '- The recipe must not exceed the missing ingredient policy.',
    '- Excluded ingredients are prohibited.',
    '- If non-alcoholic is selected, do not include alcoholic ingredients.',
    '- Do not assume citrus, syrups, bitters, mixers, vermouth, juices, herbs, dairy, eggs, or garnishes are available unless listed in inventory.',
    '- Do not assume specialized bar tools unless listed in available bar tools.',
    '- Normal kitchen tools are assumed available.',
    '',
    'NORMALIZED USER BAR INVENTORY:',
    prettyJson(request.normalizedInventory),
    '',
    'ALWAYS-ASSUMED AVAILABLE INGREDIENTS:',
    prettyJson(request.alwaysAssumedAvailableIngredients),
    '',
    'NEVER-ASSUME INGREDIENTS:',
    prettyJson(request.neverAssumeIngredients),
    '',
    'AVAILABLE BAR TOOLS:',
    prettyJson(request.availableTools),
    '',
    'ASSUMED KITCHEN TOOLS:',
    prettyJson(request.assumedKitchenTools),
    '',
    'MODE:',
    request.mode,
    '',
    'QUIZ ANSWERS:',
    prettyJson(request.quizAnswers ?? null),
    '',
    'FAVORITED RECIPES:',
    prettyJson(request.favoriteRecipes ?? []),
    '',
    'TASTE PROFILE:',
    prettyJson(request.tasteProfile ?? null),
    '',
    'FINAL PREFERENCES:',
    prettyJson(request.preferences),
    '',
    'MISSING INGREDIENT POLICY:',
    prettyJson(request.preferences.missingIngredientPolicy),
    '',
    'RESPONSE JSON SHAPE:',
    recipeRecommendationJsonShape,
  ].join('\n');
}

export function buildRecipeGenerationPayload(request: RecipeGenerationRequest): {
  prompt: string;
  request: RecipeGenerationRequest;
} {
  return {
    prompt: buildRecipePrompt(request),
    request,
  };
}
