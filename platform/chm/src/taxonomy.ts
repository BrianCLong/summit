export type ClassificationCode = 'TS' | 'S' | 'C' | 'U';

export interface TaxonomyLevel {
  code: ClassificationCode;
  name: string;
  maxDurationDays: number;
  bannerColor: string;
  stamp: string;
}

export const defaultTaxonomy: TaxonomyLevel[] = [
  { code: 'TS', name: 'Top Secret', maxDurationDays: 365, bannerColor: '#8b0000', stamp: 'TS//SCI' },
  { code: 'S', name: 'Secret', maxDurationDays: 365, bannerColor: '#b22222', stamp: 'SECRET' },
  { code: 'C', name: 'Confidential', maxDurationDays: 730, bannerColor: '#1e90ff', stamp: 'CONFIDENTIAL' },
  { code: 'U', name: 'Unclassified', maxDurationDays: 0, bannerColor: '#228b22', stamp: 'UNCLASSIFIED' }
];

export const taxonomyMap = new Map(defaultTaxonomy.map((item) => [item.code, item]));

export const getLevel = (code: ClassificationCode): TaxonomyLevel => {
  const level = taxonomyMap.get(code);
  if (!level) {
    throw new Error(`Unknown classification code: ${code}`);
  }
  return level;
};

export const normalizeCode = (code: string): ClassificationCode => {
  const upper = code.toUpperCase();
  if (!taxonomyMap.has(upper as ClassificationCode)) {
    throw new Error(`Unsupported classification ${code}`);
  }
  return upper as ClassificationCode;
};
