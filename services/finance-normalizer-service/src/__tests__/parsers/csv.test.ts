import { describe, it, expect, beforeEach } from 'vitest';
import { csvParser } from '../../parsers/csv.js';
import type { ParserConfig } from '../../parsers/types.js';

describe('CSVParser', () => {
  describe('detect', () => {
    it('should detect comma-delimited CSV', () => {
      const data = 'date,amount,description\n2024-01-15,100.00,Test transaction';
      expect(csvParser.detect(data)).toBe(true);
    });

    it('should detect semicolon-delimited CSV', () => {
      const data = 'date;amount;description\n2024-01-15;100.00;Test transaction';
      expect(csvParser.detect(data)).toBe(true);
    });

    it('should detect tab-delimited CSV', () => {
      const data = 'date\tamount\tdescription\n2024-01-15\t100.00\tTest transaction';
      expect(csvParser.detect(data)).toBe(true);
    });

    it('should not detect non-CSV data', () => {
      const data = '{"transactions": []}';
      expect(csvParser.detect(data)).toBe(false);
    });
  });

  describe('validateConfig', () => {
    it('should accept valid config', () => {
      const config: ParserConfig = {
        delimiter: ',',
        quoteChar: '"',
        decimalSeparator: '.',
      };
      expect(csvParser.validateConfig(config)).toEqual([]);
    });

    it('should reject invalid delimiter', () => {
      const config: ParserConfig = { delimiter: ',,' };
      const errors = csvParser.validateConfig(config);
      expect(errors).toContain('Delimiter must be a single character');
    });

    it('should reject invalid decimal separator', () => {
      const config: ParserConfig = { decimalSeparator: ';' as any };
      const errors = csvParser.validateConfig(config);
      expect(errors).toContain('Decimal separator must be "." or ","');
    });
  });

  describe('parse', () => {
    it('should parse basic CSV with standard columns', async () => {
      const data = `date,amount,description,reference
2024-01-15,100.00,Payment received,REF001
2024-01-16,-50.00,ATM withdrawal,REF002`;

      const result = await csvParser.parse(data);

      expect(result.errors).toHaveLength(0);
      expect(result.records).toHaveLength(2);
      expect(result.format).toBe('CSV');

      const txn1 = result.records[0].transaction!;
      expect(txn1.referenceNumber).toBe('REF001');
      expect(txn1.amount.currency).toBe('USD');
      expect(Number(txn1.amount.minorUnits)).toBe(10000); // $100.00 in cents
      expect(txn1.direction).toBe('CREDIT');

      const txn2 = result.records[1].transaction!;
      expect(Number(txn2.amount.minorUnits)).toBe(-5000); // -$50.00 in cents
      expect(txn2.direction).toBe('DEBIT');
    });

    it('should parse CSV with separate debit/credit columns', async () => {
      const data = `date,debit,credit,description
2024-01-15,,500.00,Deposit
2024-01-16,75.00,,Check #123`;

      const result = await csvParser.parse(data);

      expect(result.errors).toHaveLength(0);
      expect(result.records).toHaveLength(2);

      expect(result.records[0].transaction!.direction).toBe('CREDIT');
      expect(Number(result.records[0].transaction!.amount.minorUnits)).toBe(50000);

      expect(result.records[1].transaction!.direction).toBe('DEBIT');
      expect(Number(result.records[1].transaction!.amount.minorUnits)).toBe(-7500);
    });

    it('should handle European decimal format', async () => {
      const data = `date,amount,currency
2024-01-15,"1.234,56",EUR`;

      const config: ParserConfig = {
        decimalSeparator: ',',
        thousandsSeparator: '.',
      };

      const result = await csvParser.parse(data, config);

      expect(result.errors).toHaveLength(0);
      expect(result.records).toHaveLength(1);
      expect(Number(result.records[0].transaction!.amount.minorUnits)).toBe(123456);
      expect(result.records[0].transaction!.amount.currency).toBe('EUR');
    });

    it('should parse DD/MM/YYYY date format', async () => {
      const data = `date,amount,description
15/01/2024,100.00,Test`;

      const config: ParserConfig = { dateFormat: 'DD/MM/YYYY' };
      const result = await csvParser.parse(data, config);

      expect(result.errors).toHaveLength(0);
      const txn = result.records[0].transaction!;
      expect(txn.valueDate).toContain('2024-01-15');
    });

    it('should handle negative amounts in parentheses', async () => {
      const data = `date,amount,description
2024-01-15,(1500.00),Refund`;

      const result = await csvParser.parse(data);

      expect(result.errors).toHaveLength(0);
      expect(Number(result.records[0].transaction!.amount.minorUnits)).toBe(-150000);
    });

    it('should extract counterparty and create party record', async () => {
      const data = `date,amount,counterparty,description
2024-01-15,100.00,ACME Corp Ltd,Invoice payment`;

      const result = await csvParser.parse(data);

      expect(result.errors).toHaveLength(0);
      expect(result.records[0].parties).toHaveLength(1);
      expect(result.records[0].parties![0].canonicalName).toBe('ACME CORP LTD');
      expect(result.records[0].parties![0].type).toBe('CORPORATION');
    });

    it('should generate reference number when missing', async () => {
      const data = `date,amount,description
2024-01-15,100.00,Test payment`;

      const result = await csvParser.parse(data);

      expect(result.errors).toHaveLength(0);
      expect(result.records[0].transaction!.referenceNumber).toMatch(/^FN\d{8}/);
      expect(result.records[0].warnings).toContainEqual(
        expect.objectContaining({ code: 'REFERENCE_GENERATED' })
      );
    });

    it('should handle running balance column', async () => {
      const data = `date,amount,balance,description
2024-01-15,100.00,1100.00,Deposit
2024-01-16,-50.00,1050.00,Withdrawal`;

      const result = await csvParser.parse(data);

      expect(result.errors).toHaveLength(0);
      expect(Number(result.records[0].transaction!.runningBalance?.minorUnits)).toBe(110000);
      expect(Number(result.records[1].transaction!.runningBalance?.minorUnits)).toBe(105000);
    });

    it('should infer transaction type from description', async () => {
      const data = `date,amount,description
2024-01-15,100.00,WIRE TRANSFER FROM BANK
2024-01-16,-50.00,ATM WITHDRAWAL
2024-01-17,25.00,VISA REFUND`;

      const result = await csvParser.parse(data);

      expect(result.records[0].transaction!.type).toBe('WIRE');
      expect(result.records[1].transaction!.type).toBe('WITHDRAWAL');
      expect(result.records[2].transaction!.type).toBe('CARD_REFUND');
    });

    it('should handle custom column mapping', async () => {
      const data = `txn_dt,txn_amt,txn_desc
2024-01-15,100.00,Payment`;

      const config: ParserConfig = {
        columnMapping: {
          date: 'txn_dt',
          amount: 'txn_amt',
          description: 'txn_desc',
        },
      };

      const result = await csvParser.parse(data, config);

      expect(result.errors).toHaveLength(0);
      expect(result.records).toHaveLength(1);
      expect(result.records[0].transaction!.description).toBe('Payment');
    });

    it('should record parse errors for invalid rows', async () => {
      const data = `date,amount,description
2024-01-15,100.00,Valid
invalid-date,50.00,Invalid date
2024-01-16,not-a-number,Invalid amount`;

      const result = await csvParser.parse(data);

      expect(result.records).toHaveLength(1);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].code).toBe('ROW_PARSE_ERROR');
      expect(result.errors[0].lineNumber).toBe(3);
    });

    it('should handle empty CSV', async () => {
      const data = '';
      const result = await csvParser.parse(data);

      expect(result.errors).toHaveLength(0);
      expect(result.records).toHaveLength(0);
      expect(result.totalRecords).toBe(0);
    });

    it('should handle CSV with only headers', async () => {
      const data = 'date,amount,description';
      const result = await csvParser.parse(data);

      expect(result.errors).toHaveLength(0);
      expect(result.records).toHaveLength(0);
      expect(result.totalRecords).toBe(0);
    });

    it('should preserve raw record for audit', async () => {
      const data = `date,amount,description
2024-01-15,100.00,Test`;

      const result = await csvParser.parse(data);

      expect(result.records[0].rawRecord).toBeDefined();
      expect(result.records[0].rawRecord.lineNumber).toBe(2);
      expect(result.records[0].rawRecord.fields).toHaveProperty('date', '2024-01-15');
    });
  });
});

describe('CSVParser - Currency handling', () => {
  it('should use default currency when not specified', async () => {
    const data = `date,amount
2024-01-15,100.00`;

    const result = await csvParser.parse(data);
    expect(result.records[0].transaction!.amount.currency).toBe('USD');
  });

  it('should use configured default currency', async () => {
    const data = `date,amount
2024-01-15,100.00`;

    const result = await csvParser.parse(data, { defaultCurrency: 'GBP' });
    expect(result.records[0].transaction!.amount.currency).toBe('GBP');
  });

  it('should use per-row currency when available', async () => {
    const data = `date,amount,currency
2024-01-15,100.00,EUR
2024-01-16,50.00,GBP`;

    const result = await csvParser.parse(data);

    expect(result.records[0].transaction!.amount.currency).toBe('EUR');
    expect(result.records[1].transaction!.amount.currency).toBe('GBP');
  });

  it('should handle JPY with 0 decimal places', async () => {
    const data = `date,amount,currency
2024-01-15,10000,JPY`;

    const result = await csvParser.parse(data);

    expect(result.records[0].transaction!.amount.currency).toBe('JPY');
    expect(result.records[0].transaction!.amount.decimalPlaces).toBe(0);
    expect(Number(result.records[0].transaction!.amount.minorUnits)).toBe(10000);
  });
});

describe('CSVParser - Edge cases', () => {
  it('should handle quoted fields with commas', async () => {
    const data = `date,amount,description
2024-01-15,100.00,"Payment for invoice #123, includes tax"`;

    const result = await csvParser.parse(data);

    expect(result.errors).toHaveLength(0);
    expect(result.records[0].transaction!.description).toBe('Payment for invoice #123, includes tax');
  });

  it('should handle currency symbols in amount', async () => {
    const data = `date,amount,description
2024-01-15,$100.00,USD payment
2024-01-16,€50.00,EUR payment
2024-01-17,£75.00,GBP payment`;

    const result = await csvParser.parse(data);

    expect(result.errors).toHaveLength(0);
    expect(Number(result.records[0].transaction!.amount.minorUnits)).toBe(10000);
    expect(Number(result.records[1].transaction!.amount.minorUnits)).toBe(5000);
    expect(Number(result.records[2].transaction!.amount.minorUnits)).toBe(7500);
  });

  it('should handle trailing minus sign', async () => {
    const data = `date,amount,description
2024-01-15,100.00-,Debit`;

    const result = await csvParser.parse(data);

    expect(result.errors).toHaveLength(0);
    expect(Number(result.records[0].transaction!.amount.minorUnits)).toBe(-10000);
  });

  it('should handle plus sign prefix', async () => {
    const data = `date,amount,description
2024-01-15,+100.00,Credit`;

    const result = await csvParser.parse(data);

    expect(result.errors).toHaveLength(0);
    expect(Number(result.records[0].transaction!.amount.minorUnits)).toBe(10000);
  });

  it('should handle DR/CR indicator column', async () => {
    const data = `date,amount,indicator,description
2024-01-15,100.00,CR,Credit
2024-01-16,50.00,DR,Debit`;

    const result = await csvParser.parse(data);

    expect(result.records[0].transaction!.direction).toBe('CREDIT');
    expect(result.records[1].transaction!.direction).toBe('DEBIT');
  });
});
