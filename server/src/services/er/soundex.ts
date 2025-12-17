
export function soundex(name: string): string {
  let s = name.toUpperCase().replace(/[^A-Z]/g, '');
  if (!s) {
    return '';
  }
  const firstChar = s[0];

  // Mapping based on American Soundex
  // 1: B, F, P, V
  // 2: C, G, J, K, Q, S, X, Z
  // 3: D, T
  // 4: L
  // 5: M, N
  // 6: R
  // H, W are treated specially as separators

  const getCode = (c: string): string => {
    const map: { [key: string]: string } = {
      B: '1', F: '1', P: '1', V: '1',
      C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
      D: '3', T: '3',
      L: '4',
      M: '5', N: '5',
      R: '6',
    };
    return map[c] || '0';
  };

  let result = firstChar;
  // Initialize prevCode based on the *mapping* of the first char,
  // not the raw char, to handle cases like Pfister (P=1, f=1 -> P1) where adjacent same codes are merged.
  // Actually, rule 3 says: "If two or more letters with the same number are adjacent in the original name... only retain the first letter".
  // Also "two letters with the same number separated by 'h' or 'w' are coded as a single number".

  let lastCode = getCode(firstChar);

  for (let i = 1; i < s.length; i++) {
    if (result.length >= 4) break;

    const char = s[i];
    const code = getCode(char);

    // H and W are ignored for coding, but they do NOT break the continuity of the previous code check
    // "Ashcraft" -> A (2) s h c (2) r a f t
    // s=2, h=ignored, c=2. Since 'h' is between 's' and 'c', and they have same code, we treat them as adjacent same codes -> merge.

    if (char === 'H' || char === 'W') {
      // Do nothing, but do NOT update lastCode.
      // This effectively allows the check against the previous code to "skip" over H and W.
      continue;
    }

    if (code !== '0') {
      if (code !== lastCode) {
        result += code;
        lastCode = code;
      }
      // If code == lastCode, we ignore it (merge rule)
      // EXCEPT if separated by a vowel (A,E,I,O,U,Y).
      // But vowels have code '0', so if we hit a vowel, lastCode becomes '0'.
      // So if we have C (2) A (0) C (2), then:
      // 1. C -> 2. lastCode=2.
      // 2. A -> 0. lastCode=0.
      // 3. C -> 2. code!=lastCode. Append 2. Correct.

      // If we have S (2) H (ignored) C (2):
      // 1. S -> 2. lastCode=2.
      // 2. H -> continue. lastCode remains 2.
      // 3. C -> 2. code==lastCode. Ignore. Correct.
    } else {
       // It's a vowel (A, E, I, O, U, Y)
       lastCode = '0';
    }
  }

  while (result.length < 4) {
    result += '0';
  }
  return result;
}
