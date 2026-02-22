import { FcrSchemaValidator } from './schema-validator.js';
import { FcrPrivacyBudgetService } from './privacy-budget-service.js';
import { FcrCredentialScorer } from './credential-scorer.js';
import { FcrClusteringService } from './clustering-service.js';
import { FcrEarlyWarningService } from './early-warning-service.js';
import { FcrResponsePackService } from './response-pack-service.js';
import {
  recordFcrAlert,
  recordFcrClusters,
  recordFcrIngest,
} from '../../provenance/fcr-ledger.js';
import { FcrAlert, FcrCluster, FcrSignal } from './types.js';

export class FcrService {
  private validator = new FcrSchemaValidator();
  private privacyBudget = new FcrPrivacyBudgetService();
  private scorer = new FcrCredentialScorer();
  private clustering = new FcrClusteringService();
  private warning = new FcrEarlyWarningService();
  private responsePack = new FcrResponsePackService();

  configureTenantBudget(tenantId: string, epsilon: number, delta: number) {
    this.privacyBudget.configureTenantBudget(tenantId, { epsilon, delta });
  }

  async ingestSignals(tenantId: string, signals: FcrSignal[]) {
    if (signals.length === 0) {
      return { ok: false as const, errors: ['Signals payload is empty.'] };
    }
    const validation = await this.validator.validateSignals(signals);
    if (!validation.ok) {
      return { ok: false as const, errors: validation.errors };
    }

    const mismatchedSignals = signals.filter(
      (signal) => signal.tenant_id !== tenantId,
    );
    if (mismatchedSignals.length > 0) {
      return {
        ok: false as const,
        errors: ['Signal tenant_id does not match request tenant_id.'],
      };
    }

    const totalCost = signals.reduce(
      (acc, signal) => ({
        epsilon: acc.epsilon + signal.privacy_budget_cost.epsilon,
        delta: acc.delta + signal.privacy_budget_cost.delta,
      }),
      { epsilon: 0, delta: 0 },
    );

    const budgetResult = this.privacyBudget.consume(tenantId, totalCost);
    if (!budgetResult.ok) {
      return {
        ok: false as const,
        errors: ['Privacy budget exceeded for one or more signals.'],
      };
    }

    const scored = signals.map((signal) => ({
      ...signal,
      confidence_local: this.scorer.scoreSignal(signal).score,
    }));

    await recordFcrIngest(tenantId, scored);
    return { ok: true as const, signals: scored };
  }

  async clusterSignals(tenantId: string, signals: FcrSignal[]) {
    const clusters = this.clustering.clusterSignals(signals);
    await recordFcrClusters(tenantId, clusters);
    return clusters;
  }

  async generateAlerts(tenantId: string, clusters: FcrCluster[]) {
    const alerts = this.warning.evaluateClusters(clusters).map((alert) => ({
      ...alert,
      response_pack: this.responsePack.buildResponsePack(alert),
    }));
    await recordFcrAlert(tenantId, alerts);
    return alerts;
  }

  async runPipeline(tenantId: string, signals: FcrSignal[]) {
    const ingestResult = await this.ingestSignals(tenantId, signals);
    if (!ingestResult.ok) {
      return ingestResult;
    }
    const clusters = await this.clusterSignals(tenantId, ingestResult.signals);
    const alerts = await this.generateAlerts(tenantId, clusters);
    return {
      ok: true as const,
      clusters,
      alerts,
    };
  }
}

export type FcrPipelineResult =
  | { ok: false; errors: string[] }
  | { ok: true; clusters: FcrCluster[]; alerts: FcrAlert[] };
