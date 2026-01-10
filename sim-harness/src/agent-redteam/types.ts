import { HarnessConfig } from '../types/index.js';

export type AttackVector =
  | {
      kind: 'impersonation';
      target: string;
      payload: string;
      success_signals?: string[];
    }
  | {
      kind: 'prompt-injection';
      channel: string;
      payload: string;
      detection_expectation?: string;
    }
  | {
      kind: 'mitm';
      channel: string;
      mutation: string;
      detection_expectation?: string;
    };

export interface PromptRef {
  id: string;
  version: string;
  sha256: string;
  path: string;
}

export interface RedteamScenario {
  id: string;
  name: string;
  task_id: string;
  agent_id: string;
  prompt_ref: PromptRef;
  goal: string;
  attack_vectors: AttackVector[];
  controls?: {
    detection?: string[];
    mitigations?: string[];
  };
  artifacts?: {
    transcript?: boolean;
    decisions?: boolean;
    provenance?: boolean;
  };
}

export interface AgentRegistryEntry {
  id: string;
  task_id: string;
  agent_id: string;
  prompt_ref: PromptRef;
  task_spec: string;
  artifact_path: string;
}

export interface RedteamEvent {
  type: 'impersonation' | 'prompt-injection' | 'mitm' | 'control';
  message: string;
  channel?: string;
  actor?: string;
  severity: 'info' | 'warn' | 'critical';
  timestamp: string;
}

export interface RedteamDecision {
  step: string;
  rationale: string;
  outcome: 'allowed' | 'blocked' | 'deferred';
  risk_score: number;
  evidence?: string[];
  timestamp: string;
}

export interface ProvenanceEntry {
  type: 'prompt' | 'artifact' | 'policy';
  description: string;
  reference: string;
  sha256?: string;
  timestamp: string;
}

export interface RedteamRunRecord {
  run_id: string;
  scenario: RedteamScenario;
  registry: AgentRegistryEntry;
  transcript: RedteamEvent[];
  decisions: RedteamDecision[];
  provenance: ProvenanceEntry[];
  config: HarnessConfig;
  artifact_path: string;
}

export interface LogHooks {
  onEvent?: (event: RedteamEvent) => void;
  onDecision?: (decision: RedteamDecision) => void;
  onProvenance?: (provenance: ProvenanceEntry) => void;
}

export interface RedteamHarnessOptions {
  scenarioDir?: string;
  registryPath?: string;
  promptRegistryPath?: string;
  artifactRoot?: string;
  hooks?: LogHooks;
  config?: HarnessConfig;
}
