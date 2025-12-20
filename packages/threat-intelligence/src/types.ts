import { z } from 'zod';

/**
 * Threat Intelligence Feed Types
 */
export const threatFeedSourceEnum = z.enum([
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

export const threatSeverityEnum = z.enum([
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'INFO',
]);

export const threatTypeEnum = z.enum([
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

export const tlpEnum = z.enum([
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
export const threatFeedSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: threatFeedSourceEnum,
  url: z.string().url().optional(),
  enabled: z.boolean().default(true),
  refreshInterval: z.number().int().positive(), // in seconds
  lastSync: z.string().datetime().optional(),
  apiKey: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  tlp: tlpEnum.default('AMBER'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Threat Intelligence Item Schema
 */
export const threatIntelSchema = z.object({
  id: z.string(),
  feedId: z.string(),
  title: z.string(),
  description: z.string(),
  severity: threatSeverityEnum,
  type: threatTypeEnum,
  tlp: tlpEnum,
  iocs: z.array(z.string()), // IOC IDs
  tags: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(100),
  source: z.object({
    name: z.string(),
    url: z.string().url().optional(),
    feedId: z.string(),
  }),
  firstSeen: z.string().datetime(),
  lastSeen: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  relatedThreats: z.array(z.string()).default([]),
  mitreTactics: z.array(z.string()).default([]),
  mitreTechniques: z.array(z.string()).default([]),
  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * STIX 2.1 Support
 */
export const stixObjectTypeEnum = z.enum([
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

export const stixObjectSchema = z.object({
  type: stixObjectTypeEnum,
  spec_version: z.literal('2.1'),
  id: z.string(),
  created: z.string().datetime(),
  modified: z.string().datetime(),
  name: z.string().optional(),
  description: z.string().optional(),
  labels: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(100).optional(),
  external_references: z.array(z.object({
    source_name: z.string(),
    url: z.string().url().optional(),
    external_id: z.string().optional(),
  })).default([]),
});

/**
 * Dark Web Monitoring
 */
export const darkWebSourceEnum = z.enum([
  'FORUM',
  'MARKETPLACE',
  'PASTE_SITE',
  'CHAT',
  'BLOG',
  'LEAK_SITE',
]);

export const darkWebMonitorSchema = z.object({
  id: z.string(),
  name: z.string(),
  sourceType: darkWebSourceEnum,
  url: z.string(),
  keywords: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
  scanFrequency: z.number().int().positive(), // in seconds
  lastScan: z.string().datetime().optional(),
  credentials: z.object({
    username: z.string().optional(),
    password: z.string().optional(),
  }).optional(),
  proxyConfig: z.object({
    enabled: z.boolean(),
    host: z.string().optional(),
    port: z.number().int().optional(),
    protocol: z.enum(['socks5', 'http', 'https']).optional(),
  }).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const darkWebFindingSchema = z.object({
  id: z.string(),
  monitorId: z.string(),
  title: z.string(),
  content: z.string(),
  url: z.string(),
  author: z.string().optional(),
  timestamp: z.string().datetime(),
  keywords: z.array(z.string()).default([]),
  severity: threatSeverityEnum,
  metadata: z.record(z.string(), z.unknown()).optional(),
  analyzed: z.boolean().default(false),
  relatedThreats: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
});

/**
 * Social Media Monitoring
 */
export const socialPlatformEnum = z.enum([
  'TWITTER',
  'TELEGRAM',
  'DISCORD',
  'REDDIT',
  'GITHUB',
  'PASTEBIN',
  'MASTODON',
]);

export const socialMonitorSchema = z.object({
  id: z.string(),
  platform: socialPlatformEnum,
  keywords: z.array(z.string()),
  hashtags: z.array(z.string()).default([]),
  accounts: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
  scanFrequency: z.number().int().positive(),
  lastScan: z.string().datetime().optional(),
  apiCredentials: z.record(z.string(), z.string()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Honeypot Integration
 */
export const honeypotTypeEnum = z.enum([
  'SSH',
  'HTTP',
  'SMTP',
  'FTP',
  'DATABASE',
  'ICS_SCADA',
  'IOT',
]);

export const honeypotSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: honeypotTypeEnum,
  host: z.string(),
  port: z.number().int(),
  enabled: z.boolean().default(true),
  lastActivity: z.string().datetime().optional(),
  totalInteractions: z.number().int().default(0),
  config: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const honeypotEventSchema = z.object({
  id: z.string(),
  honeypotId: z.string(),
  sourceIp: z.string(),
  sourcePort: z.number().int().optional(),
  destinationPort: z.number().int(),
  protocol: z.string(),
  payload: z.string().optional(),
  timestamp: z.string().datetime(),
  geoLocation: z.object({
    country: z.string().optional(),
    city: z.string().optional(),
    lat: z.number().optional(),
    lon: z.number().optional(),
  }).optional(),
  analyzed: z.boolean().default(false),
  threatScore: z.number().min(0).max(100).optional(),
  relatedIocs: z.array(z.string()).default([]),
});

/**
 * Type exports
 */
export type ThreatFeed = z.infer<typeof threatFeedSchema>;
export type ThreatIntel = z.infer<typeof threatIntelSchema>;
export type ThreatFeedSource = z.infer<typeof threatFeedSourceEnum>;
export type ThreatSeverity = z.infer<typeof threatSeverityEnum>;
export type ThreatType = z.infer<typeof threatTypeEnum>;
export type TLP = z.infer<typeof tlpEnum>;
export type StixObject = z.infer<typeof stixObjectSchema>;
export type DarkWebMonitor = z.infer<typeof darkWebMonitorSchema>;
export type DarkWebFinding = z.infer<typeof darkWebFindingSchema>;
export type SocialMonitor = z.infer<typeof socialMonitorSchema>;
export type Honeypot = z.infer<typeof honeypotSchema>;
export type HoneypotEvent = z.infer<typeof honeypotEventSchema>;
