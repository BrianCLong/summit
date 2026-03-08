"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TechintAnalyzer = exports.masintCollectionSchema = exports.cyberIntelOperationSchema = exports.imintCollectionSchema = exports.sigintCollectionSchema = void 0;
const zod_1 = require("zod");
/**
 * Technical Intelligence Operations
 *
 * Analysis and tracking of technical intelligence collection including
 * SIGINT, IMINT, MASINT, cyber operations, and technical surveillance.
 */
// ============================================================================
// SIGNALS INTELLIGENCE (SIGINT)
// ============================================================================
exports.sigintCollectionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    collectionName: zod_1.z.string(),
    collectionType: zod_1.z.enum(['COMINT', 'ELINT', 'FISINT']), // Communications, Electronic, Foreign Instrumentation
    targetSystems: zod_1.z.array(zod_1.z.object({
        systemName: zod_1.z.string(),
        systemType: zod_1.z.string(),
        frequency: zod_1.z.string().optional(),
        encryption: zod_1.z.boolean(),
        priority: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    })).default([]),
    collectionPlatforms: zod_1.z.array(zod_1.z.object({
        platformId: zod_1.z.string().uuid(),
        platformType: zod_1.z.enum([
            'SATELLITE',
            'AIRCRAFT',
            'SHIP',
            'GROUND_STATION',
            'SUBMARINE',
            'UAV',
            'TACTICAL',
        ]),
        location: zod_1.z.string().optional(),
        capabilities: zod_1.z.array(zod_1.z.string()),
        operational: zod_1.z.boolean(),
    })).default([]),
    frequencySpectrum: zod_1.z.array(zod_1.z.object({
        startFrequency: zod_1.z.string(),
        endFrequency: zod_1.z.string(),
        band: zod_1.z.string(),
        usage: zod_1.z.string(),
        activityLevel: zod_1.z.enum(['VERY_HIGH', 'HIGH', 'MODERATE', 'LOW', 'MINIMAL']),
    })).default([]),
    collectedData: zod_1.z.object({
        volume: zod_1.z.number(), // GB or TB
        quality: zod_1.z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']),
        exploitationRate: zod_1.z.number().min(0).max(1), // Percentage processed
        timelyReporting: zod_1.z.number().min(0).max(1), // Percentage reported within SLA
    }).optional(),
    processingCapabilities: zod_1.z.object({
        realTime: zod_1.z.boolean(),
        automated: zod_1.z.boolean(),
        languageSupport: zod_1.z.array(zod_1.z.string()),
        decryptionCapability: zod_1.z.boolean(),
    }).optional(),
    intelligence: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.string().datetime(),
        summary: zod_1.z.string(),
        significance: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
        dissemination: zod_1.z.array(zod_1.z.string()),
    })).default([]),
    targetedEntities: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    status: zod_1.z.enum(['ACTIVE', 'ONGOING', 'PAUSED', 'COMPLETED', 'TERMINATED']),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// IMAGERY INTELLIGENCE (IMINT)
// ============================================================================
exports.imintCollectionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    collectionName: zod_1.z.string(),
    imageryType: zod_1.z.enum([
        'VISIBLE',
        'INFRARED',
        'MULTISPECTRAL',
        'HYPERSPECTRAL',
        'RADAR',
        'SAR', // Synthetic Aperture Radar
        'ELECTRO_OPTICAL',
    ]),
    collectionPlatforms: zod_1.z.array(zod_1.z.object({
        platformId: zod_1.z.string().uuid(),
        platformType: zod_1.z.enum([
            'SATELLITE',
            'AIRCRAFT',
            'UAV',
            'BALLOON',
            'TACTICAL',
        ]),
        altitude: zod_1.z.number().optional(),
        resolution: zod_1.z.string(),
        coverage: zod_1.z.string(),
    })).default([]),
    targetAreas: zod_1.z.array(zod_1.z.object({
        areaName: zod_1.z.string(),
        coordinates: zod_1.z.object({
            latitude: zod_1.z.number(),
            longitude: zod_1.z.number(),
        }).optional(),
        priority: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
        collectionFrequency: zod_1.z.string(),
        lastCollected: zod_1.z.string().datetime().optional(),
    })).default([]),
    targets: zod_1.z.array(zod_1.z.object({
        targetId: zod_1.z.string().uuid(),
        targetType: zod_1.z.string(),
        location: zod_1.z.string(),
        changeDetection: zod_1.z.boolean(),
        annotationsCount: zod_1.z.number(),
    })).default([]),
    imageAnalysis: zod_1.z.array(zod_1.z.object({
        imageId: zod_1.z.string().uuid(),
        analysisDate: zod_1.z.string().datetime(),
        analystId: zod_1.z.string().uuid(),
        findings: zod_1.z.array(zod_1.z.string()),
        confidence: zod_1.z.enum(['HIGH', 'MEDIUM', 'LOW']),
        reportId: zod_1.z.string().uuid().optional(),
    })).default([]),
    automatedAnalysis: zod_1.z.object({
        enabled: zod_1.z.boolean(),
        algorithms: zod_1.z.array(zod_1.z.string()),
        accuracy: zod_1.z.number().min(0).max(1),
        objectsDetected: zod_1.z.number(),
    }).optional(),
    collectionQuality: zod_1.z.object({
        cloudCover: zod_1.z.number().min(0).max(100),
        atmosphericConditions: zod_1.z.string(),
        imageQuality: zod_1.z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']),
    }).optional(),
    status: zod_1.z.enum(['ACTIVE', 'ONGOING', 'PAUSED', 'COMPLETED', 'TERMINATED']),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// CYBER INTELLIGENCE
// ============================================================================
exports.cyberIntelOperationSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    operationName: zod_1.z.string(),
    sponsoringAgency: zod_1.z.string().uuid(),
    operationType: zod_1.z.enum([
        'NETWORK_EXPLOITATION',
        'COMPUTER_NETWORK_ATTACK',
        'COMPUTER_NETWORK_DEFENSE',
        'ADVANCED_PERSISTENT_THREAT',
        'ZERO_DAY_EXPLOITATION',
        'SUPPLY_CHAIN_COMPROMISE',
        'RANSOMWARE',
        'DATA_EXFILTRATION',
    ]),
    targets: zod_1.z.array(zod_1.z.object({
        targetName: zod_1.z.string(),
        targetType: zod_1.z.enum(['NETWORK', 'SYSTEM', 'APPLICATION', 'ORGANIZATION', 'INDIVIDUAL']),
        sector: zod_1.z.string(),
        criticalityLevel: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
        compromised: zod_1.z.boolean(),
        compromiseDate: zod_1.z.string().datetime().optional(),
    })).default([]),
    ttps: zod_1.z.array(zod_1.z.object({
        tactic: zod_1.z.string(),
        technique: zod_1.z.string(),
        procedure: zod_1.z.string(),
        mitreId: zod_1.z.string().optional(), // MITRE ATT&CK ID
        frequency: zod_1.z.enum(['ROUTINE', 'COMMON', 'OCCASIONAL', 'RARE']),
    })).default([]),
    infrastructure: zod_1.z.array(zod_1.z.object({
        infrastructureType: zod_1.z.enum([
            'C2_SERVER',
            'MALWARE_HOST',
            'PHISHING_SITE',
            'PROXY',
            'VPN',
            'TOR_NODE',
            'STAGING_SERVER',
        ]),
        address: zod_1.z.string(),
        active: zod_1.z.boolean(),
        firstSeen: zod_1.z.string().datetime(),
        lastSeen: zod_1.z.string().datetime().optional(),
    })).default([]),
    malware: zod_1.z.array(zod_1.z.object({
        malwareName: zod_1.z.string(),
        malwareType: zod_1.z.enum([
            'BACKDOOR',
            'TROJAN',
            'ROOTKIT',
            'RANSOMWARE',
            'SPYWARE',
            'WIPER',
            'LOADER',
            'DROPPER',
        ]),
        hash: zod_1.z.string().optional(),
        capabilities: zod_1.z.array(zod_1.z.string()),
        sophistication: zod_1.z.enum(['ADVANCED', 'MODERATE', 'BASIC']),
    })).default([]),
    attribution: zod_1.z.object({
        confidence: zod_1.z.enum(['HIGH', 'MEDIUM', 'LOW']),
        indicators: zod_1.z.array(zod_1.z.string()),
        relatedCampaigns: zod_1.z.array(zod_1.z.string().uuid()),
        codeOverlap: zod_1.z.number().min(0).max(1).optional(),
        infrastructureOverlap: zod_1.z.number().min(0).max(1).optional(),
    }).optional(),
    impact: zod_1.z.object({
        dataExfiltrated: zod_1.z.string().optional(),
        systemsCompromised: zod_1.z.number(),
        dwellTime: zod_1.z.number(), // days
        estimatedDamage: zod_1.z.number().optional(),
    }).optional(),
    defensiveMeasures: zod_1.z.array(zod_1.z.object({
        measure: zod_1.z.string(),
        implementedBy: zod_1.z.string(),
        effectiveness: zod_1.z.enum(['EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE']),
    })).default([]),
    status: zod_1.z.enum(['ACTIVE', 'ONGOING', 'CONTAINED', 'REMEDIATED', 'TERMINATED']),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
// ============================================================================
// MEASUREMENT AND SIGNATURE INTELLIGENCE (MASINT)
// ============================================================================
exports.masintCollectionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    collectionName: zod_1.z.string(),
    masintType: zod_1.z.enum([
        'RADAR',
        'ACOUSTIC',
        'NUCLEAR',
        'CHEMICAL',
        'BIOLOGICAL',
        'SEISMIC',
        'MATERIALS',
        'RADIOMETRIC',
        'ELECTRO_OPTICAL',
    ]),
    sensors: zod_1.z.array(zod_1.z.object({
        sensorId: zod_1.z.string().uuid(),
        sensorType: zod_1.z.string(),
        location: zod_1.z.string().optional(),
        sensitivity: zod_1.z.string(),
        coverage: zod_1.z.string(),
        operational: zod_1.z.boolean(),
    })).default([]),
    targets: zod_1.z.array(zod_1.z.object({
        targetName: zod_1.z.string(),
        targetType: zod_1.z.string(),
        signatures: zod_1.z.array(zod_1.z.object({
            signatureType: zod_1.z.string(),
            value: zod_1.z.string(),
            confidence: zod_1.z.number().min(0).max(1),
        })),
    })).default([]),
    measurements: zod_1.z.array(zod_1.z.object({
        timestamp: zod_1.z.string().datetime(),
        measurementType: zod_1.z.string(),
        value: zod_1.z.number(),
        unit: zod_1.z.string(),
        quality: zod_1.z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']),
        significance: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    })).default([]),
    analysis: zod_1.z.array(zod_1.z.object({
        date: zod_1.z.string().datetime(),
        analystId: zod_1.z.string().uuid(),
        findings: zod_1.z.string(),
        assessment: zod_1.z.string(),
        confidence: zod_1.z.enum(['HIGH', 'MEDIUM', 'LOW']),
    })).default([]),
    status: zod_1.z.enum(['ACTIVE', 'ONGOING', 'PAUSED', 'COMPLETED', 'TERMINATED']),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
});
class TechintAnalyzer {
    config;
    constructor(config = {}) {
        this.config = {
            enableSigint: config.enableSigint ?? true,
            enableImint: config.enableImint ?? true,
            enableCyberInt: config.enableCyberInt ?? true,
            enableMasint: config.enableMasint ?? true,
            automatedAnalysis: config.automatedAnalysis ?? true,
        };
    }
    /**
     * Create SIGINT collection operation
     */
    createSigintCollection(data) {
        if (!this.config.enableSigint) {
            throw new Error('SIGINT collection is disabled');
        }
        return exports.sigintCollectionSchema.parse({
            ...data,
            id: data.id || crypto.randomUUID(),
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
        });
    }
    /**
     * Create IMINT collection operation
     */
    createImintCollection(data) {
        if (!this.config.enableImint) {
            throw new Error('IMINT collection is disabled');
        }
        return exports.imintCollectionSchema.parse({
            ...data,
            id: data.id || crypto.randomUUID(),
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
        });
    }
    /**
     * Track cyber intelligence operation
     */
    trackCyberOperation(data) {
        if (!this.config.enableCyberInt) {
            throw new Error('Cyber intelligence is disabled');
        }
        return exports.cyberIntelOperationSchema.parse({
            ...data,
            id: data.id || crypto.randomUUID(),
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
        });
    }
    /**
     * Create MASINT collection
     */
    createMasintCollection(data) {
        if (!this.config.enableMasint) {
            throw new Error('MASINT collection is disabled');
        }
        return exports.masintCollectionSchema.parse({
            ...data,
            id: data.id || crypto.randomUUID(),
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
        });
    }
    /**
     * Assess technical capability
     */
    assessCapability(operation) {
        const platformCount = operation.platforms?.length || 0;
        const technologyCount = operation.technology?.length || 0;
        let level;
        if (operation.sophistication === 'ADVANCED' || (platformCount + technologyCount > 10)) {
            level = 'ADVANCED';
        }
        else if (platformCount + technologyCount > 5) {
            level = 'DEVELOPING';
        }
        else {
            level = 'NASCENT';
        }
        return {
            level,
            strengths: ['Technical collection capability', 'Multi-platform operations'],
            gaps: ['Limited automation', 'Processing bottlenecks'],
        };
    }
    /**
     * Generate collection requirements
     */
    generateCollectionRequirements(targets) {
        return targets.map(target => ({
            requirement: `Collect intelligence on ${target.name}`,
            priority: target.priority || 'MEDIUM',
            collectionMethods: this.determineCollectionMethods(target.type),
        }));
    }
    determineCollectionMethods(targetType) {
        const methods = [];
        if (targetType.includes('COMMUNICATION')) {
            methods.push('SIGINT', 'COMINT');
        }
        if (targetType.includes('FACILITY')) {
            methods.push('IMINT', 'GEOINT');
        }
        if (targetType.includes('NETWORK')) {
            methods.push('CYBER', 'SIGINT');
        }
        if (targetType.includes('WEAPON')) {
            methods.push('MASINT', 'IMINT');
        }
        return methods.length > 0 ? methods : ['HUMINT'];
    }
}
exports.TechintAnalyzer = TechintAnalyzer;
