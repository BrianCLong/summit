/**
 * Enhanced Entity Factory
 *
 * Type-safe factory for generating test graph entities with traits.
 *
 * @module tests/factories/enhanced
 */

import { defineFactory, getSequence, random } from '../base';

/**
 * Entity types supported by IntelGraph
 */
export type EntityType =
  | 'person'
  | 'organization'
  | 'ipAddress'
  | 'domain'
  | 'email'
  | 'file'
  | 'hash'
  | 'url'
  | 'threat'
  | 'vulnerability'
  | 'malware'
  | 'campaign'
  | 'indicator'
  | 'asset';

/**
 * Confidence level type
 */
export type ConfidenceLevel = 'low' | 'medium' | 'high' | 'confirmed';

/**
 * Entity interface for tests
 */
export interface TestEntityEnhanced {
  id: string;
  type: EntityType;
  name: string;
  description: string;
  labels: string[];
  properties: Record<string, any>;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  source: string;
  sourceReliability: number;
  investigationId: string | null;
  tags: string[];
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

/**
 * Default properties by entity type
 */
const DEFAULT_PROPERTIES: Record<EntityType, () => Record<string, any>> = {
  person: () => ({
    firstName: `Person${getSequence('person').next()}`,
    lastName: 'Test',
    email: random.email('person'),
    phone: '+1-555-0100',
    title: 'Analyst',
  }),
  organization: () => ({
    orgName: `Organization ${getSequence('org').next()}`,
    industry: random.pick(['Technology', 'Finance', 'Healthcare', 'Government']),
    size: random.pick(['small', 'medium', 'large', 'enterprise']),
    country: 'US',
  }),
  ipAddress: () => ({
    address: random.ipv4(),
    version: 'IPv4',
    asn: `AS${random.number(1000, 99999)}`,
    country: random.pick(['US', 'RU', 'CN', 'DE', 'UK']),
    isMalicious: false,
  }),
  domain: () => ({
    domain: random.domain(),
    tld: random.pick(['com', 'org', 'net', 'io']),
    registrar: 'Test Registrar Inc.',
    registrationDate: random.date(365),
  }),
  email: () => ({
    address: random.email(),
    isVerified: random.boolean(),
    domain: random.domain(),
  }),
  file: () => ({
    filename: `file_${random.string(8)}.${random.pick(['exe', 'dll', 'pdf', 'doc'])}`,
    size: random.number(1024, 10485760),
    mimeType: 'application/octet-stream',
  }),
  hash: () => ({
    value: Array.from({ length: 64 }, () => random.pick('0123456789abcdef'.split(''))).join(''),
    algorithm: random.pick(['sha256', 'sha1', 'md5']),
  }),
  url: () => ({
    url: `https://${random.domain()}/path/${random.string(8)}`,
    protocol: 'https',
    isActive: true,
  }),
  threat: () => ({
    threatType: random.pick(['APT', 'Malware', 'Phishing', 'Ransomware']),
    severity: random.pick(['low', 'medium', 'high', 'critical']),
    mitreTechniques: ['T1566.001', 'T1059.001'],
  }),
  vulnerability: () => ({
    cve: `CVE-2024-${random.number(1000, 9999)}`,
    cvss: random.number(1, 100) / 10,
    severity: random.pick(['low', 'medium', 'high', 'critical']),
    exploitAvailable: random.boolean(),
  }),
  malware: () => ({
    family: random.pick(['Emotet', 'TrickBot', 'Cobalt Strike', 'Mimikatz']),
    type: random.pick(['trojan', 'ransomware', 'backdoor', 'worm']),
    firstSeen: random.date(365),
  }),
  campaign: () => ({
    campaignName: `Campaign-${random.string(6).toUpperCase()}`,
    startDate: random.date(180),
    targetSectors: ['Finance', 'Government'],
    attribution: random.pick(['APT29', 'APT28', 'Lazarus', 'Unknown']),
  }),
  indicator: () => ({
    indicatorType: random.pick(['ip', 'domain', 'hash', 'url']),
    value: random.ipv4(),
    tlp: random.pick(['white', 'green', 'amber', 'red']),
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  }),
  asset: () => ({
    assetType: random.pick(['server', 'workstation', 'network', 'application']),
    hostname: `asset-${random.string(6)}`,
    criticality: random.pick(['low', 'medium', 'high', 'critical']),
    owner: 'IT Department',
  }),
};

/**
 * Enhanced Entity Factory with comprehensive traits
 */
export const enhancedEntityFactory = defineFactory<TestEntityEnhanced>({
  defaults: () => {
    const seq = getSequence('entity').next();
    const type: EntityType = 'person';
    const now = new Date();
    const confidence = random.number(50, 100) / 100;

    return {
      id: random.uuid(),
      type,
      name: `Test Entity ${seq}`,
      description: `Test entity description for entity ${seq}`,
      labels: [type, 'Entity', 'Test'],
      properties: DEFAULT_PROPERTIES[type](),
      confidence,
      confidenceLevel: confidence >= 0.9 ? 'confirmed' : confidence >= 0.7 ? 'high' : confidence >= 0.5 ? 'medium' : 'low',
      source: 'test-source',
      sourceReliability: random.number(1, 6),
      investigationId: null,
      tags: ['test'],
      createdBy: 'test-user',
      updatedBy: 'test-user',
      createdAt: now,
      updatedAt: now,
      metadata: {},
    };
  },
  traits: {
    // Entity type traits
    person: (base) => ({
      type: 'person' as EntityType,
      labels: ['person', 'Entity'],
      properties: DEFAULT_PROPERTIES.person(),
    }),
    organization: (base) => ({
      type: 'organization' as EntityType,
      labels: ['organization', 'Entity'],
      properties: DEFAULT_PROPERTIES.organization(),
    }),
    ipAddress: (base) => ({
      type: 'ipAddress' as EntityType,
      labels: ['ipAddress', 'Entity', 'NetworkIndicator'],
      properties: DEFAULT_PROPERTIES.ipAddress(),
    }),
    domain: (base) => ({
      type: 'domain' as EntityType,
      labels: ['domain', 'Entity', 'NetworkIndicator'],
      properties: DEFAULT_PROPERTIES.domain(),
    }),
    threat: (base) => ({
      type: 'threat' as EntityType,
      labels: ['threat', 'Entity', 'ThreatIntel'],
      properties: DEFAULT_PROPERTIES.threat(),
    }),
    malware: (base) => ({
      type: 'malware' as EntityType,
      labels: ['malware', 'Entity', 'ThreatIntel'],
      properties: DEFAULT_PROPERTIES.malware(),
    }),
    vulnerability: (base) => ({
      type: 'vulnerability' as EntityType,
      labels: ['vulnerability', 'Entity', 'Security'],
      properties: DEFAULT_PROPERTIES.vulnerability(),
    }),
    indicator: (base) => ({
      type: 'indicator' as EntityType,
      labels: ['indicator', 'Entity', 'IOC'],
      properties: DEFAULT_PROPERTIES.indicator(),
    }),

    // Confidence level traits
    highConfidence: {
      confidence: 0.95,
      confidenceLevel: 'confirmed' as ConfidenceLevel,
    },
    mediumConfidence: {
      confidence: 0.7,
      confidenceLevel: 'medium' as ConfidenceLevel,
    },
    lowConfidence: {
      confidence: 0.3,
      confidenceLevel: 'low' as ConfidenceLevel,
    },

    // Source traits
    osint: {
      source: 'OSINT',
      sourceReliability: 3,
    },
    sigint: {
      source: 'SIGINT',
      sourceReliability: 5,
    },
    humint: {
      source: 'HUMINT',
      sourceReliability: 4,
    },
    threatFeed: {
      source: 'Threat Feed',
      sourceReliability: 4,
    },

    // State traits
    withInvestigation: () => ({
      investigationId: random.uuid(),
    }),
    malicious: (base) => ({
      tags: [...(base.tags || []), 'malicious', 'verified'],
      properties: {
        ...base.properties,
        isMalicious: true,
        verifiedMalicious: true,
      },
    }),
    benign: (base) => ({
      tags: [...(base.tags || []), 'benign', 'verified'],
      properties: {
        ...base.properties,
        isMalicious: false,
        verifiedBenign: true,
      },
    }),
  },
  afterBuild: (entity) => {
    // Ensure labels include the type
    if (!entity.labels.includes(entity.type)) {
      entity.labels = [entity.type, ...entity.labels];
    }
    return entity;
  },
});

/**
 * Convenience factory functions
 */
export const personEntityFactory = enhancedEntityFactory.extend({
  defaults: () => enhancedEntityFactory.buildWithTrait('person'),
});

export const ipAddressEntityFactory = enhancedEntityFactory.extend({
  defaults: () => enhancedEntityFactory.buildWithTrait('ipAddress'),
});

export const domainEntityFactory = enhancedEntityFactory.extend({
  defaults: () => enhancedEntityFactory.buildWithTrait('domain'),
});

export const threatEntityFactory = enhancedEntityFactory.extend({
  defaults: () => enhancedEntityFactory.buildWithTraits(['threat', 'highConfidence']),
});

export const malwareEntityFactory = enhancedEntityFactory.extend({
  defaults: () => enhancedEntityFactory.buildWithTraits(['malware', 'threatFeed']),
});

export default enhancedEntityFactory;
