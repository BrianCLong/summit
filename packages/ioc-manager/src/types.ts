import { z } from 'zod';

/**
 * Indicator of Compromise (IOC) Types
 */
export const iocTypeEnum = z.enum([
  'IP_ADDRESS',
  'DOMAIN',
  'URL',
  'FILE_HASH_MD5',
  'FILE_HASH_SHA1',
  'FILE_HASH_SHA256',
  'EMAIL_ADDRESS',
  'PHONE_NUMBER',
  'SSL_CERT_FINGERPRINT',
  'YARA_RULE',
  'CVE',
  'MUTEX',
  'REGISTRY_KEY',
  'USER_AGENT',
  'ASN',
  'CIDR',
  'MAC_ADDRESS',
  'BITCOIN_ADDRESS',
  'SSDEEP',
  'IMPHASH',
]);

export const iocStatusEnum = z.enum([
  'ACTIVE',
  'EXPIRED',
  'WHITELISTED',
  'UNDER_REVIEW',
  'FALSE_POSITIVE',
]);

export const iocSeverityEnum = z.enum([
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'INFO',
]);

/**
 * IOC Schema
 */
export const iocSchema = z.object({
  id: z.string(),
  type: iocTypeEnum,
  value: z.string(),
  status: iocStatusEnum.default('ACTIVE'),
  severity: iocSeverityEnum,
  confidence: z.number().min(0).max(100),

  // Classification
  tags: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),

  // Temporal
  firstSeen: z.string().datetime(),
  lastSeen: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),

  // Context
  description: z.string().optional(),
  context: z.string().optional(),

  // Sources
  sources: z.array(z.object({
    name: z.string(),
    url: z.string().url().optional(),
    confidence: z.number().min(0).max(100),
    timestamp: z.string().datetime(),
  })).default([]),

  // Relationships
  relatedIocs: z.array(z.string()).default([]),
  relatedThreats: z.array(z.string()).default([]),
  relatedCampaigns: z.array(z.string()).default([]),

  // MITRE ATT&CK
  mitreTactics: z.array(z.string()).default([]),
  mitreTechniques: z.array(z.string()).default([]),

  // Enrichment
  enrichment: z.object({
    whois: z.record(z.string(), z.unknown()).optional(),
    geoip: z.object({
      country: z.string().optional(),
      city: z.string().optional(),
      lat: z.number().optional(),
      lon: z.number().optional(),
      asn: z.string().optional(),
      org: z.string().optional(),
    }).optional(),
    reputation: z.object({
      score: z.number().min(0).max(100),
      providers: z.array(z.object({
        name: z.string(),
        score: z.number(),
        verdict: z.string(),
      })),
    }).optional(),
    malwareFamily: z.string().optional(),
    threatActor: z.string().optional(),
  }).optional(),

  // False positive tracking
  falsePositiveReports: z.number().int().default(0),
  falsePositiveReason: z.string().optional(),

  // Metadata
  tlp: z.enum(['RED', 'AMBER_STRICT', 'AMBER', 'GREEN', 'WHITE', 'CLEAR']).default('AMBER'),
  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
});

/**
 * YARA Rule Schema
 */
export const yaraRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  rule: z.string(),
  description: z.string().optional(),
  author: z.string().optional(),
  reference: z.string().optional(),
  date: z.string().datetime().optional(),
  version: z.string().optional(),

  // Classification
  tags: z.array(z.string()).default([]),
  severity: iocSeverityEnum,

  // Metadata
  malwareFamily: z.string().optional(),
  threatActor: z.string().optional(),

  // Performance
  matchCount: z.number().int().default(0),
  falsePositiveCount: z.number().int().default(0),

  // Status
  enabled: z.boolean().default(true),
  tested: z.boolean().default(false),

  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * IOC Feed Schema
 */
export const iocFeedSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url().optional(),
  format: z.enum(['JSON', 'CSV', 'STIX', 'TXT', 'XML']),
  enabled: z.boolean().default(true),
  refreshInterval: z.number().int().positive(),
  lastSync: z.string().datetime().optional(),
  totalIocs: z.number().int().default(0),

  // Filtering
  iocTypes: z.array(iocTypeEnum).optional(),
  minConfidence: z.number().min(0).max(100).optional(),

  // Authentication
  apiKey: z.string().optional(),
  credentials: z.object({
    username: z.string(),
    password: z.string(),
  }).optional(),

  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * IOC Enrichment Request
 */
export const iocEnrichmentRequestSchema = z.object({
  iocId: z.string(),
  providers: z.array(z.enum([
    'VIRUSTOTAL',
    'ALIENVAULT_OTX',
    'ABUSEIPDB',
    'SHODAN',
    'CENSYS',
    'HYBRID_ANALYSIS',
    'URLSCAN',
    'WHOIS',
    'GEOIP',
    'PASSIVETOTAL',
    'THREATCROWD',
    'THREATMINER',
  ])),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  tenantId: z.string(),
  createdAt: z.string().datetime(),
});

/**
 * IOC Search Query
 */
export const iocSearchQuerySchema = z.object({
  query: z.string().optional(),
  types: z.array(iocTypeEnum).optional(),
  statuses: z.array(iocStatusEnum).optional(),
  severities: z.array(iocSeverityEnum).optional(),
  tags: z.array(z.string()).optional(),
  minConfidence: z.number().min(0).max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sources: z.array(z.string()).optional(),
  relatedThreats: z.array(z.string()).optional(),
  limit: z.number().int().positive().default(100),
  offset: z.number().int().nonnegative().default(0),
});

/**
 * IOC Deduplication Result
 */
export const iocDeduplicationResultSchema = z.object({
  totalProcessed: z.number().int(),
  duplicatesFound: z.number().int(),
  uniqueIocs: z.number().int(),
  merged: z.number().int(),
  deduplicationMethod: z.enum(['EXACT', 'FUZZY', 'NORMALIZED']),
  timestamp: z.string().datetime(),
});

/**
 * Type exports
 */
export type IOC = z.infer<typeof iocSchema>;
export type IOCType = z.infer<typeof iocTypeEnum>;
export type IOCStatus = z.infer<typeof iocStatusEnum>;
export type IOCSeverity = z.infer<typeof iocSeverityEnum>;
export type YaraRule = z.infer<typeof yaraRuleSchema>;
export type IOCFeed = z.infer<typeof iocFeedSchema>;
export type IOCEnrichmentRequest = z.infer<typeof iocEnrichmentRequestSchema>;
export type IOCSearchQuery = z.infer<typeof iocSearchQuerySchema>;
export type IOCDeduplicationResult = z.infer<typeof iocDeduplicationResultSchema>;
