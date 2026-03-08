"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.iocDeduplicationResultSchema = exports.iocSearchQuerySchema = exports.iocEnrichmentRequestSchema = exports.iocFeedSchema = exports.yaraRuleSchema = exports.iocSchema = exports.iocSeverityEnum = exports.iocStatusEnum = exports.iocTypeEnum = void 0;
const zod_1 = require("zod");
/**
 * Indicator of Compromise (IOC) Types
 */
exports.iocTypeEnum = zod_1.z.enum([
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
exports.iocStatusEnum = zod_1.z.enum([
    'ACTIVE',
    'EXPIRED',
    'WHITELISTED',
    'UNDER_REVIEW',
    'FALSE_POSITIVE',
]);
exports.iocSeverityEnum = zod_1.z.enum([
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW',
    'INFO',
]);
/**
 * IOC Schema
 */
exports.iocSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: exports.iocTypeEnum,
    value: zod_1.z.string(),
    status: exports.iocStatusEnum.default('ACTIVE'),
    severity: exports.iocSeverityEnum,
    confidence: zod_1.z.number().min(0).max(100),
    // Classification
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    categories: zod_1.z.array(zod_1.z.string()).default([]),
    // Temporal
    firstSeen: zod_1.z.string().datetime(),
    lastSeen: zod_1.z.string().datetime(),
    expiresAt: zod_1.z.string().datetime().optional(),
    // Context
    description: zod_1.z.string().optional(),
    context: zod_1.z.string().optional(),
    // Sources
    sources: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        url: zod_1.z.string().url().optional(),
        confidence: zod_1.z.number().min(0).max(100),
        timestamp: zod_1.z.string().datetime(),
    })).default([]),
    // Relationships
    relatedIocs: zod_1.z.array(zod_1.z.string()).default([]),
    relatedThreats: zod_1.z.array(zod_1.z.string()).default([]),
    relatedCampaigns: zod_1.z.array(zod_1.z.string()).default([]),
    // MITRE ATT&CK
    mitreTactics: zod_1.z.array(zod_1.z.string()).default([]),
    mitreTechniques: zod_1.z.array(zod_1.z.string()).default([]),
    // Enrichment
    enrichment: zod_1.z.object({
        whois: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
        geoip: zod_1.z.object({
            country: zod_1.z.string().optional(),
            city: zod_1.z.string().optional(),
            lat: zod_1.z.number().optional(),
            lon: zod_1.z.number().optional(),
            asn: zod_1.z.string().optional(),
            org: zod_1.z.string().optional(),
        }).optional(),
        reputation: zod_1.z.object({
            score: zod_1.z.number().min(0).max(100),
            providers: zod_1.z.array(zod_1.z.object({
                name: zod_1.z.string(),
                score: zod_1.z.number(),
                verdict: zod_1.z.string(),
            })),
        }).optional(),
        malwareFamily: zod_1.z.string().optional(),
        threatActor: zod_1.z.string().optional(),
    }).optional(),
    // False positive tracking
    falsePositiveReports: zod_1.z.number().int().default(0),
    falsePositiveReason: zod_1.z.string().optional(),
    // Metadata
    tlp: zod_1.z.enum(['RED', 'AMBER_STRICT', 'AMBER', 'GREEN', 'WHITE', 'CLEAR']).default('AMBER'),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    createdBy: zod_1.z.string().optional(),
    updatedBy: zod_1.z.string().optional(),
});
/**
 * YARA Rule Schema
 */
exports.yaraRuleSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    rule: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    author: zod_1.z.string().optional(),
    reference: zod_1.z.string().optional(),
    date: zod_1.z.string().datetime().optional(),
    version: zod_1.z.string().optional(),
    // Classification
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    severity: exports.iocSeverityEnum,
    // Metadata
    malwareFamily: zod_1.z.string().optional(),
    threatActor: zod_1.z.string().optional(),
    // Performance
    matchCount: zod_1.z.number().int().default(0),
    falsePositiveCount: zod_1.z.number().int().default(0),
    // Status
    enabled: zod_1.z.boolean().default(true),
    tested: zod_1.z.boolean().default(false),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
/**
 * IOC Feed Schema
 */
exports.iocFeedSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    url: zod_1.z.string().url().optional(),
    format: zod_1.z.enum(['JSON', 'CSV', 'STIX', 'TXT', 'XML']),
    enabled: zod_1.z.boolean().default(true),
    refreshInterval: zod_1.z.number().int().positive(),
    lastSync: zod_1.z.string().datetime().optional(),
    totalIocs: zod_1.z.number().int().default(0),
    // Filtering
    iocTypes: zod_1.z.array(exports.iocTypeEnum).optional(),
    minConfidence: zod_1.z.number().min(0).max(100).optional(),
    // Authentication
    apiKey: zod_1.z.string().optional(),
    credentials: zod_1.z.object({
        username: zod_1.z.string(),
        password: zod_1.z.string(),
    }).optional(),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
/**
 * IOC Enrichment Request
 */
exports.iocEnrichmentRequestSchema = zod_1.z.object({
    iocId: zod_1.z.string(),
    providers: zod_1.z.array(zod_1.z.enum([
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
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
});
/**
 * IOC Search Query
 */
exports.iocSearchQuerySchema = zod_1.z.object({
    query: zod_1.z.string().optional(),
    types: zod_1.z.array(exports.iocTypeEnum).optional(),
    statuses: zod_1.z.array(exports.iocStatusEnum).optional(),
    severities: zod_1.z.array(exports.iocSeverityEnum).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    minConfidence: zod_1.z.number().min(0).max(100).optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    sources: zod_1.z.array(zod_1.z.string()).optional(),
    relatedThreats: zod_1.z.array(zod_1.z.string()).optional(),
    limit: zod_1.z.number().int().positive().default(100),
    offset: zod_1.z.number().int().nonnegative().default(0),
});
/**
 * IOC Deduplication Result
 */
exports.iocDeduplicationResultSchema = zod_1.z.object({
    totalProcessed: zod_1.z.number().int(),
    duplicatesFound: zod_1.z.number().int(),
    uniqueIocs: zod_1.z.number().int(),
    merged: zod_1.z.number().int(),
    deduplicationMethod: zod_1.z.enum(['EXACT', 'FUZZY', 'NORMALIZED']),
    timestamp: zod_1.z.string().datetime(),
});
