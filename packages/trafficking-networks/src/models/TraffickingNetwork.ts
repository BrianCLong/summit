/**
 * Trafficking Network Intelligence Models
 *
 * LEGAL NOTICE: This system is for authorized law enforcement use only.
 * All monitoring must comply with applicable laws and include victim protection protocols.
 *
 * VICTIM PROTECTION REQUIREMENTS:
 * - Victim data must be handled with extreme sensitivity
 * - Access limited to authorized victim services personnel
 * - Victim safety is paramount - no data sharing that could endanger victims
 * - Comply with victim privacy rights and trauma-informed practices
 */

import { z } from 'zod';

export enum TraffickingType {
  HUMAN_TRAFFICKING_SEX = 'HUMAN_TRAFFICKING_SEX',
  HUMAN_TRAFFICKING_LABOR = 'HUMAN_TRAFFICKING_LABOR',
  CHILD_EXPLOITATION = 'CHILD_EXPLOITATION',
  ORGAN_TRAFFICKING = 'ORGAN_TRAFFICKING',
  FORCED_MARRIAGE = 'FORCED_MARRIAGE',
  CHILD_SOLDIERS = 'CHILD_SOLDIERS',
  DOMESTIC_SERVITUDE = 'DOMESTIC_SERVITUDE'
}

export enum VictimStatus {
  IDENTIFIED = 'IDENTIFIED',
  RECOVERED = 'RECOVERED',
  IN_SERVICES = 'IN_SERVICES',
  MISSING = 'MISSING',
  DECEASED = 'DECEASED',
  LOCATION_UNKNOWN = 'LOCATION_UNKNOWN'
}

export const VictimProtectionSchema = z.object({
  // Minimal victim data - protect victim privacy
  victimId: z.string(), // Anonymous ID only
  ageRange: z.enum(['CHILD', 'MINOR', 'ADULT', 'UNKNOWN']),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']).optional(),
  nationality: z.string().optional(),

  // Status and services
  status: z.nativeEnum(VictimStatus),
  identifiedDate: z.date().optional(),
  recoveredDate: z.date().optional(),

  // Service provision
  servicesProvided: z.array(z.enum([
    'SHELTER',
    'MEDICAL_CARE',
    'MENTAL_HEALTH',
    'LEGAL_AID',
    'TRANSLATION',
    'FAMILY_REUNIFICATION',
    'WITNESS_PROTECTION',
    'OTHER'
  ])).optional(),
  serviceProvider: z.string().optional(), // NGO/Agency providing services

  // Legal protections
  hasProtectionOrder: z.boolean().optional(),
  inWitnessProtection: z.boolean().optional(),

  // Access restrictions - victim data requires special authorization
  accessRestrictions: z.array(z.string()),
  victimConsentForDataUse: z.boolean(),

  // Never include: names, addresses, specific locations, photos, or identifying details
  // All victim PII must be stored separately with maximum security
});

export const TraffickingRouteSchema = z.object({
  routeId: z.string(),
  originCountry: z.string(),
  transitCountries: z.array(z.string()),
  destinationCountry: z.string(),

  // Route details
  transportMethods: z.array(z.enum([
    'AIR',
    'MARITIME',
    'LAND_VEHICLE',
    'RAIL',
    'FOOT',
    'MULTIPLE'
  ])),
  averageDuration: z.string().optional(), // e.g., "2-4 weeks"
  estimatedFrequency: z.string().optional(),

  // Border crossings
  borderCrossings: z.array(z.object({
    location: z.string(),
    method: z.enum(['LEGAL_ENTRY', 'ILLEGAL_CROSSING', 'FRAUDULENT_DOCS', 'SMUGGLING', 'UNKNOWN']),
    facilitators: z.array(z.string()).optional() // Entity IDs
  })),

  // Safe houses / waypoints
  waypoints: z.array(z.object({
    location: z.string(), // General area only
    purpose: z.enum(['SAFE_HOUSE', 'TRANSFER_POINT', 'HOLDING_LOCATION', 'DOCUMENT_PROCESSING']),
    controlledBy: z.string().optional() // Entity or organization ID
  })).optional(),

  // Activity level
  activityStatus: z.enum(['ACTIVE', 'DORMANT', 'DISRUPTED', 'UNKNOWN']),
  lastKnownActivity: z.date().optional()
});

export const RecruitmentMethodSchema = z.object({
  method: z.enum([
    'FALSE_EMPLOYMENT',
    'FALSE_MARRIAGE',
    'FALSE_EDUCATION',
    'ABDUCTION',
    'FAMILY_SOLD',
    'DEBT_BONDAGE',
    'ONLINE_GROOMING',
    'PEER_RECRUITMENT',
    'OTHER'
  ]),
  targetDemographics: z.array(z.string()),
  platforms: z.array(z.string()).optional(), // Social media, websites, etc.
  recruiters: z.array(z.string()).optional(), // Entity IDs
  geographicFocus: z.array(z.string()).optional()
});

export const DocumentFraudSchema = z.object({
  documentType: z.enum([
    'PASSPORT',
    'VISA',
    'WORK_PERMIT',
    'BIRTH_CERTIFICATE',
    'ID_CARD',
    'TRAVEL_DOCUMENT',
    'OTHER'
  ]),
  fraudMethod: z.enum([
    'COUNTERFEIT',
    'ALTERED',
    'STOLEN_BLANK',
    'FRAUDULENT_ISSUANCE',
    'IDENTITY_THEFT'
  ]),
  sourceCountry: z.string().optional(),
  producers: z.array(z.string()).optional(), // Entity IDs
  estimatedQuality: z.enum(['LOW', 'MEDIUM', 'HIGH', 'PROFESSIONAL']).optional()
});

export const SafeHouseSchema = z.object({
  locationId: z.string(),
  // Location kept vague to protect operations
  generalArea: z.string(), // City/region only
  locationType: z.enum([
    'RESIDENTIAL',
    'COMMERCIAL',
    'INDUSTRIAL',
    'RURAL',
    'HOTEL',
    'APARTMENT',
    'OTHER'
  ]),

  // Capacity and conditions
  estimatedCapacity: z.number().optional(),
  conditions: z.enum(['SEVERE', 'POOR', 'MODERATE', 'UNKNOWN']).optional(),

  // Control and security
  controlledBy: z.string(), // Entity or organization ID
  securityMeasures: z.array(z.string()).optional(),

  // Operational status
  status: z.enum(['ACTIVE', 'INACTIVE', 'RAIDED', 'ABANDONED', 'UNKNOWN']),
  lastVerified: z.date().optional(),

  // Investigation data
  surveillanceInPlace: z.boolean().optional(),
  plannedOperations: z.array(z.string()).optional() // Operation IDs
});

export const TraffickingNetworkSchema = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()).optional(),

  // Legal compliance
  legalAuthorities: z.array(z.object({
    authorityType: z.string(),
    authorizingAgency: z.string(),
    caseNumber: z.string(),
    issuedDate: z.date(),
    expirationDate: z.date().optional()
  })),
  classificationLevel: z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']),

  // Network classification
  traffickingTypes: z.array(z.nativeEnum(TraffickingType)),
  operationalScale: z.enum(['LOCAL', 'REGIONAL', 'NATIONAL', 'INTERNATIONAL', 'GLOBAL']),
  threatLevel: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']),

  // Organization structure
  organizationId: z.string().optional(), // Link to criminal organization if applicable
  keyOperators: z.array(z.object({
    entityId: z.string(),
    role: z.enum([
      'LEADER',
      'RECRUITER',
      'TRANSPORTER',
      'ENFORCER',
      'DOCUMENT_FORGER',
      'FINANCIAL_HANDLER',
      'SAFE_HOUSE_OPERATOR',
      'CORRUPT_OFFICIAL',
      'OTHER'
    ]),
    status: z.enum(['ACTIVE', 'ARRESTED', 'DECEASED', 'FUGITIVE', 'UNKNOWN'])
  })),

  // Victim data - HIGHLY RESTRICTED ACCESS
  victims: z.array(VictimProtectionSchema),
  estimatedVictimCount: z.number().optional(),
  victimDemographics: z.object({
    ageRanges: z.array(z.string()),
    genders: z.array(z.string()),
    nationalities: z.array(z.string())
  }).optional(),

  // Operations
  routes: z.array(TraffickingRouteSchema),
  recruitmentMethods: z.array(RecruitmentMethodSchema),
  documentFraud: z.array(DocumentFraudSchema).optional(),
  safeHouses: z.array(SafeHouseSchema).optional(),

  // Financial operations
  estimatedRevenue: z.number().optional(),
  paymentMethods: z.array(z.string()).optional(),
  moneyLaunderingMethods: z.array(z.string()).optional(),

  // Intelligence and investigation
  investigatingAgencies: z.array(z.string()),
  internationalCooperation: z.array(z.object({
    country: z.string(),
    agency: z.string(),
    cooperationType: z.string()
  })).optional(),
  intelligenceSources: z.array(z.string()),
  confidenceLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'VERIFIED']),

  // Operations and disruption
  plannedOperations: z.array(z.object({
    operationId: z.string(),
    operationType: z.enum(['RESCUE', 'ARREST', 'SURVEILLANCE', 'INFILTRATION', 'ASSET_SEIZURE']),
    status: z.enum(['PLANNING', 'APPROVED', 'ACTIVE', 'COMPLETED', 'ABORTED']),
    leadAgency: z.string()
  })).optional(),

  disruptionHistory: z.array(z.object({
    date: z.date(),
    actionType: z.enum(['ARRESTS', 'RESCUES', 'ASSET_SEIZURE', 'ROUTE_DISRUPTION', 'OTHER']),
    description: z.string(),
    victimsRecovered: z.number().optional(),
    arrestsMade: z.number().optional(),
    impact: z.enum(['MINOR', 'MODERATE', 'SIGNIFICANT', 'NETWORK_DISMANTLED'])
  })).optional(),

  // Metadata
  status: z.enum(['ACTIVE', 'DISRUPTED', 'DISMANTLED', 'MONITORING']),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastVerified: z.date(),

  // Audit trail
  auditLog: z.array(z.object({
    accessedBy: z.string(),
    accessedAt: z.date(),
    action: z.string(),
    justification: z.string(),
    legalAuthority: z.string()
  }))
});

export type VictimProtection = z.infer<typeof VictimProtectionSchema>;
export type TraffickingRoute = z.infer<typeof TraffickingRouteSchema>;
export type RecruitmentMethod = z.infer<typeof RecruitmentMethodSchema>;
export type DocumentFraud = z.infer<typeof DocumentFraudSchema>;
export type SafeHouse = z.infer<typeof SafeHouseSchema>;
export type TraffickingNetwork = z.infer<typeof TraffickingNetworkSchema>;

/**
 * Victim protection utilities - CRITICAL SAFEGUARDS
 */
export class VictimProtectionValidator {
  /**
   * Validate that victim data access is properly authorized and restricted
   */
  static validateVictimAccess(userId: string, userRole: string): boolean {
    // Only victim services, authorized investigators, and prosecutors
    const authorizedRoles = [
      'VICTIM_SERVICES',
      'LEAD_INVESTIGATOR',
      'PROSECUTOR',
      'AUTHORIZED_ANALYST'
    ];

    if (!authorizedRoles.includes(userRole)) {
      throw new Error('Unauthorized access to victim data - restricted to victim services and authorized personnel only');
    }

    return true;
  }

  /**
   * Redact victim identifying information for users without victim service authorization
   */
  static redactVictimData(network: TraffickingNetwork, userRole: string): TraffickingNetwork {
    if (userRole !== 'VICTIM_SERVICES' && userRole !== 'LEAD_INVESTIGATOR') {
      // Remove all victim-specific data, keep only aggregated statistics
      return {
        ...network,
        victims: [], // Remove individual victim records
        victimDemographics: network.victimDemographics // Keep only aggregated demographics
      };
    }
    return network;
  }

  /**
   * Ensure victim consent is properly documented
   */
  static validateVictimConsent(victim: VictimProtection): boolean {
    if (!victim.victimConsentForDataUse) {
      throw new Error('Victim has not consented to data use - access restricted');
    }
    return true;
  }
}
