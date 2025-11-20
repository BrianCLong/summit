import { z } from 'zod';

/**
 * Financial Health Assessment
 */
export const FinancialMetricsSchema = z.object({
  // Profitability
  revenueUSD: z.number().optional(),
  netIncomeUSD: z.number().optional(),
  ebitdaUSD: z.number().optional(),
  profitMargin: z.number().optional(), // percentage

  // Liquidity
  currentRatio: z.number().optional(),
  quickRatio: z.number().optional(),
  cashFlowUSD: z.number().optional(),

  // Solvency
  debtToEquityRatio: z.number().optional(),
  interestCoverageRatio: z.number().optional(),

  // Efficiency
  assetTurnoverRatio: z.number().optional(),
  inventoryTurnover: z.number().optional(),

  // Market
  marketCapUSD: z.number().optional(),
  stockPrice: z.number().optional(),
  creditRating: z.string().optional(), // e.g., AAA, AA+, etc.
});

export const FinancialHealthScoreSchema = z.object({
  supplierId: z.string(),
  tenantId: z.string(),
  timestamp: z.string().datetime(),

  metrics: FinancialMetricsSchema,

  // Scoring
  overallScore: z.number().min(0).max(100),
  profitabilityScore: z.number().min(0).max(100),
  liquidityScore: z.number().min(0).max(100),
  solvencyScore: z.number().min(0).max(100),

  // Risk indicators
  bankruptcyRisk: z.enum(['low', 'medium', 'high', 'critical']),
  trendDirection: z.enum(['improving', 'stable', 'declining']),

  // Supporting data
  dataSource: z.string(),
  dataQuality: z.enum(['high', 'medium', 'low']),
  lastUpdated: z.string().datetime(),
});

export type FinancialMetrics = z.infer<typeof FinancialMetricsSchema>;
export type FinancialHealthScore = z.infer<typeof FinancialHealthScoreSchema>;

/**
 * Cybersecurity Posture Assessment
 */
export const SecurityControlSchema = z.object({
  category: z.enum([
    'access_control',
    'encryption',
    'network_security',
    'incident_response',
    'vulnerability_management',
    'security_awareness',
    'data_protection',
    'third_party_security',
  ]),
  controlName: z.string(),
  implemented: z.boolean(),
  effectiveness: z.enum(['high', 'medium', 'low', 'unknown']),
  lastAssessed: z.string().datetime().optional(),
});

export const CyberIncidentSchema = z.object({
  incidentId: z.string(),
  date: z.string().datetime(),
  type: z.enum([
    'data_breach',
    'ransomware',
    'ddos',
    'malware',
    'phishing',
    'insider_threat',
    'supply_chain_attack',
    'other',
  ]),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  description: z.string(),
  recordsAffected: z.number().optional(),
  resolved: z.boolean(),
  remediationDate: z.string().datetime().optional(),
});

export const CybersecurityPostureSchema = z.object({
  supplierId: z.string(),
  tenantId: z.string(),
  timestamp: z.string().datetime(),

  // Security controls
  controls: z.array(SecurityControlSchema),

  // Certifications
  certifications: z.array(z.enum([
    'ISO27001',
    'SOC2_Type1',
    'SOC2_Type2',
    'PCI_DSS',
    'NIST_CSF',
    'CMMC',
    'FedRAMP',
    'GDPR_Compliant',
  ])).optional(),

  // Incidents
  historicalIncidents: z.array(CyberIncidentSchema),
  activeThreats: z.number(),

  // Vulnerability management
  knownVulnerabilities: z.object({
    critical: z.number(),
    high: z.number(),
    medium: z.number(),
    low: z.number(),
  }),

  // Scores
  overallScore: z.number().min(0).max(100),
  controlCoverageScore: z.number().min(0).max(100),
  incidentHistoryScore: z.number().min(0).max(100),
  vulnerabilityScore: z.number().min(0).max(100),

  // Risk level
  riskLevel: z.enum(['critical', 'high', 'medium', 'low']),

  // Assessment metadata
  assessmentMethod: z.enum(['onsite_audit', 'questionnaire', 'third_party_report', 'continuous_monitoring']),
  lastAssessmentDate: z.string().datetime(),
  nextAssessmentDue: z.string().datetime().optional(),
});

export type SecurityControl = z.infer<typeof SecurityControlSchema>;
export type CyberIncident = z.infer<typeof CyberIncidentSchema>;
export type CybersecurityPosture = z.infer<typeof CybersecurityPostureSchema>;

/**
 * Geopolitical Risk Assessment
 */
export const GeopoliticalRiskFactorSchema = z.object({
  category: z.enum([
    'political_stability',
    'regulatory_environment',
    'trade_policy',
    'sanctions',
    'conflict',
    'corruption',
    'legal_system',
  ]),
  description: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  likelihood: z.enum(['very_high', 'high', 'medium', 'low', 'very_low']),
  trend: z.enum(['increasing', 'stable', 'decreasing']),
});

export const GeopoliticalRiskSchema = z.object({
  supplierId: z.string(),
  tenantId: z.string(),
  timestamp: z.string().datetime(),

  // Location risks
  countryRisk: z.object({
    country: z.string(),
    riskScore: z.number().min(0).max(100),
    politicalStabilityIndex: z.number().optional(),
    corruptionPerceptionIndex: z.number().optional(),
    easeOfDoingBusinessRank: z.number().optional(),
  }),

  regionRisk: z.object({
    region: z.string(),
    riskScore: z.number().min(0).max(100),
    activeConflicts: z.number(),
  }).optional(),

  // Specific risk factors
  riskFactors: z.array(GeopoliticalRiskFactorSchema),

  // Sanctions and export controls
  sanctionsExposure: z.object({
    underSanctions: z.boolean(),
    sanctioningCountries: z.array(z.string()),
    sanctionTypes: z.array(z.string()),
    effectiveDate: z.string().datetime().optional(),
  }).optional(),

  // Overall assessment
  overallRiskScore: z.number().min(0).max(100),
  riskLevel: z.enum(['critical', 'high', 'medium', 'low']),

  // Recommendations
  mitigationStrategies: z.array(z.string()),
});

export type GeopoliticalRiskFactor = z.infer<typeof GeopoliticalRiskFactorSchema>;
export type GeopoliticalRisk = z.infer<typeof GeopoliticalRiskSchema>;

/**
 * ESG (Environmental, Social, Governance) Scoring
 */
export const EnvironmentalMetricsSchema = z.object({
  carbonEmissionsTonnes: z.number().optional(),
  energyConsumptionMWh: z.number().optional(),
  renewableEnergyPercentage: z.number().optional(),
  waterUsageCubicMeters: z.number().optional(),
  wasteGeneratedTonnes: z.number().optional(),
  recyclingRate: z.number().optional(),
  environmentalCertifications: z.array(z.string()).optional(),
  environmentalIncidents: z.number().optional(),
});

export const SocialMetricsSchema = z.object({
  employeeCount: z.number().optional(),
  employeeTurnoverRate: z.number().optional(),
  diversityScore: z.number().min(0).max(100).optional(),
  safetyIncidentRate: z.number().optional(),
  laborPracticesCertifications: z.array(z.string()).optional(),
  humanRightsViolations: z.number(),
  communityInvestmentUSD: z.number().optional(),
  supplierCodeOfConduct: z.boolean(),
});

export const GovernanceMetricsSchema = z.object({
  boardIndependence: z.number().optional(), // percentage
  ethicsAndComplianceProgram: z.boolean(),
  whistleblowerProtection: z.boolean(),
  anticorruptionCertifications: z.array(z.string()).optional(),
  regulatoryViolations: z.number(),
  auditQuality: z.enum(['high', 'medium', 'low']).optional(),
  transparencyScore: z.number().min(0).max(100).optional(),
});

export const ESGScoreSchema = z.object({
  supplierId: z.string(),
  tenantId: z.string(),
  timestamp: z.string().datetime(),

  // Component scores
  environmentalMetrics: EnvironmentalMetricsSchema,
  environmentalScore: z.number().min(0).max(100),

  socialMetrics: SocialMetricsSchema,
  socialScore: z.number().min(0).max(100),

  governanceMetrics: GovernanceMetricsSchema,
  governanceScore: z.number().min(0).max(100),

  // Overall ESG score
  overallESGScore: z.number().min(0).max(100),
  rating: z.enum(['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C']),

  // Risk flags
  criticalIssues: z.array(z.string()),
  improvementAreas: z.array(z.string()),

  // Data quality
  dataCompleteness: z.number().min(0).max(100),
  lastUpdated: z.string().datetime(),
});

export type EnvironmentalMetrics = z.infer<typeof EnvironmentalMetricsSchema>;
export type SocialMetrics = z.infer<typeof SocialMetricsSchema>;
export type GovernanceMetrics = z.infer<typeof GovernanceMetricsSchema>;
export type ESGScore = z.infer<typeof ESGScoreSchema>;

/**
 * Regulatory Compliance Tracking
 */
export const ComplianceRequirementSchema = z.object({
  requirementId: z.string(),
  regulation: z.string(), // e.g., GDPR, CCPA, SOX, etc.
  description: z.string(),
  applicable: z.boolean(),
  status: z.enum(['compliant', 'partial', 'non_compliant', 'not_assessed']),
  evidence: z.array(z.string()).optional(),
  lastAuditDate: z.string().datetime().optional(),
  nextAuditDue: z.string().datetime().optional(),
  violations: z.array(z.object({
    date: z.string().datetime(),
    description: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    remediated: z.boolean(),
  })).optional(),
});

export const RegulatoryComplianceSchema = z.object({
  supplierId: z.string(),
  tenantId: z.string(),
  timestamp: z.string().datetime(),

  requirements: z.array(ComplianceRequirementSchema),

  // Overall compliance score
  complianceScore: z.number().min(0).max(100),
  complianceRate: z.number().min(0).max(100), // % of requirements met

  // Active violations
  activeViolations: z.number(),
  criticalViolations: z.number(),

  // Risk level
  complianceRisk: z.enum(['critical', 'high', 'medium', 'low']),

  // Certifications
  activeCertifications: z.array(z.string()),
  expiredCertifications: z.array(z.string()),
});

export type ComplianceRequirement = z.infer<typeof ComplianceRequirementSchema>;
export type RegulatoryCompliance = z.infer<typeof RegulatoryComplianceSchema>;

/**
 * Performance and Quality Metrics
 */
export const QualityMetricsSchema = z.object({
  defectRate: z.number().optional(), // per million
  returnRate: z.number().optional(), // percentage
  firstPassYield: z.number().optional(), // percentage
  customerSatisfactionScore: z.number().min(0).max(100).optional(),
  qualityCertifications: z.array(z.string()).optional(),
  auditResults: z.array(z.object({
    date: z.string().datetime(),
    score: z.number().min(0).max(100),
    findings: z.number(),
    criticalFindings: z.number(),
  })).optional(),
});

export const DeliveryMetricsSchema = z.object({
  onTimeDeliveryRate: z.number().min(0).max(100),
  leadTimeAccuracy: z.number().min(0).max(100),
  orderFulfillmentRate: z.number().min(0).max(100),
  averageLeadTimeDays: z.number(),
  deliveryVariance: z.number(), // standard deviation in days
});

export const CapacityMetricsSchema = z.object({
  currentCapacityUtilization: z.number().min(0).max(100),
  maxCapacity: z.number().optional(),
  scalabilityRating: z.enum(['high', 'medium', 'low']),
  leadTimeForCapacityIncrease: z.number().optional(), // days
  historicalCapacityIssues: z.number(),
});

export const PerformanceScoreSchema = z.object({
  supplierId: z.string(),
  tenantId: z.string(),
  timestamp: z.string().datetime(),
  evaluationPeriod: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),

  qualityMetrics: QualityMetricsSchema,
  qualityScore: z.number().min(0).max(100),

  deliveryMetrics: DeliveryMetricsSchema,
  deliveryScore: z.number().min(0).max(100),

  capacityMetrics: CapacityMetricsSchema,
  capacityScore: z.number().min(0).max(100),

  // Overall performance
  overallPerformanceScore: z.number().min(0).max(100),
  performanceRating: z.enum(['excellent', 'good', 'acceptable', 'poor', 'critical']),
  performanceTrend: z.enum(['improving', 'stable', 'declining']),

  // Issues and corrective actions
  openIssues: z.number(),
  correctiveActionsInProgress: z.number(),
});

export type QualityMetrics = z.infer<typeof QualityMetricsSchema>;
export type DeliveryMetrics = z.infer<typeof DeliveryMetricsSchema>;
export type CapacityMetrics = z.infer<typeof CapacityMetricsSchema>;
export type PerformanceScore = z.infer<typeof PerformanceScoreSchema>;

/**
 * Comprehensive Supplier Risk Assessment
 */
export const SupplierRiskAssessmentSchema = z.object({
  supplierId: z.string(),
  supplierName: z.string(),
  tenantId: z.string(),
  timestamp: z.string().datetime(),

  // Component assessments
  financialHealth: FinancialHealthScoreSchema.optional(),
  cybersecurityPosture: CybersecurityPostureSchema.optional(),
  geopoliticalRisk: GeopoliticalRiskSchema.optional(),
  esgScore: ESGScoreSchema.optional(),
  regulatoryCompliance: RegulatoryComplianceSchema.optional(),
  performanceScore: PerformanceScoreSchema.optional(),

  // Aggregated risk scores
  riskScores: z.object({
    financial: z.number().min(0).max(100),
    cybersecurity: z.number().min(0).max(100),
    geopolitical: z.number().min(0).max(100),
    esg: z.number().min(0).max(100),
    compliance: z.number().min(0).max(100),
    performance: z.number().min(0).max(100),
  }),

  // Overall risk assessment
  overallRiskScore: z.number().min(0).max(100),
  riskLevel: z.enum(['critical', 'high', 'medium', 'low']),
  riskTier: z.enum(['tier1_critical', 'tier2_high', 'tier3_medium', 'tier4_low']),

  // Concentration risk
  concentrationRisk: z.object({
    revenueConcentration: z.number().optional(), // % of our spend
    productConcentration: z.number().optional(), // % of products from this supplier
    isStrategicSupplier: z.boolean(),
    isSingleSource: z.boolean(),
  }),

  // Recommendations
  keyRisks: z.array(z.object({
    category: z.string(),
    description: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    likelihood: z.enum(['very_high', 'high', 'medium', 'low', 'very_low']),
    impact: z.string(),
  })),

  mitigationActions: z.array(z.object({
    priority: z.enum(['critical', 'high', 'medium', 'low']),
    action: z.string(),
    timeline: z.string(),
    owner: z.string().optional(),
    status: z.enum(['not_started', 'in_progress', 'completed']),
  })),

  // Approval and monitoring
  approvalStatus: z.enum(['approved', 'conditional', 'rejected', 'under_review']),
  reviewFrequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual']),
  nextReviewDate: z.string().datetime(),
  assessor: z.string().optional(),
});

export type SupplierRiskAssessment = z.infer<typeof SupplierRiskAssessmentSchema>;
