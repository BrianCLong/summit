import { ConnectorObservability } from "./observability";
import { SecretVault } from "./secretVault";
import {
  ConnectorMetadata,
  ConnectorResult,
  HealthStatus,
  RetryPolicy,
  SandboxMode,
  IntegrationKind,
} from "./types";

export interface IntegrationAdapter {
  testConnection(): Promise<ConnectorResult>;
  pull?(params?: Record<string, unknown>): Promise<ConnectorResult>;
  push?(payload: Record<string, unknown>): Promise<ConnectorResult>;
  onEvent?(event: Record<string, unknown>): Promise<ConnectorResult>;
}

export type ConnectorRuntimeOptions = {
  retryPolicy: RetryPolicy;
  sandboxMode?: SandboxMode;
};

export type ConnectorState = {
  metadata: ConnectorMetadata;
  adapter: IntegrationAdapter;
  health: HealthStatus;
  sandboxMode: SandboxMode;
  retries: number;
  lastRun?: number;
  deprecated?: boolean;
};

export class ConnectorRuntime {
  private connectors: Map<string, ConnectorState> = new Map();
  private observability: ConnectorObservability;
  private secretVault: SecretVault;
  private migrationTargets: Set<string> = new Set();

  constructor(observability = new ConnectorObservability(), vault = new SecretVault()) {
    this.observability = observability;
    this.secretVault = vault;
  }

  registerConnector(
    metadata: ConnectorMetadata,
    adapter: IntegrationAdapter,
    options: ConnectorRuntimeOptions
  ) {
    this.connectors.set(metadata.id, {
      metadata,
      adapter,
      health: "degraded",
      sandboxMode: options.sandboxMode ?? "live",
      retries: options.retryPolicy.attempts,
    });
  }

  addSecret(connectorId: string, key: string, value: string) {
    return this.secretVault.setSecret(connectorId, key, value);
  }

  rotateSecret(connectorId: string, key: string, value: string) {
    return this.secretVault.rotateSecret(connectorId, key, value);
  }

  async execute(connectorId: string, payload?: Record<string, unknown>): Promise<ConnectorResult> {
    const state = this.connectors.get(connectorId);
    if (!state) {
      throw new Error(`Connector ${connectorId} not found`);
    }
    const start = Date.now();
    const policy = { attempts: state.retries, backoffMs: 200 };
    let attempt = 0;
    while (attempt < policy.attempts) {
      attempt += 1;
      try {
        const result = await this.runAdapter(state, payload);
        if (result.success) {
          this.observability.recordSuccess(connectorId, Date.now() - start);
          state.health = "connected";
          state.lastRun = Date.now();
          return result;
        }
        throw result.error ?? new Error("Unknown connector failure");
      } catch (error) {
        this.observability.recordFailure(connectorId);
        if (attempt >= policy.attempts) {
          state.health = "failing";
          return { success: false, error: error as Error };
        }
        await new Promise((resolve) => setTimeout(resolve, policy.backoffMs * attempt));
      }
    }
    state.health = "failing";
    return { success: false, error: new Error("Exhausted attempts") };
  }

  private async runAdapter(
    state: ConnectorState,
    payload?: Record<string, unknown>
  ): Promise<ConnectorResult> {
    const adapter = state.adapter;
    if (state.sandboxMode === "sandbox" && state.metadata.sandboxFixtures) {
      return { success: true, data: state.metadata.sandboxFixtures };
    }
    if (adapter.pull && (state.metadata.kind === "pull" || state.metadata.kind === "file-based")) {
      return adapter.pull(payload);
    }
    if (
      adapter.push &&
      (state.metadata.kind === "push" || state.metadata.kind === "event-driven")
    ) {
      return adapter.push(payload ?? {});
    }
    if (adapter.onEvent && state.metadata.kind === "event-driven") {
      return adapter.onEvent(payload ?? {});
    }
    throw new Error(`No adapter method available for kind ${state.metadata.kind}`);
  }

  pause(connectorId: string) {
    const state = this.connectors.get(connectorId);
    if (!state) throw new Error(`Connector ${connectorId} not found`);
    state.health = "paused";
    this.observability.pause(connectorId);
  }

  health(connectorId: string) {
    return this.connectors.get(connectorId)?.health ?? "failing";
  }

  listInventory() {
    return [...this.connectors.values()].map(({ metadata, health }) => ({ metadata, health }));
  }

  migrateOneOff(connectorId: string) {
    const state = this.connectors.get(connectorId);
    if (!state) throw new Error(`Connector ${connectorId} not found`);
    state.deprecated = true;
    this.migrationTargets.add(connectorId);
  }

  migrationDebtScore() {
    const total = this.connectors.size;
    const deprecated = [...this.connectors.values()].filter((state) => state.deprecated).length;
    return total === 0 ? 0 : 1 - deprecated / total;
  }

  auditedSecrets() {
    return this.secretVault.audit();
  }

  ensureFrameworkCompliance(metadata: ConnectorMetadata) {
    const supportedKinds: IntegrationKind[] = [
      "pull",
      "push",
      "event-driven",
      "file-based",
      "human-in-the-loop",
    ];
    if (!supportedKinds.includes(metadata.kind)) {
      throw new Error(`Unsupported integration kind ${metadata.kind}`);
    }
    if (!metadata.contract.idempotency.idempotencyKeyHeader) {
      throw new Error("Missing idempotency contract");
    }
  }

  async testConnection(connectorId: string) {
    const state = this.connectors.get(connectorId);
    if (!state) throw new Error(`Connector ${connectorId} not found`);
    return state.adapter.testConnection();
  }

  audit() {
    return this.listInventory().map(({ metadata, health }) => ({
      connectorId: metadata.id,
      health,
      owner: metadata.owner,
      contractVersion: metadata.contract.versioning.current,
      lastRun: this.connectors.get(metadata.id)?.lastRun,
    }));
  }
}
