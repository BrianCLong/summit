/**
 * Law Enforcement Operations Support Models
 *
 * LEGAL NOTICE: For authorized law enforcement use only.
 * All operations must comply with applicable laws and constitutional protections.
 */

import { z } from 'zod';

export enum OperationType {
  INVESTIGATION = 'INVESTIGATION',
  SURVEILLANCE = 'SURVEILLANCE',
  UNDERCOVER = 'UNDERCOVER',
  WIRETAP = 'WIRETAP',
  RAID = 'RAID',
  ARREST = 'ARREST',
  ASSET_SEIZURE = 'ASSET_SEIZURE',
  SEARCH_WARRANT = 'SEARCH_WARRANT',
  STING_OPERATION = 'STING_OPERATION',
  CONTROLLED_DELIVERY = 'CONTROLLED_DELIVERY',
  TASK_FORCE = 'TASK_FORCE',
  INTERNATIONAL_COOPERATION = 'INTERNATIONAL_COOPERATION'
}

export const InvestigationCaseSchema = z.object({
  caseId: z.string(),
  caseNumber: z.string(),
  caseName: z.string(),

  // Legal authority
  legalAuthorities: z.array(z.object({
    authorityType: z.enum(['WARRANT', 'GRAND_JURY', 'COURT_ORDER', 'ADMINISTRATIVE', 'INTELLIGENCE']),
    documentNumber: z.string(),
    issuedBy: z.string(), // Court/judge
    issuedDate: z.date(),
    expirationDate: z.date().optional(),
    scope: z.string(),
    limitations: z.array(z.string()).optional()
  })),

  classificationLevel: z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']),

  // Case details
  investigationType: z.enum([
    'ORGANIZED_CRIME',
    'DRUG_TRAFFICKING',
    'HUMAN_TRAFFICKING',
    'WEAPONS_TRAFFICKING',
    'FINANCIAL_CRIME',
    'CYBERCRIME',
    'CORRUPTION',
    'TERRORISM',
    'VIOLENT_CRIME',
    'OTHER'
  ]),

  description: z.string(),
  openedDate: z.date(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'CLOSED_ARRESTED', 'CLOSED_PROSECUTED', 'CLOSED_UNFOUNDED']),

  // Involved entities
  subjects: z.array(z.object({
    entityId: z.string(),
    role: z.enum(['PRIMARY_SUBJECT', 'SECONDARY_SUBJECT', 'ASSOCIATE', 'SUSPECT', 'PERSON_OF_INTEREST']),
    charges: z.array(z.string()).optional(),
    status: z.enum(['UNDER_INVESTIGATION', 'ARRESTED', 'INDICTED', 'FUGITIVE', 'DECEASED'])
  })),

  organizationIds: z.array(z.string()).optional(),

  // Investigation team
  leadAgency: z.string(),
  participatingAgencies: z.array(z.string()),
  caseAgents: z.array(z.object({
    agentId: z.string(),
    agency: z.string(),
    role: z.enum(['CASE_AGENT', 'CO_CASE_AGENT', 'SUPPORTING_AGENT', 'ANALYST', 'PROSECUTOR'])
  })),

  prosecutor: z.object({
    name: z.string(),
    office: z.string(),
    contactInfo: z.string().optional()
  }).optional(),

  // Evidence tracking
  evidence: z.array(z.object({
    evidenceId: z.string(),
    type: z.enum([
      'PHYSICAL',
      'DOCUMENTARY',
      'DIGITAL',
      'FINANCIAL_RECORDS',
      'SURVEILLANCE_VIDEO',
      'AUDIO_RECORDING',
      'TESTIMONY',
      'FORENSIC',
      'OTHER'
    ]),
    description: z.string(),
    collectedDate: z.date(),
    collectedBy: z.string(),
    location: z.string(), // Evidence storage
    chainOfCustody: z.array(z.object({
      date: z.date(),
      transferredFrom: z.string(),
      transferredTo: z.string(),
      purpose: z.string()
    }))
  })).optional(),

  // Operations
  operations: z.array(z.string()), // Operation IDs

  // Intelligence
  intelligenceSources: z.array(z.string()),
  relatedCases: z.array(z.string()).optional(),

  // Outcome
  arrests: z.array(z.object({
    date: z.date(),
    entityId: z.string(),
    charges: z.array(z.string()),
    arrestingAgency: z.string(),
    location: z.string()
  })).optional(),

  seizures: z.array(z.object({
    date: z.date(),
    type: z.enum(['DRUGS', 'WEAPONS', 'CASH', 'PROPERTY', 'VEHICLES', 'CRYPTOCURRENCY', 'OTHER']),
    description: z.string(),
    estimatedValue: z.number().optional(),
    quantity: z.string().optional()
  })).optional(),

  // Prosecution
  prosecution: z.object({
    filed: z.boolean(),
    filingDate: z.date().optional(),
    court: z.string().optional(),
    docketNumber: z.string().optional(),
    charges: z.array(z.string()).optional(),
    trialDate: z.date().optional(),
    verdict: z.string().optional(),
    sentence: z.string().optional()
  }).optional(),

  // Metadata
  createdAt: z.date(),
  updatedAt: z.date(),
  closedDate: z.date().optional(),

  // Audit trail
  auditLog: z.array(z.object({
    accessedBy: z.string(),
    accessedAt: z.date(),
    action: z.string(),
    changes: z.string().optional()
  }))
});

export const SurveillanceOperationSchema = z.object({
  operationId: z.string(),
  operationName: z.string(),
  operationType: z.nativeEnum(OperationType),

  // Legal authority - REQUIRED
  legalAuthority: z.object({
    authorityType: z.enum(['WARRANT', 'COURT_ORDER', 'FISA', 'TITLE_III', 'PEN_REGISTER', 'CONSENT']),
    documentNumber: z.string(),
    issuedBy: z.string(),
    issuedDate: z.date(),
    expirationDate: z.date(),
    scope: z.string(),
    reportingRequirements: z.array(z.string()).optional()
  }),

  // Case linkage
  caseId: z.string(),
  caseNumber: z.string(),

  // Targets
  targets: z.array(z.object({
    entityId: z.string(),
    targetType: z.enum(['PERSON', 'LOCATION', 'PHONE', 'EMAIL', 'VEHICLE', 'ORGANIZATION']),
    justification: z.string()
  })),

  // Operation details
  startDate: z.date(),
  endDate: z.date().optional(),
  status: z.enum(['PLANNED', 'APPROVED', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'SUSPENDED']),

  // Surveillance methods
  methods: z.array(z.enum([
    'PHYSICAL_SURVEILLANCE',
    'VIDEO_SURVEILLANCE',
    'AUDIO_SURVEILLANCE',
    'WIRETAP',
    'ELECTRONIC_MONITORING',
    'GPS_TRACKING',
    'CELL_SITE_SIMULATOR',
    'PEN_REGISTER',
    'TRAP_AND_TRACE',
    'MAIL_COVER',
    'UNDERCOVER'
  ])),

  // Team
  operatingAgency: z.string(),
  teamMembers: z.array(z.object({
    agentId: z.string(),
    role: z.string()
  })),

  // Results
  intelligenceGathered: z.array(z.object({
    date: z.date(),
    type: z.string(),
    summary: z.string(),
    evidenceId: z.string().optional()
  })).optional(),

  // Reporting
  progressReports: z.array(z.object({
    reportDate: z.date(),
    reportedTo: z.string(), // Court/supervisor
    summary: z.string(),
    interceptsCaptured: z.number().optional()
  })).optional(),

  // Metadata
  createdAt: z.date(),
  updatedAt: z.date()
});

export const InformantManagementSchema = z.object({
  informantId: z.string(), // Anonymous ID
  codeNumber: z.string(), // Agency code number for informant

  // HIGHLY RESTRICTED - Informant safety is paramount
  handlingAgency: z.string(),
  handlingAgent: z.string(), // Primary handler

  // Informant details (minimal, protected)
  reliability: z.enum(['RELIABLE', 'USUALLY_RELIABLE', 'UNRELIABLE', 'UNTESTED']),
  motivations: z.array(z.enum([
    'FINANCIAL',
    'COOPERATION_AGREEMENT',
    'REVENGE',
    'CONSCIENCE',
    'FEAR',
    'IDEOLOGY',
    'UNKNOWN'
  ])),

  // Status
  status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED', 'COMPROMISED', 'RELOCATED']),
  activatedDate: z.date(),

  // Operations and intelligence
  casesInvolved: z.array(z.string()), // Case IDs
  intelligenceProvided: z.array(z.object({
    date: z.date(),
    caseId: z.string(),
    intelligenceType: z.string(),
    reliability: z.enum(['CONFIRMED', 'PROBABLE', 'POSSIBLE', 'DOUBTFUL']),
    value: z.enum(['CRITICAL', 'HIGH', 'MODERATE', 'LOW'])
  })),

  // Payments (if applicable)
  paymentsAuthorized: z.array(z.object({
    date: z.date(),
    amount: z.number(),
    purpose: z.string(),
    approvedBy: z.string()
  })).optional(),

  // Risk assessment
  riskLevel: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']),
  safetyMeasures: z.array(z.string()),

  // Access restrictions - MOST RESTRICTIVE
  accessRestrictions: z.array(z.string()),

  // Audit trail with extreme protection
  auditLog: z.array(z.object({
    accessedBy: z.string(),
    accessedAt: z.date(),
    action: z.string(),
    justification: z.string(),
    approvedBy: z.string() // Supervisor approval required
  }))
});

export const TaskForceSchema = z.object({
  taskForceId: z.string(),
  taskForceName: z.string(),

  // Mission
  mission: z.string(),
  focus: z.array(z.string()),

  // Agencies
  leadAgency: z.string(),
  participatingAgencies: z.array(z.object({
    agency: z.string(),
    personnelCommitted: z.number(),
    resources: z.array(z.string())
  })),

  // Leadership
  commander: z.object({
    name: z.string(),
    agency: z.string(),
    rank: z.string()
  }),

  // Operations
  establishedDate: z.date(),
  disbandedDate: z.date().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DISBANDED']),

  // Cases
  activeCases: z.array(z.string()), // Case IDs
  closedCases: z.array(z.string()).optional(),

  // Results
  statistics: z.object({
    arrests: z.number(),
    indictments: z.number(),
    convictions: z.number(),
    drugsSeized: z.string().optional(),
    assetsSeized: z.number().optional(),
    organizationsDisrupted: z.number().optional()
  }).optional(),

  // Resources
  funding: z.object({
    totalBudget: z.number(),
    federalFunding: z.number().optional(),
    stateFunding: z.number().optional(),
    localFunding: z.number().optional()
  }).optional()
});

export type InvestigationCase = z.infer<typeof InvestigationCaseSchema>;
export type SurveillanceOperation = z.infer<typeof SurveillanceOperationSchema>;
export type InformantManagement = z.infer<typeof InformantManagementSchema>;
export type TaskForce = z.infer<typeof TaskForceSchema>;
