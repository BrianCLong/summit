/**
 * Type definitions for AI Security Scanner
 */

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type VulnerabilityCategory =
  | 'injection'
  | 'authentication'
  | 'authorization'
  | 'cryptographic'
  | 'configuration'
  | 'data-exposure'
  | 'dos'
  | 'supply-chain'
  | 'logic-flaw';

export interface Vulnerability {
  id: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  category: VulnerabilityCategory;
  cvssScore: number;
  cweId?: string;
  cveId?: string;
  location: VulnerabilityLocation;
  attribution: Attribution;
  evidence: Evidence[];
  remediation: RemediationSuggestion;
  complianceImpact: ComplianceImpact[];
  detectedAt: Date;
  status: 'open' | 'triaging' | 'remediating' | 'resolved' | 'accepted';
}

export interface VulnerabilityLocation {
  file: string;
  startLine: number;
  endLine: number;
  codeSnippet: string;
  functionName?: string;
  className?: string;
  module?: string;
}

export interface Attribution {
  source: 'ai-scan' | 'static-analysis' | 'dynamic-analysis' | 'dependency-scan' | 'manual';
  confidence: number;
  aiModel?: string;
  scanId: string;
  timestamp: Date;
  rootCause?: string;
  attackVector?: string;
}

export interface Evidence {
  type: 'code-pattern' | 'data-flow' | 'taint-trace' | 'exploit-poc' | 'dependency-tree';
  description: string;
  data: Record<string, unknown>;
  hash: string;
}

export interface RemediationSuggestion {
  description: string;
  codeChanges?: CodeChange[];
  configChanges?: ConfigChange[];
  priority: 'immediate' | 'high' | 'medium' | 'low';
  estimatedEffort: string;
  automatable: boolean;
  verificationSteps: string[];
}

export interface CodeChange {
  file: string;
  oldCode: string;
  newCode: string;
  explanation: string;
}

export interface ConfigChange {
  target: string;
  setting: string;
  currentValue: unknown;
  recommendedValue: unknown;
  explanation: string;
}

export interface ComplianceImpact {
  framework: 'NIST' | 'SOC2' | 'HIPAA' | 'GDPR' | 'FedRAMP' | 'ISO27001' | 'PCI-DSS';
  control: string;
  impact: 'violation' | 'weakness' | 'observation';
  description: string;
}

export interface ScanConfig {
  targetPaths: string[];
  excludePaths: string[];
  scanTypes: ScanType[];
  severityThreshold: SeverityLevel;
  enableAIAnalysis: boolean;
  enableRedTeam: boolean;
  complianceFrameworks: string[];
  maxConcurrency: number;
  timeout: number;
}

export type ScanType =
  | 'static-analysis'
  | 'dependency-audit'
  | 'secret-detection'
  | 'configuration-audit'
  | 'ai-pattern-analysis'
  | 'red-team-simulation';

export interface ScanResult {
  scanId: string;
  startTime: Date;
  endTime: Date;
  status: 'completed' | 'failed' | 'partial';
  vulnerabilities: Vulnerability[];
  summary: ScanSummary;
  complianceReport: ComplianceReport;
  auditTrail: AuditEntry[];
}

export interface ScanSummary {
  totalFiles: number;
  filesScanned: number;
  vulnerabilitiesBySeverity: Record<SeverityLevel, number>;
  vulnerabilitiesByCategory: Record<string, number>;
  remediationProgress: number;
  riskScore: number;
}

export interface ComplianceReport {
  frameworks: FrameworkCompliance[];
  overallScore: number;
  gaps: ComplianceGap[];
  recommendations: string[];
}

export interface FrameworkCompliance {
  framework: string;
  score: number;
  controlsPassed: number;
  controlsFailed: number;
  controlsNotApplicable: number;
}

export interface ComplianceGap {
  framework: string;
  control: string;
  gap: string;
  severity: SeverityLevel;
  remediation: string;
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  action: string;
  actor: string;
  target: string;
  details: Record<string, unknown>;
  previousHash: string;
  hash: string;
  signature?: string;
}

export interface ZeroTrustContext {
  sessionId: string;
  userId: string;
  deviceId: string;
  location: string;
  riskScore: number;
  authenticatedAt: Date;
  permissions: string[];
  accessHistory: AccessEvent[];
}

export interface AccessEvent {
  timestamp: Date;
  resource: string;
  action: string;
  result: 'allowed' | 'denied' | 'challenged';
  reason?: string;
}

export interface BattlefieldCommsConfig {
  encryptionLevel: 'standard' | 'high' | 'classified';
  integrityChecks: boolean;
  nonRepudiation: boolean;
  auditRetention: number;
  geoRestrictions?: string[];
}
