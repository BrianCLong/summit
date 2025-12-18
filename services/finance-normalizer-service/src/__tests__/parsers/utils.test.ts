import { describe, it, expect } from 'vitest';
import {
  parseAmount,
  parseDate,
  normalizePartyName,
  inferPartyType,
  inferTransactionType,
  detectDirection,
  cleanIBAN,
  cleanBIC,
  getCurrencyDecimals,
} from '../../parsers/utils.js';
import { createMonetaryAmount } from '@intelgraph/finance-normalizer-types';

describe('parseAmount', () => {
  it('should parse positive decimal amount', () => {
    const result = parseAmount('100.50', 'USD');
    expect(Number(result.amount.minorUnits)).toBe(10050);
    expect(result.amount.currency).toBe('USD');
  });

  it('should parse negative amount with minus prefix', () => {
    const result = parseAmount('-100.50', 'USD');
    expect(Number(result.amount.minorUnits)).toBe(-10050);
  });

  it('should parse amount in parentheses as negative', () => {
    const result = parseAmount('(100.50)', 'USD');
    expect(Number(result.amount.minorUnits)).toBe(-10050);
  });

  it('should parse amount with trailing minus', () => {
    const result = parseAmount('100.50-', 'USD');
    expect(Number(result.amount.minorUnits)).toBe(-10050);
  });

  it('should handle thousands separator', () => {
    const result = parseAmount('1,234,567.89', 'USD');
    expect(Number(result.amount.minorUnits)).toBe(123456789);
  });

  it('should handle European format', () => {
    const result = parseAmount('1.234.567,89', 'EUR', {
      decimalSeparator: ',',
      thousandsSeparator: '.',
    });
    expect(Number(result.amount.minorUnits)).toBe(123456789);
  });

  it('should strip currency symbols', () => {
    expect(Number(parseAmount('$100.00', 'USD').amount.minorUnits)).toBe(10000);
    expect(Number(parseAmount('€100.00', 'EUR').amount.minorUnits)).toBe(10000);
    expect(Number(parseAmount('£100.00', 'GBP').amount.minorUnits)).toBe(10000);
    expect(Number(parseAmount('¥10000', 'JPY').amount.minorUnits)).toBe(10000);
  });

  it('should throw on invalid amount', () => {
    expect(() => parseAmount('not-a-number', 'USD')).toThrow('Invalid amount');
    expect(() => parseAmount('', 'USD')).toThrow('Invalid amount');
  });

  it('should preserve original value', () => {
    const result = parseAmount('  $1,234.56  ', 'USD');
    expect(result.original).toBe('  $1,234.56  ');
  });
});

describe('parseDate', () => {
  it('should parse ISO 8601 date', () => {
    const result = parseDate('2024-01-15');
    expect(result.isoString).toContain('2024-01-15');
    expect(result.timeInferred).toBe(true);
  });

  it('should parse ISO 8601 datetime', () => {
    const result = parseDate('2024-01-15T10:30:00Z');
    expect(result.isoString).toBe('2024-01-15T10:30:00.000Z');
    expect(result.timeInferred).toBe(false);
  });

  it('should parse DD/MM/YYYY format with config', () => {
    const result = parseDate('15/01/2024', { dateFormat: 'DD/MM/YYYY' });
    expect(result.isoString).toContain('2024-01-15');
  });

  it('should parse MM/DD/YYYY format with config', () => {
    const result = parseDate('01/15/2024', { dateFormat: 'MM/DD/YYYY' });
    expect(result.isoString).toContain('2024-01-15');
  });

  it('should throw on invalid date', () => {
    expect(() => parseDate('not-a-date')).toThrow('Invalid date');
    expect(() => parseDate('32/13/2024', { dateFormat: 'DD/MM/YYYY' })).toThrow();
  });

  it('should preserve original value', () => {
    const result = parseDate('2024-01-15');
    expect(result.original).toBe('2024-01-15');
  });
});

describe('normalizePartyName', () => {
  it('should trim whitespace', () => {
    expect(normalizePartyName('  ACME Corp  ')).toBe('ACME Corp');
  });

  it('should normalize multiple spaces', () => {
    expect(normalizePartyName('ACME   Corp')).toBe('ACME Corp');
  });

  it('should uppercase company suffixes', () => {
    expect(normalizePartyName('Acme corp ltd.')).toBe('Acme corp LTD');
    expect(normalizePartyName('Test Inc.')).toBe('Test INC');
    expect(normalizePartyName('Example GmbH')).toBe('Example GMBH');
  });
});

describe('inferPartyType', () => {
  it('should identify financial institutions', () => {
    expect(inferPartyType('First National Bank')).toBe('FINANCIAL_INSTITUTION');
    expect(inferPartyType('Credit Union of America')).toBe('FINANCIAL_INSTITUTION');
    expect(inferPartyType('Wells Fargo, N.A.')).toBe('FINANCIAL_INSTITUTION');
  });

  it('should identify corporations', () => {
    expect(inferPartyType('ACME Corp Ltd')).toBe('CORPORATION');
    expect(inferPartyType('Microsoft Inc')).toBe('CORPORATION');
    expect(inferPartyType('Deutsche AG')).toBe('CORPORATION');
    expect(inferPartyType('Test GmbH')).toBe('CORPORATION');
    expect(inferPartyType('Shell PLC')).toBe('CORPORATION');
  });

  it('should identify individuals', () => {
    expect(inferPartyType('John Smith')).toBe('INDIVIDUAL');
    expect(inferPartyType('Mary Jane Watson')).toBe('INDIVIDUAL');
    expect(inferPartyType("O'Brien Patrick")).toBe('INDIVIDUAL');
  });

  it('should return UNKNOWN for ambiguous names', () => {
    expect(inferPartyType('ABC123')).toBe('UNKNOWN');
    expect(inferPartyType('Test')).toBe('UNKNOWN');
  });
});

describe('inferTransactionType', () => {
  it('should identify wire transfers', () => {
    expect(inferTransactionType('WIRE TRANSFER')).toBe('WIRE');
    expect(inferTransactionType('SWIFT payment')).toBe('WIRE');
  });

  it('should identify ACH transactions', () => {
    expect(inferTransactionType('ACH CREDIT')).toBe('ACH');
    expect(inferTransactionType('DIRECT DEPOSIT')).toBe('ACH');
  });

  it('should identify card transactions', () => {
    const credit = createMonetaryAmount(100, 'USD');
    const debit = createMonetaryAmount(-100, 'USD');

    expect(inferTransactionType('VISA PURCHASE', debit)).toBe('CARD_PURCHASE');
    expect(inferTransactionType('VISA REFUND', credit)).toBe('CARD_REFUND');
    expect(inferTransactionType('MASTERCARD', debit)).toBe('CARD_PURCHASE');
  });

  it('should identify fees', () => {
    expect(inferTransactionType('MONTHLY SERVICE FEE')).toBe('FEE');
    expect(inferTransactionType('MAINTENANCE CHARGE')).toBe('FEE');
  });

  it('should identify interest', () => {
    expect(inferTransactionType('INTEREST PAYMENT')).toBe('INTEREST');
  });

  it('should identify checks', () => {
    expect(inferTransactionType('CHECK #1234')).toBe('CHECK');
    expect(inferTransactionType('CHEQUE DEPOSIT')).toBe('CHECK');
  });

  it('should identify ATM/cash transactions', () => {
    const debit = createMonetaryAmount(-100, 'USD');
    const credit = createMonetaryAmount(100, 'USD');

    expect(inferTransactionType('ATM WITHDRAWAL', debit)).toBe('WITHDRAWAL');
    expect(inferTransactionType('CASH DEPOSIT', credit)).toBe('DEPOSIT');
  });

  it('should default to OTHER for unknown patterns', () => {
    expect(inferTransactionType('MISC TRANSACTION')).toBe('OTHER');
  });
});

describe('detectDirection', () => {
  it('should detect credit indicators', () => {
    expect(detectDirection('C')).toBe('CREDIT');
    expect(detectDirection('CR')).toBe('CREDIT');
    expect(detectDirection('CREDIT')).toBe('CREDIT');
    expect(detectDirection('+')).toBe('CREDIT');
  });

  it('should detect debit indicators', () => {
    expect(detectDirection('D')).toBe('DEBIT');
    expect(detectDirection('DR')).toBe('DEBIT');
    expect(detectDirection('DEBIT')).toBe('DEBIT');
    expect(detectDirection('-')).toBe('DEBIT');
  });

  it('should infer from amount when no indicator', () => {
    const credit = createMonetaryAmount(100, 'USD');
    const debit = createMonetaryAmount(-100, 'USD');

    expect(detectDirection(null, credit)).toBe('CREDIT');
    expect(detectDirection(null, debit)).toBe('DEBIT');
  });

  it('should default to DEBIT when no information', () => {
    expect(detectDirection(null)).toBe('DEBIT');
    expect(detectDirection(undefined)).toBe('DEBIT');
  });
});

describe('cleanIBAN', () => {
  it('should clean valid IBAN', () => {
    expect(cleanIBAN('DE89 3704 0044 0532 0130 00')).toBe('DE89370400440532013000');
    expect(cleanIBAN('GB82WEST12345698765432')).toBe('GB82WEST12345698765432');
  });

  it('should return null for invalid IBAN', () => {
    expect(cleanIBAN('invalid')).toBeNull();
    expect(cleanIBAN('12345')).toBeNull();
    expect(cleanIBAN('XX00')).toBeNull();
  });
});

describe('cleanBIC', () => {
  it('should clean valid BIC/SWIFT codes', () => {
    expect(cleanBIC('DEUTDEFF')).toBe('DEUTDEFF');
    expect(cleanBIC('DEUTDEFF500')).toBe('DEUTDEFF500');
    expect(cleanBIC('deut de ff')).toBe('DEUTDEFF');
  });

  it('should return null for invalid BIC', () => {
    expect(cleanBIC('invalid')).toBeNull();
    expect(cleanBIC('12345678')).toBeNull();
    expect(cleanBIC('TOO')).toBeNull();
  });
});

describe('getCurrencyDecimals', () => {
  it('should return correct decimals for common currencies', () => {
    expect(getCurrencyDecimals('USD')).toBe(2);
    expect(getCurrencyDecimals('EUR')).toBe(2);
    expect(getCurrencyDecimals('GBP')).toBe(2);
  });

  it('should return 0 for zero-decimal currencies', () => {
    expect(getCurrencyDecimals('JPY')).toBe(0);
    expect(getCurrencyDecimals('KRW')).toBe(0);
  });

  it('should return 3 for three-decimal currencies', () => {
    expect(getCurrencyDecimals('BHD')).toBe(3);
    expect(getCurrencyDecimals('KWD')).toBe(3);
  });

  it('should default to 2 for unknown currencies', () => {
    expect(getCurrencyDecimals('XYZ')).toBe(2);
  });
});
