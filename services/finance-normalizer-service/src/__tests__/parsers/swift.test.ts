import { describe, it, expect } from 'vitest';
import { swiftParser } from '../../parsers/swift.js';

describe('SWIFTParser', () => {
  describe('detect', () => {
    it('should detect MT940 format', () => {
      const data = `:20:STMT001
:25:123456789
:28C:1/1
:60F:C240115USD10000,00
:61:240115C1000,00NTRFREF001
:86:Payment from customer
:62F:C240115USD11000,00`;

      expect(swiftParser.detect(data)).toBe(true);
    });

    it('should detect MT103 format', () => {
      const data = `:20:REF123456
:23B:CRED
:32A:240115USD10000,00
:50K:/12345678
ACME CORP
:59:/87654321
BENEFICIARY NAME
:70:INVOICE PAYMENT`;

      expect(swiftParser.detect(data)).toBe(true);
    });

    it('should not detect non-SWIFT data', () => {
      const csvData = 'date,amount,description';
      expect(swiftParser.detect(csvData)).toBe(false);

      const jsonData = '{"transactions": []}';
      expect(swiftParser.detect(jsonData)).toBe(false);
    });
  });

  describe('parse MT940', () => {
    const mt940Sample = `:20:STMT20240115
:25:123456789/USD
:28C:1/1
:60F:C240115USD10000,00
:61:2401150115C1000,00NTRFREF001//BANKREF001
Customer payment
:86:/NAME/ACME CORPORATION
/ADDR/123 MAIN ST
PAYMENT FOR INVOICE 001
:61:2401160116D500,00NCHKCHK001
:86:Check payment to supplier
:62F:C240116USD10500,00`;

    it('should parse MT940 statement', async () => {
      const result = await swiftParser.parse(mt940Sample);

      expect(result.errors).toHaveLength(0);
      expect(result.format).toBe('SWIFT_MT940');
      expect(result.records.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract transaction details from :61: field', async () => {
      const result = await swiftParser.parse(mt940Sample);

      const creditTxn = result.records.find(r =>
        r.transaction?.direction === 'CREDIT'
      );
      expect(creditTxn).toBeDefined();
      expect(Number(creditTxn!.transaction!.amount.minorUnits)).toBe(100000); // 1000.00 USD
      expect(creditTxn!.transaction!.referenceNumber).toContain('REF001');
    });

    it('should extract information from :86: field', async () => {
      const result = await swiftParser.parse(mt940Sample);

      const txnWithParty = result.records.find(r =>
        r.parties && r.parties.length > 0
      );
      expect(txnWithParty).toBeDefined();
      expect(txnWithParty!.parties![0].canonicalName).toContain('ACME');
    });

    it('should identify debit vs credit transactions', async () => {
      const result = await swiftParser.parse(mt940Sample);

      const creditTxns = result.records.filter(r =>
        r.transaction?.direction === 'CREDIT'
      );
      const debitTxns = result.records.filter(r =>
        r.transaction?.direction === 'DEBIT'
      );

      expect(creditTxns.length).toBeGreaterThan(0);
      expect(debitTxns.length).toBeGreaterThan(0);
    });

    it('should map SWIFT type codes to transaction types', async () => {
      const result = await swiftParser.parse(mt940Sample);

      const transferTxn = result.records.find(r =>
        r.transaction?.metadata?.swiftTypeCode?.includes('NTRF')
      );
      expect(transferTxn?.transaction?.type).toBe('TRANSFER');

      const checkTxn = result.records.find(r =>
        r.transaction?.metadata?.swiftTypeCode?.includes('NCHK')
      );
      expect(checkTxn?.transaction?.type).toBe('CHECK');
    });

    it('should parse SWIFT date format (YYMMDD)', async () => {
      const result = await swiftParser.parse(mt940Sample);

      const txn = result.records[0].transaction!;
      expect(txn.valueDate).toContain('2024-01-15');
    });
  });

  describe('parse MT103', () => {
    const mt103Sample = `:20:TRN123456789
:23B:CRED
:32A:240115USD50000,00
:33B:USD50000,00
:50K:/DE89370400440532013000
ACME CORPORATION
123 MAIN STREET
BERLIN GERMANY
:59:/GB82WEST12345698765432
BENEFICIARY COMPANY LTD
456 HIGH STREET
LONDON UK
:70:PAYMENT FOR SERVICES
INVOICE INV-2024-001
:71A:OUR
:71F:USD25,00`;

    it('should parse MT103 message', async () => {
      const result = await swiftParser.parse(mt103Sample);

      expect(result.errors).toHaveLength(0);
      expect(result.format).toBe('SWIFT_MT103');
      expect(result.records).toHaveLength(1);
    });

    it('should extract transaction amount from :32A:', async () => {
      const result = await swiftParser.parse(mt103Sample);

      const txn = result.records[0].transaction!;
      expect(Number(txn.amount.minorUnits)).toBe(5000000); // 50000.00 USD
      expect(txn.amount.currency).toBe('USD');
    });

    it('should extract ordering customer from :50K:', async () => {
      const result = await swiftParser.parse(mt103Sample);

      const originator = result.records[0].parties?.find(p =>
        p.canonicalName?.includes('ACME')
      );
      expect(originator).toBeDefined();
      expect(originator!.type).toBe('CORPORATION');
    });

    it('should extract beneficiary from :59:', async () => {
      const result = await swiftParser.parse(mt103Sample);

      const beneficiary = result.records[0].parties?.find(p =>
        p.canonicalName?.includes('BENEFICIARY')
      );
      expect(beneficiary).toBeDefined();
    });

    it('should extract remittance information from :70:', async () => {
      const result = await swiftParser.parse(mt103Sample);

      const txn = result.records[0].transaction!;
      expect(txn.description).toContain('PAYMENT FOR SERVICES');
      expect(txn.description).toContain('INVOICE');
    });

    it('should extract fees from :71F:', async () => {
      const result = await swiftParser.parse(mt103Sample);

      const txn = result.records[0].transaction!;
      expect(txn.fees).toBeDefined();
      expect(txn.fees!.length).toBeGreaterThan(0);
      expect(Number(txn.fees![0].amount.minorUnits)).toBe(2500); // 25.00 USD
    });

    it('should set transaction type as WIRE', async () => {
      const result = await swiftParser.parse(mt103Sample);

      expect(result.records[0].transaction!.type).toBe('WIRE');
    });

    it('should extract account numbers from parties', async () => {
      const result = await swiftParser.parse(mt103Sample);

      const partyWithIBAN = result.records[0].parties?.find(p =>
        p.identifiers?.some(id => id.value?.includes('DE89') || id.value?.includes('GB82'))
      );
      expect(partyWithIBAN).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle reversal indicator in MT940', async () => {
      const data = `:20:STMT001
:25:123456789
:60F:C240115USD10000,00
:61:240115CR500,00NTRF//REF001
Reversal of previous transaction
:62F:C240115USD10500,00`;

      const result = await swiftParser.parse(data);

      const txn = result.records[0];
      expect(txn.warnings).toContainEqual(
        expect.objectContaining({ code: 'REVERSAL_INDICATOR' })
      );
    });

    it('should handle missing optional fields', async () => {
      const data = `:20:STMT001
:25:123456789
:60F:C240115USD10000,00
:61:240115C1000,00NTRF
:62F:C240115USD11000,00`;

      const result = await swiftParser.parse(data);

      expect(result.errors).toHaveLength(0);
      expect(result.records).toHaveLength(1);
    });

    it('should handle multiple transactions in MT940', async () => {
      const data = `:20:STMT001
:25:123456789
:60F:C240115USD10000,00
:61:240115C1000,00NTRF//REF001
:86:First payment
:61:240116D500,00NCHK//REF002
:86:Check payment
:61:240117C2000,00NDIV//REF003
:86:Dividend
:62F:C240117USD12500,00`;

      const result = await swiftParser.parse(data);

      expect(result.errors).toHaveLength(0);
      expect(result.records).toHaveLength(3);
    });

    it('should return error for unknown SWIFT format', async () => {
      const data = `:20:UNKNOWN
Some unrecognized content`;

      const result = await swiftParser.parse(data);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('UNKNOWN_MESSAGE_TYPE');
    });
  });
});
