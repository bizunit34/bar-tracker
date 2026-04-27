import { useCallback, useEffect, useMemo, useState } from 'react';

import { mapGeneratedRecipeToRecipe } from '../ai/mapGeneratedRecipeToRecipe';
import { FavoriteRecipeSummary, GeneratedCocktailRecipe } from '../ai/recipeAiTypes';
import {
  findFavoriteRecipeByName,
  listFavoriteRecipes,
  mapRecipeToFavoriteSummary,
  saveRecipe,
} from '../data/recipeRepository';
import { Recipe } from '../types';

type SavedRecipesState = {
  errorMessage: string | null;
  favoriteRecipes: Array<FavoriteRecipeSummary>;
  isLoading: boolean;
  refresh: () => Promise<void>;
  saveFavoriteGeneratedRecipe: (recipe: GeneratedCocktailRecipe) => Promise<Recipe>;
  savedFavoriteRecipes: Array<Recipe>;
  savedFavoriteNames: Set<string>;
};

export function useSavedRecipes(): SavedRecipesState {
  const [favoriteRecipes, setFavoriteRecipes] = useState<Array<Recipe>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingRecipeNames, setSavingRecipeNames] = useState<Set<string>>(new Set());

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      setFavoriteRecipes(await listFavoriteRecipes());
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load saved recipes.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect((): void => {
    refresh().catch((error: unknown): void => {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load saved recipes.');
      setIsLoading(false);
    });
  }, [refresh]);

  const saveFavorite = useCallback(
    async (recipe: GeneratedCocktailRecipe): Promise<Recipe> => {
      if (savingRecipeNames.has(recipe.name)) {
        const existingRecipe = await findFavoriteRecipeByName(recipe.name);

        if (existingRecipe) {
          return existingRecipe;
        }
      }

      setSavingRecipeNames((currentNames: Set<string>): Set<string> => {
        return new Set(currentNames).add(recipe.name);
      });

      try {
        const existingRecipe = await findFavoriteRecipeByName(recipe.name);
        const mappedRecipe = existingRecipe ?? {
          ...mapGeneratedRecipeToRecipe(recipe),
          isFavorite: true,
        };
        const savedRecipe = await saveRecipe({
          ...mappedRecipe,
          isFavorite: true,
          updatedAt: new Date().toISOString(),
        });

        await refresh();

        return savedRecipe;
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to save recipe.');
        throw error;
      } finally {
        setSavingRecipeNames((currentNames: Set<string>): Set<string> => {
          const nextNames = new Set(currentNames);

          nextNames.delete(recipe.name);

          return nextNames;
        });
      }
    },
    [refresh, savingRecipeNames],
  );

  const favoriteSummaries = useMemo((): Array<FavoriteRecipeSummary> => {
    return favoriteRecipes.map(mapRecipeToFavoriteSummary);
  }, [favoriteRecipes]);
  const savedFavoriteNames = useMemo((): Set<string> => {
    return new Set(
      favoriteRecipes.map((recipe: Recipe): string => {
        return recipe.name;
      }),
    );
  }, [favoriteRecipes]);

  return {
    errorMessage,
    favoriteRecipes: favoriteSummaries,
    isLoading,
    refresh,
    saveFavoriteGeneratedRecipe: saveFavorite,
    savedFavoriteRecipes: favoriteRecipes,
    savedFavoriteNames,
  };
}
