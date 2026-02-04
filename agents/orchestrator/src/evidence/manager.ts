import path from 'node:path';
import { OrchestratorEventPayload } from '../types/index.js';
import { EvidenceBundleWriter, EvidenceBundleConfig } from './bundle.js';
import { PlanIR, TraceEvent } from './types.js';

export interface EvidenceManagerConfig {
  enabled?: boolean;
  bundlesDir?: string;
  bundleVersion?: string;
  configFlags?: Record<string, unknown>;
  now?: () => Date;
}

export class EvidenceBundleManager {
  private config: EvidenceManagerConfig;
  private bundles = new Map<string, EvidenceBundleWriter>();
  private now: () => Date;

  constructor(config: EvidenceManagerConfig = {}) {
    this.config = config;
    this.now = config.now ?? (() => new Date());
  }

  isEnabled(): boolean {
    return this.config.enabled ?? true;
  }

  async createBundle(plan: PlanIR, runId: string): Promise<EvidenceBundleWriter | undefined> {
    if (!this.isEnabled()) {
      return undefined;
    }

    const bundlesDir = this.config.bundlesDir ?? path.join(process.cwd(), 'artifacts', 'evidence-bundles');
    const bundleConfig: EvidenceBundleConfig = {
      bundlesDir,
      bundleVersion: this.config.bundleVersion,
      configFlags: this.config.configFlags,
      now: this.config.now,
    };

    const writer = new EvidenceBundleWriter(plan, bundleConfig);
    await writer.initialize();
    this.bundles.set(runId, writer);

    await writer.record({
      type: 'run:started',
      timestamp: this.now().toISOString(),
      run_id: runId,
      plan_id: plan.plan_id,
      data: { goal: plan.goal },
    });

    return writer;
  }

  getBundle(runId: string): EvidenceBundleWriter | undefined {
    return this.bundles.get(runId);
  }

  async recordOrchestratorEvent(payload: OrchestratorEventPayload): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const writer = this.bundles.get(payload.sessionId);
    if (!writer) {
      return;
    }

    const traceEvent: TraceEvent = {
      type: payload.event as TraceEvent['type'],
      timestamp: payload.timestamp.toISOString(),
      run_id: payload.sessionId,
      plan_id: payload.chainId,
      chain_id: payload.chainId,
      step_id: payload.stepId,
      data: payload.data,
    };

    await writer.record(traceEvent);
  }

  async finalize(runId: string, status: 'completed' | 'failed'): Promise<void> {
    const writer = this.bundles.get(runId);
    if (!writer) {
      return;
    }

    await writer.record({
      type: status === 'completed' ? 'run:completed' : 'run:failed',
      timestamp: this.now().toISOString(),
      run_id: runId,
    });

    await writer.finalize();
    this.bundles.delete(runId);
  }
}
