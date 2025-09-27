import type { LocaleCanonMap } from '../types';
import { normalize, sortBy, unique } from '../utils';

export interface CwsTagExport {
  tag: string;
  vertical: string;
  locales: string[];
  canonicalByLocale: Record<string, string>;
  variantMap: Record<string, string[]>;
}

export const toCwsTaxonomy = (canon: LocaleCanonMap): CwsTagExport[] => {
  const byTag = new Map<string, CwsTagExport>();

  for (const [locale, terms] of Object.entries(canon)) {
    for (const term of terms) {
      const existing = byTag.get(term.tag);
      const variants = unique(
        sortBy(term.variants.map(variant => variant.value), value => normalize(value))
      );

      if (existing) {
        existing.locales.push(locale);
        existing.canonicalByLocale[locale] = term.canonical;
        existing.variantMap[locale] = variants;
      } else {
        byTag.set(term.tag, {
          tag: term.tag,
          vertical: term.vertical,
          locales: [locale],
          canonicalByLocale: { [locale]: term.canonical },
          variantMap: { [locale]: variants }
        });
      }
    }
  }

  const exports: CwsTagExport[] = [];
  for (const record of byTag.values()) {
    record.locales = sortBy(record.locales, locale => locale);
    exports.push(record);
  }

  return sortBy(exports, entry => entry.tag);
};
