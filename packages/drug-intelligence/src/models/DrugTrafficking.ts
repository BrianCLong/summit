/**
 * Drug Trafficking Intelligence Models
 *
 * LEGAL NOTICE: For authorized law enforcement use only.
 * All surveillance and data collection must comply with applicable laws.
 */

import { z } from 'zod';

export enum DrugType {
  COCAINE = 'COCAINE',
  HEROIN = 'HEROIN',
  FENTANYL = 'FENTANYL',
  METHAMPHETAMINE = 'METHAMPHETAMINE',
  MARIJUANA = 'MARIJUANA',
  SYNTHETIC_OPIOIDS = 'SYNTHETIC_OPIOIDS',
  MDMA = 'MDMA',
  LSD = 'LSD',
  SYNTHETIC_CANNABINOIDS = 'SYNTHETIC_CANNABINOIDS',
  PRESCRIPTION_DRUGS = 'PRESCRIPTION_DRUGS',
  PRECURSOR_CHEMICALS = 'PRECURSOR_CHEMICALS',
  OTHER = 'OTHER'
}

export const ProductionFacilitySchema = z.object({
  facilityId: z.string(),
  facilityType: z.enum([
    'LABORATORY',
    'CULTIVATION_SITE',
    'PROCESSING_PLANT',
    'PILL_MILL',
    'STORAGE_WAREHOUSE',
    'CUTTING_HOUSE'
  ]),

  // Location (kept general for operational security)
  generalLocation: z.string(), // Region/area only
  country: z.string(),

  // Production details
  drugsProduced: z.array(z.nativeEnum(DrugType)),
  estimatedCapacity: z.object({
    amount: z.number(),
    unit: z.enum(['KG', 'POUNDS', 'PILLS', 'PLANTS']),
    timeframe: z.string() // e.g., "per month"
  }).optional(),

  // Operations
  operationalStatus: z.enum(['ACTIVE', 'DORMANT', 'RAIDED', 'ABANDONED', 'UNKNOWN']),
  operators: z.array(z.string()), // Entity IDs
  controllingOrganization: z.string().optional(), // Organization ID

  // Intelligence
  lastVerified: z.date().optional(),
  surveillanceInPlace: z.boolean().optional(),
  plannedRaids: z.array(z.string()).optional(), // Operation IDs

  // Security measures
  securityMeasures: z.array(z.string()).optional(),
  weaponsPresent: z.boolean().optional()
});

export const TraffickingRouteSchema = z.object({
  routeId: z.string(),
  drugTypes: z.array(z.nativeEnum(DrugType)),

  // Route details
  originCountry: z.string(),
  originRegion: z.string().optional(),
  transitCountries: z.array(z.string()),
  destinationCountry: z.string(),
  destinationRegion: z.string().optional(),

  // Transportation methods
  transportMethods: z.array(z.enum([
    'MARITIME_CONTAINER',
    'MARITIME_FISHING_VESSEL',
    'MARITIME_PLEASURE_CRAFT',
    'MARITIME_SUBMARINE',
    'AIR_COMMERCIAL',
    'AIR_PRIVATE',
    'AIR_DRONE',
    'LAND_COMMERCIAL_VEHICLE',
    'LAND_PRIVATE_VEHICLE',
    'LAND_RAIL',
    'BODY_CARRIER',
    'MAIL_PACKAGE',
    'MULTIPLE'
  ])),

  // Concealment methods
  concealmentMethods: z.array(z.string()).optional(),

  // Volume and frequency
  estimatedVolume: z.object({
    amount: z.number(),
    unit: z.string(),
    timeframe: z.string()
  }).optional(),

  // Key points
  borderCrossings: z.array(z.object({
    location: z.string(),
    method: z.string(),
    corruptOfficials: z.array(z.string()).optional() // Entity IDs
  })).optional(),

  handoffPoints: z.array(z.object({
    location: z.string(),
    type: z.enum(['TRANSFER', 'STORAGE', 'DISTRIBUTION', 'CUTTING'])
  })).optional(),

  // Control and operations
  controllingOrganization: z.string().optional(),
  keyOperators: z.array(z.string()).optional(), // Entity IDs

  // Status
  activityLevel: z.enum(['HIGH', 'MODERATE', 'LOW', 'DORMANT', 'DISRUPTED']),
  lastKnownShipment: z.date().optional(),
  interdictions: z.array(z.object({
    date: z.date(),
    location: z.string(),
    amount: z.number(),
    unit: z.string(),
    arrestsMade: z.number()
  })).optional()
});

export const DistributionNetworkSchema = z.object({
  networkId: z.string(),
  drugTypes: z.array(z.nativeEnum(DrugType)),
  operatingRegion: z.string(),

  // Network structure
  tiers: z.array(z.object({
    level: z.number(), // 1 = wholesale, 2 = mid-level, 3 = street-level
    description: z.string(),
    operators: z.array(z.string()) // Entity IDs
  })),

  // Distribution points
  distributionPoints: z.array(z.object({
    location: z.string(),
    type: z.enum(['STASH_HOUSE', 'TRAP_HOUSE', 'DEALER_LOCATION', 'DROP_POINT']),
    operators: z.array(z.string()).optional()
  })).optional(),

  // Customer base
  estimatedCustomerBase: z.number().optional(),
  targetDemographics: z.array(z.string()).optional(),

  // Financial
  estimatedRevenue: z.number().optional(),
  pricingStructure: z.array(z.object({
    drugType: z.nativeEnum(DrugType),
    wholesalePrice: z.number().optional(),
    retailPrice: z.number().optional(),
    unit: z.string()
  })).optional(),

  // Connections
  supplierOrganizations: z.array(z.string()).optional(), // Organization IDs
  downstreamNetworks: z.array(z.string()).optional(), // Network IDs

  // Status
  status: z.enum(['ACTIVE', 'DISRUPTED', 'DISMANTLED', 'MONITORING'])
});

export const MoneyLaunderingOperationSchema = z.object({
  operationId: z.string(),
  linkedOrganization: z.string(), // Organization ID

  // Money laundering methods
  methods: z.array(z.enum([
    'BULK_CASH_SMUGGLING',
    'TRADE_BASED',
    'REAL_ESTATE',
    'BUSINESSES_FRONTS',
    'CASINOS',
    'CRYPTOCURRENCY',
    'SHELL_COMPANIES',
    'STRUCTURING_SMURFING',
    'WIRE_TRANSFERS',
    'MONEY_SERVICE_BUSINESSES',
    'TRADE_MISINVOICING',
    'BLACK_MARKET_PESO_EXCHANGE'
  ])),

  // Financial infrastructure
  frontBusinesses: z.array(z.object({
    businessName: z.string(),
    businessType: z.string(),
    location: z.string(),
    role: z.string()
  })).optional(),

  shellCompanies: z.array(z.object({
    companyName: z.string(),
    jurisdiction: z.string(),
    beneficialOwners: z.array(z.string()).optional() // Entity IDs
  })).optional(),

  financialInstitutions: z.array(z.object({
    institutionName: z.string(),
    country: z.string(),
    accountHolders: z.array(z.string()).optional(), // Entity IDs
    suspiciousActivityReports: z.number().optional()
  })).optional(),

  // Volume
  estimatedVolume: z.number().optional(), // USD
  timeframe: z.string().optional(),

  // Investigations
  investigatingAgencies: z.array(z.string()),
  assetSeizures: z.array(z.object({
    date: z.date(),
    amount: z.number(),
    assetType: z.string(),
    location: z.string()
  })).optional()
});

export const PrecursorTrackingSchema = z.object({
  chemicalName: z.string(),
  chemicalId: z.string(),
  casNumber: z.string().optional(),

  // Usage
  usedForDrugs: z.array(z.nativeEnum(DrugType)),
  legitimateUses: z.array(z.string()).optional(),

  // Sources
  suppliers: z.array(z.object({
    supplierName: z.string(),
    country: z.string(),
    type: z.enum(['LEGITIMATE', 'DIVERTED', 'ILLICIT']),
    entityId: z.string().optional()
  })),

  // Trafficking
  diversion_methods: z.array(z.string()).optional(),
  smugglingRoutes: z.array(z.string()).optional(), // Route IDs

  // Monitoring
  regulatoryStatus: z.enum(['SCHEDULED', 'CONTROLLED', 'MONITORED', 'UNREGULATED']),
  monitoringPrograms: z.array(z.string()).optional()
});

export const DarkWebMarketSchema = z.object({
  marketId: z.string(),
  marketName: z.string(),
  marketUrl: z.string().optional(), // .onion address

  // Market details
  drugsOffered: z.array(z.nativeEnum(DrugType)),
  operationalStatus: z.enum(['ACTIVE', 'EXIT_SCAM', 'LAW_ENFORCEMENT_SEIZED', 'OFFLINE', 'UNKNOWN']),

  // Vendors and operations
  knownVendors: z.array(z.object({
    vendorName: z.string(),
    vendorId: z.string(),
    entityId: z.string().optional(), // If identified
    rating: z.number().optional(),
    salesVolume: z.number().optional()
  })).optional(),

  estimatedDailyTransactions: z.number().optional(),
  estimatedRevenue: z.number().optional(),

  // Payment methods
  paymentMethods: z.array(z.enum([
    'BITCOIN',
    'MONERO',
    'ETHEREUM',
    'OTHER_CRYPTO'
  ])),

  // Investigation
  investigatingAgencies: z.array(z.string()),
  undercoerOperations: z.array(z.string()).optional(), // Operation IDs
  identifiedOperators: z.array(z.string()).optional(), // Entity IDs

  // Takedowns
  takedownAttempts: z.array(z.object({
    date: z.date(),
    agency: z.string(),
    outcome: z.string()
  })).optional()
});

export const DrugTraffickingIntelligenceSchema = z.object({
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

  // Related entities
  organizationId: z.string().optional(), // Criminal organization
  cartelName: z.string().optional(),

  // Production
  productionFacilities: z.array(ProductionFacilitySchema),

  // Trafficking
  traffickingRoutes: z.array(TraffickingRouteSchema),

  // Distribution
  distributionNetworks: z.array(DistributionNetworkSchema),

  // Financial operations
  moneyLaunderingOperations: z.array(MoneyLaunderingOperationSchema),

  // Precursor tracking
  precursorChemicals: z.array(PrecursorTrackingSchema).optional(),

  // Dark web
  darkWebMarkets: z.array(DarkWebMarketSchema).optional(),

  // Intelligence
  investigatingAgencies: z.array(z.string()),
  internationalCooperation: z.array(z.object({
    country: z.string(),
    agency: z.string(),
    cooperationType: z.string()
  })).optional(),

  intelligenceSources: z.array(z.string()),
  confidenceLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'VERIFIED']),

  // Operations
  activeInvestigations: z.array(z.string()), // Case IDs
  plannedOperations: z.array(z.object({
    operationId: z.string(),
    operationType: z.enum(['RAID', 'INTERDICTION', 'UNDERCOVER', 'SURVEILLANCE', 'ASSET_SEIZURE']),
    status: z.enum(['PLANNING', 'APPROVED', 'ACTIVE', 'COMPLETED']),
    targetDate: z.date().optional()
  })).optional(),

  // Impact assessment
  seizureHistory: z.array(z.object({
    date: z.date(),
    drugType: z.nativeEnum(DrugType),
    amount: z.number(),
    unit: z.string(),
    location: z.string(),
    arrestsMade: z.number().optional(),
    estimatedStreetValue: z.number().optional()
  })).optional(),

  // Metadata
  createdAt: z.date(),
  updatedAt: z.date(),
  lastVerified: z.date(),

  // Audit trail
  auditLog: z.array(z.object({
    accessedBy: z.string(),
    accessedAt: z.date(),
    action: z.string(),
    justification: z.string(),
    legalAuthority: z.string()
  }))
});

export type ProductionFacility = z.infer<typeof ProductionFacilitySchema>;
export type TraffickingRoute = z.infer<typeof TraffickingRouteSchema>;
export type DistributionNetwork = z.infer<typeof DistributionNetworkSchema>;
export type MoneyLaunderingOperation = z.infer<typeof MoneyLaunderingOperationSchema>;
export type PrecursorTracking = z.infer<typeof PrecursorTrackingSchema>;
export type DarkWebMarket = z.infer<typeof DarkWebMarketSchema>;
export type DrugTraffickingIntelligence = z.infer<typeof DrugTraffickingIntelligenceSchema>;
