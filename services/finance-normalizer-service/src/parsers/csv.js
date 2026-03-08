"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.csvParser = exports.CSVParser = void 0;
const sync_1 = require("csv-parse/sync");
const uuid_1 = require("uuid");
const utils_js_1 = require("./utils.js");
/**
 * Standard CSV column names mapping
 */
const DEFAULT_COLUMN_MAPPING = {
    date: ['date', 'transaction_date', 'trans_date', 'posting_date', 'value_date', 'txn_date'],
    valueDate: ['value_date', 'effective_date'],
    postingDate: ['posting_date', 'post_date', 'book_date'],
    amount: ['amount', 'transaction_amount', 'txn_amount', 'debit_credit'],
    debitAmount: ['debit', 'debit_amount', 'withdrawal'],
    creditAmount: ['credit', 'credit_amount', 'deposit'],
    currency: ['currency', 'ccy', 'cur'],
    description: ['description', 'narrative', 'memo', 'details', 'particulars', 'reference'],
    reference: ['reference', 'ref', 'reference_number', 'txn_ref', 'transaction_id'],
    type: ['type', 'transaction_type', 'txn_type', 'category'],
    balance: ['balance', 'running_balance', 'closing_balance'],
    counterparty: ['counterparty', 'payee', 'payer', 'beneficiary', 'name', 'party'],
    accountNumber: ['account', 'account_number', 'acct', 'account_no'],
    indicator: ['indicator', 'dr_cr', 'dc_indicator', 'sign'],
};
/**
 * Find matching column from data headers
 */
function findColumn(headers, fieldName, customMapping) {
    // Check custom mapping first
    if (customMapping && customMapping[fieldName]) {
        const idx = headers.findIndex((h) => h.toLowerCase() === customMapping[fieldName].toLowerCase());
        if (idx !== -1)
            return idx;
    }
    // Check default mappings
    const possibleNames = DEFAULT_COLUMN_MAPPING[fieldName] || [fieldName];
    for (const name of possibleNames) {
        const idx = headers.findIndex((h) => h.toLowerCase().replace(/[_\s-]/g, '') === name.toLowerCase().replace(/[_\s-]/g, ''));
        if (idx !== -1)
            return idx;
    }
    return -1;
}
class CSVParser {
    format = 'CSV';
    detect(data) {
        const str = data instanceof Buffer ? data.toString('utf8') : data;
        const lines = str.split('\n').slice(0, 5);
        // Check for consistent delimiter usage
        const delimiters = [',', ';', '\t', '|'];
        for (const delim of delimiters) {
            const counts = lines.map((line) => (line.match(new RegExp(`\\${delim}`, 'g')) || []).length);
            if (counts.length > 1 && counts[0] > 0 && counts.every((c) => c === counts[0])) {
                return true;
            }
        }
        return false;
    }
    validateConfig(config) {
        const errors = [];
        if (config.delimiter && config.delimiter.length !== 1) {
            errors.push('Delimiter must be a single character');
        }
        if (config.quoteChar && config.quoteChar.length !== 1) {
            errors.push('Quote character must be a single character');
        }
        if (config.decimalSeparator && !['.', ','].includes(config.decimalSeparator)) {
            errors.push('Decimal separator must be "." or ","');
        }
        return errors;
    }
    async parse(data, config) {
        const startTime = Date.now();
        const str = data instanceof Buffer ? data.toString('utf8') : data;
        const records = [];
        const errors = [];
        // Detect delimiter if not specified
        const delimiter = config?.delimiter || this.detectDelimiter(str);
        // Parse CSV
        let rows;
        try {
            rows = (0, sync_1.parse)(str, {
                delimiter,
                quote: config?.quoteChar || '"',
                skip_empty_lines: config?.skipEmptyRows !== false,
                relax_column_count: true,
                trim: true,
            });
        }
        catch (e) {
            errors.push({
                code: 'CSV_PARSE_ERROR',
                message: e instanceof Error ? e.message : 'Failed to parse CSV',
                lineNumber: 0,
            });
            return {
                records: [],
                errors,
                totalRecords: 0,
                format: 'CSV',
                config: config || {},
                metadata: {
                    durationMs: Date.now() - startTime,
                    parserVersion: (0, utils_js_1.getParserVersion)(),
                },
            };
        }
        if (rows.length === 0) {
            return {
                records: [],
                errors: [],
                totalRecords: 0,
                format: 'CSV',
                config: config || {},
                metadata: {
                    durationMs: Date.now() - startTime,
                    parserVersion: (0, utils_js_1.getParserVersion)(),
                },
            };
        }
        // Determine headers
        const hasHeader = config?.hasHeader !== false;
        const headers = hasHeader ? rows[0].map((h) => h.trim()) : rows[0].map((_, i) => `col_${i}`);
        const dataRows = hasHeader ? rows.slice(1) : rows;
        // Find column indices
        const columnMap = {
            date: findColumn(headers, 'date', config?.columnMapping),
            valueDate: findColumn(headers, 'valueDate', config?.columnMapping),
            postingDate: findColumn(headers, 'postingDate', config?.columnMapping),
            amount: findColumn(headers, 'amount', config?.columnMapping),
            debitAmount: findColumn(headers, 'debitAmount', config?.columnMapping),
            creditAmount: findColumn(headers, 'creditAmount', config?.columnMapping),
            currency: findColumn(headers, 'currency', config?.columnMapping),
            description: findColumn(headers, 'description', config?.columnMapping),
            reference: findColumn(headers, 'reference', config?.columnMapping),
            type: findColumn(headers, 'type', config?.columnMapping),
            balance: findColumn(headers, 'balance', config?.columnMapping),
            counterparty: findColumn(headers, 'counterparty', config?.columnMapping),
            accountNumber: findColumn(headers, 'accountNumber', config?.columnMapping),
            indicator: findColumn(headers, 'indicator', config?.columnMapping),
        };
        // Validate required columns
        if (columnMap.date === -1 && columnMap.valueDate === -1 && columnMap.postingDate === -1) {
            errors.push({
                code: 'MISSING_DATE_COLUMN',
                message: 'No date column found in CSV',
                lineNumber: 0,
            });
        }
        if (columnMap.amount === -1 &&
            columnMap.debitAmount === -1 &&
            columnMap.creditAmount === -1) {
            errors.push({
                code: 'MISSING_AMOUNT_COLUMN',
                message: 'No amount column found in CSV',
                lineNumber: 0,
            });
        }
        // Parse each row
        const defaultCurrency = config?.defaultCurrency || 'USD';
        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            const lineNumber = hasHeader ? i + 2 : i + 1;
            const rawRecord = {
                lineNumber,
                fields: Object.fromEntries(headers.map((h, idx) => [h, row[idx] || null])),
                raw: row.join(delimiter),
            };
            const warnings = [];
            try {
                // Parse date
                let valueDateStr;
                let postingDateStr;
                const primaryDateIdx = columnMap.date !== -1 ? columnMap.date : columnMap.valueDate;
                if (primaryDateIdx !== -1 && row[primaryDateIdx]) {
                    const parsed = (0, utils_js_1.parseDate)(row[primaryDateIdx], config);
                    valueDateStr = parsed.isoString;
                    if (parsed.timeInferred) {
                        warnings.push({
                            code: 'TIME_INFERRED',
                            message: 'Time was not specified, defaulting to midnight UTC',
                            field: 'date',
                        });
                    }
                }
                if (columnMap.postingDate !== -1 && row[columnMap.postingDate]) {
                    const parsed = (0, utils_js_1.parseDate)(row[columnMap.postingDate], config);
                    postingDateStr = parsed.isoString;
                }
                // Use value date as posting date if not specified separately
                if (!postingDateStr) {
                    postingDateStr = valueDateStr;
                }
                if (!valueDateStr) {
                    valueDateStr = postingDateStr;
                }
                if (!valueDateStr) {
                    throw new Error('No valid date found');
                }
                // Parse amount
                let currency = defaultCurrency;
                if (columnMap.currency !== -1 && row[columnMap.currency]) {
                    currency = row[columnMap.currency].toUpperCase();
                }
                let amount;
                let direction;
                // Check for separate debit/credit columns
                if (columnMap.debitAmount !== -1 || columnMap.creditAmount !== -1) {
                    const debitVal = columnMap.debitAmount !== -1 ? row[columnMap.debitAmount] : null;
                    const creditVal = columnMap.creditAmount !== -1 ? row[columnMap.creditAmount] : null;
                    if (debitVal && debitVal.trim() && parseFloat(debitVal.replace(/[^0-9.-]/g, '')) !== 0) {
                        amount = (0, utils_js_1.parseAmount)(debitVal, currency, config);
                        // Ensure debit is negative
                        if (amount.amount.minorUnits > BigInt(0)) {
                            amount.amount.minorUnits = -amount.amount.minorUnits;
                        }
                        direction = 'DEBIT';
                    }
                    else if (creditVal && creditVal.trim() && parseFloat(creditVal.replace(/[^0-9.-]/g, '')) !== 0) {
                        amount = (0, utils_js_1.parseAmount)(creditVal, currency, config);
                        // Ensure credit is positive
                        if (amount.amount.minorUnits < BigInt(0)) {
                            amount.amount.minorUnits = -amount.amount.minorUnits;
                        }
                        direction = 'CREDIT';
                    }
                    else {
                        throw new Error('No valid amount in debit or credit column');
                    }
                }
                else if (columnMap.amount !== -1 && row[columnMap.amount]) {
                    amount = (0, utils_js_1.parseAmount)(row[columnMap.amount], currency, config);
                    const indicator = columnMap.indicator !== -1 ? row[columnMap.indicator] : null;
                    direction = (0, utils_js_1.detectDirection)(indicator, amount.amount);
                }
                else {
                    throw new Error('No valid amount found');
                }
                // Parse description
                const description = columnMap.description !== -1 ? row[columnMap.description] : undefined;
                // Parse reference
                let reference = columnMap.reference !== -1 && row[columnMap.reference]
                    ? row[columnMap.reference]
                    : undefined;
                if (!reference) {
                    reference = (0, utils_js_1.generateReferenceNumber)(valueDateStr, amount.original, description || '', i);
                    warnings.push({
                        code: 'REFERENCE_GENERATED',
                        message: 'Reference number was auto-generated',
                        field: 'reference',
                    });
                }
                // Parse counterparty
                let counterpartyName;
                if (columnMap.counterparty !== -1 && row[columnMap.counterparty]) {
                    counterpartyName = (0, utils_js_1.normalizePartyName)(row[columnMap.counterparty]);
                }
                // Infer transaction type
                const explicitType = columnMap.type !== -1 ? row[columnMap.type] : null;
                const txnType = explicitType || (0, utils_js_1.inferTransactionType)(description || '', amount.amount);
                // Parse running balance if available
                let runningBalance;
                if (columnMap.balance !== -1 && row[columnMap.balance]) {
                    try {
                        runningBalance = (0, utils_js_1.parseAmount)(row[columnMap.balance], currency, config);
                    }
                    catch {
                        warnings.push({
                            code: 'BALANCE_PARSE_ERROR',
                            message: 'Could not parse running balance',
                            field: 'balance',
                            value: row[columnMap.balance],
                        });
                    }
                }
                // Build parsed record
                const parsedRecord = {
                    transaction: {
                        id: (0, uuid_1.v4)(),
                        referenceNumber: reference,
                        type: txnType,
                        status: 'COMPLETED',
                        direction,
                        amount: amount.amount,
                        valueDate: valueDateStr,
                        postingDate: postingDateStr,
                        description: description || undefined,
                        runningBalance: runningBalance?.amount,
                        rawRecord: rawRecord.fields,
                        provenance: {
                            sourceSystem: 'csv-import',
                            sourceFormat: 'CSV',
                            importedAt: new Date().toISOString(),
                            parserVersion: (0, utils_js_1.getParserVersion)(),
                            chain: [],
                        },
                    },
                    warnings,
                    rawRecord,
                };
                // Add counterparty if found
                if (counterpartyName) {
                    const partyId = (0, uuid_1.v4)();
                    parsedRecord.parties = [{
                            id: partyId,
                            canonicalName: counterpartyName,
                            originalName: row[columnMap.counterparty],
                            type: (0, utils_js_1.inferPartyType)(counterpartyName),
                            provenance: {
                                sourceSystem: 'csv-import',
                                importedAt: new Date().toISOString(),
                                chain: [],
                            },
                        }];
                    // Link party to transaction
                    if (direction === 'CREDIT') {
                        parsedRecord.transaction.originatorId = partyId;
                    }
                    else {
                        parsedRecord.transaction.beneficiaryId = partyId;
                    }
                }
                records.push(parsedRecord);
            }
            catch (e) {
                errors.push({
                    code: 'ROW_PARSE_ERROR',
                    message: e instanceof Error ? e.message : 'Failed to parse row',
                    lineNumber,
                    value: row.join(delimiter),
                });
            }
        }
        return {
            records,
            errors,
            totalRecords: dataRows.length,
            format: 'CSV',
            config: config || {},
            metadata: {
                durationMs: Date.now() - startTime,
                parserVersion: (0, utils_js_1.getParserVersion)(),
            },
        };
    }
    detectDelimiter(data) {
        const firstLine = data.split('\n')[0] || '';
        const delimiters = [',', ';', '\t', '|'];
        let maxCount = 0;
        let detected = ',';
        for (const delim of delimiters) {
            const count = (firstLine.match(new RegExp(`\\${delim}`, 'g')) || []).length;
            if (count > maxCount) {
                maxCount = count;
                detected = delim;
            }
        }
        return detected;
    }
}
exports.CSVParser = CSVParser;
exports.csvParser = new CSVParser();
