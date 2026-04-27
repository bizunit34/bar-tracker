import { QueryResultRow } from 'react-native-nitro-sqlite';

import { initializeCatalogDatabase } from '../../../catalog/db/client';
import { FavoriteRecipeSummary } from '../ai/recipeAiTypes';
import { Recipe, RecipeIngredient, RecipeSource, RecipeVisibility } from '../types';

type RecipeRow = QueryResultRow & {
  created_at?: string;
  description?: string | null;
  garnish?: string | null;
  glassware?: string | null;
  id?: string;
  ingredients_json?: string;
  is_favorite?: number;
  name?: string;
  rating?: number | null;
  source?: string;
  steps_json?: string;
  tags_json?: string;
  tools_json?: string;
  updated_at?: string;
  visibility?: string;
};

function parseJsonArray<T>(value: string | undefined, fallback: Array<T>): Array<T> {
  if (!value) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    return Array.isArray(parsed) ? (parsed as Array<T>) : fallback;
  } catch {
    return fallback;
  }
}

function isRecipeSource(value: unknown): value is RecipeSource {
  return (
    value === 'manual' ||
    value === 'imported' ||
    value === 'ai_generated' ||
    value === 'saved_external'
  );
}

function isRecipeVisibility(value: unknown): value is RecipeVisibility {
  return value === 'guest_visible' || value === 'private' || value === 'shared';
}

function mapRowToRecipe(row: RecipeRow): Recipe | null {
  if (!row.id || !row.name || !isRecipeSource(row.source) || !row.created_at || !row.updated_at) {
    return null;
  }

  const ingredients = parseJsonArray<RecipeIngredient>(row.ingredients_json, []);
  const steps = parseJsonArray<string>(row.steps_json, []);

  if (ingredients.length === 0 || steps.length === 0) {
    return null;
  }

  return {
    createdAt: row.created_at,
    description: row.description ?? undefined,
    garnish: row.garnish ?? null,
    glassware: row.glassware ?? null,
    id: row.id,
    ingredients,
    isFavorite: row.is_favorite === 1,
    name: row.name,
    rating: row.rating ?? null,
    source: row.source,
    steps,
    tags: parseJsonArray<string>(row.tags_json, []),
    tools: parseJsonArray<string>(row.tools_json, []),
    updatedAt: row.updated_at,
    visibility: isRecipeVisibility(row.visibility) ? row.visibility : 'private',
  };
}

function recipeToParams(recipe: Recipe): Array<string | number | null> {
  return [
    recipe.id,
    recipe.name,
    recipe.source,
    recipe.description ?? null,
    JSON.stringify(recipe.ingredients),
    JSON.stringify(recipe.steps),
    JSON.stringify(recipe.tools ?? []),
    recipe.glassware ?? null,
    recipe.garnish ?? null,
    JSON.stringify(recipe.tags ?? []),
    recipe.isFavorite ? 1 : 0,
    recipe.rating ?? null,
    recipe.visibility ?? 'private',
    recipe.createdAt,
    recipe.updatedAt,
  ];
}

export function mapRecipeToFavoriteSummary(recipe: Recipe): FavoriteRecipeSummary {
  return {
    id: recipe.id,
    ingredients: recipe.ingredients.map((ingredient: RecipeIngredient): string => {
      return ingredient.name;
    }),
    name: recipe.name,
    notes: recipe.description ?? null,
    rating: recipe.rating ?? null,
    tags: recipe.tags,
  };
}

export async function listRecipes(): Promise<Array<Recipe>> {
  const db = await initializeCatalogDatabase();
  const result = await db.executeAsync<RecipeRow>('SELECT * FROM recipes ORDER BY updated_at DESC');

  return (result.rows?._array ?? [])
    .map((row: RecipeRow): Recipe | null => {
      return mapRowToRecipe(row);
    })
    .filter((recipe: Recipe | null): recipe is Recipe => {
      return recipe !== null;
    });
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  const db = await initializeCatalogDatabase();
  const result = await db.executeAsync<RecipeRow>('SELECT * FROM recipes WHERE id = ? LIMIT 1', [
    id,
  ]);
  const row = result.rows?._array[0];

  return row ? mapRowToRecipe(row) : null;
}

export async function saveRecipe(recipe: Recipe): Promise<Recipe> {
  const db = await initializeCatalogDatabase();

  await db.executeAsync(
    `INSERT INTO recipes (
      id,
      name,
      source,
      description,
      ingredients_json,
      steps_json,
      tools_json,
      glassware,
      garnish,
      tags_json,
      is_favorite,
      rating,
      visibility,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      source = excluded.source,
      description = excluded.description,
      ingredients_json = excluded.ingredients_json,
      steps_json = excluded.steps_json,
      tools_json = excluded.tools_json,
      glassware = excluded.glassware,
      garnish = excluded.garnish,
      tags_json = excluded.tags_json,
      is_favorite = excluded.is_favorite,
      rating = excluded.rating,
      visibility = excluded.visibility,
      updated_at = excluded.updated_at`,
    recipeToParams(recipe),
  );

  return recipe;
}

export async function updateRecipe(recipe: Recipe): Promise<Recipe> {
  return saveRecipe({
    ...recipe,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteRecipe(id: string): Promise<void> {
  const db = await initializeCatalogDatabase();

  await db.executeAsync('DELETE FROM recipes WHERE id = ?', [id]);
}

export async function toggleFavoriteRecipe(id: string): Promise<Recipe | null> {
  const existingRecipe = await getRecipeById(id);

  if (!existingRecipe) {
    return null;
  }

  return updateRecipe({
    ...existingRecipe,
    isFavorite: !existingRecipe.isFavorite,
  });
}

export async function listFavoriteRecipes(): Promise<Array<Recipe>> {
  const db = await initializeCatalogDatabase();
  const result = await db.executeAsync<RecipeRow>(
    'SELECT * FROM recipes WHERE is_favorite = 1 ORDER BY updated_at DESC',
  );

  return (result.rows?._array ?? [])
    .map((row: RecipeRow): Recipe | null => {
      return mapRowToRecipe(row);
    })
    .filter((recipe: Recipe | null): recipe is Recipe => {
      return recipe !== null;
    });
}

export async function findFavoriteRecipeByName(name: string): Promise<Recipe | null> {
  const db = await initializeCatalogDatabase();
  const result = await db.executeAsync<RecipeRow>(
    'SELECT * FROM recipes WHERE is_favorite = 1 AND lower(name) = lower(?) LIMIT 1',
    [name],
  );
  const row = result.rows?._array[0];

  return row ? mapRowToRecipe(row) : null;
}
