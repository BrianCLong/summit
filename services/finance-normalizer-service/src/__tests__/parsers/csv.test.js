"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const csv_js_1 = require("../../parsers/csv.js");
(0, vitest_1.describe)('CSVParser', () => {
    (0, vitest_1.describe)('detect', () => {
        (0, vitest_1.it)('should detect comma-delimited CSV', () => {
            const data = 'date,amount,description\n2024-01-15,100.00,Test transaction';
            (0, vitest_1.expect)(csv_js_1.csvParser.detect(data)).toBe(true);
        });
        (0, vitest_1.it)('should detect semicolon-delimited CSV', () => {
            const data = 'date;amount;description\n2024-01-15;100.00;Test transaction';
            (0, vitest_1.expect)(csv_js_1.csvParser.detect(data)).toBe(true);
        });
        (0, vitest_1.it)('should detect tab-delimited CSV', () => {
            const data = 'date\tamount\tdescription\n2024-01-15\t100.00\tTest transaction';
            (0, vitest_1.expect)(csv_js_1.csvParser.detect(data)).toBe(true);
        });
        (0, vitest_1.it)('should not detect non-CSV data', () => {
            const data = '{"transactions": []}';
            (0, vitest_1.expect)(csv_js_1.csvParser.detect(data)).toBe(false);
        });
    });
    (0, vitest_1.describe)('validateConfig', () => {
        (0, vitest_1.it)('should accept valid config', () => {
            const config = {
                delimiter: ',',
                quoteChar: '"',
                decimalSeparator: '.',
            };
            (0, vitest_1.expect)(csv_js_1.csvParser.validateConfig(config)).toEqual([]);
        });
        (0, vitest_1.it)('should reject invalid delimiter', () => {
            const config = { delimiter: ',,' };
            const errors = csv_js_1.csvParser.validateConfig(config);
            (0, vitest_1.expect)(errors).toContain('Delimiter must be a single character');
        });
        (0, vitest_1.it)('should reject invalid decimal separator', () => {
            const config = { decimalSeparator: ';' };
            const errors = csv_js_1.csvParser.validateConfig(config);
            (0, vitest_1.expect)(errors).toContain('Decimal separator must be "." or ","');
        });
    });
    (0, vitest_1.describe)('parse', () => {
        (0, vitest_1.it)('should parse basic CSV with standard columns', async () => {
            const data = `date,amount,description,reference
2024-01-15,100.00,Payment received,REF001
2024-01-16,-50.00,ATM withdrawal,REF002`;
            const result = await csv_js_1.csvParser.parse(data);
            (0, vitest_1.expect)(result.errors).toHaveLength(0);
            (0, vitest_1.expect)(result.records).toHaveLength(2);
            (0, vitest_1.expect)(result.format).toBe('CSV');
            const txn1 = result.records[0].transaction;
            (0, vitest_1.expect)(txn1.referenceNumber).toBe('REF001');
            (0, vitest_1.expect)(txn1.amount.currency).toBe('USD');
            (0, vitest_1.expect)(Number(txn1.amount.minorUnits)).toBe(10000); // $100.00 in cents
            (0, vitest_1.expect)(txn1.direction).toBe('CREDIT');
            const txn2 = result.records[1].transaction;
            (0, vitest_1.expect)(Number(txn2.amount.minorUnits)).toBe(-5000); // -$50.00 in cents
            (0, vitest_1.expect)(txn2.direction).toBe('DEBIT');
        });
        (0, vitest_1.it)('should parse CSV with separate debit/credit columns', async () => {
            const data = `date,debit,credit,description
2024-01-15,,500.00,Deposit
2024-01-16,75.00,,Check #123`;
            const result = await csv_js_1.csvParser.parse(data);
            (0, vitest_1.expect)(result.errors).toHaveLength(0);
            (0, vitest_1.expect)(result.records).toHaveLength(2);
            (0, vitest_1.expect)(result.records[0].transaction.direction).toBe('CREDIT');
            (0, vitest_1.expect)(Number(result.records[0].transaction.amount.minorUnits)).toBe(50000);
            (0, vitest_1.expect)(result.records[1].transaction.direction).toBe('DEBIT');
            (0, vitest_1.expect)(Number(result.records[1].transaction.amount.minorUnits)).toBe(-7500);
        });
        (0, vitest_1.it)('should handle European decimal format', async () => {
            const data = `date,amount,currency
2024-01-15,"1.234,56",EUR`;
            const config = {
                decimalSeparator: ',',
                thousandsSeparator: '.',
            };
            const result = await csv_js_1.csvParser.parse(data, config);
            (0, vitest_1.expect)(result.errors).toHaveLength(0);
            (0, vitest_1.expect)(result.records).toHaveLength(1);
            (0, vitest_1.expect)(Number(result.records[0].transaction.amount.minorUnits)).toBe(123456);
            (0, vitest_1.expect)(result.records[0].transaction.amount.currency).toBe('EUR');
        });
        (0, vitest_1.it)('should parse DD/MM/YYYY date format', async () => {
            const data = `date,amount,description
15/01/2024,100.00,Test`;
            const config = { dateFormat: 'DD/MM/YYYY' };
            const result = await csv_js_1.csvParser.parse(data, config);
            (0, vitest_1.expect)(result.errors).toHaveLength(0);
            const txn = result.records[0].transaction;
            (0, vitest_1.expect)(txn.valueDate).toContain('2024-01-15');
        });
        (0, vitest_1.it)('should handle negative amounts in parentheses', async () => {
            const data = `date,amount,description
2024-01-15,(1500.00),Refund`;
            const result = await csv_js_1.csvParser.parse(data);
            (0, vitest_1.expect)(result.errors).toHaveLength(0);
            (0, vitest_1.expect)(Number(result.records[0].transaction.amount.minorUnits)).toBe(-150000);
        });
        (0, vitest_1.it)('should extract counterparty and create party record', async () => {
            const data = `date,amount,counterparty,description
2024-01-15,100.00,ACME Corp Ltd,Invoice payment`;
            const result = await csv_js_1.csvParser.parse(data);
            (0, vitest_1.expect)(result.errors).toHaveLength(0);
            (0, vitest_1.expect)(result.records[0].parties).toHaveLength(1);
            (0, vitest_1.expect)(result.records[0].parties[0].canonicalName).toBe('ACME CORP LTD');
            (0, vitest_1.expect)(result.records[0].parties[0].type).toBe('CORPORATION');
        });
        (0, vitest_1.it)('should generate reference number when missing', async () => {
            const data = `date,amount,description
2024-01-15,100.00,Test payment`;
            const result = await csv_js_1.csvParser.parse(data);
            (0, vitest_1.expect)(result.errors).toHaveLength(0);
            (0, vitest_1.expect)(result.records[0].transaction.referenceNumber).toMatch(/^FN\d{8}/);
            (0, vitest_1.expect)(result.records[0].warnings).toContainEqual(vitest_1.expect.objectContaining({ code: 'REFERENCE_GENERATED' }));
        });
        (0, vitest_1.it)('should handle running balance column', async () => {
            const data = `date,amount,balance,description
2024-01-15,100.00,1100.00,Deposit
2024-01-16,-50.00,1050.00,Withdrawal`;
            const result = await csv_js_1.csvParser.parse(data);
            (0, vitest_1.expect)(result.errors).toHaveLength(0);
            (0, vitest_1.expect)(Number(result.records[0].transaction.runningBalance?.minorUnits)).toBe(110000);
            (0, vitest_1.expect)(Number(result.records[1].transaction.runningBalance?.minorUnits)).toBe(105000);
        });
        (0, vitest_1.it)('should infer transaction type from description', async () => {
            const data = `date,amount,description
2024-01-15,100.00,WIRE TRANSFER FROM BANK
2024-01-16,-50.00,ATM WITHDRAWAL
2024-01-17,25.00,VISA REFUND`;
            const result = await csv_js_1.csvParser.parse(data);
            (0, vitest_1.expect)(result.records[0].transaction.type).toBe('WIRE');
            (0, vitest_1.expect)(result.records[1].transaction.type).toBe('WITHDRAWAL');
            (0, vitest_1.expect)(result.records[2].transaction.type).toBe('CARD_REFUND');
        });
        (0, vitest_1.it)('should handle custom column mapping', async () => {
            const data = `txn_dt,txn_amt,txn_desc
2024-01-15,100.00,Payment`;
            const config = {
                columnMapping: {
                    date: 'txn_dt',
                    amount: 'txn_amt',
                    description: 'txn_desc',
                },
            };
            const result = await csv_js_1.csvParser.parse(data, config);
            (0, vitest_1.expect)(result.errors).toHaveLength(0);
            (0, vitest_1.expect)(result.records).toHaveLength(1);
            (0, vitest_1.expect)(result.records[0].transaction.description).toBe('Payment');
        });
        (0, vitest_1.it)('should record parse errors for invalid rows', async () => {
            const data = `date,amount,description
2024-01-15,100.00,Valid
invalid-date,50.00,Invalid date
2024-01-16,not-a-number,Invalid amount`;
            const result = await csv_js_1.csvParser.parse(data);
            (0, vitest_1.expect)(result.records).toHaveLength(1);
            (0, vitest_1.expect)(result.errors).toHaveLength(2);
            (0, vitest_1.expect)(result.errors[0].code).toBe('ROW_PARSE_ERROR');
            (0, vitest_1.expect)(result.errors[0].lineNumber).toBe(3);
        });
        (0, vitest_1.it)('should handle empty CSV', async () => {
            const data = '';
            const result = await csv_js_1.csvParser.parse(data);
            (0, vitest_1.expect)(result.errors).toHaveLength(0);
            (0, vitest_1.expect)(result.records).toHaveLength(0);
            (0, vitest_1.expect)(result.totalRecords).toBe(0);
        });
        (0, vitest_1.it)('should handle CSV with only headers', async () => {
            const data = 'date,amount,description';
            const result = await csv_js_1.csvParser.parse(data);
            (0, vitest_1.expect)(result.errors).toHaveLength(0);
            (0, vitest_1.expect)(result.records).toHaveLength(0);
            (0, vitest_1.expect)(result.totalRecords).toBe(0);
        });
        (0, vitest_1.it)('should preserve raw record for audit', async () => {
            const data = `date,amount,description
2024-01-15,100.00,Test`;
            const result = await csv_js_1.csvParser.parse(data);
            (0, vitest_1.expect)(result.records[0].rawRecord).toBeDefined();
            (0, vitest_1.expect)(result.records[0].rawRecord.lineNumber).toBe(2);
            (0, vitest_1.expect)(result.records[0].rawRecord.fields).toHaveProperty('date', '2024-01-15');
        });
    });
});
(0, vitest_1.describe)('CSVParser - Currency handling', () => {
    (0, vitest_1.it)('should use default currency when not specified', async () => {
        const data = `date,amount
2024-01-15,100.00`;
        const result = await csv_js_1.csvParser.parse(data);
        (0, vitest_1.expect)(result.records[0].transaction.amount.currency).toBe('USD');
    });
    (0, vitest_1.it)('should use configured default currency', async () => {
        const data = `date,amount
2024-01-15,100.00`;
        const result = await csv_js_1.csvParser.parse(data, { defaultCurrency: 'GBP' });
        (0, vitest_1.expect)(result.records[0].transaction.amount.currency).toBe('GBP');
    });
    (0, vitest_1.it)('should use per-row currency when available', async () => {
        const data = `date,amount,currency
2024-01-15,100.00,EUR
2024-01-16,50.00,GBP`;
        const result = await csv_js_1.csvParser.parse(data);
        (0, vitest_1.expect)(result.records[0].transaction.amount.currency).toBe('EUR');
        (0, vitest_1.expect)(result.records[1].transaction.amount.currency).toBe('GBP');
    });
    (0, vitest_1.it)('should handle JPY with 0 decimal places', async () => {
        const data = `date,amount,currency
2024-01-15,10000,JPY`;
        const result = await csv_js_1.csvParser.parse(data);
        (0, vitest_1.expect)(result.records[0].transaction.amount.currency).toBe('JPY');
        (0, vitest_1.expect)(result.records[0].transaction.amount.decimalPlaces).toBe(0);
        (0, vitest_1.expect)(Number(result.records[0].transaction.amount.minorUnits)).toBe(10000);
    });
});
(0, vitest_1.describe)('CSVParser - Edge cases', () => {
    (0, vitest_1.it)('should handle quoted fields with commas', async () => {
        const data = `date,amount,description
2024-01-15,100.00,"Payment for invoice #123, includes tax"`;
        const result = await csv_js_1.csvParser.parse(data);
        (0, vitest_1.expect)(result.errors).toHaveLength(0);
        (0, vitest_1.expect)(result.records[0].transaction.description).toBe('Payment for invoice #123, includes tax');
    });
    (0, vitest_1.it)('should handle currency symbols in amount', async () => {
        const data = `date,amount,description
2024-01-15,$100.00,USD payment
2024-01-16,€50.00,EUR payment
2024-01-17,£75.00,GBP payment`;
        const result = await csv_js_1.csvParser.parse(data);
        (0, vitest_1.expect)(result.errors).toHaveLength(0);
        (0, vitest_1.expect)(Number(result.records[0].transaction.amount.minorUnits)).toBe(10000);
        (0, vitest_1.expect)(Number(result.records[1].transaction.amount.minorUnits)).toBe(5000);
        (0, vitest_1.expect)(Number(result.records[2].transaction.amount.minorUnits)).toBe(7500);
    });
    (0, vitest_1.it)('should handle trailing minus sign', async () => {
        const data = `date,amount,description
2024-01-15,100.00-,Debit`;
        const result = await csv_js_1.csvParser.parse(data);
        (0, vitest_1.expect)(result.errors).toHaveLength(0);
        (0, vitest_1.expect)(Number(result.records[0].transaction.amount.minorUnits)).toBe(-10000);
    });
    (0, vitest_1.it)('should handle plus sign prefix', async () => {
        const data = `date,amount,description
2024-01-15,+100.00,Credit`;
        const result = await csv_js_1.csvParser.parse(data);
        (0, vitest_1.expect)(result.errors).toHaveLength(0);
        (0, vitest_1.expect)(Number(result.records[0].transaction.amount.minorUnits)).toBe(10000);
    });
    (0, vitest_1.it)('should handle DR/CR indicator column', async () => {
        const data = `date,amount,indicator,description
2024-01-15,100.00,CR,Credit
2024-01-16,50.00,DR,Debit`;
        const result = await csv_js_1.csvParser.parse(data);
        (0, vitest_1.expect)(result.records[0].transaction.direction).toBe('CREDIT');
        (0, vitest_1.expect)(result.records[1].transaction.direction).toBe('DEBIT');
    });
});
