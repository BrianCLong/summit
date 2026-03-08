"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataLeakSchema = exports.brandMonitoringSchema = exports.shadowITSchema = exports.cloudAssetSchema = exports.certTransparencySchema = exports.subdomainSchema = exports.externalAssetSchema = exports.assetStatusEnum = exports.assetTypeEnum = void 0;
const zod_1 = require("zod");
/**
 * Attack Surface Monitoring Types
 */
exports.assetTypeEnum = zod_1.z.enum([
    'DOMAIN',
    'SUBDOMAIN',
    'IP_ADDRESS',
    'PORT',
    'SERVICE',
    'WEB_APP',
    'CLOUD_RESOURCE',
    'SSL_CERTIFICATE',
    'DNS_RECORD',
    'EMAIL_SERVER',
    'API_ENDPOINT',
]);
exports.assetStatusEnum = zod_1.z.enum([
    'ACTIVE',
    'INACTIVE',
    'UNKNOWN',
    'DEPRECATED',
]);
/**
 * External Asset Schema
 */
exports.externalAssetSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: exports.assetTypeEnum,
    value: zod_1.z.string(),
    status: exports.assetStatusEnum,
    // Discovery
    discoveredBy: zod_1.z.enum(['SUBDOMAIN_ENUM', 'PORT_SCAN', 'CERT_TRANSPARENCY', 'DNS_MONITORING', 'CLOUD_DISCOVERY', 'MANUAL']),
    discoveredAt: zod_1.z.string().datetime(),
    lastSeenAt: zod_1.z.string().datetime(),
    // Metadata
    ipAddress: zod_1.z.string().optional(),
    hostnames: zod_1.z.array(zod_1.z.string()).default([]),
    ports: zod_1.z.array(zod_1.z.number().int()).default([]),
    services: zod_1.z.array(zod_1.z.object({
        port: zod_1.z.number().int(),
        protocol: zod_1.z.string(),
        service: zod_1.z.string(),
        version: zod_1.z.string().optional(),
    })).default([]),
    // SSL/TLS
    sslCertificate: zod_1.z.object({
        issuer: zod_1.z.string(),
        subject: zod_1.z.string(),
        validFrom: zod_1.z.string().datetime(),
        validTo: zod_1.z.string().datetime(),
        fingerprint: zod_1.z.string(),
        selfSigned: zod_1.z.boolean(),
    }).optional(),
    // Cloud resources
    cloudProvider: zod_1.z.enum(['AWS', 'AZURE', 'GCP', 'DIGITAL_OCEAN', 'CLOUDFLARE', 'OTHER']).optional(),
    cloudRegion: zod_1.z.string().optional(),
    cloudResourceId: zod_1.z.string().optional(),
    // Risk assessment
    riskScore: zod_1.z.number().min(0).max(100),
    exposureLevel: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    // Vulnerabilities
    vulnerabilities: zod_1.z.array(zod_1.z.string()).default([]),
    // Tags
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    owner: zod_1.z.string().optional(),
    businessUnit: zod_1.z.string().optional(),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
/**
 * Subdomain Schema
 */
exports.subdomainSchema = zod_1.z.object({
    id: zod_1.z.string(),
    domain: zod_1.z.string(),
    subdomain: zod_1.z.string(),
    fullDomain: zod_1.z.string(),
    // DNS Records
    aRecords: zod_1.z.array(zod_1.z.string()).default([]),
    aaaaRecords: zod_1.z.array(zod_1.z.string()).default([]),
    cnameRecords: zod_1.z.array(zod_1.z.string()).default([]),
    mxRecords: zod_1.z.array(zod_1.z.string()).default([]),
    txtRecords: zod_1.z.array(zod_1.z.string()).default([]),
    // Discovery
    discoveryMethod: zod_1.z.enum(['BRUTE_FORCE', 'CERTIFICATE_TRANSPARENCY', 'DNS_AGGREGATOR', 'SEARCH_ENGINE', 'PASSIVE_DNS', 'MANUAL']),
    discoveredAt: zod_1.z.string().datetime(),
    lastCheckedAt: zod_1.z.string().datetime(),
    // Status
    active: zod_1.z.boolean(),
    reachable: zod_1.z.boolean(),
    httpStatus: zod_1.z.number().int().optional(),
    // Web application
    webTechnologies: zod_1.z.array(zod_1.z.string()).default([]),
    screenshot: zod_1.z.string().optional(),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
/**
 * Certificate Transparency Log Entry
 */
exports.certTransparencySchema = zod_1.z.object({
    id: zod_1.z.string(),
    logId: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    // Certificate details
    commonName: zod_1.z.string(),
    sans: zod_1.z.array(zod_1.z.string()).default([]),
    issuer: zod_1.z.string(),
    notBefore: zod_1.z.string().datetime(),
    notAfter: zod_1.z.string().datetime(),
    serialNumber: zod_1.z.string(),
    fingerprint: zod_1.z.string(),
    // Discovery
    newDomains: zod_1.z.array(zod_1.z.string()).default([]),
    newSubdomains: zod_1.z.array(zod_1.z.string()).default([]),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
});
/**
 * Cloud Asset Schema
 */
exports.cloudAssetSchema = zod_1.z.object({
    id: zod_1.z.string(),
    provider: zod_1.z.enum(['AWS', 'AZURE', 'GCP', 'DIGITAL_OCEAN', 'OTHER']),
    resourceType: zod_1.z.string(),
    resourceId: zod_1.z.string(),
    resourceName: zod_1.z.string().optional(),
    // Location
    region: zod_1.z.string(),
    availabilityZone: zod_1.z.string().optional(),
    // Access
    public: zod_1.z.boolean(),
    internetFacing: zod_1.z.boolean(),
    securityGroups: zod_1.z.array(zod_1.z.string()).default([]),
    // Configuration
    configuration: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    tags: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).default({}),
    // Risk
    misconfigured: zod_1.z.boolean().default(false),
    misconfigurations: zod_1.z.array(zod_1.z.string()).default([]),
    exposureScore: zod_1.z.number().min(0).max(100),
    // Discovery
    discoveredAt: zod_1.z.string().datetime(),
    lastScannedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
/**
 * Shadow IT Detection
 */
exports.shadowITSchema = zod_1.z.object({
    id: zod_1.z.string(),
    assetId: zod_1.z.string(),
    assetType: exports.assetTypeEnum,
    assetValue: zod_1.z.string(),
    // Detection
    detectionMethod: zod_1.z.enum(['CLOUD_DISCOVERY', 'DNS_MONITORING', 'TRAFFIC_ANALYSIS', 'USER_REPORT']),
    detectedAt: zod_1.z.string().datetime(),
    // Classification
    approved: zod_1.z.boolean().default(false),
    riskLevel: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    // Business context
    possibleOwner: zod_1.z.string().optional(),
    possiblePurpose: zod_1.z.string().optional(),
    businessUnit: zod_1.z.string().optional(),
    // Action
    status: zod_1.z.enum(['DETECTED', 'INVESTIGATING', 'APPROVED', 'DECOMMISSIONED']),
    actionRequired: zod_1.z.string().optional(),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
/**
 * Brand Monitoring Schema
 */
exports.brandMonitoringSchema = zod_1.z.object({
    id: zod_1.z.string(),
    monitoredDomain: zod_1.z.string(),
    // Detection
    detectedDomain: zod_1.z.string(),
    similarity: zod_1.z.number().min(0).max(100),
    typosquatting: zod_1.z.boolean().default(false),
    homograph: zod_1.z.boolean().default(false),
    combosquatting: zod_1.z.boolean().default(false),
    // Registration
    registrar: zod_1.z.string().optional(),
    registrationDate: zod_1.z.string().datetime().optional(),
    nameservers: zod_1.z.array(zod_1.z.string()).default([]),
    // Risk
    riskScore: zod_1.z.number().min(0).max(100),
    malicious: zod_1.z.boolean().default(false),
    phishing: zod_1.z.boolean().default(false),
    // Status
    status: zod_1.z.enum(['DETECTED', 'INVESTIGATING', 'CONFIRMED_MALICIOUS', 'BENIGN', 'TAKEDOWN_REQUESTED']),
    takedownStatus: zod_1.z.string().optional(),
    detectedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
/**
 * Data Leak Detection
 */
exports.dataLeakSchema = zod_1.z.object({
    id: zod_1.z.string(),
    source: zod_1.z.enum(['PASTE_SITE', 'CODE_REPOSITORY', 'DARK_WEB', 'BREACH_DATABASE', 'PUBLIC_BUCKET']),
    url: zod_1.z.string().url(),
    // Content
    title: zod_1.z.string().optional(),
    content: zod_1.z.string(),
    contentHash: zod_1.z.string(),
    // Classification
    dataTypes: zod_1.z.array(zod_1.z.enum([
        'CREDENTIALS',
        'API_KEYS',
        'SOURCE_CODE',
        'DATABASE',
        'PII',
        'FINANCIAL',
        'INTELLECTUAL_PROPERTY',
        'INTERNAL_DOCUMENTS',
        'OTHER',
    ])).default([]),
    // Severity
    severity: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    confirmed: zod_1.z.boolean().default(false),
    // Timeline
    detectedAt: zod_1.z.string().datetime(),
    publishedAt: zod_1.z.string().datetime().optional(),
    // Response
    status: zod_1.z.enum(['DETECTED', 'INVESTIGATING', 'CONFIRMED', 'MITIGATED', 'FALSE_POSITIVE']),
    mitigationActions: zod_1.z.array(zod_1.z.string()).default([]),
    tenantId: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
