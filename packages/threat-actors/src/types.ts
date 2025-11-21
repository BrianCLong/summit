import { z } from 'zod';

/**
 * Threat Actor Types
 */
export const threatActorTypeEnum = z.enum([
  'NATION_STATE',
  'APT',
  'CYBERCRIMINAL',
  'HACKTIVIST',
  'INSIDER',
  'TERRORIST',
  'UNKNOWN',
]);

export const sophisticationLevelEnum = z.enum([
  'NOVICE',
  'INTERMEDIATE',
  'ADVANCED',
  'EXPERT',
  'STRATEGIC',
]);

export const motivationEnum = z.enum([
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
export const threatActorSchema = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()).default([]),
  type: threatActorTypeEnum,

  // Classification
  sophisticationLevel: sophisticationLevelEnum,
  primaryMotivation: motivationEnum,
  secondaryMotivations: z.array(motivationEnum).default([]),

  // Attribution
  country: z.string().optional(),
  region: z.string().optional(),
  sponsors: z.array(z.string()).default([]),
  affiliations: z.array(z.string()).default([]),

  // Description
  description: z.string().optional(),
  objectives: z.array(z.string()).default([]),

  // Targeting
  targetedSectors: z.array(z.string()).default([]),
  targetedCountries: z.array(z.string()).default([]),
  targetedTechnologies: z.array(z.string()).default([]),

  // TTPs (Tactics, Techniques, and Procedures)
  tactics: z.array(z.string()).default([]),
  techniques: z.array(z.string()).default([]),
  procedures: z.array(z.string()).default([]),

  // MITRE ATT&CK mapping
  mitreAttackTactics: z.array(z.object({
    id: z.string(),
    name: z.string(),
    url: z.string().optional(),
  })).default([]),

  mitreAttackTechniques: z.array(z.object({
    id: z.string(),
    name: z.string(),
    url: z.string().optional(),
    subtechniques: z.array(z.string()).default([]),
  })).default([]),

  // Tools and infrastructure
  tools: z.array(z.string()).default([]),
  malwareFamilies: z.array(z.string()).default([]),
  infrastructure: z.array(z.object({
    type: z.enum(['C2', 'HOSTING', 'VPN', 'PROXY', 'DNS']),
    value: z.string(),
    active: z.boolean(),
    firstSeen: z.string().datetime(),
    lastSeen: z.string().datetime(),
  })).default([]),

  // Campaigns
  campaigns: z.array(z.string()).default([]),

  // Capability assessment
  capabilities: z.object({
    reconnaissance: z.number().min(0).max(100),
    weaponization: z.number().min(0).max(100),
    delivery: z.number().min(0).max(100),
    exploitation: z.number().min(0).max(100),
    installation: z.number().min(0).max(100),
    commandControl: z.number().min(0).max(100),
    actionsOnObjectives: z.number().min(0).max(100),
  }).optional(),

  // Activity
  active: z.boolean().default(true),
  firstSeen: z.string().datetime(),
  lastSeen: z.string().datetime(),

  // Confidence
  confidence: z.number().min(0).max(100),

  // References
  references: z.array(z.object({
    title: z.string(),
    url: z.string().url(),
    date: z.string().datetime().optional(),
  })).default([]),

  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Campaign Schema
 */
export const campaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()).default([]),
  description: z.string().optional(),

  // Attribution
  threatActors: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(100),

  // Objectives
  objectives: z.array(z.string()).default([]),
  targets: z.array(z.object({
    sector: z.string(),
    country: z.string().optional(),
    organization: z.string().optional(),
  })).default([]),

  // TTPs
  tactics: z.array(z.string()).default([]),
  techniques: z.array(z.string()).default([]),

  // Tools and malware
  tools: z.array(z.string()).default([]),
  malware: z.array(z.string()).default([]),

  // Infrastructure
  infrastructure: z.array(z.string()).default([]),
  iocs: z.array(z.string()).default([]),

  // Timeline
  firstActivity: z.string().datetime(),
  lastActivity: z.string().datetime(),
  active: z.boolean().default(true),

  // Impact
  estimatedVictims: z.number().int().optional(),
  estimatedDamage: z.string().optional(),

  tenantId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * TTP (Tactics, Techniques, and Procedures) Schema
 */
export const ttpSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['TACTIC', 'TECHNIQUE', 'PROCEDURE']),

  // MITRE ATT&CK
  mitreId: z.string().optional(),
  mitreUrl: z.string().url().optional(),

  // Relationships
  parentId: z.string().optional(),
  relatedTtps: z.array(z.string()).default([]),

  // Detection
  detectionMethods: z.array(z.string()).default([]),
  mitigations: z.array(z.string()).default([]),

  // Usage
  threatActors: z.array(z.string()).default([]),
  campaigns: z.array(z.string()).default([]),
  malwareFamilies: z.array(z.string()).default([]),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Diamond Model Schema
 */
export const diamondModelSchema = z.object({
  id: z.string(),
  eventId: z.string(),

  // Core features
  adversary: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    type: threatActorTypeEnum.optional(),
  }),

  capability: z.object({
    description: z.string(),
    tools: z.array(z.string()).default([]),
    techniques: z.array(z.string()).default([]),
  }),

  infrastructure: z.object({
    type: z.string(),
    value: z.string(),
    description: z.string().optional(),
  }),

  victim: z.object({
    name: z.string().optional(),
    sector: z.string().optional(),
    country: z.string().optional(),
    asset: z.string().optional(),
  }),

  // Meta-features
  timestamp: z.string().datetime(),
  phase: z.string().optional(),
  result: z.string().optional(),
  direction: z.enum(['ADVERSARY_TO_INFRASTRUCTURE', 'INFRASTRUCTURE_TO_VICTIM', 'ADVERSARY_TO_VICTIM']).optional(),
  methodology: z.string().optional(),
  resources: z.array(z.string()).default([]),

  confidence: z.number().min(0).max(100),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Type exports
 */
export type ThreatActor = z.infer<typeof threatActorSchema>;
export type ThreatActorType = z.infer<typeof threatActorTypeEnum>;
export type SophisticationLevel = z.infer<typeof sophisticationLevelEnum>;
export type Motivation = z.infer<typeof motivationEnum>;
export type Campaign = z.infer<typeof campaignSchema>;
export type TTP = z.infer<typeof ttpSchema>;
export type DiamondModel = z.infer<typeof diamondModelSchema>;
