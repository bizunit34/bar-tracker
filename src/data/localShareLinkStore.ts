import { useSyncExternalStore } from 'react';

import { LocalShareLinkRecord } from '../types/shareLinks';
import { logSafeError } from '../utils/logging';
import {
  listLocalShareLinks,
  markLocalShareLinkDisabled,
  saveLocalShareLink,
} from './localShareLinkRepository';

type Listener = () => void;

let localShareLinks: Array<LocalShareLinkRecord> = [];
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
    hydrateLocalShareLinks().catch((error: unknown): void => {
      logSafeError('Failed to load local share links', error);
    });
  }

  return (): void => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Array<LocalShareLinkRecord> {
  return localShareLinks;
}

function replaceRecord(record: LocalShareLinkRecord): void {
  const existingIndex = localShareLinks.findIndex((link: LocalShareLinkRecord): boolean => {
    return link.slug === record.slug;
  });

  if (existingIndex >= 0) {
    localShareLinks = localShareLinks.map((link: LocalShareLinkRecord): LocalShareLinkRecord => {
      return link.slug === record.slug ? record : link;
    });
  } else {
    localShareLinks = [record, ...localShareLinks];
  }

  emitChange();
}

export async function hydrateLocalShareLinks(): Promise<void> {
  localShareLinks = await listLocalShareLinks();
  isHydrated = true;
  emitChange();
}

export function useLocalShareLinks(): Array<LocalShareLinkRecord> {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function saveLocalShareLinkRecord(record: LocalShareLinkRecord): void {
  replaceRecord(record);
  saveLocalShareLink(record)
    .then(replaceRecord)
    .catch((error: unknown): void => {
      logSafeError('Failed to save local share link', error);
    });
}

export async function disableLocalShareLinkRecord(
  slug: string,
): Promise<LocalShareLinkRecord | null> {
  const disabledAt = new Date().toISOString();

  localShareLinks = localShareLinks.map((link: LocalShareLinkRecord): LocalShareLinkRecord => {
    return link.slug === slug ? { ...link, disabledAt, updatedAt: disabledAt } : link;
  });
  emitChange();

  const record = await markLocalShareLinkDisabled(slug, disabledAt);

  if (record) {
    replaceRecord(record);
  }

  return record;
}
