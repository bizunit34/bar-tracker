import { buildRecipeGenerationPayload } from '../ai/buildRecipePrompt';
import { mockGenerateRecipeRecommendations } from '../ai/mockRecipeGenerator';
import {
  RecipeGenerationRequest,
  RecipeGenerationResult,
  RecipeRecommendationSession,
} from '../ai/recipeAiTypes';
import { validateRecipeGenerationResult } from '../ai/validateRecipeGenerationResult';
import {
  ALWAYS_ASSUMED_AVAILABLE_INGREDIENTS,
  ASSUMED_KITCHEN_TOOLS,
  NEVER_ASSUME_INGREDIENTS,
} from '../data/recipeConstants';

export function createRecipeGenerationRequestFromSession(
  session: RecipeRecommendationSession,
): RecipeGenerationRequest {
  return {
    alwaysAssumedAvailableIngredients: ALWAYS_ASSUMED_AVAILABLE_INGREDIENTS,
    assumedKitchenTools: ASSUMED_KITCHEN_TOOLS,
    availableTools: session.toolSnapshot,
    favoriteRecipes: session.favoriteRecipeSnapshot,
    mode: session.mode,
    neverAssumeIngredients: NEVER_ASSUME_INGREDIENTS,
    normalizedInventory: session.inventorySnapshot,
    preferences: session.preferences,
    quizAnswers: session.quizAnswers,
    tasteProfile: session.tasteProfileSnapshot,
  };
}

export async function generateRecipeRecommendations(
  session: RecipeRecommendationSession,
): Promise<RecipeGenerationResult> {
  const request = createRecipeGenerationRequestFromSession(session);

  buildRecipeGenerationPayload(request);

  // TODO: Replace the mock with a secure backend endpoint that owns AI provider credentials.
  return validateRecipeGenerationResult(await mockGenerateRecipeRecommendations(request), {
    inventory: request.normalizedInventory,
    missingIngredientPolicy: session.missingIngredientPolicy,
    preferences: request.preferences,
  });
}

export { buildRecipeGenerationPayload };
