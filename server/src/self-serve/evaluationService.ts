import { randomUUID } from 'crypto';
import { AnalyticsService } from './analyticsService.js';
import { CertificationService } from './certificationService.js';
import { ControlPlane } from './controlPlane.js';
import {
  EvaluationEnvironment,
  EvaluationRecord,
  EvaluationRequest,
  EvaluationRun,
  GuidedSuggestion,
  KPIReport,
} from './types.js';

export class SelfServeEvaluationService {
  constructor(
    private controlPlane: ControlPlane,
    private analytics: AnalyticsService,
    private certification: CertificationService,
  ) {}

  private evaluations: Map<string, EvaluationRecord> = new Map();

  requestEvaluation(request: EvaluationRequest): EvaluationRecord {
    const tenant = this.controlPlane.registerTenant(request.tenantName, request.email, request.quotaOverride);
    const environment: EvaluationEnvironment = this.createEnvironment();
    const evaluation: EvaluationRecord = {
      id: randomUUID(),
      tenantId: tenant.id,
      status: 'requested',
      environment,
      runs: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.evaluations.set(evaluation.id, evaluation);
    this.analytics.record({ evaluationId: evaluation.id, stage: 'requested', occurredAt: new Date(), success: true });
    this.controlPlane.recordAudit(tenant.id, 'evaluation.requested', {
      useCase: request.useCase,
      connectors: request.connectors,
      deploymentProfile: request.deploymentProfile,
    });

    return this.provisionEnvironment(evaluation.id, request);
  }

  provisionEnvironment(evaluationId: string, request?: EvaluationRequest): EvaluationRecord {
    const evaluation = this.getEvaluation(evaluationId);
    evaluation.environment.status = 'provisioning';
    evaluation.updatedAt = new Date();
    this.analytics.record({ evaluationId, stage: 'provisioned', occurredAt: new Date(), success: true });
    this.controlPlane.recordAudit(evaluation.tenantId, 'evaluation.environment.provisioned', {
      billingTags: evaluation.environment.billingTags,
      sandboxed: evaluation.environment.sandboxed,
      deploymentProfile: request?.deploymentProfile,
    });
    evaluation.environment.status = 'ready';
    evaluation.status = 'ready';
    evaluation.updatedAt = new Date();
    return evaluation;
  }

  runDemo(evaluationId: string, scenario: string): KPIReport {
    const evaluation = this.getEvaluation(evaluationId);
    if (evaluation.environment.status !== 'ready') {
      throw new Error('Environment not ready');
    }

    evaluation.status = 'running';
    const runtimeMinutes = this.estimateRuntime(scenario, evaluation.runs.length);
    const dataScannedMb = this.estimateDataScan(evaluation.environment.billingTags.tier);
    const run: EvaluationRun = {
      id: randomUUID(),
      startedAt: new Date(),
      completedAt: new Date(),
      runtimeMinutes,
      dataScannedMb,
      scenario,
      success: true,
    };

    const deltaUsage = {
      evaluationsRun: 1,
      runtimeMinutes,
      dataScannedMb,
    };

    this.controlPlane.enforceQuota(evaluation.tenantId, deltaUsage);

    evaluation.runs.push(run);
    const report = this.generateReport(evaluation, run);
    evaluation.kpiReport = report;
    evaluation.status = 'report-ready';
    evaluation.updatedAt = new Date();
    this.controlPlane.recordUsage(evaluation.tenantId, { ...deltaUsage, lastActivityAt: new Date() });

    this.analytics.record({ evaluationId, stage: 'run-triggered', occurredAt: run.startedAt, success: true });
    this.analytics.record({ evaluationId, stage: 'report-ready', occurredAt: report ? new Date() : run.completedAt, success: true });
    return report;
  }

  deprovision(evaluationId: string): EvaluationRecord {
    const evaluation = this.getEvaluation(evaluationId);
    evaluation.environment.status = 'deprovisioned';
    evaluation.status = 'deprovisioned';
    evaluation.environment.expiresAt = new Date();
    evaluation.updatedAt = new Date();
    this.analytics.record({ evaluationId, stage: 'deprovisioned', occurredAt: new Date(), success: true });
    this.controlPlane.recordAudit(evaluation.tenantId, 'evaluation.environment.deprovisioned');
    return evaluation;
  }

  certifyConnectors(connectors: string[]): KPIReport['guidedSuggestions'] {
    const candidates = connectors.map((name) => ({ name, version: '1.0.0', capabilities: ['ingest', 'query'], signedBy: 'ci' }));
    const results = this.certification.certifyConnectors(candidates);
    return results.map((result) => ({
      title: `${result.subject} certification`,
      recommendation: result.passed ? 'Connector certified for self-serve evaluations' : 'Connector failed certification checks',
      rationale: result.passed ? 'All required checks met' : result.issues.join(', '),
    }));
  }

  getEvaluation(evaluationId: string): EvaluationRecord {
    const evaluation = this.evaluations.get(evaluationId);
    if (!evaluation) {
      throw new Error('Evaluation not found');
    }
    return evaluation;
  }

  getReport(evaluationId: string): KPIReport {
    const evaluation = this.getEvaluation(evaluationId);
    if (!evaluation.kpiReport) {
      throw new Error('Report not ready');
    }
    return evaluation.kpiReport;
  }

  private createEnvironment(): EvaluationEnvironment {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 60);
    return {
      id: randomUUID(),
      status: 'provisioning',
      sandboxed: true,
      billingTags: {
        environment: 'self-serve-eval',
        tier: 'trial',
      },
      createdAt: now,
      expiresAt,
    };
  }

  private estimateRuntime(scenario: string, runs: number): number {
    const base = 10;
    const complexity = scenario.split(' ').length;
    return Math.min(60, base + complexity + runs * 5);
  }

  private estimateDataScan(tier: string): number {
    return tier === 'trial' ? 250 : 500;
  }

  private generateReport(evaluation: EvaluationRecord, run: EvaluationRun): KPIReport {
    const timeToFirstInsightMinutes = Math.max(5, Math.round(run.runtimeMinutes * 0.4));
    const successProbability = Math.min(0.99, 0.7 + evaluation.runs.length * 0.05);
    const latencyP95Ms = 1200 - evaluation.runs.length * 50;
    const guidedSuggestions = this.buildSuggestions(run, successProbability, latencyP95Ms, evaluation);

    return {
      evaluationId: evaluation.id,
      timeToFirstInsightMinutes,
      successProbability: parseFloat(successProbability.toFixed(2)),
      latencyP95Ms,
      dataScannedMb: run.dataScannedMb,
      guidedSuggestions,
      notes: 'Self-serve evaluation completed with sandboxed isolation and auditable provisioning.',
    };
  }

  private buildSuggestions(
    run: EvaluationRun,
    successProbability: number,
    latencyP95Ms: number,
    evaluation: EvaluationRecord,
  ): GuidedSuggestion[] {
    const suggestions: GuidedSuggestion[] = [];
    if (successProbability < 0.85) {
      suggestions.push({
        title: 'Increase success probability',
        recommendation: 'Enable guided tuning with curated seed data and rerun the scenario.',
        rationale: 'Success probability below 85% triggers guided tuning recommendations.',
      });
    }

    if (latencyP95Ms > 900) {
      suggestions.push({
        title: 'Optimize latency',
        recommendation: 'Reduce connector fan-out and prefetch entities to cut p95 latency.',
        rationale: 'High p95 latency degrades time-to-value for evaluators.',
      });
    }

    if (run.dataScannedMb > 400) {
      suggestions.push({
        title: 'Constrain data scans',
        recommendation: 'Apply tighter filters and enable incremental retrieval for demos.',
        rationale: 'Data scan budget protects shared tenancy in self-serve mode.',
      });
    }

    suggestions.push(...this.certifyConnectors(Object.keys(evaluation.environment.billingTags)));
    return suggestions;
  }
}
