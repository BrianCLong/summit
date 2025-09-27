import { createHash, randomUUID } from 'crypto';

type TargetType = 'models' | 'tools' | 'routes';

export interface ECCPolicyRequest {
  blocklist?: string[] | string;
  cachePurge?: string[] | string;
}

export interface ECCKillRequest {
  models?: string[] | string;
  tools?: string[] | string;
  routes?: string[] | string;
  artifacts?: string[] | string;
  policy?: ECCPolicyRequest;
  initiatedBy?: string;
  slaMs?: number;
  reason?: string;
}

export interface ECCActionTimelineEntry {
  action: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface ECCRollbackPlan {
  steps: string[];
  ready: boolean;
  initiatedBy: string;
  generatedAt: string;
}

export interface ECCKillResponse {
  ok: true;
  actionId: string;
  timeline: ECCActionTimelineEntry[];
  signature: string;
  rollbackPlan: ECCRollbackPlan;
  slaMet: boolean;
}

export interface ECCRollbackResponse {
  ok: true;
  actionId: string;
  timeline: ECCActionTimelineEntry[];
  signature: string;
  restoredState: ECCSerializedState;
  alreadyRolledBack?: boolean;
}

interface ECCPolicyNormalized {
  blocklist: string[];
  cachePurge: string[];
}

interface ECCNormalizedRequest {
  models: string[];
  tools: string[];
  routes: string[];
  artifacts: string[];
  policy: ECCPolicyNormalized;
  initiatedBy: string;
  slaMs: number;
  reason: string;
}

interface ECCStateSnapshot {
  disabled: Record<TargetType, string[]>;
  quarantinedArtifacts: string[];
  blocklist: string[];
  cachePurges: string[];
}

interface ECCState {
  disabled: Record<TargetType, Set<string>>;
  quarantinedArtifacts: Set<string>;
  blocklist: Set<string>;
  cachePurges: Set<string>;
  activeActions: Set<string>;
}

export interface ECCSerializedState {
  disabled: Record<TargetType, string[]>;
  quarantinedArtifacts: string[];
  blocklist: string[];
  cachePurges: string[];
  activeActions: string[];
}

interface ECCActionRecord {
  actionId: string;
  previousState: ECCStateSnapshot;
  timeline: ECCActionTimelineEntry[];
  signature: string;
  slaMs: number;
  initiatedBy: string;
  startedAt: number;
  completedAt: number;
  rolledBack: boolean;
  reason: string;
}

export interface ECCValidationResult {
  allowed: boolean;
  reason?: string;
  enforcedBy?: string;
}

const DEFAULT_SLA_MS = 500;

function toIso(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

export class EmergencyContainmentController {
  private readonly signingSecret: string;
  private readonly history = new Map<string, ECCActionRecord>();
  private state: ECCState = this.buildEmptyState();

  constructor(secret?: string) {
    this.signingSecret = secret || process.env.ECC_SIGNING_SECRET || 'summit-ecc-signing-secret';
  }

  executeKillPlan(request: ECCKillRequest): ECCKillResponse {
    const normalized = this.normalizeRequest(request);

    if (
      normalized.models.length === 0 &&
      normalized.tools.length === 0 &&
      normalized.routes.length === 0 &&
      normalized.artifacts.length === 0 &&
      normalized.policy.blocklist.length === 0 &&
      normalized.policy.cachePurge.length === 0
    ) {
      throw new Error('No targets provided for emergency containment');
    }

    const actionId = randomUUID();
    const startedAt = Date.now();
    const timeline: ECCActionTimelineEntry[] = [];
    const previousState = this.snapshotState();

    timeline.push({
      action: 'action_initiated',
      timestamp: toIso(startedAt),
      details: {
        actionId,
        initiatedBy: normalized.initiatedBy,
        reason: normalized.reason,
        slaMs: normalized.slaMs,
      },
    });

    const disabledDetails = this.disableTargets(normalized, actionId);
    timeline.push({
      action: 'targets_disabled',
      timestamp: toIso(Date.now()),
      details: disabledDetails,
    });

    const drainResult = this.drainTraffic(disabledDetails, normalized.slaMs);
    timeline.push({
      action: 'traffic_drained',
      timestamp: toIso(drainResult.completedAt),
      details: drainResult,
    });

    const quarantinedArtifacts = this.quarantineArtifacts(normalized.artifacts, actionId);
    timeline.push({
      action: 'artifacts_quarantined',
      timestamp: toIso(Date.now()),
      details: { artifacts: quarantinedArtifacts },
    });

    const policyResult = this.applyPolicy(normalized.policy, actionId);
    timeline.push({
      action: 'compensating_policy_applied',
      timestamp: toIso(Date.now()),
      details: policyResult,
    });

    const completedAt = Date.now();
    const slaMet = completedAt - startedAt <= normalized.slaMs;
    timeline.push({
      action: 'containment_completed',
      timestamp: toIso(completedAt),
      details: {
        completedInMs: completedAt - startedAt,
        slaMs: normalized.slaMs,
        slaMet,
      },
    });

    const signature = this.signTimeline(actionId, timeline);
    const rollbackPlan = this.buildRollbackPlan(actionId, previousState, normalized.initiatedBy);

    this.history.set(actionId, {
      actionId,
      previousState,
      timeline,
      signature,
      slaMs: normalized.slaMs,
      initiatedBy: normalized.initiatedBy,
      startedAt,
      completedAt,
      rolledBack: false,
      reason: normalized.reason,
    });
    this.state.activeActions.add(actionId);

    return {
      ok: true,
      actionId,
      timeline,
      signature,
      rollbackPlan,
      slaMet,
    };
  }

  rollback(actionId: string, initiatedBy: string): ECCRollbackResponse {
    const record = this.history.get(actionId);
    if (!record) {
      throw new Error('Action not found');
    }

    const startedAt = Date.now();
    const timeline: ECCActionTimelineEntry[] = [
      {
        action: 'rollback_initiated',
        timestamp: toIso(startedAt),
        details: { actionId, initiatedBy },
      },
    ];

    if (record.rolledBack) {
      timeline.push({
        action: 'rollback_skipped',
        timestamp: toIso(Date.now()),
        details: { reason: 'already_rolled_back' },
      });
      return {
        ok: true,
        actionId,
        timeline,
        signature: this.signTimeline(`${actionId}:rollback`, timeline),
        restoredState: this.serializeState(),
        alreadyRolledBack: true,
      };
    }

    this.restoreState(record.previousState);
    this.state.activeActions.delete(actionId);

    const completedAt = Date.now();
    timeline.push({
      action: 'state_restored',
      timestamp: toIso(completedAt),
      details: {
        restoredModels: record.previousState.disabled.models,
        restoredTools: record.previousState.disabled.tools,
        restoredRoutes: record.previousState.disabled.routes,
        restoredArtifacts: record.previousState.quarantinedArtifacts,
      },
    });
    timeline.push({
      action: 'rollback_completed',
      timestamp: toIso(completedAt),
      details: { completedInMs: completedAt - startedAt },
    });

    record.rolledBack = true;
    this.history.set(actionId, record);

    return {
      ok: true,
      actionId,
      timeline,
      signature: this.signTimeline(`${actionId}:rollback`, timeline),
      restoredState: this.serializeState(),
    };
  }

  getStatus(): ECCSerializedState {
    return this.serializeState();
  }

  validateTarget(type: 'model' | 'tool' | 'route' | 'artifact', name: string): ECCValidationResult {
    const trimmed = name.trim();
    if (!trimmed) {
      return { allowed: false, reason: 'empty_name' };
    }

    if (type === 'artifact') {
      if (this.state.quarantinedArtifacts.has(trimmed)) {
        return { allowed: false, reason: 'quarantined_artifact', enforcedBy: 'ecc' };
      }
      return { allowed: true };
    }

    const map: Record<'model' | 'tool' | 'route', TargetType> = {
      model: 'models',
      tool: 'tools',
      route: 'routes',
    };
    const targetType = map[type];
    if (this.state.disabled[targetType].has(trimmed)) {
      return { allowed: false, reason: `disabled_${type}`, enforcedBy: 'ecc' };
    }
    if (type === 'tool' && this.state.blocklist.has(trimmed)) {
      return { allowed: false, reason: 'blocklisted_tool', enforcedBy: 'ecc_policy' };
    }

    return { allowed: true };
  }

  private buildEmptyState(): ECCState {
    return {
      disabled: {
        models: new Set<string>(),
        tools: new Set<string>(),
        routes: new Set<string>(),
      },
      quarantinedArtifacts: new Set<string>(),
      blocklist: new Set<string>(),
      cachePurges: new Set<string>(),
      activeActions: new Set<string>(),
    };
  }

  private normalizeRequest(request: ECCKillRequest): ECCNormalizedRequest {
    return {
      models: this.normalizeList(request.models),
      tools: this.normalizeList(request.tools),
      routes: this.normalizeList(request.routes),
      artifacts: this.normalizeList(request.artifacts),
      policy: {
        blocklist: this.normalizeList(request.policy?.blocklist),
        cachePurge: this.normalizeList(request.policy?.cachePurge),
      },
      initiatedBy: request.initiatedBy?.trim() || 'unknown',
      slaMs: request.slaMs && request.slaMs > 0 ? request.slaMs : DEFAULT_SLA_MS,
      reason: request.reason?.trim() || 'emergency containment',
    };
  }

  private normalizeList(input?: string[] | string): string[] {
    if (!input) {
      return [];
    }
    const parts = Array.isArray(input)
      ? input
      : String(input)
          .split(/[\n,]/)
          .map((value) => value.trim())
          .filter(Boolean);

    const normalized = parts
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    return Array.from(new Set(normalized));
  }

  private disableTargets(request: ECCNormalizedRequest, actionId: string) {
    const details: Record<TargetType, string[]> = {
      models: [],
      tools: [],
      routes: [],
    };

    (['models', 'tools', 'routes'] as TargetType[]).forEach((type) => {
      for (const name of request[type]) {
        this.state.disabled[type].add(name);
        details[type].push(name);
      }
    });

    return { actionId, disabled: details };
  }

  private drainTraffic(disabledDetails: { disabled: Record<TargetType, string[]> }, slaMs: number) {
    const startedAt = Date.now();
    const targets = Object.values(disabledDetails.disabled).flat();
    const completedAt = Date.now();
    return {
      startedAt,
      completedAt,
      drained: targets,
      deadline: startedAt + slaMs,
      withinSla: completedAt - startedAt <= slaMs,
    };
  }

  private quarantineArtifacts(artifacts: string[], actionId: string): string[] {
    const quarantined: string[] = [];
    for (const artifact of artifacts) {
      this.state.quarantinedArtifacts.add(artifact);
      quarantined.push(artifact);
    }
    return quarantined;
  }

  private applyPolicy(policy: ECCPolicyNormalized, actionId: string) {
    const applied = {
      blocklist: [] as string[],
      cachePurge: [] as string[],
      actionId,
    };

    for (const item of policy.blocklist) {
      this.state.blocklist.add(item);
      applied.blocklist.push(item);
    }

    for (const item of policy.cachePurge) {
      this.state.cachePurges.add(item);
      applied.cachePurge.push(item);
    }

    return applied;
  }

  private signTimeline(actionId: string, timeline: ECCActionTimelineEntry[]): string {
    const payload = JSON.stringify({ actionId, timeline });
    return createHash('sha256').update(`${this.signingSecret}:${payload}`).digest('hex');
  }

  private buildRollbackPlan(actionId: string, snapshot: ECCStateSnapshot, initiatedBy: string): ECCRollbackPlan {
    const steps: string[] = [
      'Capture signed containment timeline',
      `Restore models: ${snapshot.disabled.models.join(', ') || 'none'}`,
      `Restore tools: ${snapshot.disabled.tools.join(', ') || 'none'}`,
      `Restore routes: ${snapshot.disabled.routes.join(', ') || 'none'}`,
      `Release artifacts: ${snapshot.quarantinedArtifacts.join(', ') || 'none'}`,
      `Rebuild cache entries: ${snapshot.cachePurges.join(', ') || 'none'}`,
      `Remove blocklist entries: ${snapshot.blocklist.join(', ') || 'none'}`,
      'Re-validate policy guards',
    ];

    return {
      steps,
      ready: true,
      initiatedBy,
      generatedAt: toIso(Date.now()),
    };
  }

  private snapshotState(): ECCStateSnapshot {
    return {
      disabled: {
        models: Array.from(this.state.disabled.models),
        tools: Array.from(this.state.disabled.tools),
        routes: Array.from(this.state.disabled.routes),
      },
      quarantinedArtifacts: Array.from(this.state.quarantinedArtifacts),
      blocklist: Array.from(this.state.blocklist),
      cachePurges: Array.from(this.state.cachePurges),
    };
  }

  private restoreState(snapshot: ECCStateSnapshot): void {
    this.state = this.buildEmptyState();
    snapshot.disabled.models.forEach((value) => this.state.disabled.models.add(value));
    snapshot.disabled.tools.forEach((value) => this.state.disabled.tools.add(value));
    snapshot.disabled.routes.forEach((value) => this.state.disabled.routes.add(value));
    snapshot.quarantinedArtifacts.forEach((value) => this.state.quarantinedArtifacts.add(value));
    snapshot.blocklist.forEach((value) => this.state.blocklist.add(value));
    snapshot.cachePurges.forEach((value) => this.state.cachePurges.add(value));
  }

  private serializeState(): ECCSerializedState {
    return {
      disabled: {
        models: Array.from(this.state.disabled.models).sort(),
        tools: Array.from(this.state.disabled.tools).sort(),
        routes: Array.from(this.state.disabled.routes).sort(),
      },
      quarantinedArtifacts: Array.from(this.state.quarantinedArtifacts).sort(),
      blocklist: Array.from(this.state.blocklist).sort(),
      cachePurges: Array.from(this.state.cachePurges).sort(),
      activeActions: Array.from(this.state.activeActions).sort(),
    };
  }
}

