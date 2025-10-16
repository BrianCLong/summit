import type { LocaleCanonMap } from '../types';
import { normalize, sortBy, unique } from '../utils';

export interface PpcBlocklistEntry {
  locale: string;
  tag: string;
  vertical: string;
  phrases: string[];
  confidence: number;
}

export const toPpcBlocklist = (
  canon: LocaleCanonMap,
  locales: string[] = Object.keys(canon),
): PpcBlocklistEntry[] => {
  const normalizedLocales = sortBy(
    locales.filter((locale) => canon[locale]),
    (locale) => locale,
  );
  const rows: PpcBlocklistEntry[] = [];

  for (const locale of normalizedLocales) {
    for (const entry of canon[locale] ?? []) {
      const phrases = unique(
        sortBy(
          [entry.canonical, ...entry.variants.map((variant) => variant.value)],
          (phrase) => normalize(phrase),
        ),
      );
      rows.push({
        locale,
        tag: entry.tag,
        vertical: entry.vertical,
        phrases,
        confidence: entry.confidence,
      });
    }
  }

  return sortBy(rows, (row) => `${row.locale}:${row.tag}`);
};
