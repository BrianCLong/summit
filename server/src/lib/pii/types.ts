export enum PiiCategory {
  None = 'NONE',
  Low = 'LOW',
  Sensitive = 'SENSITIVE',
  HighlySensitive = 'HIGHLY_SENSITIVE',
}

export interface PiiClassification {
  category: PiiCategory;
  confidence?: number;
}

export interface PiiTaggedField {
  [fieldName: string]: PiiClassification;
}
