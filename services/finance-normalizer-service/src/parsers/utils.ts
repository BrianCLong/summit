import type { MonetaryAmount } from '@intelgraph/finance-normalizer-types';
import { createMonetaryAmount } from '@intelgraph/finance-normalizer-types';
import type { ParsedAmount, ParsedDate, ParserConfig } from './types.js';

const PARSER_VERSION = '1.0.0';

/**
 * Currency decimal places mapping
 */
const CURRENCY_DECIMALS: Record<string, number> = {
  USD: 2, EUR: 2, GBP: 2, CHF: 2, CAD: 2, AUD: 2, NZD: 2,
  JPY: 0, KRW: 0, VND: 0,
  BHD: 3, KWD: 3, OMR: 3,
};

export function getParserVersion(): string {
  return PARSER_VERSION;
}

/**
 * Get decimal places for a currency
 */
export function getCurrencyDecimals(currency: string): number {
  return CURRENCY_DECIMALS[currency.toUpperCase()] ?? 2;
}

/**
 * Parse a monetary amount from string
 */
export function parseAmount(
  value: string,
  currency: string,
  config?: ParserConfig
): ParsedAmount {
  const original = value;
  let cleaned = value.trim();

  // Determine sign
  let negative = false;
  if (cleaned.startsWith('-')) {
    negative = true;
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    // Accounting format negative
    negative = true;
    cleaned = cleaned.substring(1, cleaned.length - 1);
  } else if (cleaned.endsWith('-')) {
    negative = true;
    cleaned = cleaned.substring(0, cleaned.length - 1);
  } else if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Remove currency symbols
  cleaned = cleaned.replace(/[$€£¥₹₽₩]/g, '');

  // Handle thousands separator
  const decimalSep = config?.decimalSeparator || '.';
  const thousandsSep = config?.thousandsSeparator || (decimalSep === '.' ? ',' : '.');

  // Remove thousands separators
  cleaned = cleaned.split(thousandsSep).join('');

  // Normalize decimal separator
  if (decimalSep === ',') {
    cleaned = cleaned.replace(',', '.');
  }

  // Remove any remaining non-numeric characters except decimal
  cleaned = cleaned.replace(/[^\d.]/g, '');

  const numValue = parseFloat(cleaned);
  if (isNaN(numValue)) {
    throw new Error(`Invalid amount: ${original}`);
  }

  const finalValue = negative ? -numValue : numValue;
  const decimals = getCurrencyDecimals(currency);

  return {
    amount: createMonetaryAmount(finalValue, currency, decimals),
    original,
    signInferred: false,
  };
}

/**
 * Parse a date string into ISO format
 */
export function parseDate(
  value: string,
  config?: ParserConfig
): ParsedDate {
  const original = value.trim();
  let timeInferred = false;
  let timezoneInferred = false;

  // Common date formats to try
  const formats = [
    // ISO 8601
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?(?:Z|([+-]\d{2}:\d{2}))?)?$/,
    // European: DD/MM/YYYY or DD.MM.YYYY
    /^(\d{2})[\/.](\d{2})[\/.](\d{4})$/,
    // American: MM/DD/YYYY
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    // YYYYMMDD
    /^(\d{4})(\d{2})(\d{2})$/,
    // DD-Mon-YYYY
    /^(\d{2})-([A-Za-z]{3})-(\d{4})$/,
  ];

  let parsed: Date | null = null;
  const dateFormat = config?.dateFormat?.toUpperCase();

  // Try configured format first
  if (dateFormat) {
    if (dateFormat === 'DD/MM/YYYY' || dateFormat === 'DD.MM.YYYY') {
      const match = original.match(/^(\d{2})[\/.](\d{2})[\/.](\d{4})$/);
      if (match) {
        parsed = new Date(
          parseInt(match[3], 10),
          parseInt(match[2], 10) - 1,
          parseInt(match[1], 10)
        );
        timeInferred = true;
      }
    } else if (dateFormat === 'MM/DD/YYYY') {
      const match = original.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (match) {
        parsed = new Date(
          parseInt(match[3], 10),
          parseInt(match[1], 10) - 1,
          parseInt(match[2], 10)
        );
        timeInferred = true;
      }
    } else if (dateFormat === 'YYYY-MM-DD') {
      const match = original.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) {
        parsed = new Date(
          parseInt(match[1], 10),
          parseInt(match[2], 10) - 1,
          parseInt(match[3], 10)
        );
        timeInferred = true;
      }
    }
  }

  // Try ISO 8601 first
  if (!parsed) {
    const isoMatch = original.match(formats[0]);
    if (isoMatch) {
      parsed = new Date(original);
      timeInferred = !isoMatch[4];
      timezoneInferred = !isoMatch[8] && isoMatch[4] !== undefined;
    }
  }

  // Try other formats
  if (!parsed) {
    // Try parsing with Date constructor
    const attempt = new Date(original);
    if (!isNaN(attempt.getTime())) {
      parsed = attempt;
      timeInferred = !original.includes(':');
      timezoneInferred = !original.includes('Z') && !original.match(/[+-]\d{2}:\d{2}/);
    }
  }

  if (!parsed || isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${original}`);
  }

  // Apply default timezone if needed
  if (timezoneInferred && config?.defaultTimezone) {
    // For now, assume UTC if timezone not specified
    // Full timezone support would require a library like date-fns-tz
  }

  return {
    isoString: parsed.toISOString(),
    original,
    timeInferred,
    timezoneInferred,
  };
}

/**
 * Normalize party name
 */
export function normalizePartyName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b(LTD|LLC|INC|CORP|CO|PLC|SA|AG|GMBH|NV|BV)\b\.?/gi, (m) => m.toUpperCase().replace('.', ''))
    .trim();
}

/**
 * Extract party type from name or other hints
 */
export function inferPartyType(
  name: string,
  hints?: Record<string, string>
): 'INDIVIDUAL' | 'CORPORATION' | 'FINANCIAL_INSTITUTION' | 'UNKNOWN' {
  const upperName = name.toUpperCase();

  // Financial institution indicators
  if (
    upperName.includes('BANK') ||
    upperName.includes('CREDIT UNION') ||
    upperName.includes('SAVINGS') ||
    upperName.includes('TRUST CO') ||
    upperName.includes('N.A.') ||
    upperName.includes('FSB')
  ) {
    return 'FINANCIAL_INSTITUTION';
  }

  // Corporate indicators
  if (
    upperName.includes('LTD') ||
    upperName.includes('LLC') ||
    upperName.includes('INC') ||
    upperName.includes('CORP') ||
    upperName.includes('PLC') ||
    upperName.includes('GMBH') ||
    upperName.includes('AG') ||
    upperName.includes('SA') ||
    upperName.includes('NV') ||
    upperName.includes('BV') ||
    upperName.includes('PTY')
  ) {
    return 'CORPORATION';
  }

  // Individual patterns (simple names)
  const nameParts = name.split(/\s+/);
  if (nameParts.length >= 2 && nameParts.length <= 4) {
    const allAlpha = nameParts.every((p) => /^[A-Za-z'-]+$/.test(p));
    if (allAlpha) {
      return 'INDIVIDUAL';
    }
  }

  return 'UNKNOWN';
}

/**
 * Infer transaction type from description
 */
export function inferTransactionType(
  description: string,
  amount?: MonetaryAmount
): string {
  const upper = description.toUpperCase();

  // Wire/transfer patterns
  if (upper.includes('WIRE') || upper.includes('SWIFT')) return 'WIRE';
  if (upper.includes('ACH') || upper.includes('DIRECT DEPOSIT')) return 'ACH';
  if (upper.includes('TRANSFER')) return 'TRANSFER';

  // Card patterns
  if (upper.includes('VISA') || upper.includes('MASTERCARD') || upper.includes('AMEX')) {
    return amount && amount.minorUnits < BigInt(0) ? 'CARD_PURCHASE' : 'CARD_REFUND';
  }

  // Fee patterns
  if (upper.includes('FEE') || upper.includes('CHARGE')) return 'FEE';
  if (upper.includes('INTEREST')) return 'INTEREST';

  // Check patterns
  if (upper.includes('CHECK') || upper.includes('CHK') || upper.includes('CHEQUE')) return 'CHECK';

  // ATM/Cash
  if (upper.includes('ATM') || upper.includes('CASH')) {
    return amount && amount.minorUnits < BigInt(0) ? 'WITHDRAWAL' : 'DEPOSIT';
  }

  // Payment
  if (upper.includes('PAYMENT') || upper.includes('PMT')) return 'PAYMENT';

  // Deposit
  if (upper.includes('DEPOSIT') || upper.includes('DEP')) return 'DEPOSIT';

  return 'OTHER';
}

/**
 * Generate a deterministic reference number from transaction data
 */
export function generateReferenceNumber(
  date: string,
  amount: string,
  counterparty: string,
  sequence?: number
): string {
  const dateStr = date.replace(/\D/g, '').substring(0, 8);
  const amountHash = Math.abs(hashString(amount)).toString(16).substring(0, 4);
  const partyHash = Math.abs(hashString(counterparty)).toString(16).substring(0, 4);
  const seq = sequence?.toString().padStart(4, '0') || '0000';
  return `FN${dateStr}${amountHash}${partyHash}${seq}`.toUpperCase();
}

/**
 * Simple string hash function
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

/**
 * Detect credit/debit from various indicator patterns
 */
export function detectDirection(
  indicator: string | null | undefined,
  amount?: MonetaryAmount
): 'CREDIT' | 'DEBIT' {
  if (indicator) {
    const upper = indicator.toUpperCase().trim();
    if (upper === 'C' || upper === 'CR' || upper === 'CREDIT' || upper === '+') {
      return 'CREDIT';
    }
    if (upper === 'D' || upper === 'DR' || upper === 'DEBIT' || upper === '-') {
      return 'DEBIT';
    }
  }

  // Infer from amount sign
  if (amount) {
    return amount.minorUnits >= BigInt(0) ? 'CREDIT' : 'DEBIT';
  }

  return 'DEBIT';
}

/**
 * Clean and validate IBAN
 */
export function cleanIBAN(iban: string): string | null {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(cleaned)) {
    return null;
  }
  return cleaned;
}

/**
 * Clean and validate BIC/SWIFT code
 */
export function cleanBIC(bic: string): string | null {
  const cleaned = bic.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleaned)) {
    return null;
  }
  return cleaned;
}
