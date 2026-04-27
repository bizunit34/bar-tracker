export type RecipeGenerationMode = 'surprise' | 'quiz' | 'favorites';

export type DrinkStrengthPreference = 'balanced' | 'strong' | 'weak' | 'non_alcoholic';

export type MissingIngredientAllowance = 0 | 1 | 2 | 3;

export type RecipeGenerationPreferences = {
  additionalGuidelines?: string;
  excludeIngredients: Array<string>;
  includeIngredients: Array<string>;
  missingIngredientAllowance: MissingIngredientAllowance;
  missingIngredientPolicy: MissingIngredientPolicy;
  strengthPreference: DrinkStrengthPreference;
};

export type RecipeQuizAnswers = {
  drinkStyle?: string;
  effort?: string;
  flavorDirection?: string;
  missingIngredientAllowance?: MissingIngredientAllowance;
  occasion?: string;
  strength?: DrinkStrengthPreference;
};

export type BarInventoryIngredient = {
  category?: string;
  id: string;
  isAlcoholic?: boolean;
  name: string;
  notes?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
};

export type NormalizedInventoryIngredient = {
  aliases: Array<string>;
  amountAvailable?: number | string | null;
  category?: string | null;
  id: string;
  isAlcoholic?: boolean;
  isAvailable: boolean;
  name: string;
  normalizedName: string;
  notes?: string | null;
  unit?: string | null;
};

export type BarTool = {
  available: boolean;
  id: string;
  name: string;
};

export type FavoriteRecipeSummary = {
  id: string;
  ingredients: Array<string>;
  name: string;
  notes?: string | null;
  rating?: number | null;
  tags?: Array<string>;
};

export type MissingIngredientPolicy = {
  allowMissingCommonMixers: boolean;
  allowMissingCoreAlcohol: boolean;
  allowMissingGarnish: boolean;
  maxMissingIngredients: MissingIngredientAllowance;
};

export type TasteProfile = {
  avoidedIngredients: Array<string>;
  averagePreferredStrength?: GeneratedCocktailRecipe['strength'] | null;
  commonIngredients: Array<string>;
  preferredBaseSpirits: Array<string>;
  preferredFlavorTags: Array<string>;
  preferredStyles: Array<string>;
};

export type RecipeRecommendationFeedbackReason =
  | 'too_strong'
  | 'too_weak'
  | 'too_sweet'
  | 'too_sour'
  | 'too_bitter'
  | 'too_complicated'
  | 'missing_too_many_ingredients'
  | 'not_creative_enough'
  | 'wrong_base_spirit'
  | 'disliked_ingredient'
  | 'other';

export type RecipeRecommendationFeedback = {
  createdAt: string;
  notes?: string;
  reason: RecipeRecommendationFeedbackReason;
  recipeName?: string;
};

export type RecipeGenerationRequest = {
  alwaysAssumedAvailableIngredients: Array<string>;
  assumedKitchenTools: Array<string>;
  availableTools: Array<BarTool>;
  favoriteRecipes?: Array<FavoriteRecipeSummary>;
  mode: RecipeGenerationMode;
  neverAssumeIngredients: Array<string>;
  normalizedInventory: Array<NormalizedInventoryIngredient>;
  preferences: RecipeGenerationPreferences;
  quizAnswers?: RecipeQuizAnswers;
  tasteProfile?: TasteProfile;
};

export type GeneratedRecipeIngredient = {
  amount: string;
  inBar: boolean;
  name: string;
  notes?: string | null;
  substitution?: string | null;
};

export type GeneratedCocktailRecipe = {
  canMakeNow: boolean;
  description: string;
  difficulty: 'advanced' | 'easy' | 'medium';
  garnish?: string | null;
  glassware?: string | null;
  ingredients: Array<GeneratedRecipeIngredient>;
  inventoryMatchSummary: string;
  missingIngredients: Array<string>;
  name: string;
  steps: Array<string>;
  strength: 'low' | 'medium' | 'non_alcoholic' | 'strong';
  tools: Array<string>;
  whyThisFits: string;
};

export type RecipeGenerationResult = {
  secondaryRecipe: GeneratedCocktailRecipe;
  tertiaryRecipe: GeneratedCocktailRecipe;
  topRecipe: GeneratedCocktailRecipe;
};

export type RecipeRecommendationSession = {
  createdAt: string;
  favoriteRecipeSnapshot?: Array<FavoriteRecipeSummary>;
  feedback?: Array<RecipeRecommendationFeedback>;
  id: string;
  inventorySnapshot: Array<NormalizedInventoryIngredient>;
  missingIngredientPolicy: MissingIngredientPolicy;
  mode: RecipeGenerationMode;
  preferences: RecipeGenerationPreferences;
  quizAnswers?: RecipeQuizAnswers;
  results?: RecipeGenerationResult;
  tasteProfileSnapshot?: TasteProfile;
  toolSnapshot: Array<BarTool>;
  updatedAt: string;
};
