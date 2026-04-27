import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

import { useBarInventoryItems } from '../data/barInventoryStore';
import {
  evaluateRecipeAvailability,
  RecipeAvailabilityEvaluation,
} from '../features/recipes/ai/canMakeNowEvaluator';
import { normalizeInventoryForRecipeGeneration } from '../features/recipes/ai/inventoryNormalization';
import { DEFAULT_MISSING_INGREDIENT_POLICY } from '../features/recipes/ai/missingIngredientPolicy';
import {
  BarTool,
  DrinkStrengthPreference,
  GeneratedCocktailRecipe,
  MissingIngredientAllowance,
  RecipeGenerationMode,
  RecipeGenerationPreferences,
  RecipeGenerationResult,
  RecipeQuizAnswers,
  RecipeRecommendationSession,
} from '../features/recipes/ai/recipeAiTypes';
import { createRecipeRecommendationSession } from '../features/recipes/ai/recommendationSession';
import {
  mapInventoryToRecipeIngredients,
  normalizeIngredientTokens,
} from '../features/recipes/data/recipeInputMapping';
import { useBarTools } from '../features/recipes/hooks/useBarTools';
import { useSavedRecipes } from '../features/recipes/hooks/useSavedRecipes';
import { generateRecipeRecommendations } from '../features/recipes/services/recipeGenerationService';
import { Recipe } from '../features/recipes/types';
import { colors } from '../theme/colors';
import { InventoryItem } from '../types/inventory';

type RecipesStep = 'confirm' | 'home' | 'loading' | 'quiz' | 'results' | 'savedDetail';

type QuizOptionValue = MissingIngredientAllowance | string;

type QuizQuestion = {
  key: keyof RecipeQuizAnswers;
  options: Array<{
    label: string;
    value: QuizOptionValue;
  }>;
  title: string;
};

type PreferenceFormState = {
  additionalGuidelines: string;
  excludeIngredients: string;
  includeIngredients: string;
  missingIngredientAllowance: MissingIngredientAllowance;
  strengthPreference: DrinkStrengthPreference;
};

const quizQuestions: Array<QuizQuestion> = [
  {
    key: 'drinkStyle',
    options: [
      'refreshing',
      'spirit-forward',
      'sweet',
      'sour/tart',
      'bitter/herbal',
      'creamy',
      'spicy',
      'no preference',
    ].map((value: string) => {
      return { label: value, value };
    }),
    title: 'What kind of drink sounds best right now?',
  },
  {
    key: 'occasion',
    options: [
      'relaxing',
      'celebrating',
      'dinner pairing',
      'impressing guests',
      'casual sipping',
      'experimenting',
      'no preference',
    ].map((value: string) => {
      return { label: value, value };
    }),
    title: 'What mood or occasion is this for?',
  },
  {
    key: 'flavorDirection',
    options: [
      'citrusy',
      'fruity',
      'smoky',
      'herbal',
      'tropical',
      'dessert-like',
      'dry/crisp',
      'no preference',
    ].map((value: string) => {
      return { label: value, value };
    }),
    title: 'What flavor direction do you want?',
  },
  {
    key: 'strength',
    options: [
      { label: 'Strong', value: 'strong' },
      { label: 'Balanced', value: 'balanced' },
      { label: 'Light/weak', value: 'weak' },
      { label: 'Non-alcoholic', value: 'non_alcoholic' },
    ],
    title: 'How strong should it be?',
  },
  {
    key: 'effort',
    options: ['simple build', 'shaken', 'stirred', 'blended', 'anything'].map((value: string) => {
      return { label: value, value };
    }),
    title: 'How much effort do you want?',
  },
  {
    key: 'missingIngredientAllowance',
    options: [
      { label: 'No, all ingredients must be on hand', value: 0 },
      { label: 'Yes, allow 1 missing item', value: 1 },
      { label: 'Yes, allow 2 missing items', value: 2 },
      { label: 'Yes, allow up to 3 missing items', value: 3 },
    ],
    title: 'Are you open to missing ingredients?',
  },
];

const defaultPreferences: PreferenceFormState = {
  additionalGuidelines: '',
  excludeIngredients: '',
  includeIngredients: '',
  missingIngredientAllowance: 0,
  strengthPreference: 'balanced',
};

function RecipesScreen(): React.JSX.Element {
  const inventoryItems = useBarInventoryItems();
  const {
    errorMessage: barToolsErrorMessage,
    isLoading: areBarToolsLoading,
    tools: barTools,
    toggleTool,
  } = useBarTools();
  const {
    errorMessage: savedRecipeErrorMessage,
    favoriteRecipes,
    isLoading: areFavoritesLoading,
    saveFavoriteGeneratedRecipe,
    savedFavoriteRecipes,
    savedFavoriteNames,
  } = useSavedRecipes();
  const [step, setStep] = useState<RecipesStep>('home');
  const [mode, setMode] = useState<RecipeGenerationMode>('surprise');
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<RecipeQuizAnswers>({});
  const [preferences, setPreferences] = useState<PreferenceFormState>(defaultPreferences);
  const [result, setResult] = useState<RecipeGenerationResult | null>(null);
  const [session, setSession] = useState<RecipeRecommendationSession | null>(null);
  const [selectedSavedRecipe, setSelectedSavedRecipe] = useState<Recipe | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const visibleInventory = useMemo((): Array<InventoryItem> => {
    return inventoryItems.filter((item: InventoryItem): boolean => {
      return !item.isArchived;
    });
  }, [inventoryItems]);

  const normalizedInventory = useMemo(() => {
    return normalizeInventoryForRecipeGeneration(mapInventoryToRecipeIngredients(visibleInventory));
  }, [visibleInventory]);

  const startMode = (selectedMode: RecipeGenerationMode): void => {
    if (selectedMode === 'favorites' && favoriteRecipes.length === 0) {
      setErrorMessage('Save a recipe first to generate from favorites.');

      return;
    }

    setErrorMessage(null);
    setMode(selectedMode);
    setResult(null);

    if (selectedMode === 'quiz') {
      setQuizIndex(0);
      setQuizAnswers({});
      setStep('quiz');

      return;
    }

    setPreferences(defaultPreferences);
    setStep('confirm');
  };

  const answerQuiz = (key: keyof RecipeQuizAnswers, value: QuizOptionValue): void => {
    setQuizAnswers((currentAnswers: RecipeQuizAnswers): RecipeQuizAnswers => {
      return { ...currentAnswers, [key]: value };
    });
  };

  const goToConfirmationFromQuiz = (): void => {
    setPreferences({
      ...defaultPreferences,
      missingIngredientAllowance: quizAnswers.missingIngredientAllowance ?? 0,
      strengthPreference: quizAnswers.strength ?? 'balanced',
    });
    setStep('confirm');
  };

  const generateRecipes = async (): Promise<void> => {
    if (mode === 'favorites' && favoriteRecipes.length === 0) {
      setErrorMessage('Favorites-based generation needs at least one saved recipe.');

      return;
    }

    const recommendationSession = createSessionFromScreenState({
      favoriteRecipes,
      availableTools: barTools,
      inventoryItems: visibleInventory,
      mode,
      preferences,
      quizAnswers: mode === 'quiz' ? quizAnswers : undefined,
    });

    setSession(recommendationSession);
    setErrorMessage(null);
    setStep('loading');

    try {
      const nextResult = await generateRecipeRecommendations(recommendationSession);

      setSession({
        ...recommendationSession,
        results: nextResult,
        updatedAt: new Date().toISOString(),
      });
      setResult(nextResult);
      setStep('results');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Recipe generation failed.');
      setStep('confirm');
    }
  };

  if (step === 'quiz') {
    return (
      <QuizStep
        answers={quizAnswers}
        currentIndex={quizIndex}
        onAnswer={answerQuiz}
        onBack={(): void => {
          if (quizIndex === 0) {
            setStep('home');
          } else {
            setQuizIndex((currentIndex: number): number => {
              return currentIndex - 1;
            });
          }
        }}
        onNext={(): void => {
          if (quizIndex === quizQuestions.length - 1) {
            goToConfirmationFromQuiz();
          } else {
            setQuizIndex((currentIndex: number): number => {
              return currentIndex + 1;
            });
          }
        }}
      />
    );
  }

  if (step === 'confirm') {
    return (
      <ConfirmationStep
        favoriteCount={favoriteRecipes.length}
        mode={mode}
        preferences={preferences}
        quizAnswers={mode === 'quiz' ? quizAnswers : undefined}
        onBack={(): void => {
          setStep(mode === 'quiz' ? 'quiz' : 'home');
        }}
        onGenerate={(): void => {
          generateRecipes().catch((error: unknown): void => {
            setErrorMessage(error instanceof Error ? error.message : 'Recipe generation failed.');
          });
        }}
        onPreferencesChange={setPreferences}
      />
    );
  }

  if (step === 'loading') {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.loadingText}>Building recipes from your bar...</Text>
      </View>
    );
  }

  if (step === 'results' && result) {
    return (
      <ResultsStep
        result={result}
        savedRecipeNames={savedFavoriteNames}
        session={session}
        onBack={(): void => {
          setStep('confirm');
        }}
        onFavorite={saveFavoriteGeneratedRecipe}
        onStartOver={(): void => {
          setStep('home');
        }}
      />
    );
  }

  if (step === 'savedDetail' && selectedSavedRecipe) {
    return (
      <SavedRecipeDetail
        evaluation={evaluateRecipeAvailability(selectedSavedRecipe, normalizedInventory, barTools)}
        recipe={selectedSavedRecipe}
        onBack={(): void => {
          setStep('home');
        }}
      />
    );
  }

  return (
    <RecipesHome
      favoriteCount={favoriteRecipes.length}
      inventoryCount={visibleInventory.length}
      savedRecipes={savedFavoriteRecipes}
      tools={barTools}
      errorMessage={errorMessage ?? savedRecipeErrorMessage ?? barToolsErrorMessage}
      isFavoritesLoading={areFavoritesLoading}
      isToolsLoading={areBarToolsLoading}
      onToggleTool={toggleTool}
      onOpenSavedRecipe={(recipe: Recipe): void => {
        setSelectedSavedRecipe(recipe);
        setStep('savedDetail');
      }}
      onSelectMode={startMode}
    />
  );
}

type RecipesHomeProps = {
  errorMessage: string | null;
  favoriteCount: number;
  inventoryCount: number;
  isFavoritesLoading: boolean;
  isToolsLoading: boolean;
  onOpenSavedRecipe: (recipe: Recipe) => void;
  onSelectMode: (mode: RecipeGenerationMode) => void;
  onToggleTool: (toolId: string) => Promise<void>;
  savedRecipes: Array<Recipe>;
  tools: Array<BarTool>;
};

function RecipesHome({
  errorMessage,
  favoriteCount,
  inventoryCount,
  isFavoritesLoading,
  isToolsLoading,
  onOpenSavedRecipe,
  onSelectMode,
  onToggleTool,
  savedRecipes,
  tools,
}: RecipesHomeProps): React.JSX.Element {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Recipes</Text>
      <Text style={styles.pageSubtitle}>
        Generate cocktail ideas from what is already in your bar.
      </Text>
      <Text style={styles.helperText}>{inventoryCount} bar item(s) available for matching.</Text>
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <View style={styles.toolsPanel}>
        <Text style={styles.sectionTitle}>Bar Tools</Text>
        <Text style={styles.helperText}>
          Check the specialized bar tools you have. Kitchen basics are still assumed available.
        </Text>
        {isToolsLoading ? <Text style={styles.helperText}>Loading tools...</Text> : null}
        <View style={styles.toolGrid}>
          {tools.map((tool: BarTool): React.JSX.Element => {
            return (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: tool.available }}
                key={tool.id}
                onPress={(): void => {
                  onToggleTool(tool.id).catch((error: unknown): void => {
                    console.error('Failed to toggle bar tool.', error);
                  });
                }}
                style={({ pressed }): StyleProp<ViewStyle> => {
                  return [
                    styles.toolOption,
                    tool.available ? styles.toolOptionSelected : null,
                    pressed ? styles.controlPressed : null,
                  ];
                }}
              >
                <Text
                  style={[
                    styles.toolOptionText,
                    tool.available ? styles.toolOptionTextSelected : null,
                  ]}
                >
                  {tool.available ? 'x ' : ''}
                  {tool.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ModeCard
        description="Use your current inventory and default preferences for three recommendations."
        label="Surprise Me"
        onPress={(): void => {
          onSelectMode('surprise');
        }}
      />
      <ModeCard
        description="Answer a short quiz so recommendations fit the moment."
        label="Ask Questions"
        onPress={(): void => {
          onSelectMode('quiz');
        }}
      />
      <ModeCard
        description={
          isFavoritesLoading
            ? 'Loading saved favorite recipes...'
            : favoriteCount > 0
              ? `${favoriteCount} saved recipe(s) will guide the recommendations.`
              : 'Save a generated recipe first to unlock favorites-based recommendations.'
        }
        isDisabled={isFavoritesLoading || favoriteCount === 0}
        label="Based on Favorites"
        onPress={(): void => {
          onSelectMode('favorites');
        }}
      />

      <View style={styles.savedRecipesPanel}>
        <Text style={styles.sectionTitle}>Saved Recipes</Text>
        {savedRecipes.length === 0 ? (
          <Text style={styles.helperText}>Favorite generated recipes to see them here.</Text>
        ) : null}
        {savedRecipes.map((recipe: Recipe): React.JSX.Element => {
          return (
            <Pressable
              accessibilityRole="button"
              key={recipe.id}
              onPress={(): void => {
                onOpenSavedRecipe(recipe);
              }}
              style={({ pressed }): StyleProp<ViewStyle> => {
                return [styles.savedRecipeRow, pressed ? styles.controlPressed : null];
              }}
            >
              <Text style={styles.savedRecipeTitle}>{recipe.name}</Text>
              <Text style={styles.savedRecipeMeta}>
                {(recipe.tags ?? []).join(', ') || 'Saved recipe'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

type ModeCardProps = {
  description: string;
  isDisabled?: boolean;
  label: string;
  onPress: () => void;
};

function ModeCard({
  description,
  isDisabled = false,
  label,
  onPress,
}: ModeCardProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => {
        return [
          styles.modeCard,
          isDisabled ? styles.modeCardDisabled : null,
          pressed ? styles.controlPressed : null,
        ];
      }}
    >
      <Text style={styles.modeTitle}>{label}</Text>
      <Text style={styles.modeDescription}>{description}</Text>
    </Pressable>
  );
}

type QuizStepProps = {
  answers: RecipeQuizAnswers;
  currentIndex: number;
  onAnswer: (key: keyof RecipeQuizAnswers, value: QuizOptionValue) => void;
  onBack: () => void;
  onNext: () => void;
};

function QuizStep({
  answers,
  currentIndex,
  onAnswer,
  onBack,
  onNext,
}: QuizStepProps): React.JSX.Element {
  const question = quizQuestions[currentIndex];
  const currentAnswer = answers[question.key];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.stepLabel}>
        Question {currentIndex + 1} of {quizQuestions.length}
      </Text>
      <Text style={styles.pageTitle}>{question.title}</Text>
      <View style={styles.optionGrid}>
        {question.options.map((option): React.JSX.Element => {
          const isSelected = currentAnswer === option.value;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={`${question.key}-${option.value}`}
              onPress={(): void => {
                onAnswer(question.key, option.value);
              }}
              style={({ pressed }): StyleProp<ViewStyle> => {
                return [
                  styles.choiceButton,
                  isSelected ? styles.choiceButtonSelected : null,
                  pressed ? styles.controlPressed : null,
                ];
              }}
            >
              <Text
                style={[
                  styles.choiceButtonText,
                  isSelected ? styles.choiceButtonTextSelected : null,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.footerActions}>
        <SecondaryButton label="Back" onPress={onBack} />
        <PrimaryButton
          label={currentIndex === quizQuestions.length - 1 ? 'Review' : 'Next'}
          onPress={onNext}
        />
      </View>
    </ScrollView>
  );
}

type ConfirmationStepProps = {
  favoriteCount: number;
  mode: RecipeGenerationMode;
  onBack: () => void;
  onGenerate: () => void;
  onPreferencesChange: (preferences: PreferenceFormState) => void;
  preferences: PreferenceFormState;
  quizAnswers?: RecipeQuizAnswers;
};

function ConfirmationStep({
  favoriteCount,
  mode,
  onBack,
  onGenerate,
  onPreferencesChange,
  preferences,
  quizAnswers,
}: ConfirmationStepProps): React.JSX.Element {
  const updatePreferences = (partial: Partial<PreferenceFormState>): void => {
    onPreferencesChange({ ...preferences, ...partial });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.stepLabel}>Final settings</Text>
      <Text style={styles.pageTitle}>{formatMode(mode)}</Text>
      {quizAnswers ? <SummaryBlock title="Quiz summary" values={quizAnswers} /> : null}
      {mode === 'favorites' ? (
        <Text style={styles.helperText}>
          {favoriteCount} favorite recipe(s) will shape taste matching.
        </Text>
      ) : null}

      <LabeledInput
        label="Include ingredients"
        onChangeText={(includeIngredients: string): void => {
          updatePreferences({ includeIngredients });
        }}
        placeholder="bourbon, mint"
        value={preferences.includeIngredients}
      />
      <LabeledInput
        label="Exclude ingredients"
        onChangeText={(excludeIngredients: string): void => {
          updatePreferences({ excludeIngredients });
        }}
        placeholder="tequila, citrus"
        value={preferences.excludeIngredients}
      />

      <Text style={styles.formLabel}>Missing ingredients allowed</Text>
      <View style={styles.optionGrid}>
        {[0, 1, 2, 3].map((value): React.JSX.Element => {
          return (
            <PreferenceOption
              key={value}
              isSelected={preferences.missingIngredientAllowance === value}
              label={String(value)}
              onPress={(): void => {
                updatePreferences({
                  missingIngredientAllowance: value as MissingIngredientAllowance,
                });
              }}
            />
          );
        })}
      </View>

      <Text style={styles.formLabel}>Drink strength</Text>
      <View style={styles.optionGrid}>
        {[
          { label: 'Balanced', value: 'balanced' },
          { label: 'Strong', value: 'strong' },
          { label: 'Light', value: 'weak' },
          { label: 'Non-alcoholic', value: 'non_alcoholic' },
        ].map((option): React.JSX.Element => {
          return (
            <PreferenceOption
              key={option.value}
              isSelected={preferences.strengthPreference === option.value}
              label={option.label}
              onPress={(): void => {
                updatePreferences({
                  strengthPreference: option.value as DrinkStrengthPreference,
                });
              }}
            />
          );
        })}
      </View>

      <LabeledInput
        label="Guidelines"
        multiline
        onChangeText={(additionalGuidelines: string): void => {
          updatePreferences({ additionalGuidelines });
        }}
        placeholder="not too sweet, party drink, avoid citrus"
        value={preferences.additionalGuidelines}
      />

      <Text style={styles.helperText}>
        Normal kitchen tools are assumed available. Bar-specific tools come from items added to your
        bar.
      </Text>

      <View style={styles.footerActions}>
        <SecondaryButton label="Back" onPress={onBack} />
        <PrimaryButton label="Generate Recipes" onPress={onGenerate} />
      </View>
    </ScrollView>
  );
}

type SummaryBlockProps = {
  title: string;
  values: Record<string, unknown>;
};

function SummaryBlock({ title, values }: SummaryBlockProps): React.JSX.Element {
  const entries = Object.entries(values).filter(([, value]): boolean => {
    return value !== undefined;
  });

  return (
    <View style={styles.summaryBlock}>
      <Text style={styles.summaryTitle}>{title}</Text>
      {entries.map(([key, value]): React.JSX.Element => {
        return (
          <Text key={key} style={styles.summaryText}>
            {key}: {String(value)}
          </Text>
        );
      })}
    </View>
  );
}

type LabeledInputProps = {
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
};

function LabeledInput({
  label,
  multiline = false,
  onChangeText,
  placeholder,
  value,
}: LabeledInputProps): React.JSX.Element {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        style={[styles.textInput, multiline ? styles.textArea : null]}
        value={value}
      />
    </View>
  );
}

type PreferenceOptionProps = {
  isSelected: boolean;
  label: string;
  onPress: () => void;
};

function PreferenceOption({
  isSelected,
  label,
  onPress,
}: PreferenceOptionProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => {
        return [
          styles.choiceButton,
          isSelected ? styles.choiceButtonSelected : null,
          pressed ? styles.controlPressed : null,
        ];
      }}
    >
      <Text style={[styles.choiceButtonText, isSelected ? styles.choiceButtonTextSelected : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

type ResultsStepProps = {
  onBack: () => void;
  onFavorite: (recipe: GeneratedCocktailRecipe) => Promise<unknown>;
  onStartOver: () => void;
  result: RecipeGenerationResult;
  savedRecipeNames: Set<string>;
  session: RecipeRecommendationSession | null;
};

function ResultsStep({
  onBack,
  onFavorite,
  onStartOver,
  result,
  savedRecipeNames,
  session,
}: ResultsStepProps): React.JSX.Element {
  const recipes = [
    { label: 'Top recommendation', recipe: result.topRecipe },
    { label: 'Secondary', recipe: result.secondaryRecipe },
    { label: 'Tertiary', recipe: result.tertiaryRecipe },
  ];

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={recipes}
      keyExtractor={(item): string => {
        return item.label;
      }}
      ListHeaderComponent={
        <>
          <Text style={styles.pageTitle}>Recommended Recipes</Text>
          {session ? (
            <Text style={styles.helperText}>
              Session {session.id} checked {session.inventorySnapshot.length} inventory item(s).
            </Text>
          ) : null}
          <View style={styles.footerActions}>
            <SecondaryButton label="Back" onPress={onBack} />
            <SecondaryButton label="Start Over" onPress={onStartOver} />
          </View>
        </>
      }
      renderItem={({ item }): React.JSX.Element => {
        return (
          <RecipeCard
            isSaved={savedRecipeNames.has(item.recipe.name)}
            label={item.label}
            recipe={item.recipe}
            onFavorite={(): void => {
              onFavorite(item.recipe).catch((error: unknown): void => {
                console.error('Failed to save favorite recipe.', error);
              });
            }}
          />
        );
      }}
    />
  );
}

type RecipeCardProps = {
  isSaved: boolean;
  label: string;
  onFavorite: () => void;
  recipe: GeneratedCocktailRecipe;
};

function RecipeCard({ isSaved, label, onFavorite, recipe }: RecipeCardProps): React.JSX.Element {
  return (
    <View style={[styles.recipeCard, label === 'Top recommendation' ? styles.topRecipeCard : null]}>
      <Text style={styles.stepLabel}>{label}</Text>
      <Text style={styles.recipeTitle}>{recipe.name}</Text>
      <Text style={styles.recipeDescription}>{recipe.description}</Text>
      <Text style={styles.recipeWhy}>{recipe.whyThisFits}</Text>
      <Text style={recipe.canMakeNow ? styles.canMakeNow : styles.missingStatus}>
        {recipe.canMakeNow
          ? 'Can make now'
          : `Missing ${recipe.missingIngredients.length} ingredient(s): ${recipe.missingIngredients.join(', ')}`}
      </Text>
      <Text style={styles.recipeMeta}>
        {recipe.tools.length > 0
          ? 'Uses available tools or kitchen workarounds'
          : 'No special bar tools required'}
      </Text>
      <Text style={styles.sectionTitle}>Ingredients</Text>
      {recipe.ingredients.map((ingredient): React.JSX.Element => {
        return (
          <Text key={`${recipe.name}-${ingredient.name}`} style={styles.recipeDetail}>
            {ingredient.amount} {ingredient.name} {ingredient.inBar ? '(in bar)' : '(missing)'}
          </Text>
        );
      })}
      <Text style={styles.sectionTitle}>Steps</Text>
      {recipe.steps.map((step, index): React.JSX.Element => {
        return (
          <Text key={`${recipe.name}-step-${step}`} style={styles.recipeDetail}>
            {index + 1}. {step}
          </Text>
        );
      })}
      <Text style={styles.recipeMeta}>Tools: {recipe.tools.join(', ')}</Text>
      {recipe.glassware ? (
        <Text style={styles.recipeMeta}>Glassware: {recipe.glassware}</Text>
      ) : null}
      {recipe.garnish ? <Text style={styles.recipeMeta}>Garnish: {recipe.garnish}</Text> : null}
      <Text style={styles.recipeMeta}>
        Difficulty: {recipe.difficulty} | Strength: {recipe.strength}
      </Text>
      <Text style={styles.recipeMeta}>{recipe.inventoryMatchSummary}</Text>
      <SecondaryButton
        isDisabled={isSaved}
        label={isSaved ? 'Saved' : 'Save Favorite'}
        onPress={onFavorite}
      />
    </View>
  );
}

type SavedRecipeDetailProps = {
  evaluation: RecipeAvailabilityEvaluation;
  onBack: () => void;
  recipe: Recipe;
};

function SavedRecipeDetail({
  evaluation,
  onBack,
  recipe,
}: SavedRecipeDetailProps): React.JSX.Element {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SecondaryButton label="Back" onPress={onBack} />
      <Text style={styles.pageTitle}>{recipe.name}</Text>
      {recipe.description ? <Text style={styles.pageSubtitle}>{recipe.description}</Text> : null}
      <Text style={evaluation.canMakeNow ? styles.canMakeNow : styles.missingStatus}>
        {evaluation.canMakeNow ? 'Can make now' : 'Cannot make yet'}
      </Text>
      <Text style={styles.recipeMeta}>{evaluation.summary}</Text>

      {evaluation.missingRequiredIngredients.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Missing Ingredients</Text>
          {evaluation.missingRequiredIngredients.map((ingredient: string): React.JSX.Element => {
            return (
              <Text key={ingredient} style={styles.recipeDetail}>
                {ingredient}
              </Text>
            );
          })}
        </>
      ) : null}

      {evaluation.missingTools.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Missing Bar Tools</Text>
          {evaluation.missingTools.map((tool: string): React.JSX.Element => {
            return (
              <Text key={tool} style={styles.recipeDetail}>
                {tool}
              </Text>
            );
          })}
        </>
      ) : null}

      <Text style={styles.sectionTitle}>Ingredients</Text>
      {recipe.ingredients.map((ingredient): React.JSX.Element => {
        return (
          <Text key={`${recipe.id}-${ingredient.name}`} style={styles.recipeDetail}>
            {ingredient.amount ? `${ingredient.amount} ` : ''}
            {ingredient.name}
            {ingredient.optional ? ' (optional)' : ''}
          </Text>
        );
      })}

      <Text style={styles.sectionTitle}>Steps</Text>
      {recipe.steps.map((step, index): React.JSX.Element => {
        return (
          <Text key={`${recipe.id}-step-${index}`} style={styles.recipeDetail}>
            {index + 1}. {step}
          </Text>
        );
      })}

      {(recipe.tools ?? []).length > 0 ? (
        <Text style={styles.recipeMeta}>Tools: {(recipe.tools ?? []).join(', ')}</Text>
      ) : null}
      {recipe.glassware ? (
        <Text style={styles.recipeMeta}>Glassware: {recipe.glassware}</Text>
      ) : null}
      {recipe.garnish ? <Text style={styles.recipeMeta}>Garnish: {recipe.garnish}</Text> : null}
    </ScrollView>
  );
}

type ButtonProps = {
  isDisabled?: boolean;
  label: string;
  onPress: () => void;
};

function PrimaryButton({ isDisabled = false, label, onPress }: ButtonProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => {
        return [
          styles.primaryButton,
          isDisabled ? styles.buttonDisabled : null,
          pressed ? styles.controlPressed : null,
        ];
      }}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ isDisabled = false, label, onPress }: ButtonProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => {
        return [
          styles.secondaryButton,
          isDisabled ? styles.buttonDisabled : null,
          pressed ? styles.controlPressed : null,
        ];
      }}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function createSessionFromScreenState(params: {
  availableTools: Array<BarTool>;
  favoriteRecipes: NonNullable<RecipeRecommendationSession['favoriteRecipeSnapshot']>;
  inventoryItems: Array<InventoryItem>;
  mode: RecipeGenerationMode;
  preferences: PreferenceFormState;
  quizAnswers?: RecipeQuizAnswers;
}): RecipeRecommendationSession {
  const missingIngredientPolicy = {
    ...DEFAULT_MISSING_INGREDIENT_POLICY,
    maxMissingIngredients: params.preferences.missingIngredientAllowance,
  };
  const preferences: RecipeGenerationPreferences = {
    additionalGuidelines: params.preferences.additionalGuidelines.trim() || undefined,
    excludeIngredients: normalizeIngredientTokens(params.preferences.excludeIngredients),
    includeIngredients: normalizeIngredientTokens(params.preferences.includeIngredients),
    missingIngredientAllowance: params.preferences.missingIngredientAllowance,
    missingIngredientPolicy,
    strengthPreference: params.preferences.strengthPreference,
  };

  return createRecipeRecommendationSession({
    availableTools: params.availableTools,
    favoriteRecipes: params.mode === 'favorites' ? params.favoriteRecipes : undefined,
    inventory: mapInventoryToRecipeIngredients(params.inventoryItems),
    mode: params.mode,
    preferences,
    quizAnswers: params.quizAnswers,
  });
}

function formatMode(mode: RecipeGenerationMode): string {
  if (mode === 'quiz') {
    return 'Ask Questions';
  }

  if (mode === 'favorites') {
    return 'Based on Favorites';
  }

  return 'Surprise Me';
}

const styles = StyleSheet.create({
  buttonDisabled: {
    opacity: 0.55,
  },
  canMakeNow: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 12,
  },
  centeredState: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  choiceButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  choiceButtonSelected: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentMuted,
  },
  choiceButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '800',
  },
  choiceButtonTextSelected: {
    color: colors.textPrimary,
  },
  container: {
    backgroundColor: colors.background,
    flexGrow: 1,
    padding: 20,
    paddingBottom: 28,
  },
  controlPressed: {
    opacity: 0.78,
  },
  errorText: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
  },
  footerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  formLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 14,
    textTransform: 'uppercase',
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  inputGroup: {
    marginTop: 4,
  },
  loadingText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 14,
  },
  missingStatus: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 12,
  },
  modeCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  modeCardDisabled: {
    opacity: 0.55,
  },
  modeDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  modeTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  pageSubtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accentMuted,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },
  recipeCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  recipeDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  recipeDetail: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  recipeMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  recipeTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  recipeWhy: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  savedRecipeMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  savedRecipeRow: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  savedRecipeTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
  savedRecipesPanel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    padding: 14,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },
  sectionTitle: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 14,
    textTransform: 'uppercase',
  },
  stepLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  summaryBlock: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
    padding: 12,
  },
  summaryText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 5,
  },
  summaryTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },
  textArea: {
    minHeight: 86,
    textAlignVertical: 'top',
  },
  textInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  toolOption: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  toolOptionSelected: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentMuted,
  },
  toolOptionText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  toolOptionTextSelected: {
    color: colors.textPrimary,
  },
  toolsPanel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    padding: 14,
  },
  topRecipeCard: {
    borderColor: colors.accentMuted,
  },
});

export default RecipesScreen;
