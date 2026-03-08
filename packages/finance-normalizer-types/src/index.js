"use strict";
/**
 * Finance Normalizer Types
 * Canonical financial schemas for transaction normalization and flow analysis
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeTransactionInputSchema = exports.importLedgerInputSchema = exports.flowQueryResultSchema = exports.flowQuerySchema = exports.streamEventSchema = exports.streamEventTypes = exports.importJobSchema = exports.importStatusEnum = exports.importFormats = exports.aggregatedFlowSchema = exports.flowPatternSchema = exports.flowPatternSeverities = exports.flowPatternTypes = exports.transactionSchema = exports.transactionDirections = exports.transactionStatuses = exports.transactionTypes = exports.instrumentSchema = exports.instrumentTypes = exports.accountSchema = exports.accountStatuses = exports.accountTypes = exports.partySchema = exports.partyIdentifierSchema = exports.partyIdentifierTypes = exports.partyTypes = exports.exchangeRateSchema = exports.monetaryAmountSchema = void 0;
exports.createMonetaryAmount = createMonetaryAmount;
exports.formatMonetaryAmount = formatMonetaryAmount;
exports.addMonetaryAmounts = addMonetaryAmounts;
exports.subtractMonetaryAmounts = subtractMonetaryAmounts;
exports.compareMonetaryAmounts = compareMonetaryAmounts;
exports.isZero = isZero;
exports.isNegative = isNegative;
exports.absMonetaryAmount = absMonetaryAmount;
const zod_1 = require("zod");
// ============================================================================
// MONETARY PRIMITIVES (Decimal-Safe)
// ============================================================================
/**
 * Monetary amount stored as integer minor units (cents, pence, etc.)
 * to avoid floating-point errors. All monetary calculations must use
 * this representation.
 */
exports.monetaryAmountSchema = zod_1.z.object({
    /** Amount in minor units (e.g., cents for USD, pence for GBP) */
    minorUnits: zod_1.z.bigint(),
    /** ISO 4217 currency code */
    currency: zod_1.z.string().length(3).toUpperCase(),
    /** Number of decimal places for this currency (e.g., 2 for USD, 0 for JPY) */
    decimalPlaces: zod_1.z.number().int().min(0).max(4).default(2),
});
/**
 * Exchange rate between two currencies at a point in time
 */
exports.exchangeRateSchema = zod_1.z.object({
    fromCurrency: zod_1.z.string().length(3).toUpperCase(),
    toCurrency: zod_1.z.string().length(3).toUpperCase(),
    /** Rate as a string to preserve precision (e.g., "1.23456789") */
    rate: zod_1.z.string().regex(/^\d+(\.\d+)?$/),
    /** Inverse rate for reverse conversion */
    inverseRate: zod_1.z.string().regex(/^\d+(\.\d+)?$/).optional(),
    /** Rate effective timestamp */
    effectiveAt: zod_1.z.string().datetime(),
    /** Rate source (e.g., "ECB", "REUTERS", "INTERNAL") */
    source: zod_1.z.string(),
    /** Rate type */
    rateType: zod_1.z.enum(['SPOT', 'FORWARD', 'HISTORICAL', 'INDICATIVE']).default('SPOT'),
});
// ============================================================================
// PARTY (Counterparty) SCHEMA
// ============================================================================
exports.partyTypes = [
    'INDIVIDUAL',
    'CORPORATION',
    'FINANCIAL_INSTITUTION',
    'GOVERNMENT',
    'NONPROFIT',
    'TRUST',
    'PARTNERSHIP',
    'UNKNOWN',
];
exports.partyIdentifierTypes = [
    'LEI', // Legal Entity Identifier
    'BIC', // Bank Identifier Code (SWIFT)
    'DUNS', // Dun & Bradstreet
    'EIN', // US Employer ID
    'VAT', // VAT Registration
    'NATIONAL_ID', // National ID number
    'PASSPORT', // Passport number
    'SSN', // Social Security Number (hashed)
    'ACCOUNT_NUMBER', // Bank account number
    'INTERNAL', // Internal system ID
    'OTHER',
];
exports.partyIdentifierSchema = zod_1.z.object({
    type: zod_1.z.enum(exports.partyIdentifierTypes),
    value: zod_1.z.string().min(1),
    /** Issuing country/authority */
    issuer: zod_1.z.string().optional(),
    /** Whether this identifier is verified */
    verified: zod_1.z.boolean().default(false),
    /** Verification timestamp */
    verifiedAt: zod_1.z.string().datetime().optional(),
});
exports.partySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    /** Canonical name (normalized) */
    canonicalName: zod_1.z.string().min(1).max(500),
    /** Original name as received from source */
    originalName: zod_1.z.string().optional(),
    /** Name variations/aliases */
    aliases: zod_1.z.array(zod_1.z.string()).default([]),
    type: zod_1.z.enum(exports.partyTypes),
    /** External identifiers */
    identifiers: zod_1.z.array(exports.partyIdentifierSchema).default([]),
    /** Jurisdiction/country of registration */
    jurisdiction: zod_1.z.string().length(2).toUpperCase().optional(),
    /** Address information */
    address: zod_1.z.object({
        street: zod_1.z.string().optional(),
        city: zod_1.z.string().optional(),
        region: zod_1.z.string().optional(),
        postalCode: zod_1.z.string().optional(),
        country: zod_1.z.string().length(2).toUpperCase().optional(),
        formatted: zod_1.z.string().optional(),
    }).optional(),
    /** Risk classification */
    riskClassification: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'PROHIBITED']).optional(),
    /** PEP (Politically Exposed Person) flag */
    isPep: zod_1.z.boolean().default(false),
    /** Sanctions list match */
    sanctionsMatch: zod_1.z.boolean().default(false),
    /** Metadata from source systems */
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    /** Provenance chain for audit */
    provenance: zod_1.z.object({
        sourceSystem: zod_1.z.string(),
        sourceId: zod_1.z.string().optional(),
        importedAt: zod_1.z.string().datetime(),
        chain: zod_1.z.array(zod_1.z.string()).default([]),
    }),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// ============================================================================
// ACCOUNT SCHEMA
// ============================================================================
exports.accountTypes = [
    'CHECKING',
    'SAVINGS',
    'MONEY_MARKET',
    'CERTIFICATE_OF_DEPOSIT',
    'BROKERAGE',
    'RETIREMENT',
    'CREDIT_CARD',
    'LOAN',
    'MORTGAGE',
    'LINE_OF_CREDIT',
    'ESCROW',
    'CUSTODIAL',
    'CORRESPONDENT',
    'NOSTRO',
    'VOSTRO',
    'SUSPENSE',
    'CLEARING',
    'SETTLEMENT',
    'OTHER',
];
exports.accountStatuses = [
    'ACTIVE',
    'DORMANT',
    'FROZEN',
    'CLOSED',
    'PENDING_ACTIVATION',
    'SUSPENDED',
];
exports.accountSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    /** Account number (may be masked for security) */
    accountNumber: zod_1.z.string().min(1),
    /** Full account number hash for matching */
    accountNumberHash: zod_1.z.string().optional(),
    /** Human-readable account name/label */
    name: zod_1.z.string().max(255).optional(),
    type: zod_1.z.enum(exports.accountTypes),
    status: zod_1.z.enum(exports.accountStatuses),
    /** Owning party */
    ownerId: zod_1.z.string().uuid(),
    /** Institution holding the account */
    institutionId: zod_1.z.string().uuid().optional(),
    /** Account currency */
    currency: zod_1.z.string().length(3).toUpperCase(),
    /** Current balance (as of lastBalanceDate) */
    balance: exports.monetaryAmountSchema.optional(),
    /** Available balance (may differ from current) */
    availableBalance: exports.monetaryAmountSchema.optional(),
    /** Date of last balance update */
    lastBalanceDate: zod_1.z.string().datetime().optional(),
    /** Date of last reconciliation */
    lastReconciledAt: zod_1.z.string().datetime().optional(),
    /** IBAN (if applicable) */
    iban: zod_1.z.string().optional(),
    /** Routing number (US) / Sort code (UK) */
    routingNumber: zod_1.z.string().optional(),
    /** BIC/SWIFT code */
    bic: zod_1.z.string().optional(),
    /** Account opening date */
    openedAt: zod_1.z.string().datetime().optional(),
    /** Account closing date */
    closedAt: zod_1.z.string().datetime().optional(),
    /** Metadata from source systems */
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    /** Provenance chain for audit */
    provenance: zod_1.z.object({
        sourceSystem: zod_1.z.string(),
        sourceId: zod_1.z.string().optional(),
        importedAt: zod_1.z.string().datetime(),
        chain: zod_1.z.array(zod_1.z.string()).default([]),
    }),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// ============================================================================
// INSTRUMENT SCHEMA
// ============================================================================
exports.instrumentTypes = [
    'CURRENCY',
    'EQUITY',
    'BOND',
    'DERIVATIVE',
    'COMMODITY',
    'CRYPTOCURRENCY',
    'FUND',
    'ETF',
    'OPTION',
    'FUTURE',
    'SWAP',
    'STRUCTURED_PRODUCT',
    'REAL_ESTATE',
    'OTHER',
];
exports.instrumentSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    /** Standard identifier (e.g., ISIN, CUSIP, ticker) */
    identifier: zod_1.z.string().min(1),
    /** Identifier type */
    identifierType: zod_1.z.enum(['ISIN', 'CUSIP', 'SEDOL', 'TICKER', 'FIGI', 'INTERNAL', 'OTHER']),
    name: zod_1.z.string().max(500),
    type: zod_1.z.enum(exports.instrumentTypes),
    /** ISO currency code for currency instruments */
    currency: zod_1.z.string().length(3).toUpperCase().optional(),
    /** Issuer party ID */
    issuerId: zod_1.z.string().uuid().optional(),
    /** Exchange where traded */
    exchange: zod_1.z.string().optional(),
    /** Country of issuance */
    countryOfIssuance: zod_1.z.string().length(2).toUpperCase().optional(),
    /** Maturity date (for fixed income) */
    maturityDate: zod_1.z.string().datetime().optional(),
    /** Face value / par value */
    faceValue: exports.monetaryAmountSchema.optional(),
    /** Current market price */
    marketPrice: exports.monetaryAmountSchema.optional(),
    /** Price date */
    priceDate: zod_1.z.string().datetime().optional(),
    /** Additional metadata */
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// ============================================================================
// TRANSACTION SCHEMA
// ============================================================================
exports.transactionTypes = [
    // Payments
    'PAYMENT',
    'TRANSFER',
    'WIRE',
    'ACH',
    'CHECK',
    'CASH',
    // Card transactions
    'CARD_PURCHASE',
    'CARD_REFUND',
    'CARD_CHARGEBACK',
    // Fees
    'FEE',
    'INTEREST',
    'PENALTY',
    // Adjustments
    'REVERSAL',
    'CORRECTION',
    'ADJUSTMENT',
    // Investment
    'BUY',
    'SELL',
    'DIVIDEND',
    'INTEREST_INCOME',
    'CAPITAL_GAIN',
    // Loans
    'LOAN_DISBURSEMENT',
    'LOAN_REPAYMENT',
    'PRINCIPAL',
    'INTEREST_PAYMENT',
    // Other
    'DEPOSIT',
    'WITHDRAWAL',
    'STANDING_ORDER',
    'DIRECT_DEBIT',
    'FX_CONVERSION',
    'OTHER',
];
exports.transactionStatuses = [
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'REVERSED',
    'ON_HOLD',
    'DISPUTED',
];
exports.transactionDirections = [
    'CREDIT', // Money coming in
    'DEBIT', // Money going out
];
exports.transactionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    /** Reference number from source system */
    referenceNumber: zod_1.z.string().min(1),
    /** External transaction ID */
    externalId: zod_1.z.string().optional(),
    type: zod_1.z.enum(exports.transactionTypes),
    status: zod_1.z.enum(exports.transactionStatuses),
    direction: zod_1.z.enum(exports.transactionDirections),
    // Parties
    /** Source account ID */
    sourceAccountId: zod_1.z.string().uuid().optional(),
    /** Destination account ID */
    destinationAccountId: zod_1.z.string().uuid().optional(),
    /** Originating party ID */
    originatorId: zod_1.z.string().uuid().optional(),
    /** Beneficiary party ID */
    beneficiaryId: zod_1.z.string().uuid().optional(),
    /** Ordering party (may differ from originator) */
    orderingPartyId: zod_1.z.string().uuid().optional(),
    /** Intermediary bank/party */
    intermediaryId: zod_1.z.string().uuid().optional(),
    // Amounts
    /** Original transaction amount */
    amount: exports.monetaryAmountSchema,
    /** Amount in settlement currency (if different) */
    settlementAmount: exports.monetaryAmountSchema.optional(),
    /** Exchange rate used (if FX involved) */
    exchangeRate: exports.exchangeRateSchema.optional(),
    /** Fees associated with this transaction */
    fees: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['WIRE_FEE', 'FX_FEE', 'SERVICE_FEE', 'PROCESSING_FEE', 'OTHER']),
        amount: exports.monetaryAmountSchema,
        description: zod_1.z.string().optional(),
    })).default([]),
    /** Total fees amount */
    totalFees: exports.monetaryAmountSchema.optional(),
    // Dates
    /** Value date - when funds are available */
    valueDate: zod_1.z.string().datetime(),
    /** Posting date - when transaction is recorded */
    postingDate: zod_1.z.string().datetime(),
    /** Execution date - when transaction was initiated */
    executionDate: zod_1.z.string().datetime().optional(),
    /** Settlement date - when funds actually settle */
    settlementDate: zod_1.z.string().datetime().optional(),
    // Description
    /** Transaction description/narrative */
    description: zod_1.z.string().max(2000).optional(),
    /** Remittance information */
    remittanceInfo: zod_1.z.string().max(2000).optional(),
    /** Purpose code */
    purposeCode: zod_1.z.string().optional(),
    /** Category code */
    categoryCode: zod_1.z.string().optional(),
    // Reversal tracking
    /** If this is a reversal, the original transaction ID */
    reversesTransactionId: zod_1.z.string().uuid().optional(),
    /** If reversed, the reversing transaction ID */
    reversedByTransactionId: zod_1.z.string().uuid().optional(),
    // Running balance (if available from source)
    /** Balance after this transaction */
    runningBalance: exports.monetaryAmountSchema.optional(),
    // Instrument (for investment transactions)
    instrumentId: zod_1.z.string().uuid().optional(),
    /** Quantity (for securities) */
    quantity: zod_1.z.string().optional(),
    /** Price per unit */
    unitPrice: exports.monetaryAmountSchema.optional(),
    // Raw data preservation
    /** Original raw record for audit */
    rawRecord: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    // Metadata
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    // Provenance
    provenance: zod_1.z.object({
        sourceSystem: zod_1.z.string(),
        sourceId: zod_1.z.string().optional(),
        sourceFormat: zod_1.z.string().optional(),
        importedAt: zod_1.z.string().datetime(),
        parserVersion: zod_1.z.string().optional(),
        chain: zod_1.z.array(zod_1.z.string()).default([]),
    }),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// ============================================================================
// FLOW PATTERN SCHEMA
// ============================================================================
exports.flowPatternTypes = [
    'FAN_IN', // Multiple sources to single destination
    'FAN_OUT', // Single source to multiple destinations
    'ROUND_TRIP', // Funds return to origin
    'LAYERING', // Multiple sequential transfers
    'STRUCTURING', // Breaking up amounts below thresholds
    'RAPID_MOVEMENT', // Quick in/out of accounts
    'CIRCULAR', // Funds cycling through entities
    'MIRROR', // Matching patterns across accounts
    'PASS_THROUGH', // Immediate forwarding
    'SMURFING', // Multiple small deposits
    'VELOCITY_SPIKE', // Unusual transaction volume
    'DORMANT_ACTIVATION', // Sudden activity on dormant account
    'CONCENTRATION', // Aggregation of funds
    'DISPERSION', // Distribution of funds
    'CUSTOM', // User-defined pattern
];
exports.flowPatternSeverities = [
    'INFO',
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL',
];
exports.flowPatternSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: zod_1.z.enum(exports.flowPatternTypes),
    /** Human-readable pattern name */
    name: zod_1.z.string().max(255),
    /** Pattern description */
    description: zod_1.z.string().max(2000).optional(),
    severity: zod_1.z.enum(exports.flowPatternSeverities),
    /** Confidence score (0-1) */
    confidence: zod_1.z.number().min(0).max(1),
    // Pattern scope
    /** Start of pattern observation period */
    periodStart: zod_1.z.string().datetime(),
    /** End of pattern observation period */
    periodEnd: zod_1.z.string().datetime(),
    // Involved entities
    /** Primary party IDs involved */
    primaryPartyIds: zod_1.z.array(zod_1.z.string().uuid()),
    /** All party IDs touched by pattern */
    involvedPartyIds: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    /** Account IDs involved */
    involvedAccountIds: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    /** Transaction IDs forming this pattern */
    transactionIds: zod_1.z.array(zod_1.z.string().uuid()),
    // Pattern metrics
    /** Total value of transactions in pattern */
    totalValue: exports.monetaryAmountSchema,
    /** Number of transactions */
    transactionCount: zod_1.z.number().int().positive(),
    /** Average transaction size */
    averageTransactionValue: exports.monetaryAmountSchema.optional(),
    /** Distinct counterparties */
    distinctCounterparties: zod_1.z.number().int().nonnegative().optional(),
    /** Time span in hours */
    timeSpanHours: zod_1.z.number().nonnegative().optional(),
    // Detection details
    /** Detection rule/algorithm that identified this */
    detectionRule: zod_1.z.string(),
    /** Rule parameters used */
    ruleParameters: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    /** Threshold values that triggered detection */
    thresholds: zod_1.z.record(zod_1.z.string(), zod_1.z.number()).default({}),
    // Graph representation
    /** Flow graph in adjacency list format */
    flowGraph: zod_1.z.object({
        nodes: zod_1.z.array(zod_1.z.object({
            id: zod_1.z.string(),
            type: zod_1.z.enum(['PARTY', 'ACCOUNT']),
            label: zod_1.z.string().optional(),
        })),
        edges: zod_1.z.array(zod_1.z.object({
            source: zod_1.z.string(),
            target: zod_1.z.string(),
            transactionId: zod_1.z.string().uuid(),
            amount: exports.monetaryAmountSchema,
            timestamp: zod_1.z.string().datetime(),
        })),
    }).optional(),
    // Review status
    reviewStatus: zod_1.z.enum(['PENDING', 'UNDER_REVIEW', 'CLEARED', 'ESCALATED', 'REPORTED']).default('PENDING'),
    reviewedBy: zod_1.z.string().optional(),
    reviewedAt: zod_1.z.string().datetime().optional(),
    reviewNotes: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// ============================================================================
// AGGREGATED FLOW SCHEMA
// ============================================================================
exports.aggregatedFlowSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    /** Source party/account */
    sourceId: zod_1.z.string().uuid(),
    sourceType: zod_1.z.enum(['PARTY', 'ACCOUNT']),
    sourceName: zod_1.z.string().optional(),
    /** Destination party/account */
    destinationId: zod_1.z.string().uuid(),
    destinationType: zod_1.z.enum(['PARTY', 'ACCOUNT']),
    destinationName: zod_1.z.string().optional(),
    // Aggregation period
    periodStart: zod_1.z.string().datetime(),
    periodEnd: zod_1.z.string().datetime(),
    /** Aggregation granularity */
    granularity: zod_1.z.enum(['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
    // Aggregated metrics
    /** Total gross flow (sum of all transactions) */
    grossFlow: exports.monetaryAmountSchema,
    /** Net flow (credits - debits) */
    netFlow: exports.monetaryAmountSchema,
    /** Number of transactions */
    transactionCount: zod_1.z.number().int().nonnegative(),
    /** Credit transaction count */
    creditCount: zod_1.z.number().int().nonnegative(),
    /** Debit transaction count */
    debitCount: zod_1.z.number().int().nonnegative(),
    /** Average transaction size */
    averageTransactionSize: exports.monetaryAmountSchema.optional(),
    /** Maximum single transaction */
    maxTransaction: exports.monetaryAmountSchema.optional(),
    /** Minimum single transaction */
    minTransaction: exports.monetaryAmountSchema.optional(),
    /** Standard deviation of transaction amounts */
    stdDeviation: zod_1.z.string().optional(), // Stored as string for precision
    // Breakdown by type
    byTransactionType: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(exports.transactionTypes),
        count: zod_1.z.number().int().nonnegative(),
        totalAmount: exports.monetaryAmountSchema,
    })).default([]),
    // Constituent transaction IDs (optional, for drill-down)
    transactionIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
});
// ============================================================================
// IMPORT/BATCH SCHEMAS
// ============================================================================
exports.importFormats = [
    'CSV',
    'SWIFT_MT940',
    'SWIFT_MT942',
    'SWIFT_MT103',
    'CAMT_053',
    'CAMT_052',
    'BAI2',
    'OFX',
    'QIF',
    'JSON',
    'CUSTOM',
];
exports.importStatusEnum = zod_1.z.enum([
    'PENDING',
    'VALIDATING',
    'PARSING',
    'NORMALIZING',
    'ENRICHING',
    'COMPLETED',
    'COMPLETED_WITH_WARNINGS',
    'FAILED',
    'CANCELLED',
]);
exports.importJobSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    /** Dataset reference/name */
    datasetRef: zod_1.z.string().min(1),
    /** Source file path or URI */
    sourceUri: zod_1.z.string(),
    /** Import format */
    format: zod_1.z.enum(exports.importFormats),
    /** Parser configuration */
    parserConfig: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    status: exports.importStatusEnum,
    // Progress tracking
    /** Total records in source */
    totalRecords: zod_1.z.number().int().nonnegative().optional(),
    /** Records processed */
    processedRecords: zod_1.z.number().int().nonnegative().default(0),
    /** Records successfully normalized */
    successCount: zod_1.z.number().int().nonnegative().default(0),
    /** Records with errors */
    errorCount: zod_1.z.number().int().nonnegative().default(0),
    /** Records with warnings */
    warningCount: zod_1.z.number().int().nonnegative().default(0),
    /** Records skipped (duplicates, etc.) */
    skippedCount: zod_1.z.number().int().nonnegative().default(0),
    // Error details
    errors: zod_1.z.array(zod_1.z.object({
        recordIndex: zod_1.z.number().int().optional(),
        field: zod_1.z.string().optional(),
        code: zod_1.z.string(),
        message: zod_1.z.string(),
        severity: zod_1.z.enum(['ERROR', 'WARNING']),
        rawValue: zod_1.z.unknown().optional(),
    })).default([]),
    // Output references
    /** IDs of created transactions */
    createdTransactionIds: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    /** IDs of created parties */
    createdPartyIds: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    /** IDs of created accounts */
    createdAccountIds: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    // Timing
    startedAt: zod_1.z.string().datetime().optional(),
    completedAt: zod_1.z.string().datetime().optional(),
    /** Processing duration in milliseconds */
    durationMs: zod_1.z.number().int().nonnegative().optional(),
    // Audit
    initiatedBy: zod_1.z.string(),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// ============================================================================
// STREAMING SCHEMAS
// ============================================================================
exports.streamEventTypes = [
    'TRANSACTION_RECEIVED',
    'TRANSACTION_NORMALIZED',
    'TRANSACTION_ENRICHED',
    'PATTERN_DETECTED',
    'ALERT_GENERATED',
    'ERROR',
];
exports.streamEventSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: zod_1.z.enum(exports.streamEventTypes),
    timestamp: zod_1.z.string().datetime(),
    /** Correlation ID for tracing */
    correlationId: zod_1.z.string().uuid(),
    payload: zod_1.z.union([
        exports.transactionSchema,
        exports.flowPatternSchema,
        zod_1.z.object({
            code: zod_1.z.string(),
            message: zod_1.z.string(),
            details: zod_1.z.unknown().optional(),
        }),
    ]),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// QUERY SCHEMAS
// ============================================================================
exports.flowQuerySchema = zod_1.z.object({
    /** Party or account IDs to query flows for */
    entityIds: zod_1.z.array(zod_1.z.string().uuid()).min(1),
    /** Entity type */
    entityType: zod_1.z.enum(['PARTY', 'ACCOUNT']),
    /** Optional counterparty filter */
    counterpartyIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    /** Start of query period */
    periodStart: zod_1.z.string().datetime(),
    /** End of query period */
    periodEnd: zod_1.z.string().datetime(),
    /** Minimum transaction amount filter */
    minAmount: exports.monetaryAmountSchema.optional(),
    /** Maximum transaction amount filter */
    maxAmount: exports.monetaryAmountSchema.optional(),
    /** Transaction types to include */
    transactionTypes: zod_1.z.array(zod_1.z.enum(exports.transactionTypes)).optional(),
    /** Direction filter */
    direction: zod_1.z.enum(exports.transactionDirections).optional(),
    /** Aggregation granularity (if aggregated view requested) */
    aggregation: zod_1.z.enum(['NONE', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY']).default('NONE'),
    /** Maximum results */
    limit: zod_1.z.number().int().positive().max(10000).default(100),
    /** Offset for pagination */
    offset: zod_1.z.number().int().nonnegative().default(0),
    /** Sort order */
    sortBy: zod_1.z.enum(['DATE', 'AMOUNT', 'COUNTERPARTY']).default('DATE'),
    sortOrder: zod_1.z.enum(['ASC', 'DESC']).default('DESC'),
});
exports.flowQueryResultSchema = zod_1.z.object({
    query: exports.flowQuerySchema,
    /** Total matching records (before pagination) */
    totalCount: zod_1.z.number().int().nonnegative(),
    /** Whether more results exist */
    hasMore: zod_1.z.boolean(),
    /** Transactions or aggregated flows */
    results: zod_1.z.union([
        zod_1.z.array(exports.transactionSchema),
        zod_1.z.array(exports.aggregatedFlowSchema),
    ]),
    /** Summary statistics */
    summary: zod_1.z.object({
        totalGrossFlow: exports.monetaryAmountSchema,
        totalNetFlow: exports.monetaryAmountSchema,
        transactionCount: zod_1.z.number().int().nonnegative(),
        distinctCounterparties: zod_1.z.number().int().nonnegative(),
        averageTransactionSize: exports.monetaryAmountSchema.optional(),
    }).optional(),
    /** Query execution time in ms */
    executionTimeMs: zod_1.z.number().int().nonnegative(),
});
// ============================================================================
// API INPUT/OUTPUT SCHEMAS
// ============================================================================
exports.importLedgerInputSchema = zod_1.z.object({
    datasetRef: zod_1.z.string().min(1).max(255),
    format: zod_1.z.enum(exports.importFormats),
    /** Base64-encoded file content or URI */
    source: zod_1.z.union([
        zod_1.z.object({
            type: zod_1.z.literal('inline'),
            content: zod_1.z.string(), // Base64
            filename: zod_1.z.string().optional(),
        }),
        zod_1.z.object({
            type: zod_1.z.literal('uri'),
            uri: zod_1.z.string().url(),
        }),
    ]),
    /** Parser configuration overrides */
    parserConfig: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    /** Whether to run in dry-run mode (validate only) */
    dryRun: zod_1.z.boolean().default(false),
    /** Whether to skip duplicate detection */
    skipDuplicateCheck: zod_1.z.boolean().default(false),
});
exports.normalizeTransactionInputSchema = zod_1.z.object({
    /** Raw transaction data */
    rawData: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    /** Source format */
    format: zod_1.z.enum(exports.importFormats),
    /** Parser configuration */
    parserConfig: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
/**
 * Create a monetary amount from a decimal number
 * WARNING: Use this only for initial conversion from external sources.
 * All internal calculations should use minorUnits directly.
 */
function createMonetaryAmount(amount, currency, decimalPlaces = 2) {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const multiplier = Math.pow(10, decimalPlaces);
    // Use Math.round to handle floating-point precision issues
    const minorUnits = BigInt(Math.round(numAmount * multiplier));
    return {
        minorUnits,
        currency: currency.toUpperCase(),
        decimalPlaces,
    };
}
/**
 * Convert monetary amount to decimal string
 */
function formatMonetaryAmount(amount) {
    const divisor = BigInt(Math.pow(10, amount.decimalPlaces));
    const wholePart = amount.minorUnits / divisor;
    const fractionalPart = amount.minorUnits % divisor;
    const paddedFractional = fractionalPart.toString().padStart(amount.decimalPlaces, '0');
    return `${wholePart}.${paddedFractional}`;
}
/**
 * Add two monetary amounts (must be same currency)
 */
function addMonetaryAmounts(a, b) {
    if (a.currency !== b.currency) {
        throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
    }
    if (a.decimalPlaces !== b.decimalPlaces) {
        throw new Error(`Decimal places mismatch: ${a.decimalPlaces} vs ${b.decimalPlaces}`);
    }
    return {
        minorUnits: a.minorUnits + b.minorUnits,
        currency: a.currency,
        decimalPlaces: a.decimalPlaces,
    };
}
/**
 * Subtract monetary amounts (must be same currency)
 */
function subtractMonetaryAmounts(a, b) {
    if (a.currency !== b.currency) {
        throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
    }
    if (a.decimalPlaces !== b.decimalPlaces) {
        throw new Error(`Decimal places mismatch: ${a.decimalPlaces} vs ${b.decimalPlaces}`);
    }
    return {
        minorUnits: a.minorUnits - b.minorUnits,
        currency: a.currency,
        decimalPlaces: a.decimalPlaces,
    };
}
/**
 * Compare monetary amounts
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareMonetaryAmounts(a, b) {
    if (a.currency !== b.currency) {
        throw new Error(`Cannot compare different currencies: ${a.currency} vs ${b.currency}`);
    }
    if (a.minorUnits < b.minorUnits)
        return -1;
    if (a.minorUnits > b.minorUnits)
        return 1;
    return 0;
}
/**
 * Check if monetary amount is zero
 */
function isZero(amount) {
    return amount.minorUnits === BigInt(0);
}
/**
 * Check if monetary amount is negative
 */
function isNegative(amount) {
    return amount.minorUnits < BigInt(0);
}
/**
 * Get absolute value of monetary amount
 */
function absMonetaryAmount(amount) {
    return {
        ...amount,
        minorUnits: amount.minorUnits < BigInt(0) ? -amount.minorUnits : amount.minorUnits,
    };
}
