import { barTrackerApiBaseUrl } from '../config/api';
import { GuestVisibleBarItem } from '../types/inventory';

export type BarShareSnapshot = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  items: Array<GuestVisibleBarItem>;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
  disabledAt?: string | null;
};

export type CreateShareLinkInput = {
  title: string;
  description?: string | null;
  items: Array<GuestVisibleBarItem>;
};

export type CreateShareLinkResult = {
  shareUrl: string;
  snapshot: BarShareSnapshot;
};

type ApiErrorBody = {
  error?: string;
};

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;

    return body.error ?? `Request failed with status ${response.status}.`;
  } catch {
    return `Request failed with status ${response.status}.`;
  }
}

export async function createShareLink(input: CreateShareLinkInput): Promise<CreateShareLinkResult> {
  const response = await fetch(`${barTrackerApiBaseUrl}/api/shares`, {
    body: JSON.stringify({
      description: input.description ?? null,
      items: input.items,
      title: input.title,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const body = (await response.json()) as {
    shareUrl?: string;
    snapshot?: BarShareSnapshot;
  };

  if (!body.shareUrl || !body.snapshot) {
    throw new Error('Share link response was missing link details.');
  }

  return {
    shareUrl: body.shareUrl,
    snapshot: body.snapshot,
  };
}

export async function disableShareLink(slug: string): Promise<BarShareSnapshot> {
  const response = await fetch(`${barTrackerApiBaseUrl}/api/shares/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const body = (await response.json()) as {
    snapshot?: BarShareSnapshot;
  };

  if (!body.snapshot) {
    throw new Error('Disable response was missing share details.');
  }

  return body.snapshot;
}
