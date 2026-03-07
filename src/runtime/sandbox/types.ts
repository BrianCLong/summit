export type EvidenceId = `EVIDENCE-${string}`;

export type GatewayMode = "direct" | "brokered";

export interface ModelPolicy {
  provider: string;
  gatewayMode: GatewayMode;
}

export interface PersistencePolicy {
  enabled: boolean;
  namespace: string;
  ttlSeconds?: number;
}

export interface RunSpec {
  evidenceId: EvidenceId;
  toolAllowlist: string[];
  requestedTools: string[];
  modelPolicy: ModelPolicy;
  persistence: PersistencePolicy;
}

export interface EvidenceStamp {
  schemaVersion: 1;
  inputsHash: string;
}

export interface EvidenceBundle {
  evidenceId: EvidenceId;
  report: Record<string, unknown>;
  metrics: Record<string, unknown>;
  stamp: EvidenceStamp;
}

export interface ISandboxRuntime {
  run(spec: RunSpec): Promise<EvidenceBundle>;
}

export interface IObjectStore {
  put(key: string, value: string, ttlSeconds?: number): Promise<void>;
  get(key: string): Promise<string | null>;
}

export interface RuntimeState {
  completedSteps: number;
  lastTools: string[];
}
