/**
 * Entity Resolution Service - Similarity Functions
 *
 * Provides deterministic similarity measures for entity matching
 */

/**
 * String similarity using Levenshtein distance
 * Returns score in [0, 1] where 1 is exact match
 */
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;

  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(a, b);
  return 1.0 - distance / maxLen;
}

/**
 * Levenshtein distance (edit distance) between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Jaro-Winkler similarity (good for names)
 * Returns score in [0, 1] where 1 is exact match
 */
export function jaroWinklerSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;

  // Jaro similarity
  const aLen = a.length;
  const bLen = b.length;
  const matchWindow = Math.floor(Math.max(aLen, bLen) / 2) - 1;

  const aMatches = new Array(aLen).fill(false);
  const bMatches = new Array(bLen).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < aLen; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, bLen);

    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < aLen; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const jaro = (matches / aLen + matches / bLen + (matches - transpositions / 2) / matches) / 3;

  // Winkler modification
  const prefix = Math.min(4, Math.min(aLen, bLen));
  let prefixLen = 0;
  for (let i = 0; i < prefix; i++) {
    if (a[i] === b[i]) prefixLen++;
    else break;
  }

  return jaro + prefixLen * 0.1 * (1 - jaro);
}

/**
 * Geographic distance between two points using Haversine formula
 * Returns distance in kilometers
 * @param locA Object with latitude and longitude
 * @param locB Object with latitude and longitude
 */
export function geoDistanceKm(
  locA: { latitude: number; longitude: number } | null | undefined,
  locB: { latitude: number; longitude: number } | null | undefined
): number | null {
  if (!locA || !locB) return null;

  const R = 6371; // Earth's radius in km
  const dLat = toRad(locB.latitude - locA.latitude);
  const dLon = toRad(locB.longitude - locA.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(locA.latitude)) *
      Math.cos(toRad(locB.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Temporal overlap score for two time periods
 * Returns score in [0, 1] where 1 is complete overlap
 * @param periodA Object with optional start and end ISO timestamps
 * @param periodB Object with optional start and end ISO timestamps
 */
export function temporalOverlapScore(
  periodA: { start?: string; end?: string } | null | undefined,
  periodB: { start?: string; end?: string } | null | undefined
): number {
  if (!periodA || !periodB) return 0;

  const aStart = periodA.start ? new Date(periodA.start).getTime() : -Infinity;
  const aEnd = periodA.end ? new Date(periodA.end).getTime() : Infinity;
  const bStart = periodB.start ? new Date(periodB.start).getTime() : -Infinity;
  const bEnd = periodB.end ? new Date(periodB.end).getTime() : Infinity;

  // Calculate overlap
  const overlapStart = Math.max(aStart, bStart);
  const overlapEnd = Math.min(aEnd, bEnd);
  const overlap = Math.max(0, overlapEnd - overlapStart);

  // Calculate union
  const unionStart = Math.min(aStart, bStart);
  const unionEnd = Math.max(aEnd, bEnd);
  const union = unionEnd - unionStart;

  if (union === 0 || union === Infinity) return 0;
  return overlap / union;
}

/**
 * Count shared identifiers between two records
 * @param idsA Array of identifier strings
 * @param idsB Array of identifier strings
 */
export function sharedIdentifiersCount(
  idsA: string[] | null | undefined,
  idsB: string[] | null | undefined
): number {
  if (!idsA || !idsB) return 0;

  const setA = new Set(idsA.map((id) => id.toLowerCase().trim()));
  const setB = new Set(idsB.map((id) => id.toLowerCase().trim()));

  let count = 0;
  for (const id of setA) {
    if (setB.has(id)) count++;
  }

  return count;
}
