/**
 * Summit SDK Compliance Module
 *
 * Compliance framework and evidence management client.
 *
 * SOC 2 Controls: CC4.1 (Monitoring), CC4.2 (Evidence)
 *
 * @module @summit/sdk/compliance
 */

import type {
  AuditReadiness,
  ComplianceFramework,
  ComplianceSummary,
  Control,
  ControlAssessment,
  DataEnvelope,
  Evidence,
  EvidenceType,
} from "./types.js";

/**
 * HTTP client interface for compliance operations
 */
interface HttpClient {
  get<T>(path: string, params?: Record<string, string>): Promise<DataEnvelope<T>>;
  post<T>(path: string, body: unknown): Promise<DataEnvelope<T>>;
}

/**
 * Compliance client for framework management and evidence collection
 */
export class ComplianceClient {
  private readonly http: HttpClient;

  constructor(httpClient: HttpClient) {
    this.http = httpClient;
  }

  // ==========================================================================
  // Framework Management
  // ==========================================================================

  /**
   * List available compliance frameworks
   *
   * @returns List of supported frameworks
   *
   * @example
   * ```typescript
   * const frameworks = await compliance.listFrameworks();
   * console.log('Supported frameworks:', frameworks.data);
   * ```
   */
  async listFrameworks(): Promise<
    DataEnvelope<
      Array<{
        id: ComplianceFramework;
        name: string;
        description: string;
        controlCount: number;
      }>
    >
  > {
    return this.http.get("/compliance/frameworks");
  }

  /**
   * Get compliance summary for a framework
   *
   * @param framework - Compliance framework identifier
   * @returns Compliance summary with scores and status
   *
   * @example
   * ```typescript
   * const summary = await compliance.getSummary('SOC2');
   * console.log(`Overall compliance: ${summary.data.overallScore}%`);
   * ```
   */
  async getSummary(framework: ComplianceFramework): Promise<DataEnvelope<ComplianceSummary>> {
    return this.http.get<ComplianceSummary>(`/compliance/frameworks/${framework}/summary`);
  }

  /**
   * Get audit readiness assessment
   *
   * @param framework - Compliance framework identifier
   * @returns Audit readiness with gaps and recommendations
   *
   * @example
   * ```typescript
   * const readiness = await compliance.getAuditReadiness('SOC2');
   *
   * if (readiness.data.readinessLevel === 'not_ready') {
   *   console.log('Gaps to address:', readiness.data.gaps);
   * }
   * ```
   */
  async getAuditReadiness(framework: ComplianceFramework): Promise<DataEnvelope<AuditReadiness>> {
    return this.http.get<AuditReadiness>(`/compliance/frameworks/${framework}/readiness`);
  }

  // ==========================================================================
  // Control Management
  // ==========================================================================

  /**
   * List controls for a framework
   *
   * @param framework - Compliance framework identifier
   * @param category - Optional category filter
   * @returns List of controls
   *
   * @example
   * ```typescript
   * const controls = await compliance.listControls('SOC2', 'Access Control');
   * controls.data.forEach(control => {
   *   console.log(`${control.id}: ${control.name}`);
   * });
   * ```
   */
  async listControls(
    framework: ComplianceFramework,
    category?: string
  ): Promise<DataEnvelope<Control[]>> {
    const params: Record<string, string> = {};
    if (category) params.category = category;
    return this.http.get<Control[]>(`/compliance/frameworks/${framework}/controls`, params);
  }

  /**
   * Get control details
   *
   * @param framework - Compliance framework identifier
   * @param controlId - Control identifier
   * @returns Control details
   */
  async getControl(
    framework: ComplianceFramework,
    controlId: string
  ): Promise<DataEnvelope<Control>> {
    return this.http.get<Control>(`/compliance/frameworks/${framework}/controls/${controlId}`);
  }

  /**
   * Assess a control
   *
   * @param framework - Compliance framework identifier
   * @param controlId - Control identifier
   * @returns Assessment result
   *
   * @example
   * ```typescript
   * const assessment = await compliance.assessControl('SOC2', 'CC6.1');
   * console.log(`Status: ${assessment.data.status}, Score: ${assessment.data.score}%`);
   * ```
   */
  async assessControl(
    framework: ComplianceFramework,
    controlId: string
  ): Promise<DataEnvelope<ControlAssessment>> {
    return this.http.post<ControlAssessment>(
      `/compliance/frameworks/${framework}/assess/${controlId}`,
      {}
    );
  }

  /**
   * Get assessments for a framework
   *
   * @param framework - Compliance framework identifier
   * @returns List of control assessments
   */
  async getAssessments(framework: ComplianceFramework): Promise<DataEnvelope<ControlAssessment[]>> {
    return this.http.get<ControlAssessment[]>(`/compliance/frameworks/${framework}/assessments`);
  }

  /**
   * Get assessment for a specific control
   *
   * @param framework - Compliance framework identifier
   * @param controlId - Control identifier
   * @returns Control assessment
   */
  async getControlAssessment(
    framework: ComplianceFramework,
    controlId: string
  ): Promise<DataEnvelope<ControlAssessment | null>> {
    return this.http.get<ControlAssessment | null>(
      `/compliance/frameworks/${framework}/assessments/${controlId}`
    );
  }

  // ==========================================================================
  // Evidence Management
  // ==========================================================================

  /**
   * List evidence
   *
   * @param filters - Optional filters
   * @returns List of evidence items
   *
   * @example
   * ```typescript
   * const evidence = await compliance.listEvidence({
   *   framework: 'SOC2',
   *   controlId: 'CC6.1',
   *   status: 'verified'
   * });
   * ```
   */
  async listEvidence(filters?: {
    framework?: ComplianceFramework;
    controlId?: string;
    type?: EvidenceType;
    status?: "pending" | "verified" | "rejected" | "expired";
  }): Promise<DataEnvelope<Evidence[]>> {
    const params: Record<string, string> = {};
    if (filters?.framework) params.framework = filters.framework;
    if (filters?.controlId) params.controlId = filters.controlId;
    if (filters?.type) params.type = filters.type;
    if (filters?.status) params.status = filters.status;
    return this.http.get<Evidence[]>("/compliance/evidence", params);
  }

  /**
   * Get specific evidence by ID
   *
   * @param evidenceId - Evidence identifier
   * @returns Evidence details
   */
  async getEvidence(evidenceId: string): Promise<DataEnvelope<Evidence>> {
    return this.http.get<Evidence>(`/compliance/evidence/${evidenceId}`);
  }

  /**
   * Collect new evidence
   *
   * @param evidence - Evidence to collect
   * @returns Collected evidence
   *
   * @example
   * ```typescript
   * const evidence = await compliance.collectEvidence({
   *   controlId: 'CC6.1',
   *   framework: 'SOC2',
   *   type: 'configuration',
   *   source: 'AWS IAM',
   *   content: {
   *     policies: await fetchIAMPolicies(),
   *     timestamp: new Date().toISOString()
   *   }
   * });
   * ```
   */
  async collectEvidence(evidence: {
    controlId: string;
    framework: ComplianceFramework;
    type: EvidenceType;
    source: string;
    content: unknown;
    metadata?: Record<string, unknown>;
  }): Promise<DataEnvelope<Evidence>> {
    return this.http.post<Evidence>("/compliance/evidence", evidence);
  }

  /**
   * Verify evidence integrity
   *
   * @param evidenceId - Evidence identifier
   * @returns Verification result
   */
  async verifyEvidence(
    evidenceId: string
  ): Promise<DataEnvelope<{ valid: boolean; hash: string; verifiedAt: string }>> {
    return this.http.post<{ valid: boolean; hash: string; verifiedAt: string }>(
      `/compliance/evidence/${evidenceId}/verify`,
      {}
    );
  }

  /**
   * Get evidence collection status
   *
   * @param framework - Optional framework filter
   * @returns Evidence status summary
   */
  async getEvidenceStatus(framework?: ComplianceFramework): Promise<
    DataEnvelope<{
      total: number;
      verified: number;
      pending: number;
      rejected: number;
      expired: number;
      byControl: Array<{
        controlId: string;
        evidenceCount: number;
        latestCollection: string;
      }>;
    }>
  > {
    const params = framework ? { framework } : undefined;
    return this.http.get("/compliance/evidence/status", params);
  }

  // ==========================================================================
  // Reporting
  // ==========================================================================

  /**
   * Generate compliance report
   *
   * @param framework - Compliance framework
   * @param options - Report options
   * @returns Report data
   *
   * @example
   * ```typescript
   * const report = await compliance.generateReport('SOC2', {
   *   format: 'pdf',
   *   includeEvidence: true,
   *   categories: ['Access Control', 'Security Operations']
   * });
   * ```
   */
  async generateReport(
    framework: ComplianceFramework,
    options?: {
      format?: "json" | "pdf" | "csv";
      includeEvidence?: boolean;
      categories?: string[];
      startDate?: string;
      endDate?: string;
    }
  ): Promise<DataEnvelope<{ reportId: string; status: string; downloadUrl?: string }>> {
    return this.http.post<{ reportId: string; status: string; downloadUrl?: string }>(
      `/compliance/frameworks/${framework}/reports`,
      options || {}
    );
  }

  /**
   * Get report status
   *
   * @param reportId - Report identifier
   * @returns Report status and download URL if ready
   */
  async getReportStatus(
    reportId: string
  ): Promise<
    DataEnvelope<{ status: "pending" | "generating" | "ready" | "failed"; downloadUrl?: string }>
  > {
    return this.http.get<{
      status: "pending" | "generating" | "ready" | "failed";
      downloadUrl?: string;
    }>(`/compliance/reports/${reportId}`);
  }

  // ==========================================================================
  // Continuous Monitoring
  // ==========================================================================

  /**
   * Get continuous monitoring status
   *
   * @param framework - Compliance framework
   * @returns Monitoring status
   */
  async getMonitoringStatus(framework: ComplianceFramework): Promise<
    DataEnvelope<{
      enabled: boolean;
      lastRun: string;
      nextRun: string;
      controlsMonitored: number;
      alertsGenerated: number;
    }>
  > {
    return this.http.get(`/compliance/frameworks/${framework}/monitoring`);
  }

  /**
   * Trigger manual compliance scan
   *
   * @param framework - Compliance framework
   * @param controlIds - Optional specific controls to scan
   * @returns Scan job details
   */
  async triggerScan(
    framework: ComplianceFramework,
    controlIds?: string[]
  ): Promise<DataEnvelope<{ scanId: string; status: string; controlsScanned: number }>> {
    return this.http.post<{ scanId: string; status: string; controlsScanned: number }>(
      `/compliance/frameworks/${framework}/scan`,
      { controlIds }
    );
  }
}
