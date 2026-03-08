"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const utils_js_1 = require("../../parsers/utils.js");
const finance_normalizer_types_1 = require("@intelgraph/finance-normalizer-types");
(0, vitest_1.describe)('parseAmount', () => {
    (0, vitest_1.it)('should parse positive decimal amount', () => {
        const result = (0, utils_js_1.parseAmount)('100.50', 'USD');
        (0, vitest_1.expect)(Number(result.amount.minorUnits)).toBe(10050);
        (0, vitest_1.expect)(result.amount.currency).toBe('USD');
    });
    (0, vitest_1.it)('should parse negative amount with minus prefix', () => {
        const result = (0, utils_js_1.parseAmount)('-100.50', 'USD');
        (0, vitest_1.expect)(Number(result.amount.minorUnits)).toBe(-10050);
    });
    (0, vitest_1.it)('should parse amount in parentheses as negative', () => {
        const result = (0, utils_js_1.parseAmount)('(100.50)', 'USD');
        (0, vitest_1.expect)(Number(result.amount.minorUnits)).toBe(-10050);
    });
    (0, vitest_1.it)('should parse amount with trailing minus', () => {
        const result = (0, utils_js_1.parseAmount)('100.50-', 'USD');
        (0, vitest_1.expect)(Number(result.amount.minorUnits)).toBe(-10050);
    });
    (0, vitest_1.it)('should handle thousands separator', () => {
        const result = (0, utils_js_1.parseAmount)('1,234,567.89', 'USD');
        (0, vitest_1.expect)(Number(result.amount.minorUnits)).toBe(123456789);
    });
    (0, vitest_1.it)('should handle European format', () => {
        const result = (0, utils_js_1.parseAmount)('1.234.567,89', 'EUR', {
            decimalSeparator: ',',
            thousandsSeparator: '.',
        });
        (0, vitest_1.expect)(Number(result.amount.minorUnits)).toBe(123456789);
    });
    (0, vitest_1.it)('should strip currency symbols', () => {
        (0, vitest_1.expect)(Number((0, utils_js_1.parseAmount)('$100.00', 'USD').amount.minorUnits)).toBe(10000);
        (0, vitest_1.expect)(Number((0, utils_js_1.parseAmount)('€100.00', 'EUR').amount.minorUnits)).toBe(10000);
        (0, vitest_1.expect)(Number((0, utils_js_1.parseAmount)('£100.00', 'GBP').amount.minorUnits)).toBe(10000);
        (0, vitest_1.expect)(Number((0, utils_js_1.parseAmount)('¥10000', 'JPY').amount.minorUnits)).toBe(10000);
    });
    (0, vitest_1.it)('should throw on invalid amount', () => {
        (0, vitest_1.expect)(() => (0, utils_js_1.parseAmount)('not-a-number', 'USD')).toThrow('Invalid amount');
        (0, vitest_1.expect)(() => (0, utils_js_1.parseAmount)('', 'USD')).toThrow('Invalid amount');
    });
    (0, vitest_1.it)('should preserve original value', () => {
        const result = (0, utils_js_1.parseAmount)('  $1,234.56  ', 'USD');
        (0, vitest_1.expect)(result.original).toBe('  $1,234.56  ');
    });
});
(0, vitest_1.describe)('parseDate', () => {
    (0, vitest_1.it)('should parse ISO 8601 date', () => {
        const result = (0, utils_js_1.parseDate)('2024-01-15');
        (0, vitest_1.expect)(result.isoString).toContain('2024-01-15');
        (0, vitest_1.expect)(result.timeInferred).toBe(true);
    });
    (0, vitest_1.it)('should parse ISO 8601 datetime', () => {
        const result = (0, utils_js_1.parseDate)('2024-01-15T10:30:00Z');
        (0, vitest_1.expect)(result.isoString).toBe('2024-01-15T10:30:00.000Z');
        (0, vitest_1.expect)(result.timeInferred).toBe(false);
    });
    (0, vitest_1.it)('should parse DD/MM/YYYY format with config', () => {
        const result = (0, utils_js_1.parseDate)('15/01/2024', { dateFormat: 'DD/MM/YYYY' });
        (0, vitest_1.expect)(result.isoString).toContain('2024-01-15');
    });
    (0, vitest_1.it)('should parse MM/DD/YYYY format with config', () => {
        const result = (0, utils_js_1.parseDate)('01/15/2024', { dateFormat: 'MM/DD/YYYY' });
        (0, vitest_1.expect)(result.isoString).toContain('2024-01-15');
    });
    (0, vitest_1.it)('should throw on invalid date', () => {
        (0, vitest_1.expect)(() => (0, utils_js_1.parseDate)('not-a-date')).toThrow('Invalid date');
        (0, vitest_1.expect)(() => (0, utils_js_1.parseDate)('32/13/2024', { dateFormat: 'DD/MM/YYYY' })).toThrow();
    });
    (0, vitest_1.it)('should preserve original value', () => {
        const result = (0, utils_js_1.parseDate)('2024-01-15');
        (0, vitest_1.expect)(result.original).toBe('2024-01-15');
    });
});
(0, vitest_1.describe)('normalizePartyName', () => {
    (0, vitest_1.it)('should trim whitespace', () => {
        (0, vitest_1.expect)((0, utils_js_1.normalizePartyName)('  ACME Corp  ')).toBe('ACME Corp');
    });
    (0, vitest_1.it)('should normalize multiple spaces', () => {
        (0, vitest_1.expect)((0, utils_js_1.normalizePartyName)('ACME   Corp')).toBe('ACME Corp');
    });
    (0, vitest_1.it)('should uppercase company suffixes', () => {
        (0, vitest_1.expect)((0, utils_js_1.normalizePartyName)('Acme corp ltd.')).toBe('Acme corp LTD');
        (0, vitest_1.expect)((0, utils_js_1.normalizePartyName)('Test Inc.')).toBe('Test INC');
        (0, vitest_1.expect)((0, utils_js_1.normalizePartyName)('Example GmbH')).toBe('Example GMBH');
    });
});
(0, vitest_1.describe)('inferPartyType', () => {
    (0, vitest_1.it)('should identify financial institutions', () => {
        (0, vitest_1.expect)((0, utils_js_1.inferPartyType)('First National Bank')).toBe('FINANCIAL_INSTITUTION');
        (0, vitest_1.expect)((0, utils_js_1.inferPartyType)('Credit Union of America')).toBe('FINANCIAL_INSTITUTION');
        (0, vitest_1.expect)((0, utils_js_1.inferPartyType)('Wells Fargo, N.A.')).toBe('FINANCIAL_INSTITUTION');
    });
    (0, vitest_1.it)('should identify corporations', () => {
        (0, vitest_1.expect)((0, utils_js_1.inferPartyType)('ACME Corp Ltd')).toBe('CORPORATION');
        (0, vitest_1.expect)((0, utils_js_1.inferPartyType)('Microsoft Inc')).toBe('CORPORATION');
        (0, vitest_1.expect)((0, utils_js_1.inferPartyType)('Deutsche AG')).toBe('CORPORATION');
        (0, vitest_1.expect)((0, utils_js_1.inferPartyType)('Test GmbH')).toBe('CORPORATION');
        (0, vitest_1.expect)((0, utils_js_1.inferPartyType)('Shell PLC')).toBe('CORPORATION');
    });
    (0, vitest_1.it)('should identify individuals', () => {
        (0, vitest_1.expect)((0, utils_js_1.inferPartyType)('John Smith')).toBe('INDIVIDUAL');
        (0, vitest_1.expect)((0, utils_js_1.inferPartyType)('Mary Jane Watson')).toBe('INDIVIDUAL');
        (0, vitest_1.expect)((0, utils_js_1.inferPartyType)("O'Brien Patrick")).toBe('INDIVIDUAL');
    });
    (0, vitest_1.it)('should return UNKNOWN for ambiguous names', () => {
        (0, vitest_1.expect)((0, utils_js_1.inferPartyType)('ABC123')).toBe('UNKNOWN');
        (0, vitest_1.expect)((0, utils_js_1.inferPartyType)('Test')).toBe('UNKNOWN');
    });
});
(0, vitest_1.describe)('inferTransactionType', () => {
    (0, vitest_1.it)('should identify wire transfers', () => {
        (0, vitest_1.expect)((0, utils_js_1.inferTransactionType)('WIRE TRANSFER')).toBe('WIRE');
        (0, vitest_1.expect)((0, utils_js_1.inferTransactionType)('SWIFT payment')).toBe('WIRE');
    });
    (0, vitest_1.it)('should identify ACH transactions', () => {
        (0, vitest_1.expect)((0, utils_js_1.inferTransactionType)('ACH CREDIT')).toBe('ACH');
        (0, vitest_1.expect)((0, utils_js_1.inferTransactionType)('DIRECT DEPOSIT')).toBe('ACH');
    });
    (0, vitest_1.it)('should identify card transactions', () => {
        const credit = (0, finance_normalizer_types_1.createMonetaryAmount)(100, 'USD');
        const debit = (0, finance_normalizer_types_1.createMonetaryAmount)(-100, 'USD');
        (0, vitest_1.expect)((0, utils_js_1.inferTransactionType)('VISA PURCHASE', debit)).toBe('CARD_PURCHASE');
        (0, vitest_1.expect)((0, utils_js_1.inferTransactionType)('VISA REFUND', credit)).toBe('CARD_REFUND');
        (0, vitest_1.expect)((0, utils_js_1.inferTransactionType)('MASTERCARD', debit)).toBe('CARD_PURCHASE');
    });
    (0, vitest_1.it)('should identify fees', () => {
        (0, vitest_1.expect)((0, utils_js_1.inferTransactionType)('MONTHLY SERVICE FEE')).toBe('FEE');
        (0, vitest_1.expect)((0, utils_js_1.inferTransactionType)('MAINTENANCE CHARGE')).toBe('FEE');
    });
    (0, vitest_1.it)('should identify interest', () => {
        (0, vitest_1.expect)((0, utils_js_1.inferTransactionType)('INTEREST PAYMENT')).toBe('INTEREST');
    });
    (0, vitest_1.it)('should identify checks', () => {
        (0, vitest_1.expect)((0, utils_js_1.inferTransactionType)('CHECK #1234')).toBe('CHECK');
        (0, vitest_1.expect)((0, utils_js_1.inferTransactionType)('CHEQUE DEPOSIT')).toBe('CHECK');
    });
    (0, vitest_1.it)('should identify ATM/cash transactions', () => {
        const debit = (0, finance_normalizer_types_1.createMonetaryAmount)(-100, 'USD');
        const credit = (0, finance_normalizer_types_1.createMonetaryAmount)(100, 'USD');
        (0, vitest_1.expect)((0, utils_js_1.inferTransactionType)('ATM WITHDRAWAL', debit)).toBe('WITHDRAWAL');
        (0, vitest_1.expect)((0, utils_js_1.inferTransactionType)('CASH DEPOSIT', credit)).toBe('DEPOSIT');
    });
    (0, vitest_1.it)('should default to OTHER for unknown patterns', () => {
        (0, vitest_1.expect)((0, utils_js_1.inferTransactionType)('MISC TRANSACTION')).toBe('OTHER');
    });
});
(0, vitest_1.describe)('detectDirection', () => {
    (0, vitest_1.it)('should detect credit indicators', () => {
        (0, vitest_1.expect)((0, utils_js_1.detectDirection)('C')).toBe('CREDIT');
        (0, vitest_1.expect)((0, utils_js_1.detectDirection)('CR')).toBe('CREDIT');
        (0, vitest_1.expect)((0, utils_js_1.detectDirection)('CREDIT')).toBe('CREDIT');
        (0, vitest_1.expect)((0, utils_js_1.detectDirection)('+')).toBe('CREDIT');
    });
    (0, vitest_1.it)('should detect debit indicators', () => {
        (0, vitest_1.expect)((0, utils_js_1.detectDirection)('D')).toBe('DEBIT');
        (0, vitest_1.expect)((0, utils_js_1.detectDirection)('DR')).toBe('DEBIT');
        (0, vitest_1.expect)((0, utils_js_1.detectDirection)('DEBIT')).toBe('DEBIT');
        (0, vitest_1.expect)((0, utils_js_1.detectDirection)('-')).toBe('DEBIT');
    });
    (0, vitest_1.it)('should infer from amount when no indicator', () => {
        const credit = (0, finance_normalizer_types_1.createMonetaryAmount)(100, 'USD');
        const debit = (0, finance_normalizer_types_1.createMonetaryAmount)(-100, 'USD');
        (0, vitest_1.expect)((0, utils_js_1.detectDirection)(null, credit)).toBe('CREDIT');
        (0, vitest_1.expect)((0, utils_js_1.detectDirection)(null, debit)).toBe('DEBIT');
    });
    (0, vitest_1.it)('should default to DEBIT when no information', () => {
        (0, vitest_1.expect)((0, utils_js_1.detectDirection)(null)).toBe('DEBIT');
        (0, vitest_1.expect)((0, utils_js_1.detectDirection)(undefined)).toBe('DEBIT');
    });
});
(0, vitest_1.describe)('cleanIBAN', () => {
    (0, vitest_1.it)('should clean valid IBAN', () => {
        (0, vitest_1.expect)((0, utils_js_1.cleanIBAN)('DE89 3704 0044 0532 0130 00')).toBe('DE89370400440532013000');
        (0, vitest_1.expect)((0, utils_js_1.cleanIBAN)('GB82WEST12345698765432')).toBe('GB82WEST12345698765432');
    });
    (0, vitest_1.it)('should return null for invalid IBAN', () => {
        (0, vitest_1.expect)((0, utils_js_1.cleanIBAN)('invalid')).toBeNull();
        (0, vitest_1.expect)((0, utils_js_1.cleanIBAN)('12345')).toBeNull();
        (0, vitest_1.expect)((0, utils_js_1.cleanIBAN)('XX00')).toBeNull();
    });
});
(0, vitest_1.describe)('cleanBIC', () => {
    (0, vitest_1.it)('should clean valid BIC/SWIFT codes', () => {
        (0, vitest_1.expect)((0, utils_js_1.cleanBIC)('DEUTDEFF')).toBe('DEUTDEFF');
        (0, vitest_1.expect)((0, utils_js_1.cleanBIC)('DEUTDEFF500')).toBe('DEUTDEFF500');
        (0, vitest_1.expect)((0, utils_js_1.cleanBIC)('deut de ff')).toBe('DEUTDEFF');
    });
    (0, vitest_1.it)('should return null for invalid BIC', () => {
        (0, vitest_1.expect)((0, utils_js_1.cleanBIC)('invalid')).toBeNull();
        (0, vitest_1.expect)((0, utils_js_1.cleanBIC)('12345678')).toBeNull();
        (0, vitest_1.expect)((0, utils_js_1.cleanBIC)('TOO')).toBeNull();
    });
});
(0, vitest_1.describe)('getCurrencyDecimals', () => {
    (0, vitest_1.it)('should return correct decimals for common currencies', () => {
        (0, vitest_1.expect)((0, utils_js_1.getCurrencyDecimals)('USD')).toBe(2);
        (0, vitest_1.expect)((0, utils_js_1.getCurrencyDecimals)('EUR')).toBe(2);
        (0, vitest_1.expect)((0, utils_js_1.getCurrencyDecimals)('GBP')).toBe(2);
    });
    (0, vitest_1.it)('should return 0 for zero-decimal currencies', () => {
        (0, vitest_1.expect)((0, utils_js_1.getCurrencyDecimals)('JPY')).toBe(0);
        (0, vitest_1.expect)((0, utils_js_1.getCurrencyDecimals)('KRW')).toBe(0);
    });
    (0, vitest_1.it)('should return 3 for three-decimal currencies', () => {
        (0, vitest_1.expect)((0, utils_js_1.getCurrencyDecimals)('BHD')).toBe(3);
        (0, vitest_1.expect)((0, utils_js_1.getCurrencyDecimals)('KWD')).toBe(3);
    });
    (0, vitest_1.it)('should default to 2 for unknown currencies', () => {
        (0, vitest_1.expect)((0, utils_js_1.getCurrencyDecimals)('XYZ')).toBe(2);
    });
});
