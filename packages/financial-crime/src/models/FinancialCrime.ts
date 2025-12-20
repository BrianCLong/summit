/**
 * Financial Crime Operations Models
 *
 * LEGAL NOTICE: For authorized law enforcement and financial intelligence use only.
 * All financial surveillance must comply with Bank Secrecy Act, FinCEN regulations,
 * and applicable privacy laws.
 */

import { z } from 'zod';

export enum FinancialCrimeType {
  MONEY_LAUNDERING = 'MONEY_LAUNDERING',
  TERRORIST_FINANCING = 'TERRORIST_FINANCING',
  FRAUD = 'FRAUD',
  EMBEZZLEMENT = 'EMBEZZLEMENT',
  TAX_EVASION = 'TAX_EVASION',
  SECURITIES_FRAUD = 'SECURITIES_FRAUD',
  BANK_FRAUD = 'BANK_FRAUD',
  IDENTITY_THEFT = 'IDENTITY_THEFT',
  CREDIT_CARD_FRAUD = 'CREDIT_CARD_FRAUD',
  PONZI_SCHEME = 'PONZI_SCHEME',
  MARKET_MANIPULATION = 'MARKET_MANIPULATION',
  INSIDER_TRADING = 'INSIDER_TRADING',
  CRYPTOCURRENCY_FRAUD = 'CRYPTOCURRENCY_FRAUD',
  WIRE_FRAUD = 'WIRE_FRAUD',
  MORTGAGE_FRAUD = 'MORTGAGE_FRAUD'
}

export const MoneyLaunderingSchemeSchema = z.object({
  schemeId: z.string(),
  schemeName: z.string(),

  // Scheme classification
  launderingMethods: z.array(z.enum([
    'TRADE_BASED',
    'BULK_CASH_SMUGGLING',
    'SHELL_COMPANIES',
    'REAL_ESTATE',
    'CASINOS_GAMBLING',
    'CRYPTOCURRENCY',
    'WIRE_TRANSFERS',
    'MONEY_SERVICE_BUSINESSES',
    'STRUCTURING_SMURFING',
    'BLACK_MARKET_PESO_EXCHANGE',
    'INVOICE_MANIPULATION',
    'LOAN_BACK',
    'MIRROR_TRADING',
    'HAWALA_INFORMAL_VALUE_TRANSFER'
  ])),

  // Three stages of money laundering
  placementMethods: z.array(z.string()).optional(),
  layeringMethods: z.array(z.string()).optional(),
  integrationMethods: z.array(z.string()).optional(),

  // Financial details
  estimatedVolume: z.number().optional(), // USD
  timeframe: z.string().optional(),
  sourceOfFunds: z.enum([
    'DRUG_TRAFFICKING',
    'HUMAN_TRAFFICKING',
    'WEAPONS_TRAFFICKING',
    'FRAUD',
    'CORRUPTION',
    'THEFT',
    'EXTORTION',
    'CYBERCRIME',
    'TERRORISM',
    'OTHER_CRIMINAL_ENTERPRISE'
  ]),

  // Entities involved
  organizationId: z.string().optional(),
  keyOperators: z.array(z.string()), // Entity IDs
  professionalFacilitators: z.array(z.object({
    entityId: z.string(),
    role: z.enum(['LAWYER', 'ACCOUNTANT', 'BANKER', 'REAL_ESTATE_AGENT', 'TRUST_COMPANY', 'OTHER']),
    services: z.array(z.string())
  })).optional(),

  // Status
  status: z.enum(['ACTIVE', 'DISRUPTED', 'PROSECUTED', 'MONITORING'])
});

export const ShellCompanyNetworkSchema = z.object({
  networkId: z.string(),
  numberOfCompanies: z.number(),

  companies: z.array(z.object({
    companyId: z.string(),
    companyName: z.string(),
    jurisdiction: z.string(),
    incorporationDate: z.date().optional(),

    // Ownership
    nominalOwners: z.array(z.string()).optional(), // Entity IDs for nominees
    beneficialOwners: z.array(z.string()).optional(), // Entity IDs for real owners

    // Corporate structure
    parentCompanies: z.array(z.string()).optional(),
    subsidiaries: z.array(z.string()).optional(),

    // Activities
    ostensibleBusiness: z.string().optional(),
    actualPurpose: z.string(),

    // Financial activity
    bankAccounts: z.array(z.object({
      bankName: z.string(),
      country: z.string(),
      accountNumber: z.string().optional(), // Redacted/partial
      estimatedBalance: z.number().optional()
    })).optional(),

    suspiciousActivityReports: z.number().optional(),

    // Status
    operationalStatus: z.enum(['ACTIVE', 'DORMANT', 'DISSOLVED', 'UNDER_INVESTIGATION'])
  })),

  // Network purpose
  primaryPurpose: z.string(),
  controlledBy: z.string(), // Entity or Organization ID

  // Investigation
  investigatingAgencies: z.array(z.string())
});

export const RealEstateMoneyLaunderingSchema = z.object({
  schemeId: z.string(),

  properties: z.array(z.object({
    propertyId: z.string(),
    address: z.string(),
    propertyType: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'LAND', 'LUXURY', 'DEVELOPMENT']),

    // Transaction details
    purchasePrice: z.number().optional(),
    purchaseDate: z.date().optional(),
    currentValue: z.number().optional(),

    // Ownership
    recordedOwner: z.string(), // Entity ID or shell company
    beneficialOwner: z.string().optional(), // Real owner entity ID

    // Red flags
    cashPurchase: z.boolean().optional(),
    aboveMarketValue: z.boolean().optional(),
    quickResale: z.boolean().optional(),
    unusedProperty: z.boolean().optional(),

    // Financing
    mortgageDetails: z.object({
      lender: z.string(),
      amount: z.number(),
      suspicious: z.boolean()
    }).optional()
  })),

  // Scheme details
  totalInvestment: z.number().optional(),
  estimatedCleanedMoney: z.number().optional(),

  // Patterns
  transactionPattern: z.string().optional(),
  geographicPattern: z.array(z.string()).optional(),

  // Investigation
  titleReports: z.array(z.string()).optional(),
  suspiciousActivityReports: z.array(z.string()).optional()
});

export const CryptocurrencyLaunderingSchema = z.object({
  schemeId: z.string(),

  // Cryptocurrency methods
  methods: z.array(z.enum([
    'MIXING_TUMBLING',
    'CHAIN_HOPPING',
    'PRIVACY_COINS',
    'DECENTRALIZED_EXCHANGES',
    'PEER_TO_PEER',
    'GAMBLING_SITES',
    'NFT_WASH_TRADING',
    'DEFI_PROTOCOLS',
    'NESTED_SERVICES',
    'DARKNET_MARKETS'
  ])),

  // Wallets and addresses
  suspiciousWallets: z.array(z.object({
    walletAddress: z.string(),
    blockchain: z.enum(['BITCOIN', 'ETHEREUM', 'MONERO', 'TETHER', 'OTHER']),
    associatedEntities: z.array(z.string()).optional(), // Entity IDs
    estimatedValue: z.number().optional(),
    transactionVolume: z.number().optional()
  })),

  // Exchanges and services
  exchanges: z.array(z.object({
    exchangeName: z.string(),
    jurisdiction: z.string(),
    compliance: z.enum(['REGULATED', 'UNREGULATED', 'POOR_COMPLIANCE', 'UNLICENSED']),
    accounts: z.array(z.object({
      accountId: z.string(),
      accountHolder: z.string() // Entity ID
    })).optional()
  })).optional(),

  // Volume
  estimatedVolume: z.number().optional(), // USD equivalent
  cryptocurrencyTypes: z.array(z.string()),

  // Blockchain analysis
  blockchainForensics: z.array(z.object({
    analysisDate: z.date(),
    findings: z.string(),
    traceableFunds: z.number().optional(),
    analyst: z.string()
  })).optional()
});

export const FraudOperationSchema = z.object({
  operationId: z.string(),
  fraudType: z.nativeEnum(FinancialCrimeType),

  // Operation details
  description: z.string(),
  targetedVictims: z.enum(['INDIVIDUALS', 'BUSINESSES', 'FINANCIAL_INSTITUTIONS', 'GOVERNMENT', 'MIXED']),

  // Operators
  organizationId: z.string().optional(),
  operators: z.array(z.object({
    entityId: z.string(),
    role: z.enum(['MASTERMIND', 'RECRUITER', 'MONEY_MULE', 'TECHNICAL', 'CUSTOMER_FACING', 'OTHER'])
  })),

  // Methods
  fraudMethods: z.array(z.string()),
  communicationChannels: z.array(z.string()).optional(),

  // Financial impact
  estimatedVictims: z.number().optional(),
  estimatedLosses: z.number().optional(),
  recoveredFunds: z.number().optional(),

  // Infrastructure
  callCenters: z.array(z.object({
    location: z.string(),
    operatorCount: z.number().optional(),
    status: z.enum(['ACTIVE', 'RAIDED', 'SHUT_DOWN'])
  })).optional(),

  websites: z.array(z.object({
    url: z.string(),
    purpose: z.string(),
    status: z.enum(['ACTIVE', 'TAKEN_DOWN', 'SUSPENDED'])
  })).optional(),

  // Money movement
  bankAccounts: z.array(z.object({
    bankName: z.string(),
    accountNumber: z.string().optional(),
    accountHolder: z.string(),
    status: z.enum(['ACTIVE', 'FROZEN', 'CLOSED'])
  })).optional(),

  // Status
  status: z.enum(['ACTIVE', 'DISRUPTED', 'PROSECUTED', 'MONITORING'])
});

export const IdentityTheftNetworkSchema = z.object({
  networkId: z.string(),

  // Data sources
  dataSources: z.array(z.enum([
    'DATA_BREACH',
    'PHISHING',
    'SKIMMING',
    'MALWARE',
    'INSIDER_THEFT',
    'DUMPSTER_DIVING',
    'DARK_WEB_PURCHASE',
    'SOCIAL_ENGINEERING'
  ])),

  // Stolen data types
  dataTypes: z.array(z.enum([
    'SSN',
    'CREDIT_CARD',
    'BANK_ACCOUNT',
    'DRIVERS_LICENSE',
    'PASSPORT',
    'MEDICAL_RECORDS',
    'TAX_RECORDS',
    'BIOMETRIC_DATA'
  ])),

  // Network operations
  operators: z.array(z.string()), // Entity IDs
  dataMarketplaces: z.array(z.object({
    marketplaceName: z.string(),
    platform: z.enum(['DARK_WEB', 'TELEGRAM', 'DISCORD', 'FORUM', 'OTHER']),
    url: z.string().optional()
  })).optional(),

  // Volume
  estimatedRecordsStolen: z.number().optional(),
  estimatedVictims: z.number().optional(),
  estimatedFinancialLoss: z.number().optional(),

  // Usage of stolen data
  fraudTypes: z.array(z.enum([
    'ACCOUNT_TAKEOVER',
    'NEW_ACCOUNT_FRAUD',
    'TAX_FRAUD',
    'BENEFITS_FRAUD',
    'LOAN_FRAUD',
    'CREDIT_CARD_FRAUD',
    'SYNTHETIC_IDENTITY'
  ])),

  // Status
  status: z.enum(['ACTIVE', 'DISRUPTED', 'PROSECUTED', 'MONITORING'])
});

export const TaxEvasionSchemeSchema = z.object({
  schemeId: z.string(),

  // Evasion methods
  methods: z.array(z.enum([
    'OFFSHORE_ACCOUNTS',
    'SHELL_COMPANIES',
    'FAKE_INVOICES',
    'UNDERREPORTING_INCOME',
    'OVERSTATING_DEDUCTIONS',
    'EMPLOYMENT_TAX_FRAUD',
    'EXCISE_TAX_EVASION',
    'IDENTITY_THEFT_REFUND_FRAUD',
    'CRYPTOCURRENCY_UNREPORTED'
  ])),

  // Entities involved
  taxpayers: z.array(z.string()), // Entity IDs
  facilitators: z.array(z.object({
    entityId: z.string(),
    role: z.enum(['TAX_PREPARER', 'ACCOUNTANT', 'LAWYER', 'BANKER', 'PROMOTER'])
  })).optional(),

  // Financial details
  estimatedTaxLoss: z.number().optional(),
  taxYears: z.array(z.number()),

  // Offshore components
  offshoreAccounts: z.array(z.object({
    jurisdiction: z.string(),
    financialInstitution: z.string(),
    accountHolder: z.string(),
    estimatedBalance: z.number().optional()
  })).optional(),

  // Investigation
  irsInvestigation: z.boolean(),
  investigationId: z.string().optional(),
  status: z.enum(['UNDER_INVESTIGATION', 'CHARGED', 'PROSECUTED', 'SETTLED'])
});

export const FinancialCrimeIntelligenceSchema = z.object({
  id: z.string(),

  // Legal compliance
  legalAuthorities: z.array(z.object({
    authorityType: z.string(),
    authorizingAgency: z.string(),
    caseNumber: z.string(),
    issuedDate: z.date(),
    expirationDate: z.date().optional()
  })),
  classificationLevel: z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']),

  // Crime classification
  crimeTypes: z.array(z.nativeEnum(FinancialCrimeType)),

  // Schemes and operations
  moneyLaunderingSchemes: z.array(MoneyLaunderingSchemeSchema).optional(),
  shellCompanyNetworks: z.array(ShellCompanyNetworkSchema).optional(),
  realEstateLaundering: z.array(RealEstateMoneyLaunderingSchema).optional(),
  cryptocurrencyLaundering: z.array(CryptocurrencyLaunderingSchema).optional(),
  fraudOperations: z.array(FraudOperationSchema).optional(),
  identityTheftNetworks: z.array(IdentityTheftNetworkSchema).optional(),
  taxEvasionSchemes: z.array(TaxEvasionSchemeSchema).optional(),

  // Related entities
  organizationId: z.string().optional(),

  // Financial intelligence
  suspiciousActivityReports: z.array(z.object({
    reportId: z.string(),
    filedBy: z.string(), // Financial institution
    filedDate: z.date(),
    amount: z.number().optional(),
    summary: z.string()
  })).optional(),

  currencyTransactionReports: z.array(z.object({
    reportId: z.string(),
    amount: z.number(),
    date: z.date(),
    institution: z.string()
  })).optional(),

  // Estimated impact
  totalEstimatedLoss: z.number().optional(),
  recoveredAssets: z.number().optional(),

  // Investigation
  investigatingAgencies: z.array(z.string()),
  internationalCooperation: z.array(z.object({
    country: z.string(),
    agency: z.string(),
    cooperationType: z.string()
  })).optional(),

  // Asset recovery
  assetSeizures: z.array(z.object({
    date: z.date(),
    assetType: z.enum(['CASH', 'BANK_ACCOUNT', 'REAL_ESTATE', 'VEHICLE', 'CRYPTOCURRENCY', 'OTHER']),
    value: z.number(),
    location: z.string(),
    status: z.enum(['SEIZED', 'FROZEN', 'FORFEITED', 'RETURNED'])
  })).optional(),

  // Metadata
  intelligenceSources: z.array(z.string()),
  confidenceLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'VERIFIED']),
  createdAt: z.date(),
  updatedAt: z.date(),

  // Audit trail
  auditLog: z.array(z.object({
    accessedBy: z.string(),
    accessedAt: z.date(),
    action: z.string(),
    justification: z.string(),
    legalAuthority: z.string()
  }))
});

export type MoneyLaunderingScheme = z.infer<typeof MoneyLaunderingSchemeSchema>;
export type ShellCompanyNetwork = z.infer<typeof ShellCompanyNetworkSchema>;
export type RealEstateMoneyLaundering = z.infer<typeof RealEstateMoneyLaunderingSchema>;
export type CryptocurrencyLaundering = z.infer<typeof CryptocurrencyLaunderingSchema>;
export type FraudOperation = z.infer<typeof FraudOperationSchema>;
export type IdentityTheftNetwork = z.infer<typeof IdentityTheftNetworkSchema>;
export type TaxEvasionScheme = z.infer<typeof TaxEvasionSchemeSchema>;
export type FinancialCrimeIntelligence = z.infer<typeof FinancialCrimeIntelligenceSchema>;
