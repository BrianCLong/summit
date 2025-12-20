/**
 * Cybercrime and Fraud Monitoring Models
 *
 * LEGAL NOTICE: For authorized law enforcement and cybersecurity use only.
 * All cyber investigations must comply with CFAA, ECPA, and applicable laws.
 */

import { z } from 'zod';

export enum CybercrimeType {
  RANSOMWARE = 'RANSOMWARE',
  BUSINESS_EMAIL_COMPROMISE = 'BUSINESS_EMAIL_COMPROMISE',
  PHISHING = 'PHISHING',
  MALWARE = 'MALWARE',
  DDOS = 'DDOS',
  DATA_BREACH = 'DATA_BREACH',
  IDENTITY_THEFT = 'IDENTITY_THEFT',
  CRYPTOCURRENCY_THEFT = 'CRYPTOCURRENCY_THEFT',
  ONLINE_FRAUD = 'ONLINE_FRAUD',
  ROMANCE_SCAM = 'ROMANCE_SCAM',
  INVESTMENT_FRAUD = 'INVESTMENT_FRAUD',
  TECH_SUPPORT_SCAM = 'TECH_SUPPORT_SCAM',
  DARK_WEB_MARKETPLACE = 'DARK_WEB_MARKETPLACE',
  CHILD_EXPLOITATION = 'CHILD_EXPLOITATION',
  INTELLECTUAL_PROPERTY_THEFT = 'INTELLECTUAL_PROPERTY_THEFT'
}

export const RansomwareOperationSchema = z.object({
  operationId: z.string(),
  ransomwareFamily: z.string(), // e.g., "LockBit", "BlackCat", "REvil"

  // Threat actors
  threatActorGroup: z.string().optional(),
  affiliateModel: z.boolean().optional(), // Ransomware-as-a-Service
  operators: z.array(z.string()).optional(), // Entity IDs

  // Tactics and techniques
  infectionVectors: z.array(z.enum([
    'PHISHING_EMAIL',
    'RDP_BRUTE_FORCE',
    'VULNERABILITY_EXPLOIT',
    'SUPPLY_CHAIN',
    'MALICIOUS_DOWNLOAD',
    'USB_DRIVE',
    'SOCIAL_ENGINEERING'
  ])),

  encryptionAlgorithm: z.string().optional(),
  dataExfiltration: z.boolean().optional(),
  doubleExtortion: z.boolean().optional(),

  // Targets
  targetSectors: z.array(z.string()),
  targetCountries: z.array(z.string()),
  knownVictims: z.array(z.object({
    victimName: z.string().optional(),
    sector: z.string(),
    attackDate: z.date(),
    ransomDemand: z.number().optional(),
    ransomPaid: z.number().optional()
  })).optional(),

  // Payment and infrastructure
  cryptocurrencyWallets: z.array(z.object({
    address: z.string(),
    blockchain: z.string(),
    totalReceived: z.number().optional()
  })).optional(),

  communicationChannels: z.array(z.string()).optional(), // TOX, dark web sites, etc.
  dataLeakSites: z.array(z.string()).optional(),

  // Technical indicators
  fileHashes: z.array(z.string()).optional(),
  ipAddresses: z.array(z.string()).optional(),
  domains: z.array(z.string()).optional(),

  status: z.enum(['ACTIVE', 'DISRUPTED', 'INACTIVE', 'REBRANDED'])
});

export const BusinessEmailCompromiseSchema = z.object({
  caseId: z.string(),

  // Attack details
  attackType: z.enum([
    'CEO_FRAUD',
    'ACCOUNT_COMPROMISE',
    'ATTORNEY_IMPERSONATION',
    'INVOICE_MODIFICATION',
    'DATA_THEFT'
  ]),

  // Threat actors
  threatActors: z.array(z.string()).optional(), // Entity IDs
  suspectedOrigin: z.string().optional(),

  // Victims
  victims: z.array(z.object({
    organizationName: z.string(),
    industry: z.string(),
    compromiseDate: z.date().optional(),
    financialLoss: z.number().optional(),
    fundsRecovered: z.number().optional()
  })),

  // Attack methodology
  initialCompromise: z.array(z.string()),
  socialEngineeringTactics: z.array(z.string()),
  impersonatedRoles: z.array(z.string()).optional(),

  // Money movement
  fraudulentTransfers: z.array(z.object({
    amount: z.number(),
    currency: z.string(),
    destinationBank: z.string(),
    destinationCountry: z.string(),
    accountHolder: z.string().optional()
  })).optional(),

  moneyMules: z.array(z.string()).optional(), // Entity IDs

  // Investigation
  investigatingAgencies: z.array(z.string()),
  status: z.enum(['UNDER_INVESTIGATION', 'ARRESTS_MADE', 'PROSECUTED', 'FUNDS_RECOVERED'])
});

export const OnlineFraudRingSchema = z.object({
  ringId: z.string(),
  fraudType: z.nativeEnum(CybercrimeType),

  // Organization
  organizationStructure: z.string().optional(),
  members: z.array(z.object({
    entityId: z.string(),
    role: z.enum(['LEADER', 'DEVELOPER', 'SCAMMER', 'MONEY_MULE', 'TECHNICAL_SUPPORT', 'RECRUITER']),
    location: z.string().optional()
  })),

  // Operations
  scamMethods: z.array(z.string()),
  targetDemographics: z.array(z.string()),
  platforms: z.array(z.string()), // Social media, dating sites, etc.

  // Infrastructure
  websites: z.array(z.object({
    url: z.string(),
    purpose: z.string(),
    hosting: z.string().optional(),
    status: z.enum(['ACTIVE', 'TAKEN_DOWN', 'SUSPENDED'])
  })).optional(),

  phoneNumbers: z.array(z.string()).optional(),
  emailDomains: z.array(z.string()).optional(),

  // Financial impact
  estimatedVictims: z.number().optional(),
  estimatedLosses: z.number().optional(),

  // Money laundering
  cashOutMethods: z.array(z.string()),
  bankAccounts: z.array(z.object({
    bankName: z.string(),
    country: z.string(),
    accountHolder: z.string(),
    status: z.enum(['ACTIVE', 'FROZEN', 'CLOSED'])
  })).optional(),

  status: z.enum(['ACTIVE', 'DISRUPTED', 'PROSECUTED'])
});

export const DarkWebMarketplaceSchema = z.object({
  marketplaceId: z.string(),
  marketplaceName: z.string(),
  onionAddress: z.string().optional(),

  // Marketplace details
  primaryGoods: z.array(z.enum([
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

  operationalStatus: z.enum(['ACTIVE', 'EXIT_SCAM', 'LAW_ENFORCEMENT_SEIZED', 'OFFLINE']),

  // Operators
  administrators: z.array(z.object({
    username: z.string(),
    entityId: z.string().optional(), // If identified
    role: z.string()
  })).optional(),

  // Vendors
  activeVendors: z.number().optional(),
  knownVendors: z.array(z.object({
    vendorName: z.string(),
    entityId: z.string().optional(),
    specialization: z.string(),
    salesVolume: z.number().optional(),
    rating: z.number().optional()
  })).optional(),

  // Financial
  paymentMethods: z.array(z.string()),
  escrowSystem: z.boolean().optional(),
  estimatedDailyRevenue: z.number().optional(),

  // Investigation
  undercoderOperations: z.array(z.string()).optional(),
  identifiedUsers: z.array(z.string()).optional(), // Entity IDs
  investigatingAgencies: z.array(z.string()),

  // Takedown attempts
  lawEnforcementActions: z.array(z.object({
    date: z.date(),
    action: z.string(),
    agency: z.string(),
    outcome: z.string()
  })).optional()
});

export const CryptocurrencyTheftSchema = z.object({
  incidentId: z.string(),

  // Theft method
  theftMethod: z.enum([
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
  targetedPlatform: z.string().optional(),
  victimCount: z.number().optional(),

  // Financial impact
  stolenAmount: z.number(), // USD value
  cryptocurrencyType: z.array(z.string()),

  // Attribution
  suspectedActors: z.array(z.string()).optional(), // Entity IDs
  attributedGroup: z.string().optional(),

  // Stolen funds tracking
  stolenWallets: z.array(z.object({
    address: z.string(),
    blockchain: z.string(),
    amount: z.number()
  })),

  launderingMethods: z.array(z.string()).optional(),
  fundRecovery: z.object({
    recoveredAmount: z.number(),
    recoveryMethod: z.string()
  }).optional(),

  // Investigation
  investigatingAgencies: z.array(z.string()),
  blockchainAnalysis: z.array(z.object({
    date: z.date(),
    findings: z.string(),
    analyst: z.string()
  })).optional()
});

export const CybercrimeIntelligenceSchema = z.object({
  id: z.string(),

  // Legal compliance
  legalAuthorities: z.array(z.object({
    authorityType: z.string(),
    authorizingAgency: z.string(),
    caseNumber: z.string(),
    issuedDate: z.date()
  })),
  classificationLevel: z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']),

  // Crime classification
  crimeTypes: z.array(z.nativeEnum(CybercrimeType)),

  // Operations and schemes
  ransomwareOperations: z.array(RansomwareOperationSchema).optional(),
  businessEmailCompromise: z.array(BusinessEmailCompromiseSchema).optional(),
  onlineFraudRings: z.array(OnlineFraudRingSchema).optional(),
  darkWebMarketplaces: z.array(DarkWebMarketplaceSchema).optional(),
  cryptocurrencyThefts: z.array(CryptocurrencyTheftSchema).optional(),

  // Threat intelligence
  threatActors: z.array(z.object({
    actorName: z.string(),
    actorType: z.enum(['NATION_STATE', 'ORGANIZED_CRIME', 'HACKTIVIST', 'INSIDER', 'INDIVIDUAL']),
    sophistication: z.enum(['LOW', 'MEDIUM', 'HIGH', 'ADVANCED']),
    motivations: z.array(z.string()),
    knownMembers: z.array(z.string()).optional() // Entity IDs
  })).optional(),

  // Technical indicators
  indicatorsOfCompromise: z.object({
    fileHashes: z.array(z.string()).optional(),
    ipAddresses: z.array(z.string()).optional(),
    domains: z.array(z.string()).optional(),
    urls: z.array(z.string()).optional(),
    emailAddresses: z.array(z.string()).optional()
  }).optional(),

  // Investigation
  investigatingAgencies: z.array(z.string()),
  internationalCooperation: z.array(z.object({
    country: z.string(),
    agency: z.string(),
    cooperationType: z.string()
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
    justification: z.string()
  }))
});

export type RansomwareOperation = z.infer<typeof RansomwareOperationSchema>;
export type BusinessEmailCompromise = z.infer<typeof BusinessEmailCompromiseSchema>;
export type OnlineFraudRing = z.infer<typeof OnlineFraudRingSchema>;
export type DarkWebMarketplace = z.infer<typeof DarkWebMarketplaceSchema>;
export type CryptocurrencyTheft = z.infer<typeof CryptocurrencyTheftSchema>;
export type CybercrimeIntelligence = z.infer<typeof CybercrimeIntelligenceSchema>;
