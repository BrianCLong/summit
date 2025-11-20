import { z } from 'zod';
import {
  TechnicalOperation,
  technicalOperationSchema,
  TechnicalCollectionType,
} from '@intelgraph/espionage-tracking';

/**
 * Technical Intelligence Operations
 *
 * Analysis and tracking of technical intelligence collection including
 * SIGINT, IMINT, MASINT, cyber operations, and technical surveillance.
 */

// ============================================================================
// SIGNALS INTELLIGENCE (SIGINT)
// ============================================================================

export const sigintCollectionSchema = z.object({
  id: z.string().uuid(),
  collectionName: z.string(),
  collectionType: z.enum(['COMINT', 'ELINT', 'FISINT']), // Communications, Electronic, Foreign Instrumentation
  targetSystems: z.array(z.object({
    systemName: z.string(),
    systemType: z.string(),
    frequency: z.string().optional(),
    encryption: z.boolean(),
    priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  })).default([]),
  collectionPlatforms: z.array(z.object({
    platformId: z.string().uuid(),
    platformType: z.enum([
      'SATELLITE',
      'AIRCRAFT',
      'SHIP',
      'GROUND_STATION',
      'SUBMARINE',
      'UAV',
      'TACTICAL',
    ]),
    location: z.string().optional(),
    capabilities: z.array(z.string()),
    operational: z.boolean(),
  })).default([]),
  frequencySpectrum: z.array(z.object({
    startFrequency: z.string(),
    endFrequency: z.string(),
    band: z.string(),
    usage: z.string(),
    activityLevel: z.enum(['VERY_HIGH', 'HIGH', 'MODERATE', 'LOW', 'MINIMAL']),
  })).default([]),
  collectedData: z.object({
    volume: z.number(), // GB or TB
    quality: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']),
    exploitationRate: z.number().min(0).max(1), // Percentage processed
    timelyReporting: z.number().min(0).max(1), // Percentage reported within SLA
  }).optional(),
  processingCapabilities: z.object({
    realTime: z.boolean(),
    automated: z.boolean(),
    languageSupport: z.array(z.string()),
    decryptionCapability: z.boolean(),
  }).optional(),
  intelligence: z.array(z.object({
    date: z.string().datetime(),
    summary: z.string(),
    significance: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    dissemination: z.array(z.string()),
  })).default([]),
  targetedEntities: z.array(z.string().uuid()).default([]),
  status: z.enum(['ACTIVE', 'ONGOING', 'PAUSED', 'COMPLETED', 'TERMINATED']),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type SigintCollection = z.infer<typeof sigintCollectionSchema>;

// ============================================================================
// IMAGERY INTELLIGENCE (IMINT)
// ============================================================================

export const imintCollectionSchema = z.object({
  id: z.string().uuid(),
  collectionName: z.string(),
  imageryType: z.enum([
    'VISIBLE',
    'INFRARED',
    'MULTISPECTRAL',
    'HYPERSPECTRAL',
    'RADAR',
    'SAR', // Synthetic Aperture Radar
    'ELECTRO_OPTICAL',
  ]),
  collectionPlatforms: z.array(z.object({
    platformId: z.string().uuid(),
    platformType: z.enum([
      'SATELLITE',
      'AIRCRAFT',
      'UAV',
      'BALLOON',
      'TACTICAL',
    ]),
    altitude: z.number().optional(),
    resolution: z.string(),
    coverage: z.string(),
  })).default([]),
  targetAreas: z.array(z.object({
    areaName: z.string(),
    coordinates: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }).optional(),
    priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    collectionFrequency: z.string(),
    lastCollected: z.string().datetime().optional(),
  })).default([]),
  targets: z.array(z.object({
    targetId: z.string().uuid(),
    targetType: z.string(),
    location: z.string(),
    changeDetection: z.boolean(),
    annotationsCount: z.number(),
  })).default([]),
  imageAnalysis: z.array(z.object({
    imageId: z.string().uuid(),
    analysisDate: z.string().datetime(),
    analystId: z.string().uuid(),
    findings: z.array(z.string()),
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    reportId: z.string().uuid().optional(),
  })).default([]),
  automatedAnalysis: z.object({
    enabled: z.boolean(),
    algorithms: z.array(z.string()),
    accuracy: z.number().min(0).max(1),
    objectsDetected: z.number(),
  }).optional(),
  collectionQuality: z.object({
    cloudCover: z.number().min(0).max(100),
    atmosphericConditions: z.string(),
    imageQuality: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']),
  }).optional(),
  status: z.enum(['ACTIVE', 'ONGOING', 'PAUSED', 'COMPLETED', 'TERMINATED']),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type ImintCollection = z.infer<typeof imintCollectionSchema>;

// ============================================================================
// CYBER INTELLIGENCE
// ============================================================================

export const cyberIntelOperationSchema = z.object({
  id: z.string().uuid(),
  operationName: z.string(),
  sponsoringAgency: z.string().uuid(),
  operationType: z.enum([
    'NETWORK_EXPLOITATION',
    'COMPUTER_NETWORK_ATTACK',
    'COMPUTER_NETWORK_DEFENSE',
    'ADVANCED_PERSISTENT_THREAT',
    'ZERO_DAY_EXPLOITATION',
    'SUPPLY_CHAIN_COMPROMISE',
    'RANSOMWARE',
    'DATA_EXFILTRATION',
  ]),
  targets: z.array(z.object({
    targetName: z.string(),
    targetType: z.enum(['NETWORK', 'SYSTEM', 'APPLICATION', 'ORGANIZATION', 'INDIVIDUAL']),
    sector: z.string(),
    criticalityLevel: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    compromised: z.boolean(),
    compromiseDate: z.string().datetime().optional(),
  })).default([]),
  ttps: z.array(z.object({
    tactic: z.string(),
    technique: z.string(),
    procedure: z.string(),
    mitreId: z.string().optional(), // MITRE ATT&CK ID
    frequency: z.enum(['ROUTINE', 'COMMON', 'OCCASIONAL', 'RARE']),
  })).default([]),
  infrastructure: z.array(z.object({
    infrastructureType: z.enum([
      'C2_SERVER',
      'MALWARE_HOST',
      'PHISHING_SITE',
      'PROXY',
      'VPN',
      'TOR_NODE',
      'STAGING_SERVER',
    ]),
    address: z.string(),
    active: z.boolean(),
    firstSeen: z.string().datetime(),
    lastSeen: z.string().datetime().optional(),
  })).default([]),
  malware: z.array(z.object({
    malwareName: z.string(),
    malwareType: z.enum([
      'BACKDOOR',
      'TROJAN',
      'ROOTKIT',
      'RANSOMWARE',
      'SPYWARE',
      'WIPER',
      'LOADER',
      'DROPPER',
    ]),
    hash: z.string().optional(),
    capabilities: z.array(z.string()),
    sophistication: z.enum(['ADVANCED', 'MODERATE', 'BASIC']),
  })).default([]),
  attribution: z.object({
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    indicators: z.array(z.string()),
    relatedCampaigns: z.array(z.string().uuid()),
    codeOverlap: z.number().min(0).max(1).optional(),
    infrastructureOverlap: z.number().min(0).max(1).optional(),
  }).optional(),
  impact: z.object({
    dataExfiltrated: z.string().optional(),
    systemsCompromised: z.number(),
    dwellTime: z.number(), // days
    estimatedDamage: z.number().optional(),
  }).optional(),
  defensiveMeasures: z.array(z.object({
    measure: z.string(),
    implementedBy: z.string(),
    effectiveness: z.enum(['EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE']),
  })).default([]),
  status: z.enum(['ACTIVE', 'ONGOING', 'CONTAINED', 'REMEDIATED', 'TERMINATED']),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type CyberIntelOperation = z.infer<typeof cyberIntelOperationSchema>;

// ============================================================================
// MEASUREMENT AND SIGNATURE INTELLIGENCE (MASINT)
// ============================================================================

export const masintCollectionSchema = z.object({
  id: z.string().uuid(),
  collectionName: z.string(),
  masintType: z.enum([
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
  sensors: z.array(z.object({
    sensorId: z.string().uuid(),
    sensorType: z.string(),
    location: z.string().optional(),
    sensitivity: z.string(),
    coverage: z.string(),
    operational: z.boolean(),
  })).default([]),
  targets: z.array(z.object({
    targetName: z.string(),
    targetType: z.string(),
    signatures: z.array(z.object({
      signatureType: z.string(),
      value: z.string(),
      confidence: z.number().min(0).max(1),
    })),
  })).default([]),
  measurements: z.array(z.object({
    timestamp: z.string().datetime(),
    measurementType: z.string(),
    value: z.number(),
    unit: z.string(),
    quality: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']),
    significance: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  })).default([]),
  analysis: z.array(z.object({
    date: z.string().datetime(),
    analystId: z.string().uuid(),
    findings: z.string(),
    assessment: z.string(),
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  })).default([]),
  status: z.enum(['ACTIVE', 'ONGOING', 'PAUSED', 'COMPLETED', 'TERMINATED']),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type MasintCollection = z.infer<typeof masintCollectionSchema>;

// ============================================================================
// TECHINT ANALYZER CLASS
// ============================================================================

export interface TechintAnalyzerConfig {
  enableSigint: boolean;
  enableImint: boolean;
  enableCyberInt: boolean;
  enableMasint: boolean;
  automatedAnalysis: boolean;
}

export class TechintAnalyzer {
  private config: TechintAnalyzerConfig;

  constructor(config: Partial<TechintAnalyzerConfig> = {}) {
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
  createSigintCollection(
    data: Partial<SigintCollection>
  ): SigintCollection {
    if (!this.config.enableSigint) {
      throw new Error('SIGINT collection is disabled');
    }

    return sigintCollectionSchema.parse({
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
  }

  /**
   * Create IMINT collection operation
   */
  createImintCollection(
    data: Partial<ImintCollection>
  ): ImintCollection {
    if (!this.config.enableImint) {
      throw new Error('IMINT collection is disabled');
    }

    return imintCollectionSchema.parse({
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
  }

  /**
   * Track cyber intelligence operation
   */
  trackCyberOperation(
    data: Partial<CyberIntelOperation>
  ): CyberIntelOperation {
    if (!this.config.enableCyberInt) {
      throw new Error('Cyber intelligence is disabled');
    }

    return cyberIntelOperationSchema.parse({
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
  }

  /**
   * Create MASINT collection
   */
  createMasintCollection(
    data: Partial<MasintCollection>
  ): MasintCollection {
    if (!this.config.enableMasint) {
      throw new Error('MASINT collection is disabled');
    }

    return masintCollectionSchema.parse({
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
  }

  /**
   * Assess technical capability
   */
  assessCapability(operation: {
    platforms?: any[];
    technology?: any[];
    sophistication?: string;
  }): {
    level: 'ADVANCED' | 'DEVELOPING' | 'NASCENT';
    strengths: string[];
    gaps: string[];
  } {
    const platformCount = operation.platforms?.length || 0;
    const technologyCount = operation.technology?.length || 0;

    let level: 'ADVANCED' | 'DEVELOPING' | 'NASCENT';
    if (operation.sophistication === 'ADVANCED' || (platformCount + technologyCount > 10)) {
      level = 'ADVANCED';
    } else if (platformCount + technologyCount > 5) {
      level = 'DEVELOPING';
    } else {
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
  generateCollectionRequirements(targets: Array<{
    name: string;
    priority: string;
    type: string;
  }>): Array<{
    requirement: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    collectionMethods: string[];
  }> {
    return targets.map(target => ({
      requirement: `Collect intelligence on ${target.name}`,
      priority: (target.priority as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW') || 'MEDIUM',
      collectionMethods: this.determineCollectionMethods(target.type),
    }));
  }

  private determineCollectionMethods(targetType: string): string[] {
    const methods: string[] = [];

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
