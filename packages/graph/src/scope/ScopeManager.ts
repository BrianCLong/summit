import { v7 as uuidv7 } from 'uuid';
import { writeScopedEvidence, ScopedEvidence } from '@summit/evidence';

export interface Scope {
  scopeId: string;
  domain: string;
  agentId: string;
  policyId: string;
  datasetSnapshotId: string;
  createdAt: Date;
  status: 'active' | 'closed';
  report: Record<string, any>;
  metrics: Record<string, any>;
}

export class ScopeManager {
  private activeScopes: Map<string, Scope> = new Map();

  createScope(
    domain: string,
    agentId: string,
    policyId: string,
    datasetSnapshotId: string
  ): Scope {
    const scopeId = uuidv7();
    const scope: Scope = {
      scopeId,
      domain,
      agentId,
      policyId,
      datasetSnapshotId,
      createdAt: new Date(),
      status: 'active',
      report: {},
      metrics: {},
    };
    this.activeScopes.set(scopeId, scope);
    return scope;
  }

  getScope(scopeId: string): Scope | undefined {
    return this.activeScopes.get(scopeId);
  }

  async closeScope(scopeId: string, additionalReport: Record<string, any> = {}, additionalMetrics: Record<string, any> = {}): Promise<string> {
    const scope = this.activeScopes.get(scopeId);
    if (!scope) {
      throw new Error(`Scope ${scopeId} not found or already closed`);
    }

    scope.status = 'closed';
    Object.assign(scope.report, additionalReport);
    Object.assign(scope.metrics, additionalMetrics);

    // Generate evidence
    const evidence: ScopedEvidence = {
      domain: scope.domain,
      scopeId: scope.scopeId,
      version: '1.0.0',
      report: scope.report,
      metrics: scope.metrics,
    };

    const evidencePath = await writeScopedEvidence(evidence);
    this.activeScopes.delete(scopeId);

    return evidencePath;
  }

  async withScope<T>(
    domain: string,
    agentId: string,
    policyId: string,
    datasetSnapshotId: string,
    fn: (scope: Scope) => Promise<T>
  ): Promise<T> {
    const scope = this.createScope(domain, agentId, policyId, datasetSnapshotId);
    try {
      const result = await fn(scope);
      await this.closeScope(scope.scopeId);
      return result;
    } catch (error: any) {
      await this.closeScope(scope.scopeId, { error: error.message || String(error) });
      throw error;
    }
  }
}
