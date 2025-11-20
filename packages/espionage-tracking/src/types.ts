import { z } from 'zod';

/**
 * Core Espionage Tracking Types
 *
 * This package provides comprehensive types for tracking espionage activities,
 * foreign intelligence operations, and counterintelligence operations.
 */

// ============================================================================
// CLASSIFICATION AND SECURITY LEVELS
// ============================================================================

export const classificationLevelSchema = z.enum([
  'UNCLASSIFIED',
  'CONFIDENTIAL',
  'SECRET',
  'TOP_SECRET',
  'TOP_SECRET_SCI',
  'SAP', // Special Access Program
]);

export type ClassificationLevel = z.infer<typeof classificationLevelSchema>;

export const compartmentSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

export type Compartment = z.infer<typeof compartmentSchema>;

// ============================================================================
// INTELLIGENCE AGENCIES AND ORGANIZATIONS
// ============================================================================

export const intelligenceAgencyTypeSchema = z.enum([
  'FOREIGN_INTELLIGENCE',
  'DOMESTIC_INTELLIGENCE',
  'MILITARY_INTELLIGENCE',
  'SIGNALS_INTELLIGENCE',
  'CYBER_INTELLIGENCE',
  'COUNTERINTELLIGENCE',
  'TECHNICAL_INTELLIGENCE',
  'GEOSPATIAL_INTELLIGENCE',
  'HUMINT', // Human Intelligence
  'OSINT', // Open Source Intelligence
]);

export type IntelligenceAgencyType = z.infer<typeof intelligenceAgencyTypeSchema>;

export const intelligenceAgencySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  country: z.string(),
  agencyType: intelligenceAgencyTypeSchema,
  aliases: z.array(z.string()).default([]),
  foundedDate: z.string().datetime().optional(),
  headquarters: z.string().optional(),
  estimatedBudget: z.number().optional(),
  estimatedPersonnel: z.number().optional(),
  parent: z.string().uuid().optional(),
  subordinateAgencies: z.array(z.string().uuid()).default([]),
  capabilities: z.array(z.string()).default([]),
  priorityTargets: z.array(z.string()).default([]),
  cooperationPartners: z.array(z.string().uuid()).default([]),
  adversaries: z.array(z.string().uuid()).default([]),
  classification: classificationLevelSchema,
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type IntelligenceAgency = z.infer<typeof intelligenceAgencySchema>;

// ============================================================================
// INTELLIGENCE OFFICERS AND AGENTS
// ============================================================================

export const coverTypeSchema = z.enum([
  'DIPLOMATIC', // Official diplomatic cover
  'NOC', // Non-Official Cover
  'COMMERCIAL', // Business cover
  'ACADEMIC', // Academic/research cover
  'JOURNALIST', // Media cover
  'NGO', // Non-governmental organization
  'CULTURAL', // Cultural exchange
  'TECHNICAL', // Technical expert
  'MILITARY', // Military attaché
  'UNDECLARED', // No official cover
]);

export type CoverType = z.infer<typeof coverTypeSchema>;

export const agentRoleSchema = z.enum([
  'CASE_OFFICER', // Handles agents
  'STATION_CHIEF', // Leads station
  'DEPUTY_CHIEF', // Deputy station chief
  'ANALYST', // Intelligence analyst
  'TECHNICAL_OFFICER', // Technical specialist
  'TARGETER', // Target identification
  'RECRUITER', // Recruitment specialist
  'HANDLER', // Agent handler
  'ASSET', // Foreign asset
  'SUPPORT', // Support personnel
  'UNKNOWN', // Role not identified
]);

export type AgentRole = z.infer<typeof agentRoleSchema>;

export const intelligenceOfficerSchema = z.object({
  id: z.string().uuid(),
  realName: z.string().optional(),
  aliases: z.array(z.string()).default([]),
  coverIdentities: z.array(z.object({
    name: z.string(),
    coverType: coverTypeSchema,
    organization: z.string(),
    position: z.string(),
    location: z.string(),
    validFrom: z.string().datetime(),
    validTo: z.string().datetime().optional(),
    compromised: z.boolean().default(false),
    compromisedDate: z.string().datetime().optional(),
  })).default([]),
  agency: z.string().uuid(),
  role: agentRoleSchema,
  rank: z.string().optional(),
  nationality: z.string(),
  dateOfBirth: z.string().datetime().optional(),
  placeOfBirth: z.string().optional(),
  languages: z.array(z.string()).default([]),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string(),
    fieldOfStudy: z.string(),
    graduationYear: z.number(),
  })).default([]),
  postings: z.array(z.object({
    location: z.string(),
    position: z.string(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    coverOrganization: z.string().optional(),
  })).default([]),
  knownAssociates: z.array(z.string().uuid()).default([]),
  handlers: z.array(z.string().uuid()).default([]),
  assets: z.array(z.string().uuid()).default([]),
  operationalStatus: z.enum(['ACTIVE', 'INACTIVE', 'COMPROMISED', 'DEFECTED', 'DECEASED', 'RETIRED']),
  specialties: z.array(z.string()).default([]),
  knownOperations: z.array(z.string().uuid()).default([]),
  travelHistory: z.array(z.object({
    destination: z.string(),
    arrivalDate: z.string().datetime(),
    departureDate: z.string().datetime().optional(),
    purpose: z.string().optional(),
    alias: z.string().optional(),
  })).default([]),
  communicationMethods: z.array(z.object({
    type: z.string(),
    identifier: z.string(),
    encrypted: z.boolean(),
    lastUsed: z.string().datetime().optional(),
  })).default([]),
  surveillanceHistory: z.array(z.object({
    date: z.string().datetime(),
    location: z.string(),
    activity: z.string(),
    confidence: z.number().min(0).max(1),
  })).default([]),
  classification: classificationLevelSchema,
  compartments: z.array(compartmentSchema).default([]),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type IntelligenceOfficer = z.infer<typeof intelligenceOfficerSchema>;

// ============================================================================
// ESPIONAGE OPERATIONS
// ============================================================================

export const operationTypeSchema = z.enum([
  'COLLECTION', // Intelligence collection
  'RECRUITMENT', // Agent recruitment
  'INFLUENCE', // Influence operation
  'COVERT_ACTION', // Covert action
  'TECHNICAL_COLLECTION', // Technical intelligence
  'CYBER_ESPIONAGE', // Cyber operations
  'COUNTERINTELLIGENCE', // CI operation
  'DECEPTION', // Deception operation
  'SABOTAGE', // Sabotage operation
  'EXFILTRATION', // Asset exfiltration
  'SURVEILLANCE', // Surveillance operation
  'RECONNAISSANCE', // Reconnaissance
]);

export type OperationType = z.infer<typeof operationTypeSchema>;

export const operationStatusSchema = z.enum([
  'PLANNING',
  'ACTIVE',
  'ONGOING',
  'PAUSED',
  'COMPLETED',
  'COMPROMISED',
  'CANCELLED',
  'SUSPENDED',
]);

export type OperationStatus = z.infer<typeof operationStatusSchema>;

export const espionageOperationSchema = z.object({
  id: z.string().uuid(),
  codename: z.string(),
  operationType: operationTypeSchema,
  status: operationStatusSchema,
  sponsoringAgency: z.string().uuid(),
  targetCountry: z.string(),
  targetOrganization: z.string().optional(),
  targetSector: z.string().optional(),
  objectives: z.array(z.string()).default([]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  operationalArea: z.string(),
  primaryOfficers: z.array(z.string().uuid()).default([]),
  supportingPersonnel: z.array(z.string().uuid()).default([]),
  assets: z.array(z.string().uuid()).default([]),
  targets: z.array(z.object({
    type: z.enum(['PERSON', 'ORGANIZATION', 'FACILITY', 'SYSTEM', 'NETWORK', 'TECHNOLOGY']),
    identifier: z.string(),
    priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    status: z.enum(['IDENTIFIED', 'UNDER_SURVEILLANCE', 'ENGAGED', 'RECRUITED', 'COMPROMISED', 'ABANDONED']),
  })).default([]),
  tradecraft: z.array(z.object({
    technique: z.string(),
    description: z.string(),
    frequency: z.string().optional(),
  })).default([]),
  infrastructure: z.array(z.object({
    type: z.enum(['SAFE_HOUSE', 'DEAD_DROP', 'COVER_BUSINESS', 'COMMUNICATION_NODE', 'TECHNICAL_FACILITY']),
    location: z.string(),
    purpose: z.string(),
    active: z.boolean(),
  })).default([]),
  collectionMethods: z.array(z.string()).default([]),
  successMetrics: z.array(z.object({
    metric: z.string(),
    target: z.string(),
    achieved: z.string().optional(),
  })).default([]),
  risks: z.array(z.object({
    risk: z.string(),
    severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    mitigation: z.string().optional(),
  })).default([]),
  incidents: z.array(z.object({
    date: z.string().datetime(),
    type: z.string(),
    description: z.string(),
    impact: z.string(),
    response: z.string().optional(),
  })).default([]),
  relatedOperations: z.array(z.string().uuid()).default([]),
  classification: classificationLevelSchema,
  compartments: z.array(compartmentSchema).default([]),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type EspionageOperation = z.infer<typeof espionageOperationSchema>;

// ============================================================================
// RECRUITMENT AND INFLUENCE
// ============================================================================

export const recruitmentMethodSchema = z.enum([
  'IDEOLOGICAL', // Based on ideology
  'FINANCIAL', // Money/financial incentives
  'COERCION', // Blackmail/threats
  'COMPROMISE', // Compromising material
  'EGO', // Appeal to ego/vanity
  'REVENGE', // Desire for revenge
  'EXCITEMENT', // Thrill-seeking
  'PATRIOTISM', // Patriotic appeal
  'FALSE_FLAG', // False flag recruitment
  'HONEY_TRAP', // Romantic/sexual approach
]);

export type RecruitmentMethod = z.infer<typeof recruitmentMethodSchema>;

export const recruitmentOperationSchema = z.object({
  id: z.string().uuid(),
  targetId: z.string().uuid(),
  targetName: z.string(),
  targetPosition: z.string().optional(),
  targetOrganization: z.string().optional(),
  targetValue: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  recruitmentMethod: recruitmentMethodSchema,
  recruitingOfficer: z.string().uuid(),
  supportTeam: z.array(z.string().uuid()).default([]),
  status: z.enum([
    'IDENTIFIED',
    'ASSESSING',
    'DEVELOPING',
    'APPROACHING',
    'CULTIVATING',
    'PITCHING',
    'RECRUITED',
    'REJECTED',
    'COMPROMISED',
    'TERMINATED',
  ]),
  vulnerabilities: z.array(z.object({
    type: z.string(),
    description: z.string(),
    exploitability: z.number().min(0).max(1),
  })).default([]),
  accessLevel: z.object({
    information: z.array(z.string()),
    facilities: z.array(z.string()),
    systems: z.array(z.string()),
    personnel: z.array(z.string()),
  }).optional(),
  timeline: z.array(z.object({
    date: z.string().datetime(),
    event: z.string(),
    outcome: z.string().optional(),
  })).default([]),
  meetings: z.array(z.object({
    date: z.string().datetime(),
    location: z.string(),
    participants: z.array(z.string().uuid()),
    purpose: z.string(),
    outcome: z.string(),
  })).default([]),
  financialInducements: z.array(z.object({
    date: z.string().datetime(),
    amount: z.number(),
    currency: z.string(),
    purpose: z.string(),
  })).default([]),
  classification: classificationLevelSchema,
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type RecruitmentOperation = z.infer<typeof recruitmentOperationSchema>;

// ============================================================================
// TECHNICAL INTELLIGENCE
// ============================================================================

export const technicalCollectionTypeSchema = z.enum([
  'SIGINT', // Signals Intelligence
  'COMINT', // Communications Intelligence
  'ELINT', // Electronic Intelligence
  'IMINT', // Imagery Intelligence
  'MASINT', // Measurement and Signature Intelligence
  'TECHINT', // Technical Intelligence
  'CYBER', // Cyber Intelligence
  'ACOUSTIC', // Acoustic Intelligence
  'RADIATION', // Radiation Intelligence
  'GEOINT', // Geospatial Intelligence
]);

export type TechnicalCollectionType = z.infer<typeof technicalCollectionTypeSchema>;

export const technicalOperationSchema = z.object({
  id: z.string().uuid(),
  operationName: z.string(),
  collectionType: technicalCollectionTypeSchema,
  targetSystems: z.array(z.string()).default([]),
  targetFrequencies: z.array(z.object({
    frequency: z.string(),
    band: z.string(),
    purpose: z.string(),
  })).default([]),
  collectionPlatforms: z.array(z.object({
    platform: z.string(),
    location: z.string(),
    capabilities: z.array(z.string()),
  })).default([]),
  status: operationStatusSchema,
  sponsoringAgency: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  collectedData: z.array(z.object({
    timestamp: z.string().datetime(),
    dataType: z.string(),
    volume: z.string(),
    quality: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']),
    classification: classificationLevelSchema,
  })).default([]),
  technicalCapabilities: z.array(z.object({
    capability: z.string(),
    description: z.string(),
    effectiveness: z.number().min(0).max(1),
  })).default([]),
  counterMeasures: z.array(z.object({
    measure: z.string(),
    effectiveness: z.string(),
    implementedBy: z.string(),
  })).default([]),
  classification: classificationLevelSchema,
  compartments: z.array(compartmentSchema).default([]),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type TechnicalOperation = z.infer<typeof technicalOperationSchema>;

// ============================================================================
// COUNTERINTELLIGENCE
// ============================================================================

export const counterIntelOperationTypeSchema = z.enum([
  'PENETRATION_DETECTION', // Detecting penetrations
  'DOUBLE_AGENT', // Running double agents
  'DECEPTION', // Deception operations
  'MOLE_HUNT', // Finding insider threats
  'DEFECTOR_VETTING', // Vetting defectors
  'TECHNICAL_PENETRATION', // Technical CI
  'INFORMATION_OPS', // Information operations
  'PROVOCATION', // Provocation operations
  'CONTROLLED_DISCLOSURE', // Controlled leaks
  'SURVEILLANCE_DETECTION', // Detecting surveillance
]);

export type CounterIntelOperationType = z.infer<typeof counterIntelOperationTypeSchema>;

export const counterIntelOperationSchema = z.object({
  id: z.string().uuid(),
  operationName: z.string(),
  operationType: counterIntelOperationTypeSchema,
  status: operationStatusSchema,
  targetAgency: z.string().uuid().optional(),
  targetOperation: z.string().uuid().optional(),
  suspectedPenetrations: z.array(z.object({
    targetId: z.string().uuid(),
    suspicionLevel: z.enum(['CONFIRMED', 'HIGH', 'MEDIUM', 'LOW', 'DISMISSED']),
    evidence: z.array(z.string()),
    investigationStatus: z.string(),
  })).default([]),
  doubleAgents: z.array(z.object({
    agentId: z.string().uuid(),
    handler: z.string().uuid(),
    targetAgency: z.string().uuid(),
    controlLevel: z.enum(['FULL', 'PARTIAL', 'MINIMAL', 'UNCERTAIN']),
    productionValue: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  })).default([]),
  deceptionPlan: z.object({
    objective: z.string(),
    targetBelief: z.string(),
    channels: z.array(z.string()),
    indicators: z.array(z.string()),
    measureOfEffectiveness: z.array(z.string()),
  }).optional(),
  investigativeFindings: z.array(z.object({
    date: z.string().datetime(),
    finding: z.string(),
    significance: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    actionRequired: z.string().optional(),
  })).default([]),
  riskAssessment: z.object({
    currentThreatLevel: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL']),
    vulnerabilities: z.array(z.string()),
    recommendations: z.array(z.string()),
  }).optional(),
  classification: classificationLevelSchema,
  compartments: z.array(compartmentSchema).default([]),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type CounterIntelOperation = z.infer<typeof counterIntelOperationSchema>;

// ============================================================================
// ANALYTICAL PRODUCTS
// ============================================================================

export const analyticalProductTypeSchema = z.enum([
  'THREAT_ASSESSMENT',
  'CAPABILITY_EVALUATION',
  'OPERATIONAL_ANALYSIS',
  'PATTERN_ANALYSIS',
  'PREDICTIVE_INTELLIGENCE',
  'WARNING_INTELLIGENCE',
  'STRATEGIC_ASSESSMENT',
  'TACTICAL_INTELLIGENCE',
  'TARGET_PACKAGE',
  'COLLECTION_REQUIREMENTS',
]);

export type AnalyticalProductType = z.infer<typeof analyticalProductTypeSchema>;

export const analyticalProductSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  productType: analyticalProductTypeSchema,
  summary: z.string(),
  keyFindings: z.array(z.string()).default([]),
  analysis: z.string(),
  conclusions: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  sources: z.array(z.object({
    sourceId: z.string(),
    sourceType: z.string(),
    reliability: z.enum(['A', 'B', 'C', 'D', 'E', 'F']),
    credibility: z.enum(['1', '2', '3', '4', '5', '6']),
  })).default([]),
  relatedOperations: z.array(z.string().uuid()).default([]),
  relatedAgencies: z.array(z.string().uuid()).default([]),
  relatedOfficers: z.array(z.string().uuid()).default([]),
  dissemination: z.array(z.object({
    recipient: z.string(),
    date: z.string().datetime(),
    method: z.string(),
  })).default([]),
  validityPeriod: z.object({
    from: z.string().datetime(),
    to: z.string().datetime().optional(),
  }).optional(),
  classification: classificationLevelSchema,
  compartments: z.array(compartmentSchema).default([]),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string().uuid(),
  tenantId: z.string(),
});

export type AnalyticalProduct = z.infer<typeof analyticalProductSchema>;

// ============================================================================
// SUPPORT INFRASTRUCTURE
// ============================================================================

export const infrastructureTypeSchema = z.enum([
  'SAFE_HOUSE',
  'DEAD_DROP',
  'MEETING_LOCATION',
  'COMMUNICATION_NODE',
  'COVER_BUSINESS',
  'TECHNICAL_FACILITY',
  'TRAINING_FACILITY',
  'DOCUMENT_FACILITY',
  'FINANCIAL_NODE',
  'EXFILTRATION_ROUTE',
]);

export type InfrastructureType = z.infer<typeof infrastructureTypeSchema>;

export const supportInfrastructureSchema = z.object({
  id: z.string().uuid(),
  infrastructureType: infrastructureTypeSchema,
  location: z.string(),
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional(),
  address: z.string().optional(),
  coverName: z.string().optional(),
  operatingAgency: z.string().uuid(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'COMPROMISED', 'ABANDONED', 'PLANNED']),
  capabilities: z.array(z.string()).default([]),
  capacity: z.string().optional(),
  activeOperations: z.array(z.string().uuid()).default([]),
  authorizedPersonnel: z.array(z.string().uuid()).default([]),
  securityMeasures: z.array(z.object({
    measure: z.string(),
    description: z.string(),
    effectiveness: z.enum(['EXCELLENT', 'GOOD', 'ADEQUATE', 'POOR']),
  })).default([]),
  accessProtocols: z.array(z.string()).default([]),
  usageHistory: z.array(z.object({
    date: z.string().datetime(),
    purpose: z.string(),
    personnel: z.array(z.string().uuid()),
    outcome: z.string().optional(),
  })).default([]),
  compromiseRisk: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'MINIMAL']),
  lastInspection: z.string().datetime().optional(),
  classification: classificationLevelSchema,
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type SupportInfrastructure = z.infer<typeof supportInfrastructureSchema>;

// ============================================================================
// INDICATORS AND WARNINGS
// ============================================================================

export const indicatorTypeSchema = z.enum([
  'COLLECTION_ACTIVITY',
  'SURVEILLANCE',
  'RECRUITMENT_APPROACH',
  'TECHNICAL_PENETRATION',
  'CYBER_INTRUSION',
  'UNUSUAL_CONTACT',
  'TRAVEL_PATTERN',
  'FINANCIAL_ANOMALY',
  'COMMUNICATION_ANOMALY',
  'BEHAVIORAL_CHANGE',
]);

export type IndicatorType = z.infer<typeof indicatorTypeSchema>;

export const indicatorSchema = z.object({
  id: z.string().uuid(),
  indicatorType: indicatorTypeSchema,
  description: z.string(),
  observedAt: z.string().datetime(),
  location: z.string().optional(),
  associatedAgency: z.string().uuid().optional(),
  associatedOfficers: z.array(z.string().uuid()).default([]),
  associatedOperation: z.string().uuid().optional(),
  confidence: z.number().min(0).max(1),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']),
  status: z.enum(['NEW', 'INVESTIGATING', 'CONFIRMED', 'FALSE_POSITIVE', 'RESOLVED']),
  evidence: z.array(z.object({
    type: z.string(),
    description: z.string(),
    source: z.string(),
    timestamp: z.string().datetime(),
  })).default([]),
  relatedIndicators: z.array(z.string().uuid()).default([]),
  responseActions: z.array(z.object({
    action: z.string(),
    responsibleParty: z.string(),
    status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    completedAt: z.string().datetime().optional(),
  })).default([]),
  classification: classificationLevelSchema,
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tenantId: z.string(),
});

export type Indicator = z.infer<typeof indicatorSchema>;
