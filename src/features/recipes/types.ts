export type RecipeSource = 'manual' | 'imported' | 'ai_generated' | 'saved_external';

export type RecipeVisibility = 'guest_visible' | 'private' | 'shared';

export type RecipeIngredient = {
  amount?: string;
  id?: string;
  name: string;
  notes?: string | null;
  optional?: boolean;
  unit?: string | null;
};

export type Recipe = {
  createdAt: string;
  description?: string;
  garnish?: string | null;
  glassware?: string | null;
  id: string;
  ingredients: Array<RecipeIngredient>;
  isFavorite?: boolean;
  name: string;
  rating?: number | null;
  source: RecipeSource;
  steps: Array<string>;
  tags?: Array<string>;
  tools?: Array<string>;
  updatedAt: string;
  visibility?: RecipeVisibility;
};
