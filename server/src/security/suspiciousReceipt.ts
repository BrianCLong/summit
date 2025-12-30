export interface SuspiciousPayloadResult {
  isSuspicious: boolean;
  reason?: string;
  details?: Record<string, any>;
}

export const HEURISTIC_CONFIG = {
  MAX_AMOUNT: 1_000_000_000,
  MAX_LINE_ITEMS: 10_000,
  UNUSUAL_CURRENCY_CODES: ['XTS', 'XXX', 'XUA', 'XBA', 'XBB', 'XBC', 'XBD'], // Testing codes and non-currency
  // A simple heuristic for weird encodings: high ratio of non-printable or unusual characters
  // or simply detecting long strings that look like base64 but are not declared as such.
  MAX_STRING_LENGTH: 100_000,
  NON_ASCII_THRESHOLD: 0.3, // 30% non-ascii is suspicious
};

/**
 * Checks for extreme amounts in the payload.
 * Looks for keys like 'amount', 'price', 'total', 'value'.
 */
function checkExtremeAmounts(data: any): SuspiciousPayloadResult | null {
  const keysToCheck = ['amount', 'price', 'total', 'value'];

  if (typeof data === 'object' && data !== null) {
    // If array, recurse on elements
    if (Array.isArray(data)) {
      for (const item of data) {
        const result = checkExtremeAmounts(item);
        if (result) return result;
      }
      return null;
    }

    // If object, check keys and recurse
    for (const key of Object.keys(data)) {
      if (keysToCheck.includes(key.toLowerCase())) {
        const value = data[key];
        if (typeof value === 'number' && Math.abs(value) > HEURISTIC_CONFIG.MAX_AMOUNT) {
          return {
            isSuspicious: true,
            reason: `Extreme amount detected in field '${key}'`,
            details: { key, value, threshold: HEURISTIC_CONFIG.MAX_AMOUNT }
          };
        }
      }

      // Only recurse if the value is an object (and not null)
      // We do NOT recurse on primitives because we only care about specific keys for amounts
      if (typeof data[key] === 'object' && data[key] !== null) {
        const result = checkExtremeAmounts(data[key]);
        if (result) return result;
      }
    }
  }

  return null;
}

/**
 * Checks for unusual currency codes.
 * Looks for keys like 'currency', 'currencyCode'.
 */
function checkUnusualCurrencyCodes(data: any): SuspiciousPayloadResult | null {
  const keysToCheck = ['currency', 'currencycode', 'currency_code'];

  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      for (const item of data) {
        const result = checkUnusualCurrencyCodes(item);
        if (result) return result;
      }
      return null;
    }

    for (const key of Object.keys(data)) {
      if (keysToCheck.includes(key.toLowerCase())) {
        const value = data[key];
        if (typeof value === 'string' && HEURISTIC_CONFIG.UNUSUAL_CURRENCY_CODES.includes(value.toUpperCase())) {
          return {
            isSuspicious: true,
            reason: `Unusual currency code detected in field '${key}'`,
            details: { key, value }
          };
        }
      }

      if (typeof data[key] === 'object' && data[key] !== null) {
        const result = checkUnusualCurrencyCodes(data[key]);
        if (result) return result;
      }
    }
  }

  return null;
}

/**
 * Checks for huge line items (arrays).
 */
function checkHugeLineItems(data: any): SuspiciousPayloadResult | null {
  if (Array.isArray(data)) {
    if (data.length > HEURISTIC_CONFIG.MAX_LINE_ITEMS) {
      return {
        isSuspicious: true,
        reason: 'Huge line items array detected',
        details: { length: data.length, threshold: HEURISTIC_CONFIG.MAX_LINE_ITEMS }
      };
    }
    for (const item of data) {
      const result = checkHugeLineItems(item);
      if (result) return result;
    }
  } else if (typeof data === 'object' && data !== null) {
    for (const key of Object.keys(data)) {
      const result = checkHugeLineItems(data[key]);
      if (result) return result;
    }
  }
  return null;
}

/**
 * Checks for weird encodings in strings.
 */
function checkWeirdEncodings(data: any): SuspiciousPayloadResult | null {
  if (typeof data === 'string') {
    if (data.length > HEURISTIC_CONFIG.MAX_STRING_LENGTH) {
       // Too long, check for non-ascii ratio
       const nonAsciiCount = (data.match(/[^\x20-\x7E]/g) || []).length;
       const ratio = nonAsciiCount / data.length;
       if (ratio > HEURISTIC_CONFIG.NON_ASCII_THRESHOLD) {
         return {
           isSuspicious: true,
           reason: 'Suspicious encoding detected (high non-ASCII ratio)',
           details: { ratio, threshold: HEURISTIC_CONFIG.NON_ASCII_THRESHOLD, length: data.length }
         };
       }
    }
    return null;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const result = checkWeirdEncodings(item);
      if (result) return result;
    }
  } else if (typeof data === 'object' && data !== null) {
    for (const key of Object.keys(data)) {
      const result = checkWeirdEncodings(data[key]);
      if (result) return result;
    }
  }
  return null;
}

export function detectSuspiciousPayload(data: any): SuspiciousPayloadResult | null {
  if (!data) return null;

  // 1. Extreme Amounts
  const extremeAmounts = checkExtremeAmounts(data);
  if (extremeAmounts) return extremeAmounts;

  // 2. Unusual Currency Codes
  const unusualCurrency = checkUnusualCurrencyCodes(data);
  if (unusualCurrency) return unusualCurrency;

  // 3. Huge Line Items
  const hugeLineItems = checkHugeLineItems(data);
  if (hugeLineItems) return hugeLineItems;

  // 4. Weird Encodings
  const weirdEncodings = checkWeirdEncodings(data);
  if (weirdEncodings) return weirdEncodings;

  return null;
}
