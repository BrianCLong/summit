"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.honeypotEventSchema = exports.honeypotSchema = exports.honeypotTypeEnum = exports.socialMonitorSchema = exports.socialPlatformEnum = exports.darkWebFindingSchema = exports.darkWebMonitorSchema = exports.darkWebSourceEnum = exports.stixObjectSchema = exports.stixObjectTypeEnum = exports.threatIntelSchema = exports.threatFeedSchema = exports.tlpEnum = exports.threatTypeEnum = exports.threatSeverityEnum = exports.threatFeedSourceEnum = void 0;
const zod_1 = require("zod");
/**
 * Threat Intelligence Feed Types
 */
exports.threatFeedSourceEnum = zod_1.z.enum([
    'COMMERCIAL',
    'OSINT',
    'DARK_WEB',
    'UNDERGROUND_FORUM',
    'PASTE_SITE',
    'SOCIAL_MEDIA',
    'HONEYPOT',
    'STIX_TAXII',
    'CVE_NVD',
    'EXPLOIT_DB',
]);
exports.threatSeverityEnum = zod_1.z.enum([
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW',
    'INFO',
]);
exports.threatTypeEnum = zod_1.z.enum([
    'MALWARE',
    'PHISHING',
    'RANSOMWARE',
    'APT',
    'EXPLOIT',
    'VULNERABILITY',
    'BOTNET',
    'C2',
    'DATA_LEAK',
    'CREDENTIAL_DUMP',
    'DARK_WEB_ACTIVITY',
    'THREAT_ACTOR',
]);
exports.tlpEnum = zod_1.z.enum([
    'RED',
    'AMBER_STRICT',
    'AMBER',
    'GREEN',
    'WHITE',
    'CLEAR',
]);
/**
 * Threat Feed Schema
 */
exports.threatFeedSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    source: exports.threatFeedSourceEnum,
    url: zod_1.z.string().url().optional(),
    enabled: zod_1.z.boolean().default(true),
    refreshInterval: zod_1.z.number().int().positive(), // in seconds
    lastSync: zod_1.z.string().datetime().optional(),
    apiKey: zod_1.z.string().optional(),
    config: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    tlp: exports.tlpEnum.default('AMBER'),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
/**
 * Threat Intelligence Item Schema
 */
exports.threatIntelSchema = zod_1.z.object({
    id: zod_1.z.string(),
    feedId: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    severity: exports.threatSeverityEnum,
    type: exports.threatTypeEnum,
    tlp: exports.tlpEnum,
    iocs: zod_1.z.array(zod_1.z.string()), // IOC IDs
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    confidence: zod_1.z.number().min(0).max(100),
    source: zod_1.z.object({
        name: zod_1.z.string(),
        url: zod_1.z.string().url().optional(),
        feedId: zod_1.z.string(),
    }),
    firstSeen: zod_1.z.string().datetime(),
    lastSeen: zod_1.z.string().datetime(),
    expiresAt: zod_1.z.string().datetime().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    relatedThreats: zod_1.z.array(zod_1.z.string()).default([]),
    mitreTactics: zod_1.z.array(zod_1.z.string()).default([]),
    mitreTechniques: zod_1.z.array(zod_1.z.string()).default([]),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
/**
 * STIX 2.1 Support
 */
exports.stixObjectTypeEnum = zod_1.z.enum([
    'attack-pattern',
    'campaign',
    'course-of-action',
    'identity',
    'indicator',
    'intrusion-set',
    'malware',
    'observed-data',
    'report',
    'threat-actor',
    'tool',
    'vulnerability',
]);
exports.stixObjectSchema = zod_1.z.object({
    type: exports.stixObjectTypeEnum,
    spec_version: zod_1.z.literal('2.1'),
    id: zod_1.z.string(),
    created: zod_1.z.string().datetime(),
    modified: zod_1.z.string().datetime(),
    name: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    labels: zod_1.z.array(zod_1.z.string()).default([]),
    confidence: zod_1.z.number().min(0).max(100).optional(),
    external_references: zod_1.z.array(zod_1.z.object({
        source_name: zod_1.z.string(),
        url: zod_1.z.string().url().optional(),
        external_id: zod_1.z.string().optional(),
    })).default([]),
});
/**
 * Dark Web Monitoring
 */
exports.darkWebSourceEnum = zod_1.z.enum([
    'FORUM',
    'MARKETPLACE',
    'PASTE_SITE',
    'CHAT',
    'BLOG',
    'LEAK_SITE',
]);
exports.darkWebMonitorSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    sourceType: exports.darkWebSourceEnum,
    url: zod_1.z.string(),
    keywords: zod_1.z.array(zod_1.z.string()).default([]),
    enabled: zod_1.z.boolean().default(true),
    scanFrequency: zod_1.z.number().int().positive(), // in seconds
    lastScan: zod_1.z.string().datetime().optional(),
    credentials: zod_1.z.object({
        username: zod_1.z.string().optional(),
        password: zod_1.z.string().optional(),
    }).optional(),
    proxyConfig: zod_1.z.object({
        enabled: zod_1.z.boolean(),
        host: zod_1.z.string().optional(),
        port: zod_1.z.number().int().optional(),
        protocol: zod_1.z.enum(['socks5', 'http', 'https']).optional(),
    }).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
exports.darkWebFindingSchema = zod_1.z.object({
    id: zod_1.z.string(),
    monitorId: zod_1.z.string(),
    title: zod_1.z.string(),
    content: zod_1.z.string(),
    url: zod_1.z.string(),
    author: zod_1.z.string().optional(),
    timestamp: zod_1.z.string().datetime(),
    keywords: zod_1.z.array(zod_1.z.string()).default([]),
    severity: exports.threatSeverityEnum,
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    analyzed: zod_1.z.boolean().default(false),
    relatedThreats: zod_1.z.array(zod_1.z.string()).default([]),
    createdAt: zod_1.z.string().datetime(),
});
/**
 * Social Media Monitoring
 */
exports.socialPlatformEnum = zod_1.z.enum([
    'TWITTER',
    'TELEGRAM',
    'DISCORD',
    'REDDIT',
    'GITHUB',
    'PASTEBIN',
    'MASTODON',
]);
exports.socialMonitorSchema = zod_1.z.object({
    id: zod_1.z.string(),
    platform: exports.socialPlatformEnum,
    keywords: zod_1.z.array(zod_1.z.string()),
    hashtags: zod_1.z.array(zod_1.z.string()).default([]),
    accounts: zod_1.z.array(zod_1.z.string()).default([]),
    enabled: zod_1.z.boolean().default(true),
    scanFrequency: zod_1.z.number().int().positive(),
    lastScan: zod_1.z.string().datetime().optional(),
    apiCredentials: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
/**
 * Honeypot Integration
 */
exports.honeypotTypeEnum = zod_1.z.enum([
    'SSH',
    'HTTP',
    'SMTP',
    'FTP',
    'DATABASE',
    'ICS_SCADA',
    'IOT',
]);
exports.honeypotSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: exports.honeypotTypeEnum,
    host: zod_1.z.string(),
    port: zod_1.z.number().int(),
    enabled: zod_1.z.boolean().default(true),
    lastActivity: zod_1.z.string().datetime().optional(),
    totalInteractions: zod_1.z.number().int().default(0),
    config: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
exports.honeypotEventSchema = zod_1.z.object({
    id: zod_1.z.string(),
    honeypotId: zod_1.z.string(),
    sourceIp: zod_1.z.string(),
    sourcePort: zod_1.z.number().int().optional(),
    destinationPort: zod_1.z.number().int(),
    protocol: zod_1.z.string(),
    payload: zod_1.z.string().optional(),
    timestamp: zod_1.z.string().datetime(),
    geoLocation: zod_1.z.object({
        country: zod_1.z.string().optional(),
        city: zod_1.z.string().optional(),
        lat: zod_1.z.number().optional(),
        lon: zod_1.z.number().optional(),
    }).optional(),
    analyzed: zod_1.z.boolean().default(false),
    threatScore: zod_1.z.number().min(0).max(100).optional(),
    relatedIocs: zod_1.z.array(zod_1.z.string()).default([]),
});
