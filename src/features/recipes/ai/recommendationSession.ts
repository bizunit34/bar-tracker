import { normalizeInventoryForRecipeGeneration } from './inventoryNormalization';
import { RECIPE_AI_PAYLOAD_LIMITS } from './payloadOptimization';
import {
  BarInventoryIngredient,
  BarTool,
  FavoriteRecipeSummary,
  RecipeGenerationMode,
  RecipeGenerationPreferences,
  RecipeQuizAnswers,
  RecipeRecommendationSession,
} from './recipeAiTypes';
import { buildTasteProfileFromFavorites } from './tasteProfile';

function createLocalId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createRecipeRecommendationSession(input: {
  availableTools: Array<BarTool>;
  favoriteRecipes?: Array<FavoriteRecipeSummary>;
  inventory: Array<BarInventoryIngredient>;
  mode: RecipeGenerationMode;
  preferences: RecipeGenerationPreferences;
  quizAnswers?: RecipeQuizAnswers;
}): RecipeRecommendationSession {
  const now = new Date().toISOString();
  const favoriteRecipeSnapshot = (input.favoriteRecipes ?? []).slice(
    0,
    RECIPE_AI_PAYLOAD_LIMITS.favoriteRecipes,
  );

  return {
    createdAt: now,
    favoriteRecipeSnapshot,
    feedback: [],
    id: createLocalId('recipe-session'),
    inventorySnapshot: normalizeInventoryForRecipeGeneration(input.inventory),
    missingIngredientPolicy: input.preferences.missingIngredientPolicy,
    mode: input.mode,
    preferences: input.preferences,
    quizAnswers: input.quizAnswers,
    tasteProfileSnapshot:
      favoriteRecipeSnapshot.length > 0
        ? buildTasteProfileFromFavorites(favoriteRecipeSnapshot)
        : undefined,
    toolSnapshot: input.availableTools,
    updatedAt: now,
  };
}
