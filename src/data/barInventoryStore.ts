import { useSyncExternalStore } from 'react';

import { InventoryItem } from '../types/inventory';

type Listener = () => void;

let barInventoryItems: Array<InventoryItem> = [];
const listeners = new Set<Listener>();

function emitChange(): void {
  listeners.forEach((listener: Listener): void => {
    listener();
  });
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);

  return (): void => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Array<InventoryItem> {
  return barInventoryItems;
}

export function useBarInventoryItems(): Array<InventoryItem> {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function saveBarInventoryItem(item: InventoryItem): void {
  const existingIndex = barInventoryItems.findIndex((currentItem: InventoryItem): boolean => {
    return currentItem.id === item.id;
  });

  if (existingIndex >= 0) {
    barInventoryItems = barInventoryItems.map((currentItem: InventoryItem): InventoryItem => {
      return currentItem.id === item.id ? item : currentItem;
    });
  } else {
    barInventoryItems = [...barInventoryItems, item];
  }

  emitChange();
}

export function removeBarInventoryItem(itemId: string): void {
  barInventoryItems = barInventoryItems.filter((item: InventoryItem): boolean => {
    return item.id !== itemId;
  });
  emitChange();
}

export function archiveBarInventoryItem(itemId: string): void {
  barInventoryItems = barInventoryItems.map((item: InventoryItem): InventoryItem => {
    return item.id === itemId ? { ...item, isArchived: true } : item;
  });
  emitChange();
}
