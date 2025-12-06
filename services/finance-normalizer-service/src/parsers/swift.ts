import { v4 as uuidv4 } from 'uuid';
import type {
  Parser,
  ParseResult,
  ParsedRecord,
  ParserConfig,
  ParseError,
  ParseWarning,
  RawRecord,
} from './types.js';
import {
  parseAmount,
  parseDate,
  normalizePartyName,
  inferPartyType,
  cleanBIC,
  cleanIBAN,
  getParserVersion,
} from './utils.js';

/**
 * SWIFT MT940/MT942 Field Patterns
 */
const MT940_PATTERNS = {
  // Transaction Reference Number
  field20: /^:20:(.+)$/m,
  // Account Identification
  field25: /^:25:(.+)$/m,
  // Statement Number/Sequence Number
  field28C: /^:28C:(\d+)(?:\/(\d+))?$/m,
  // Opening Balance
  field60F: /^:60F:([CD])(\d{6})([A-Z]{3})([0-9,]+)$/m,
  field60M: /^:60M:([CD])(\d{6})([A-Z]{3})([0-9,]+)$/m,
  // Statement Line (transaction)
  field61: /^:61:(\d{6})(\d{4})?([CD]R?)([A-Z])?([0-9,]+)([A-Z]{4})([^\n]+)?(?:\n([^\n:]+))?$/m,
  // Information to Account Owner
  field86: /^:86:(.+?)(?=\n:|$)/ms,
  // Closing Balance
  field62F: /^:62F:([CD])(\d{6})([A-Z]{3})([0-9,]+)$/m,
  field62M: /^:62M:([CD])(\d{6})([A-Z]{3})([0-9,]+)$/m,
  // Available Balance
  field64: /^:64:([CD])(\d{6})([A-Z]{3})([0-9,]+)$/m,
};

/**
 * SWIFT MT103 (Single Customer Credit Transfer) Patterns
 */
const MT103_PATTERNS = {
  // Sender's Reference
  field20: /^:20:(.+)$/m,
  // Bank Operation Code
  field23B: /^:23B:(.+)$/m,
  // Value Date/Currency/Interbank Settled Amount
  field32A: /^:32A:(\d{6})([A-Z]{3})([0-9,]+)$/m,
  // Currency/Instructed Amount
  field33B: /^:33B:([A-Z]{3})([0-9,]+)$/m,
  // Ordering Customer
  field50K: /^:50K:(?:\/([^\n]+)\n)?(.+?)(?=\n:|$)/ms,
  field50A: /^:50A:(?:\/([^\n]+)\n)?([A-Z]{4}[A-Z0-9]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)$/m,
  // Beneficiary Customer
  field59: /^:59:(?:\/([^\n]+)\n)?(.+?)(?=\n:|$)/ms,
  field59A: /^:59A:(?:\/([^\n]+)\n)?([A-Z]{4}[A-Z0-9]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)$/m,
  // Remittance Information
  field70: /^:70:(.+?)(?=\n:|$)/ms,
  // Details of Charges
  field71A: /^:71A:(.+)$/m,
  // Sender's Charges
  field71F: /^:71F:([A-Z]{3})([0-9,]+)$/m,
  // Receiver's Charges
  field71G: /^:71G:([A-Z]{3})([0-9,]+)$/m,
};

/**
 * Parse SWIFT date format (YYMMDD) to ISO
 */
function parseSwiftDate(yymmdd: string): string {
  const year = parseInt(yymmdd.substring(0, 2), 10);
  const month = parseInt(yymmdd.substring(2, 4), 10);
  const day = parseInt(yymmdd.substring(4, 6), 10);

  // Determine century (assume 2000s for years 00-50, 1900s for 51-99)
  const fullYear = year <= 50 ? 2000 + year : 1900 + year;

  const date = new Date(Date.UTC(fullYear, month - 1, day));
  return date.toISOString();
}

/**
 * Parse SWIFT amount (using comma as decimal separator)
 */
function parseSwiftAmount(amount: string, currency: string): ReturnType<typeof parseAmount> {
  // SWIFT uses comma as decimal separator
  const normalized = amount.replace(',', '.');
  return parseAmount(normalized, currency, { decimalSeparator: '.' });
}

/**
 * Extract subfields from field 86 (structured information)
 */
function parseField86(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  // Try structured format with subfield codes
  const subfields = content.match(/\/([A-Z]{2,4})\/([^\/]+)/g);
  if (subfields) {
    for (const sf of subfields) {
      const match = sf.match(/\/([A-Z]{2,4})\/(.+)/);
      if (match) {
        result[match[1]] = match[2].trim();
      }
    }
  }

  // Store raw content
  result._raw = content.replace(/\n/g, ' ').trim();

  return result;
}

export class SWIFTParser implements Parser {
  format = 'SWIFT_MT940' as const;

  detect(data: string | Buffer): boolean {
    const str = data instanceof Buffer ? data.toString('utf8') : data;

    // Check for SWIFT message identifiers
    return (
      str.includes('{1:') || // SWIFT header
      str.includes(':20:') || // Transaction reference
      str.includes(':60F:') || // Opening balance (MT940)
      str.includes(':32A:') || // Value date (MT103)
      /^:25:[A-Z0-9\/]+$/m.test(str) // Account ID
    );
  }

  validateConfig(config: ParserConfig): string[] {
    // SWIFT format doesn't need much configuration
    return [];
  }

  async parse(data: string | Buffer, config?: ParserConfig): Promise<ParseResult> {
    const startTime = Date.now();
    const str = data instanceof Buffer ? data.toString('utf8') : data;

    // Detect message type
    const isMT103 = str.includes(':32A:') && (str.includes(':50K:') || str.includes(':50A:'));
    const isMT940 = str.includes(':60F:') || str.includes(':60M:');
    const isMT942 = str.includes(':34F:'); // Interim balance indicator

    if (isMT103) {
      return this.parseMT103(str, config, startTime);
    } else if (isMT940 || isMT942) {
      return this.parseMT940(str, config, startTime, isMT942);
    }

    // Try to parse as generic SWIFT
    return this.parseGeneric(str, config, startTime);
  }

  private async parseMT103(
    data: string,
    config: ParserConfig | undefined,
    startTime: number
  ): Promise<ParseResult> {
    const records: ParsedRecord[] = [];
    const errors: ParseError[] = [];
    const warnings: ParseWarning[] = [];

    try {
      // Extract fields
      const refMatch = data.match(MT103_PATTERNS.field20);
      const valueMatch = data.match(MT103_PATTERNS.field32A);
      const orderingMatchK = data.match(MT103_PATTERNS.field50K);
      const orderingMatchA = data.match(MT103_PATTERNS.field50A);
      const beneficiaryMatch = data.match(MT103_PATTERNS.field59);
      const beneficiaryMatchA = data.match(MT103_PATTERNS.field59A);
      const remittanceMatch = data.match(MT103_PATTERNS.field70);
      const chargesMatch = data.match(MT103_PATTERNS.field71A);
      const senderChargesMatch = data.match(MT103_PATTERNS.field71F);

      if (!valueMatch) {
        errors.push({
          code: 'MISSING_VALUE_DATE',
          message: 'MT103 missing field 32A (value date/amount)',
          lineNumber: 0,
        });
        return this.createResult(records, errors, 0, 'SWIFT_MT103', config, startTime);
      }

      const [, dateStr, currency, amount] = valueMatch;
      const valueDate = parseSwiftDate(dateStr);
      const parsedAmount = parseSwiftAmount(amount, currency);

      // Parse ordering customer
      let originatorId: string | undefined;
      let originatorParty: any | undefined;
      const orderingMatch = orderingMatchK || orderingMatchA;
      if (orderingMatch) {
        originatorId = uuidv4();
        const accountNumber = orderingMatch[1];
        const nameOrBIC = orderingMatch[2];

        originatorParty = {
          id: originatorId,
          canonicalName: normalizePartyName(nameOrBIC.split('\n')[0]),
          originalName: nameOrBIC,
          type: orderingMatchA ? 'FINANCIAL_INSTITUTION' : inferPartyType(nameOrBIC),
          identifiers: [],
          provenance: {
            sourceSystem: 'swift-mt103',
            importedAt: new Date().toISOString(),
            chain: [],
          },
        };

        if (accountNumber) {
          const cleanedIBAN = cleanIBAN(accountNumber);
          if (cleanedIBAN) {
            originatorParty.identifiers.push({
              type: 'ACCOUNT_NUMBER',
              value: cleanedIBAN,
              verified: false,
            });
          }
        }

        if (orderingMatchA) {
          const cleanedBIC = cleanBIC(nameOrBIC);
          if (cleanedBIC) {
            originatorParty.identifiers.push({
              type: 'BIC',
              value: cleanedBIC,
              verified: false,
            });
          }
        }
      }

      // Parse beneficiary
      let beneficiaryId: string | undefined;
      let beneficiaryParty: any | undefined;
      const benefMatch = beneficiaryMatch || beneficiaryMatchA;
      if (benefMatch) {
        beneficiaryId = uuidv4();
        const accountNumber = benefMatch[1];
        const nameOrBIC = benefMatch[2];

        beneficiaryParty = {
          id: beneficiaryId,
          canonicalName: normalizePartyName(nameOrBIC.split('\n')[0]),
          originalName: nameOrBIC,
          type: beneficiaryMatchA ? 'FINANCIAL_INSTITUTION' : inferPartyType(nameOrBIC),
          identifiers: [],
          provenance: {
            sourceSystem: 'swift-mt103',
            importedAt: new Date().toISOString(),
            chain: [],
          },
        };

        if (accountNumber) {
          beneficiaryParty.identifiers.push({
            type: 'ACCOUNT_NUMBER',
            value: accountNumber,
            verified: false,
          });
        }
      }

      // Parse fees
      const fees: any[] = [];
      if (senderChargesMatch) {
        const [, feeCcy, feeAmt] = senderChargesMatch;
        fees.push({
          type: 'WIRE_FEE',
          amount: parseSwiftAmount(feeAmt, feeCcy).amount,
          description: 'Sender charges',
        });
      }

      const transaction: any = {
        id: uuidv4(),
        referenceNumber: refMatch ? refMatch[1] : uuidv4(),
        type: 'WIRE',
        status: 'COMPLETED',
        direction: 'DEBIT',
        amount: parsedAmount.amount,
        valueDate,
        postingDate: valueDate,
        description: remittanceMatch ? remittanceMatch[1].replace(/\n/g, ' ') : undefined,
        originatorId,
        beneficiaryId,
        fees,
        rawRecord: { raw: data },
        provenance: {
          sourceSystem: 'swift-mt103',
          sourceFormat: 'SWIFT_MT103',
          importedAt: new Date().toISOString(),
          parserVersion: getParserVersion(),
          chain: [],
        },
      };

      const parties: any[] = [];
      if (originatorParty) parties.push(originatorParty);
      if (beneficiaryParty) parties.push(beneficiaryParty);

      records.push({
        transaction,
        parties,
        warnings,
        rawRecord: {
          lineNumber: 1,
          fields: { raw: data },
          raw: data,
        },
      });
    } catch (e) {
      errors.push({
        code: 'MT103_PARSE_ERROR',
        message: e instanceof Error ? e.message : 'Failed to parse MT103',
        lineNumber: 0,
      });
    }

    return this.createResult(records, errors, 1, 'SWIFT_MT103', config, startTime);
  }

  private async parseMT940(
    data: string,
    config: ParserConfig | undefined,
    startTime: number,
    isInterim: boolean
  ): Promise<ParseResult> {
    const records: ParsedRecord[] = [];
    const errors: ParseError[] = [];

    // Extract account identifier
    const accountMatch = data.match(MT940_PATTERNS.field25);
    const accountId = accountMatch ? accountMatch[1] : undefined;

    // Extract statement reference
    const stmtRefMatch = data.match(MT940_PATTERNS.field20);
    const statementRef = stmtRefMatch ? stmtRefMatch[1] : undefined;

    // Find all transaction entries (:61: fields)
    const transactionPattern = /:61:(\d{6})(\d{4})?([CD]R?)([A-Z])?([0-9,]+)([A-Z]{4}[A-Z0-9]*)([^\n]*)?(?:\n(?!:)([^\n]+))?/g;
    let txnMatch;
    let lineNumber = 0;

    while ((txnMatch = transactionPattern.exec(data)) !== null) {
      lineNumber++;
      const warnings: ParseWarning[] = [];

      try {
        const [
          fullMatch,
          valueDate,
          entryDate,
          dcIndicator,
          fundsCode,
          amount,
          typeCode,
          customerRef,
          bankRef,
        ] = txnMatch;

        // Determine direction
        const isCredit = dcIndicator === 'C' || dcIndicator === 'CR';
        const isReversal = dcIndicator === 'CR' || dcIndicator === 'DR';

        // Parse value date
        const parsedValueDate = parseSwiftDate(valueDate);

        // Parse entry date (if provided, it's MMDD format)
        let parsedEntryDate = parsedValueDate;
        if (entryDate) {
          const year = new Date(parsedValueDate).getFullYear();
          const month = parseInt(entryDate.substring(0, 2), 10);
          const day = parseInt(entryDate.substring(2, 4), 10);
          parsedEntryDate = new Date(Date.UTC(year, month - 1, day)).toISOString();
        }

        // Extract currency from opening balance or default
        let currency = config?.defaultCurrency || 'EUR';
        const openingMatch = data.match(MT940_PATTERNS.field60F) || data.match(MT940_PATTERNS.field60M);
        if (openingMatch) {
          currency = openingMatch[3];
        }

        const parsedAmount = parseSwiftAmount(amount, currency);

        // Find associated :86: field (information to account owner)
        const field86Pattern = new RegExp(`:86:([\\s\\S]*?)(?=\\n:|$)`, 'g');
        field86Pattern.lastIndex = txnMatch.index + fullMatch.length;
        const field86Match = field86Pattern.exec(data);
        let description: string | undefined;
        let field86Data: Record<string, string> = {};

        if (field86Match && field86Match.index < txnMatch.index + fullMatch.length + 500) {
          field86Data = parseField86(field86Match[1]);
          description = field86Data._raw || field86Match[1].replace(/\n/g, ' ').trim();
        }

        // Build reference number
        const reference = customerRef?.trim() || bankRef?.trim() || `${statementRef}-${lineNumber}`;

        if (isReversal) {
          warnings.push({
            code: 'REVERSAL_INDICATOR',
            message: 'Transaction has reversal indicator (R suffix)',
          });
        }

        const transaction: any = {
          id: uuidv4(),
          referenceNumber: reference,
          externalId: bankRef?.trim(),
          type: this.mapTypeCode(typeCode),
          status: 'COMPLETED',
          direction: isCredit ? 'CREDIT' : 'DEBIT',
          amount: {
            ...parsedAmount.amount,
            minorUnits: isCredit
              ? parsedAmount.amount.minorUnits
              : -parsedAmount.amount.minorUnits,
          },
          valueDate: parsedValueDate,
          postingDate: parsedEntryDate,
          description,
          metadata: {
            swiftTypeCode: typeCode,
            fundsCode,
            field86: field86Data,
          },
          rawRecord: {
            field61: fullMatch,
            field86: field86Match?.[1],
          },
          provenance: {
            sourceSystem: 'swift-mt940',
            sourceFormat: isInterim ? 'SWIFT_MT942' : 'SWIFT_MT940',
            importedAt: new Date().toISOString(),
            parserVersion: getParserVersion(),
            chain: [],
          },
        };

        // Extract counterparty from field 86 if available
        const parties: any[] = [];
        if (field86Data.NAME || field86Data.BENM || field86Data.ORDP) {
          const partyName = field86Data.NAME || field86Data.BENM || field86Data.ORDP;
          const partyId = uuidv4();
          parties.push({
            id: partyId,
            canonicalName: normalizePartyName(partyName),
            originalName: partyName,
            type: inferPartyType(partyName),
            provenance: {
              sourceSystem: 'swift-mt940',
              importedAt: new Date().toISOString(),
              chain: [],
            },
          });

          if (isCredit) {
            transaction.originatorId = partyId;
          } else {
            transaction.beneficiaryId = partyId;
          }
        }

        records.push({
          transaction,
          parties: parties.length > 0 ? parties : undefined,
          warnings,
          rawRecord: {
            lineNumber,
            fields: { raw: fullMatch },
            raw: fullMatch,
          },
        });
      } catch (e) {
        errors.push({
          code: 'TRANSACTION_PARSE_ERROR',
          message: e instanceof Error ? e.message : 'Failed to parse transaction',
          lineNumber,
          value: txnMatch[0],
        });
      }
    }

    const format = isInterim ? 'SWIFT_MT942' : 'SWIFT_MT940';
    return this.createResult(records, errors, records.length + errors.length, format as any, config, startTime);
  }

  private parseGeneric(
    data: string,
    config: ParserConfig | undefined,
    startTime: number
  ): Promise<ParseResult> {
    // Generic SWIFT parsing - just extract what we can
    const errors: ParseError[] = [{
      code: 'UNKNOWN_MESSAGE_TYPE',
      message: 'Could not determine SWIFT message type',
      lineNumber: 0,
    }];

    return Promise.resolve(this.createResult([], errors, 0, 'SWIFT_MT940', config, startTime));
  }

  private mapTypeCode(code: string): string {
    // SWIFT transaction type codes
    const typeMap: Record<string, string> = {
      NTRF: 'TRANSFER',
      NTRN: 'TRANSFER',
      NCHK: 'CHECK',
      NCHG: 'FEE',
      NINT: 'INTEREST',
      NDIV: 'DIVIDEND',
      NCOL: 'PAYMENT',
      NSTO: 'STANDING_ORDER',
      NBOE: 'PAYMENT',
      NMSC: 'OTHER',
    };

    return typeMap[code.substring(0, 4)] || 'OTHER';
  }

  private createResult(
    records: ParsedRecord[],
    errors: ParseError[],
    totalRecords: number,
    format: 'SWIFT_MT940' | 'SWIFT_MT942' | 'SWIFT_MT103',
    config: ParserConfig | undefined,
    startTime: number
  ): ParseResult {
    return {
      records,
      errors,
      totalRecords,
      format,
      config: config || {},
      metadata: {
        durationMs: Date.now() - startTime,
        parserVersion: getParserVersion(),
      },
    };
  }
}

export const swiftParser = new SWIFTParser();
