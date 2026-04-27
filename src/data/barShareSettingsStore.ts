import { useSyncExternalStore } from 'react';

import { InventoryItem } from '../types/inventory';
import { BarShareSettings } from '../types/sharing';
import {
  createDefaultShareSettings,
  getShareSettings,
  resetShareSettings,
  saveShareSettings,
} from './barShareSettingsRepository';

export { createDefaultShareSettings };

type Listener = () => void;

let shareSettings: BarShareSettings = createDefaultShareSettings();
let isHydrated = false;
const listeners = new Set<Listener>();

function emitChange(): void {
  listeners.forEach((listener: Listener): void => {
    listener();
  });
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);

  if (!isHydrated) {
    hydrateShareSettings().catch((error: unknown): void => {
      console.error('Failed to load share settings.', error);
    });
  }

  return (): void => {
    listeners.delete(listener);
  };
}

function getSnapshot(): BarShareSettings {
  return shareSettings;
}

export async function hydrateShareSettings(
  fallbackItems: Array<InventoryItem> = [],
): Promise<void> {
  shareSettings = await getShareSettings(fallbackItems);
  isHydrated = true;
  emitChange();
}

export function useBarShareSettings(): BarShareSettings {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function saveBarShareSettings(settings: BarShareSettings): void {
  shareSettings = {
    ...settings,
    updatedAt: new Date().toISOString(),
  };
  emitChange();
  saveShareSettings(shareSettings).catch((error: unknown): void => {
    console.error('Failed to save share settings.', error);
  });
}

export function resetBarShareSettings(fallbackItems: Array<InventoryItem> = []): void {
  shareSettings = createDefaultShareSettings(fallbackItems);
  emitChange();
  resetShareSettings(fallbackItems).catch((error: unknown): void => {
    console.error('Failed to reset share settings.', error);
  });
}
