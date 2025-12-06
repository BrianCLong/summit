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
  normalizePartyName,
  inferPartyType,
  inferTransactionType,
  getParserVersion,
  getCurrencyDecimals,
} from './utils.js';
import { createMonetaryAmount } from '@intelgraph/finance-normalizer-types';

/**
 * Generic Bank API response format
 * This parser handles JSON responses from bank APIs
 * with common field patterns
 */

interface BankApiTransaction {
  id?: string;
  transactionId?: string;
  transaction_id?: string;
  reference?: string;
  referenceNumber?: string;
  reference_number?: string;

  date?: string;
  transactionDate?: string;
  transaction_date?: string;
  valueDate?: string;
  value_date?: string;
  bookingDate?: string;
  booking_date?: string;

  amount?: number | string;
  transactionAmount?: number | string | { amount: number | string; currency: string };
  transaction_amount?: number | string;

  currency?: string;
  currencyCode?: string;
  currency_code?: string;

  type?: string;
  transactionType?: string;
  transaction_type?: string;
  category?: string;

  description?: string;
  narrative?: string;
  memo?: string;
  remittanceInformation?: string;
  remittance_information?: string;

  counterparty?: string | {
    name?: string;
    accountNumber?: string;
    account_number?: string;
    iban?: string;
    bic?: string;
  };
  merchantName?: string;
  merchant_name?: string;
  creditorName?: string;
  creditor_name?: string;
  debtorName?: string;
  debtor_name?: string;

  balance?: number | string;
  runningBalance?: number | string;
  running_balance?: number | string;

  status?: string;
  transactionStatus?: string;
  transaction_status?: string;

  metadata?: Record<string, unknown>;
  additionalInformation?: Record<string, unknown>;
  additional_information?: Record<string, unknown>;
}

interface BankApiResponse {
  transactions?: BankApiTransaction[];
  data?: BankApiTransaction[] | { transactions?: BankApiTransaction[] };
  items?: BankApiTransaction[];
  results?: BankApiTransaction[];
  account?: {
    accountId?: string;
    account_id?: string;
    iban?: string;
    currency?: string;
  };
}

export class BankApiParser implements Parser {
  format = 'JSON' as const;

  detect(data: string | Buffer): boolean {
    const str = data instanceof Buffer ? data.toString('utf8') : data;

    try {
      const parsed = JSON.parse(str);
      // Look for common bank API patterns
      return (
        Array.isArray(parsed) ||
        parsed.transactions !== undefined ||
        parsed.data !== undefined ||
        parsed.items !== undefined ||
        parsed.results !== undefined
      );
    } catch {
      return false;
    }
  }

  validateConfig(config: ParserConfig): string[] {
    return [];
  }

  async parse(data: string | Buffer, config?: ParserConfig): Promise<ParseResult> {
    const startTime = Date.now();
    const str = data instanceof Buffer ? data.toString('utf8') : data;

    const records: ParsedRecord[] = [];
    const errors: ParseError[] = [];

    let parsed: BankApiResponse | BankApiTransaction[];
    try {
      parsed = JSON.parse(str);
    } catch (e) {
      errors.push({
        code: 'JSON_PARSE_ERROR',
        message: e instanceof Error ? e.message : 'Invalid JSON',
        lineNumber: 0,
      });
      return this.createResult(records, errors, 0, config, startTime);
    }

    // Extract transactions array
    let transactions: BankApiTransaction[] = [];
    let accountInfo: BankApiResponse['account'];

    if (Array.isArray(parsed)) {
      transactions = parsed;
    } else {
      if (parsed.transactions) {
        transactions = parsed.transactions;
      } else if (parsed.data) {
        if (Array.isArray(parsed.data)) {
          transactions = parsed.data;
        } else if (parsed.data.transactions) {
          transactions = parsed.data.transactions;
        }
      } else if (parsed.items) {
        transactions = parsed.items;
      } else if (parsed.results) {
        transactions = parsed.results;
      }
      accountInfo = parsed.account;
    }

    const defaultCurrency = config?.defaultCurrency ||
      accountInfo?.currency ||
      'USD';

    // Parse each transaction
    for (let i = 0; i < transactions.length; i++) {
      const txn = transactions[i];
      const lineNumber = i + 1;
      const warnings: ParseWarning[] = [];

      try {
        const parsedRecord = this.parseTransaction(txn, defaultCurrency, lineNumber, warnings);
        records.push(parsedRecord);
      } catch (e) {
        errors.push({
          code: 'TRANSACTION_PARSE_ERROR',
          message: e instanceof Error ? e.message : 'Failed to parse transaction',
          lineNumber,
          value: JSON.stringify(txn).substring(0, 200),
        });
      }
    }

    return this.createResult(records, errors, transactions.length, config, startTime);
  }

  private parseTransaction(
    txn: BankApiTransaction,
    defaultCurrency: string,
    lineNumber: number,
    warnings: ParseWarning[]
  ): ParsedRecord {
    // Extract reference
    const reference = txn.id ||
      txn.transactionId ||
      txn.transaction_id ||
      txn.reference ||
      txn.referenceNumber ||
      txn.reference_number ||
      uuidv4();

    // Extract date
    const dateStr = txn.date ||
      txn.transactionDate ||
      txn.transaction_date ||
      txn.valueDate ||
      txn.value_date ||
      txn.bookingDate ||
      txn.booking_date;

    if (!dateStr) {
      throw new Error('No date field found');
    }

    const valueDate = new Date(dateStr).toISOString();
    const postingDate = txn.bookingDate || txn.booking_date
      ? new Date(txn.bookingDate || txn.booking_date!).toISOString()
      : valueDate;

    // Extract amount and currency
    let amount: number;
    let currency = defaultCurrency;

    const amountValue = txn.amount || txn.transactionAmount || txn.transaction_amount;
    if (amountValue === undefined || amountValue === null) {
      throw new Error('No amount field found');
    }

    if (typeof amountValue === 'object' && amountValue !== null) {
      amount = typeof amountValue.amount === 'string'
        ? parseFloat(amountValue.amount)
        : amountValue.amount;
      currency = amountValue.currency || currency;
    } else {
      amount = typeof amountValue === 'string' ? parseFloat(amountValue) : amountValue;
    }

    currency = (txn.currency || txn.currencyCode || txn.currency_code || currency).toUpperCase();

    const monetaryAmount = createMonetaryAmount(amount, currency, getCurrencyDecimals(currency));
    const direction = amount >= 0 ? 'CREDIT' : 'DEBIT';

    // Extract description
    const description = txn.description ||
      txn.narrative ||
      txn.memo ||
      txn.remittanceInformation ||
      txn.remittance_information;

    // Extract transaction type
    const explicitType = txn.type || txn.transactionType || txn.transaction_type || txn.category;
    const txnType = explicitType
      ? this.mapTransactionType(explicitType)
      : inferTransactionType(description || '', monetaryAmount);

    // Extract counterparty
    let counterpartyName: string | undefined;
    let counterpartyAccount: string | undefined;
    let counterpartyIban: string | undefined;

    if (txn.counterparty) {
      if (typeof txn.counterparty === 'string') {
        counterpartyName = txn.counterparty;
      } else {
        counterpartyName = txn.counterparty.name;
        counterpartyAccount = txn.counterparty.accountNumber || txn.counterparty.account_number;
        counterpartyIban = txn.counterparty.iban;
      }
    } else {
      counterpartyName = txn.merchantName ||
        txn.merchant_name ||
        txn.creditorName ||
        txn.creditor_name ||
        txn.debtorName ||
        txn.debtor_name;
    }

    // Extract balance
    let runningBalance: ReturnType<typeof createMonetaryAmount> | undefined;
    const balanceValue = txn.balance || txn.runningBalance || txn.running_balance;
    if (balanceValue !== undefined && balanceValue !== null) {
      const balNum = typeof balanceValue === 'string' ? parseFloat(balanceValue) : balanceValue;
      runningBalance = createMonetaryAmount(balNum, currency, getCurrencyDecimals(currency));
    }

    // Extract status
    const status = this.mapStatus(txn.status || txn.transactionStatus || txn.transaction_status);

    // Build transaction object
    const transaction: any = {
      id: uuidv4(),
      referenceNumber: reference,
      type: txnType,
      status,
      direction,
      amount: monetaryAmount,
      valueDate,
      postingDate,
      description,
      runningBalance,
      metadata: txn.metadata || txn.additionalInformation || txn.additional_information,
      rawRecord: txn,
      provenance: {
        sourceSystem: 'bank-api',
        sourceFormat: 'JSON',
        importedAt: new Date().toISOString(),
        parserVersion: getParserVersion(),
        chain: [],
      },
    };

    // Build party if counterparty found
    const parties: any[] = [];
    if (counterpartyName) {
      const partyId = uuidv4();
      const party: any = {
        id: partyId,
        canonicalName: normalizePartyName(counterpartyName),
        originalName: counterpartyName,
        type: inferPartyType(counterpartyName),
        identifiers: [],
        provenance: {
          sourceSystem: 'bank-api',
          importedAt: new Date().toISOString(),
          chain: [],
        },
      };

      if (counterpartyIban) {
        party.identifiers.push({
          type: 'ACCOUNT_NUMBER',
          value: counterpartyIban,
          verified: false,
        });
      } else if (counterpartyAccount) {
        party.identifiers.push({
          type: 'ACCOUNT_NUMBER',
          value: counterpartyAccount,
          verified: false,
        });
      }

      parties.push(party);

      if (direction === 'CREDIT') {
        transaction.originatorId = partyId;
      } else {
        transaction.beneficiaryId = partyId;
      }
    }

    const rawRecord: RawRecord = {
      lineNumber,
      fields: txn as unknown as Record<string, string | null>,
      raw: JSON.stringify(txn),
    };

    return {
      transaction,
      parties: parties.length > 0 ? parties : undefined,
      warnings,
      rawRecord,
    };
  }

  private mapTransactionType(type: string): string {
    const normalized = type.toLowerCase().replace(/[_\s-]/g, '');

    const typeMap: Record<string, string> = {
      payment: 'PAYMENT',
      transfer: 'TRANSFER',
      wiretransfer: 'WIRE',
      wire: 'WIRE',
      ach: 'ACH',
      directdebit: 'DIRECT_DEBIT',
      standingorder: 'STANDING_ORDER',
      card: 'CARD_PURCHASE',
      cardpurchase: 'CARD_PURCHASE',
      cardpayment: 'CARD_PURCHASE',
      pos: 'CARD_PURCHASE',
      atm: 'WITHDRAWAL',
      withdrawal: 'WITHDRAWAL',
      deposit: 'DEPOSIT',
      fee: 'FEE',
      charge: 'FEE',
      interest: 'INTEREST',
      dividend: 'DIVIDEND',
      refund: 'CARD_REFUND',
      reversal: 'REVERSAL',
      check: 'CHECK',
      cheque: 'CHECK',
    };

    return typeMap[normalized] || 'OTHER';
  }

  private mapStatus(status: string | undefined): string {
    if (!status) return 'COMPLETED';

    const normalized = status.toLowerCase().replace(/[_\s-]/g, '');

    const statusMap: Record<string, string> = {
      pending: 'PENDING',
      processing: 'PROCESSING',
      completed: 'COMPLETED',
      booked: 'COMPLETED',
      settled: 'COMPLETED',
      posted: 'COMPLETED',
      failed: 'FAILED',
      rejected: 'FAILED',
      cancelled: 'CANCELLED',
      canceled: 'CANCELLED',
      reversed: 'REVERSED',
      onhold: 'ON_HOLD',
      hold: 'ON_HOLD',
    };

    return statusMap[normalized] || 'COMPLETED';
  }

  private createResult(
    records: ParsedRecord[],
    errors: ParseError[],
    totalRecords: number,
    config: ParserConfig | undefined,
    startTime: number
  ): ParseResult {
    return {
      records,
      errors,
      totalRecords,
      format: 'JSON',
      config: config || {},
      metadata: {
        durationMs: Date.now() - startTime,
        parserVersion: getParserVersion(),
      },
    };
  }
}

export const bankApiParser = new BankApiParser();
