/**
 * Sanctions Monitor - Type Definitions
 * Comprehensive types for sanctions monitoring and compliance tracking
 */

export enum SanctionRegime {
  // Multilateral
  UN = 'UN',
  UN_SECURITY_COUNCIL = 'UN_SECURITY_COUNCIL',

  // Regional
  EU = 'EU',
  ARAB_LEAGUE = 'ARAB_LEAGUE',
  AFRICAN_UNION = 'AFRICAN_UNION',

  // National
  US_OFAC = 'US_OFAC',
  US_STATE = 'US_STATE',
  US_COMMERCE = 'US_COMMERCE',
  UK_FCDO = 'UK_FCDO',
  UK_HMT = 'UK_HMT',
  CANADA = 'CANADA',
  AUSTRALIA = 'AUSTRALIA',
  JAPAN = 'JAPAN',
  SWITZERLAND = 'SWITZERLAND',

  // Bilateral
  BILATERAL = 'BILATERAL',

  // Other
  OTHER = 'OTHER'
}

export enum SanctionType {
  // Asset-based
  ASSET_FREEZE = 'ASSET_FREEZE',
  ASSET_BLOCKING = 'ASSET_BLOCKING',

  // Trade
  TRADE_EMBARGO = 'TRADE_EMBARGO',
  IMPORT_BAN = 'IMPORT_BAN',
  EXPORT_BAN = 'EXPORT_BAN',
  ARMS_EMBARGO = 'ARMS_EMBARGO',
  TECHNOLOGY_TRANSFER_BAN = 'TECHNOLOGY_TRANSFER_BAN',

  // Travel
  TRAVEL_BAN = 'TRAVEL_BAN',
  VISA_RESTRICTION = 'VISA_RESTRICTION',

  // Financial
  FINANCIAL_SANCTIONS = 'FINANCIAL_SANCTIONS',
  BANKING_RESTRICTIONS = 'BANKING_RESTRICTIONS',
  INVESTMENT_BAN = 'INVESTMENT_BAN',
  CAPITAL_MARKETS_BAN = 'CAPITAL_MARKETS_BAN',
  CORRESPONDENT_BANKING_BAN = 'CORRESPONDENT_BANKING_BAN',

  // Sectoral
  SECTORAL_SANCTIONS = 'SECTORAL_SANCTIONS',
  ENERGY_SECTOR = 'ENERGY_SECTOR',
  DEFENSE_SECTOR = 'DEFENSE_SECTOR',
  FINANCIAL_SECTOR = 'FINANCIAL_SECTOR',

  // Other
  LUXURY_GOODS_BAN = 'LUXURY_GOODS_BAN',
  DIPLOMATIC_SANCTIONS = 'DIPLOMATIC_SANCTIONS',
  SPORTS_SANCTIONS = 'SPORTS_SANCTIONS',
  CULTURAL_SANCTIONS = 'CULTURAL_SANCTIONS'
}

export enum EntityType {
  INDIVIDUAL = 'INDIVIDUAL',
  COMPANY = 'COMPANY',
  ORGANIZATION = 'ORGANIZATION',
  GOVERNMENT = 'GOVERNMENT',
  GOVERNMENT_AGENCY = 'GOVERNMENT_AGENCY',
  MILITARY = 'MILITARY',
  FINANCIAL_INSTITUTION = 'FINANCIAL_INSTITUTION',
  STATE_OWNED_ENTERPRISE = 'STATE_OWNED_ENTERPRISE',
  VESSEL = 'VESSEL',
  AIRCRAFT = 'AIRCRAFT'
}

export enum ComplianceRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
  PROHIBITED = 'PROHIBITED'
}

export enum ViolationType {
  DIRECT_VIOLATION = 'DIRECT_VIOLATION',
  INDIRECT_VIOLATION = 'INDIRECT_VIOLATION',
  EVASION = 'EVASION',
  FACILITATION = 'FACILITATION',
  CONSPIRACY = 'CONSPIRACY',
  FALSE_STATEMENTS = 'FALSE_STATEMENTS',
  FAILURE_TO_REPORT = 'FAILURE_TO_REPORT'
}

export interface SanctionDesignation {
  id: string;
  regime: SanctionRegime;
  sanctionTypes: SanctionType[];

  // Entity/Individual Information
  entityType: EntityType;
  name: string;
  aliases: string[];

  // Identification
  identifiers: EntityIdentifier[];
  addresses: Address[];

  // Designation Details
  designationDate: Date;
  effectiveDate: Date;
  expiryDate?: Date;
  listingReason: string;
  legalBasis: string;

  // Status
  active: boolean;
  updated: boolean;
  lastUpdated: Date;

  // Related Entities
  relatedEntities: string[];
  ownership?: OwnershipStructure;

  // Additional Details
  nationality?: string[];
  citizenship?: string[];
  dateOfBirth?: Date;
  placeOfBirth?: string;
  passport?: PassportInfo[];

  // Metadata
  sourceUrl?: string;
  officialReference?: string;
  notes?: string;
  metadata: Record<string, any>;
}

export interface EntityIdentifier {
  type: 'TAX_ID' | 'REGISTRATION_NUMBER' | 'SWIFT_BIC' | 'IMO_NUMBER' | 'ISIN' | 'LEI' | 'OTHER';
  value: string;
  country?: string;
  issuingAuthority?: string;
  validFrom?: Date;
  validTo?: Date;
}

export interface Address {
  street?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country: string;
  type: 'RESIDENTIAL' | 'BUSINESS' | 'REGISTERED' | 'OTHER';
  current: boolean;
}

export interface PassportInfo {
  number: string;
  country: string;
  issueDate?: Date;
  expiryDate?: Date;
}

export interface OwnershipStructure {
  parentCompany?: string;
  subsidiaries: string[];
  beneficialOwners: BeneficialOwner[];
  ownershipPercentage?: number;
}

export interface BeneficialOwner {
  name: string;
  percentage: number;
  sanctioned: boolean;
  nationality?: string;
}

export interface SanctionUpdate {
  id: string;
  updateType: 'NEW_DESIGNATION' | 'AMENDMENT' | 'DELISTING' | 'RENEWAL' | 'CORRECTION';
  regime: SanctionRegime;
  designationId: string;
  timestamp: Date;
  changes: SanctionChange[];
  reason?: string;
  officialReference?: string;
}

export interface SanctionChange {
  field: string;
  oldValue: any;
  newValue: any;
  description: string;
}

export interface ComplianceRequirement {
  id: string;
  regime: SanctionRegime;
  jurisdiction: string;
  requirement: string;
  description: string;
  mandatory: boolean;
  deadline?: Date;
  applicableTo: string[];
  penalties: Penalty[];
  guidance?: string;
  lastUpdated: Date;
}

export interface Penalty {
  type: 'CIVIL' | 'CRIMINAL';
  description: string;
  maxFine?: {
    amount: number;
    currency: string;
  };
  imprisonment?: {
    maxYears: number;
  };
}

export interface Violation {
  id: string;
  violationType: ViolationType;
  regime: SanctionRegime;
  designationId: string;

  // Violation Details
  description: string;
  detectedDate: Date;
  occurrenceDate: Date;
  location?: string;

  // Parties Involved
  violator: string;
  sanctionedParty: string;

  // Transaction Details
  transactionDetails?: TransactionDetails;

  // Severity
  severity: ComplianceRiskLevel;
  potentialPenalty?: Penalty;

  // Status
  status: 'DETECTED' | 'INVESTIGATING' | 'CONFIRMED' | 'RESOLVED' | 'DISMISSED';
  reportedToAuthorities: boolean;
  reportDate?: Date;

  // Evidence
  evidence: Evidence[];

  // Resolution
  resolution?: string;
  resolutionDate?: Date;

  metadata: Record<string, any>;
}

export interface TransactionDetails {
  amount?: {
    value: number;
    currency: string;
  };
  transactionType: string;
  date: Date;
  reference?: string;
  description?: string;
  parties: {
    sender?: string;
    recipient?: string;
    intermediaries?: string[];
  };
}

export interface Evidence {
  type: 'DOCUMENT' | 'TRANSACTION_RECORD' | 'COMMUNICATION' | 'WITNESS_STATEMENT' | 'OTHER';
  description: string;
  source?: string;
  dateCollected: Date;
  documentId?: string;
}

export interface HumanitarianExemption {
  id: string;
  regime: SanctionRegime;
  designationId: string;

  // Exemption Details
  exemptionType: 'HUMANITARIAN_AID' | 'MEDICAL' | 'FOOD' | 'BASIC_NEEDS' | 'DIPLOMATIC' | 'OTHER';
  description: string;
  justification: string;

  // Approval
  approved: boolean;
  approvedBy?: string;
  approvalDate?: Date;
  approvalReference?: string;

  // Validity
  effectiveDate: Date;
  expiryDate?: Date;

  // Conditions
  conditions: string[];
  limitations: string[];

  // Reporting
  reportingRequired: boolean;
  reportingFrequency?: string;

  metadata: Record<string, any>;
}

export interface ComplianceCheck {
  id: string;
  entityName: string;
  entityIdentifiers: EntityIdentifier[];
  checkType: 'NAME_SCREENING' | 'FULL_SCREENING' | 'TRANSACTION_SCREENING' | 'PERIODIC_REVIEW';

  // Results
  timestamp: Date;
  matches: SanctionMatch[];
  overallRisk: ComplianceRiskLevel;

  // Details
  regimesChecked: SanctionRegime[];
  listsChecked: string[];

  // Actions
  requiresReview: boolean;
  blockedTransaction: boolean;
  escalated: boolean;

  // Analyst
  reviewedBy?: string;
  reviewDate?: Date;
  reviewNotes?: string;

  metadata: Record<string, any>;
}

export interface SanctionMatch {
  designationId: string;
  matchType: 'EXACT' | 'FUZZY' | 'PARTIAL' | 'ALIAS';
  confidence: number; // 0-1
  matchedFields: string[];
  sanctionDetails: SanctionDesignation;
  risk: ComplianceRiskLevel;
}

export interface MonitoringConfig {
  regimes: SanctionRegime[];
  jurisdictions: string[];
  sanctionTypes: SanctionType[];
  entityTypes: EntityType[];

  // Screening
  enableAutoScreening: boolean;
  screeningFrequency: number; // milliseconds
  fuzzyMatchThreshold: number; // 0-1

  // Monitoring
  monitorUpdates: boolean;
  updateInterval: number; // milliseconds

  // Alerts
  enableAlerts: boolean;
  alertThresholds: {
    riskLevel: ComplianceRiskLevel;
    matchConfidence: number;
  };

  // Compliance
  requireApprovalFor: ComplianceRiskLevel[];
  autoBlockTransactions: boolean;
  reportingEnabled: boolean;
}

export interface SanctionFilter {
  regimes?: SanctionRegime[];
  sanctionTypes?: SanctionType[];
  entityTypes?: EntityType[];
  jurisdictions?: string[];
  active?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchTerm?: string;
  country?: string[];
}

export interface ComplianceReport {
  id: string;
  reportType: 'SCREENING' | 'VIOLATION' | 'AUDIT' | 'PERIODIC' | 'INCIDENT';
  period: {
    start: Date;
    end: Date;
  };

  // Statistics
  totalScreenings: number;
  matches: number;
  falsePositives: number;
  violations: number;
  exemptions: number;

  // Risk Analysis
  riskDistribution: Record<ComplianceRiskLevel, number>;
  topRisks: RiskItem[];

  // Violations
  violationsByType: Record<ViolationType, number>;
  unresolvedViolations: number;

  // Compliance Status
  overallStatus: 'COMPLIANT' | 'NEEDS_ATTENTION' | 'NON_COMPLIANT';
  findings: string[];
  recommendations: string[];

  // Metadata
  generatedBy: string;
  generatedAt: Date;
  approvedBy?: string;
  approvalDate?: Date;

  metadata: Record<string, any>;
}

export interface RiskItem {
  entity: string;
  riskLevel: ComplianceRiskLevel;
  reason: string;
  exposure: number;
}

export interface Alert {
  id: string;
  alertType: 'NEW_DESIGNATION' | 'SANCTION_UPDATE' | 'MATCH_DETECTED' | 'VIOLATION_DETECTED' | 'COMPLIANCE_BREACH';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  timestamp: Date;

  // Related Items
  designationId?: string;
  violationId?: string;
  checkId?: string;

  // Status
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;

  // Actions
  actionRequired: boolean;
  actionTaken?: string;
  actionDate?: Date;

  // Recipients
  recipients: string[];

  metadata: Record<string, any>;
}

export interface ComplianceMetrics {
  // Screening Metrics
  totalScreenings: number;
  averageScreeningTime: number;
  matchRate: number;
  falsePositiveRate: number;

  // Risk Metrics
  highRiskEntities: number;
  criticalRiskEntities: number;
  totalRiskExposure: number;

  // Violation Metrics
  totalViolations: number;
  resolvedViolations: number;
  averageResolutionTime: number;

  // Compliance Status
  complianceScore: number; // 0-100
  lastAuditDate?: Date;
  nextAuditDate?: Date;

  // Update Metrics
  designationsTracked: number;
  updatesProcessed: number;
  lastUpdateTime: Date;
}

export interface RiskAssessment {
  entityId: string;
  assessmentDate: Date;
  overallRisk: ComplianceRiskLevel;

  // Risk Factors
  sanctionMatches: SanctionMatch[];
  indirectExposure: IndirectExposure[];
  geographicRisk: GeographicRisk;
  sectorRisk: SectorRisk;
  ownershipRisk: OwnershipRisk;

  // Risk Score
  riskScore: number; // 0-100
  riskFactors: RiskFactor[];

  // Mitigation
  mitigationMeasures: string[];
  residualRisk: ComplianceRiskLevel;

  // Recommendations
  recommendations: string[];
  dueDate?: Date;

  // Analyst
  assessedBy: string;
  reviewedBy?: string;
  approvedBy?: string;

  metadata: Record<string, any>;
}

export interface IndirectExposure {
  entityId: string;
  entityName: string;
  relationship: 'PARENT' | 'SUBSIDIARY' | 'AFFILIATE' | 'PARTNER' | 'SUPPLIER' | 'CUSTOMER' | 'BENEFICIAL_OWNER';
  exposureLevel: number; // 0-100
  sanctioned: boolean;
}

export interface GeographicRisk {
  countries: string[];
  highRiskCountries: string[];
  riskScore: number; // 0-100
  factors: string[];
}

export interface SectorRisk {
  sector: string;
  riskLevel: ComplianceRiskLevel;
  regulatedSector: boolean;
  factors: string[];
}

export interface OwnershipRisk {
  sanctionedOwners: number;
  ownershipTransparency: number; // 0-100
  complexStructure: boolean;
  factors: string[];
}

export interface RiskFactor {
  category: string;
  description: string;
  weight: number;
  score: number;
}
