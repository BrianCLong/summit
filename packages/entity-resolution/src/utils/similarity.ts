/**
 * String similarity utilities
 */

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate normalized Levenshtein similarity (0-1)
 */
export function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

/**
 * Calculate Jaro similarity
 */
export function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return (
    (matches / s1.length +
      matches / s2.length +
      (matches - transpositions / 2) / matches) / 3
  );
}

/**
 * Calculate Jaro-Winkler similarity
 */
export function jaroWinklerSimilarity(s1: string, s2: string, prefixScale: number = 0.1): number {
  const jaroSim = jaroSimilarity(s1, s2);

  // Calculate common prefix length (max 4)
  let prefixLength = 0;
  const maxPrefixLength = Math.min(4, Math.min(s1.length, s2.length));

  for (let i = 0; i < maxPrefixLength; i++) {
    if (s1[i] === s2[i]) {
      prefixLength++;
    } else {
      break;
    }
  }

  return jaroSim + prefixLength * prefixScale * (1 - jaroSim);
}

/**
 * Calculate Dice coefficient (bigram similarity)
 */
export function diceCoefficient(s1: string, s2: string): number {
  const bigrams1 = getBigrams(s1);
  const bigrams2 = getBigrams(s2);

  const intersection = bigrams1.filter(b => bigrams2.includes(b));

  return (2 * intersection.length) / (bigrams1.length + bigrams2.length);
}

function getBigrams(s: string): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < s.length - 1; i++) {
    bigrams.push(s.substring(i, i + 2));
  }
  return bigrams;
}

/**
 * Calculate Jaccard similarity
 */
export function jaccardSimilarity(s1: string, s2: string): number {
  const set1 = new Set(s1.toLowerCase().split(/\s+/));
  const set2 = new Set(s2.toLowerCase().split(/\s+/));

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Calculate cosine similarity on character n-grams
 */
export function cosineSimilarity(s1: string, s2: string, n: number = 2): number {
  const ngrams1 = getNgrams(s1, n);
  const ngrams2 = getNgrams(s2, n);

  const freq1 = getFrequencyMap(ngrams1);
  const freq2 = getFrequencyMap(ngrams2);

  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  const allNgrams = new Set([...Object.keys(freq1), ...Object.keys(freq2)]);

  for (const ngram of allNgrams) {
    const f1 = freq1[ngram] || 0;
    const f2 = freq2[ngram] || 0;
    dotProduct += f1 * f2;
    magnitude1 += f1 * f1;
    magnitude2 += f2 * f2;
  }

  if (magnitude1 === 0 || magnitude2 === 0) return 0;

  return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
}

function getNgrams(s: string, n: number): string[] {
  const ngrams: string[] = [];
  for (let i = 0; i <= s.length - n; i++) {
    ngrams.push(s.substring(i, i + n));
  }
  return ngrams;
}

function getFrequencyMap(items: string[]): Record<string, number> {
  const freq: Record<string, number> = {};
  for (const item of items) {
    freq[item] = (freq[item] || 0) + 1;
  }
  return freq;
}

/**
 * Soundex phonetic algorithm
 */
export function soundex(s: string): string {
  const a = s.toUpperCase().split('');
  const firstLetter = a.shift() || '';

  const codes: Record<string, string> = {
    'A': '', 'E': '', 'I': '', 'O': '', 'U': '', 'H': '', 'W': '', 'Y': '',
    'B': '1', 'F': '1', 'P': '1', 'V': '1',
    'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
    'D': '3', 'T': '3',
    'L': '4',
    'M': '5', 'N': '5',
    'R': '6'
  };

  const coded = a
    .map(c => codes[c] || '')
    .filter((c, i, arr) => c !== '' && c !== arr[i - 1])
    .join('');

  return (firstLetter + coded + '000').slice(0, 4);
}

/**
 * Metaphone phonetic algorithm (simplified)
 */
export function metaphone(s: string): string {
  let result = s.toUpperCase();

  // Drop duplicate adjacent letters
  result = result.replace(/(.)\1+/g, '$1');

  // Initial letter transformations
  result = result.replace(/^KN/, 'N');
  result = result.replace(/^GN/, 'N');
  result = result.replace(/^PN/, 'N');
  result = result.replace(/^AE/, 'E');
  result = result.replace(/^WR/, 'R');

  // Drop first letter if appropriate
  if (result.startsWith('X')) {
    result = 'S' + result.slice(1);
  }

  // Basic transformations
  result = result.replace(/[AEIOU]/g, '');
  result = result.replace(/PH/g, 'F');
  result = result.replace(/CK/g, 'K');
  result = result.replace(/GH/g, '');
  result = result.replace(/WH/g, 'W');

  return result.slice(0, 6);
}

/**
 * Normalize string for comparison
 */
export function normalizeString(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s]/g, '')          // Remove punctuation
    .replace(/\s+/g, ' ');            // Normalize whitespace
}
