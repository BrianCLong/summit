import { z } from 'zod';

/**
 * Export Controls and Sanctions
 */
export const ExportControlClassificationSchema = z.object({
  id: z.string(),
  componentId: z.string().optional(),
  productId: z.string().optional(),
  tenantId: z.string(),

  // Classification
  eccn: z.string().optional(), // Export Control Classification Number
  usmlCategory: z.string().optional(), // US Munitions List
  scheduleBNumber: z.string().optional(), // Commerce Control List

  // Jurisdiction
  jurisdiction: z.array(z.enum(['EAR', 'ITAR', 'OFAC', 'EU', 'Other'])),

  // License requirements
  licenseRequired: z.boolean(),
  licenseExceptions: z.array(z.string()).optional(),
  authorizedCountries: z.array(z.string()).optional(),
  prohibitedCountries: z.array(z.string()).optional(),

  // Classification details
  classificationRationale: z.string(),
  classifiedBy: z.string(),
  classificationDate: z.string().datetime(),
  reviewDate: z.string().datetime().optional(),

  status: z.enum(['active', 'under_review', 'expired']),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const SanctionsScreeningSchema = z.object({
  id: z.string(),
  entityId: z.string(), // Company, person, or organization ID
  tenantId: z.string(),

  // Entity details
  entityName: z.string(),
  entityType: z.enum(['company', 'individual', 'organization', 'vessel']),
  country: z.string().optional(),

  // Screening results
  screeningDate: z.string().datetime(),
  listsScreened: z.array(z.string()), // e.g., "OFAC SDN", "EU Sanctions", "UN Sanctions"

  matches: z.array(z.object({
    listName: z.string(),
    matchType: z.enum(['exact', 'fuzzy', 'alias']),
    matchScore: z.number().min(0).max(100),
    sanctionedEntity: z.object({
      name: z.string(),
      aliases: z.array(z.string()).optional(),
      sanctionType: z.string(),
      sanctioningAuthority: z.string(),
      effectiveDate: z.string().datetime().optional(),
      programs: z.array(z.string()).optional(),
    }),
    falsePositive: z.boolean().optional(),
  })),

  // Overall result
  overallResult: z.enum(['clear', 'potential_match', 'confirmed_match']),
  riskLevel: z.enum(['none', 'low', 'medium', 'high', 'prohibited']),

  // Review
  reviewedBy: z.string().optional(),
  reviewDate: z.string().datetime().optional(),
  reviewNotes: z.string().optional(),

  // Next screening
  nextScreeningDate: z.string().datetime(),

  createdAt: z.string().datetime(),
});

export const ExportLicenseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),

  licenseNumber: z.string(),
  licenseType: z.string(), // e.g., "DSP-5", "DSP-73", "BIS License"
  issuingAuthority: z.string(),

  // Scope
  authorizedProducts: z.array(z.string()),
  authorizedCountries: z.array(z.string()),
  authorizedEndUsers: z.array(z.string()),

  // Validity
  issueDate: z.string().datetime(),
  expirationDate: z.string().datetime(),
  status: z.enum(['active', 'expired', 'suspended', 'revoked']),

  // Usage
  valueLimit: z.number().optional(),
  valueUsed: z.number().optional(),
  quantityLimit: z.number().optional(),
  quantityUsed: z.number().optional(),

  // Conditions
  conditions: z.array(z.string()).optional(),
  restrictions: z.array(z.string()).optional(),

  // Monitoring
  lastUsedDate: z.string().datetime().optional(),
  renewalRequired: z.boolean(),
  renewalDueDate: z.string().datetime().optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ExportControlClassification = z.infer<typeof ExportControlClassificationSchema>;
export type SanctionsScreening = z.infer<typeof SanctionsScreeningSchema>;
export type ExportLicense = z.infer<typeof ExportLicenseSchema>;

/**
 * Conflict Minerals and Responsible Sourcing
 */
export const ConflictMineralSchema = z.enum(['tin', 'tantalum', 'tungsten', 'gold']);

export const ConflictMineralsDeclarationSchema = z.object({
  id: z.string(),
  supplierId: z.string(),
  componentId: z.string().optional(),
  tenantId: z.string(),

  // Declaration period
  reportingYear: z.number(),
  declarationDate: z.string().datetime(),

  // Minerals present
  minerals: z.array(ConflictMineralSchema),

  // Sourcing
  conflictFree: z.boolean(),
  drcConflictFree: z.boolean(), // Democratic Republic of Congo

  // Smelters and refiners
  smelters: z.array(z.object({
    name: z.string(),
    country: z.string(),
    mineral: ConflictMineralSchema,
    conformant: z.boolean(), // RMI conformant
    rmiId: z.string().optional(),
  })),

  // Due diligence
  dueDiligencePerformed: z.boolean(),
  dueDiligenceFramework: z.string().optional(), // e.g., "OECD", "RMI"
  thirdPartyAudit: z.boolean(),
  auditReport: z.string().optional(),

  // Risk assessment
  riskLevel: z.enum(['low', 'medium', 'high', 'undeterminable']),
  riskFactors: z.array(z.string()).optional(),

  // Compliance
  sectionCompliant: z.enum(['1502', '1504', 'EU_Regulation']).optional(),
  filingRequired: z.boolean(),
  filingComplete: z.boolean(),

  // Supporting documents
  cmrt: z.string().optional(), // Conflict Minerals Reporting Template
  supportingDocuments: z.array(z.string()).optional(),

  status: z.enum(['draft', 'submitted', 'verified', 'accepted', 'rejected']),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ResponsibleSourcingSchema = z.object({
  id: z.string(),
  supplierId: z.string(),
  tenantId: z.string(),

  // Labor practices
  laborPractices: z.object({
    noForcedLabor: z.boolean(),
    noChildLabor: z.boolean(),
    fairWages: z.boolean(),
    safeWorkingConditions: z.boolean(),
    freedomOfAssociation: z.boolean(),
    certifications: z.array(z.string()).optional(), // e.g., "SA8000", "Fair Trade"
  }),

  // Environmental
  environmental: z.object({
    sustainableSourcing: z.boolean(),
    wasteManagement: z.boolean(),
    waterConservation: z.boolean(),
    energyEfficiency: z.boolean(),
    certifications: z.array(z.string()).optional(), // e.g., "FSC", "Rainforest Alliance"
  }),

  // Human rights
  humanRights: z.object({
    respectsHumanRights: z.boolean(),
    noDiscrimination: z.boolean(),
    communityEngagement: z.boolean(),
    grievanceMechanism: z.boolean(),
    violations: z.array(z.object({
      description: z.string(),
      severity: z.enum(['critical', 'high', 'medium', 'low']),
      remediationStatus: z.enum(['pending', 'in_progress', 'resolved']),
    })).optional(),
  }),

  // Overall assessment
  overallScore: z.number().min(0).max(100),
  complianceLevel: z.enum(['excellent', 'good', 'acceptable', 'poor', 'non_compliant']),

  // Audit
  lastAuditDate: z.string().datetime().optional(),
  nextAuditDate: z.string().datetime().optional(),
  auditFindings: z.array(z.string()).optional(),

  updatedAt: z.string().datetime(),
});

export type ConflictMineral = z.infer<typeof ConflictMineralSchema>;
export type ConflictMineralsDeclaration = z.infer<typeof ConflictMineralsDeclarationSchema>;
export type ResponsibleSourcing = z.infer<typeof ResponsibleSourcingSchema>;

/**
 * Product Safety and Recalls
 */
export const ProductSafetyStandardSchema = z.object({
  standard: z.string(), // e.g., "CPSC", "FDA", "CE", "UL"
  jurisdiction: z.string(),
  applicable: z.boolean(),
  compliant: z.boolean(),
  certificationNumber: z.string().optional(),
  certificationDate: z.string().datetime().optional(),
  expirationDate: z.string().datetime().optional(),
  testReports: z.array(z.string()).optional(),
});

export const ProductSafetyAssessmentSchema = z.object({
  id: z.string(),
  productId: z.string(),
  tenantId: z.string(),

  // Standards compliance
  standards: z.array(ProductSafetyStandardSchema),

  // Safety testing
  safetyTests: z.array(z.object({
    testType: z.string(),
    testDate: z.string().datetime(),
    laboratory: z.string(),
    result: z.enum(['pass', 'fail', 'conditional']),
    reportId: z.string().optional(),
    findings: z.string().optional(),
  })),

  // Hazard analysis
  hazards: z.array(z.object({
    hazardType: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    likelihood: z.enum(['very_high', 'high', 'medium', 'low', 'very_low']),
    mitigation: z.string(),
    mitigationStatus: z.enum(['implemented', 'in_progress', 'planned']),
  })).optional(),

  // Overall assessment
  safetyRating: z.enum(['safe', 'safe_with_warnings', 'unsafe', 'unknown']),
  approvalStatus: z.enum(['approved', 'conditional', 'rejected', 'under_review']),

  // Market authorization
  marketAuthorizations: z.array(z.object({
    jurisdiction: z.string(),
    authorized: z.boolean(),
    authorizationNumber: z.string().optional(),
    authorizationDate: z.string().datetime().optional(),
  })).optional(),

  assessmentDate: z.string().datetime(),
  nextReviewDate: z.string().datetime().optional(),
});

export const ProductRecallSchema = z.object({
  id: z.string(),
  productId: z.string(),
  tenantId: z.string(),

  // Recall details
  recallNumber: z.string(),
  recallType: z.enum(['voluntary', 'mandatory', 'market_withdrawal']),
  recallClass: z.enum(['class_i', 'class_ii', 'class_iii']), // FDA classification

  // Issue
  issueDescription: z.string(),
  hazard: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),

  // Scope
  affectedProducts: z.array(z.object({
    productId: z.string(),
    lotNumbers: z.array(z.string()),
    serialNumbers: z.array(z.string()).optional(),
    manufactureDates: z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
    }).optional(),
    quantityAffected: z.number(),
  })),

  affectedMarkets: z.array(z.string()), // Countries
  unitsAffected: z.number(),

  // Timeline
  issueIdentifiedDate: z.string().datetime(),
  recallInitiatedDate: z.string().datetime(),
  publicAnnouncementDate: z.string().datetime().optional(),
  expectedCompletionDate: z.string().datetime().optional(),

  // Actions
  correctiveActions: z.array(z.object({
    action: z.string(),
    status: z.enum(['planned', 'in_progress', 'completed']),
    completionDate: z.string().datetime().optional(),
  })),

  // Customer notification
  customersNotified: z.number().optional(),
  notificationMethod: z.array(z.enum(['email', 'mail', 'press_release', 'website', 'phone'])),

  // Returns and remediation
  unitsReturned: z.number().optional(),
  remediationType: z.enum(['repair', 'replace', 'refund', 'destroy']),

  // Financial impact
  estimatedCost: z.number().optional(),
  insuranceClaim: z.boolean(),

  // Regulatory
  regulatoryAgency: z.string().optional(),
  regulatoryAction: z.string().optional(),

  status: z.enum(['initiated', 'ongoing', 'completed', 'terminated']),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ProductSafetyStandard = z.infer<typeof ProductSafetyStandardSchema>;
export type ProductSafetyAssessment = z.infer<typeof ProductSafetyAssessmentSchema>;
export type ProductRecall = z.infer<typeof ProductRecallSchema>;

/**
 * Environmental Regulations
 */
export const EnvironmentalComplianceSchema = z.object({
  id: z.string(),
  productId: z.string().optional(),
  componentId: z.string().optional(),
  facilityId: z.string().optional(),
  tenantId: z.string(),

  // Regulations
  regulations: z.array(z.object({
    regulation: z.string(), // e.g., "RoHS", "REACH", "WEEE", "Prop 65"
    jurisdiction: z.string(),
    applicability: z.enum(['applicable', 'not_applicable', 'pending_review']),
    complianceStatus: z.enum(['compliant', 'non_compliant', 'pending', 'exemption']),
    complianceDate: z.string().datetime().optional(),
    exemptionReason: z.string().optional(),
  })),

  // Restricted substances
  restrictedSubstances: z.array(z.object({
    substance: z.string(),
    casNumber: z.string().optional(),
    concentration: z.number().optional(),
    threshold: z.number(),
    unit: z.string(),
    compliant: z.boolean(),
    testMethod: z.string().optional(),
    testDate: z.string().datetime().optional(),
  })).optional(),

  // Declarations
  declarations: z.array(z.object({
    declarationType: z.string(), // e.g., "REACH SVHC", "California Prop 65"
    declarationDate: z.string().datetime(),
    documentId: z.string().optional(),
  })).optional(),

  // Reporting
  reportingRequired: z.boolean(),
  lastReportDate: z.string().datetime().optional(),
  nextReportDue: z.string().datetime().optional(),

  // Overall status
  overallCompliance: z.enum(['compliant', 'non_compliant', 'partial']),

  updatedAt: z.string().datetime(),
});

export type EnvironmentalCompliance = z.infer<typeof EnvironmentalComplianceSchema>;

/**
 * Trade Agreements and Tariffs
 */
export const TradeAgreementSchema = z.object({
  id: z.string(),
  agreementName: z.string(), // e.g., "USMCA", "CPTPP", "EU-Japan EPA"
  memberCountries: z.array(z.string()),

  effectiveDate: z.string().datetime(),
  expirationDate: z.string().datetime().optional(),

  // Benefits
  tariffReductions: z.boolean(),
  originRequirements: z.string().optional(),
  documentationRequirements: z.array(z.string()).optional(),

  status: z.enum(['active', 'pending', 'expired', 'suspended']),
});

export const TariffClassificationSchema = z.object({
  id: z.string(),
  productId: z.string(),
  tenantId: z.string(),

  // Classification
  hsCode: z.string(), // Harmonized System Code
  htsCode: z.string().optional(), // Harmonized Tariff Schedule (US-specific)
  description: z.string(),

  // Tariff rates by country
  tariffRates: z.array(z.object({
    country: z.string(),
    tariffRate: z.number(), // percentage
    tradeAgreement: z.string().optional(),
    preferentialRate: z.number().optional(),
    requiresCertificateOfOrigin: z.boolean(),
  })),

  // Origin
  countryOfOrigin: z.string(),
  regionalValueContent: z.number().optional(), // percentage

  // Classification details
  classifiedBy: z.string(),
  classificationDate: z.string().datetime(),
  rulingNumber: z.string().optional(),

  updatedAt: z.string().datetime(),
});

export const TariffChangeAlertSchema = z.object({
  id: z.string(),
  tenantId: z.string(),

  // Change details
  affectedHSCodes: z.array(z.string()),
  affectedCountries: z.array(z.string()),

  changeType: z.enum([
    'rate_increase',
    'rate_decrease',
    'new_tariff',
    'suspension',
    'trade_agreement_change',
    'quota_imposed',
  ]),

  // Old vs new
  previousRate: z.number().optional(),
  newRate: z.number().optional(),

  description: z.string(),

  // Timeline
  announcementDate: z.string().datetime(),
  effectiveDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),

  // Impact
  estimatedImpact: z.object({
    affectedProducts: z.array(z.string()),
    estimatedCostImpact: z.number().optional(),
    affectedShipments: z.number().optional(),
  }).optional(),

  // Actions
  recommendedActions: z.array(z.string()),

  source: z.string(), // e.g., "Federal Register", "WTO", "EU Official Journal"

  createdAt: z.string().datetime(),
});

export type TradeAgreement = z.infer<typeof TradeAgreementSchema>;
export type TariffClassification = z.infer<typeof TariffClassificationSchema>;
export type TariffChangeAlert = z.infer<typeof TariffChangeAlertSchema>;

/**
 * Audit and Certification Management
 */
export const AuditSchema = z.object({
  id: z.string(),
  tenantId: z.string(),

  auditType: z.enum([
    'compliance',
    'quality',
    'environmental',
    'safety',
    'security',
    'financial',
    'supplier',
  ]),

  scope: z.string(),
  standard: z.string().optional(), // e.g., "ISO 9001", "ISO 14001"

  // Subject
  auditeeType: z.enum(['internal', 'supplier', 'facility', 'process']),
  auditeeId: z.string(),
  auditeeName: z.string(),

  // Schedule
  plannedDate: z.string().datetime(),
  actualDate: z.string().datetime().optional(),
  duration: z.number().optional(), // days

  // Team
  leadAuditor: z.string(),
  auditTeam: z.array(z.string()).optional(),

  // Results
  findings: z.array(z.object({
    findingType: z.enum(['major_nc', 'minor_nc', 'observation', 'ofi']), // NC = Non-Conformance, OFI = Opportunity for Improvement
    category: z.string(),
    description: z.string(),
    evidence: z.string(),
    requirement: z.string(), // Standard clause or requirement
    correctiveActionRequired: z.boolean(),
    targetCloseDate: z.string().datetime().optional(),
    status: z.enum(['open', 'in_progress', 'closed', 'verified']),
  })).optional(),

  // Summary
  overallResult: z.enum(['conformant', 'non_conformant', 'conditional']),
  score: z.number().min(0).max(100).optional(),

  // Report
  reportId: z.string().optional(),
  reportDate: z.string().datetime().optional(),

  // Follow-up
  followUpRequired: z.boolean(),
  followUpDate: z.string().datetime().optional(),
  nextAuditDate: z.string().datetime().optional(),

  status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CertificationSchema = z.object({
  id: z.string(),
  tenantId: z.string(),

  certificationType: z.string(),
  certificationBody: z.string(),
  certificateNumber: z.string(),

  // Scope
  scope: z.string(),
  standard: z.string(), // e.g., "ISO 9001:2015"
  facilities: z.array(z.string()).optional(),

  // Validity
  issueDate: z.string().datetime(),
  expirationDate: z.string().datetime(),
  status: z.enum(['valid', 'expired', 'suspended', 'withdrawn', 'pending_renewal']),

  // Surveillance
  surveillanceSchedule: z.array(z.object({
    dueDate: z.string().datetime(),
    completed: z.boolean(),
    completionDate: z.string().datetime().optional(),
  })).optional(),

  // Renewal
  renewalDueDate: z.string().datetime().optional(),
  renewalInProgress: z.boolean(),

  // Documents
  certificateDocument: z.string().optional(),
  scopeDocument: z.string().optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Audit = z.infer<typeof AuditSchema>;
export type Certification = z.infer<typeof CertificationSchema>;

/**
 * Regulatory Change Monitoring
 */
export const RegulatoryChangeSchema = z.object({
  id: z.string(),
  tenantId: z.string(),

  // Change details
  regulation: z.string(),
  jurisdiction: z.string(),
  changeType: z.enum([
    'new_regulation',
    'amendment',
    'repeal',
    'interpretation',
    'enforcement_action',
  ]),

  title: z.string(),
  description: z.string(),

  // Timeline
  publishedDate: z.string().datetime(),
  effectiveDate: z.string().datetime(),
  commentDeadline: z.string().datetime().optional(),

  // Impact
  impactLevel: z.enum(['critical', 'high', 'medium', 'low']),
  affectedAreas: z.array(z.string()), // e.g., "Export Control", "Product Safety"
  affectedProducts: z.array(z.string()).optional(),
  affectedSuppliers: z.array(z.string()).optional(),

  // Response
  actionRequired: z.boolean(),
  actionItems: z.array(z.object({
    action: z.string(),
    owner: z.string().optional(),
    dueDate: z.string().datetime(),
    status: z.enum(['not_started', 'in_progress', 'completed']),
  })).optional(),

  // Tracking
  source: z.string(),
  sourceUrl: z.string().url().optional(),
  documentId: z.string().optional(),

  reviewedBy: z.string().optional(),
  reviewDate: z.string().datetime().optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type RegulatoryChange = z.infer<typeof RegulatoryChangeSchema>;
