"use strict";
/**
 * Financial Crime Operations Models
 *
 * LEGAL NOTICE: For authorized law enforcement and financial intelligence use only.
 * All financial surveillance must comply with Bank Secrecy Act, FinCEN regulations,
 * and applicable privacy laws.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialCrimeIntelligenceSchema = exports.TaxEvasionSchemeSchema = exports.IdentityTheftNetworkSchema = exports.FraudOperationSchema = exports.CryptocurrencyLaunderingSchema = exports.RealEstateMoneyLaunderingSchema = exports.ShellCompanyNetworkSchema = exports.MoneyLaunderingSchemeSchema = exports.FinancialCrimeType = void 0;
const zod_1 = require("zod");
var FinancialCrimeType;
(function (FinancialCrimeType) {
    FinancialCrimeType["MONEY_LAUNDERING"] = "MONEY_LAUNDERING";
    FinancialCrimeType["TERRORIST_FINANCING"] = "TERRORIST_FINANCING";
    FinancialCrimeType["FRAUD"] = "FRAUD";
    FinancialCrimeType["EMBEZZLEMENT"] = "EMBEZZLEMENT";
    FinancialCrimeType["TAX_EVASION"] = "TAX_EVASION";
    FinancialCrimeType["SECURITIES_FRAUD"] = "SECURITIES_FRAUD";
    FinancialCrimeType["BANK_FRAUD"] = "BANK_FRAUD";
    FinancialCrimeType["IDENTITY_THEFT"] = "IDENTITY_THEFT";
    FinancialCrimeType["CREDIT_CARD_FRAUD"] = "CREDIT_CARD_FRAUD";
    FinancialCrimeType["PONZI_SCHEME"] = "PONZI_SCHEME";
    FinancialCrimeType["MARKET_MANIPULATION"] = "MARKET_MANIPULATION";
    FinancialCrimeType["INSIDER_TRADING"] = "INSIDER_TRADING";
    FinancialCrimeType["CRYPTOCURRENCY_FRAUD"] = "CRYPTOCURRENCY_FRAUD";
    FinancialCrimeType["WIRE_FRAUD"] = "WIRE_FRAUD";
    FinancialCrimeType["MORTGAGE_FRAUD"] = "MORTGAGE_FRAUD";
})(FinancialCrimeType || (exports.FinancialCrimeType = FinancialCrimeType = {}));
exports.MoneyLaunderingSchemeSchema = zod_1.z.object({
    schemeId: zod_1.z.string(),
    schemeName: zod_1.z.string(),
    // Scheme classification
    launderingMethods: zod_1.z.array(zod_1.z.enum([
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
    placementMethods: zod_1.z.array(zod_1.z.string()).optional(),
    layeringMethods: zod_1.z.array(zod_1.z.string()).optional(),
    integrationMethods: zod_1.z.array(zod_1.z.string()).optional(),
    // Financial details
    estimatedVolume: zod_1.z.number().optional(), // USD
    timeframe: zod_1.z.string().optional(),
    sourceOfFunds: zod_1.z.enum([
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
    organizationId: zod_1.z.string().optional(),
    keyOperators: zod_1.z.array(zod_1.z.string()), // Entity IDs
    professionalFacilitators: zod_1.z.array(zod_1.z.object({
        entityId: zod_1.z.string(),
        role: zod_1.z.enum(['LAWYER', 'ACCOUNTANT', 'BANKER', 'REAL_ESTATE_AGENT', 'TRUST_COMPANY', 'OTHER']),
        services: zod_1.z.array(zod_1.z.string())
    })).optional(),
    // Status
    status: zod_1.z.enum(['ACTIVE', 'DISRUPTED', 'PROSECUTED', 'MONITORING'])
});
exports.ShellCompanyNetworkSchema = zod_1.z.object({
    networkId: zod_1.z.string(),
    numberOfCompanies: zod_1.z.number(),
    companies: zod_1.z.array(zod_1.z.object({
        companyId: zod_1.z.string(),
        companyName: zod_1.z.string(),
        jurisdiction: zod_1.z.string(),
        incorporationDate: zod_1.z.date().optional(),
        // Ownership
        nominalOwners: zod_1.z.array(zod_1.z.string()).optional(), // Entity IDs for nominees
        beneficialOwners: zod_1.z.array(zod_1.z.string()).optional(), // Entity IDs for real owners
        // Corporate structure
        parentCompanies: zod_1.z.array(zod_1.z.string()).optional(),
        subsidiaries: zod_1.z.array(zod_1.z.string()).optional(),
        // Activities
        ostensibleBusiness: zod_1.z.string().optional(),
        actualPurpose: zod_1.z.string(),
        // Financial activity
        bankAccounts: zod_1.z.array(zod_1.z.object({
            bankName: zod_1.z.string(),
            country: zod_1.z.string(),
            accountNumber: zod_1.z.string().optional(), // Redacted/partial
            estimatedBalance: zod_1.z.number().optional()
        })).optional(),
        suspiciousActivityReports: zod_1.z.number().optional(),
        // Status
        operationalStatus: zod_1.z.enum(['ACTIVE', 'DORMANT', 'DISSOLVED', 'UNDER_INVESTIGATION'])
    })),
    // Network purpose
    primaryPurpose: zod_1.z.string(),
    controlledBy: zod_1.z.string(), // Entity or Organization ID
    // Investigation
    investigatingAgencies: zod_1.z.array(zod_1.z.string())
});
exports.RealEstateMoneyLaunderingSchema = zod_1.z.object({
    schemeId: zod_1.z.string(),
    properties: zod_1.z.array(zod_1.z.object({
        propertyId: zod_1.z.string(),
        address: zod_1.z.string(),
        propertyType: zod_1.z.enum(['RESIDENTIAL', 'COMMERCIAL', 'LAND', 'LUXURY', 'DEVELOPMENT']),
        // Transaction details
        purchasePrice: zod_1.z.number().optional(),
        purchaseDate: zod_1.z.date().optional(),
        currentValue: zod_1.z.number().optional(),
        // Ownership
        recordedOwner: zod_1.z.string(), // Entity ID or shell company
        beneficialOwner: zod_1.z.string().optional(), // Real owner entity ID
        // Red flags
        cashPurchase: zod_1.z.boolean().optional(),
        aboveMarketValue: zod_1.z.boolean().optional(),
        quickResale: zod_1.z.boolean().optional(),
        unusedProperty: zod_1.z.boolean().optional(),
        // Financing
        mortgageDetails: zod_1.z.object({
            lender: zod_1.z.string(),
            amount: zod_1.z.number(),
            suspicious: zod_1.z.boolean()
        }).optional()
    })),
    // Scheme details
    totalInvestment: zod_1.z.number().optional(),
    estimatedCleanedMoney: zod_1.z.number().optional(),
    // Patterns
    transactionPattern: zod_1.z.string().optional(),
    geographicPattern: zod_1.z.array(zod_1.z.string()).optional(),
    // Investigation
    titleReports: zod_1.z.array(zod_1.z.string()).optional(),
    suspiciousActivityReports: zod_1.z.array(zod_1.z.string()).optional()
});
exports.CryptocurrencyLaunderingSchema = zod_1.z.object({
    schemeId: zod_1.z.string(),
    // Cryptocurrency methods
    methods: zod_1.z.array(zod_1.z.enum([
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
    suspiciousWallets: zod_1.z.array(zod_1.z.object({
        walletAddress: zod_1.z.string(),
        blockchain: zod_1.z.enum(['BITCOIN', 'ETHEREUM', 'MONERO', 'TETHER', 'OTHER']),
        associatedEntities: zod_1.z.array(zod_1.z.string()).optional(), // Entity IDs
        estimatedValue: zod_1.z.number().optional(),
        transactionVolume: zod_1.z.number().optional()
    })),
    // Exchanges and services
    exchanges: zod_1.z.array(zod_1.z.object({
        exchangeName: zod_1.z.string(),
        jurisdiction: zod_1.z.string(),
        compliance: zod_1.z.enum(['REGULATED', 'UNREGULATED', 'POOR_COMPLIANCE', 'UNLICENSED']),
        accounts: zod_1.z.array(zod_1.z.object({
            accountId: zod_1.z.string(),
            accountHolder: zod_1.z.string() // Entity ID
        })).optional()
    })).optional(),
    // Volume
    estimatedVolume: zod_1.z.number().optional(), // USD equivalent
    cryptocurrencyTypes: zod_1.z.array(zod_1.z.string()),
    // Blockchain analysis
    blockchainForensics: zod_1.z.array(zod_1.z.object({
        analysisDate: zod_1.z.date(),
        findings: zod_1.z.string(),
        traceableFunds: zod_1.z.number().optional(),
        analyst: zod_1.z.string()
    })).optional()
});
exports.FraudOperationSchema = zod_1.z.object({
    operationId: zod_1.z.string(),
    fraudType: zod_1.z.nativeEnum(FinancialCrimeType),
    // Operation details
    description: zod_1.z.string(),
    targetedVictims: zod_1.z.enum(['INDIVIDUALS', 'BUSINESSES', 'FINANCIAL_INSTITUTIONS', 'GOVERNMENT', 'MIXED']),
    // Operators
    organizationId: zod_1.z.string().optional(),
    operators: zod_1.z.array(zod_1.z.object({
        entityId: zod_1.z.string(),
        role: zod_1.z.enum(['MASTERMIND', 'RECRUITER', 'MONEY_MULE', 'TECHNICAL', 'CUSTOMER_FACING', 'OTHER'])
    })),
    // Methods
    fraudMethods: zod_1.z.array(zod_1.z.string()),
    communicationChannels: zod_1.z.array(zod_1.z.string()).optional(),
    // Financial impact
    estimatedVictims: zod_1.z.number().optional(),
    estimatedLosses: zod_1.z.number().optional(),
    recoveredFunds: zod_1.z.number().optional(),
    // Infrastructure
    callCenters: zod_1.z.array(zod_1.z.object({
        location: zod_1.z.string(),
        operatorCount: zod_1.z.number().optional(),
        status: zod_1.z.enum(['ACTIVE', 'RAIDED', 'SHUT_DOWN'])
    })).optional(),
    websites: zod_1.z.array(zod_1.z.object({
        url: zod_1.z.string(),
        purpose: zod_1.z.string(),
        status: zod_1.z.enum(['ACTIVE', 'TAKEN_DOWN', 'SUSPENDED'])
    })).optional(),
    // Money movement
    bankAccounts: zod_1.z.array(zod_1.z.object({
        bankName: zod_1.z.string(),
        accountNumber: zod_1.z.string().optional(),
        accountHolder: zod_1.z.string(),
        status: zod_1.z.enum(['ACTIVE', 'FROZEN', 'CLOSED'])
    })).optional(),
    // Status
    status: zod_1.z.enum(['ACTIVE', 'DISRUPTED', 'PROSECUTED', 'MONITORING'])
});
exports.IdentityTheftNetworkSchema = zod_1.z.object({
    networkId: zod_1.z.string(),
    // Data sources
    dataSources: zod_1.z.array(zod_1.z.enum([
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
    dataTypes: zod_1.z.array(zod_1.z.enum([
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
    operators: zod_1.z.array(zod_1.z.string()), // Entity IDs
    dataMarketplaces: zod_1.z.array(zod_1.z.object({
        marketplaceName: zod_1.z.string(),
        platform: zod_1.z.enum(['DARK_WEB', 'TELEGRAM', 'DISCORD', 'FORUM', 'OTHER']),
        url: zod_1.z.string().optional()
    })).optional(),
    // Volume
    estimatedRecordsStolen: zod_1.z.number().optional(),
    estimatedVictims: zod_1.z.number().optional(),
    estimatedFinancialLoss: zod_1.z.number().optional(),
    // Usage of stolen data
    fraudTypes: zod_1.z.array(zod_1.z.enum([
        'ACCOUNT_TAKEOVER',
        'NEW_ACCOUNT_FRAUD',
        'TAX_FRAUD',
        'BENEFITS_FRAUD',
        'LOAN_FRAUD',
        'CREDIT_CARD_FRAUD',
        'SYNTHETIC_IDENTITY'
    ])),
    // Status
    status: zod_1.z.enum(['ACTIVE', 'DISRUPTED', 'PROSECUTED', 'MONITORING'])
});
exports.TaxEvasionSchemeSchema = zod_1.z.object({
    schemeId: zod_1.z.string(),
    // Evasion methods
    methods: zod_1.z.array(zod_1.z.enum([
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
    taxpayers: zod_1.z.array(zod_1.z.string()), // Entity IDs
    facilitators: zod_1.z.array(zod_1.z.object({
        entityId: zod_1.z.string(),
        role: zod_1.z.enum(['TAX_PREPARER', 'ACCOUNTANT', 'LAWYER', 'BANKER', 'PROMOTER'])
    })).optional(),
    // Financial details
    estimatedTaxLoss: zod_1.z.number().optional(),
    taxYears: zod_1.z.array(zod_1.z.number()),
    // Offshore components
    offshoreAccounts: zod_1.z.array(zod_1.z.object({
        jurisdiction: zod_1.z.string(),
        financialInstitution: zod_1.z.string(),
        accountHolder: zod_1.z.string(),
        estimatedBalance: zod_1.z.number().optional()
    })).optional(),
    // Investigation
    irsInvestigation: zod_1.z.boolean(),
    investigationId: zod_1.z.string().optional(),
    status: zod_1.z.enum(['UNDER_INVESTIGATION', 'CHARGED', 'PROSECUTED', 'SETTLED'])
});
exports.FinancialCrimeIntelligenceSchema = zod_1.z.object({
    id: zod_1.z.string(),
    // Legal compliance
    legalAuthorities: zod_1.z.array(zod_1.z.object({
        authorityType: zod_1.z.string(),
        authorizingAgency: zod_1.z.string(),
        caseNumber: zod_1.z.string(),
        issuedDate: zod_1.z.date(),
        expirationDate: zod_1.z.date().optional()
    })),
    classificationLevel: zod_1.z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']),
    // Crime classification
    crimeTypes: zod_1.z.array(zod_1.z.nativeEnum(FinancialCrimeType)),
    // Schemes and operations
    moneyLaunderingSchemes: zod_1.z.array(exports.MoneyLaunderingSchemeSchema).optional(),
    shellCompanyNetworks: zod_1.z.array(exports.ShellCompanyNetworkSchema).optional(),
    realEstateLaundering: zod_1.z.array(exports.RealEstateMoneyLaunderingSchema).optional(),
    cryptocurrencyLaundering: zod_1.z.array(exports.CryptocurrencyLaunderingSchema).optional(),
    fraudOperations: zod_1.z.array(exports.FraudOperationSchema).optional(),
    identityTheftNetworks: zod_1.z.array(exports.IdentityTheftNetworkSchema).optional(),
    taxEvasionSchemes: zod_1.z.array(exports.TaxEvasionSchemeSchema).optional(),
    // Related entities
    organizationId: zod_1.z.string().optional(),
    // Financial intelligence
    suspiciousActivityReports: zod_1.z.array(zod_1.z.object({
        reportId: zod_1.z.string(),
        filedBy: zod_1.z.string(), // Financial institution
        filedDate: zod_1.z.date(),
        amount: zod_1.z.number().optional(),
        summary: zod_1.z.string()
    })).optional(),
    currencyTransactionReports: zod_1.z.array(zod_1.z.object({
        reportId: zod_1.z.string(),
        amount: zod_1.z.number(),
        date: zod_1.z.date(),
        institution: zod_1.z.string()
    })).optional(),
    // Estimated impact
    totalEstimatedLoss: zod_1.z.number().optional(),
    recoveredAssets: zod_1.z.number().optional(),
    // Investigation
    investigatingAgencies: zod_1.z.array(zod_1.z.string()),
    internationalCooperation: zod_1.z.array(zod_1.z.object({
        country: zod_1.z.string(),
        agency: zod_1.z.string(),
        cooperationType: zod_1.z.string()
    })).optional(),
    // Asset recovery
    assetSeizures: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.date(),
        assetType: zod_1.z.enum(['CASH', 'BANK_ACCOUNT', 'REAL_ESTATE', 'VEHICLE', 'CRYPTOCURRENCY', 'OTHER']),
        value: zod_1.z.number(),
        location: zod_1.z.string(),
        status: zod_1.z.enum(['SEIZED', 'FROZEN', 'FORFEITED', 'RETURNED'])
    })).optional(),
    // Metadata
    intelligenceSources: zod_1.z.array(zod_1.z.string()),
    confidenceLevel: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'VERIFIED']),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    // Audit trail
    auditLog: zod_1.z.array(zod_1.z.object({
        accessedBy: zod_1.z.string(),
        accessedAt: zod_1.z.date(),
        action: zod_1.z.string(),
        justification: zod_1.z.string(),
        legalAuthority: zod_1.z.string()
    }))
});
