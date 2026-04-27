export type CatalogItemType =
  | 'spirit'
  | 'liqueur'
  | 'mixer'
  | 'garnish'
  | 'tool'
  | 'glassware'
  | 'bitters'
  | 'syrup'
  | 'other';

export type CatalogImportAttributeValue = boolean | number | string | null;

export type CatalogImportRecord = {
  abv?: number | null;
  adaNumber?: string | null;
  attributes?: Record<string, CatalogImportAttributeValue>;
  basePrice?: number | null;
  bottleSizeMl?: number | null;
  brand?: string | null;
  caseSize?: number | null;
  category?: string | null;
  externalKey?: string;
  importBatchId?: string | null;
  isActive?: boolean;
  isNew?: boolean;
  itemType?: CatalogItemType;
  licenseePrice?: number | null;
  liquorCode?: string | null;
  liquorTypeRaw?: string | null;
  minimumShelfPrice?: number | null;
  name: string;
  normalizedName?: string;
  proof?: number | null;
  sku?: string | null;
  source?: string;
  sourceFile?: string | null;
  status?: string | null;
  subcategory?: string | null;
};

export type NormalizedCatalogImportRecord = Required<
  Pick<
    CatalogImportRecord,
    'externalKey' | 'isActive' | 'isNew' | 'itemType' | 'name' | 'normalizedName' | 'source'
  >
> &
  Omit<
    CatalogImportRecord,
    'externalKey' | 'isActive' | 'isNew' | 'itemType' | 'name' | 'normalizedName' | 'source'
  >;
