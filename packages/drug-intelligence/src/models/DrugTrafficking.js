"use strict";
/**
 * Drug Trafficking Intelligence Models
 *
 * LEGAL NOTICE: For authorized law enforcement use only.
 * All surveillance and data collection must comply with applicable laws.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrugTraffickingIntelligenceSchema = exports.DarkWebMarketSchema = exports.PrecursorTrackingSchema = exports.MoneyLaunderingOperationSchema = exports.DistributionNetworkSchema = exports.TraffickingRouteSchema = exports.ProductionFacilitySchema = exports.DrugType = void 0;
const zod_1 = require("zod");
var DrugType;
(function (DrugType) {
    DrugType["COCAINE"] = "COCAINE";
    DrugType["HEROIN"] = "HEROIN";
    DrugType["FENTANYL"] = "FENTANYL";
    DrugType["METHAMPHETAMINE"] = "METHAMPHETAMINE";
    DrugType["MARIJUANA"] = "MARIJUANA";
    DrugType["SYNTHETIC_OPIOIDS"] = "SYNTHETIC_OPIOIDS";
    DrugType["MDMA"] = "MDMA";
    DrugType["LSD"] = "LSD";
    DrugType["SYNTHETIC_CANNABINOIDS"] = "SYNTHETIC_CANNABINOIDS";
    DrugType["PRESCRIPTION_DRUGS"] = "PRESCRIPTION_DRUGS";
    DrugType["PRECURSOR_CHEMICALS"] = "PRECURSOR_CHEMICALS";
    DrugType["OTHER"] = "OTHER";
})(DrugType || (exports.DrugType = DrugType = {}));
exports.ProductionFacilitySchema = zod_1.z.object({
    facilityId: zod_1.z.string(),
    facilityType: zod_1.z.enum([
        'LABORATORY',
        'CULTIVATION_SITE',
        'PROCESSING_PLANT',
        'PILL_MILL',
        'STORAGE_WAREHOUSE',
        'CUTTING_HOUSE'
    ]),
    // Location (kept general for operational security)
    generalLocation: zod_1.z.string(), // Region/area only
    country: zod_1.z.string(),
    // Production details
    drugsProduced: zod_1.z.array(zod_1.z.nativeEnum(DrugType)),
    estimatedCapacity: zod_1.z.object({
        amount: zod_1.z.number(),
        unit: zod_1.z.enum(['KG', 'POUNDS', 'PILLS', 'PLANTS']),
        timeframe: zod_1.z.string() // e.g., "per month"
    }).optional(),
    // Operations
    operationalStatus: zod_1.z.enum(['ACTIVE', 'DORMANT', 'RAIDED', 'ABANDONED', 'UNKNOWN']),
    operators: zod_1.z.array(zod_1.z.string()), // Entity IDs
    controllingOrganization: zod_1.z.string().optional(), // Organization ID
    // Intelligence
    lastVerified: zod_1.z.date().optional(),
    surveillanceInPlace: zod_1.z.boolean().optional(),
    plannedRaids: zod_1.z.array(zod_1.z.string()).optional(), // Operation IDs
    // Security measures
    securityMeasures: zod_1.z.array(zod_1.z.string()).optional(),
    weaponsPresent: zod_1.z.boolean().optional()
});
exports.TraffickingRouteSchema = zod_1.z.object({
    routeId: zod_1.z.string(),
    drugTypes: zod_1.z.array(zod_1.z.nativeEnum(DrugType)),
    // Route details
    originCountry: zod_1.z.string(),
    originRegion: zod_1.z.string().optional(),
    transitCountries: zod_1.z.array(zod_1.z.string()),
    destinationCountry: zod_1.z.string(),
    destinationRegion: zod_1.z.string().optional(),
    // Transportation methods
    transportMethods: zod_1.z.array(zod_1.z.enum([
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
    concealmentMethods: zod_1.z.array(zod_1.z.string()).optional(),
    // Volume and frequency
    estimatedVolume: zod_1.z.object({
        amount: zod_1.z.number(),
        unit: zod_1.z.string(),
        timeframe: zod_1.z.string()
    }).optional(),
    // Key points
    borderCrossings: zod_1.z.array(zod_1.z.object({
        location: zod_1.z.string(),
        method: zod_1.z.string(),
        corruptOfficials: zod_1.z.array(zod_1.z.string()).optional() // Entity IDs
    })).optional(),
    handoffPoints: zod_1.z.array(zod_1.z.object({
        location: zod_1.z.string(),
        type: zod_1.z.enum(['TRANSFER', 'STORAGE', 'DISTRIBUTION', 'CUTTING'])
    })).optional(),
    // Control and operations
    controllingOrganization: zod_1.z.string().optional(),
    keyOperators: zod_1.z.array(zod_1.z.string()).optional(), // Entity IDs
    // Status
    activityLevel: zod_1.z.enum(['HIGH', 'MODERATE', 'LOW', 'DORMANT', 'DISRUPTED']),
    lastKnownShipment: zod_1.z.date().optional(),
    interdictions: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.date(),
        location: zod_1.z.string(),
        amount: zod_1.z.number(),
        unit: zod_1.z.string(),
        arrestsMade: zod_1.z.number()
    })).optional()
});
exports.DistributionNetworkSchema = zod_1.z.object({
    networkId: zod_1.z.string(),
    drugTypes: zod_1.z.array(zod_1.z.nativeEnum(DrugType)),
    operatingRegion: zod_1.z.string(),
    // Network structure
    tiers: zod_1.z.array(zod_1.z.object({
        level: zod_1.z.number(), // 1 = wholesale, 2 = mid-level, 3 = street-level
        description: zod_1.z.string(),
        operators: zod_1.z.array(zod_1.z.string()) // Entity IDs
    })),
    // Distribution points
    distributionPoints: zod_1.z.array(zod_1.z.object({
        location: zod_1.z.string(),
        type: zod_1.z.enum(['STASH_HOUSE', 'TRAP_HOUSE', 'DEALER_LOCATION', 'DROP_POINT']),
        operators: zod_1.z.array(zod_1.z.string()).optional()
    })).optional(),
    // Customer base
    estimatedCustomerBase: zod_1.z.number().optional(),
    targetDemographics: zod_1.z.array(zod_1.z.string()).optional(),
    // Financial
    estimatedRevenue: zod_1.z.number().optional(),
    pricingStructure: zod_1.z.array(zod_1.z.object({
        drugType: zod_1.z.nativeEnum(DrugType),
        wholesalePrice: zod_1.z.number().optional(),
        retailPrice: zod_1.z.number().optional(),
        unit: zod_1.z.string()
    })).optional(),
    // Connections
    supplierOrganizations: zod_1.z.array(zod_1.z.string()).optional(), // Organization IDs
    downstreamNetworks: zod_1.z.array(zod_1.z.string()).optional(), // Network IDs
    // Status
    status: zod_1.z.enum(['ACTIVE', 'DISRUPTED', 'DISMANTLED', 'MONITORING'])
});
exports.MoneyLaunderingOperationSchema = zod_1.z.object({
    operationId: zod_1.z.string(),
    linkedOrganization: zod_1.z.string(), // Organization ID
    // Money laundering methods
    methods: zod_1.z.array(zod_1.z.enum([
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
    frontBusinesses: zod_1.z.array(zod_1.z.object({
        businessName: zod_1.z.string(),
        businessType: zod_1.z.string(),
        location: zod_1.z.string(),
        role: zod_1.z.string()
    })).optional(),
    shellCompanies: zod_1.z.array(zod_1.z.object({
        companyName: zod_1.z.string(),
        jurisdiction: zod_1.z.string(),
        beneficialOwners: zod_1.z.array(zod_1.z.string()).optional() // Entity IDs
    })).optional(),
    financialInstitutions: zod_1.z.array(zod_1.z.object({
        institutionName: zod_1.z.string(),
        country: zod_1.z.string(),
        accountHolders: zod_1.z.array(zod_1.z.string()).optional(), // Entity IDs
        suspiciousActivityReports: zod_1.z.number().optional()
    })).optional(),
    // Volume
    estimatedVolume: zod_1.z.number().optional(), // USD
    timeframe: zod_1.z.string().optional(),
    // Investigations
    investigatingAgencies: zod_1.z.array(zod_1.z.string()),
    assetSeizures: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.date(),
        amount: zod_1.z.number(),
        assetType: zod_1.z.string(),
        location: zod_1.z.string()
    })).optional()
});
exports.PrecursorTrackingSchema = zod_1.z.object({
    chemicalName: zod_1.z.string(),
    chemicalId: zod_1.z.string(),
    casNumber: zod_1.z.string().optional(),
    // Usage
    usedForDrugs: zod_1.z.array(zod_1.z.nativeEnum(DrugType)),
    legitimateUses: zod_1.z.array(zod_1.z.string()).optional(),
    // Sources
    suppliers: zod_1.z.array(zod_1.z.object({
        supplierName: zod_1.z.string(),
        country: zod_1.z.string(),
        type: zod_1.z.enum(['LEGITIMATE', 'DIVERTED', 'ILLICIT']),
        entityId: zod_1.z.string().optional()
    })),
    // Trafficking
    diversion_methods: zod_1.z.array(zod_1.z.string()).optional(),
    smugglingRoutes: zod_1.z.array(zod_1.z.string()).optional(), // Route IDs
    // Monitoring
    regulatoryStatus: zod_1.z.enum(['SCHEDULED', 'CONTROLLED', 'MONITORED', 'UNREGULATED']),
    monitoringPrograms: zod_1.z.array(zod_1.z.string()).optional()
});
exports.DarkWebMarketSchema = zod_1.z.object({
    marketId: zod_1.z.string(),
    marketName: zod_1.z.string(),
    marketUrl: zod_1.z.string().optional(), // .onion address
    // Market details
    drugsOffered: zod_1.z.array(zod_1.z.nativeEnum(DrugType)),
    operationalStatus: zod_1.z.enum(['ACTIVE', 'EXIT_SCAM', 'LAW_ENFORCEMENT_SEIZED', 'OFFLINE', 'UNKNOWN']),
    // Vendors and operations
    knownVendors: zod_1.z.array(zod_1.z.object({
        vendorName: zod_1.z.string(),
        vendorId: zod_1.z.string(),
        entityId: zod_1.z.string().optional(), // If identified
        rating: zod_1.z.number().optional(),
        salesVolume: zod_1.z.number().optional()
    })).optional(),
    estimatedDailyTransactions: zod_1.z.number().optional(),
    estimatedRevenue: zod_1.z.number().optional(),
    // Payment methods
    paymentMethods: zod_1.z.array(zod_1.z.enum([
        'BITCOIN',
        'MONERO',
        'ETHEREUM',
        'OTHER_CRYPTO'
    ])),
    // Investigation
    investigatingAgencies: zod_1.z.array(zod_1.z.string()),
    undercoerOperations: zod_1.z.array(zod_1.z.string()).optional(), // Operation IDs
    identifiedOperators: zod_1.z.array(zod_1.z.string()).optional(), // Entity IDs
    // Takedowns
    takedownAttempts: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.date(),
        agency: zod_1.z.string(),
        outcome: zod_1.z.string()
    })).optional()
});
exports.DrugTraffickingIntelligenceSchema = zod_1.z.object({
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
    // Related entities
    organizationId: zod_1.z.string().optional(), // Criminal organization
    cartelName: zod_1.z.string().optional(),
    // Production
    productionFacilities: zod_1.z.array(exports.ProductionFacilitySchema),
    // Trafficking
    traffickingRoutes: zod_1.z.array(exports.TraffickingRouteSchema),
    // Distribution
    distributionNetworks: zod_1.z.array(exports.DistributionNetworkSchema),
    // Financial operations
    moneyLaunderingOperations: zod_1.z.array(exports.MoneyLaunderingOperationSchema),
    // Precursor tracking
    precursorChemicals: zod_1.z.array(exports.PrecursorTrackingSchema).optional(),
    // Dark web
    darkWebMarkets: zod_1.z.array(exports.DarkWebMarketSchema).optional(),
    // Intelligence
    investigatingAgencies: zod_1.z.array(zod_1.z.string()),
    internationalCooperation: zod_1.z.array(zod_1.z.object({
        country: zod_1.z.string(),
        agency: zod_1.z.string(),
        cooperationType: zod_1.z.string()
    })).optional(),
    intelligenceSources: zod_1.z.array(zod_1.z.string()),
    confidenceLevel: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'VERIFIED']),
    // Operations
    activeInvestigations: zod_1.z.array(zod_1.z.string()), // Case IDs
    plannedOperations: zod_1.z.array(zod_1.z.object({
        operationId: zod_1.z.string(),
        operationType: zod_1.z.enum(['RAID', 'INTERDICTION', 'UNDERCOVER', 'SURVEILLANCE', 'ASSET_SEIZURE']),
        status: zod_1.z.enum(['PLANNING', 'APPROVED', 'ACTIVE', 'COMPLETED']),
        targetDate: zod_1.z.date().optional()
    })).optional(),
    // Impact assessment
    seizureHistory: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.date(),
        drugType: zod_1.z.nativeEnum(DrugType),
        amount: zod_1.z.number(),
        unit: zod_1.z.string(),
        location: zod_1.z.string(),
        arrestsMade: zod_1.z.number().optional(),
        estimatedStreetValue: zod_1.z.number().optional()
    })).optional(),
    // Metadata
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    lastVerified: zod_1.z.date(),
    // Audit trail
    auditLog: zod_1.z.array(zod_1.z.object({
        accessedBy: zod_1.z.string(),
        accessedAt: zod_1.z.date(),
        action: zod_1.z.string(),
        justification: zod_1.z.string(),
        legalAuthority: zod_1.z.string()
    }))
});
