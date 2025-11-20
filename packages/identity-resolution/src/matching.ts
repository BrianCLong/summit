/**
 * Matching algorithms for identity resolution
 */

/**
 * Calculate similarity between two values based on field type
 */
export function calculateSimilarity(
  value1: any,
  value2: any,
  fieldName: string
): number {
  if (value1 === value2) return 1.0;
  if (!value1 || !value2) return 0.0;

  // Type-specific similarity
  if (typeof value1 === 'string' && typeof value2 === 'string') {
    return stringSimilarity(value1, value2, fieldName);
  }

  if (typeof value1 === 'number' && typeof value2 === 'number') {
    return numberSimilarity(value1, value2);
  }

  if (value1 instanceof Date && value2 instanceof Date) {
    return dateSimilarity(value1, value2);
  }

  // Default comparison
  return value1 === value2 ? 1.0 : 0.0;
}

/**
 * Calculate similarity between strings using multiple algorithms
 */
export function stringSimilarity(
  str1: string,
  str2: string,
  fieldName: string
): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;

  // Field-specific matching
  if (fieldName.includes('email')) {
    return emailSimilarity(s1, s2);
  }

  if (fieldName.includes('phone')) {
    return phoneSimilarity(s1, s2);
  }

  if (fieldName.includes('name')) {
    return nameSimilarity(s1, s2);
  }

  if (fieldName.includes('address')) {
    return addressSimilarity(s1, s2);
  }

  // Default: Levenshtein distance based similarity
  return levenshteinSimilarity(s1, s2);
}

/**
 * Levenshtein distance-based similarity
 */
export function levenshteinSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);

  if (maxLength === 0) return 1.0;

  return 1 - distance / maxLength;
}

/**
 * Calculate Levenshtein distance
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Jaro-Winkler similarity for names
 */
export function jaroWinklerSimilarity(str1: string, str2: string): number {
  const jaro = jaroSimilarity(str1, str2);

  // Jaro-Winkler adds bonus for common prefix
  let prefix = 0;
  const maxPrefix = Math.min(4, Math.min(str1.length, str2.length));

  for (let i = 0; i < maxPrefix; i++) {
    if (str1[i] === str2[i]) {
      prefix++;
    } else {
      break;
    }
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Jaro similarity
 */
export function jaroSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0 && len2 === 0) return 1.0;
  if (len1 === 0 || len2 === 0) return 0.0;

  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  const matches1 = new Array(len1).fill(false);
  const matches2 = new Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);

    for (let j = start; j < end; j++) {
      if (matches2[j] || str1[i] !== str2[j]) continue;
      matches1[i] = true;
      matches2[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  // Find transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!matches1[i]) continue;
    while (!matches2[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }

  return (
    (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3
  );
}

/**
 * Email similarity
 */
export function emailSimilarity(email1: string, email2: string): number {
  const [user1, domain1] = email1.split('@');
  const [user2, domain2] = email2.split('@');

  if (domain1 !== domain2) return 0.3; // Different domains, low similarity

  return levenshteinSimilarity(user1, user2);
}

/**
 * Phone number similarity
 */
export function phoneSimilarity(phone1: string, phone2: string): number {
  // Normalize phone numbers (remove non-digits)
  const p1 = phone1.replace(/\D/g, '');
  const p2 = phone2.replace(/\D/g, '');

  if (p1 === p2) return 1.0;

  // Compare last 10 digits (for international numbers)
  const suffix1 = p1.slice(-10);
  const suffix2 = p2.slice(-10);

  if (suffix1 === suffix2) return 0.95;

  return levenshteinSimilarity(p1, p2);
}

/**
 * Name similarity using phonetic and fuzzy matching
 */
export function nameSimilarity(name1: string, name2: string): number {
  // Exact match
  if (name1 === name2) return 1.0;

  // Split into tokens
  const tokens1 = name1.split(/\s+/);
  const tokens2 = name2.split(/\s+/);

  // Compare token by token
  let totalSimilarity = 0;
  const maxTokens = Math.max(tokens1.length, tokens2.length);

  for (let i = 0; i < maxTokens; i++) {
    const t1 = tokens1[i] || '';
    const t2 = tokens2[i] || '';

    totalSimilarity += jaroWinklerSimilarity(t1, t2);
  }

  return totalSimilarity / maxTokens;
}

/**
 * Address similarity
 */
export function addressSimilarity(addr1: string, addr2: string): number {
  // Normalize addresses
  const normalize = (addr: string) =>
    addr
      .toLowerCase()
      .replace(/\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln)\b/g, '')
      .replace(/[^\w\s]/g, '')
      .trim();

  const n1 = normalize(addr1);
  const n2 = normalize(addr2);

  return levenshteinSimilarity(n1, n2);
}

/**
 * Number similarity
 */
export function numberSimilarity(num1: number, num2: number): number {
  if (num1 === num2) return 1.0;

  const diff = Math.abs(num1 - num2);
  const max = Math.max(Math.abs(num1), Math.abs(num2));

  if (max === 0) return 1.0;

  return 1 - Math.min(diff / max, 1);
}

/**
 * Date similarity
 */
export function dateSimilarity(date1: Date, date2: Date): number {
  const diff = Math.abs(date1.getTime() - date2.getTime());
  const oneDay = 24 * 60 * 60 * 1000;
  const oneYear = 365 * oneDay;

  if (diff === 0) return 1.0;
  if (diff > oneYear) return 0.0;

  return 1 - diff / oneYear;
}

/**
 * Soundex algorithm for phonetic matching
 */
export function soundex(str: string): string {
  const code = str
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .split('');

  if (code.length === 0) return '0000';

  const first = code[0];
  const mapping: Record<string, string> = {
    B: '1',
    F: '1',
    P: '1',
    V: '1',
    C: '2',
    G: '2',
    J: '2',
    K: '2',
    Q: '2',
    S: '2',
    X: '2',
    Z: '2',
    D: '3',
    T: '3',
    L: '4',
    M: '5',
    N: '5',
    R: '6'
  };

  const encoded = code
    .slice(1)
    .map(c => mapping[c] || '0')
    .filter((c, i, arr) => c !== '0' && c !== arr[i - 1])
    .join('')
    .slice(0, 3)
    .padEnd(3, '0');

  return first + encoded;
}
