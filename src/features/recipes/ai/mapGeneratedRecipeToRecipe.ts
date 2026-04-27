import { Recipe } from '../types';
import { GeneratedCocktailRecipe } from './recipeAiTypes';

function createLocalRecipeId(name: string): string {
  return `recipe-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
}

export function mapGeneratedRecipeToRecipe(generated: GeneratedCocktailRecipe): Recipe {
  const now = new Date().toISOString();

  return {
    createdAt: now,
    description: generated.description,
    garnish: generated.garnish ?? null,
    glassware: generated.glassware ?? null,
    id: createLocalRecipeId(generated.name),
    ingredients: generated.ingredients.map((ingredient) => {
      return {
        amount: ingredient.amount,
        name: ingredient.name,
        notes: ingredient.notes ?? null,
        optional: !ingredient.inBar,
      };
    }),
    isFavorite: false,
    name: generated.name,
    rating: null,
    source: 'ai_generated',
    steps: generated.steps,
    tags: [
      generated.strength,
      generated.difficulty,
      generated.canMakeNow ? 'can_make_now' : 'missing_ingredients',
    ],
    tools: generated.tools,
    updatedAt: now,
    visibility: 'private',
  };
}
