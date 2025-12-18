/**
 * Finance Normalizer Types
 * Canonical financial schemas for transaction normalization and flow analysis
 *
 * @packageDocumentation
 */

import { z } from 'zod';

// ============================================================================
// MONETARY PRIMITIVES (Decimal-Safe)
// ============================================================================

/**
 * Monetary amount stored as integer minor units (cents, pence, etc.)
 * to avoid floating-point errors. All monetary calculations must use
 * this representation.
 */
export const monetaryAmountSchema = z.object({
  /** Amount in minor units (e.g., cents for USD, pence for GBP) */
  minorUnits: z.bigint(),
  /** ISO 4217 currency code */
  currency: z.string().length(3).toUpperCase(),
  /** Number of decimal places for this currency (e.g., 2 for USD, 0 for JPY) */
  decimalPlaces: z.number().int().min(0).max(4).default(2),
});

export type MonetaryAmount = z.infer<typeof monetaryAmountSchema>;

/**
 * Exchange rate between two currencies at a point in time
 */
export const exchangeRateSchema = z.object({
  fromCurrency: z.string().length(3).toUpperCase(),
  toCurrency: z.string().length(3).toUpperCase(),
  /** Rate as a string to preserve precision (e.g., "1.23456789") */
  rate: z.string().regex(/^\d+(\.\d+)?$/),
  /** Inverse rate for reverse conversion */
  inverseRate: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  /** Rate effective timestamp */
  effectiveAt: z.string().datetime(),
  /** Rate source (e.g., "ECB", "REUTERS", "INTERNAL") */
  source: z.string(),
  /** Rate type */
  rateType: z.enum(['SPOT', 'FORWARD', 'HISTORICAL', 'INDICATIVE']).default('SPOT'),
});

export type ExchangeRate = z.infer<typeof exchangeRateSchema>;

// ============================================================================
// PARTY (Counterparty) SCHEMA
// ============================================================================

export const partyTypes = [
  'INDIVIDUAL',
  'CORPORATION',
  'FINANCIAL_INSTITUTION',
  'GOVERNMENT',
  'NONPROFIT',
  'TRUST',
  'PARTNERSHIP',
  'UNKNOWN',
] as const;

export const partyIdentifierTypes = [
  'LEI',          // Legal Entity Identifier
  'BIC',          // Bank Identifier Code (SWIFT)
  'DUNS',         // Dun & Bradstreet
  'EIN',          // US Employer ID
  'VAT',          // VAT Registration
  'NATIONAL_ID',  // National ID number
  'PASSPORT',     // Passport number
  'SSN',          // Social Security Number (hashed)
  'ACCOUNT_NUMBER', // Bank account number
  'INTERNAL',     // Internal system ID
  'OTHER',
] as const;

export const partyIdentifierSchema = z.object({
  type: z.enum(partyIdentifierTypes),
  value: z.string().min(1),
  /** Issuing country/authority */
  issuer: z.string().optional(),
  /** Whether this identifier is verified */
  verified: z.boolean().default(false),
  /** Verification timestamp */
  verifiedAt: z.string().datetime().optional(),
});

export type PartyIdentifier = z.infer<typeof partyIdentifierSchema>;

export const partySchema = z.object({
  id: z.string().uuid(),
  /** Canonical name (normalized) */
  canonicalName: z.string().min(1).max(500),
  /** Original name as received from source */
  originalName: z.string().optional(),
  /** Name variations/aliases */
  aliases: z.array(z.string()).default([]),
  type: z.enum(partyTypes),
  /** External identifiers */
  identifiers: z.array(partyIdentifierSchema).default([]),
  /** Jurisdiction/country of registration */
  jurisdiction: z.string().length(2).toUpperCase().optional(),
  /** Address information */
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().length(2).toUpperCase().optional(),
    formatted: z.string().optional(),
  }).optional(),
  /** Risk classification */
  riskClassification: z.enum(['LOW', 'MEDIUM', 'HIGH', 'PROHIBITED']).optional(),
  /** PEP (Politically Exposed Person) flag */
  isPep: z.boolean().default(false),
  /** Sanctions list match */
  sanctionsMatch: z.boolean().default(false),
  /** Metadata from source systems */
  metadata: z.record(z.string(), z.unknown()).default({}),
  /** Provenance chain for audit */
  provenance: z.object({
    sourceSystem: z.string(),
    sourceId: z.string().optional(),
    importedAt: z.string().datetime(),
    chain: z.array(z.string()).default([]),
  }),
  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Party = z.infer<typeof partySchema>;

// ============================================================================
// ACCOUNT SCHEMA
// ============================================================================

export const accountTypes = [
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
] as const;

export const accountStatuses = [
  'ACTIVE',
  'DORMANT',
  'FROZEN',
  'CLOSED',
  'PENDING_ACTIVATION',
  'SUSPENDED',
] as const;

export const accountSchema = z.object({
  id: z.string().uuid(),
  /** Account number (may be masked for security) */
  accountNumber: z.string().min(1),
  /** Full account number hash for matching */
  accountNumberHash: z.string().optional(),
  /** Human-readable account name/label */
  name: z.string().max(255).optional(),
  type: z.enum(accountTypes),
  status: z.enum(accountStatuses),
  /** Owning party */
  ownerId: z.string().uuid(),
  /** Institution holding the account */
  institutionId: z.string().uuid().optional(),
  /** Account currency */
  currency: z.string().length(3).toUpperCase(),
  /** Current balance (as of lastBalanceDate) */
  balance: monetaryAmountSchema.optional(),
  /** Available balance (may differ from current) */
  availableBalance: monetaryAmountSchema.optional(),
  /** Date of last balance update */
  lastBalanceDate: z.string().datetime().optional(),
  /** Date of last reconciliation */
  lastReconciledAt: z.string().datetime().optional(),
  /** IBAN (if applicable) */
  iban: z.string().optional(),
  /** Routing number (US) / Sort code (UK) */
  routingNumber: z.string().optional(),
  /** BIC/SWIFT code */
  bic: z.string().optional(),
  /** Account opening date */
  openedAt: z.string().datetime().optional(),
  /** Account closing date */
  closedAt: z.string().datetime().optional(),
  /** Metadata from source systems */
  metadata: z.record(z.string(), z.unknown()).default({}),
  /** Provenance chain for audit */
  provenance: z.object({
    sourceSystem: z.string(),
    sourceId: z.string().optional(),
    importedAt: z.string().datetime(),
    chain: z.array(z.string()).default([]),
  }),
  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Account = z.infer<typeof accountSchema>;

// ============================================================================
// INSTRUMENT SCHEMA
// ============================================================================

export const instrumentTypes = [
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
] as const;

export const instrumentSchema = z.object({
  id: z.string().uuid(),
  /** Standard identifier (e.g., ISIN, CUSIP, ticker) */
  identifier: z.string().min(1),
  /** Identifier type */
  identifierType: z.enum(['ISIN', 'CUSIP', 'SEDOL', 'TICKER', 'FIGI', 'INTERNAL', 'OTHER']),
  name: z.string().max(500),
  type: z.enum(instrumentTypes),
  /** ISO currency code for currency instruments */
  currency: z.string().length(3).toUpperCase().optional(),
  /** Issuer party ID */
  issuerId: z.string().uuid().optional(),
  /** Exchange where traded */
  exchange: z.string().optional(),
  /** Country of issuance */
  countryOfIssuance: z.string().length(2).toUpperCase().optional(),
  /** Maturity date (for fixed income) */
  maturityDate: z.string().datetime().optional(),
  /** Face value / par value */
  faceValue: monetaryAmountSchema.optional(),
  /** Current market price */
  marketPrice: monetaryAmountSchema.optional(),
  /** Price date */
  priceDate: z.string().datetime().optional(),
  /** Additional metadata */
  metadata: z.record(z.string(), z.unknown()).default({}),
  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Instrument = z.infer<typeof instrumentSchema>;

// ============================================================================
// TRANSACTION SCHEMA
// ============================================================================

export const transactionTypes = [
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
] as const;

export const transactionStatuses = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'REVERSED',
  'ON_HOLD',
  'DISPUTED',
] as const;

export const transactionDirections = [
  'CREDIT',   // Money coming in
  'DEBIT',    // Money going out
] as const;

export const transactionSchema = z.object({
  id: z.string().uuid(),
  /** Reference number from source system */
  referenceNumber: z.string().min(1),
  /** External transaction ID */
  externalId: z.string().optional(),
  type: z.enum(transactionTypes),
  status: z.enum(transactionStatuses),
  direction: z.enum(transactionDirections),

  // Parties
  /** Source account ID */
  sourceAccountId: z.string().uuid().optional(),
  /** Destination account ID */
  destinationAccountId: z.string().uuid().optional(),
  /** Originating party ID */
  originatorId: z.string().uuid().optional(),
  /** Beneficiary party ID */
  beneficiaryId: z.string().uuid().optional(),
  /** Ordering party (may differ from originator) */
  orderingPartyId: z.string().uuid().optional(),
  /** Intermediary bank/party */
  intermediaryId: z.string().uuid().optional(),

  // Amounts
  /** Original transaction amount */
  amount: monetaryAmountSchema,
  /** Amount in settlement currency (if different) */
  settlementAmount: monetaryAmountSchema.optional(),
  /** Exchange rate used (if FX involved) */
  exchangeRate: exchangeRateSchema.optional(),
  /** Fees associated with this transaction */
  fees: z.array(z.object({
    type: z.enum(['WIRE_FEE', 'FX_FEE', 'SERVICE_FEE', 'PROCESSING_FEE', 'OTHER']),
    amount: monetaryAmountSchema,
    description: z.string().optional(),
  })).default([]),
  /** Total fees amount */
  totalFees: monetaryAmountSchema.optional(),

  // Dates
  /** Value date - when funds are available */
  valueDate: z.string().datetime(),
  /** Posting date - when transaction is recorded */
  postingDate: z.string().datetime(),
  /** Execution date - when transaction was initiated */
  executionDate: z.string().datetime().optional(),
  /** Settlement date - when funds actually settle */
  settlementDate: z.string().datetime().optional(),

  // Description
  /** Transaction description/narrative */
  description: z.string().max(2000).optional(),
  /** Remittance information */
  remittanceInfo: z.string().max(2000).optional(),
  /** Purpose code */
  purposeCode: z.string().optional(),
  /** Category code */
  categoryCode: z.string().optional(),

  // Reversal tracking
  /** If this is a reversal, the original transaction ID */
  reversesTransactionId: z.string().uuid().optional(),
  /** If reversed, the reversing transaction ID */
  reversedByTransactionId: z.string().uuid().optional(),

  // Running balance (if available from source)
  /** Balance after this transaction */
  runningBalance: monetaryAmountSchema.optional(),

  // Instrument (for investment transactions)
  instrumentId: z.string().uuid().optional(),
  /** Quantity (for securities) */
  quantity: z.string().optional(),
  /** Price per unit */
  unitPrice: monetaryAmountSchema.optional(),

  // Raw data preservation
  /** Original raw record for audit */
  rawRecord: z.record(z.string(), z.unknown()).optional(),

  // Metadata
  metadata: z.record(z.string(), z.unknown()).default({}),

  // Provenance
  provenance: z.object({
    sourceSystem: z.string(),
    sourceId: z.string().optional(),
    sourceFormat: z.string().optional(),
    importedAt: z.string().datetime(),
    parserVersion: z.string().optional(),
    chain: z.array(z.string()).default([]),
  }),

  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Transaction = z.infer<typeof transactionSchema>;

// ============================================================================
// FLOW PATTERN SCHEMA
// ============================================================================

export const flowPatternTypes = [
  'FAN_IN',           // Multiple sources to single destination
  'FAN_OUT',          // Single source to multiple destinations
  'ROUND_TRIP',       // Funds return to origin
  'LAYERING',         // Multiple sequential transfers
  'STRUCTURING',      // Breaking up amounts below thresholds
  'RAPID_MOVEMENT',   // Quick in/out of accounts
  'CIRCULAR',         // Funds cycling through entities
  'MIRROR',           // Matching patterns across accounts
  'PASS_THROUGH',     // Immediate forwarding
  'SMURFING',         // Multiple small deposits
  'VELOCITY_SPIKE',   // Unusual transaction volume
  'DORMANT_ACTIVATION', // Sudden activity on dormant account
  'CONCENTRATION',    // Aggregation of funds
  'DISPERSION',       // Distribution of funds
  'CUSTOM',           // User-defined pattern
] as const;

export const flowPatternSeverities = [
  'INFO',
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
] as const;

export const flowPatternSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(flowPatternTypes),
  /** Human-readable pattern name */
  name: z.string().max(255),
  /** Pattern description */
  description: z.string().max(2000).optional(),
  severity: z.enum(flowPatternSeverities),
  /** Confidence score (0-1) */
  confidence: z.number().min(0).max(1),

  // Pattern scope
  /** Start of pattern observation period */
  periodStart: z.string().datetime(),
  /** End of pattern observation period */
  periodEnd: z.string().datetime(),

  // Involved entities
  /** Primary party IDs involved */
  primaryPartyIds: z.array(z.string().uuid()),
  /** All party IDs touched by pattern */
  involvedPartyIds: z.array(z.string().uuid()).default([]),
  /** Account IDs involved */
  involvedAccountIds: z.array(z.string().uuid()).default([]),
  /** Transaction IDs forming this pattern */
  transactionIds: z.array(z.string().uuid()),

  // Pattern metrics
  /** Total value of transactions in pattern */
  totalValue: monetaryAmountSchema,
  /** Number of transactions */
  transactionCount: z.number().int().positive(),
  /** Average transaction size */
  averageTransactionValue: monetaryAmountSchema.optional(),
  /** Distinct counterparties */
  distinctCounterparties: z.number().int().nonnegative().optional(),
  /** Time span in hours */
  timeSpanHours: z.number().nonnegative().optional(),

  // Detection details
  /** Detection rule/algorithm that identified this */
  detectionRule: z.string(),
  /** Rule parameters used */
  ruleParameters: z.record(z.string(), z.unknown()).default({}),
  /** Threshold values that triggered detection */
  thresholds: z.record(z.string(), z.number()).default({}),

  // Graph representation
  /** Flow graph in adjacency list format */
  flowGraph: z.object({
    nodes: z.array(z.object({
      id: z.string(),
      type: z.enum(['PARTY', 'ACCOUNT']),
      label: z.string().optional(),
    })),
    edges: z.array(z.object({
      source: z.string(),
      target: z.string(),
      transactionId: z.string().uuid(),
      amount: monetaryAmountSchema,
      timestamp: z.string().datetime(),
    })),
  }).optional(),

  // Review status
  reviewStatus: z.enum(['PENDING', 'UNDER_REVIEW', 'CLEARED', 'ESCALATED', 'REPORTED']).default('PENDING'),
  reviewedBy: z.string().optional(),
  reviewedAt: z.string().datetime().optional(),
  reviewNotes: z.string().optional(),

  metadata: z.record(z.string(), z.unknown()).default({}),
  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type FlowPattern = z.infer<typeof flowPatternSchema>;

// ============================================================================
// AGGREGATED FLOW SCHEMA
// ============================================================================

export const aggregatedFlowSchema = z.object({
  id: z.string().uuid(),
  /** Source party/account */
  sourceId: z.string().uuid(),
  sourceType: z.enum(['PARTY', 'ACCOUNT']),
  sourceName: z.string().optional(),
  /** Destination party/account */
  destinationId: z.string().uuid(),
  destinationType: z.enum(['PARTY', 'ACCOUNT']),
  destinationName: z.string().optional(),

  // Aggregation period
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  /** Aggregation granularity */
  granularity: z.enum(['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),

  // Aggregated metrics
  /** Total gross flow (sum of all transactions) */
  grossFlow: monetaryAmountSchema,
  /** Net flow (credits - debits) */
  netFlow: monetaryAmountSchema,
  /** Number of transactions */
  transactionCount: z.number().int().nonnegative(),
  /** Credit transaction count */
  creditCount: z.number().int().nonnegative(),
  /** Debit transaction count */
  debitCount: z.number().int().nonnegative(),
  /** Average transaction size */
  averageTransactionSize: monetaryAmountSchema.optional(),
  /** Maximum single transaction */
  maxTransaction: monetaryAmountSchema.optional(),
  /** Minimum single transaction */
  minTransaction: monetaryAmountSchema.optional(),
  /** Standard deviation of transaction amounts */
  stdDeviation: z.string().optional(), // Stored as string for precision

  // Breakdown by type
  byTransactionType: z.array(z.object({
    type: z.enum(transactionTypes),
    count: z.number().int().nonnegative(),
    totalAmount: monetaryAmountSchema,
  })).default([]),

  // Constituent transaction IDs (optional, for drill-down)
  transactionIds: z.array(z.string().uuid()).optional(),

  metadata: z.record(z.string(), z.unknown()).default({}),
  tenantId: z.string(),
  createdAt: z.string().datetime(),
});

export type AggregatedFlow = z.infer<typeof aggregatedFlowSchema>;

// ============================================================================
// IMPORT/BATCH SCHEMAS
// ============================================================================

export const importFormats = [
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
] as const;

export const importStatusEnum = z.enum([
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

export const importJobSchema = z.object({
  id: z.string().uuid(),
  /** Dataset reference/name */
  datasetRef: z.string().min(1),
  /** Source file path or URI */
  sourceUri: z.string(),
  /** Import format */
  format: z.enum(importFormats),
  /** Parser configuration */
  parserConfig: z.record(z.string(), z.unknown()).default({}),
  status: importStatusEnum,

  // Progress tracking
  /** Total records in source */
  totalRecords: z.number().int().nonnegative().optional(),
  /** Records processed */
  processedRecords: z.number().int().nonnegative().default(0),
  /** Records successfully normalized */
  successCount: z.number().int().nonnegative().default(0),
  /** Records with errors */
  errorCount: z.number().int().nonnegative().default(0),
  /** Records with warnings */
  warningCount: z.number().int().nonnegative().default(0),
  /** Records skipped (duplicates, etc.) */
  skippedCount: z.number().int().nonnegative().default(0),

  // Error details
  errors: z.array(z.object({
    recordIndex: z.number().int().optional(),
    field: z.string().optional(),
    code: z.string(),
    message: z.string(),
    severity: z.enum(['ERROR', 'WARNING']),
    rawValue: z.unknown().optional(),
  })).default([]),

  // Output references
  /** IDs of created transactions */
  createdTransactionIds: z.array(z.string().uuid()).default([]),
  /** IDs of created parties */
  createdPartyIds: z.array(z.string().uuid()).default([]),
  /** IDs of created accounts */
  createdAccountIds: z.array(z.string().uuid()).default([]),

  // Timing
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  /** Processing duration in milliseconds */
  durationMs: z.number().int().nonnegative().optional(),

  // Audit
  initiatedBy: z.string(),
  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ImportJob = z.infer<typeof importJobSchema>;
export type ImportFormat = (typeof importFormats)[number];
export type ImportStatus = z.infer<typeof importStatusEnum>;

// ============================================================================
// STREAMING SCHEMAS
// ============================================================================

export const streamEventTypes = [
  'TRANSACTION_RECEIVED',
  'TRANSACTION_NORMALIZED',
  'TRANSACTION_ENRICHED',
  'PATTERN_DETECTED',
  'ALERT_GENERATED',
  'ERROR',
] as const;

export const streamEventSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(streamEventTypes),
  timestamp: z.string().datetime(),
  /** Correlation ID for tracing */
  correlationId: z.string().uuid(),
  payload: z.union([
    transactionSchema,
    flowPatternSchema,
    z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    }),
  ]),
  metadata: z.record(z.string(), z.unknown()).default({}),
  tenantId: z.string(),
});

export type StreamEvent = z.infer<typeof streamEventSchema>;
export type StreamEventType = (typeof streamEventTypes)[number];

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const flowQuerySchema = z.object({
  /** Party or account IDs to query flows for */
  entityIds: z.array(z.string().uuid()).min(1),
  /** Entity type */
  entityType: z.enum(['PARTY', 'ACCOUNT']),
  /** Optional counterparty filter */
  counterpartyIds: z.array(z.string().uuid()).optional(),
  /** Start of query period */
  periodStart: z.string().datetime(),
  /** End of query period */
  periodEnd: z.string().datetime(),
  /** Minimum transaction amount filter */
  minAmount: monetaryAmountSchema.optional(),
  /** Maximum transaction amount filter */
  maxAmount: monetaryAmountSchema.optional(),
  /** Transaction types to include */
  transactionTypes: z.array(z.enum(transactionTypes)).optional(),
  /** Direction filter */
  direction: z.enum(transactionDirections).optional(),
  /** Aggregation granularity (if aggregated view requested) */
  aggregation: z.enum(['NONE', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY']).default('NONE'),
  /** Maximum results */
  limit: z.number().int().positive().max(10000).default(100),
  /** Offset for pagination */
  offset: z.number().int().nonnegative().default(0),
  /** Sort order */
  sortBy: z.enum(['DATE', 'AMOUNT', 'COUNTERPARTY']).default('DATE'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
});

export type FlowQuery = z.infer<typeof flowQuerySchema>;

export const flowQueryResultSchema = z.object({
  query: flowQuerySchema,
  /** Total matching records (before pagination) */
  totalCount: z.number().int().nonnegative(),
  /** Whether more results exist */
  hasMore: z.boolean(),
  /** Transactions or aggregated flows */
  results: z.union([
    z.array(transactionSchema),
    z.array(aggregatedFlowSchema),
  ]),
  /** Summary statistics */
  summary: z.object({
    totalGrossFlow: monetaryAmountSchema,
    totalNetFlow: monetaryAmountSchema,
    transactionCount: z.number().int().nonnegative(),
    distinctCounterparties: z.number().int().nonnegative(),
    averageTransactionSize: monetaryAmountSchema.optional(),
  }).optional(),
  /** Query execution time in ms */
  executionTimeMs: z.number().int().nonnegative(),
});

export type FlowQueryResult = z.infer<typeof flowQueryResultSchema>;

// ============================================================================
// API INPUT/OUTPUT SCHEMAS
// ============================================================================

export const importLedgerInputSchema = z.object({
  datasetRef: z.string().min(1).max(255),
  format: z.enum(importFormats),
  /** Base64-encoded file content or URI */
  source: z.union([
    z.object({
      type: z.literal('inline'),
      content: z.string(), // Base64
      filename: z.string().optional(),
    }),
    z.object({
      type: z.literal('uri'),
      uri: z.string().url(),
    }),
  ]),
  /** Parser configuration overrides */
  parserConfig: z.record(z.string(), z.unknown()).optional(),
  /** Whether to run in dry-run mode (validate only) */
  dryRun: z.boolean().default(false),
  /** Whether to skip duplicate detection */
  skipDuplicateCheck: z.boolean().default(false),
});

export type ImportLedgerInput = z.infer<typeof importLedgerInputSchema>;

export const normalizeTransactionInputSchema = z.object({
  /** Raw transaction data */
  rawData: z.record(z.string(), z.unknown()),
  /** Source format */
  format: z.enum(importFormats),
  /** Parser configuration */
  parserConfig: z.record(z.string(), z.unknown()).optional(),
});

export type NormalizeTransactionInput = z.infer<typeof normalizeTransactionInputSchema>;

// ============================================================================
// EXPORT HELPER TYPES
// ============================================================================

export type PartyType = (typeof partyTypes)[number];
export type PartyIdentifierType = (typeof partyIdentifierTypes)[number];
export type AccountType = (typeof accountTypes)[number];
export type AccountStatus = (typeof accountStatuses)[number];
export type InstrumentType = (typeof instrumentTypes)[number];
export type TransactionType = (typeof transactionTypes)[number];
export type TransactionStatus = (typeof transactionStatuses)[number];
export type TransactionDirection = (typeof transactionDirections)[number];
export type FlowPatternType = (typeof flowPatternTypes)[number];
export type FlowPatternSeverity = (typeof flowPatternSeverities)[number];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a monetary amount from a decimal number
 * WARNING: Use this only for initial conversion from external sources.
 * All internal calculations should use minorUnits directly.
 */
export function createMonetaryAmount(
  amount: number | string,
  currency: string,
  decimalPlaces = 2
): MonetaryAmount {
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
export function formatMonetaryAmount(amount: MonetaryAmount): string {
  const divisor = BigInt(Math.pow(10, amount.decimalPlaces));
  const wholePart = amount.minorUnits / divisor;
  const fractionalPart = amount.minorUnits % divisor;
  const paddedFractional = fractionalPart.toString().padStart(amount.decimalPlaces, '0');
  return `${wholePart}.${paddedFractional}`;
}

/**
 * Add two monetary amounts (must be same currency)
 */
export function addMonetaryAmounts(a: MonetaryAmount, b: MonetaryAmount): MonetaryAmount {
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
export function subtractMonetaryAmounts(a: MonetaryAmount, b: MonetaryAmount): MonetaryAmount {
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
export function compareMonetaryAmounts(a: MonetaryAmount, b: MonetaryAmount): -1 | 0 | 1 {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot compare different currencies: ${a.currency} vs ${b.currency}`);
  }
  if (a.minorUnits < b.minorUnits) return -1;
  if (a.minorUnits > b.minorUnits) return 1;
  return 0;
}

/**
 * Check if monetary amount is zero
 */
export function isZero(amount: MonetaryAmount): boolean {
  return amount.minorUnits === BigInt(0);
}

/**
 * Check if monetary amount is negative
 */
export function isNegative(amount: MonetaryAmount): boolean {
  return amount.minorUnits < BigInt(0);
}

/**
 * Get absolute value of monetary amount
 */
export function absMonetaryAmount(amount: MonetaryAmount): MonetaryAmount {
  return {
    ...amount,
    minorUnits: amount.minorUnits < BigInt(0) ? -amount.minorUnits : amount.minorUnits,
  };
}
