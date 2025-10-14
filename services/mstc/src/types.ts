export type Vertical = 'health' | 'finance' | 'minors' | 'workplace';

export type VariantKind =
  | 'alias'
  | 'slang'
  | 'misspelling'
  | 'transliteration'
  | 'abbreviation';

export interface Variant {
  type: VariantKind;
  value: string;
  note?: string;
}

export interface RegulatorNote {
  regulator: string;
  note: string;
  citation?: string;
}

export interface CanonicalTerm {
  tag: string;
  canonical: string;
  locale: string;
  vertical: Vertical;
  variants: Variant[];
  regulatorNotes: RegulatorNote[];
  confidence: number;
}

export type LocaleCanon = CanonicalTerm[];

export type LocaleCanonMap = Record<string, LocaleCanon>;

export interface MatchedTerm {
  tag: string;
  matched: string;
  canonical: string;
  locale: string;
  vertical: Vertical;
  confidence: number;
}
