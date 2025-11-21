import { z } from 'zod';

/**
 * Attack Surface Monitoring Types
 */
export const assetTypeEnum = z.enum([
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

export const assetStatusEnum = z.enum([
  'ACTIVE',
  'INACTIVE',
  'UNKNOWN',
  'DEPRECATED',
]);

/**
 * External Asset Schema
 */
export const externalAssetSchema = z.object({
  id: z.string(),
  type: assetTypeEnum,
  value: z.string(),
  status: assetStatusEnum,

  // Discovery
  discoveredBy: z.enum(['SUBDOMAIN_ENUM', 'PORT_SCAN', 'CERT_TRANSPARENCY', 'DNS_MONITORING', 'CLOUD_DISCOVERY', 'MANUAL']),
  discoveredAt: z.string().datetime(),
  lastSeenAt: z.string().datetime(),

  // Metadata
  ipAddress: z.string().optional(),
  hostnames: z.array(z.string()).default([]),
  ports: z.array(z.number().int()).default([]),
  services: z.array(z.object({
    port: z.number().int(),
    protocol: z.string(),
    service: z.string(),
    version: z.string().optional(),
  })).default([]),

  // SSL/TLS
  sslCertificate: z.object({
    issuer: z.string(),
    subject: z.string(),
    validFrom: z.string().datetime(),
    validTo: z.string().datetime(),
    fingerprint: z.string(),
    selfSigned: z.boolean(),
  }).optional(),

  // Cloud resources
  cloudProvider: z.enum(['AWS', 'AZURE', 'GCP', 'DIGITAL_OCEAN', 'CLOUDFLARE', 'OTHER']).optional(),
  cloudRegion: z.string().optional(),
  cloudResourceId: z.string().optional(),

  // Risk assessment
  riskScore: z.number().min(0).max(100),
  exposureLevel: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),

  // Vulnerabilities
  vulnerabilities: z.array(z.string()).default([]),

  // Tags
  tags: z.array(z.string()).default([]),
  owner: z.string().optional(),
  businessUnit: z.string().optional(),

  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Subdomain Schema
 */
export const subdomainSchema = z.object({
  id: z.string(),
  domain: z.string(),
  subdomain: z.string(),
  fullDomain: z.string(),

  // DNS Records
  aRecords: z.array(z.string()).default([]),
  aaaaRecords: z.array(z.string()).default([]),
  cnameRecords: z.array(z.string()).default([]),
  mxRecords: z.array(z.string()).default([]),
  txtRecords: z.array(z.string()).default([]),

  // Discovery
  discoveryMethod: z.enum(['BRUTE_FORCE', 'CERTIFICATE_TRANSPARENCY', 'DNS_AGGREGATOR', 'SEARCH_ENGINE', 'PASSIVE_DNS', 'MANUAL']),
  discoveredAt: z.string().datetime(),
  lastCheckedAt: z.string().datetime(),

  // Status
  active: z.boolean(),
  reachable: z.boolean(),
  httpStatus: z.number().int().optional(),

  // Web application
  webTechnologies: z.array(z.string()).default([]),
  screenshot: z.string().optional(),

  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Certificate Transparency Log Entry
 */
export const certTransparencySchema = z.object({
  id: z.string(),
  logId: z.string(),
  timestamp: z.string().datetime(),

  // Certificate details
  commonName: z.string(),
  sans: z.array(z.string()).default([]),
  issuer: z.string(),
  notBefore: z.string().datetime(),
  notAfter: z.string().datetime(),
  serialNumber: z.string(),
  fingerprint: z.string(),

  // Discovery
  newDomains: z.array(z.string()).default([]),
  newSubdomains: z.array(z.string()).default([]),

  tenantId: z.string(),
  createdAt: z.string().datetime(),
});

/**
 * Cloud Asset Schema
 */
export const cloudAssetSchema = z.object({
  id: z.string(),
  provider: z.enum(['AWS', 'AZURE', 'GCP', 'DIGITAL_OCEAN', 'OTHER']),
  resourceType: z.string(),
  resourceId: z.string(),
  resourceName: z.string().optional(),

  // Location
  region: z.string(),
  availabilityZone: z.string().optional(),

  // Access
  public: z.boolean(),
  internetFacing: z.boolean(),
  securityGroups: z.array(z.string()).default([]),

  // Configuration
  configuration: z.record(z.string(), z.unknown()),
  tags: z.record(z.string(), z.string()).default({}),

  // Risk
  misconfigured: z.boolean().default(false),
  misconfigurations: z.array(z.string()).default([]),
  exposureScore: z.number().min(0).max(100),

  // Discovery
  discoveredAt: z.string().datetime(),
  lastScannedAt: z.string().datetime(),

  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Shadow IT Detection
 */
export const shadowITSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  assetType: assetTypeEnum,
  assetValue: z.string(),

  // Detection
  detectionMethod: z.enum(['CLOUD_DISCOVERY', 'DNS_MONITORING', 'TRAFFIC_ANALYSIS', 'USER_REPORT']),
  detectedAt: z.string().datetime(),

  // Classification
  approved: z.boolean().default(false),
  riskLevel: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),

  // Business context
  possibleOwner: z.string().optional(),
  possiblePurpose: z.string().optional(),
  businessUnit: z.string().optional(),

  // Action
  status: z.enum(['DETECTED', 'INVESTIGATING', 'APPROVED', 'DECOMMISSIONED']),
  actionRequired: z.string().optional(),

  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Brand Monitoring Schema
 */
export const brandMonitoringSchema = z.object({
  id: z.string(),
  monitoredDomain: z.string(),

  // Detection
  detectedDomain: z.string(),
  similarity: z.number().min(0).max(100),
  typosquatting: z.boolean().default(false),
  homograph: z.boolean().default(false),
  combosquatting: z.boolean().default(false),

  // Registration
  registrar: z.string().optional(),
  registrationDate: z.string().datetime().optional(),
  nameservers: z.array(z.string()).default([]),

  // Risk
  riskScore: z.number().min(0).max(100),
  malicious: z.boolean().default(false),
  phishing: z.boolean().default(false),

  // Status
  status: z.enum(['DETECTED', 'INVESTIGATING', 'CONFIRMED_MALICIOUS', 'BENIGN', 'TAKEDOWN_REQUESTED']),
  takedownStatus: z.string().optional(),

  detectedAt: z.string().datetime(),

  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Data Leak Detection
 */
export const dataLeakSchema = z.object({
  id: z.string(),
  source: z.enum(['PASTE_SITE', 'CODE_REPOSITORY', 'DARK_WEB', 'BREACH_DATABASE', 'PUBLIC_BUCKET']),
  url: z.string().url(),

  // Content
  title: z.string().optional(),
  content: z.string(),
  contentHash: z.string(),

  // Classification
  dataTypes: z.array(z.enum([
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
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  confirmed: z.boolean().default(false),

  // Timeline
  detectedAt: z.string().datetime(),
  publishedAt: z.string().datetime().optional(),

  // Response
  status: z.enum(['DETECTED', 'INVESTIGATING', 'CONFIRMED', 'MITIGATED', 'FALSE_POSITIVE']),
  mitigationActions: z.array(z.string()).default([]),

  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Type exports
 */
export type ExternalAsset = z.infer<typeof externalAssetSchema>;
export type AssetType = z.infer<typeof assetTypeEnum>;
export type AssetStatus = z.infer<typeof assetStatusEnum>;
export type Subdomain = z.infer<typeof subdomainSchema>;
export type CertTransparency = z.infer<typeof certTransparencySchema>;
export type CloudAsset = z.infer<typeof cloudAssetSchema>;
export type ShadowIT = z.infer<typeof shadowITSchema>;
export type BrandMonitoring = z.infer<typeof brandMonitoringSchema>;
export type DataLeak = z.infer<typeof dataLeakSchema>;
