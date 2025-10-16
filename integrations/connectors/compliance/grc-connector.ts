import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface GRCConfig {
  platform: 'servicenow' | 'archer' | 'metricstream' | 'logicgate' | 'workiva';
  baseUrl: string;
  credentials: {
    username?: string;
    password?: string;
    token?: string;
    clientId?: string;
    clientSecret?: string;
  };
  validateSSL: boolean;
  timeout: number;
  retryAttempts: number;
  syncInterval: number;
}

export interface ComplianceFramework {
  id: string;
  name: string;
  version: string;
  description: string;
  type: 'regulatory' | 'industry' | 'internal' | 'contractual';
  scope: string[];
  effectiveDate: Date;
  expirationDate?: Date;
  owner: string;
  status: 'active' | 'inactive' | 'draft' | 'retired';
  controls: Control[];
  requirements: Requirement[];
  assessments: Assessment[];
}

export interface Control {
  id: string;
  frameworkId: string;
  name: string;
  description: string;
  controlFamily: string;
  controlType: 'preventive' | 'detective' | 'corrective' | 'directive';
  implementation: 'manual' | 'automated' | 'hybrid';
  frequency:
    | 'continuous'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'quarterly'
    | 'annually'
    | 'ad-hoc';
  owner: string;
  status:
    | 'implemented'
    | 'not-implemented'
    | 'partially-implemented'
    | 'not-applicable';
  effectiveness:
    | 'effective'
    | 'ineffective'
    | 'needs-improvement'
    | 'not-tested';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastTested?: Date;
  nextTest?: Date;
  evidence: Evidence[];
  findings: Finding[];
  remediation?: RemediationPlan;
}

export interface Requirement {
  id: string;
  frameworkId: string;
  section: string;
  title: string;
  description: string;
  mandatory: boolean;
  applicability: string[];
  controls: string[];
  evidence: Evidence[];
  assessmentHistory: Assessment[];
  complianceStatus:
    | 'compliant'
    | 'non-compliant'
    | 'partially-compliant'
    | 'not-assessed';
  lastAssessed?: Date;
  nextAssessment?: Date;
}

export interface Assessment {
  id: string;
  frameworkId: string;
  type:
    | 'self-assessment'
    | 'internal-audit'
    | 'external-audit'
    | 'penetration-test'
    | 'vulnerability-scan';
  name: string;
  description: string;
  scope: string[];
  assessor: string;
  startDate: Date;
  endDate?: Date;
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  methodology: string;
  findings: Finding[];
  overallRating: 'satisfactory' | 'needs-improvement' | 'unsatisfactory';
  recommendations: Recommendation[];
  evidence: Evidence[];
  reportUrl?: string;
}

export interface Finding {
  id: string;
  assessmentId: string;
  controlId?: string;
  requirementId?: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category:
    | 'control-deficiency'
    | 'policy-violation'
    | 'technical-vulnerability'
    | 'process-gap';
  status: 'open' | 'in-progress' | 'resolved' | 'accepted' | 'deferred';
  discoveredDate: Date;
  targetDate?: Date;
  resolvedDate?: Date;
  owner: string;
  evidence: Evidence[];
  remediation?: RemediationPlan;
  riskRating: number;
  businessImpact: string;
  technicalImpact: string;
}

export interface Evidence {
  id: string;
  name: string;
  description: string;
  type:
    | 'document'
    | 'screenshot'
    | 'log'
    | 'configuration'
    | 'policy'
    | 'procedure'
    | 'certificate';
  url?: string;
  hash: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  uploadedDate: Date;
  retentionPeriod: number;
  confidentialityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  tags: string[];
  metadata: Record<string, any>;
}

export interface RemediationPlan {
  id: string;
  findingId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  owner: string;
  approver: string;
  targetDate: Date;
  actualDate?: Date;
  status: 'planned' | 'approved' | 'in-progress' | 'completed' | 'cancelled';
  budget?: number;
  resources: string[];
  milestones: Milestone[];
  riskMitigation: string;
  businessJustification: string;
  dependencies: string[];
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  targetDate: Date;
  actualDate?: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'delayed';
  owner: string;
  deliverables: string[];
}

export interface Recommendation {
  id: string;
  assessmentId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'process' | 'technology' | 'people' | 'governance';
  implementationEffort: 'low' | 'medium' | 'high';
  businessValue: 'low' | 'medium' | 'high';
  timeline: string;
  owner: string;
  status: 'proposed' | 'approved' | 'rejected' | 'implemented';
  acceptedDate?: Date;
  implementedDate?: Date;
}

export interface RiskAssessment {
  id: string;
  name: string;
  description: string;
  scope: string[];
  methodology: string;
  assessor: string;
  date: Date;
  inherentRisk: number;
  residualRisk: number;
  riskTolerance: number;
  riskFactors: RiskFactor[];
  controls: string[];
  mitigations: string[];
  recommendations: string[];
}

export interface RiskFactor {
  id: string;
  name: string;
  description: string;
  likelihood: number;
  impact: number;
  score: number;
  category:
    | 'operational'
    | 'strategic'
    | 'financial'
    | 'compliance'
    | 'reputational';
  mitigations: string[];
}

export interface ComplianceReport {
  id: string;
  name: string;
  type:
    | 'dashboard'
    | 'executive-summary'
    | 'detailed-report'
    | 'certification-letter';
  framework: string;
  period: {
    start: Date;
    end: Date;
  };
  generatedBy: string;
  generatedDate: Date;
  recipients: string[];
  sections: ReportSection[];
  status: 'draft' | 'final' | 'published';
  format: 'pdf' | 'html' | 'excel' | 'json';
  url?: string;
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  data: any;
  charts: ChartData[];
  tables: TableData[];
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'donut' | 'heatmap';
  title: string;
  data: any[];
  options: Record<string, any>;
}

export interface TableData {
  title: string;
  headers: string[];
  rows: any[][];
  summary?: Record<string, any>;
}

export interface GRCMetrics {
  totalFrameworks: number;
  activeFrameworks: number;
  totalControls: number;
  implementedControls: number;
  effectiveControls: number;
  totalFindings: number;
  openFindings: number;
  criticalFindings: number;
  totalAssessments: number;
  completedAssessments: number;
  overallComplianceScore: number;
  averageRiskScore: number;
  trendsOverTime: Record<string, number[]>;
}

export class GRCConnector extends EventEmitter {
  private config: GRCConfig;
  private frameworks = new Map<string, ComplianceFramework>();
  private assessments = new Map<string, Assessment>();
  private findings = new Map<string, Finding>();
  private evidence = new Map<string, Evidence>();
  private reports = new Map<string, ComplianceReport>();
  private metrics: GRCMetrics;
  private syncTimer?: NodeJS.Timeout;

  constructor(config: GRCConfig) {
    super();
    this.config = config;
    this.metrics = {
      totalFrameworks: 0,
      activeFrameworks: 0,
      totalControls: 0,
      implementedControls: 0,
      effectiveControls: 0,
      totalFindings: 0,
      openFindings: 0,
      criticalFindings: 0,
      totalAssessments: 0,
      completedAssessments: 0,
      overallComplianceScore: 0,
      averageRiskScore: 0,
      trendsOverTime: {},
    };
  }

  async connect(): Promise<void> {
    try {
      await this.authenticate();
      await this.syncData();
      this.startPeriodicSync();

      this.emit('connected', {
        platform: this.config.platform,
        timestamp: new Date(),
      });
    } catch (error) {
      this.emit('connection_failed', {
        platform: this.config.platform,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
      throw error;
    }
  }

  private async authenticate(): Promise<void> {
    // Platform-specific authentication logic would go here
    switch (this.config.platform) {
      case 'servicenow':
        await this.authenticateServiceNow();
        break;
      case 'archer':
        await this.authenticateArcher();
        break;
      case 'metricstream':
        await this.authenticateMetricStream();
        break;
      case 'logicgate':
        await this.authenticateLogicGate();
        break;
      case 'workiva':
        await this.authenticateWorkiva();
        break;
      default:
        throw new Error(`Unsupported GRC platform: ${this.config.platform}`);
    }
  }

  private async authenticateServiceNow(): Promise<void> {
    // ServiceNow specific authentication
    const authUrl = `${this.config.baseUrl}/oauth_token.do`;
    // Implementation would depend on ServiceNow OAuth flow
  }

  private async authenticateArcher(): Promise<void> {
    // Archer specific authentication
    const authUrl = `${this.config.baseUrl}/api/core/security/login`;
    // Implementation would depend on Archer API
  }

  private async authenticateMetricStream(): Promise<void> {
    // MetricStream specific authentication
    // Implementation would depend on MetricStream API
  }

  private async authenticateLogicGate(): Promise<void> {
    // LogicGate specific authentication
    // Implementation would depend on LogicGate API
  }

  private async authenticateWorkiva(): Promise<void> {
    // Workiva specific authentication
    // Implementation would depend on Workiva API
  }

  async createFramework(
    framework: Omit<
      ComplianceFramework,
      'controls' | 'requirements' | 'assessments'
    >,
  ): Promise<ComplianceFramework> {
    const newFramework: ComplianceFramework = {
      ...framework,
      controls: [],
      requirements: [],
      assessments: [],
    };

    this.frameworks.set(framework.id, newFramework);
    this.metrics.totalFrameworks++;

    if (framework.status === 'active') {
      this.metrics.activeFrameworks++;
    }

    this.emit('framework_created', {
      frameworkId: framework.id,
      name: framework.name,
      type: framework.type,
      timestamp: new Date(),
    });

    return newFramework;
  }

  async addControl(
    frameworkId: string,
    control: Omit<Control, 'evidence' | 'findings'>,
  ): Promise<Control> {
    const framework = this.frameworks.get(frameworkId);
    if (!framework) {
      throw new Error(`Framework ${frameworkId} not found`);
    }

    const newControl: Control = {
      ...control,
      evidence: [],
      findings: [],
    };

    framework.controls.push(newControl);
    this.metrics.totalControls++;

    if (control.status === 'implemented') {
      this.metrics.implementedControls++;
    }

    if (control.effectiveness === 'effective') {
      this.metrics.effectiveControls++;
    }

    this.emit('control_added', {
      frameworkId,
      controlId: control.id,
      name: control.name,
      type: control.controlType,
      timestamp: new Date(),
    });

    return newControl;
  }

  async createAssessment(
    assessment: Omit<Assessment, 'findings' | 'recommendations' | 'evidence'>,
  ): Promise<Assessment> {
    const newAssessment: Assessment = {
      ...assessment,
      findings: [],
      recommendations: [],
      evidence: [],
    };

    this.assessments.set(assessment.id, newAssessment);
    this.metrics.totalAssessments++;

    if (assessment.status === 'completed') {
      this.metrics.completedAssessments++;
    }

    this.emit('assessment_created', {
      assessmentId: assessment.id,
      name: assessment.name,
      type: assessment.type,
      frameworkId: assessment.frameworkId,
      timestamp: new Date(),
    });

    return newAssessment;
  }

  async addFinding(finding: Omit<Finding, 'evidence'>): Promise<Finding> {
    const newFinding: Finding = {
      ...finding,
      evidence: [],
    };

    this.findings.set(finding.id, newFinding);
    this.metrics.totalFindings++;

    if (finding.status === 'open') {
      this.metrics.openFindings++;
    }

    if (finding.severity === 'critical' || finding.severity === 'high') {
      this.metrics.criticalFindings++;
    }

    // Update assessment
    const assessment = this.assessments.get(finding.assessmentId);
    if (assessment) {
      assessment.findings.push(newFinding);
    }

    this.emit('finding_added', {
      findingId: finding.id,
      assessmentId: finding.assessmentId,
      title: finding.title,
      severity: finding.severity,
      timestamp: new Date(),
    });

    return newFinding;
  }

  async uploadEvidence(
    evidence: Omit<Evidence, 'id' | 'hash' | 'uploadedDate'>,
  ): Promise<Evidence> {
    const newEvidence: Evidence = {
      ...evidence,
      id: crypto.randomUUID(),
      hash: crypto
        .createHash('sha256')
        .update(evidence.name + evidence.uploadedBy)
        .digest('hex'),
      uploadedDate: new Date(),
    };

    this.evidence.set(newEvidence.id, newEvidence);

    this.emit('evidence_uploaded', {
      evidenceId: newEvidence.id,
      name: newEvidence.name,
      type: newEvidence.type,
      uploadedBy: newEvidence.uploadedBy,
      timestamp: newEvidence.uploadedDate,
    });

    return newEvidence;
  }

  async createRemediationPlan(
    plan: Omit<RemediationPlan, 'milestones'>,
  ): Promise<RemediationPlan> {
    const newPlan: RemediationPlan = {
      ...plan,
      milestones: [],
    };

    const finding = this.findings.get(plan.findingId);
    if (finding) {
      finding.remediation = newPlan;
    }

    this.emit('remediation_plan_created', {
      planId: plan.id,
      findingId: plan.findingId,
      title: plan.title,
      priority: plan.priority,
      timestamp: new Date(),
    });

    return newPlan;
  }

  async conductRiskAssessment(
    assessment: RiskAssessment,
  ): Promise<RiskAssessment> {
    // Calculate overall risk score
    const riskScore =
      assessment.riskFactors.reduce((sum, factor) => sum + factor.score, 0) /
      assessment.riskFactors.length;
    assessment.inherentRisk = riskScore;

    // Apply control effectiveness to calculate residual risk
    const controlEffectiveness = 0.7; // This would be calculated based on actual controls
    assessment.residualRisk =
      assessment.inherentRisk * (1 - controlEffectiveness);

    this.emit('risk_assessment_completed', {
      assessmentId: assessment.id,
      inherentRisk: assessment.inherentRisk,
      residualRisk: assessment.residualRisk,
      riskFactorCount: assessment.riskFactors.length,
      timestamp: new Date(),
    });

    return assessment;
  }

  async generateComplianceReport(
    frameworkId: string,
    reportType: ComplianceReport['type'],
    period: { start: Date; end: Date },
    generatedBy: string,
  ): Promise<ComplianceReport> {
    const framework = this.frameworks.get(frameworkId);
    if (!framework) {
      throw new Error(`Framework ${frameworkId} not found`);
    }

    const report: ComplianceReport = {
      id: crypto.randomUUID(),
      name: `${framework.name} ${reportType} - ${period.start.toISOString().split('T')[0]} to ${period.end.toISOString().split('T')[0]}`,
      type: reportType,
      framework: frameworkId,
      period,
      generatedBy,
      generatedDate: new Date(),
      recipients: [],
      sections: [],
      status: 'draft',
      format: 'pdf',
    };

    // Generate report sections based on type
    switch (reportType) {
      case 'dashboard':
        report.sections = await this.generateDashboardSections(
          framework,
          period,
        );
        break;
      case 'executive-summary':
        report.sections = await this.generateExecutiveSummarySections(
          framework,
          period,
        );
        break;
      case 'detailed-report':
        report.sections = await this.generateDetailedReportSections(
          framework,
          period,
        );
        break;
      case 'certification-letter':
        report.sections = await this.generateCertificationSections(
          framework,
          period,
        );
        break;
    }

    this.reports.set(report.id, report);

    this.emit('report_generated', {
      reportId: report.id,
      name: report.name,
      type: report.type,
      frameworkId,
      timestamp: new Date(),
    });

    return report;
  }

  private async generateDashboardSections(
    framework: ComplianceFramework,
    period: { start: Date; end: Date },
  ): Promise<ReportSection[]> {
    return [
      {
        id: 'overview',
        title: 'Compliance Overview',
        content: 'High-level compliance status and key metrics',
        data: this.calculateComplianceMetrics(framework),
        charts: [
          {
            type: 'donut',
            title: 'Control Implementation Status',
            data: this.getControlStatusData(framework),
            options: {},
          },
          {
            type: 'bar',
            title: 'Findings by Severity',
            data: this.getFindingsSeverityData(framework),
            options: {},
          },
        ],
        tables: [],
      },
      {
        id: 'trends',
        title: 'Compliance Trends',
        content: 'Trending analysis over time',
        data: {},
        charts: [
          {
            type: 'line',
            title: 'Compliance Score Trend',
            data: this.getComplianceTrendData(framework, period),
            options: {},
          },
        ],
        tables: [],
      },
    ];
  }

  private async generateExecutiveSummarySections(
    framework: ComplianceFramework,
    period: { start: Date; end: Date },
  ): Promise<ReportSection[]> {
    return [
      {
        id: 'executive-summary',
        title: 'Executive Summary',
        content: this.generateExecutiveSummaryContent(framework),
        data: {},
        charts: [],
        tables: [],
      },
      {
        id: 'key-metrics',
        title: 'Key Compliance Metrics',
        content: 'Summary of critical compliance indicators',
        data: this.calculateComplianceMetrics(framework),
        charts: [],
        tables: [
          {
            title: 'Compliance Scorecard',
            headers: ['Metric', 'Value', 'Target', 'Status'],
            rows: this.generateScorecardRows(framework),
          },
        ],
      },
    ];
  }

  private async generateDetailedReportSections(
    framework: ComplianceFramework,
    period: { start: Date; end: Date },
  ): Promise<ReportSection[]> {
    return [
      {
        id: 'framework-overview',
        title: 'Framework Overview',
        content: framework.description,
        data: framework,
        charts: [],
        tables: [],
      },
      {
        id: 'control-assessment',
        title: 'Control Assessment Results',
        content: 'Detailed assessment of all controls',
        data: {},
        charts: [],
        tables: [
          {
            title: 'Control Assessment Summary',
            headers: [
              'Control ID',
              'Name',
              'Status',
              'Effectiveness',
              'Last Tested',
              'Findings',
            ],
            rows: this.generateControlAssessmentRows(framework),
          },
        ],
      },
      {
        id: 'findings',
        title: 'Findings and Recommendations',
        content: 'Detailed findings from assessments',
        data: {},
        charts: [],
        tables: [
          {
            title: 'Open Findings',
            headers: [
              'Finding ID',
              'Title',
              'Severity',
              'Status',
              'Owner',
              'Target Date',
            ],
            rows: this.generateFindingsRows(framework),
          },
        ],
      },
    ];
  }

  private async generateCertificationSections(
    framework: ComplianceFramework,
    period: { start: Date; end: Date },
  ): Promise<ReportSection[]> {
    return [
      {
        id: 'certification-statement',
        title: 'Certification Statement',
        content: this.generateCertificationStatement(framework, period),
        data: {},
        charts: [],
        tables: [],
      },
    ];
  }

  private calculateComplianceMetrics(framework: ComplianceFramework): any {
    const implementedControls = framework.controls.filter(
      (c) => c.status === 'implemented',
    ).length;
    const effectiveControls = framework.controls.filter(
      (c) => c.effectiveness === 'effective',
    ).length;
    const totalControls = framework.controls.length;

    return {
      implementationRate:
        totalControls > 0 ? (implementedControls / totalControls) * 100 : 0,
      effectivenessRate:
        totalControls > 0 ? (effectiveControls / totalControls) * 100 : 0,
      overallScore:
        totalControls > 0
          ? ((implementedControls * 0.6 + effectiveControls * 0.4) /
              totalControls) *
            100
          : 0,
    };
  }

  private getControlStatusData(framework: ComplianceFramework): any[] {
    const statusCounts = framework.controls.reduce(
      (acc, control) => {
        acc[control.status] = (acc[control.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(statusCounts).map(([status, count]) => ({
      label: status,
      value: count,
    }));
  }

  private getFindingsSeverityData(framework: ComplianceFramework): any[] {
    const allFindings = framework.assessments.flatMap((a) => a.findings);
    const severityCounts = allFindings.reduce(
      (acc, finding) => {
        acc[finding.severity] = (acc[finding.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(severityCounts).map(([severity, count]) => ({
      label: severity,
      value: count,
    }));
  }

  private getComplianceTrendData(
    framework: ComplianceFramework,
    period: { start: Date; end: Date },
  ): any[] {
    // This would typically pull historical data
    // For now, return mock trend data
    return [
      { date: '2024-01', score: 75 },
      { date: '2024-02', score: 78 },
      { date: '2024-03', score: 82 },
      { date: '2024-04', score: 85 },
    ];
  }

  private generateExecutiveSummaryContent(
    framework: ComplianceFramework,
  ): string {
    const metrics = this.calculateComplianceMetrics(framework);
    return `This report provides an executive overview of compliance with ${framework.name}.
            Current compliance score is ${metrics.overallScore.toFixed(1)}%, with ${metrics.implementationRate.toFixed(1)}%
            of controls implemented and ${metrics.effectivenessRate.toFixed(1)}% operating effectively.`;
  }

  private generateScorecardRows(framework: ComplianceFramework): any[][] {
    const metrics = this.calculateComplianceMetrics(framework);
    return [
      [
        'Control Implementation',
        `${metrics.implementationRate.toFixed(1)}%`,
        '100%',
        metrics.implementationRate >= 90 ? 'Green' : 'Yellow',
      ],
      [
        'Control Effectiveness',
        `${metrics.effectivenessRate.toFixed(1)}%`,
        '95%',
        metrics.effectivenessRate >= 90 ? 'Green' : 'Red',
      ],
      [
        'Overall Compliance',
        `${metrics.overallScore.toFixed(1)}%`,
        '90%',
        metrics.overallScore >= 85 ? 'Green' : 'Yellow',
      ],
    ];
  }

  private generateControlAssessmentRows(
    framework: ComplianceFramework,
  ): any[][] {
    return framework.controls.map((control) => [
      control.id,
      control.name,
      control.status,
      control.effectiveness,
      control.lastTested?.toISOString().split('T')[0] || 'Not tested',
      control.findings.length.toString(),
    ]);
  }

  private generateFindingsRows(framework: ComplianceFramework): any[][] {
    const allFindings = framework.assessments.flatMap((a) => a.findings);
    const openFindings = allFindings.filter((f) => f.status === 'open');

    return openFindings.map((finding) => [
      finding.id,
      finding.title,
      finding.severity,
      finding.status,
      finding.owner,
      finding.targetDate?.toISOString().split('T')[0] || 'Not set',
    ]);
  }

  private generateCertificationStatement(
    framework: ComplianceFramework,
    period: { start: Date; end: Date },
  ): string {
    const metrics = this.calculateComplianceMetrics(framework);
    return `I hereby certify that for the period ${period.start.toDateString()} to ${period.end.toDateString()},
            the organization has maintained compliance with ${framework.name} with an overall compliance score of
            ${metrics.overallScore.toFixed(1)}%. This certification is based on comprehensive assessments and
            continuous monitoring of all applicable controls and requirements.`;
  }

  private async syncData(): Promise<void> {
    // Platform-specific data synchronization logic
    this.emit('sync_started', { timestamp: new Date() });

    try {
      // Sync frameworks, controls, assessments, findings, etc.
      await this.syncFrameworks();
      await this.syncAssessments();
      await this.syncFindings();

      this.updateMetrics();

      this.emit('sync_completed', {
        timestamp: new Date(),
        metrics: this.getMetrics(),
      });
    } catch (error) {
      this.emit('sync_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
    }
  }

  private async syncFrameworks(): Promise<void> {
    // Platform-specific framework sync
  }

  private async syncAssessments(): Promise<void> {
    // Platform-specific assessment sync
  }

  private async syncFindings(): Promise<void> {
    // Platform-specific findings sync
  }

  private updateMetrics(): void {
    this.metrics.totalFrameworks = this.frameworks.size;
    this.metrics.activeFrameworks = Array.from(this.frameworks.values()).filter(
      (f) => f.status === 'active',
    ).length;

    const allControls = Array.from(this.frameworks.values()).flatMap(
      (f) => f.controls,
    );
    this.metrics.totalControls = allControls.length;
    this.metrics.implementedControls = allControls.filter(
      (c) => c.status === 'implemented',
    ).length;
    this.metrics.effectiveControls = allControls.filter(
      (c) => c.effectiveness === 'effective',
    ).length;

    const allFindings = Array.from(this.findings.values());
    this.metrics.totalFindings = allFindings.length;
    this.metrics.openFindings = allFindings.filter(
      (f) => f.status === 'open',
    ).length;
    this.metrics.criticalFindings = allFindings.filter(
      (f) => f.severity === 'critical' || f.severity === 'high',
    ).length;

    this.metrics.totalAssessments = this.assessments.size;
    this.metrics.completedAssessments = Array.from(
      this.assessments.values(),
    ).filter((a) => a.status === 'completed').length;

    this.metrics.overallComplianceScore =
      this.metrics.totalControls > 0
        ? ((this.metrics.implementedControls * 0.6 +
            this.metrics.effectiveControls * 0.4) /
            this.metrics.totalControls) *
          100
        : 0;
  }

  private startPeriodicSync(): void {
    this.syncTimer = setInterval(async () => {
      await this.syncData();
    }, this.config.syncInterval * 1000);
  }

  getFramework(frameworkId: string): ComplianceFramework | undefined {
    return this.frameworks.get(frameworkId);
  }

  listFrameworks(): ComplianceFramework[] {
    return Array.from(this.frameworks.values());
  }

  getAssessment(assessmentId: string): Assessment | undefined {
    return this.assessments.get(assessmentId);
  }

  listAssessments(): Assessment[] {
    return Array.from(this.assessments.values());
  }

  getFinding(findingId: string): Finding | undefined {
    return this.findings.get(findingId);
  }

  listFindings(): Finding[] {
    return Array.from(this.findings.values());
  }

  getReport(reportId: string): ComplianceReport | undefined {
    return this.reports.get(reportId);
  }

  listReports(): ComplianceReport[] {
    return Array.from(this.reports.values());
  }

  getMetrics(): GRCMetrics {
    return { ...this.metrics };
  }

  async disconnect(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.emit('disconnected', {
      platform: this.config.platform,
      timestamp: new Date(),
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      // Platform-specific connection test
      await this.authenticate();

      this.emit('connection_tested', {
        success: true,
        platform: this.config.platform,
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      this.emit('connection_tested', {
        success: false,
        platform: this.config.platform,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });

      return false;
    }
  }
}
