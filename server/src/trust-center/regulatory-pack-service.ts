/**
 * Regulatory Pack Service
 *
 * Manages regulatory compliance packs including loading, validation,
 * evidence collection, and report generation.
 *
 * @module trust-center/regulatory-pack-service
 */

import { getPostgresPool } from '../db/postgres.js';
import { otelService } from '../middleware/observability/otel-tracing.js';
import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

import type {
  RegulatoryPack,
  RegulatoryPackSummary,
  PackControl,
  ControlDefinition,
  EvidenceSnapshot,
  TestResult,
  ControlMetrics,
  ComplianceFramework,
  ControlStatus,
  AssuranceChecklist,
  AssuranceChecklistItem,
  ArtifactScope,
  RedactionRule,
  ActorReference,
} from './types/index.js';

import {
  CONTROL_MAPPINGS,
  getControlsByFramework,
} from './types/control-evidence-mappings.js';

// =============================================================================
// Types
// =============================================================================

interface PackLoadResult {
  pack: RegulatoryPack;
  validationErrors: string[];
  warnings: string[];
}

interface EvidenceCollectionResult {
  controlId: string;
  snapshots: EvidenceSnapshot[];
  errors: string[];
  collectedAt: string;
}

interface ControlAssessmentResult {
  controlId: string;
  status: ControlStatus;
  testResults: TestResult[];
  evidenceSnapshots: EvidenceSnapshot[];
  metrics: ControlMetrics;
  checklist: AssuranceChecklist;
}

// =============================================================================
// Default Redaction Rules
// =============================================================================

const DEFAULT_REDACTION_RULES: RedactionRule[] = [
  {
    pattern: 'tenant_[a-zA-Z0-9]+',
    replacement: '[REDACTED_TENANT]',
    category: 'tenant_id',
    isRegex: true,
  },
  {
    pattern: '\\b10\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b',
    replacement: '10.x.x.x',
    category: 'internal_ip',
    isRegex: true,
  },
  {
    pattern: '\\b172\\.(1[6-9]|2[0-9]|3[0-1])\\.\\d{1,3}\\.\\d{1,3}\\b',
    replacement: '172.x.x.x',
    category: 'internal_ip',
    isRegex: true,
  },
  {
    pattern: '\\b192\\.168\\.\\d{1,3}\\.\\d{1,3}\\b',
    replacement: '192.168.x.x',
    category: 'internal_ip',
    isRegex: true,
  },
  {
    pattern: '[a-zA-Z0-9._%+-]+@company\\.io',
    replacement: '[INTERNAL_USER]',
    category: 'employee',
    isRegex: true,
  },
  {
    pattern: '(sk_live_|sk_test_|api_key_)[a-zA-Z0-9]+',
    replacement: '[CREDENTIAL]',
    category: 'secret',
    isRegex: true,
  },
  {
    pattern: 'prod-[a-zA-Z]+-\\d+',
    replacement: '[PRODUCTION_SERVER]',
    category: 'system',
    isRegex: true,
  },
];

// =============================================================================
// Regulatory Pack Service
// =============================================================================

export class RegulatoryPackService {
  private readonly packsDirectory: string;
  private loadedPacks: Map<string, RegulatoryPack> = new Map();

  constructor(packsDirectory?: string) {
    this.packsDirectory = packsDirectory || path.join(process.cwd(), 'config/regulatory-packs');
  }

  // ===========================================================================
  // Pack Management
  // ===========================================================================

  /**
   * Load all regulatory packs from the packs directory
   */
  async loadAllPacks(): Promise<PackLoadResult[]> {
    const span = otelService.createSpan('regulatory_pack.load_all');
    const results: PackLoadResult[] = [];

    try {
      const files = await fs.readdir(this.packsDirectory).catch(() => []);

      for (const file of files) {
        if (file.endsWith('.yaml') || file.endsWith('.yml')) {
          const result = await this.loadPack(path.join(this.packsDirectory, file));
          results.push(result);
        }
      }

      span?.addSpanAttributes({
        'regulatory_pack.loaded_count': results.length,
        'regulatory_pack.error_count': results.filter((r) => r.validationErrors.length > 0).length,
      });

      return results;
    } finally {
      span?.end();
    }
  }

  /**
   * Load a single regulatory pack from file
   */
  async loadPack(filePath: string): Promise<PackLoadResult> {
    const span = otelService.createSpan('regulatory_pack.load');
    const validationErrors: string[] = [];
    const warnings: string[] = [];

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const rawPack = yaml.load(content) as any;

      // Validate required fields
      if (!rawPack.id) validationErrors.push('Missing required field: id');
      if (!rawPack.name) validationErrors.push('Missing required field: name');
      if (!rawPack.framework) validationErrors.push('Missing required field: framework');
      if (!rawPack.controls || rawPack.controls.length === 0) {
        warnings.push('Pack has no controls defined');
      }

      // Transform to typed structure
      const pack: RegulatoryPack = {
        id: rawPack.id,
        name: rawPack.name,
        description: rawPack.description || '',
        framework: rawPack.framework as ComplianceFramework,
        version: rawPack.version || '1.0.0',
        status: rawPack.status || 'draft',
        controls: (rawPack.controls || []).map((c: any) => this.transformControl(c)),
        artifacts: rawPack.artifacts || [],
        metadata: {
          auditPeriod: rawPack.metadata?.audit_period
            ? {
                start: rawPack.metadata.audit_period.split('/')[0],
                end: rawPack.metadata.audit_period.split('/')[1],
              }
            : undefined,
          auditor: rawPack.metadata?.auditor,
          certificationDate: rawPack.metadata?.certification_date,
          expirationDate: rawPack.metadata?.expiration_date,
          version: rawPack.version || '1.0.0',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Store in cache
      this.loadedPacks.set(pack.id, pack);

      // Persist to database
      await this.persistPack(pack);

      span?.addSpanAttributes({
        'regulatory_pack.id': pack.id,
        'regulatory_pack.framework': pack.framework,
        'regulatory_pack.control_count': pack.controls.length,
      });

      return { pack, validationErrors, warnings };
    } catch (error: any) {
      validationErrors.push(`Failed to load pack: ${error.message}`);
      return {
        pack: {} as RegulatoryPack,
        validationErrors,
        warnings,
      };
    } finally {
      span?.end();
    }
  }

  /**
   * Transform raw control data to typed structure
   */
  private transformControl(raw: any): PackControl {
    return {
      id: raw.id,
      controlDefinitionId: raw.control_definition_id || raw.id,
      title: raw.title,
      description: raw.description,
      category: raw.category || 'General',
      evidenceSources: (raw.evidence_sources || []).map((es: any) => ({
        id: es.id || `${raw.id}-${es.type}`,
        type: es.type,
        name: es.name || es.type,
        description: es.description,
        config: {
          table: es.table,
          query: es.query,
          fields: es.fields,
          path: es.path,
          systems: es.systems,
          prometheusQuery: es.prometheus_query,
          policyPath: es.policy_path,
          verification: es.verification,
        },
        retentionPeriod: es.retention || '7y',
        refreshFrequency: es.refresh_frequency || 'daily',
        stalenessThreshold: es.staleness_threshold || '24h',
      })),
      tests: (raw.tests || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description || '',
        type: t.type || 'automated',
        frequency: t.frequency || 'daily',
        procedure: t.procedure,
        expectedResult: t.expected || t.expected_result,
        automation: t.automation
          ? {
              script: t.automation.script,
              schedule: t.automation.schedule,
              timeout: t.automation.timeout,
              retries: t.automation.retries,
            }
          : undefined,
        manual: t.manual
          ? {
              instructions: t.manual.instructions || t.procedure,
            }
          : undefined,
      })),
      mappings: (raw.mappings || []).map((m: any) => ({
        framework: m.framework as ComplianceFramework,
        controlId: m.control,
        requirement: m.requirement || '',
        mappingConfidence: m.confidence || 'exact',
      })),
    };
  }

  /**
   * Persist pack to database
   */
  private async persistPack(pack: RegulatoryPack): Promise<void> {
    const pool = getPostgresPool();

    await pool.query(
      `INSERT INTO regulatory_packs (id, name, framework, version, status, pack_data, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, now(), now())
       ON CONFLICT (id) DO UPDATE SET
         name = $2,
         framework = $3,
         version = $4,
         status = $5,
         pack_data = $6,
         updated_at = now()`,
      [
        pack.id,
        pack.name,
        pack.framework,
        pack.version,
        pack.status,
        JSON.stringify(pack),
      ]
    );
  }

  /**
   * Get a regulatory pack by ID
   */
  async getPack(packId: string): Promise<RegulatoryPack | null> {
    // Check cache first
    if (this.loadedPacks.has(packId)) {
      return this.loadedPacks.get(packId)!;
    }

    // Load from database
    const pool = getPostgresPool();
    const { rows } = await pool.query(
      'SELECT pack_data FROM regulatory_packs WHERE id = $1',
      [packId]
    );

    if (rows.length === 0) return null;

    const pack = rows[0].pack_data as RegulatoryPack;
    this.loadedPacks.set(packId, pack);
    return pack;
  }

  /**
   * List all available regulatory packs
   */
  async listPacks(frameworks?: ComplianceFramework[]): Promise<RegulatoryPackSummary[]> {
    const pool = getPostgresPool();

    let query = `
      SELECT id, name, framework, version, status,
             jsonb_array_length(pack_data->'controls') as control_count,
             updated_at
      FROM regulatory_packs
    `;

    const params: any[] = [];

    if (frameworks && frameworks.length > 0) {
      query += ' WHERE framework = ANY($1)';
      params.push(frameworks);
    }

    query += ' ORDER BY name';

    const { rows } = await pool.query(query, params);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      framework: row.framework as ComplianceFramework,
      version: row.version,
      status: row.status,
      controlCount: row.control_count || 0,
      lastUpdated: row.updated_at.toISOString(),
    }));
  }

  // ===========================================================================
  // Evidence Collection
  // ===========================================================================

  /**
   * Collect evidence for a specific control
   */
  async collectControlEvidence(
    controlId: string,
    tenantId: string,
    dateRange?: { start: string; end: string }
  ): Promise<EvidenceCollectionResult> {
    const span = otelService.createSpan('regulatory_pack.collect_evidence');
    const snapshots: EvidenceSnapshot[] = [];
    const errors: string[] = [];

    try {
      const control = CONTROL_MAPPINGS[controlId];
      if (!control) {
        throw new Error(`Control ${controlId} not found`);
      }

      const pool = getPostgresPool();
      const startDate = dateRange?.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = dateRange?.end || new Date().toISOString();

      for (const source of control.evidenceSources) {
        try {
          let content: any;

          switch (source.type) {
            case 'audit_log':
              if (source.config.query) {
                const { rows } = await pool.query(source.config.query, [
                  tenantId,
                  startDate,
                  endDate,
                ]);
                content = rows;
              }
              break;

            case 'configuration':
              content = {
                systems: source.config.systems,
                capturedAt: new Date().toISOString(),
                note: 'Configuration evidence - see referenced paths',
              };
              break;

            case 'metric':
              content = {
                query: source.config.prometheusQuery,
                threshold: source.config.threshold,
                capturedAt: new Date().toISOString(),
                note: 'Metric evidence - query Prometheus for current values',
              };
              break;

            case 'policy':
              content = {
                policyPath: source.config.policyPath,
                verification: source.config.verification,
                capturedAt: new Date().toISOString(),
              };
              break;

            default:
              content = { note: `Evidence type ${source.type} requires manual collection` };
          }

          // Apply redaction for tenant isolation
          const redactedContent = this.applyRedaction(content, tenantId);

          const contentStr = JSON.stringify(redactedContent);
          const snapshot: EvidenceSnapshot = {
            id: `${controlId}-${source.id}-${Date.now()}`,
            sourceId: source.id,
            controlId,
            capturedAt: new Date().toISOString(),
            capturedBy: {
              type: 'system',
              id: 'regulatory-pack-service',
              name: 'Regulatory Pack Service',
            },
            content: redactedContent,
            contentHash: createHash('sha256').update(contentStr).digest('hex'),
            contentSize: contentStr.length,
            redactionApplied: true,
            redactionRules: DEFAULT_REDACTION_RULES.map((r) => r.category),
          };

          snapshots.push(snapshot);

          // Store snapshot
          await pool.query(
            `INSERT INTO evidence_snapshots
             (id, control_id, source_id, tenant_id, content, content_hash, captured_at)
             VALUES ($1, $2, $3, $4, $5, $6, now())`,
            [
              snapshot.id,
              controlId,
              source.id,
              tenantId,
              JSON.stringify(content),
              snapshot.contentHash,
            ]
          );
        } catch (error: any) {
          errors.push(`Failed to collect from ${source.id}: ${error.message}`);
        }
      }

      span?.addSpanAttributes({
        'regulatory_pack.control_id': controlId,
        'regulatory_pack.snapshot_count': snapshots.length,
        'regulatory_pack.error_count': errors.length,
      });

      return {
        controlId,
        snapshots,
        errors,
        collectedAt: new Date().toISOString(),
      };
    } finally {
      span?.end();
    }
  }

  /**
   * Apply redaction rules to evidence content
   */
  private applyRedaction(content: any, requestingTenantId: string): any {
    const contentStr = JSON.stringify(content);
    let redacted = contentStr;

    for (const rule of DEFAULT_REDACTION_RULES) {
      if (rule.isRegex) {
        // For tenant IDs, only redact OTHER tenants
        if (rule.category === 'tenant_id') {
          const regex = new RegExp(`tenant_(?!${requestingTenantId.replace('tenant_', '')})[a-zA-Z0-9]+`, 'g');
          redacted = redacted.replace(regex, rule.replacement);
        } else {
          const regex = new RegExp(rule.pattern, 'g');
          redacted = redacted.replace(regex, rule.replacement);
        }
      } else {
        redacted = redacted.split(rule.pattern).join(rule.replacement);
      }
    }

    return JSON.parse(redacted);
  }

  // ===========================================================================
  // Control Assessment
  // ===========================================================================

  /**
   * Assess a control's effectiveness and readiness
   */
  async assessControl(
    controlId: string,
    tenantId: string
  ): Promise<ControlAssessmentResult> {
    const span = otelService.createSpan('regulatory_pack.assess_control');

    try {
      const control = CONTROL_MAPPINGS[controlId];
      if (!control) {
        throw new Error(`Control ${controlId} not found`);
      }

      // Collect evidence
      const evidenceResult = await this.collectControlEvidence(controlId, tenantId);

      // Run tests (or get recent results)
      const testResults = await this.getRecentTestResults(controlId);

      // Calculate metrics
      const metrics = this.calculateControlMetrics(controlId, testResults, evidenceResult.snapshots);

      // Generate checklist
      const checklist = this.generateAssuranceChecklist(control, testResults, evidenceResult);

      // Determine overall status
      const status = this.determineControlStatus(testResults, evidenceResult, checklist);

      span?.addSpanAttributes({
        'regulatory_pack.control_id': controlId,
        'regulatory_pack.status': status,
        'regulatory_pack.test_count': testResults.length,
      });

      return {
        controlId,
        status,
        testResults,
        evidenceSnapshots: evidenceResult.snapshots,
        metrics,
        checklist,
      };
    } finally {
      span?.end();
    }
  }

  /**
   * Get recent test results for a control
   */
  private async getRecentTestResults(controlId: string): Promise<TestResult[]> {
    const pool = getPostgresPool();

    const { rows } = await pool.query(
      `SELECT
         id, test_id, control_id, executed_at, executed_by,
         status, details, evidence, duration, failure_reason
       FROM compliance_test_results
       WHERE control_id = $1
         AND executed_at > now() - interval '30 days'
       ORDER BY executed_at DESC
       LIMIT 100`,
      [controlId]
    );

    return rows.map((row) => ({
      id: row.id,
      testId: row.test_id,
      controlId: row.control_id,
      executedAt: row.executed_at.toISOString(),
      executedBy: row.executed_by,
      status: row.status,
      details: row.details,
      evidence: row.evidence,
      duration: row.duration,
      failureReason: row.failure_reason,
    }));
  }

  /**
   * Calculate metrics for a control
   */
  private calculateControlMetrics(
    controlId: string,
    testResults: TestResult[],
    evidenceSnapshots: EvidenceSnapshot[]
  ): ControlMetrics {
    const passed = testResults.filter((t) => t.status === 'passed').length;
    const failed = testResults.filter((t) => t.status === 'failed').length;
    const total = testResults.length;

    // Calculate evidence freshness (average age in hours)
    const now = Date.now();
    const evidenceAges = evidenceSnapshots.map(
      (e) => (now - new Date(e.capturedAt).getTime()) / (1000 * 60 * 60)
    );
    const avgFreshness = evidenceAges.length > 0
      ? evidenceAges.reduce((a, b) => a + b, 0) / evidenceAges.length
      : 0;

    // Determine trend (simplified - compare to previous period)
    const recentPassRate = total > 0 ? passed / total : 1;
    const trend = recentPassRate >= 0.95 ? 'stable' : recentPassRate >= 0.8 ? 'degrading' : 'degrading';

    return {
      controlId,
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      },
      testsExecuted: total,
      testsPassed: passed,
      testsFailed: failed,
      passRate: total > 0 ? passed / total : 1,
      evidenceCount: evidenceSnapshots.length,
      evidenceFreshness: avgFreshness,
      trend,
    };
  }

  /**
   * Generate assurance checklist for a control
   */
  private generateAssuranceChecklist(
    control: ControlDefinition,
    testResults: TestResult[],
    evidenceResult: EvidenceCollectionResult
  ): AssuranceChecklist {
    const items: AssuranceChecklistItem[] = [
      {
        id: 'documented',
        category: 'Documentation',
        requirement: 'Control has written description',
        description: 'Control description exists in control catalog',
        status: control.description ? 'met' : 'not_met',
        evidence: control.description ? 'Description defined' : undefined,
      },
      {
        id: 'framework_mapped',
        category: 'Framework Mapping',
        requirement: 'Control mapped to compliance framework',
        description: 'At least one framework mapping exists',
        status: control.frameworkMappings.length > 0 ? 'met' : 'not_met',
        evidence: control.frameworkMappings.length > 0
          ? `Mapped to ${control.frameworkMappings.map((m) => m.framework).join(', ')}`
          : undefined,
      },
      {
        id: 'implemented',
        category: 'Implementation',
        requirement: 'Technical implementation exists',
        description: 'Control has documented implementation components',
        status: control.implementation.components.length > 0 ? 'met' : 'not_met',
        evidence: control.implementation.components.length > 0
          ? `${control.implementation.components.length} components documented`
          : undefined,
      },
      {
        id: 'evidence_sources',
        category: 'Evidence Collection',
        requirement: 'Automated evidence sources defined',
        description: 'At least one evidence source is configured',
        status: control.evidenceSources.length > 0 ? 'met' : 'not_met',
        evidence: control.evidenceSources.length > 0
          ? `${control.evidenceSources.length} sources configured`
          : undefined,
      },
      {
        id: 'tests_defined',
        category: 'Testing',
        requirement: 'Automated tests defined',
        description: 'At least one automated test validates effectiveness',
        status: control.tests.filter((t) => t.type === 'automated').length > 0 ? 'met' : 'not_met',
        evidence: `${control.tests.filter((t) => t.type === 'automated').length} automated tests`,
      },
      {
        id: 'tests_passing',
        category: 'Testing',
        requirement: 'Recent tests passing',
        description: 'Most recent test execution passed',
        status: testResults.length > 0 && testResults[0].status === 'passed' ? 'met' :
                testResults.length === 0 ? 'not_met' : 'partial',
        evidence: testResults.length > 0
          ? `Last test: ${testResults[0].status} at ${testResults[0].executedAt}`
          : 'No recent tests',
      },
      {
        id: 'evidence_fresh',
        category: 'Evidence Collection',
        requirement: 'Evidence within freshness threshold',
        description: 'Evidence is not stale',
        status: evidenceResult.snapshots.length > 0 ? 'met' : 'not_met',
        evidence: evidenceResult.snapshots.length > 0
          ? `${evidenceResult.snapshots.length} snapshots collected`
          : 'No evidence collected',
      },
      {
        id: 'owner_assigned',
        category: 'Governance',
        requirement: 'Control owner assigned',
        description: 'Designated owner has accountability',
        status: control.owner ? 'met' : 'not_met',
        evidence: control.owner ? `Owner: ${control.owner.name}` : undefined,
      },
      {
        id: 'reviewed',
        category: 'Governance',
        requirement: 'Control reviewed within cycle',
        description: 'Control reviewed within required period',
        status: control.lastTestedAt ? 'met' : 'not_met',
        evidence: control.lastTestedAt ? `Last tested: ${control.lastTestedAt}` : undefined,
      },
    ];

    const metCount = items.filter((i) => i.status === 'met').length;
    const totalCount = items.length;
    const overallStatus = metCount === totalCount ? 'ready' :
                          metCount >= totalCount * 0.7 ? 'partial' : 'not_ready';

    return {
      controlId: control.id,
      controlTitle: control.title,
      overallStatus,
      items,
      lastEvaluated: new Date().toISOString(),
      evaluatedBy: {
        type: 'system',
        id: 'regulatory-pack-service',
        name: 'Regulatory Pack Service',
      },
    };
  }

  /**
   * Determine control effectiveness status
   */
  private determineControlStatus(
    testResults: TestResult[],
    evidenceResult: EvidenceCollectionResult,
    checklist: AssuranceChecklist
  ): ControlStatus {
    // If recent tests failed, control is ineffective
    const recentTests = testResults.slice(0, 5);
    const failedCount = recentTests.filter((t) => t.status === 'failed').length;

    if (failedCount >= 3) return 'ineffective';
    if (failedCount >= 1) return 'partially_effective';

    // If no recent tests, not tested
    if (testResults.length === 0) return 'not_tested';

    // If evidence collection failed significantly
    if (evidenceResult.errors.length > evidenceResult.snapshots.length) {
      return 'partially_effective';
    }

    // If checklist shows not ready
    if (checklist.overallStatus === 'not_ready') return 'partially_effective';

    return 'effective';
  }

  // ===========================================================================
  // Report Generation
  // ===========================================================================

  /**
   * Generate a compliance report for a regulatory pack
   */
  async generatePackReport(
    packId: string,
    tenantId: string,
    format: 'json' | 'pdf' | 'csv' = 'json'
  ): Promise<any> {
    const span = otelService.createSpan('regulatory_pack.generate_report');

    try {
      const pack = await this.getPack(packId);
      if (!pack) {
        throw new Error(`Pack ${packId} not found`);
      }

      // Assess all controls in the pack
      const assessments: ControlAssessmentResult[] = [];
      for (const control of pack.controls) {
        const assessment = await this.assessControl(control.id, tenantId);
        assessments.push(assessment);
      }

      // Calculate overall compliance
      const effectiveCount = assessments.filter((a) => a.status === 'effective').length;
      const totalCount = assessments.length;
      const complianceScore = totalCount > 0 ? (effectiveCount / totalCount) * 100 : 0;

      const report = {
        metadata: {
          reportId: `report-${packId}-${Date.now()}`,
          packId: pack.id,
          packName: pack.name,
          framework: pack.framework,
          tenantId,
          generatedAt: new Date().toISOString(),
          reportPeriod: pack.metadata.auditPeriod,
        },
        summary: {
          totalControls: totalCount,
          effectiveControls: effectiveCount,
          partiallyEffective: assessments.filter((a) => a.status === 'partially_effective').length,
          ineffective: assessments.filter((a) => a.status === 'ineffective').length,
          notTested: assessments.filter((a) => a.status === 'not_tested').length,
          complianceScore: Math.round(complianceScore * 100) / 100,
          overallStatus: complianceScore >= 95 ? 'compliant' :
                         complianceScore >= 80 ? 'substantially_compliant' :
                         complianceScore >= 60 ? 'partially_compliant' : 'non_compliant',
        },
        controls: assessments.map((a) => ({
          controlId: a.controlId,
          status: a.status,
          testResults: a.testResults.slice(0, 5),
          metrics: a.metrics,
          checklistStatus: a.checklist.overallStatus,
        })),
        recommendations: this.generateRecommendations(assessments),
      };

      // Store report
      const pool = getPostgresPool();
      await pool.query(
        `INSERT INTO compliance_reports
         (id, pack_id, tenant_id, report_data, created_at)
         VALUES ($1, $2, $3, $4, now())`,
        [report.metadata.reportId, packId, tenantId, JSON.stringify(report)]
      );

      span?.addSpanAttributes({
        'regulatory_pack.pack_id': packId,
        'regulatory_pack.compliance_score': complianceScore,
        'regulatory_pack.control_count': totalCount,
      });

      return report;
    } finally {
      span?.end();
    }
  }

  /**
   * Generate recommendations based on assessments
   */
  private generateRecommendations(assessments: ControlAssessmentResult[]): string[] {
    const recommendations: string[] = [];

    const ineffective = assessments.filter((a) => a.status === 'ineffective');
    const partial = assessments.filter((a) => a.status === 'partially_effective');
    const notTested = assessments.filter((a) => a.status === 'not_tested');

    if (ineffective.length > 0) {
      recommendations.push(
        `CRITICAL: ${ineffective.length} controls are ineffective and require immediate remediation: ${ineffective.map((a) => a.controlId).join(', ')}`
      );
    }

    if (partial.length > 0) {
      recommendations.push(
        `${partial.length} controls are partially effective and should be reviewed: ${partial.map((a) => a.controlId).join(', ')}`
      );
    }

    if (notTested.length > 0) {
      recommendations.push(
        `${notTested.length} controls have not been tested recently: ${notTested.map((a) => a.controlId).join(', ')}`
      );
    }

    // Check for stale evidence
    const staleEvidence = assessments.filter(
      (a) => a.metrics.evidenceFreshness > 24
    );
    if (staleEvidence.length > 0) {
      recommendations.push(
        `${staleEvidence.length} controls have stale evidence (>24h old)`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('All controls are effective. Continue monitoring and maintain current posture.');
    }

    return recommendations;
  }
}

// =============================================================================
// Schema Definition
// =============================================================================

export const REGULATORY_PACK_SCHEMA = `
-- Regulatory Packs table
CREATE TABLE IF NOT EXISTS regulatory_packs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  framework TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  pack_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Evidence Snapshots table
CREATE TABLE IF NOT EXISTS evidence_snapshots (
  id TEXT PRIMARY KEY,
  control_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  content JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  captured_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Compliance Test Results table
CREATE TABLE IF NOT EXISTS compliance_test_results (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  control_id TEXT NOT NULL,
  tenant_id TEXT,
  executed_at TIMESTAMPTZ DEFAULT now(),
  executed_by JSONB,
  status TEXT NOT NULL,
  details TEXT,
  evidence TEXT[],
  duration INTEGER,
  failure_reason TEXT
);

-- Compliance Reports table
CREATE TABLE IF NOT EXISTS compliance_reports (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL REFERENCES regulatory_packs(id),
  tenant_id TEXT NOT NULL,
  report_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS evidence_snapshots_control_idx ON evidence_snapshots (control_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS evidence_snapshots_tenant_idx ON evidence_snapshots (tenant_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS compliance_test_results_control_idx ON compliance_test_results (control_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS compliance_reports_pack_idx ON compliance_reports (pack_id, created_at DESC);
CREATE INDEX IF NOT EXISTS compliance_reports_tenant_idx ON compliance_reports (tenant_id, created_at DESC);
`;

// =============================================================================
// Singleton Export
// =============================================================================

export const regulatoryPackService = new RegulatoryPackService();
