const HOMOGLYPHS: Record<string, string> = {
  '0': 'o',
  '1': 'l',
  '3': 'e',
  '5': 's',
  '@': 'a',
  '¡': 'i'
};

const homoglyphRegex = new RegExp(`[${Object.keys(HOMOGLYPHS).join('')}]`, 'g');

function levenshteinDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  if (!a) {
    return b.length;
  }

  if (!b) {
    return a.length;
  }

  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

export function normalizeHost(host: string): string {
  return host
    .toLowerCase()
    .replace(homoglyphRegex, (char) => HOMOGLYPHS[char] ?? char)
    .replace(/[^a-z0-9.-]/g, '');
}

export function hostSimilarity(candidate: string, canonical: string): number {
  const normalizedCandidate = normalizeHost(candidate);
  const normalizedCanonical = normalizeHost(canonical);

  if (!normalizedCandidate || !normalizedCanonical) {
    return 0;
  }

  const distance = levenshteinDistance(normalizedCandidate, normalizedCanonical);
  const longest = Math.max(normalizedCandidate.length, normalizedCanonical.length) || 1;

  return 1 - distance / longest;
}

export function isLookalikeDomain(candidate: string, canonical: string, threshold = 0.82): boolean {
  try {
    return hostSimilarity(candidate, canonical) >= threshold;
  } catch (error) {
    console.warn('domainSimilarity.isLookalikeDomain failed', error);
    return false;
  }
}
