"use strict";
/**
 * Criminal Organization Tracking Models
 *
 * LEGAL NOTICE: This system is designed for authorized law enforcement,
 * intelligence, and military use only. All data collection and monitoring
 * must comply with applicable laws, regulations, and constitutional protections.
 *
 * Requirements:
 * - Proper legal authority (warrants, court orders, etc.)
 * - Judicial oversight where required
 * - Data minimization and retention policies
 * - Privacy protections for non-targets
 * - Audit logging of all access
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceValidator = exports.CriminalOrganizationSchema = exports.CriminalEnterpriseSchema = exports.LeadershipSuccessionSchema = exports.InterOrganizationRelationshipSchema = exports.OrganizationMemberSchema = exports.CriminalActivitySchema = exports.GeographicTerritorySchema = exports.AuditLogSchema = exports.LegalAuthoritySchema = exports.MemberRole = exports.OrganizationStatus = exports.ThreatLevel = exports.OrganizationType = void 0;
const zod_1 = require("zod");
var OrganizationType;
(function (OrganizationType) {
    OrganizationType["MAFIA"] = "MAFIA";
    OrganizationType["CARTEL"] = "CARTEL";
    OrganizationType["GANG"] = "GANG";
    OrganizationType["SYNDICATE"] = "SYNDICATE";
    OrganizationType["TERRORIST_ORGANIZATION"] = "TERRORIST_ORGANIZATION";
    OrganizationType["CYBERCRIME_GROUP"] = "CYBERCRIME_GROUP";
    OrganizationType["TRAFFICKING_NETWORK"] = "TRAFFICKING_NETWORK";
    OrganizationType["MONEY_LAUNDERING_RING"] = "MONEY_LAUNDERING_RING";
    OrganizationType["WEAPONS_TRAFFICKING_GROUP"] = "WEAPONS_TRAFFICKING_GROUP";
    OrganizationType["OTHER"] = "OTHER";
})(OrganizationType || (exports.OrganizationType = OrganizationType = {}));
var ThreatLevel;
(function (ThreatLevel) {
    ThreatLevel["LOW"] = "LOW";
    ThreatLevel["MODERATE"] = "MODERATE";
    ThreatLevel["HIGH"] = "HIGH";
    ThreatLevel["CRITICAL"] = "CRITICAL";
    ThreatLevel["EXTREME"] = "EXTREME";
})(ThreatLevel || (exports.ThreatLevel = ThreatLevel = {}));
var OrganizationStatus;
(function (OrganizationStatus) {
    OrganizationStatus["ACTIVE"] = "ACTIVE";
    OrganizationStatus["DORMANT"] = "DORMANT";
    OrganizationStatus["DISRUPTED"] = "DISRUPTED";
    OrganizationStatus["DISBANDED"] = "DISBANDED";
    OrganizationStatus["MONITORING"] = "MONITORING";
    OrganizationStatus["UNDER_INVESTIGATION"] = "UNDER_INVESTIGATION";
})(OrganizationStatus || (exports.OrganizationStatus = OrganizationStatus = {}));
var MemberRole;
(function (MemberRole) {
    MemberRole["LEADER"] = "LEADER";
    MemberRole["UNDERBOSS"] = "UNDERBOSS";
    MemberRole["LIEUTENANT"] = "LIEUTENANT";
    MemberRole["ENFORCER"] = "ENFORCER";
    MemberRole["SOLDIER"] = "SOLDIER";
    MemberRole["ASSOCIATE"] = "ASSOCIATE";
    MemberRole["COURIER"] = "COURIER";
    MemberRole["MONEY_HANDLER"] = "MONEY_HANDLER";
    MemberRole["UNKNOWN"] = "UNKNOWN";
})(MemberRole || (exports.MemberRole = MemberRole = {}));
exports.LegalAuthoritySchema = zod_1.z.object({
    authorityType: zod_1.z.enum(['WARRANT', 'COURT_ORDER', 'SUBPOENA', 'INTELLIGENCE_AUTHORIZATION', 'FISA', 'OTHER']),
    authorizingAgency: zod_1.z.string(),
    caseNumber: zod_1.z.string(),
    issuedDate: zod_1.z.date(),
    expirationDate: zod_1.z.date().optional(),
    scope: zod_1.z.string(),
    limitations: zod_1.z.string().optional(),
    renewals: zod_1.z.array(zod_1.z.object({
        renewedDate: zod_1.z.date(),
        newExpirationDate: zod_1.z.date(),
        authorizingOfficial: zod_1.z.string()
    })).optional()
});
exports.AuditLogSchema = zod_1.z.object({
    accessedBy: zod_1.z.string(), // User ID
    accessedAt: zod_1.z.date(),
    action: zod_1.z.enum(['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'SEARCH', 'EXPORT', 'SHARE']),
    ipAddress: zod_1.z.string(),
    userAgent: zod_1.z.string().optional(),
    justification: zod_1.z.string(),
    legalAuthority: zod_1.z.string() // Reference to legal authority
});
exports.GeographicTerritorySchema = zod_1.z.object({
    region: zod_1.z.string(),
    cities: zod_1.z.array(zod_1.z.string()),
    neighborhoods: zod_1.z.array(zod_1.z.string()).optional(),
    controlLevel: zod_1.z.enum(['FULL', 'PARTIAL', 'CONTESTED', 'EXPANDING', 'DECLINING']),
    establishedDate: zod_1.z.date().optional(),
    boundaryDescription: zod_1.z.string().optional()
});
exports.CriminalActivitySchema = zod_1.z.object({
    activityType: zod_1.z.enum([
        'DRUG_TRAFFICKING',
        'HUMAN_TRAFFICKING',
        'WEAPONS_TRAFFICKING',
        'MONEY_LAUNDERING',
        'EXTORTION',
        'RACKETEERING',
        'MURDER_FOR_HIRE',
        'KIDNAPPING',
        'ROBBERY',
        'CYBERCRIME',
        'FRAUD',
        'COUNTERFEITING',
        'SMUGGLING',
        'CORRUPTION',
        'OTHER'
    ]),
    description: zod_1.z.string(),
    estimatedRevenue: zod_1.z.number().optional(),
    frequency: zod_1.z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'SPORADIC', 'UNKNOWN']),
    locations: zod_1.z.array(zod_1.z.string()).optional(),
    knownVictims: zod_1.z.number().optional()
});
exports.OrganizationMemberSchema = zod_1.z.object({
    entityId: zod_1.z.string(), // Reference to Entity in main system
    role: zod_1.z.nativeEnum(MemberRole),
    joinedDate: zod_1.z.date().optional(),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE', 'DECEASED', 'INCARCERATED', 'COOPERATING', 'UNKNOWN']),
    loyalty: zod_1.z.enum(['HIGH', 'MEDIUM', 'LOW', 'QUESTIONABLE', 'UNKNOWN']).optional(),
    specialties: zod_1.z.array(zod_1.z.string()).optional(),
    rank: zod_1.z.number().optional(), // Hierarchical rank
    reportingTo: zod_1.z.string().optional(), // Member ID they report to
    controls: zod_1.z.array(zod_1.z.string()).optional(), // Member IDs they control
    arrestHistory: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.date(),
        charges: zod_1.z.array(zod_1.z.string()),
        outcome: zod_1.z.string()
    })).optional()
});
exports.InterOrganizationRelationshipSchema = zod_1.z.object({
    relatedOrganizationId: zod_1.z.string(),
    relationshipType: zod_1.z.enum([
        'ALLIED',
        'HOSTILE',
        'COMPETITIVE',
        'COOPERATIVE',
        'SUBORDINATE',
        'PARENT',
        'NEUTRAL',
        'UNKNOWN'
    ]),
    establishedDate: zod_1.z.date().optional(),
    description: zod_1.z.string().optional(),
    jointOperations: zod_1.z.array(zod_1.z.string()).optional(),
    conflicts: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.date(),
        description: zod_1.z.string(),
        casualties: zod_1.z.number().optional()
    })).optional()
});
exports.LeadershipSuccessionSchema = zod_1.z.object({
    previousLeader: zod_1.z.string(), // Entity ID
    currentLeader: zod_1.z.string(), // Entity ID
    transitionDate: zod_1.z.date(),
    transitionType: zod_1.z.enum(['NATURAL', 'ARREST', 'DEATH', 'COUP', 'RETIREMENT', 'UNKNOWN']),
    impactAssessment: zod_1.z.string().optional(),
    stabilityChange: zod_1.z.enum(['STRENGTHENED', 'WEAKENED', 'UNCHANGED', 'UNCLEAR'])
});
exports.CriminalEnterpriseSchema = zod_1.z.object({
    enterpriseName: zod_1.z.string(),
    frontBusinesses: zod_1.z.array(zod_1.z.object({
        businessName: zod_1.z.string(),
        businessType: zod_1.z.string(),
        location: zod_1.z.string(),
        legitimateRevenue: zod_1.z.number().optional(),
        illicitRevenue: zod_1.z.number().optional()
    })),
    diversificationAreas: zod_1.z.array(zod_1.z.string()),
    estimatedTotalRevenue: zod_1.z.number().optional(),
    assetHoldings: zod_1.z.array(zod_1.z.object({
        assetType: zod_1.z.string(),
        location: zod_1.z.string(),
        estimatedValue: zod_1.z.number().optional(),
        ownershipStructure: zod_1.z.string()
    })).optional()
});
exports.CriminalOrganizationSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    aliases: zod_1.z.array(zod_1.z.string()).optional(),
    organizationType: zod_1.z.nativeEnum(OrganizationType),
    status: zod_1.z.nativeEnum(OrganizationStatus),
    threatLevel: zod_1.z.nativeEnum(ThreatLevel),
    // Legal compliance
    legalAuthorities: zod_1.z.array(exports.LegalAuthoritySchema),
    classificationLevel: zod_1.z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']),
    handlingRestrictions: zod_1.z.array(zod_1.z.string()),
    // Organization details
    foundedDate: zod_1.z.date().optional(),
    originCountry: zod_1.z.string().optional(),
    primaryOperatingRegions: zod_1.z.array(zod_1.z.string()),
    estimatedMemberCount: zod_1.z.number().optional(),
    // Leadership and structure
    currentLeader: zod_1.z.string().optional(), // Entity ID
    leadershipStructure: zod_1.z.string().optional(),
    hierarchyLevels: zod_1.z.number().optional(),
    members: zod_1.z.array(exports.OrganizationMemberSchema),
    successionHistory: zod_1.z.array(exports.LeadershipSuccessionSchema).optional(),
    // Territory and operations
    territories: zod_1.z.array(exports.GeographicTerritorySchema),
    criminalActivities: zod_1.z.array(exports.CriminalActivitySchema),
    enterprises: zod_1.z.array(exports.CriminalEnterpriseSchema).optional(),
    // Relationships
    alliances: zod_1.z.array(exports.InterOrganizationRelationshipSchema).optional(),
    rivalries: zod_1.z.array(exports.InterOrganizationRelationshipSchema).optional(),
    splinterGroups: zod_1.z.array(zod_1.z.object({
        groupId: zod_1.z.string(),
        splitDate: zod_1.z.date(),
        reason: zod_1.z.string(),
        currentRelationship: zod_1.z.string()
    })).optional(),
    // Intelligence
    communicationMethods: zod_1.z.array(zod_1.z.string()).optional(),
    recruitmentMethods: zod_1.z.array(zod_1.z.string()).optional(),
    symbols: zod_1.z.array(zod_1.z.string()).optional(),
    initiation_rituals: zod_1.z.string().optional(),
    codeWords: zod_1.z.array(zod_1.z.string()).optional(),
    // Investigation support
    investigatingAgencies: zod_1.z.array(zod_1.z.string()),
    activeInvestigations: zod_1.z.array(zod_1.z.string()), // Case IDs
    prosecutions: zod_1.z.array(zod_1.z.object({
        caseId: zod_1.z.string(),
        defendants: zod_1.z.array(zod_1.z.string()),
        charges: zod_1.z.array(zod_1.z.string()),
        status: zod_1.z.string(),
        outcome: zod_1.z.string().optional()
    })).optional(),
    // Metadata
    intelligence_sources: zod_1.z.array(zod_1.z.string()),
    confidenceLevel: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'VERIFIED']),
    lastUpdated: zod_1.z.date(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    // Audit trail
    auditLog: zod_1.z.array(exports.AuditLogSchema)
});
/**
 * Privacy and compliance utilities
 */
class ComplianceValidator {
    static validateLegalAuthority(authority) {
        const now = new Date();
        if (authority.expirationDate && authority.expirationDate < now) {
            throw new Error('Legal authority has expired');
        }
        return true;
    }
    static validateDataAccess(organization, userId, action, justification) {
        // Verify active legal authority exists
        const hasValidAuthority = organization.legalAuthorities.some(auth => {
            try {
                return this.validateLegalAuthority(auth);
            }
            catch {
                return false;
            }
        });
        if (!hasValidAuthority) {
            throw new Error('No valid legal authority for accessing this organization data');
        }
        // Require justification for all access
        if (!justification || justification.trim().length < 10) {
            throw new Error('Detailed justification required for data access');
        }
        return true;
    }
    static logAccess(organization, userId, action, justification, legalAuthorityRef, ipAddress, userAgent) {
        const auditEntry = {
            accessedBy: userId,
            accessedAt: new Date(),
            action,
            ipAddress,
            userAgent,
            justification,
            legalAuthority: legalAuthorityRef
        };
        organization.auditLog.push(auditEntry);
        return auditEntry;
    }
}
exports.ComplianceValidator = ComplianceValidator;
