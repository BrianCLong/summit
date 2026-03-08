"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bankApiParser = exports.BankApiParser = void 0;
const uuid_1 = require("uuid");
const utils_js_1 = require("./utils.js");
const finance_normalizer_types_1 = require("@intelgraph/finance-normalizer-types");
class BankApiParser {
    format = 'JSON';
    detect(data) {
        const str = data instanceof Buffer ? data.toString('utf8') : data;
        try {
            const parsed = JSON.parse(str);
            // Look for common bank API patterns
            return (Array.isArray(parsed) ||
                parsed.transactions !== undefined ||
                parsed.data !== undefined ||
                parsed.items !== undefined ||
                parsed.results !== undefined);
        }
        catch {
            return false;
        }
    }
    validateConfig(config) {
        return [];
    }
    async parse(data, config) {
        const startTime = Date.now();
        const str = data instanceof Buffer ? data.toString('utf8') : data;
        const records = [];
        const errors = [];
        let parsed;
        try {
            parsed = JSON.parse(str);
        }
        catch (e) {
            errors.push({
                code: 'JSON_PARSE_ERROR',
                message: e instanceof Error ? e.message : 'Invalid JSON',
                lineNumber: 0,
            });
            return this.createResult(records, errors, 0, config, startTime);
        }
        // Extract transactions array
        let transactions = [];
        let accountInfo;
        if (Array.isArray(parsed)) {
            transactions = parsed;
        }
        else {
            if (parsed.transactions) {
                transactions = parsed.transactions;
            }
            else if (parsed.data) {
                if (Array.isArray(parsed.data)) {
                    transactions = parsed.data;
                }
                else if (parsed.data.transactions) {
                    transactions = parsed.data.transactions;
                }
            }
            else if (parsed.items) {
                transactions = parsed.items;
            }
            else if (parsed.results) {
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
            const warnings = [];
            try {
                const parsedRecord = this.parseTransaction(txn, defaultCurrency, lineNumber, warnings);
                records.push(parsedRecord);
            }
            catch (e) {
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
    parseTransaction(txn, defaultCurrency, lineNumber, warnings) {
        // Extract reference
        const reference = txn.id ||
            txn.transactionId ||
            txn.transaction_id ||
            txn.reference ||
            txn.referenceNumber ||
            txn.reference_number ||
            (0, uuid_1.v4)();
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
            ? new Date(txn.bookingDate || txn.booking_date).toISOString()
            : valueDate;
        // Extract amount and currency
        let amount;
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
        }
        else {
            amount = typeof amountValue === 'string' ? parseFloat(amountValue) : amountValue;
        }
        currency = (txn.currency || txn.currencyCode || txn.currency_code || currency).toUpperCase();
        const monetaryAmount = (0, finance_normalizer_types_1.createMonetaryAmount)(amount, currency, (0, utils_js_1.getCurrencyDecimals)(currency));
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
            : (0, utils_js_1.inferTransactionType)(description || '', monetaryAmount);
        // Extract counterparty
        let counterpartyName;
        let counterpartyAccount;
        let counterpartyIban;
        if (txn.counterparty) {
            if (typeof txn.counterparty === 'string') {
                counterpartyName = txn.counterparty;
            }
            else {
                counterpartyName = txn.counterparty.name;
                counterpartyAccount = txn.counterparty.accountNumber || txn.counterparty.account_number;
                counterpartyIban = txn.counterparty.iban;
            }
        }
        else {
            counterpartyName = txn.merchantName ||
                txn.merchant_name ||
                txn.creditorName ||
                txn.creditor_name ||
                txn.debtorName ||
                txn.debtor_name;
        }
        // Extract balance
        let runningBalance;
        const balanceValue = txn.balance || txn.runningBalance || txn.running_balance;
        if (balanceValue !== undefined && balanceValue !== null) {
            const balNum = typeof balanceValue === 'string' ? parseFloat(balanceValue) : balanceValue;
            runningBalance = (0, finance_normalizer_types_1.createMonetaryAmount)(balNum, currency, (0, utils_js_1.getCurrencyDecimals)(currency));
        }
        // Extract status
        const status = this.mapStatus(txn.status || txn.transactionStatus || txn.transaction_status);
        // Build transaction object
        const transaction = {
            id: (0, uuid_1.v4)(),
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
                parserVersion: (0, utils_js_1.getParserVersion)(),
                chain: [],
            },
        };
        // Build party if counterparty found
        const parties = [];
        if (counterpartyName) {
            const partyId = (0, uuid_1.v4)();
            const party = {
                id: partyId,
                canonicalName: (0, utils_js_1.normalizePartyName)(counterpartyName),
                originalName: counterpartyName,
                type: (0, utils_js_1.inferPartyType)(counterpartyName),
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
            }
            else if (counterpartyAccount) {
                party.identifiers.push({
                    type: 'ACCOUNT_NUMBER',
                    value: counterpartyAccount,
                    verified: false,
                });
            }
            parties.push(party);
            if (direction === 'CREDIT') {
                transaction.originatorId = partyId;
            }
            else {
                transaction.beneficiaryId = partyId;
            }
        }
        const rawRecord = {
            lineNumber,
            fields: txn,
            raw: JSON.stringify(txn),
        };
        return {
            transaction,
            parties: parties.length > 0 ? parties : undefined,
            warnings,
            rawRecord,
        };
    }
    mapTransactionType(type) {
        const normalized = type.toLowerCase().replace(/[_\s-]/g, '');
        const typeMap = {
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
    mapStatus(status) {
        if (!status)
            return 'COMPLETED';
        const normalized = status.toLowerCase().replace(/[_\s-]/g, '');
        const statusMap = {
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
    createResult(records, errors, totalRecords, config, startTime) {
        return {
            records,
            errors,
            totalRecords,
            format: 'JSON',
            config: config || {},
            metadata: {
                durationMs: Date.now() - startTime,
                parserVersion: (0, utils_js_1.getParserVersion)(),
            },
        };
    }
}
exports.BankApiParser = BankApiParser;
exports.bankApiParser = new BankApiParser();
