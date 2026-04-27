import { useCallback, useEffect, useState } from 'react';

import { BarTool } from '../ai/recipeAiTypes';
import { listBarTools, setBarToolAvailability } from '../data/barToolRepository';

type BarToolsState = {
  errorMessage: string | null;
  isLoading: boolean;
  tools: Array<BarTool>;
  toggleTool: (toolId: string) => Promise<void>;
};

export function useBarTools(): BarToolsState {
  const [tools, setTools] = useState<Array<BarTool>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      setTools(await listBarTools());
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load bar tools.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect((): void => {
    refresh().catch((error: unknown): void => {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load bar tools.');
      setIsLoading(false);
    });
  }, [refresh]);

  const toggleTool = useCallback(
    async (toolId: string): Promise<void> => {
      const selectedTool = tools.find((tool: BarTool): boolean => {
        return tool.id === toolId;
      });

      if (!selectedTool) {
        return;
      }

      const nextAvailable = !selectedTool.available;

      setTools((currentTools: Array<BarTool>): Array<BarTool> => {
        return currentTools.map((tool: BarTool): BarTool => {
          return tool.id === toolId ? { ...tool, available: nextAvailable } : tool;
        });
      });

      try {
        await setBarToolAvailability(toolId, nextAvailable);
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to update bar tool.');
        await refresh();
      }
    },
    [refresh, tools],
  );

  return {
    errorMessage,
    isLoading,
    tools,
    toggleTool,
  };
}
