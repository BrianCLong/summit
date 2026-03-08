"use strict";
/**
 * Trafficking Network Intelligence Models
 *
 * LEGAL NOTICE: This system is for authorized law enforcement use only.
 * All monitoring must comply with applicable laws and include victim protection protocols.
 *
 * VICTIM PROTECTION REQUIREMENTS:
 * - Victim data must be handled with extreme sensitivity
 * - Access limited to authorized victim services personnel
 * - Victim safety is paramount - no data sharing that could endanger victims
 * - Comply with victim privacy rights and trauma-informed practices
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VictimProtectionValidator = exports.TraffickingNetworkSchema = exports.SafeHouseSchema = exports.DocumentFraudSchema = exports.RecruitmentMethodSchema = exports.TraffickingRouteSchema = exports.VictimProtectionSchema = exports.VictimStatus = exports.TraffickingType = void 0;
const zod_1 = require("zod");
var TraffickingType;
(function (TraffickingType) {
    TraffickingType["HUMAN_TRAFFICKING_SEX"] = "HUMAN_TRAFFICKING_SEX";
    TraffickingType["HUMAN_TRAFFICKING_LABOR"] = "HUMAN_TRAFFICKING_LABOR";
    TraffickingType["CHILD_EXPLOITATION"] = "CHILD_EXPLOITATION";
    TraffickingType["ORGAN_TRAFFICKING"] = "ORGAN_TRAFFICKING";
    TraffickingType["FORCED_MARRIAGE"] = "FORCED_MARRIAGE";
    TraffickingType["CHILD_SOLDIERS"] = "CHILD_SOLDIERS";
    TraffickingType["DOMESTIC_SERVITUDE"] = "DOMESTIC_SERVITUDE";
})(TraffickingType || (exports.TraffickingType = TraffickingType = {}));
var VictimStatus;
(function (VictimStatus) {
    VictimStatus["IDENTIFIED"] = "IDENTIFIED";
    VictimStatus["RECOVERED"] = "RECOVERED";
    VictimStatus["IN_SERVICES"] = "IN_SERVICES";
    VictimStatus["MISSING"] = "MISSING";
    VictimStatus["DECEASED"] = "DECEASED";
    VictimStatus["LOCATION_UNKNOWN"] = "LOCATION_UNKNOWN";
})(VictimStatus || (exports.VictimStatus = VictimStatus = {}));
exports.VictimProtectionSchema = zod_1.z.object({
    // Minimal victim data - protect victim privacy
    victimId: zod_1.z.string(), // Anonymous ID only
    ageRange: zod_1.z.enum(['CHILD', 'MINOR', 'ADULT', 'UNKNOWN']),
    gender: zod_1.z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']).optional(),
    nationality: zod_1.z.string().optional(),
    // Status and services
    status: zod_1.z.nativeEnum(VictimStatus),
    identifiedDate: zod_1.z.date().optional(),
    recoveredDate: zod_1.z.date().optional(),
    // Service provision
    servicesProvided: zod_1.z.array(zod_1.z.enum([
        'SHELTER',
        'MEDICAL_CARE',
        'MENTAL_HEALTH',
        'LEGAL_AID',
        'TRANSLATION',
        'FAMILY_REUNIFICATION',
        'WITNESS_PROTECTION',
        'OTHER'
    ])).optional(),
    serviceProvider: zod_1.z.string().optional(), // NGO/Agency providing services
    // Legal protections
    hasProtectionOrder: zod_1.z.boolean().optional(),
    inWitnessProtection: zod_1.z.boolean().optional(),
    // Access restrictions - victim data requires special authorization
    accessRestrictions: zod_1.z.array(zod_1.z.string()),
    victimConsentForDataUse: zod_1.z.boolean(),
    // Never include: names, addresses, specific locations, photos, or identifying details
    // All victim PII must be stored separately with maximum security
});
exports.TraffickingRouteSchema = zod_1.z.object({
    routeId: zod_1.z.string(),
    originCountry: zod_1.z.string(),
    transitCountries: zod_1.z.array(zod_1.z.string()),
    destinationCountry: zod_1.z.string(),
    // Route details
    transportMethods: zod_1.z.array(zod_1.z.enum([
        'AIR',
        'MARITIME',
        'LAND_VEHICLE',
        'RAIL',
        'FOOT',
        'MULTIPLE'
    ])),
    averageDuration: zod_1.z.string().optional(), // e.g., "2-4 weeks"
    estimatedFrequency: zod_1.z.string().optional(),
    // Border crossings
    borderCrossings: zod_1.z.array(zod_1.z.object({
        location: zod_1.z.string(),
        method: zod_1.z.enum(['LEGAL_ENTRY', 'ILLEGAL_CROSSING', 'FRAUDULENT_DOCS', 'SMUGGLING', 'UNKNOWN']),
        facilitators: zod_1.z.array(zod_1.z.string()).optional() // Entity IDs
    })),
    // Safe houses / waypoints
    waypoints: zod_1.z.array(zod_1.z.object({
        location: zod_1.z.string(), // General area only
        purpose: zod_1.z.enum(['SAFE_HOUSE', 'TRANSFER_POINT', 'HOLDING_LOCATION', 'DOCUMENT_PROCESSING']),
        controlledBy: zod_1.z.string().optional() // Entity or organization ID
    })).optional(),
    // Activity level
    activityStatus: zod_1.z.enum(['ACTIVE', 'DORMANT', 'DISRUPTED', 'UNKNOWN']),
    lastKnownActivity: zod_1.z.date().optional()
});
exports.RecruitmentMethodSchema = zod_1.z.object({
    method: zod_1.z.enum([
        'FALSE_EMPLOYMENT',
        'FALSE_MARRIAGE',
        'FALSE_EDUCATION',
        'ABDUCTION',
        'FAMILY_SOLD',
        'DEBT_BONDAGE',
        'ONLINE_GROOMING',
        'PEER_RECRUITMENT',
        'OTHER'
    ]),
    targetDemographics: zod_1.z.array(zod_1.z.string()),
    platforms: zod_1.z.array(zod_1.z.string()).optional(), // Social media, websites, etc.
    recruiters: zod_1.z.array(zod_1.z.string()).optional(), // Entity IDs
    geographicFocus: zod_1.z.array(zod_1.z.string()).optional()
});
exports.DocumentFraudSchema = zod_1.z.object({
    documentType: zod_1.z.enum([
        'PASSPORT',
        'VISA',
        'WORK_PERMIT',
        'BIRTH_CERTIFICATE',
        'ID_CARD',
        'TRAVEL_DOCUMENT',
        'OTHER'
    ]),
    fraudMethod: zod_1.z.enum([
        'COUNTERFEIT',
        'ALTERED',
        'STOLEN_BLANK',
        'FRAUDULENT_ISSUANCE',
        'IDENTITY_THEFT'
    ]),
    sourceCountry: zod_1.z.string().optional(),
    producers: zod_1.z.array(zod_1.z.string()).optional(), // Entity IDs
    estimatedQuality: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'PROFESSIONAL']).optional()
});
exports.SafeHouseSchema = zod_1.z.object({
    locationId: zod_1.z.string(),
    // Location kept vague to protect operations
    generalArea: zod_1.z.string(), // City/region only
    locationType: zod_1.z.enum([
        'RESIDENTIAL',
        'COMMERCIAL',
        'INDUSTRIAL',
        'RURAL',
        'HOTEL',
        'APARTMENT',
        'OTHER'
    ]),
    // Capacity and conditions
    estimatedCapacity: zod_1.z.number().optional(),
    conditions: zod_1.z.enum(['SEVERE', 'POOR', 'MODERATE', 'UNKNOWN']).optional(),
    // Control and security
    controlledBy: zod_1.z.string(), // Entity or organization ID
    securityMeasures: zod_1.z.array(zod_1.z.string()).optional(),
    // Operational status
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE', 'RAIDED', 'ABANDONED', 'UNKNOWN']),
    lastVerified: zod_1.z.date().optional(),
    // Investigation data
    surveillanceInPlace: zod_1.z.boolean().optional(),
    plannedOperations: zod_1.z.array(zod_1.z.string()).optional() // Operation IDs
});
exports.TraffickingNetworkSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    aliases: zod_1.z.array(zod_1.z.string()).optional(),
    // Legal compliance
    legalAuthorities: zod_1.z.array(zod_1.z.object({
        authorityType: zod_1.z.string(),
        authorizingAgency: zod_1.z.string(),
        caseNumber: zod_1.z.string(),
        issuedDate: zod_1.z.date(),
        expirationDate: zod_1.z.date().optional()
    })),
    classificationLevel: zod_1.z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']),
    // Network classification
    traffickingTypes: zod_1.z.array(zod_1.z.nativeEnum(TraffickingType)),
    operationalScale: zod_1.z.enum(['LOCAL', 'REGIONAL', 'NATIONAL', 'INTERNATIONAL', 'GLOBAL']),
    threatLevel: zod_1.z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']),
    // Organization structure
    organizationId: zod_1.z.string().optional(), // Link to criminal organization if applicable
    keyOperators: zod_1.z.array(zod_1.z.object({
        entityId: zod_1.z.string(),
        role: zod_1.z.enum([
            'LEADER',
            'RECRUITER',
            'TRANSPORTER',
            'ENFORCER',
            'DOCUMENT_FORGER',
            'FINANCIAL_HANDLER',
            'SAFE_HOUSE_OPERATOR',
            'CORRUPT_OFFICIAL',
            'OTHER'
        ]),
        status: zod_1.z.enum(['ACTIVE', 'ARRESTED', 'DECEASED', 'FUGITIVE', 'UNKNOWN'])
    })),
    // Victim data - HIGHLY RESTRICTED ACCESS
    victims: zod_1.z.array(exports.VictimProtectionSchema),
    estimatedVictimCount: zod_1.z.number().optional(),
    victimDemographics: zod_1.z.object({
        ageRanges: zod_1.z.array(zod_1.z.string()),
        genders: zod_1.z.array(zod_1.z.string()),
        nationalities: zod_1.z.array(zod_1.z.string())
    }).optional(),
    // Operations
    routes: zod_1.z.array(exports.TraffickingRouteSchema),
    recruitmentMethods: zod_1.z.array(exports.RecruitmentMethodSchema),
    documentFraud: zod_1.z.array(exports.DocumentFraudSchema).optional(),
    safeHouses: zod_1.z.array(exports.SafeHouseSchema).optional(),
    // Financial operations
    estimatedRevenue: zod_1.z.number().optional(),
    paymentMethods: zod_1.z.array(zod_1.z.string()).optional(),
    moneyLaunderingMethods: zod_1.z.array(zod_1.z.string()).optional(),
    // Intelligence and investigation
    investigatingAgencies: zod_1.z.array(zod_1.z.string()),
    internationalCooperation: zod_1.z.array(zod_1.z.object({
        country: zod_1.z.string(),
        agency: zod_1.z.string(),
        cooperationType: zod_1.z.string()
    })).optional(),
    intelligenceSources: zod_1.z.array(zod_1.z.string()),
    confidenceLevel: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'VERIFIED']),
    // Operations and disruption
    plannedOperations: zod_1.z.array(zod_1.z.object({
        operationId: zod_1.z.string(),
        operationType: zod_1.z.enum(['RESCUE', 'ARREST', 'SURVEILLANCE', 'INFILTRATION', 'ASSET_SEIZURE']),
        status: zod_1.z.enum(['PLANNING', 'APPROVED', 'ACTIVE', 'COMPLETED', 'ABORTED']),
        leadAgency: zod_1.z.string()
    })).optional(),
    disruptionHistory: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.date(),
        actionType: zod_1.z.enum(['ARRESTS', 'RESCUES', 'ASSET_SEIZURE', 'ROUTE_DISRUPTION', 'OTHER']),
        description: zod_1.z.string(),
        victimsRecovered: zod_1.z.number().optional(),
        arrestsMade: zod_1.z.number().optional(),
        impact: zod_1.z.enum(['MINOR', 'MODERATE', 'SIGNIFICANT', 'NETWORK_DISMANTLED'])
    })).optional(),
    // Metadata
    status: zod_1.z.enum(['ACTIVE', 'DISRUPTED', 'DISMANTLED', 'MONITORING']),
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
/**
 * Victim protection utilities - CRITICAL SAFEGUARDS
 */
class VictimProtectionValidator {
    /**
     * Validate that victim data access is properly authorized and restricted
     */
    static validateVictimAccess(userId, userRole) {
        // Only victim services, authorized investigators, and prosecutors
        const authorizedRoles = [
            'VICTIM_SERVICES',
            'LEAD_INVESTIGATOR',
            'PROSECUTOR',
            'AUTHORIZED_ANALYST'
        ];
        if (!authorizedRoles.includes(userRole)) {
            throw new Error('Unauthorized access to victim data - restricted to victim services and authorized personnel only');
        }
        return true;
    }
    /**
     * Redact victim identifying information for users without victim service authorization
     */
    static redactVictimData(network, userRole) {
        if (userRole !== 'VICTIM_SERVICES' && userRole !== 'LEAD_INVESTIGATOR') {
            // Remove all victim-specific data, keep only aggregated statistics
            return {
                ...network,
                victims: [], // Remove individual victim records
                victimDemographics: network.victimDemographics // Keep only aggregated demographics
            };
        }
        return network;
    }
    /**
     * Ensure victim consent is properly documented
     */
    static validateVictimConsent(victim) {
        if (!victim.victimConsentForDataUse) {
            throw new Error('Victim has not consented to data use - access restricted');
        }
        return true;
    }
}
exports.VictimProtectionValidator = VictimProtectionValidator;
