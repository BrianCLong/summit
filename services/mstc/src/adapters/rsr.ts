import type { LocaleCanonMap } from '../types';
import { sortBy } from '../utils';

export interface RsrRegulatoryDigest {
  locale: string;
  vertical: string;
  tag: string;
  canonical: string;
  regulators: string[];
  notes: string[];
  confidence: number;
}

export const toRegulatoryDigest = (canon: LocaleCanonMap): RsrRegulatoryDigest[] => {
  const entries: RsrRegulatoryDigest[] = [];
  for (const [locale, terms] of Object.entries(canon)) {
    for (const term of terms) {
      const regulators = term.regulatorNotes.map(note => note.regulator);
      const notes = term.regulatorNotes.map(note => note.note);
      entries.push({
        locale,
        vertical: term.vertical,
        tag: term.tag,
        canonical: term.canonical,
        regulators,
        notes,
        confidence: term.confidence
      });
    }
  }
  return sortBy(entries, entry => `${entry.locale}:${entry.tag}`);
};
