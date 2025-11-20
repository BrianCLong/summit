import { z } from 'zod';

/**
 * Vendor Lifecycle Management
 */
export const VendorStatusSchema = z.enum([
  'prospective',     // Under evaluation
  'onboarding',      // In onboarding process
  'active',          // Currently providing services
  'at_risk',         // Risk threshold exceeded
  'suspended',       // Temporarily suspended
  'offboarding',     // In process of termination
  'terminated',      // No longer active
]);

export const VendorTierSchema = z.enum([
  'critical',   // Mission-critical vendors
  'high',       // High-impact vendors
  'medium',     // Medium-impact vendors
  'low',        // Low-impact vendors
]);

export const VendorSchema = z.object({
  id: z.string(),
  name: z.string(),
  tenantId: z.string(),
  status: VendorStatusSchema,
  tier: VendorTierSchema,

  // Basic information
  legalName: z.string(),
  duns: z.string().optional(), // D-U-N-S Number
  taxId: z.string().optional(),
  website: z.string().url().optional(),

  // Contact information
  primaryContact: z.object({
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    role: z.string(),
  }),

  // Business details
  industry: z.string(),
  companySize: z.enum(['small', 'medium', 'large', 'enterprise']),
  headquarters: z.object({
    country: z.string(),
    city: z.string(),
    address: z.string().optional(),
  }),

  // Services provided
  servicesProvided: z.array(z.string()),
  dataAccess: z.enum(['none', 'limited', 'moderate', 'extensive']),

  // Relationships
  parentCompany: z.string().optional(),
  subsidiaries: z.array(z.string()).optional(),

  // Dates
  relationshipStartDate: z.string().datetime(),
  lastReviewDate: z.string().datetime().optional(),
  nextReviewDate: z.string().datetime().optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Vendor = z.infer<typeof VendorSchema>;
export type VendorStatus = z.infer<typeof VendorStatusSchema>;
export type VendorTier = z.infer<typeof VendorTierSchema>;

/**
 * Due Diligence Assessment
 */
export const DueDiligenceCheckSchema = z.object({
  checkType: z.enum([
    'background_check',
    'financial_review',
    'legal_review',
    'security_assessment',
    'reference_check',
    'site_visit',
    'insurance_verification',
    'sanctions_screening',
    'adverse_media_screening',
  ]),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'waived']),
  result: z.enum(['pass', 'fail', 'conditional', 'not_applicable']).optional(),
  findings: z.array(z.string()).optional(),
  completedBy: z.string().optional(),
  completedDate: z.string().datetime().optional(),
  expirationDate: z.string().datetime().optional(),
  documents: z.array(z.string()).optional(), // Document IDs
});

export const DueDiligenceAssessmentSchema = z.object({
  id: z.string(),
  vendorId: z.string(),
  tenantId: z.string(),
  timestamp: z.string().datetime(),

  // Checks performed
  checks: z.array(DueDiligenceCheckSchema),

  // Overall assessment
  overallResult: z.enum(['approved', 'approved_with_conditions', 'rejected', 'under_review']),
  riskRating: z.enum(['low', 'medium', 'high', 'critical']),

  // Conditions and exceptions
  conditions: z.array(z.object({
    condition: z.string(),
    dueDate: z.string().datetime().optional(),
    status: z.enum(['open', 'in_progress', 'met', 'waived']),
  })).optional(),

  // Approval workflow
  requestedBy: z.string(),
  reviewedBy: z.string().optional(),
  approvedBy: z.string().optional(),
  approvalDate: z.string().datetime().optional(),

  // Next steps
  nextSteps: z.array(z.string()).optional(),
  expirationDate: z.string().datetime().optional(),
});

export type DueDiligenceCheck = z.infer<typeof DueDiligenceCheckSchema>;
export type DueDiligenceAssessment = z.infer<typeof DueDiligenceAssessmentSchema>;

/**
 * Contract and SLA Management
 */
export const ContractSchema = z.object({
  id: z.string(),
  vendorId: z.string(),
  tenantId: z.string(),

  contractNumber: z.string(),
  contractType: z.enum([
    'master_service_agreement',
    'statement_of_work',
    'purchase_order',
    'nda',
    'data_processing_agreement',
    'other',
  ]),

  effectiveDate: z.string().datetime(),
  expirationDate: z.string().datetime(),
  autoRenewal: z.boolean(),
  renewalNoticeDays: z.number().optional(),

  // Financial terms
  contractValue: z.object({
    currency: z.string(),
    amount: z.number(),
    billingCycle: z.enum(['monthly', 'quarterly', 'annual', 'one_time']),
  }).optional(),

  // Terms and conditions
  terminationClause: z.object({
    noticePeriodDays: z.number(),
    earlyTerminationAllowed: z.boolean(),
    penalties: z.string().optional(),
  }).optional(),

  liabilityLimits: z.object({
    limitAmount: z.number().optional(),
    insuranceRequired: z.boolean(),
    insuranceCoverage: z.number().optional(),
  }).optional(),

  // Documents
  documentId: z.string().optional(),
  amendments: z.array(z.string()).optional(),

  status: z.enum(['draft', 'pending_approval', 'active', 'expired', 'terminated']),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const SLASchema = z.object({
  id: z.string(),
  contractId: z.string(),
  vendorId: z.string(),
  tenantId: z.string(),

  slaType: z.string(), // e.g., "Uptime", "Response Time", "Resolution Time"

  // Performance targets
  target: z.object({
    metric: z.string(),
    threshold: z.number(),
    unit: z.string(),
    measurementPeriod: z.enum(['hourly', 'daily', 'weekly', 'monthly', 'quarterly']),
  }),

  // Performance tracking
  currentPerformance: z.number().optional(),
  complianceRate: z.number().min(0).max(100).optional(),

  // Penalties and remedies
  penalties: z.array(z.object({
    breachLevel: z.string(),
    penalty: z.string(),
  })).optional(),

  status: z.enum(['active', 'breached', 'at_risk', 'met']),
  lastMeasured: z.string().datetime().optional(),
});

export type Contract = z.infer<typeof ContractSchema>;
export type SLA = z.infer<typeof SLASchema>;

/**
 * Continuous Vendor Monitoring
 */
export const MonitoringRuleSchema = z.object({
  id: z.string(),
  vendorId: z.string(),
  tenantId: z.string(),

  ruleType: z.enum([
    'financial_health',
    'security_incident',
    'compliance_violation',
    'performance_degradation',
    'news_sentiment',
    'sanctions_list',
    'certificate_expiration',
  ]),

  condition: z.string(), // e.g., "credit_rating < BBB"
  threshold: z.any(),
  frequency: z.enum(['real_time', 'hourly', 'daily', 'weekly', 'monthly']),

  // Alert configuration
  alertSeverity: z.enum(['critical', 'high', 'medium', 'low']),
  notifyTeam: z.array(z.string()),

  enabled: z.boolean(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const VendorAlertSchema = z.object({
  id: z.string(),
  vendorId: z.string(),
  tenantId: z.string(),
  ruleId: z.string().optional(),

  alertType: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),

  title: z.string(),
  description: z.string(),

  // Alert details
  detectedAt: z.string().datetime(),
  source: z.string(),
  evidence: z.array(z.any()).optional(),

  // Response
  status: z.enum(['new', 'acknowledged', 'investigating', 'resolved', 'false_positive']),
  assignedTo: z.string().optional(),
  resolvedAt: z.string().datetime().optional(),
  resolution: z.string().optional(),

  // Impact
  impactAssessment: z.object({
    businessImpact: z.enum(['critical', 'high', 'medium', 'low']),
    affectedServices: z.array(z.string()),
    estimatedImpact: z.string().optional(),
  }).optional(),
});

export type MonitoringRule = z.infer<typeof MonitoringRuleSchema>;
export type VendorAlert = z.infer<typeof VendorAlertSchema>;

/**
 * Fourth-Party (Sub-supplier) Risk
 */
export const FourthPartySchema = z.object({
  id: z.string(),
  name: z.string(),
  parentVendorId: z.string(), // The third-party vendor using this fourth-party
  tenantId: z.string(),

  // Relationship
  serviceProvided: z.string(),
  dataAccess: z.enum(['none', 'limited', 'moderate', 'extensive']),
  criticalityLevel: z.enum(['critical', 'high', 'medium', 'low']),

  // Risk assessment
  riskScore: z.number().min(0).max(100).optional(),
  lastAssessmentDate: z.string().datetime().optional(),

  // Due diligence
  dueDiligencePerformed: z.boolean(),
  dueDiligenceDate: z.string().datetime().optional(),
  approvalStatus: z.enum(['approved', 'conditional', 'rejected', 'pending']),

  // Monitoring
  monitoringLevel: z.enum(['continuous', 'periodic', 'minimal', 'none']),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const FourthPartyRiskAssessmentSchema = z.object({
  id: z.string(),
  fourthPartyId: z.string(),
  parentVendorId: z.string(),
  tenantId: z.string(),
  timestamp: z.string().datetime(),

  // Inherit risk from parent
  inheritedRisk: z.number().min(0).max(100),

  // Direct risks
  directRisks: z.array(z.object({
    category: z.string(),
    description: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
  })),

  // Overall assessment
  overallRiskScore: z.number().min(0).max(100),
  riskLevel: z.enum(['critical', 'high', 'medium', 'low']),

  // Transparency and visibility
  visibilityLevel: z.enum(['full', 'partial', 'limited', 'none']),
  dataAvailability: z.enum(['complete', 'partial', 'minimal', 'none']),

  // Recommendations
  recommendations: z.array(z.string()),
  requiresDirectAssessment: z.boolean(),
});

export type FourthParty = z.infer<typeof FourthPartySchema>;
export type FourthPartyRiskAssessment = z.infer<typeof FourthPartyRiskAssessmentSchema>;

/**
 * Access and Privilege Management
 */
export const VendorAccessSchema = z.object({
  id: z.string(),
  vendorId: z.string(),
  tenantId: z.string(),

  // Access details
  accessType: z.enum([
    'network_access',
    'system_access',
    'data_access',
    'physical_access',
    'application_access',
  ]),

  systems: z.array(z.string()), // Systems/applications accessed
  dataCategories: z.array(z.enum([
    'pii',
    'financial',
    'health',
    'intellectual_property',
    'confidential',
    'public',
  ])),

  // Access level
  privilegeLevel: z.enum(['admin', 'elevated', 'standard', 'read_only']),

  // Users
  authorizedUsers: z.array(z.object({
    userId: z.string(),
    name: z.string(),
    email: z.string().email(),
    role: z.string(),
    lastAccess: z.string().datetime().optional(),
  })),

  // Justification
  businessJustification: z.string(),
  approvedBy: z.string(),
  approvalDate: z.string().datetime(),

  // Validity
  grantedDate: z.string().datetime(),
  expirationDate: z.string().datetime().optional(),
  status: z.enum(['active', 'expired', 'revoked', 'suspended']),

  // Monitoring
  accessLogsRetention: z.number(), // days
  anomalyDetectionEnabled: z.boolean(),
  lastAccessReview: z.string().datetime().optional(),
  nextAccessReview: z.string().datetime().optional(),
});

export const AccessReviewSchema = z.object({
  id: z.string(),
  vendorId: z.string(),
  tenantId: z.string(),
  timestamp: z.string().datetime(),

  // Review scope
  accessRecordsReviewed: z.array(z.string()), // Access IDs

  // Findings
  findings: z.array(z.object({
    type: z.enum([
      'excessive_privilege',
      'dormant_account',
      'missing_approval',
      'expired_access',
      'segregation_of_duties_violation',
    ]),
    accessId: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    description: z.string(),
    remediation: z.string(),
  })),

  // Actions taken
  accessesRevoked: z.number(),
  accessesModified: z.number(),
  accessesRenewed: z.number(),

  // Review details
  reviewedBy: z.string(),
  approvedBy: z.string().optional(),

  nextReviewDate: z.string().datetime(),
});

export type VendorAccess = z.infer<typeof VendorAccessSchema>;
export type AccessReview = z.infer<typeof AccessReviewSchema>;

/**
 * Incident and Breach Tracking
 */
export const VendorIncidentSchema = z.object({
  id: z.string(),
  vendorId: z.string(),
  tenantId: z.string(),

  incidentType: z.enum([
    'data_breach',
    'service_outage',
    'security_incident',
    'compliance_violation',
    'contract_breach',
    'quality_issue',
    'financial_distress',
    'other',
  ]),

  severity: z.enum(['critical', 'high', 'medium', 'low']),

  // Incident details
  title: z.string(),
  description: z.string(),
  detectedDate: z.string().datetime(),
  reportedDate: z.string().datetime(),
  reportedBy: z.string(),

  // Impact
  impact: z.object({
    businessImpact: z.string(),
    dataCompromised: z.boolean(),
    recordsAffected: z.number().optional(),
    estimatedCost: z.number().optional(),
    affectedCustomers: z.number().optional(),
  }),

  // Vendor response
  vendorNotificationDate: z.string().datetime().optional(),
  vendorResponse: z.string().optional(),
  vendorRootCause: z.string().optional(),
  vendorRemediationPlan: z.string().optional(),

  // Our response
  internalAssessment: z.string().optional(),
  remediationActions: z.array(z.object({
    action: z.string(),
    owner: z.string(),
    dueDate: z.string().datetime(),
    status: z.enum(['pending', 'in_progress', 'completed']),
  })).optional(),

  // Status
  status: z.enum(['open', 'investigating', 'remediation', 'resolved', 'closed']),
  resolvedDate: z.string().datetime().optional(),

  // Follow-up
  lessonsLearned: z.string().optional(),
  preventiveMeasures: z.array(z.string()).optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type VendorIncident = z.infer<typeof VendorIncidentSchema>;

/**
 * Business Continuity and Exit Planning
 */
export const BusinessContinuityPlanSchema = z.object({
  id: z.string(),
  vendorId: z.string(),
  tenantId: z.string(),

  // Vendor's BCP
  vendorBCPExists: z.boolean(),
  vendorBCPLastReviewed: z.string().datetime().optional(),
  vendorRTO: z.number().optional(), // Recovery Time Objective (hours)
  vendorRPO: z.number().optional(), // Recovery Point Objective (hours)

  // Our contingency plans
  contingencyPlans: z.array(z.object({
    scenario: z.string(), // e.g., "Vendor bankruptcy", "Service outage"
    plan: z.string(),
    alternativeVendors: z.array(z.string()),
    estimatedSwitchTime: z.number().optional(), // days
    costsEstimate: z.number().optional(),
  })),

  // Testing
  lastTestedDate: z.string().datetime().optional(),
  testResults: z.string().optional(),
  nextTestDate: z.string().datetime().optional(),

  updatedAt: z.string().datetime(),
});

export const VendorExitPlanSchema = z.object({
  id: z.string(),
  vendorId: z.string(),
  tenantId: z.string(),

  // Exit strategy
  exitReason: z.string().optional(),
  plannedExitDate: z.string().datetime().optional(),

  // Transition plan
  transitionSteps: z.array(z.object({
    step: z.string(),
    owner: z.string(),
    dueDate: z.string().datetime(),
    status: z.enum(['not_started', 'in_progress', 'completed']),
  })),

  // Data and assets
  dataRetrieval: z.object({
    dataToRetrieve: z.array(z.string()),
    retrievalMethod: z.string(),
    dataDestructionRequired: z.boolean(),
    destructionCertificateRequired: z.boolean(),
  }).optional(),

  assetReturn: z.object({
    assetsToReturn: z.array(z.string()),
    returnDeadline: z.string().datetime(),
  }).optional(),

  // Access termination
  accessRevocationPlan: z.array(z.object({
    accessType: z.string(),
    revocationDate: z.string().datetime(),
    responsible: z.string(),
  })),

  // Knowledge transfer
  knowledgeTransferRequired: z.boolean(),
  knowledgeTransferPlan: z.string().optional(),

  // Financial settlement
  finalInvoiceDate: z.string().datetime().optional(),
  finalPaymentDate: z.string().datetime().optional(),
  outstandingObligations: z.array(z.string()).optional(),

  status: z.enum(['planned', 'in_progress', 'completed']),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type BusinessContinuityPlan = z.infer<typeof BusinessContinuityPlanSchema>;
export type VendorExitPlan = z.infer<typeof VendorExitPlanSchema>;
