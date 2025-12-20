/**
 * Corruption and Infiltration Tracking Models
 *
 * LEGAL NOTICE: For authorized law enforcement and integrity oversight use only.
 * All corruption investigations must comply with applicable laws and protections
 * for government officials' rights during investigations.
 */

import { z } from 'zod';

export enum CorruptionType {
  BRIBERY = 'BRIBERY',
  EMBEZZLEMENT = 'EMBEZZLEMENT',
  EXTORTION = 'EXTORTION',
  NEPOTISM = 'NEPOTISM',
  PATRONAGE = 'PATRONAGE',
  KICKBACKS = 'KICKBACKS',
  CONTRACT_FRAUD = 'CONTRACT_FRAUD',
  CONFLICT_OF_INTEREST = 'CONFLICT_OF_INTEREST',
  INFLUENCE_PEDDLING = 'INFLUENCE_PEDDLING',
  VOTE_BUYING = 'VOTE_BUYING',
  MISAPPROPRIATION = 'MISAPPROPRIATION',
  ABUSE_OF_POWER = 'ABUSE_OF_POWER'
}

export const CorruptionCaseSchema = z.object({
  caseId: z.string(),
  corruptionTypes: z.array(z.nativeEnum(CorruptionType)),

  // Involved parties
  corruptOfficials: z.array(z.object({
    entityId: z.string(),
    position: z.string(),
    agency: z.string(),
    jurisdiction: z.string(),
    allegations: z.array(z.string())
  })),

  privateSectorInvolvement: z.array(z.object({
    entityId: z.string(),
    organization: z.string(),
    role: z.string(),
    benefit: z.string()
  })).optional(),

  // Criminal organization ties
  organizedCrimeTies: z.array(z.object({
    organizationId: z.string(),
    relationshipType: z.string(),
    benefits: z.array(z.string())
  })).optional(),

  // Scheme details
  description: z.string(),
  timeframe: z.object({
    startDate: z.date().optional(),
    endDate: z.date().optional()
  }),

  // Financial details
  estimatedValue: z.number().optional(),
  bribesAmount: z.number().optional(),
  misappropriatedFunds: z.number().optional(),

  // Evidence
  evidenceTypes: z.array(z.enum([
    'FINANCIAL_RECORDS',
    'COMMUNICATIONS',
    'WITNESS_TESTIMONY',
    'SURVEILLANCE',
    'UNDERCOVER_RECORDINGS',
    'BANK_RECORDS',
    'CONTRACTS',
    'DOCUMENTS'
  ])).optional(),

  // Investigation
  investigatingAgency: z.string(),
  investigationStatus: z.enum(['PRELIMINARY', 'ACTIVE', 'COMPLETED', 'PROSECUTED', 'DISMISSED']),
  prosecutions: z.array(z.object({
    defendant: z.string(),
    charges: z.array(z.string()),
    status: z.string(),
    outcome: z.string().optional()
  })).optional()
});

export const InfiltrationNetworkSchema = z.object({
  networkId: z.string(),
  infiltratedSector: z.enum([
    'LAW_ENFORCEMENT',
    'JUDICIARY',
    'CUSTOMS_BORDER',
    'MILITARY',
    'POLITICAL',
    'REGULATORY_AGENCIES',
    'FINANCIAL_SECTOR',
    'LABOR_UNIONS',
    'PRIVATE_SECTOR'
  ]),

  // Criminal organization
  organizationId: z.string(),
  organizationName: z.string(),

  // Infiltrated positions
  infiltrators: z.array(z.object({
    entityId: z.string(),
    position: z.string(),
    agency: z.string(),
    recruitmentDate: z.date().optional(),
    recruitmentMethod: z.enum(['PLACED', 'CORRUPTED', 'COERCED', 'IDEOLOGICAL', 'UNKNOWN']).optional(),
    services_provided: z.array(z.string())
  })),

  // Impact and benefits
  benefitsToOrganization: z.array(z.string()),
  compromisedOperations: z.array(z.string()).optional(),
  leakedInformation: z.array(z.string()).optional(),

  // Countermeasures
  detectionMethod: z.string().optional(),
  counterIntelligenceOperations: z.array(z.string()).optional(),

  status: z.enum(['ACTIVE', 'DISRUPTED', 'PROSECUTED', 'MONITORING'])
});

export const CorruptionIntelligenceSchema = z.object({
  id: z.string(),

  // Legal compliance
  legalAuthorities: z.array(z.object({
    authorityType: z.string(),
    authorizingAgency: z.string(),
    caseNumber: z.string(),
    issuedDate: z.date()
  })),
  classificationLevel: z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']),

  // Cases and networks
  corruptionCases: z.array(CorruptionCaseSchema),
  infiltrationNetworks: z.array(InfiltrationNetworkSchema).optional(),

  // Metadata
  investigatingAgencies: z.array(z.string()),
  intelligenceSources: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),

  // Audit trail
  auditLog: z.array(z.object({
    accessedBy: z.string(),
    accessedAt: z.date(),
    action: z.string(),
    justification: z.string()
  }))
});

export type CorruptionCase = z.infer<typeof CorruptionCaseSchema>;
export type InfiltrationNetwork = z.infer<typeof InfiltrationNetworkSchema>;
export type CorruptionIntelligence = z.infer<typeof CorruptionIntelligenceSchema>;
