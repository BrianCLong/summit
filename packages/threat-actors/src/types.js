"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diamondModelSchema = exports.ttpSchema = exports.campaignSchema = exports.threatActorSchema = exports.motivationEnum = exports.sophisticationLevelEnum = exports.threatActorTypeEnum = void 0;
const zod_1 = require("zod");
/**
 * Threat Actor Types
 */
exports.threatActorTypeEnum = zod_1.z.enum([
    'NATION_STATE',
    'APT',
    'CYBERCRIMINAL',
    'HACKTIVIST',
    'INSIDER',
    'TERRORIST',
    'UNKNOWN',
]);
exports.sophisticationLevelEnum = zod_1.z.enum([
    'NOVICE',
    'INTERMEDIATE',
    'ADVANCED',
    'EXPERT',
    'STRATEGIC',
]);
exports.motivationEnum = zod_1.z.enum([
    'ESPIONAGE',
    'FINANCIAL_GAIN',
    'SABOTAGE',
    'IDEOLOGY',
    'REVENGE',
    'NOTORIETY',
    'UNKNOWN',
]);
/**
 * Threat Actor Schema
 */
exports.threatActorSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    aliases: zod_1.z.array(zod_1.z.string()).default([]),
    type: exports.threatActorTypeEnum,
    // Classification
    sophisticationLevel: exports.sophisticationLevelEnum,
    primaryMotivation: exports.motivationEnum,
    secondaryMotivations: zod_1.z.array(exports.motivationEnum).default([]),
    // Attribution
    country: zod_1.z.string().optional(),
    region: zod_1.z.string().optional(),
    sponsors: zod_1.z.array(zod_1.z.string()).default([]),
    affiliations: zod_1.z.array(zod_1.z.string()).default([]),
    // Description
    description: zod_1.z.string().optional(),
    objectives: zod_1.z.array(zod_1.z.string()).default([]),
    // Targeting
    targetedSectors: zod_1.z.array(zod_1.z.string()).default([]),
    targetedCountries: zod_1.z.array(zod_1.z.string()).default([]),
    targetedTechnologies: zod_1.z.array(zod_1.z.string()).default([]),
    // TTPs (Tactics, Techniques, and Procedures)
    tactics: zod_1.z.array(zod_1.z.string()).default([]),
    techniques: zod_1.z.array(zod_1.z.string()).default([]),
    procedures: zod_1.z.array(zod_1.z.string()).default([]),
    // MITRE ATT&CK mapping
    mitreAttackTactics: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        url: zod_1.z.string().optional(),
    })).default([]),
    mitreAttackTechniques: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        url: zod_1.z.string().optional(),
        subtechniques: zod_1.z.array(zod_1.z.string()).default([]),
    })).default([]),
    // Tools and infrastructure
    tools: zod_1.z.array(zod_1.z.string()).default([]),
    malwareFamilies: zod_1.z.array(zod_1.z.string()).default([]),
    infrastructure: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['C2', 'HOSTING', 'VPN', 'PROXY', 'DNS']),
        value: zod_1.z.string(),
        active: zod_1.z.boolean(),
        firstSeen: zod_1.z.string().datetime(),
        lastSeen: zod_1.z.string().datetime(),
    })).default([]),
    // Campaigns
    campaigns: zod_1.z.array(zod_1.z.string()).default([]),
    // Capability assessment
    capabilities: zod_1.z.object({
        reconnaissance: zod_1.z.number().min(0).max(100),
        weaponization: zod_1.z.number().min(0).max(100),
        delivery: zod_1.z.number().min(0).max(100),
        exploitation: zod_1.z.number().min(0).max(100),
        installation: zod_1.z.number().min(0).max(100),
        commandControl: zod_1.z.number().min(0).max(100),
        actionsOnObjectives: zod_1.z.number().min(0).max(100),
    }).optional(),
    // Activity
    active: zod_1.z.boolean().default(true),
    firstSeen: zod_1.z.string().datetime(),
    lastSeen: zod_1.z.string().datetime(),
    // Confidence
    confidence: zod_1.z.number().min(0).max(100),
    // References
    references: zod_1.z.array(zod_1.z.object({
        title: zod_1.z.string(),
        url: zod_1.z.string().url(),
        date: zod_1.z.string().datetime().optional(),
    })).default([]),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
/**
 * Campaign Schema
 */
exports.campaignSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    aliases: zod_1.z.array(zod_1.z.string()).default([]),
    description: zod_1.z.string().optional(),
    // Attribution
    threatActors: zod_1.z.array(zod_1.z.string()).default([]),
    confidence: zod_1.z.number().min(0).max(100),
    // Objectives
    objectives: zod_1.z.array(zod_1.z.string()).default([]),
    targets: zod_1.z.array(zod_1.z.object({
        sector: zod_1.z.string(),
        country: zod_1.z.string().optional(),
        organization: zod_1.z.string().optional(),
    })).default([]),
    // TTPs
    tactics: zod_1.z.array(zod_1.z.string()).default([]),
    techniques: zod_1.z.array(zod_1.z.string()).default([]),
    // Tools and malware
    tools: zod_1.z.array(zod_1.z.string()).default([]),
    malware: zod_1.z.array(zod_1.z.string()).default([]),
    // Infrastructure
    infrastructure: zod_1.z.array(zod_1.z.string()).default([]),
    iocs: zod_1.z.array(zod_1.z.string()).default([]),
    // Timeline
    firstActivity: zod_1.z.string().datetime(),
    lastActivity: zod_1.z.string().datetime(),
    active: zod_1.z.boolean().default(true),
    // Impact
    estimatedVictims: zod_1.z.number().int().optional(),
    estimatedDamage: zod_1.z.string().optional(),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
/**
 * TTP (Tactics, Techniques, and Procedures) Schema
 */
exports.ttpSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    type: zod_1.z.enum(['TACTIC', 'TECHNIQUE', 'PROCEDURE']),
    // MITRE ATT&CK
    mitreId: zod_1.z.string().optional(),
    mitreUrl: zod_1.z.string().url().optional(),
    // Relationships
    parentId: zod_1.z.string().optional(),
    relatedTtps: zod_1.z.array(zod_1.z.string()).default([]),
    // Detection
    detectionMethods: zod_1.z.array(zod_1.z.string()).default([]),
    mitigations: zod_1.z.array(zod_1.z.string()).default([]),
    // Usage
    threatActors: zod_1.z.array(zod_1.z.string()).default([]),
    campaigns: zod_1.z.array(zod_1.z.string()).default([]),
    malwareFamilies: zod_1.z.array(zod_1.z.string()).default([]),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
/**
 * Diamond Model Schema
 */
exports.diamondModelSchema = zod_1.z.object({
    id: zod_1.z.string(),
    eventId: zod_1.z.string(),
    // Core features
    adversary: zod_1.z.object({
        id: zod_1.z.string().optional(),
        name: zod_1.z.string().optional(),
        type: exports.threatActorTypeEnum.optional(),
    }),
    capability: zod_1.z.object({
        description: zod_1.z.string(),
        tools: zod_1.z.array(zod_1.z.string()).default([]),
        techniques: zod_1.z.array(zod_1.z.string()).default([]),
    }),
    infrastructure: zod_1.z.object({
        type: zod_1.z.string(),
        value: zod_1.z.string(),
        description: zod_1.z.string().optional(),
    }),
    victim: zod_1.z.object({
        name: zod_1.z.string().optional(),
        sector: zod_1.z.string().optional(),
        country: zod_1.z.string().optional(),
        asset: zod_1.z.string().optional(),
    }),
    // Meta-features
    timestamp: zod_1.z.string().datetime(),
    phase: zod_1.z.string().optional(),
    result: zod_1.z.string().optional(),
    direction: zod_1.z.enum(['ADVERSARY_TO_INFRASTRUCTURE', 'INFRASTRUCTURE_TO_VICTIM', 'ADVERSARY_TO_VICTIM']).optional(),
    methodology: zod_1.z.string().optional(),
    resources: zod_1.z.array(zod_1.z.string()).default([]),
    confidence: zod_1.z.number().min(0).max(100),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
