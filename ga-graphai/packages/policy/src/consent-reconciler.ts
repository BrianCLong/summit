import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import type {
  ConsentAuditRecord,
  ConsentConflict,
  ConsentIntegrationModule,
  ConsentReconcilerConfig,
  ConsentResolution,
  ConsentResolutionStrategy,
  ConsentSourceRef,
  ConsentState,
  ConsentStateEnvelope,
  ConsentStateStatus,
  ConsentTopologySnapshot,
  ConsentValidationReport,
  ConsentValidationReportEntry,
  ConsentValidationScenario,
} from 'common-types';

const DEFAULT_STATUS_ORDER: readonly ConsentStateStatus[] = [
  'denied',
  'revoked',
  'expired',
  'granted',
];

type MutableStatusTally = Record<ConsentStateStatus, number>;

type CandidatePool = Map<string, ConsentStateEnvelope>;

function composeSubjectKey(subjectId: string, policyId: string): string {
  return `${subjectId}::${policyId}`;
}

function composeSourceKey(source: ConsentSourceRef): string {
  const endpoint = source.endpoint ?? '*';
  const environment = source.environment ?? '*';
  const topology = source.topologyPath?.join('/') ?? '*';
  return `${source.domain}::${source.service}::${endpoint}::${environment}::${topology}`;
}

function cloneState(state: ConsentState): ConsentState {
  return {
    ...state,
    scopes: [...state.scopes],
    overrides: state.overrides ? [...state.overrides] : undefined,
    metadata: state.metadata ? { ...state.metadata } : undefined,
  };
}

function cloneSource(source: ConsentSourceRef): ConsentSourceRef {
  return {
    ...source,
    topologyPath: source.topologyPath ? [...source.topologyPath] : undefined,
  };
}

function cloneEnvelope(envelope: ConsentStateEnvelope): ConsentStateEnvelope {
  return {
    state: cloneState(envelope.state),
    source: cloneSource(envelope.source),
    policyBinding: { ...envelope.policyBinding },
    evidence: envelope.evidence ? [...envelope.evidence] : undefined,
  };
}

function cloneConflict(conflict: ConsentConflict): ConsentConflict {
  return {
    ...conflict,
    candidates: conflict.candidates.map((candidate) =>
      cloneEnvelope(candidate),
    ),
    resolvedState: conflict.resolvedState
      ? cloneState(conflict.resolvedState)
      : undefined,
  };
}

function cloneResolution(resolution: ConsentResolution): ConsentResolution {
  return {
    finalState: cloneState(resolution.finalState),
    conflict: resolution.conflict
      ? cloneConflict(resolution.conflict)
      : undefined,
    adoptedFrom: cloneSource(resolution.adoptedFrom),
    appliedOverrides: [...resolution.appliedOverrides],
  };
}

function canonicalizeScopes(scopes: readonly string[]): string {
  return [...scopes].sort().join('|');
}

function calculateStatusPriority(
  status: ConsentStateStatus,
  priority: Map<ConsentStateStatus, number>,
  fallback: number,
): number {
  return priority.get(status) ?? fallback;
}

export class ConsentStateReconciler {
  private readonly statusOrder: readonly ConsentStateStatus[];

  private readonly statusPriority: Map<ConsentStateStatus, number>;

  private readonly conflictStrategy: ConsentResolutionStrategy;

  private readonly sourceWeights: Readonly<Record<string, number>>;

  private readonly clock: () => Date;

  private readonly pools = new Map<string, CandidatePool>();

  private readonly resolutions = new Map<string, ConsentResolution>();

  private readonly conflicts = new Map<string, ConsentConflict>();

  private readonly auditLog: ConsentAuditRecord[] = [];

  private readonly modules = new Map<string, ConsentIntegrationModule>();

  private readonly events = new EventEmitter();

  constructor(private readonly config: ConsentReconcilerConfig = {}) {
    this.statusOrder = config.strictStatusOrder ?? DEFAULT_STATUS_ORDER;
    this.statusPriority = new Map(
      this.statusOrder.map(
        (status, index) =>
          [status, index] satisfies [ConsentStateStatus, number],
      ),
    );
    this.conflictStrategy = config.conflictStrategy ?? 'prefer-strictest';
    this.sourceWeights = config.sourceWeights ?? {};
    this.clock = config.clock ?? (() => new Date());
  }

  registerModule(module: ConsentIntegrationModule): () => void {
    this.modules.set(module.name, module);
    return () => {
      this.modules.delete(module.name);
    };
  }

  async ingest(envelope: ConsentStateEnvelope): Promise<ConsentResolution> {
    const key = composeSubjectKey(
      envelope.state.subjectId,
      envelope.state.policyId,
    );
    const pool = this.pools.get(key) ?? new Map<string, ConsentStateEnvelope>();
    pool.set(composeSourceKey(envelope.source), cloneEnvelope(envelope));
    this.pools.set(key, pool);

    this.recordAudit(
      'ingest',
      envelope.state.subjectId,
      envelope.state.policyId,
      {
        source: envelope.source,
        status: envelope.state.status,
        version: envelope.state.version,
      },
    );

    const candidates = [...pool.values()];
    const conflict = this.createConflict(candidates);

    if (conflict) {
      this.conflicts.set(key, conflict);
      this.recordAudit(
        'conflict-generated',
        conflict.subjectId,
        conflict.policyId,
        {
          severity: conflict.severity,
          reason: conflict.reason,
          candidateCount: conflict.candidates.length,
        },
      );
    } else {
      this.conflicts.delete(key);
    }

    const resolution = this.createResolution(candidates, conflict);
    this.resolutions.set(key, resolution);

    this.recordAudit(
      'auto-resolution',
      resolution.finalState.subjectId,
      resolution.finalState.policyId,
      {
        adoptedFrom: resolution.adoptedFrom,
        status: resolution.finalState.status,
        appliedOverrides: resolution.appliedOverrides,
      },
    );

    await this.syncModules(resolution);

    const broadcast = cloneResolution(resolution);
    this.events.emit('resolution', broadcast);
    return broadcast;
  }

  getResolution(
    subjectId: string,
    policyId: string,
  ): ConsentResolution | undefined {
    const resolution = this.resolutions.get(
      composeSubjectKey(subjectId, policyId),
    );
    return resolution ? cloneResolution(resolution) : undefined;
  }

  getConflict(
    subjectId: string,
    policyId: string,
  ): ConsentConflict | undefined {
    const conflict = this.conflicts.get(composeSubjectKey(subjectId, policyId));
    return conflict ? cloneConflict(conflict) : undefined;
  }

  listConflicts(): ConsentConflict[] {
    return Array.from(this.conflicts.values()).map((current) =>
      cloneConflict(current),
    );
  }

  getAuditLog(): ConsentAuditRecord[] {
    return this.auditLog.map((record) => ({
      ...record,
      details: { ...record.details },
    }));
  }

  getTopologySnapshot(): ConsentTopologySnapshot {
    const tallies = new Map<
      string,
      {
        domain: string;
        service: string;
        endpoint?: string;
        environment?: string;
        topologyPath?: readonly string[];
        totalSubjects: number;
        statuses: MutableStatusTally;
      }
    >();
    for (const resolution of this.resolutions.values()) {
      const adoptedFrom = resolution.adoptedFrom;
      const nodeKey = composeSourceKey(adoptedFrom);
      let node = tallies.get(nodeKey);
      if (!node) {
        node = {
          domain: adoptedFrom.domain,
          service: adoptedFrom.service,
          endpoint: adoptedFrom.endpoint,
          environment: adoptedFrom.environment,
          topologyPath: adoptedFrom.topologyPath
            ? [...adoptedFrom.topologyPath]
            : undefined,
          totalSubjects: 0,
          statuses: { granted: 0, denied: 0, revoked: 0, expired: 0 },
        };
        tallies.set(nodeKey, node);
      }
      node.totalSubjects += 1;
      node.statuses[resolution.finalState.status] += 1;
    }

    const nodes = Array.from(tallies.values()).map((node) => ({
      domain: node.domain,
      service: node.service,
      endpoint: node.endpoint,
      environment: node.environment,
      topologyPath: node.topologyPath ? [...node.topologyPath] : undefined,
      totalSubjects: node.totalSubjects,
      statuses: { ...node.statuses } as Readonly<
        Record<ConsentStateStatus, number>
      >,
    }));

    return {
      generatedAt: this.clock().toISOString(),
      nodes,
    };
  }

  subscribe(listener: (resolution: ConsentResolution) => void): () => void {
    const handler = (resolution: ConsentResolution) =>
      listener(cloneResolution(resolution));
    this.events.on('resolution', handler);
    return () => {
      this.events.off('resolution', handler);
    };
  }

  async runValidation(
    scenarios: readonly ConsentValidationScenario[],
  ): Promise<ConsentValidationReport> {
    const entries: ConsentValidationReportEntry[] = [];
    for (const scenario of scenarios) {
      const harness = new ConsentStateReconciler(this.config);
      for (const module of this.modules.values()) {
        harness.registerModule(module);
      }
      for (const setup of scenario.setup) {
        await harness.ingest(setup);
      }
      const expectation = scenario.expectation;
      const resolution = harness.getResolution(
        expectation.subjectId,
        expectation.policyId,
      );
      const conflict = harness.getConflict(
        expectation.subjectId,
        expectation.policyId,
      );
      const actualStatus = resolution?.finalState.status;
      const actualConflicts = conflict ? 1 : 0;
      const expectedConflicts =
        expectation.expectedConflicts ?? actualConflicts;
      const passed =
        actualStatus === expectation.expectedStatus &&
        actualConflicts === expectedConflicts;

      entries.push({
        scenarioId: scenario.id,
        passed,
        actualStatus,
        actualConflicts,
        details: {
          description: scenario.description,
          expectedStatus: expectation.expectedStatus,
          expectedConflicts,
          notes: scenario.notes,
        },
      });

      this.recordAudit(
        'validation',
        expectation.subjectId,
        expectation.policyId,
        {
          scenarioId: scenario.id,
          passed,
          actualStatus,
          actualConflicts,
        },
      );
    }

    return {
      generatedAt: this.clock().toISOString(),
      scenarios: entries,
    };
  }

  private createConflict(
    candidates: ConsentStateEnvelope[],
  ): ConsentConflict | undefined {
    if (candidates.length <= 1) {
      return undefined;
    }

    const statusSet = new Set<ConsentStateStatus>();
    const scopeSet = new Set<string>();
    const jurisdictionSet = new Set<string>();
    const versionSet = new Set<number>();

    for (const candidate of candidates) {
      statusSet.add(candidate.state.status);
      scopeSet.add(canonicalizeScopes(candidate.state.scopes));
      jurisdictionSet.add(candidate.state.jurisdiction);
      versionSet.add(candidate.state.version);
    }

    const statusMismatch = statusSet.size > 1;
    const scopeMismatch = scopeSet.size > 1;
    const jurisdictionMismatch = jurisdictionSet.size > 1;
    const versionMismatch = versionSet.size > 1;

    if (
      !statusMismatch &&
      !scopeMismatch &&
      !jurisdictionMismatch &&
      !versionMismatch
    ) {
      return undefined;
    }

    const reasonParts: string[] = [];
    if (statusMismatch) {
      reasonParts.push(
        `status mismatch: ${Array.from(statusSet).join(' vs ')}`,
      );
    }
    if (scopeMismatch) {
      reasonParts.push('scope divergence across sources');
    }
    if (jurisdictionMismatch) {
      reasonParts.push('jurisdiction mismatch');
    }
    if (versionMismatch) {
      reasonParts.push('policy version skew');
    }

    const severity: ConsentConflict['severity'] = statusMismatch
      ? 'error'
      : scopeMismatch
        ? 'warning'
        : 'info';

    return {
      subjectId: candidates[0].state.subjectId,
      policyId: candidates[0].state.policyId,
      severity,
      reason: reasonParts.join('; '),
      candidates: candidates.map((candidate) => cloneEnvelope(candidate)),
    };
  }

  private createResolution(
    candidates: ConsentStateEnvelope[],
    conflict: ConsentConflict | undefined,
  ): ConsentResolution {
    const selected = this.selectCandidate(candidates);
    const finalState = cloneState(selected.state);
    const adoptedFrom = cloneSource(selected.source);
    const resolution: ConsentResolution = {
      finalState,
      conflict: conflict
        ? { ...conflict, resolvedState: finalState }
        : undefined,
      adoptedFrom,
      appliedOverrides: selected.state.overrides
        ? [...selected.state.overrides]
        : [],
    };
    return resolution;
  }

  private selectCandidate(
    candidates: ConsentStateEnvelope[],
  ): ConsentStateEnvelope {
    if (candidates.length === 1) {
      return candidates[0];
    }

    const ranked = candidates.slice();
    switch (this.conflictStrategy) {
      case 'prefer-latest':
        ranked.sort((a, b) => this.compareLatest(a, b));
        break;
      case 'prefer-source-weight':
        ranked.sort((a, b) => {
          const weightDiff =
            this.getSourceWeight(b.source) - this.getSourceWeight(a.source);
          if (weightDiff !== 0) {
            return weightDiff;
          }
          return this.compareStrictest(a, b);
        });
        break;
      case 'prefer-strictest':
      default:
        ranked.sort((a, b) => this.compareStrictest(a, b));
        break;
    }
    return ranked[0];
  }

  private compareStrictest(
    a: ConsentStateEnvelope,
    b: ConsentStateEnvelope,
  ): number {
    const fallback = this.statusOrder.length;
    const priorityDiff =
      calculateStatusPriority(a.state.status, this.statusPriority, fallback) -
      calculateStatusPriority(b.state.status, this.statusPriority, fallback);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    if (b.state.version !== a.state.version) {
      return b.state.version - a.state.version;
    }
    return (
      new Date(b.state.updatedAt).getTime() -
      new Date(a.state.updatedAt).getTime()
    );
  }

  private compareLatest(
    a: ConsentStateEnvelope,
    b: ConsentStateEnvelope,
  ): number {
    const updatedDiff =
      new Date(b.state.updatedAt).getTime() -
      new Date(a.state.updatedAt).getTime();
    if (updatedDiff !== 0) {
      return updatedDiff;
    }
    return b.state.version - a.state.version;
  }

  private getSourceWeight(source: ConsentSourceRef): number {
    const directKey = composeSourceKey(source);
    if (directKey in this.sourceWeights) {
      return this.sourceWeights[directKey] ?? 0;
    }
    return this.sourceWeights[source.domain] ?? 0;
  }

  private recordAudit(
    action: ConsentAuditRecord['action'],
    subjectId: string,
    policyId: string,
    details: Record<string, unknown>,
  ): void {
    this.auditLog.push({
      eventId: randomUUID(),
      timestamp: this.clock().toISOString(),
      action,
      subjectId,
      policyId,
      details,
    });
  }

  private async syncModules(resolution: ConsentResolution): Promise<void> {
    if (this.modules.size === 0) {
      return;
    }
    const invoked: string[] = [];
    const tasks: Promise<void>[] = [];
    for (const module of this.modules.values()) {
      if (
        module.supportedDomains.length > 0 &&
        !module.supportedDomains.includes(resolution.adoptedFrom.domain)
      ) {
        continue;
      }
      invoked.push(module.name);
      const result = module.sync(
        cloneResolution(resolution),
        this.getAuditLog(),
      );
      if (result instanceof Promise) {
        tasks.push(result);
      }
    }
    if (tasks.length > 0) {
      await Promise.all(tasks);
    }
    if (invoked.length > 0) {
      this.recordAudit(
        'module-sync',
        resolution.finalState.subjectId,
        resolution.finalState.policyId,
        {
          modules: invoked,
        },
      );
    }
  }
}
