export type LocalShareLinkRecord = {
  createdAt: string;
  description?: string | null;
  disabledAt?: string | null;
  id: string;
  managementToken: string;
  shareUrl: string;
  slug: string;
  title: string;
  updatedAt: string;
};
