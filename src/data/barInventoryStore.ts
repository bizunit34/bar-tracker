import { useSyncExternalStore } from 'react';

import { InventoryItem } from '../types/inventory';
import { logSafeError } from '../utils/logging';
import {
  archiveItem,
  deleteItem,
  listActiveItems,
  listArchivedItems,
  listGuestVisibleItems,
  listItems,
  normalizeInventoryItem,
  restoreItem,
  saveItem,
} from './barInventoryRepository';

type Listener = () => void;

let barInventoryItems: Array<InventoryItem> = [];
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
    hydrateBarInventoryItems().catch((error: unknown): void => {
      logSafeError('Failed to load bar inventory', error);
    });
  }

  return (): void => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Array<InventoryItem> {
  return barInventoryItems;
}

function replaceItem(item: InventoryItem): void {
  const normalizedItem = normalizeInventoryItem(item);
  const existingIndex = barInventoryItems.findIndex((currentItem: InventoryItem): boolean => {
    return currentItem.id === normalizedItem.id;
  });

  if (existingIndex >= 0) {
    barInventoryItems = barInventoryItems.map((currentItem: InventoryItem): InventoryItem => {
      return currentItem.id === normalizedItem.id ? normalizedItem : currentItem;
    });
  } else {
    barInventoryItems = [normalizedItem, ...barInventoryItems];
  }

  emitChange();
}

function normalizeDuplicateText(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

function duplicateInventoryKey(item: InventoryItem): string {
  return [
    item.category,
    normalizeDuplicateText(item.brand),
    normalizeDuplicateText(item.name),
    normalizeDuplicateText(item.size),
  ].join('::');
}

function findActiveDuplicateItem(item: InventoryItem): InventoryItem | null {
  const duplicateKey = duplicateInventoryKey(item);

  return (
    barInventoryItems.find((currentItem: InventoryItem): boolean => {
      return (
        currentItem.id !== item.id &&
        !currentItem.isArchived &&
        duplicateInventoryKey(currentItem) === duplicateKey
      );
    }) ?? null
  );
}

export async function hydrateBarInventoryItems(): Promise<void> {
  barInventoryItems = await listItems();
  isHydrated = true;
  emitChange();
}

export async function refreshBarInventoryItems(): Promise<void> {
  await hydrateBarInventoryItems();
}

export function useBarInventoryItems(): Array<InventoryItem> {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function saveBarInventoryItem(item: InventoryItem): void {
  const duplicateItem = findActiveDuplicateItem(item);
  const targetItem = duplicateItem ? { ...item, id: duplicateItem.id } : item;
  const currentItem = barInventoryItems.find((inventoryItem: InventoryItem): boolean => {
    return inventoryItem.id === targetItem.id;
  });
  const normalizedItem = normalizeInventoryItem({
    ...currentItem,
    ...targetItem,
    createdAt: currentItem?.createdAt ?? targetItem.createdAt,
    updatedAt: new Date().toISOString(),
  });

  replaceItem(normalizedItem);
  saveItem(normalizedItem).catch((error: unknown): void => {
    logSafeError('Failed to save bar inventory item', error);
  });
}

export function removeBarInventoryItem(itemId: string): void {
  barInventoryItems = barInventoryItems.filter((item: InventoryItem): boolean => {
    return item.id !== itemId;
  });
  emitChange();
  deleteItem(itemId).catch((error: unknown): void => {
    logSafeError('Failed to delete bar inventory item', error);
  });
}

export function archiveBarInventoryItem(itemId: string): void {
  const now = new Date().toISOString();

  barInventoryItems = barInventoryItems.map((item: InventoryItem): InventoryItem => {
    return item.id === itemId
      ? normalizeInventoryItem({ ...item, archivedAt: now, isArchived: true, updatedAt: now })
      : item;
  });
  emitChange();
  archiveItem(itemId).catch((error: unknown): void => {
    logSafeError('Failed to archive bar inventory item', error);
  });
}

export function restoreBarInventoryItem(itemId: string): void {
  barInventoryItems = barInventoryItems.map((item: InventoryItem): InventoryItem => {
    return item.id === itemId
      ? normalizeInventoryItem({
          ...item,
          archivedAt: null,
          isArchived: false,
          updatedAt: new Date().toISOString(),
        })
      : item;
  });
  emitChange();
  restoreItem(itemId).catch((error: unknown): void => {
    logSafeError('Failed to restore bar inventory item', error);
  });
}

export async function listActiveBarInventoryItems(): Promise<Array<InventoryItem>> {
  return listActiveItems();
}

export async function listArchivedBarInventoryItems(): Promise<Array<InventoryItem>> {
  return listArchivedItems();
}

export async function listGuestVisibleBarInventoryItems(): Promise<Array<InventoryItem>> {
  return listGuestVisibleItems();
}
