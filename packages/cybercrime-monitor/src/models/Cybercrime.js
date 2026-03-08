"use strict";
/**
 * Cybercrime and Fraud Monitoring Models
 *
 * LEGAL NOTICE: For authorized law enforcement and cybersecurity use only.
 * All cyber investigations must comply with CFAA, ECPA, and applicable laws.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CybercrimeIntelligenceSchema = exports.CryptocurrencyTheftSchema = exports.DarkWebMarketplaceSchema = exports.OnlineFraudRingSchema = exports.BusinessEmailCompromiseSchema = exports.RansomwareOperationSchema = exports.CybercrimeType = void 0;
const zod_1 = require("zod");
var CybercrimeType;
(function (CybercrimeType) {
    CybercrimeType["RANSOMWARE"] = "RANSOMWARE";
    CybercrimeType["BUSINESS_EMAIL_COMPROMISE"] = "BUSINESS_EMAIL_COMPROMISE";
    CybercrimeType["PHISHING"] = "PHISHING";
    CybercrimeType["MALWARE"] = "MALWARE";
    CybercrimeType["DDOS"] = "DDOS";
    CybercrimeType["DATA_BREACH"] = "DATA_BREACH";
    CybercrimeType["IDENTITY_THEFT"] = "IDENTITY_THEFT";
    CybercrimeType["CRYPTOCURRENCY_THEFT"] = "CRYPTOCURRENCY_THEFT";
    CybercrimeType["ONLINE_FRAUD"] = "ONLINE_FRAUD";
    CybercrimeType["ROMANCE_SCAM"] = "ROMANCE_SCAM";
    CybercrimeType["INVESTMENT_FRAUD"] = "INVESTMENT_FRAUD";
    CybercrimeType["TECH_SUPPORT_SCAM"] = "TECH_SUPPORT_SCAM";
    CybercrimeType["DARK_WEB_MARKETPLACE"] = "DARK_WEB_MARKETPLACE";
    CybercrimeType["CHILD_EXPLOITATION"] = "CHILD_EXPLOITATION";
    CybercrimeType["INTELLECTUAL_PROPERTY_THEFT"] = "INTELLECTUAL_PROPERTY_THEFT";
})(CybercrimeType || (exports.CybercrimeType = CybercrimeType = {}));
exports.RansomwareOperationSchema = zod_1.z.object({
    operationId: zod_1.z.string(),
    ransomwareFamily: zod_1.z.string(), // e.g., "LockBit", "BlackCat", "REvil"
    // Threat actors
    threatActorGroup: zod_1.z.string().optional(),
    affiliateModel: zod_1.z.boolean().optional(), // Ransomware-as-a-Service
    operators: zod_1.z.array(zod_1.z.string()).optional(), // Entity IDs
    // Tactics and techniques
    infectionVectors: zod_1.z.array(zod_1.z.enum([
        'PHISHING_EMAIL',
        'RDP_BRUTE_FORCE',
        'VULNERABILITY_EXPLOIT',
        'SUPPLY_CHAIN',
        'MALICIOUS_DOWNLOAD',
        'USB_DRIVE',
        'SOCIAL_ENGINEERING'
    ])),
    encryptionAlgorithm: zod_1.z.string().optional(),
    dataExfiltration: zod_1.z.boolean().optional(),
    doubleExtortion: zod_1.z.boolean().optional(),
    // Targets
    targetSectors: zod_1.z.array(zod_1.z.string()),
    targetCountries: zod_1.z.array(zod_1.z.string()),
    knownVictims: zod_1.z.array(zod_1.z.object({
        victimName: zod_1.z.string().optional(),
        sector: zod_1.z.string(),
        attackDate: zod_1.z.date(),
        ransomDemand: zod_1.z.number().optional(),
        ransomPaid: zod_1.z.number().optional()
    })).optional(),
    // Payment and infrastructure
    cryptocurrencyWallets: zod_1.z.array(zod_1.z.object({
        address: zod_1.z.string(),
        blockchain: zod_1.z.string(),
        totalReceived: zod_1.z.number().optional()
    })).optional(),
    communicationChannels: zod_1.z.array(zod_1.z.string()).optional(), // TOX, dark web sites, etc.
    dataLeakSites: zod_1.z.array(zod_1.z.string()).optional(),
    // Technical indicators
    fileHashes: zod_1.z.array(zod_1.z.string()).optional(),
    ipAddresses: zod_1.z.array(zod_1.z.string()).optional(),
    domains: zod_1.z.array(zod_1.z.string()).optional(),
    status: zod_1.z.enum(['ACTIVE', 'DISRUPTED', 'INACTIVE', 'REBRANDED'])
});
exports.BusinessEmailCompromiseSchema = zod_1.z.object({
    caseId: zod_1.z.string(),
    // Attack details
    attackType: zod_1.z.enum([
        'CEO_FRAUD',
        'ACCOUNT_COMPROMISE',
        'ATTORNEY_IMPERSONATION',
        'INVOICE_MODIFICATION',
        'DATA_THEFT'
    ]),
    // Threat actors
    threatActors: zod_1.z.array(zod_1.z.string()).optional(), // Entity IDs
    suspectedOrigin: zod_1.z.string().optional(),
    // Victims
    victims: zod_1.z.array(zod_1.z.object({
        organizationName: zod_1.z.string(),
        industry: zod_1.z.string(),
        compromiseDate: zod_1.z.date().optional(),
        financialLoss: zod_1.z.number().optional(),
        fundsRecovered: zod_1.z.number().optional()
    })),
    // Attack methodology
    initialCompromise: zod_1.z.array(zod_1.z.string()),
    socialEngineeringTactics: zod_1.z.array(zod_1.z.string()),
    impersonatedRoles: zod_1.z.array(zod_1.z.string()).optional(),
    // Money movement
    fraudulentTransfers: zod_1.z.array(zod_1.z.object({
        amount: zod_1.z.number(),
        currency: zod_1.z.string(),
        destinationBank: zod_1.z.string(),
        destinationCountry: zod_1.z.string(),
        accountHolder: zod_1.z.string().optional()
    })).optional(),
    moneyMules: zod_1.z.array(zod_1.z.string()).optional(), // Entity IDs
    // Investigation
    investigatingAgencies: zod_1.z.array(zod_1.z.string()),
    status: zod_1.z.enum(['UNDER_INVESTIGATION', 'ARRESTS_MADE', 'PROSECUTED', 'FUNDS_RECOVERED'])
});
exports.OnlineFraudRingSchema = zod_1.z.object({
    ringId: zod_1.z.string(),
    fraudType: zod_1.z.nativeEnum(CybercrimeType),
    // Organization
    organizationStructure: zod_1.z.string().optional(),
    members: zod_1.z.array(zod_1.z.object({
        entityId: zod_1.z.string(),
        role: zod_1.z.enum(['LEADER', 'DEVELOPER', 'SCAMMER', 'MONEY_MULE', 'TECHNICAL_SUPPORT', 'RECRUITER']),
        location: zod_1.z.string().optional()
    })),
    // Operations
    scamMethods: zod_1.z.array(zod_1.z.string()),
    targetDemographics: zod_1.z.array(zod_1.z.string()),
    platforms: zod_1.z.array(zod_1.z.string()), // Social media, dating sites, etc.
    // Infrastructure
    websites: zod_1.z.array(zod_1.z.object({
        url: zod_1.z.string(),
        purpose: zod_1.z.string(),
        hosting: zod_1.z.string().optional(),
        status: zod_1.z.enum(['ACTIVE', 'TAKEN_DOWN', 'SUSPENDED'])
    })).optional(),
    phoneNumbers: zod_1.z.array(zod_1.z.string()).optional(),
    emailDomains: zod_1.z.array(zod_1.z.string()).optional(),
    // Financial impact
    estimatedVictims: zod_1.z.number().optional(),
    estimatedLosses: zod_1.z.number().optional(),
    // Money laundering
    cashOutMethods: zod_1.z.array(zod_1.z.string()),
    bankAccounts: zod_1.z.array(zod_1.z.object({
        bankName: zod_1.z.string(),
        country: zod_1.z.string(),
        accountHolder: zod_1.z.string(),
        status: zod_1.z.enum(['ACTIVE', 'FROZEN', 'CLOSED'])
    })).optional(),
    status: zod_1.z.enum(['ACTIVE', 'DISRUPTED', 'PROSECUTED'])
});
exports.DarkWebMarketplaceSchema = zod_1.z.object({
    marketplaceId: zod_1.z.string(),
    marketplaceName: zod_1.z.string(),
    onionAddress: zod_1.z.string().optional(),
    // Marketplace details
    primaryGoods: zod_1.z.array(zod_1.z.enum([
        'DRUGS',
        'STOLEN_DATA',
        'MALWARE',
        'WEAPONS',
        'COUNTERFEIT_CURRENCY',
        'FAKE_DOCUMENTS',
        'HACKING_SERVICES',
        'STOLEN_ACCOUNTS',
        'PERSONAL_INFORMATION',
        'CHILD_EXPLOITATION_MATERIAL'
    ])),
    operationalStatus: zod_1.z.enum(['ACTIVE', 'EXIT_SCAM', 'LAW_ENFORCEMENT_SEIZED', 'OFFLINE']),
    // Operators
    administrators: zod_1.z.array(zod_1.z.object({
        username: zod_1.z.string(),
        entityId: zod_1.z.string().optional(), // If identified
        role: zod_1.z.string()
    })).optional(),
    // Vendors
    activeVendors: zod_1.z.number().optional(),
    knownVendors: zod_1.z.array(zod_1.z.object({
        vendorName: zod_1.z.string(),
        entityId: zod_1.z.string().optional(),
        specialization: zod_1.z.string(),
        salesVolume: zod_1.z.number().optional(),
        rating: zod_1.z.number().optional()
    })).optional(),
    // Financial
    paymentMethods: zod_1.z.array(zod_1.z.string()),
    escrowSystem: zod_1.z.boolean().optional(),
    estimatedDailyRevenue: zod_1.z.number().optional(),
    // Investigation
    undercoderOperations: zod_1.z.array(zod_1.z.string()).optional(),
    identifiedUsers: zod_1.z.array(zod_1.z.string()).optional(), // Entity IDs
    investigatingAgencies: zod_1.z.array(zod_1.z.string()),
    // Takedown attempts
    lawEnforcementActions: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.date(),
        action: zod_1.z.string(),
        agency: zod_1.z.string(),
        outcome: zod_1.z.string()
    })).optional()
});
exports.CryptocurrencyTheftSchema = zod_1.z.object({
    incidentId: zod_1.z.string(),
    // Theft method
    theftMethod: zod_1.z.enum([
        'EXCHANGE_HACK',
        'WALLET_HACK',
        'PHISHING',
        'SMART_CONTRACT_EXPLOIT',
        'RUG_PULL',
        'ICO_SCAM',
        'PONZI_SCHEME',
        'SOCIAL_ENGINEERING',
        'INSIDER_THEFT',
        'PRIVATE_KEY_THEFT'
    ]),
    // Target
    targetedPlatform: zod_1.z.string().optional(),
    victimCount: zod_1.z.number().optional(),
    // Financial impact
    stolenAmount: zod_1.z.number(), // USD value
    cryptocurrencyType: zod_1.z.array(zod_1.z.string()),
    // Attribution
    suspectedActors: zod_1.z.array(zod_1.z.string()).optional(), // Entity IDs
    attributedGroup: zod_1.z.string().optional(),
    // Stolen funds tracking
    stolenWallets: zod_1.z.array(zod_1.z.object({
        address: zod_1.z.string(),
        blockchain: zod_1.z.string(),
        amount: zod_1.z.number()
    })),
    launderingMethods: zod_1.z.array(zod_1.z.string()).optional(),
    fundRecovery: zod_1.z.object({
        recoveredAmount: zod_1.z.number(),
        recoveryMethod: zod_1.z.string()
    }).optional(),
    // Investigation
    investigatingAgencies: zod_1.z.array(zod_1.z.string()),
    blockchainAnalysis: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.date(),
        findings: zod_1.z.string(),
        analyst: zod_1.z.string()
    })).optional()
});
exports.CybercrimeIntelligenceSchema = zod_1.z.object({
    id: zod_1.z.string(),
    // Legal compliance
    legalAuthorities: zod_1.z.array(zod_1.z.object({
        authorityType: zod_1.z.string(),
        authorizingAgency: zod_1.z.string(),
        caseNumber: zod_1.z.string(),
        issuedDate: zod_1.z.date()
    })),
    classificationLevel: zod_1.z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']),
    // Crime classification
    crimeTypes: zod_1.z.array(zod_1.z.nativeEnum(CybercrimeType)),
    // Operations and schemes
    ransomwareOperations: zod_1.z.array(exports.RansomwareOperationSchema).optional(),
    businessEmailCompromise: zod_1.z.array(exports.BusinessEmailCompromiseSchema).optional(),
    onlineFraudRings: zod_1.z.array(exports.OnlineFraudRingSchema).optional(),
    darkWebMarketplaces: zod_1.z.array(exports.DarkWebMarketplaceSchema).optional(),
    cryptocurrencyThefts: zod_1.z.array(exports.CryptocurrencyTheftSchema).optional(),
    // Threat intelligence
    threatActors: zod_1.z.array(zod_1.z.object({
        actorName: zod_1.z.string(),
        actorType: zod_1.z.enum(['NATION_STATE', 'ORGANIZED_CRIME', 'HACKTIVIST', 'INSIDER', 'INDIVIDUAL']),
        sophistication: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'ADVANCED']),
        motivations: zod_1.z.array(zod_1.z.string()),
        knownMembers: zod_1.z.array(zod_1.z.string()).optional() // Entity IDs
    })).optional(),
    // Technical indicators
    indicatorsOfCompromise: zod_1.z.object({
        fileHashes: zod_1.z.array(zod_1.z.string()).optional(),
        ipAddresses: zod_1.z.array(zod_1.z.string()).optional(),
        domains: zod_1.z.array(zod_1.z.string()).optional(),
        urls: zod_1.z.array(zod_1.z.string()).optional(),
        emailAddresses: zod_1.z.array(zod_1.z.string()).optional()
    }).optional(),
    // Investigation
    investigatingAgencies: zod_1.z.array(zod_1.z.string()),
    internationalCooperation: zod_1.z.array(zod_1.z.object({
        country: zod_1.z.string(),
        agency: zod_1.z.string(),
        cooperationType: zod_1.z.string()
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
        justification: zod_1.z.string()
    }))
});
