/**
 * Criminal Organization Tracking Models
 *
 * LEGAL NOTICE: This system is designed for authorized law enforcement,
 * intelligence, and military use only. All data collection and monitoring
 * must comply with applicable laws, regulations, and constitutional protections.
 *
 * Requirements:
 * - Proper legal authority (warrants, court orders, etc.)
 * - Judicial oversight where required
 * - Data minimization and retention policies
 * - Privacy protections for non-targets
 * - Audit logging of all access
 */

import { z } from 'zod';

export enum OrganizationType {
  MAFIA = 'MAFIA',
  CARTEL = 'CARTEL',
  GANG = 'GANG',
  SYNDICATE = 'SYNDICATE',
  TERRORIST_ORGANIZATION = 'TERRORIST_ORGANIZATION',
  CYBERCRIME_GROUP = 'CYBERCRIME_GROUP',
  TRAFFICKING_NETWORK = 'TRAFFICKING_NETWORK',
  MONEY_LAUNDERING_RING = 'MONEY_LAUNDERING_RING',
  WEAPONS_TRAFFICKING_GROUP = 'WEAPONS_TRAFFICKING_GROUP',
  OTHER = 'OTHER'
}

export enum ThreatLevel {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
  EXTREME = 'EXTREME'
}

export enum OrganizationStatus {
  ACTIVE = 'ACTIVE',
  DORMANT = 'DORMANT',
  DISRUPTED = 'DISRUPTED',
  DISBANDED = 'DISBANDED',
  MONITORING = 'MONITORING',
  UNDER_INVESTIGATION = 'UNDER_INVESTIGATION'
}

export enum MemberRole {
  LEADER = 'LEADER',
  UNDERBOSS = 'UNDERBOSS',
  LIEUTENANT = 'LIEUTENANT',
  ENFORCER = 'ENFORCER',
  SOLDIER = 'SOLDIER',
  ASSOCIATE = 'ASSOCIATE',
  COURIER = 'COURIER',
  MONEY_HANDLER = 'MONEY_HANDLER',
  UNKNOWN = 'UNKNOWN'
}

export const LegalAuthoritySchema = z.object({
  authorityType: z.enum(['WARRANT', 'COURT_ORDER', 'SUBPOENA', 'INTELLIGENCE_AUTHORIZATION', 'FISA', 'OTHER']),
  authorizingAgency: z.string(),
  caseNumber: z.string(),
  issuedDate: z.date(),
  expirationDate: z.date().optional(),
  scope: z.string(),
  limitations: z.string().optional(),
  renewals: z.array(z.object({
    renewedDate: z.date(),
    newExpirationDate: z.date(),
    authorizingOfficial: z.string()
  })).optional()
});

export const AuditLogSchema = z.object({
  accessedBy: z.string(), // User ID
  accessedAt: z.date(),
  action: z.enum(['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'SEARCH', 'EXPORT', 'SHARE']),
  ipAddress: z.string(),
  userAgent: z.string().optional(),
  justification: z.string(),
  legalAuthority: z.string() // Reference to legal authority
});

export const GeographicTerritorySchema = z.object({
  region: z.string(),
  cities: z.array(z.string()),
  neighborhoods: z.array(z.string()).optional(),
  controlLevel: z.enum(['FULL', 'PARTIAL', 'CONTESTED', 'EXPANDING', 'DECLINING']),
  establishedDate: z.date().optional(),
  boundaryDescription: z.string().optional()
});

export const CriminalActivitySchema = z.object({
  activityType: z.enum([
    'DRUG_TRAFFICKING',
    'HUMAN_TRAFFICKING',
    'WEAPONS_TRAFFICKING',
    'MONEY_LAUNDERING',
    'EXTORTION',
    'RACKETEERING',
    'MURDER_FOR_HIRE',
    'KIDNAPPING',
    'ROBBERY',
    'CYBERCRIME',
    'FRAUD',
    'COUNTERFEITING',
    'SMUGGLING',
    'CORRUPTION',
    'OTHER'
  ]),
  description: z.string(),
  estimatedRevenue: z.number().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'SPORADIC', 'UNKNOWN']),
  locations: z.array(z.string()).optional(),
  knownVictims: z.number().optional()
});

export const OrganizationMemberSchema = z.object({
  entityId: z.string(), // Reference to Entity in main system
  role: z.nativeEnum(MemberRole),
  joinedDate: z.date().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DECEASED', 'INCARCERATED', 'COOPERATING', 'UNKNOWN']),
  loyalty: z.enum(['HIGH', 'MEDIUM', 'LOW', 'QUESTIONABLE', 'UNKNOWN']).optional(),
  specialties: z.array(z.string()).optional(),
  rank: z.number().optional(), // Hierarchical rank
  reportingTo: z.string().optional(), // Member ID they report to
  controls: z.array(z.string()).optional(), // Member IDs they control
  arrestHistory: z.array(z.object({
    date: z.date(),
    charges: z.array(z.string()),
    outcome: z.string()
  })).optional()
});

export const InterOrganizationRelationshipSchema = z.object({
  relatedOrganizationId: z.string(),
  relationshipType: z.enum([
    'ALLIED',
    'HOSTILE',
    'COMPETITIVE',
    'COOPERATIVE',
    'SUBORDINATE',
    'PARENT',
    'NEUTRAL',
    'UNKNOWN'
  ]),
  establishedDate: z.date().optional(),
  description: z.string().optional(),
  jointOperations: z.array(z.string()).optional(),
  conflicts: z.array(z.object({
    date: z.date(),
    description: z.string(),
    casualties: z.number().optional()
  })).optional()
});

export const LeadershipSuccessionSchema = z.object({
  previousLeader: z.string(), // Entity ID
  currentLeader: z.string(), // Entity ID
  transitionDate: z.date(),
  transitionType: z.enum(['NATURAL', 'ARREST', 'DEATH', 'COUP', 'RETIREMENT', 'UNKNOWN']),
  impactAssessment: z.string().optional(),
  stabilityChange: z.enum(['STRENGTHENED', 'WEAKENED', 'UNCHANGED', 'UNCLEAR'])
});

export const CriminalEnterpriseSchema = z.object({
  enterpriseName: z.string(),
  frontBusinesses: z.array(z.object({
    businessName: z.string(),
    businessType: z.string(),
    location: z.string(),
    legitimateRevenue: z.number().optional(),
    illicitRevenue: z.number().optional()
  })),
  diversificationAreas: z.array(z.string()),
  estimatedTotalRevenue: z.number().optional(),
  assetHoldings: z.array(z.object({
    assetType: z.string(),
    location: z.string(),
    estimatedValue: z.number().optional(),
    ownershipStructure: z.string()
  })).optional()
});

export const CriminalOrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()).optional(),
  organizationType: z.nativeEnum(OrganizationType),
  status: z.nativeEnum(OrganizationStatus),
  threatLevel: z.nativeEnum(ThreatLevel),

  // Legal compliance
  legalAuthorities: z.array(LegalAuthoritySchema),
  classificationLevel: z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']),
  handlingRestrictions: z.array(z.string()),

  // Organization details
  foundedDate: z.date().optional(),
  originCountry: z.string().optional(),
  primaryOperatingRegions: z.array(z.string()),
  estimatedMemberCount: z.number().optional(),

  // Leadership and structure
  currentLeader: z.string().optional(), // Entity ID
  leadershipStructure: z.string().optional(),
  hierarchyLevels: z.number().optional(),
  members: z.array(OrganizationMemberSchema),
  successionHistory: z.array(LeadershipSuccessionSchema).optional(),

  // Territory and operations
  territories: z.array(GeographicTerritorySchema),
  criminalActivities: z.array(CriminalActivitySchema),
  enterprises: z.array(CriminalEnterpriseSchema).optional(),

  // Relationships
  alliances: z.array(InterOrganizationRelationshipSchema).optional(),
  rivalries: z.array(InterOrganizationRelationshipSchema).optional(),
  splinterGroups: z.array(z.object({
    groupId: z.string(),
    splitDate: z.date(),
    reason: z.string(),
    currentRelationship: z.string()
  })).optional(),

  // Intelligence
  communicationMethods: z.array(z.string()).optional(),
  recruitmentMethods: z.array(z.string()).optional(),
  symbols: z.array(z.string()).optional(),
  initiation_rituals: z.string().optional(),
  codeWords: z.array(z.string()).optional(),

  // Investigation support
  investigatingAgencies: z.array(z.string()),
  activeInvestigations: z.array(z.string()), // Case IDs
  prosecutions: z.array(z.object({
    caseId: z.string(),
    defendants: z.array(z.string()),
    charges: z.array(z.string()),
    status: z.string(),
    outcome: z.string().optional()
  })).optional(),

  // Metadata
  intelligence_sources: z.array(z.string()),
  confidenceLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'VERIFIED']),
  lastUpdated: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),

  // Audit trail
  auditLog: z.array(AuditLogSchema)
});

export type LegalAuthority = z.infer<typeof LegalAuthoritySchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
export type GeographicTerritory = z.infer<typeof GeographicTerritorySchema>;
export type CriminalActivity = z.infer<typeof CriminalActivitySchema>;
export type OrganizationMember = z.infer<typeof OrganizationMemberSchema>;
export type InterOrganizationRelationship = z.infer<typeof InterOrganizationRelationshipSchema>;
export type LeadershipSuccession = z.infer<typeof LeadershipSuccessionSchema>;
export type CriminalEnterprise = z.infer<typeof CriminalEnterpriseSchema>;
export type CriminalOrganization = z.infer<typeof CriminalOrganizationSchema>;

/**
 * Privacy and compliance utilities
 */
export class ComplianceValidator {
  static validateLegalAuthority(authority: LegalAuthority): boolean {
    const now = new Date();
    if (authority.expirationDate && authority.expirationDate < now) {
      throw new Error('Legal authority has expired');
    }
    return true;
  }

  static validateDataAccess(
    organization: CriminalOrganization,
    userId: string,
    action: string,
    justification: string
  ): boolean {
    // Verify active legal authority exists
    const hasValidAuthority = organization.legalAuthorities.some(auth => {
      try {
        return this.validateLegalAuthority(auth);
      } catch {
        return false;
      }
    });

    if (!hasValidAuthority) {
      throw new Error('No valid legal authority for accessing this organization data');
    }

    // Require justification for all access
    if (!justification || justification.trim().length < 10) {
      throw new Error('Detailed justification required for data access');
    }

    return true;
  }

  static logAccess(
    organization: CriminalOrganization,
    userId: string,
    action: AuditLog['action'],
    justification: string,
    legalAuthorityRef: string,
    ipAddress: string,
    userAgent?: string
  ): AuditLog {
    const auditEntry: AuditLog = {
      accessedBy: userId,
      accessedAt: new Date(),
      action,
      ipAddress,
      userAgent,
      justification,
      legalAuthority: legalAuthorityRef
    };

    organization.auditLog.push(auditEntry);
    return auditEntry;
  }
}
