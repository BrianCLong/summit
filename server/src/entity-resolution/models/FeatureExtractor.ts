import { FuzzyMatcher } from '../engine/FuzzyMatcher.js';
import { PhoneticMatchers } from '../utils/PhoneticMatchers.js';
import { StringNormalizer } from '../utils/StringNormalizer.js';

export interface EntityFeatures {
  name_levenshtein: number;
  name_jaro_winkler: number;
  name_token_jaccard: number;
  name_soundex_match: number; // 1 or 0
  name_metaphone_match: number; // 1 or 0
  address_cosine: number | null;
  phone_match: number | null; // 1 or 0
  email_match: number | null; // 1 or 0
  date_similarity: number | null; // 1 or 0 or score
  [key: string]: number | null;
}

export class FeatureExtractor {
  public static extract(entityA: any, entityB: any): EntityFeatures {
    const features: EntityFeatures = {
      name_levenshtein: 0,
      name_jaro_winkler: 0,
      name_token_jaccard: 0,
      name_soundex_match: 0,
      name_metaphone_match: 0,
      address_cosine: null,
      phone_match: null,
      email_match: null,
      date_similarity: null,
    };

    // Name features
    const nameA = entityA.name || '';
    const nameB = entityB.name || '';
    // We assume name is always present or essential, otherwise we can set to null too.
    // But let's keep it 0 if empty/mismatch for now or handle empty names?
    // If names are empty, they match (1.0)? No, we handled that in FuzzyMatcher as 1.0.
    // But typically name is mandatory.

    features.name_levenshtein = FuzzyMatcher.levenshteinSimilarity(nameA, nameB);
    features.name_jaro_winkler = FuzzyMatcher.jaroWinklerSimilarity(nameA, nameB);
    features.name_token_jaccard = FuzzyMatcher.tokenJaccardSimilarity(nameA, nameB);
    features.name_soundex_match = PhoneticMatchers.matchesSoundex(nameA, nameB) ? 1 : 0;
    features.name_metaphone_match = PhoneticMatchers.matchesMetaphone(nameA, nameB) ? 1 : 0;

    // Address features
    const addrA = entityA.address || '';
    const addrB = entityB.address || '';
    if (addrA && addrB) {
      features.address_cosine = FuzzyMatcher.cosineSimilarity(addrA, addrB);
    } else {
      features.address_cosine = null;
    }

    // Exact matches for identifiers
    if (entityA.phone && entityB.phone) {
        // Simplified phone match
        const p1 = StringNormalizer.normalizePhone(entityA.phone);
        const p2 = StringNormalizer.normalizePhone(entityB.phone);
        features.phone_match = p1 === p2 ? 1 : 0;
    } else {
        features.phone_match = null;
    }

    if (entityA.email && entityB.email) {
        features.email_match = StringNormalizer.normalize(entityA.email) === StringNormalizer.normalize(entityB.email) ? 1 : 0;
    } else {
        features.email_match = null;
    }

    // Date similarity (DOB or Founded Date)
    const dateA = entityA.dateOfBirth || entityA.foundedDate;
    const dateB = entityB.dateOfBirth || entityB.foundedDate;

    if (dateA && dateB) {
      // Exact match for now, could be fuzzy (e.g. within days/years)
      // Assuming ISO strings
      features.date_similarity = dateA === dateB ? 1 : 0;
    } else {
      features.date_similarity = null;
    }

    return features;
  }
}
