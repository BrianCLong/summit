import { MSTC_LOCALE_CANON, SUPPORTED_LOCALES, buildLocaleCanon } from './data/canon';
import { normalize, sortBy, unique } from './utils';
import type { CanonicalTerm, LocaleCanon, LocaleCanonMap, MatchedTerm, Vertical } from './types';

export class MSTCService {
  private canon: LocaleCanonMap;

  constructor(seed: LocaleCanonMap = MSTC_LOCALE_CANON) {
    this.canon = seed;
  }

  static bootstrap(): MSTCService {
    return new MSTCService(buildLocaleCanon());
  }

  getLocales(): string[] {
    return sortBy(Object.keys(this.canon), locale => locale);
  }

  hasLocale(locale: string): boolean {
    return Boolean(this.canon[locale]);
  }

  getCanon(locale: string, vertical?: Vertical): LocaleCanon {
    const records = this.canon[locale] ?? [];
    if (!vertical) {
      return records;
    }
    return records.filter(record => record.vertical === vertical);
  }

  getByTag(locale: string, tag: string): CanonicalTerm | undefined {
    return this.canon[locale]?.find(entry => entry.tag === tag);
  }

  match(locale: string, text: string, vertical?: Vertical): MatchedTerm[] {
    const canon = this.getCanon(locale, vertical);
    if (!canon.length || !text.trim()) {
      return [];
    }
    const normalizedHaystack = normalize(text);
    const matches: MatchedTerm[] = [];

    for (const entry of canon) {
      const candidates = unique([
        entry.canonical,
        ...entry.variants.map(variant => variant.value)
      ]);
      for (const candidate of candidates) {
        const normalizedCandidate = normalize(candidate);
        if (!normalizedCandidate || normalizedCandidate.length < 2) {
          continue;
        }
        if (normalizedHaystack.includes(normalizedCandidate)) {
          matches.push({
            tag: entry.tag,
            matched: candidate,
            canonical: entry.canonical,
            locale: entry.locale,
            vertical: entry.vertical,
            confidence: entry.confidence
          });
          break;
        }
      }
    }

    return matches;
  }

  getCanonMap(): LocaleCanonMap {
    return this.canon;
  }
}

export const DEFAULT_MSTC_SERVICE = new MSTCService();
export const DEFAULT_SUPPORTED_LOCALES = SUPPORTED_LOCALES;
