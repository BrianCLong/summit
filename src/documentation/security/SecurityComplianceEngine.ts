/**
 * Advanced Security Scanning & Compliance Automation Engine
 * Enterprise-grade Security and Compliance for Documentation
 * Phase 45: Advanced Security & Compliance Framework
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface SecurityConfig {
  scanning: ScanningConfig;
  compliance: ComplianceConfig;
  authentication: AuthenticationConfig;
  authorization: AuthorizationConfig;
  encryption: EncryptionConfig;
  audit: AuditConfig;
  monitoring: SecurityMonitoringConfig;
  policies: SecurityPolicy[];
}

export interface ScanningConfig {
  enabled: boolean;
  schedules: ScanSchedule[];
  scanners: SecurityScanner[];
  thresholds: SecurityThreshold[];
  reporting: ScanReportingConfig;
  integrations: ScannerIntegration[];
}

export interface ComplianceConfig {
  frameworks: ComplianceFramework[];
  controls: ComplianceControl[];
  assessments: ComplianceAssessment[];
  reporting: ComplianceReportingConfig;
  automation: ComplianceAutomation;
}

export interface SecurityScanner {
  id: string;
  name: string;
  type:
    | 'sast'
    | 'dast'
    | 'sca'
    | 'secrets'
    | 'container'
    | 'infrastructure'
    | 'content'
    | 'custom';
  enabled: boolean;
  configuration: ScannerConfig;
  rules: SecurityRule[];
  exclusions: ScanExclusion[];
}

export interface ComplianceFramework {
  id: string;
  name: string;
  version: string;
  type: 'SOC2' | 'ISO27001' | 'GDPR' | 'HIPAA' | 'PCI_DSS' | 'NIST' | 'custom';
  requirements: ComplianceRequirement[];
  controls: string[];
  assessmentPeriod: string;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  category: 'access' | 'data' | 'network' | 'content' | 'operational';
  rules: PolicyRule[];
  enforcement: 'strict' | 'warn' | 'advisory';
  scope: PolicyScope;
  exceptions: PolicyException[];
}

export class SecurityComplianceEngine extends EventEmitter {
  private config: SecurityConfig;
  private scanResults: Map<string, ScanResult[]> = new Map();
  private complianceState: Map<string, ComplianceState> = new Map();
  private securityAlerts: Map<string, SecurityAlert[]> = new Map();
  private auditTrail: AuditEvent[] = [];

  constructor(config: SecurityConfig) {
    super();
    this.config = config;
    this.initializeSecurity();
  }

  /**
   * Initialize security and compliance systems
   */
  private async initializeSecurity(): Promise<void> {
    await this.setupSecurityScanners();
    await this.initializeCompliance();
    await this.configureAuthentication();
    await this.setupAuthorization();
    await this.enableEncryption();
    await this.startSecurityMonitoring();
    await this.initializeAuditLogging();
    this.emit('security:initialized');
  }

  /**
   * Setup all security scanners
   */
  private async setupSecurityScanners(): Promise<void> {
    for (const scanner of this.config.scanning.scanners) {
      if (scanner.enabled) {
        try {
          await this.activateScanner(scanner);
          this.emit('scanner:activated', { scannerId: scanner.id });
        } catch (error) {
          this.emit('scanner:failed', { scannerId: scanner.id, error });
        }
      }
    }
  }

  /**
   * Activate a specific security scanner
   */
  private async activateScanner(scanner: SecurityScanner): Promise<void> {
    const scannerInstance = this.createScannerInstance(scanner);
    await scannerInstance.initialize();
    await scannerInstance.updateRules();
    await this.scheduleScan(scanner);
  }

  /**
   * Create scanner instance based on type
   */
  private createScannerInstance(
    scanner: SecurityScanner,
  ): SecurityScannerInstance {
    switch (scanner.type) {
      case 'sast':
        return new SASTScanner(scanner);
      case 'dast':
        return new DASTScanner(scanner);
      case 'sca':
        return new SCAScanner(scanner);
      case 'secrets':
        return new SecretsScanner(scanner);
      case 'container':
        return new ContainerScanner(scanner);
      case 'infrastructure':
        return new InfrastructureScanner(scanner);
      case 'content':
        return new ContentSecurityScanner(scanner);
      default:
        return new CustomScanner(scanner);
    }
  }

  /**
   * Execute comprehensive security scan
   */
  async executeSecurityScan(
    scanType?: string,
    target?: string,
  ): Promise<SecurityScanResult> {
    const scanId = this.generateScanId();
    const startTime = Date.now();

    this.emit('scan:started', { scanId, scanType, target });

    try {
      const results: ScanResult[] = [];

      // Run applicable scanners
      for (const scanner of this.config.scanning.scanners) {
        if (scanner.enabled && (!scanType || scanner.type === scanType)) {
          const scannerInstance = this.createScannerInstance(scanner);
          const scanResult = await scannerInstance.scan(target);
          results.push(scanResult);
        }
      }

      // Aggregate results
      const aggregatedResult = await this.aggregateScanResults(results);

      // Store results
      this.scanResults.set(scanId, results);

      // Check thresholds and trigger alerts
      await this.checkSecurityThresholds(aggregatedResult);

      // Generate report
      const report = await this.generateSecurityReport(
        scanId,
        aggregatedResult,
      );

      const scanDuration = Date.now() - startTime;
      this.emit('scan:completed', {
        scanId,
        duration: scanDuration,
        findings: aggregatedResult.findings.length,
      });

      return {
        scanId,
        timestamp: new Date(),
        duration: scanDuration,
        results: aggregatedResult,
        report,
      };
    } catch (error) {
      this.emit('scan:failed', { scanId, error });
      throw error;
    }
  }

  /**
   * Run compliance assessment
   */
  async runComplianceAssessment(
    frameworkId: string,
  ): Promise<ComplianceAssessmentResult> {
    const framework = this.config.compliance.frameworks.find(
      (f) => f.id === frameworkId,
    );
    if (!framework) {
      throw new Error(`Compliance framework ${frameworkId} not found`);
    }

    this.emit('compliance:assessment-started', { frameworkId });

    const assessmentResults: ControlAssessmentResult[] = [];

    // Assess each requirement
    for (const requirement of framework.requirements) {
      const result = await this.assessComplianceRequirement(requirement);
      assessmentResults.push(result);
    }

    // Calculate overall compliance score
    const overallScore = this.calculateComplianceScore(assessmentResults);

    // Generate evidence
    const evidence = await this.collectComplianceEvidence(
      framework,
      assessmentResults,
    );

    // Update compliance state
    const complianceState: ComplianceState = {
      frameworkId: framework.id,
      assessmentDate: new Date(),
      overallScore,
      status: overallScore >= 80 ? 'compliant' : 'non-compliant',
      requirements: assessmentResults,
      evidence,
      nextAssessment: this.calculateNextAssessmentDate(framework),
    };

    this.complianceState.set(frameworkId, complianceState);

    this.emit('compliance:assessment-completed', {
      frameworkId,
      score: overallScore,
    });

    return {
      framework: framework.id,
      timestamp: new Date(),
      overallScore,
      status: complianceState.status,
      results: assessmentResults,
      evidence,
      recommendations:
        await this.generateComplianceRecommendations(assessmentResults),
    };
  }

  /**
   * Detect and prevent data leakage
   */
  async detectDataLeakage(): Promise<DataLeakageReport> {
    const scanners = [
      this.scanForSensitiveData(),
      this.scanForCredentials(),
      this.scanForPII(),
      this.scanForAPIKeys(),
      this.scanForCertificates(),
    ];

    const results = await Promise.all(scanners);
    const findings = results.flat();

    // Classify findings by severity
    const criticalFindings = findings.filter((f) => f.severity === 'critical');
    const highFindings = findings.filter((f) => f.severity === 'high');

    // Auto-remediate if configured
    if (
      this.config.policies.find((p) => p.category === 'data')?.enforcement ===
      'strict'
    ) {
      await this.autoRemediateSensitiveData(criticalFindings);
    }

    const report: DataLeakageReport = {
      timestamp: new Date(),
      totalFindings: findings.length,
      criticalFindings: criticalFindings.length,
      highFindings: highFindings.length,
      findings,
      recommendations: this.generateDataProtectionRecommendations(findings),
    };

    if (criticalFindings.length > 0) {
      await this.triggerSecurityAlert('data-leakage', {
        severity: 'critical',
        findings: criticalFindings.length,
        description: 'Critical data leakage detected',
      });
    }

    this.emit('data-leakage:detected', report);
    return report;
  }

  /**
   * Monitor access patterns and detect anomalies
   */
  async monitorAccessPatterns(): Promise<AccessAnalysisReport> {
    const accessLogs = await this.getAccessLogs();
    const patterns = await this.analyzeAccessPatterns(accessLogs);
    const anomalies = await this.detectAccessAnomalies(patterns);

    const report: AccessAnalysisReport = {
      timestamp: new Date(),
      totalRequests: accessLogs.length,
      uniqueUsers: new Set(accessLogs.map((log) => log.userId)).size,
      anomalies,
      topPages: this.getTopAccessedPages(accessLogs),
      suspiciousActivity: anomalies.filter((a) => a.riskLevel === 'high'),
      recommendations: this.generateAccessRecommendations(anomalies),
    };

    // Alert on high-risk anomalies
    const highRiskAnomalies = anomalies.filter((a) => a.riskLevel === 'high');
    if (highRiskAnomalies.length > 0) {
      await this.triggerSecurityAlert('access-anomaly', {
        severity: 'high',
        anomalies: highRiskAnomalies.length,
        description: 'Suspicious access patterns detected',
      });
    }

    this.emit('access:analysis-completed', report);
    return report;
  }

  /**
   * Generate comprehensive security dashboard
   */
  async generateSecurityDashboard(): Promise<SecurityDashboard> {
    const dashboard: SecurityDashboard = {
      timestamp: new Date(),
      overview: await this.getSecurityOverview(),
      vulnerabilities: await this.getVulnerabilityMetrics(),
      compliance: await this.getComplianceMetrics(),
      threats: await this.getThreatIntelligence(),
      incidents: await this.getSecurityIncidents(),
      trends: await this.getSecurityTrends(),
      recommendations: await this.getSecurityRecommendations(),
    };

    this.emit('dashboard:generated', dashboard);
    return dashboard;
  }

  /**
   * Automated vulnerability remediation
   */
  async autoRemediateVulnerabilities(
    scanId: string,
  ): Promise<RemediationResult> {
    const scanResults = this.scanResults.get(scanId);
    if (!scanResults) {
      throw new Error(`Scan results for ${scanId} not found`);
    }

    const remediationActions: RemediationAction[] = [];

    for (const result of scanResults) {
      for (const finding of result.findings) {
        if (finding.autoRemediable && finding.severity === 'critical') {
          const action = await this.createRemediationAction(finding);
          remediationActions.push(action);
        }
      }
    }

    // Execute remediation actions
    const results: ActionResult[] = [];
    for (const action of remediationActions) {
      try {
        const result = await this.executeRemediationAction(action);
        results.push(result);
      } catch (error) {
        results.push({
          actionId: action.id,
          success: false,
          error: error.message,
        });
      }
    }

    const remediationResult: RemediationResult = {
      scanId,
      timestamp: new Date(),
      totalActions: remediationActions.length,
      successfulActions: results.filter((r) => r.success).length,
      failedActions: results.filter((r) => !r.success).length,
      results,
    };

    this.emit('remediation:completed', remediationResult);
    return remediationResult;
  }

  /**
   * Generate compliance evidence package
   */
  async generateComplianceEvidence(
    frameworkId: string,
  ): Promise<ComplianceEvidencePackage> {
    const complianceState = this.complianceState.get(frameworkId);
    if (!complianceState) {
      throw new Error(`Compliance state for ${frameworkId} not found`);
    }

    const evidencePackage: ComplianceEvidencePackage = {
      frameworkId,
      generatedAt: new Date(),
      assessmentDate: complianceState.assessmentDate,
      overallScore: complianceState.overallScore,
      status: complianceState.status,
      controls: [],
      artifacts: [],
      attestations: [],
    };

    // Collect control evidence
    for (const requirement of complianceState.requirements) {
      const controlEvidence = await this.collectControlEvidence(requirement);
      evidencePackage.controls.push(controlEvidence);
    }

    // Collect artifacts
    evidencePackage.artifacts =
      await this.collectComplianceArtifacts(frameworkId);

    // Generate attestations
    evidencePackage.attestations = await this.generateAttestations(frameworkId);

    // Create evidence archive
    const archivePath = await this.createEvidenceArchive(evidencePackage);
    evidencePackage.archivePath = archivePath;

    this.emit('evidence:generated', { frameworkId, archivePath });
    return evidencePackage;
  }

  /**
   * Real-time threat monitoring
   */
  async startThreatMonitoring(): Promise<void> {
    // Monitor for known threat indicators
    this.monitorThreatIndicators();

    // Monitor for suspicious patterns
    this.monitorSuspiciousPatterns();

    // Monitor for policy violations
    this.monitorPolicyViolations();

    // Setup automated response
    this.setupAutomatedThreatResponse();

    this.emit('threat-monitoring:started');
  }

  /**
   * Security incident response
   */
  async handleSecurityIncident(
    incident: SecurityIncident,
  ): Promise<IncidentResponse> {
    const incidentId = this.generateIncidentId();
    const startTime = Date.now();

    this.emit('incident:started', {
      incidentId,
      type: incident.type,
      severity: incident.severity,
    });

    // Classify incident
    const classification = await this.classifyIncident(incident);

    // Execute response playbook
    const playbook = await this.getIncidentPlaybook(classification);
    const responseActions = await this.executePlaybook(playbook, incident);

    // Collect evidence
    const evidence = await this.collectIncidentEvidence(incident);

    // Generate timeline
    const timeline = await this.generateIncidentTimeline(
      incident,
      responseActions,
    );

    const response: IncidentResponse = {
      incidentId,
      timestamp: new Date(),
      duration: Date.now() - startTime,
      classification,
      playbook: playbook.id,
      actions: responseActions,
      evidence,
      timeline,
      status: 'resolved',
    };

    this.emit('incident:resolved', { incidentId, duration: response.duration });
    return response;
  }

  // Private utility methods
  private async aggregateScanResults(
    results: ScanResult[],
  ): Promise<AggregatedScanResult> {
    const allFindings = results.flatMap((r) => r.findings);

    return {
      findings: allFindings,
      summary: {
        total: allFindings.length,
        critical: allFindings.filter((f) => f.severity === 'critical').length,
        high: allFindings.filter((f) => f.severity === 'high').length,
        medium: allFindings.filter((f) => f.severity === 'medium').length,
        low: allFindings.filter((f) => f.severity === 'low').length,
      },
      categories: this.categorizeFindings(allFindings),
      recommendations: this.generateRecommendations(allFindings),
    };
  }

  private async checkSecurityThresholds(
    result: AggregatedScanResult,
  ): Promise<void> {
    for (const threshold of this.config.scanning.thresholds) {
      const count =
        result.summary[threshold.severity as keyof typeof result.summary];
      if (count > threshold.maxCount) {
        await this.triggerSecurityAlert('threshold-exceeded', {
          severity: threshold.severity,
          count,
          threshold: threshold.maxCount,
          description: `Security threshold exceeded: ${count} ${threshold.severity} findings`,
        });
      }
    }
  }

  private async assessComplianceRequirement(
    requirement: ComplianceRequirement,
  ): Promise<ControlAssessmentResult> {
    // Implement compliance requirement assessment logic
    const evidence = await this.collectRequirementEvidence(requirement);
    const score = this.calculateRequirementScore(requirement, evidence);

    return {
      requirementId: requirement.id,
      title: requirement.title,
      score,
      status: score >= 80 ? 'compliant' : 'non-compliant',
      evidence,
      gaps: await this.identifyComplianceGaps(requirement, evidence),
      recommendations: await this.generateRequirementRecommendations(
        requirement,
        score,
      ),
    };
  }

  private calculateComplianceScore(results: ControlAssessmentResult[]): number {
    if (results.length === 0) return 0;
    return results.reduce((sum, r) => sum + r.score, 0) / results.length;
  }

  private async triggerSecurityAlert(
    type: string,
    details: any,
  ): Promise<void> {
    const alert: SecurityAlert = {
      id: this.generateAlertId(),
      type,
      severity: details.severity,
      timestamp: new Date(),
      details,
      status: 'active',
    };

    const alerts = this.securityAlerts.get(type) || [];
    alerts.push(alert);
    this.securityAlerts.set(type, alerts);

    this.emit('security:alert', alert);

    // Send notifications based on severity
    if (details.severity === 'critical') {
      await this.sendCriticalAlert(alert);
    }
  }

  private generateScanId(): string {
    return `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateIncidentId(): string {
    return `incident-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Placeholder methods for scanner implementations
  private async scheduleScan(scanner: SecurityScanner): Promise<void> {
    // Implement scan scheduling
  }

  private async scanForSensitiveData(): Promise<DataLeakageFinding[]> {
    // Implement sensitive data scanning
    return [];
  }

  private async scanForCredentials(): Promise<DataLeakageFinding[]> {
    // Implement credential scanning
    return [];
  }

  private async scanForPII(): Promise<DataLeakageFinding[]> {
    // Implement PII scanning
    return [];
  }

  private async scanForAPIKeys(): Promise<DataLeakageFinding[]> {
    // Implement API key scanning
    return [];
  }

  private async scanForCertificates(): Promise<DataLeakageFinding[]> {
    // Implement certificate scanning
    return [];
  }
}

// Abstract security scanner base class
abstract class SecurityScannerInstance {
  constructor(protected config: SecurityScanner) {}

  abstract initialize(): Promise<void>;
  abstract updateRules(): Promise<void>;
  abstract scan(target?: string): Promise<ScanResult>;
}

// Specific scanner implementations
class SASTScanner extends SecurityScannerInstance {
  async initialize(): Promise<void> {
    // Initialize SAST scanner
  }

  async updateRules(): Promise<void> {
    // Update SAST rules
  }

  async scan(target?: string): Promise<ScanResult> {
    return {
      scannerId: this.config.id,
      scanType: 'sast',
      timestamp: new Date(),
      target: target || 'codebase',
      findings: [],
      duration: 0,
      status: 'completed',
    };
  }
}

class DASTScanner extends SecurityScannerInstance {
  async initialize(): Promise<void> {
    // Initialize DAST scanner
  }

  async updateRules(): Promise<void> {
    // Update DAST rules
  }

  async scan(target?: string): Promise<ScanResult> {
    return {
      scannerId: this.config.id,
      scanType: 'dast',
      timestamp: new Date(),
      target: target || 'application',
      findings: [],
      duration: 0,
      status: 'completed',
    };
  }
}

class SCAScanner extends SecurityScannerInstance {
  async initialize(): Promise<void> {
    // Initialize SCA scanner
  }

  async updateRules(): Promise<void> {
    // Update SCA rules
  }

  async scan(target?: string): Promise<ScanResult> {
    return {
      scannerId: this.config.id,
      scanType: 'sca',
      timestamp: new Date(),
      target: target || 'dependencies',
      findings: [],
      duration: 0,
      status: 'completed',
    };
  }
}

class SecretsScanner extends SecurityScannerInstance {
  async initialize(): Promise<void> {
    // Initialize secrets scanner
  }

  async updateRules(): Promise<void> {
    // Update secrets detection rules
  }

  async scan(target?: string): Promise<ScanResult> {
    return {
      scannerId: this.config.id,
      scanType: 'secrets',
      timestamp: new Date(),
      target: target || 'repository',
      findings: [],
      duration: 0,
      status: 'completed',
    };
  }
}

class ContainerScanner extends SecurityScannerInstance {
  async initialize(): Promise<void> {
    // Initialize container scanner
  }

  async updateRules(): Promise<void> {
    // Update container security rules
  }

  async scan(target?: string): Promise<ScanResult> {
    return {
      scannerId: this.config.id,
      scanType: 'container',
      timestamp: new Date(),
      target: target || 'containers',
      findings: [],
      duration: 0,
      status: 'completed',
    };
  }
}

class InfrastructureScanner extends SecurityScannerInstance {
  async initialize(): Promise<void> {
    // Initialize infrastructure scanner
  }

  async updateRules(): Promise<void> {
    // Update infrastructure security rules
  }

  async scan(target?: string): Promise<ScanResult> {
    return {
      scannerId: this.config.id,
      scanType: 'infrastructure',
      timestamp: new Date(),
      target: target || 'infrastructure',
      findings: [],
      duration: 0,
      status: 'completed',
    };
  }
}

class ContentSecurityScanner extends SecurityScannerInstance {
  async initialize(): Promise<void> {
    // Initialize content security scanner
  }

  async updateRules(): Promise<void> {
    // Update content security rules
  }

  async scan(target?: string): Promise<ScanResult> {
    return {
      scannerId: this.config.id,
      scanType: 'content',
      timestamp: new Date(),
      target: target || 'content',
      findings: [],
      duration: 0,
      status: 'completed',
    };
  }
}

class CustomScanner extends SecurityScannerInstance {
  async initialize(): Promise<void> {
    // Initialize custom scanner
  }

  async updateRules(): Promise<void> {
    // Update custom rules
  }

  async scan(target?: string): Promise<ScanResult> {
    return {
      scannerId: this.config.id,
      scanType: 'custom',
      timestamp: new Date(),
      target: target || 'custom',
      findings: [],
      duration: 0,
      status: 'completed',
    };
  }
}

// Type definitions
export interface ScanResult {
  scannerId: string;
  scanType: string;
  timestamp: Date;
  target: string;
  findings: SecurityFinding[];
  duration: number;
  status: 'completed' | 'failed' | 'partial';
}

export interface SecurityFinding {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  file?: string;
  line?: number;
  cwe?: string;
  cve?: string;
  remediation?: string;
  autoRemediable: boolean;
  confidence: number;
}

export interface AggregatedScanResult {
  findings: SecurityFinding[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  categories: Map<string, number>;
  recommendations: string[];
}

export interface SecurityScanResult {
  scanId: string;
  timestamp: Date;
  duration: number;
  results: AggregatedScanResult;
  report: SecurityReport;
}

export interface ComplianceAssessmentResult {
  framework: string;
  timestamp: Date;
  overallScore: number;
  status: 'compliant' | 'non-compliant' | 'partial';
  results: ControlAssessmentResult[];
  evidence: ComplianceEvidence[];
  recommendations: string[];
}

export interface ControlAssessmentResult {
  requirementId: string;
  title: string;
  score: number;
  status: 'compliant' | 'non-compliant';
  evidence: EvidenceItem[];
  gaps: ComplianceGap[];
  recommendations: string[];
}

export interface DataLeakageReport {
  timestamp: Date;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  findings: DataLeakageFinding[];
  recommendations: string[];
}

export interface DataLeakageFinding {
  id: string;
  type: 'credential' | 'api-key' | 'pii' | 'sensitive-data' | 'certificate';
  severity: 'critical' | 'high' | 'medium' | 'low';
  location: string;
  content: string;
  confidence: number;
}

export interface AccessAnalysisReport {
  timestamp: Date;
  totalRequests: number;
  uniqueUsers: number;
  anomalies: AccessAnomaly[];
  topPages: PageAccessMetric[];
  suspiciousActivity: AccessAnomaly[];
  recommendations: string[];
}

export interface AccessAnomaly {
  type: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  userId?: string;
  details: any;
}

export interface SecurityDashboard {
  timestamp: Date;
  overview: SecurityOverview;
  vulnerabilities: VulnerabilityMetrics;
  compliance: ComplianceMetrics;
  threats: ThreatIntelligence;
  incidents: SecurityIncidents;
  trends: SecurityTrends;
  recommendations: string[];
}

export interface SecurityOverview {
  securityScore: number;
  totalFindings: number;
  criticalFindings: number;
  complianceStatus: string;
  lastScanDate: Date;
  nextAssessmentDate: Date;
}

export interface RemediationResult {
  scanId: string;
  timestamp: Date;
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  results: ActionResult[];
}

export interface RemediationAction {
  id: string;
  type: string;
  description: string;
  finding: SecurityFinding;
  steps: string[];
  risks: string[];
}

export interface ActionResult {
  actionId: string;
  success: boolean;
  error?: string;
  details?: any;
}

export interface ComplianceEvidencePackage {
  frameworkId: string;
  generatedAt: Date;
  assessmentDate: Date;
  overallScore: number;
  status: string;
  controls: ControlEvidence[];
  artifacts: ComplianceArtifact[];
  attestations: Attestation[];
  archivePath?: string;
}

export interface SecurityIncident {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source: string;
  timestamp: Date;
  metadata: any;
}

export interface IncidentResponse {
  incidentId: string;
  timestamp: Date;
  duration: number;
  classification: IncidentClassification;
  playbook: string;
  actions: ResponseAction[];
  evidence: IncidentEvidence[];
  timeline: IncidentTimelineEntry[];
  status: string;
}

// Supporting type definitions
export interface ScanSchedule {
  id: string;
  scanners: string[];
  schedule: string;
  enabled: boolean;
}

export interface SecurityThreshold {
  severity: string;
  maxCount: number;
  action: 'alert' | 'block' | 'remediate';
}

export interface ScanReportingConfig {
  formats: string[];
  recipients: string[];
  schedule: string;
}

export interface ScannerIntegration {
  type: string;
  configuration: any;
}

export interface ScannerConfig {
  apiEndpoint?: string;
  credentials: any;
  rules: string[];
  exclusions: string[];
  timeout: number;
  retries: number;
}

export interface SecurityRule {
  id: string;
  name: string;
  severity: string;
  category: string;
  pattern?: string;
  enabled: boolean;
}

export interface ScanExclusion {
  type: 'file' | 'directory' | 'pattern';
  value: string;
  reason: string;
}

export interface ComplianceRequirement {
  id: string;
  title: string;
  description: string;
  controls: string[];
  testProcedures: string[];
  weight: number;
}

export interface ComplianceControl {
  id: string;
  family: string;
  title: string;
  description: string;
  implementation: string;
  testing: string;
}

export interface ComplianceAssessment {
  id: string;
  framework: string;
  assessor: string;
  schedule: string;
  scope: string;
}

export interface ComplianceReportingConfig {
  formats: string[];
  recipients: string[];
  schedule: string;
  templates: string[];
}

export interface ComplianceAutomation {
  enabled: boolean;
  evidenceCollection: boolean;
  controlTesting: boolean;
  reportGeneration: boolean;
}

export interface AuthenticationConfig {
  methods: string[];
  mfa: boolean;
  sessionTimeout: number;
  lockoutPolicy: any;
}

export interface AuthorizationConfig {
  rbac: boolean;
  abac: boolean;
  policies: string[];
}

export interface EncryptionConfig {
  atRest: boolean;
  inTransit: boolean;
  algorithms: string[];
  keyManagement: any;
}

export interface AuditConfig {
  enabled: boolean;
  events: string[];
  retention: number;
  destinations: string[];
}

export interface SecurityMonitoringConfig {
  realTime: boolean;
  alerting: boolean;
  dashboards: string[];
  integrations: string[];
}

export interface PolicyRule {
  condition: string;
  action: string;
  parameters: any;
}

export interface PolicyScope {
  resources: string[];
  users: string[];
  timeWindows: string[];
}

export interface PolicyException {
  reason: string;
  approver: string;
  expiration: Date;
  conditions: string[];
}

export interface ComplianceState {
  frameworkId: string;
  assessmentDate: Date;
  overallScore: number;
  status: string;
  requirements: ControlAssessmentResult[];
  evidence: ComplianceEvidence[];
  nextAssessment: Date;
}

export interface SecurityAlert {
  id: string;
  type: string;
  severity: string;
  timestamp: Date;
  details: any;
  status: 'active' | 'acknowledged' | 'resolved';
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  resource: string;
  result: string;
  metadata: any;
}

export interface ComplianceEvidence {
  type: string;
  description: string;
  location: string;
  timestamp: Date;
}

export interface EvidenceItem {
  id: string;
  type: string;
  description: string;
  source: string;
  timestamp: Date;
  metadata: any;
}

export interface ComplianceGap {
  description: string;
  impact: string;
  recommendation: string;
  priority: string;
}

export interface PageAccessMetric {
  page: string;
  requests: number;
  uniqueUsers: number;
}

export interface VulnerabilityMetrics {
  total: number;
  byCategory: Map<string, number>;
  bySeverity: Map<string, number>;
  trends: TrendPoint[];
}

export interface ComplianceMetrics {
  frameworks: FrameworkMetric[];
  overallScore: number;
  controlsCompliant: number;
  controlsNonCompliant: number;
}

export interface ThreatIntelligence {
  indicators: ThreatIndicator[];
  campaigns: ThreatCampaign[];
  vulnerabilities: KnownVulnerability[];
}

export interface SecurityIncidents {
  total: number;
  open: number;
  resolved: number;
  byCategory: Map<string, number>;
  recent: RecentIncident[];
}

export interface SecurityTrends {
  vulnerabilityTrend: TrendPoint[];
  incidentTrend: TrendPoint[];
  complianceTrend: TrendPoint[];
}

export interface ControlEvidence {
  controlId: string;
  evidence: EvidenceItem[];
  status: string;
  lastTested: Date;
}

export interface ComplianceArtifact {
  id: string;
  name: string;
  type: string;
  path: string;
  hash: string;
}

export interface Attestation {
  id: string;
  control: string;
  attestor: string;
  statement: string;
  date: Date;
  signature: string;
}

export interface IncidentClassification {
  category: string;
  subcategory: string;
  severity: string;
  priority: string;
}

export interface ResponseAction {
  id: string;
  type: string;
  description: string;
  executor: string;
  timestamp: Date;
  result: string;
}

export interface IncidentEvidence {
  id: string;
  type: string;
  description: string;
  source: string;
  timestamp: Date;
  hash: string;
}

export interface IncidentTimelineEntry {
  timestamp: Date;
  actor: string;
  action: string;
  description: string;
}

export interface SecurityReport {
  id: string;
  format: string;
  content: string;
  attachments: string[];
}

// Additional supporting interfaces
export interface TrendPoint {
  timestamp: Date;
  value: number;
}

export interface FrameworkMetric {
  id: string;
  name: string;
  score: number;
  status: string;
}

export interface ThreatIndicator {
  type: string;
  value: string;
  confidence: number;
  source: string;
}

export interface ThreatCampaign {
  name: string;
  description: string;
  tactics: string[];
  indicators: string[];
}

export interface KnownVulnerability {
  cve: string;
  severity: string;
  description: string;
  affected: string[];
}

export interface RecentIncident {
  id: string;
  type: string;
  severity: string;
  status: string;
  timestamp: Date;
}
