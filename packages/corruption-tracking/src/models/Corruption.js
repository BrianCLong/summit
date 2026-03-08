"use strict";
/**
 * Corruption and Infiltration Tracking Models
 *
 * LEGAL NOTICE: For authorized law enforcement and integrity oversight use only.
 * All corruption investigations must comply with applicable laws and protections
 * for government officials' rights during investigations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CorruptionIntelligenceSchema = exports.InfiltrationNetworkSchema = exports.CorruptionCaseSchema = exports.CorruptionType = void 0;
const zod_1 = require("zod");
var CorruptionType;
(function (CorruptionType) {
    CorruptionType["BRIBERY"] = "BRIBERY";
    CorruptionType["EMBEZZLEMENT"] = "EMBEZZLEMENT";
    CorruptionType["EXTORTION"] = "EXTORTION";
    CorruptionType["NEPOTISM"] = "NEPOTISM";
    CorruptionType["PATRONAGE"] = "PATRONAGE";
    CorruptionType["KICKBACKS"] = "KICKBACKS";
    CorruptionType["CONTRACT_FRAUD"] = "CONTRACT_FRAUD";
    CorruptionType["CONFLICT_OF_INTEREST"] = "CONFLICT_OF_INTEREST";
    CorruptionType["INFLUENCE_PEDDLING"] = "INFLUENCE_PEDDLING";
    CorruptionType["VOTE_BUYING"] = "VOTE_BUYING";
    CorruptionType["MISAPPROPRIATION"] = "MISAPPROPRIATION";
    CorruptionType["ABUSE_OF_POWER"] = "ABUSE_OF_POWER";
})(CorruptionType || (exports.CorruptionType = CorruptionType = {}));
exports.CorruptionCaseSchema = zod_1.z.object({
    caseId: zod_1.z.string(),
    corruptionTypes: zod_1.z.array(zod_1.z.nativeEnum(CorruptionType)),
    // Involved parties
    corruptOfficials: zod_1.z.array(zod_1.z.object({
        entityId: zod_1.z.string(),
        position: zod_1.z.string(),
        agency: zod_1.z.string(),
        jurisdiction: zod_1.z.string(),
        allegations: zod_1.z.array(zod_1.z.string())
    })),
    privateSectorInvolvement: zod_1.z.array(zod_1.z.object({
        entityId: zod_1.z.string(),
        organization: zod_1.z.string(),
        role: zod_1.z.string(),
        benefit: zod_1.z.string()
    })).optional(),
    // Criminal organization ties
    organizedCrimeTies: zod_1.z.array(zod_1.z.object({
        organizationId: zod_1.z.string(),
        relationshipType: zod_1.z.string(),
        benefits: zod_1.z.array(zod_1.z.string())
    })).optional(),
    // Scheme details
    description: zod_1.z.string(),
    timeframe: zod_1.z.object({
        startDate: zod_1.z.date().optional(),
        endDate: zod_1.z.date().optional()
    }),
    // Financial details
    estimatedValue: zod_1.z.number().optional(),
    bribesAmount: zod_1.z.number().optional(),
    misappropriatedFunds: zod_1.z.number().optional(),
    // Evidence
    evidenceTypes: zod_1.z.array(zod_1.z.enum([
        'FINANCIAL_RECORDS',
        'COMMUNICATIONS',
        'WITNESS_TESTIMONY',
        'SURVEILLANCE',
        'UNDERCOVER_RECORDINGS',
        'BANK_RECORDS',
        'CONTRACTS',
        'DOCUMENTS'
    ])).optional(),
    // Investigation
    investigatingAgency: zod_1.z.string(),
    investigationStatus: zod_1.z.enum(['PRELIMINARY', 'ACTIVE', 'COMPLETED', 'PROSECUTED', 'DISMISSED']),
    prosecutions: zod_1.z.array(zod_1.z.object({
        defendant: zod_1.z.string(),
        charges: zod_1.z.array(zod_1.z.string()),
        status: zod_1.z.string(),
        outcome: zod_1.z.string().optional()
    })).optional()
});
exports.InfiltrationNetworkSchema = zod_1.z.object({
    networkId: zod_1.z.string(),
    infiltratedSector: zod_1.z.enum([
        'LAW_ENFORCEMENT',
        'JUDICIARY',
        'CUSTOMS_BORDER',
        'MILITARY',
        'POLITICAL',
        'REGULATORY_AGENCIES',
        'FINANCIAL_SECTOR',
        'LABOR_UNIONS',
        'PRIVATE_SECTOR'
    ]),
    // Criminal organization
    organizationId: zod_1.z.string(),
    organizationName: zod_1.z.string(),
    // Infiltrated positions
    infiltrators: zod_1.z.array(zod_1.z.object({
        entityId: zod_1.z.string(),
        position: zod_1.z.string(),
        agency: zod_1.z.string(),
        recruitmentDate: zod_1.z.date().optional(),
        recruitmentMethod: zod_1.z.enum(['PLACED', 'CORRUPTED', 'COERCED', 'IDEOLOGICAL', 'UNKNOWN']).optional(),
        services_provided: zod_1.z.array(zod_1.z.string())
    })),
    // Impact and benefits
    benefitsToOrganization: zod_1.z.array(zod_1.z.string()),
    compromisedOperations: zod_1.z.array(zod_1.z.string()).optional(),
    leakedInformation: zod_1.z.array(zod_1.z.string()).optional(),
    // Countermeasures
    detectionMethod: zod_1.z.string().optional(),
    counterIntelligenceOperations: zod_1.z.array(zod_1.z.string()).optional(),
    status: zod_1.z.enum(['ACTIVE', 'DISRUPTED', 'PROSECUTED', 'MONITORING'])
});
exports.CorruptionIntelligenceSchema = zod_1.z.object({
    id: zod_1.z.string(),
    // Legal compliance
    legalAuthorities: zod_1.z.array(zod_1.z.object({
        authorityType: zod_1.z.string(),
        authorizingAgency: zod_1.z.string(),
        caseNumber: zod_1.z.string(),
        issuedDate: zod_1.z.date()
    })),
    classificationLevel: zod_1.z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']),
    // Cases and networks
    corruptionCases: zod_1.z.array(exports.CorruptionCaseSchema),
    infiltrationNetworks: zod_1.z.array(exports.InfiltrationNetworkSchema).optional(),
    // Metadata
    investigatingAgencies: zod_1.z.array(zod_1.z.string()),
    intelligenceSources: zod_1.z.array(zod_1.z.string()),
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
