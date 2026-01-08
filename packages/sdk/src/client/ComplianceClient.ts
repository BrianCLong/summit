/**
 * Compliance Client
 *
 * Client for compliance management operations including
 * assessments, controls, evidence, and reporting.
 *
 * @module @summit/sdk
 */

import type { SummitClient, PaginatedResponse } from "./SummitClient.js";

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Compliance framework
 */
export type ComplianceFramework =
  | "SOC2"
  | "ISO27001"
  | "GDPR"
  | "HIPAA"
  | "PCI-DSS"
  | "NIST"
  | "FedRAMP"
  | "NIST-CSF"
  | "CMMC";

/**
 * Control status
 */
export type ControlStatus =
  | "not_started"
  | "in_progress"
  | "implemented"
  | "not_applicable"
  | "failed";

/**
 * Assessment status
 */
export type AssessmentStatus = "pending" | "in_progress" | "completed" | "failed";

/**
 * Compliance control
 */
export interface ComplianceControl {
  id: string;
  controlId: string;
  framework: ComplianceFramework;
  title: string;
  description: string;
  category: string;
  status: ControlStatus;
  implementationNotes: string;
  evidenceCount: number;
  lastAssessedAt?: string;
  assignedTo?: string;
  dueDate?: string;
  tags: string[];
}

/**
 * Control evidence
 */
export interface Evidence {
  id: string;
  controlId: string;
  type: "document" | "screenshot" | "log" | "configuration" | "attestation";
  title: string;
  description: string;
  fileUrl?: string;
  metadata: Record<string, unknown>;
  collectedAt: string;
  collectedBy: string;
  expiresAt?: string;
  verificationStatus: "pending" | "verified" | "rejected";
}

/**
 * Compliance assessment
 */
export interface Assessment {
  id: string;
  framework: ComplianceFramework;
  name: string;
  status: AssessmentStatus;
  score: number;
  totalControls: number;
  implementedControls: number;
  failedControls: number;
  notApplicableControls: number;
  startedAt: string;
  completedAt?: string;
  assessorId?: string;
  findings: AssessmentFinding[];
  nextAssessmentDue?: string;
}

/**
 * Assessment finding
 */
export interface AssessmentFinding {
  id: string;
  controlId: string;
  severity: "critical" | "high" | "medium" | "low" | "informational";
  title: string;
  description: string;
  recommendation: string;
  status: "open" | "in_remediation" | "resolved" | "accepted";
  dueDate?: string;
  resolvedAt?: string;
}

/**
 * Compliance report
 */
export interface ComplianceReport {
  id: string;
  framework: ComplianceFramework;
  reportType: "summary" | "detailed" | "executive" | "audit";
  generatedAt: string;
  generatedBy: string;
  period: {
    start: string;
    end: string;
  };
  overallScore: number;
  sections: ReportSection[];
  downloadUrl: string;
  format: "pdf" | "xlsx" | "json";
}

/**
 * Report section
 */
export interface ReportSection {
  title: string;
  controlsInScope: number;
  controlsCompliant: number;
  score: number;
  findings: number;
}

/**
 * Gap analysis result
 */
export interface GapAnalysis {
  id: string;
  framework: ComplianceFramework;
  analyzedAt: string;
  overallGap: number;
  categoryGaps: Array<{
    category: string;
    currentScore: number;
    targetScore: number;
    gap: number;
    recommendations: string[];
  }>;
  prioritizedActions: Array<{
    controlId: string;
    action: string;
    effort: "low" | "medium" | "high";
    impact: "low" | "medium" | "high";
    priority: number;
  }>;
}

/**
 * Remediation plan
 */
export interface RemediationPlan {
  id: string;
  findingId: string;
  controlId: string;
  title: string;
  description: string;
  steps: RemediationStep[];
  status: "draft" | "approved" | "in_progress" | "completed";
  assignedTo: string;
  dueDate: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * Remediation step
 */
export interface RemediationStep {
  id: string;
  order: number;
  description: string;
  assignedTo?: string;
  dueDate?: string;
  status: "pending" | "in_progress" | "completed";
  completedAt?: string;
}

/**
 * List controls options
 */
export interface ListControlsOptions {
  page?: number;
  pageSize?: number;
  framework?: ComplianceFramework;
  status?: ControlStatus;
  category?: string;
  search?: string;
  assignedTo?: string;
}

/**
 * Create evidence request
 */
export interface CreateEvidenceRequest {
  controlId: string;
  type: Evidence["type"];
  title: string;
  description?: string;
  fileUrl?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: string;
}

/**
 * Start assessment request
 */
export interface StartAssessmentRequest {
  framework: ComplianceFramework;
  name: string;
  controlIds?: string[];
  assessorId?: string;
}

/**
 * Generate report request
 */
export interface GenerateReportRequest {
  framework: ComplianceFramework;
  reportType: ComplianceReport["reportType"];
  period: {
    start: string;
    end: string;
  };
  format: ComplianceReport["format"];
  includeEvidence?: boolean;
  includeRemediations?: boolean;
}

// ============================================================================
// Compliance Client Implementation
// ============================================================================

export class ComplianceClient {
  private client: SummitClient;
  private basePath = "/api/v1/compliance";

  constructor(client: SummitClient) {
    this.client = client;
  }

  // --------------------------------------------------------------------------
  // Controls
  // --------------------------------------------------------------------------

  /**
   * List compliance controls
   */
  public async listControls(
    options: ListControlsOptions = {}
  ): Promise<PaginatedResponse<ComplianceControl>> {
    const response = await this.client.get<PaginatedResponse<ComplianceControl>>(
      `${this.basePath}/controls`,
      options
    );
    return response.data;
  }

  /**
   * Get a single control
   */
  public async getControl(id: string): Promise<ComplianceControl> {
    const response = await this.client.get<ComplianceControl>(`${this.basePath}/controls/${id}`);
    return response.data;
  }

  /**
   * Update control status
   */
  public async updateControlStatus(
    id: string,
    status: ControlStatus,
    notes?: string
  ): Promise<ComplianceControl> {
    const response = await this.client.patch<ComplianceControl>(`${this.basePath}/controls/${id}`, {
      status,
      implementationNotes: notes,
    });
    return response.data;
  }

  /**
   * Assign control to user
   */
  public async assignControl(
    id: string,
    userId: string,
    dueDate?: string
  ): Promise<ComplianceControl> {
    const response = await this.client.post<ComplianceControl>(
      `${this.basePath}/controls/${id}/assign`,
      {
        userId,
        dueDate,
      }
    );
    return response.data;
  }

  /**
   * Get controls by framework
   */
  public async getControlsByFramework(
    framework: ComplianceFramework
  ): Promise<ComplianceControl[]> {
    const response = await this.client.get<ComplianceControl[]>(
      `${this.basePath}/frameworks/${framework}/controls`
    );
    return response.data;
  }

  // --------------------------------------------------------------------------
  // Evidence
  // --------------------------------------------------------------------------

  /**
   * List evidence for a control
   */
  public async listEvidence(controlId: string): Promise<Evidence[]> {
    const response = await this.client.get<Evidence[]>(
      `${this.basePath}/controls/${controlId}/evidence`
    );
    return response.data;
  }

  /**
   * Add evidence to a control
   */
  public async addEvidence(evidence: CreateEvidenceRequest): Promise<Evidence> {
    const response = await this.client.post<Evidence>(`${this.basePath}/evidence`, evidence);
    return response.data;
  }

  /**
   * Get evidence by ID
   */
  public async getEvidence(id: string): Promise<Evidence> {
    const response = await this.client.get<Evidence>(`${this.basePath}/evidence/${id}`);
    return response.data;
  }

  /**
   * Delete evidence
   */
  public async deleteEvidence(id: string): Promise<void> {
    await this.client.delete(`${this.basePath}/evidence/${id}`);
  }

  /**
   * Verify evidence
   */
  public async verifyEvidence(
    id: string,
    status: "verified" | "rejected",
    notes?: string
  ): Promise<Evidence> {
    const response = await this.client.post<Evidence>(`${this.basePath}/evidence/${id}/verify`, {
      status,
      notes,
    });
    return response.data;
  }

  /**
   * Get expiring evidence
   */
  public async getExpiringEvidence(daysAhead: number = 30): Promise<Evidence[]> {
    const response = await this.client.get<Evidence[]>(`${this.basePath}/evidence/expiring`, {
      daysAhead,
    });
    return response.data;
  }

  // --------------------------------------------------------------------------
  // Assessments
  // --------------------------------------------------------------------------

  /**
   * List assessments
   */
  public async listAssessments(
    options: { framework?: ComplianceFramework; status?: AssessmentStatus } = {}
  ): Promise<Assessment[]> {
    const response = await this.client.get<Assessment[]>(`${this.basePath}/assessments`, options);
    return response.data;
  }

  /**
   * Get assessment by ID
   */
  public async getAssessment(id: string): Promise<Assessment> {
    const response = await this.client.get<Assessment>(`${this.basePath}/assessments/${id}`);
    return response.data;
  }

  /**
   * Start a new assessment
   */
  public async startAssessment(request: StartAssessmentRequest): Promise<Assessment> {
    const response = await this.client.post<Assessment>(`${this.basePath}/assessments`, request);
    return response.data;
  }

  /**
   * Complete an assessment
   */
  public async completeAssessment(id: string): Promise<Assessment> {
    const response = await this.client.post<Assessment>(
      `${this.basePath}/assessments/${id}/complete`
    );
    return response.data;
  }

  /**
   * Add finding to assessment
   */
  public async addFinding(
    assessmentId: string,
    finding: Omit<AssessmentFinding, "id" | "status">
  ): Promise<AssessmentFinding> {
    const response = await this.client.post<AssessmentFinding>(
      `${this.basePath}/assessments/${assessmentId}/findings`,
      finding
    );
    return response.data;
  }

  /**
   * Update finding status
   */
  public async updateFindingStatus(
    assessmentId: string,
    findingId: string,
    status: AssessmentFinding["status"]
  ): Promise<AssessmentFinding> {
    const response = await this.client.patch<AssessmentFinding>(
      `${this.basePath}/assessments/${assessmentId}/findings/${findingId}`,
      { status }
    );
    return response.data;
  }

  // --------------------------------------------------------------------------
  // Gap Analysis
  // --------------------------------------------------------------------------

  /**
   * Perform gap analysis
   */
  public async performGapAnalysis(framework: ComplianceFramework): Promise<GapAnalysis> {
    const response = await this.client.post<GapAnalysis>(`${this.basePath}/gap-analysis`, {
      framework,
    });
    return response.data;
  }

  /**
   * Get latest gap analysis
   */
  public async getGapAnalysis(framework: ComplianceFramework): Promise<GapAnalysis | null> {
    try {
      const response = await this.client.get<GapAnalysis>(
        `${this.basePath}/frameworks/${framework}/gap-analysis`
      );
      return response.data;
    } catch (error) {
      if ((error as Error & { status?: number }).status === 404) {
        return null;
      }
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // Remediation
  // --------------------------------------------------------------------------

  /**
   * Create remediation plan
   */
  public async createRemediationPlan(
    findingId: string,
    plan: Omit<RemediationPlan, "id" | "findingId" | "createdAt" | "completedAt" | "status">
  ): Promise<RemediationPlan> {
    const response = await this.client.post<RemediationPlan>(`${this.basePath}/remediations`, {
      ...plan,
      findingId,
    });
    return response.data;
  }

  /**
   * Get remediation plan
   */
  public async getRemediationPlan(id: string): Promise<RemediationPlan> {
    const response = await this.client.get<RemediationPlan>(`${this.basePath}/remediations/${id}`);
    return response.data;
  }

  /**
   * Update remediation plan
   */
  public async updateRemediationPlan(
    id: string,
    updates: Partial<RemediationPlan>
  ): Promise<RemediationPlan> {
    const response = await this.client.patch<RemediationPlan>(
      `${this.basePath}/remediations/${id}`,
      updates
    );
    return response.data;
  }

  /**
   * Complete remediation step
   */
  public async completeRemediationStep(planId: string, stepId: string): Promise<RemediationStep> {
    const response = await this.client.post<RemediationStep>(
      `${this.basePath}/remediations/${planId}/steps/${stepId}/complete`
    );
    return response.data;
  }

  /**
   * List remediation plans for a finding
   */
  public async listRemediationPlans(findingId: string): Promise<RemediationPlan[]> {
    const response = await this.client.get<RemediationPlan[]>(
      `${this.basePath}/findings/${findingId}/remediations`
    );
    return response.data;
  }

  // --------------------------------------------------------------------------
  // Reporting
  // --------------------------------------------------------------------------

  /**
   * Generate compliance report
   */
  public async generateReport(request: GenerateReportRequest): Promise<ComplianceReport> {
    const response = await this.client.post<ComplianceReport>(`${this.basePath}/reports`, request);
    return response.data;
  }

  /**
   * List reports
   */
  public async listReports(framework?: ComplianceFramework): Promise<ComplianceReport[]> {
    const response = await this.client.get<ComplianceReport[]>(`${this.basePath}/reports`, {
      framework,
    });
    return response.data;
  }

  /**
   * Get report by ID
   */
  public async getReport(id: string): Promise<ComplianceReport> {
    const response = await this.client.get<ComplianceReport>(`${this.basePath}/reports/${id}`);
    return response.data;
  }

  /**
   * Download report
   */
  public async downloadReport(id: string): Promise<Blob> {
    const report = await this.getReport(id);
    const response = await fetch(report.downloadUrl);
    return response.blob();
  }

  // --------------------------------------------------------------------------
  // Summary & Analytics
  // --------------------------------------------------------------------------

  /**
   * Get compliance summary
   */
  public async getSummary(framework?: ComplianceFramework): Promise<{
    frameworks: Array<{
      framework: ComplianceFramework;
      score: number;
      totalControls: number;
      implementedControls: number;
      trend: "improving" | "stable" | "declining";
    }>;
    overallScore: number;
    openFindings: number;
    upcomingDeadlines: number;
  }> {
    const response = await this.client.get(`${this.basePath}/summary`, { framework });
    return response.data;
  }

  /**
   * Get compliance trends
   */
  public async getTrends(
    framework: ComplianceFramework,
    period: "week" | "month" | "quarter" | "year"
  ): Promise<
    Array<{
      date: string;
      score: number;
      implementedControls: number;
      openFindings: number;
    }>
  > {
    const response = await this.client.get(`${this.basePath}/frameworks/${framework}/trends`, {
      period,
    });
    return response.data;
  }

  /**
   * Get framework maturity
   */
  public async getMaturity(framework: ComplianceFramework): Promise<{
    level: 1 | 2 | 3 | 4 | 5;
    levelName: string;
    description: string;
    nextLevelRequirements: string[];
    categoryMaturity: Array<{
      category: string;
      level: number;
      score: number;
    }>;
  }> {
    const response = await this.client.get(`${this.basePath}/frameworks/${framework}/maturity`);
    return response.data;
  }
}
